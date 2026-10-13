import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { CredentialsSignin } from "next-auth";
import { verifyAccessCode } from "@/lib/lms/access-code";
import { LINK_INTENT_COOKIE, linkIntentSecret, verifyIntent } from "@/lib/lms/link-intent";

// 🔐 Auth.js v5 — entrypoint server (có Node runtime → dùng được verifyAccessCode/node:crypto/OAuth).
// Provider:
//  - "access-code" (Credentials): provider PHỤ cho HỌC VIÊN, dùng từ P5a (mã truy cập). LUÔN bật.
//  - "google" (OAuth): CHỦ SỞ HỮU (Minh) — CHỈ bật khi có AUTH_GOOGLE_ID/SECRET + OWNER_EMAIL (cloud/P5b).
// Bất biến (SPEC-P5a §3): danh tính (studentId/role) lấy từ server → gắn vào token (KHÔNG tin client).
// Thông báo lỗi CHUNG (chống enumeration) — verifyAccessCode trả null khi sai/hết hạn/khóa.
//
// 🗣️ Bình dân: học viên nhập "mã truy cập"; còn Minh (chủ app) đăng nhập bằng Google.
//    Khi chạy trên mạng, chỉ đúng email của Minh mới được vào Personal OS + khu Dạy học.

// Nhập sai quá nhiều ở một nơi → báo "thử lại sau" (không lộ mã có tồn tại hay không) — SPEC-SEC-1.2 M2.
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

/** Đọc rồi xoá phiếu liên kết Gmail (một lần dùng). Không đọc được → null. */
async function takeLinkIntent(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const value = jar.get(LINK_INTENT_COOKIE)?.value ?? null;
    if (value) {
      try {
        jar.delete({ name: LINK_INTENT_COOKIE, path: "/api/auth" });
      } catch {
        /* ngữ cảnh không cho ghi cookie — phiếu vẫn tự hết hạn sau 5 phút */
      }
    }
    return value;
  } catch {
    return null;
  }
}

// Provider học viên — luôn có.
const accessCodeProvider = Credentials({
  id: "access-code",
  name: "Mã truy cập",
  credentials: {
    code: { label: "Mã truy cập", type: "text" },
  },
  async authorize(credentials, request) {
    const code = typeof credentials?.code === "string" ? credentials.code : "";
    if (!code) return null;
    // Khoá chặn đoán mã theo nơi truy cập (SPEC-SEC-1.2 S04). Vercel đặt x-forwarded-for.
    const fwd = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientKey = fwd || request?.headers?.get("x-real-ip")?.trim() || "unknown";
    const result = await verifyAccessCode(code, { clientKey });
    if (result && "blocked" in result) throw new TooManyAttempts();
    if (!result) return null; // sai / hết hạn / thu hồi → CHUNG (không tiết lộ)
    // Trả về danh tính tối thiểu — callback jwt sẽ gắn vào token.
    return {
      id: result.lmsUserId,
      studentId: result.studentId,
      lmsUserId: result.lmsUserId,
      accessCodeId: result.accessCodeId,
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
    async signIn({ profile, user }) {
      // Học viên (access-code) mang studentId từ authorize() → đã xác thực, cho qua.
      const u = user as { studentId?: string } | undefined;
      if (u?.studentId) return true;

      // H1 (SPEC-SEC-1.2): phiếu liên kết Gmail đọc rồi XOÁ NGAY ở mọi nhánh Google (owner, người lạ,
      // học viên) → chỉ dùng được một lần, không sót lại cho người dùng máy chung sau đó.
      const intent = await takeLinkIntent();

      // Còn lại = Google. KHÔNG dựa account.provider (Auth.js v5 beta có thể không khớp "google").
      // CHỦ SỞ HỮU: email khớp OWNER_EMAIL + đã verify. jwt() kiểm lại lần nữa (resolveRole).
      const owner = process.env.OWNER_EMAIL?.toLowerCase().trim();
      const email = (profile?.email ?? user?.email)?.toLowerCase().trim();
      const verified = profile?.email_verified !== false; // Google trả true cho tài khoản hợp lệ
      if (owner && email && email === owner && verified) return true;

      // Liên kết Gmail ĐÃ XÁC MINH (S07): chỉ khi phiếu hợp lệ, email được Google xác minh RÕ RÀNG
      // (=== true), VÀ phiên hiện tại đúng là học viên trong phiếu (H1 — chống gắn nhầm trên máy chung).
      if (intent) {
        const intentStudentId = verifyIntent(intent, Date.now(), linkIntentSecret());
        if (!intentStudentId) return "/portal/profile?link=expired";
        if (!email || profile?.email_verified !== true) return "/portal/profile?link=invalid";
        let current: string | null;
        try {
          const { getSessionStudentId } = await import("@/lib/lms/portal-queries");
          current = await getSessionStudentId(); // kiểm cả status + mã đã thu hồi, không chỉ đọc JWT
        } catch {
          current = null;
        }
        if (current !== intentStudentId) {
          console.error("[student-gmail-link] REJECT", { reason: "session_mismatch" });
          return "/portal/profile?link=error";
        }
        try {
          const { linkVerifiedGoogleEmail } = await import("@/lib/lms/portal-queries");
          const linked = await linkVerifiedGoogleEmail(intentStudentId, email, owner ?? "");
          if (!linked.ok) {
            console.error("[student-gmail-link] REJECT", { reason: linked.reason });
            // Về lại Hồ sơ kèm lý do (phiên học viên cũ vẫn giữ nguyên, không tạo phiên mới).
            return `/portal/profile?link=${linked.reason}`;
          }
          const { logAccess } = await import("@/lib/lms/audit");
          await logAccess({ actor: intentStudentId, action: "link_gmail", targetType: "student" });
        } catch (e) {
          console.error("[student-gmail-link] error", e);
          return "/portal/profile?link=error";
        }
      }

      // Học viên đăng nhập bằng Gmail đã liên kết. Bất biến:
      //  - Chỉ lookup bằng emailIndex (blind-index, không giải mã email thô).
      //  - Đúng MỘT học viên khớp (dữ liệu cũ trùng index → từ chối), status 'active', có studentId.
      if (email && verified) {
        try {
          const { blindIndex } = await import("@/lib/lms/crypto");
          const { lmsDb } = await import("@/db/lms/client");
          const { lmsUser: lmsUserTable } = await import("@/db/lms/schema");
          const { eq } = await import("drizzle-orm");
          const found = await lmsDb
            .select({
              id: lmsUserTable.id,
              studentId: lmsUserTable.studentId,
              isMinor: lmsUserTable.isMinor,
              status: lmsUserTable.status,
            })
            .from(lmsUserTable)
            .where(eq(lmsUserTable.emailIndex, blindIndex(email)))
            .limit(2);
          if (found.length === 1 && found[0].status === "active" && found[0].studentId) {
            // Gắn thông tin học viên vào user object để jwt callback xử lý (không adapter: cùng object).
            const s = user as Record<string, unknown>;
            s.studentId = found[0].studentId;
            s.lmsUserId = found[0].id;
            s.isMinor = found[0].isMinor === 1;
            return true;
          }
        } catch (e) {
          console.error("[student-gmail-signin] error", e);
        }
      }
      // 🔎 P0-T01: chẩn đoán AN TOÀN cho log Vercel — CHỈ độ dài + cờ, KHÔNG email, KHÔNG domain.
      // Nếu ownerEmailLen != attemptEmailLen mà match=false thì gần như chắc chắn giá trị env bị dính
      // ghi chú/khoảng trắng phía sau.
      console.error("[owner-signin] REJECT", {
        match: owner === email,
        attemptEmailLen: email?.length ?? 0,
        ownerEmailLen: owner?.length ?? 0,
        verified,
      });
      // Đang liên kết mà không vào được → về Hồ sơ (L8), không rơi sang trang đăng nhập của chủ.
      return intent ? "/portal/profile?link=error" : false;
    },
  },
});
