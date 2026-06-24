import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig, ownerAuthEnabledEnv } from "./auth.config";
import { verifyAccessCode } from "@/lib/lms/access-code";

// 🔐 Auth.js v5 — entrypoint server (có Node runtime → dùng được verifyAccessCode/node:crypto/OAuth).
// Provider:
//  - "access-code" (Credentials): provider PHỤ cho HỌC VIÊN, dùng từ P5a (mã truy cập). LUÔN bật.
//  - "google" (OAuth): CHỦ SỞ HỮU (Minh) — CHỈ bật khi có AUTH_GOOGLE_ID/SECRET + OWNER_EMAIL (cloud/P5b).
// Bất biến (SPEC-P5a §3): danh tính (studentId/role) lấy từ server → gắn vào token (KHÔNG tin client).
// Thông báo lỗi CHUNG (chống enumeration) — verifyAccessCode trả null khi sai/hết hạn/khóa.
//
// 🗣️ Bình dân: học viên nhập "mã truy cập"; còn Minh (chủ app) đăng nhập bằng Google.
//    Khi chạy trên mạng, chỉ đúng email của Minh mới được vào Personal OS + khu Dạy học.

// Provider học viên — luôn có.
const accessCodeProvider = Credentials({
  id: "access-code",
  name: "Mã truy cập",
  credentials: {
    code: { label: "Mã truy cập", type: "text" },
  },
  async authorize(credentials) {
    const code = typeof credentials?.code === "string" ? credentials.code : "";
    if (!code) return null;
    const result = await verifyAccessCode(code);
    if (!result) return null; // sai / hết hạn / khóa → CHUNG (không tiết lộ)
    // Trả về danh tính tối thiểu — callback jwt sẽ gắn vào token.
    return {
      id: result.lmsUserId,
      studentId: result.studentId,
      lmsUserId: result.lmsUserId,
      isMinor: result.isMinor,
    };
  },
});

// Provider học viên + chủ sở hữu — Google bật khi có key (không phụ thuộc OWNER_EMAIL vì học viên cũng cần).
// signIn callback dưới đây kiểm soát quyền vào thực sự (owner và học viên liên kết đều được). 
const providers: Provider[] = [accessCodeProvider];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // 🚪 Chốt cửa đăng nhập (server, Node runtime).
    //  - Google: CHỈ cho qua nếu email khớp OWNER_EMAIL → người lạ bị từ chối ngay (return false),
    //    KHÔNG tạo phiên, KHÔNG vào được Personal/Dạy học. (Linking học viên-Google làm ở bước sau.)
    //  - access-code: giữ nguyên (authorize đã kiểm mã) → cho qua.
    async signIn({ account, profile, user }) {
      // Học viên (access-code) mang studentId từ authorize() → đã xác thực, cho qua.
      const u = user as { studentId?: string } | undefined;
      if (u?.studentId) return true;
      // Còn lại = đăng nhập CHỦ SỞ HỮU (Google). KHÔNG dựa account.provider (Auth.js v5 beta có thể
      // không khớp "google" → fallback cũ "return true" vô tình cho MỌI tài khoản Google vào = lỗ hổng).
      // CHỈ cho qua nếu email khớp OWNER_EMAIL + đã verify; người lạ → TỪ CHỐI.
      const owner = process.env.OWNER_EMAIL?.toLowerCase().trim();
      const email = (profile?.email ?? user?.email)?.toLowerCase().trim();
      const verified = profile?.email_verified !== false; // Google trả true cho tài khoản hợp lệ
      const ok = Boolean(owner && email && email === owner && verified);
      // 🔎 Ghi lại lần thử gần nhất (in-memory) cho /api/debug-auth + log Vercel. KHÔNG lưu email đầy đủ.
      const diag = {
        ok,
        match: owner === email,
        attemptEmailDomain: email?.split("@")[1] ?? null,
        attemptEmailLen: email?.length ?? 0,
        ownerEmailLen: owner?.length ?? 0,
        verified,
        provider: account?.provider ?? null,
        at: new Date().toISOString(),
      };
      (globalThis as Record<string, unknown>).__jlLastSignin = diag;
      if (!ok) {
        // Học viên đăng nhập bằng Gmail (sau khi đã liên kết bằng linkGoogleEmail).
        // Bất biến bảo mật:
        //  - Chỉ lookup bằng emailIndex (blind-index, không giải mã email thô).
        //  - Chỉ cho vào nếu status === 'active' và có studentId.
        //  - Nếu không tìm thấy → tiếp tục return false (từ chối).
        if (email && verified) {
          try {
            const { blindIndex } = await import("@/lib/lms/crypto");
            const { lmsDb } = await import("@/db/lms/client");
            const { lmsUser: lmsUserTable } = await import("@/db/lms/schema");
            const { eq } = await import("drizzle-orm");
            const emailIdx = blindIndex(email);
            const found = await lmsDb
              .select({
                id: lmsUserTable.id,
                studentId: lmsUserTable.studentId,
                isMinor: lmsUserTable.isMinor,
                status: lmsUserTable.status,
              })
              .from(lmsUserTable)
              .where(eq(lmsUserTable.emailIndex, emailIdx))
              .limit(1);
            if (found[0] && found[0].status === "active" && found[0].studentId) {
              // Gắn thông tin học viên vào user object để jwt callback xử lý.
              const u = user as Record<string, unknown>;
              u.studentId = found[0].studentId;
              u.lmsUserId = found[0].id;
              u.isMinor = found[0].isMinor === 1;
              console.log("[student-gmail-signin] OK, studentId:", found[0].studentId);
              return true;
            }
          } catch (e) {
            console.error("[student-gmail-signin] error", e);
          }
        }
        console.error("[owner-signin] REJECT", diag);
        return false; // người lạ / email chưa verify / học viên chưa liên kết → TỪ CHỐI
      }
      return true;
    },
  },
});
