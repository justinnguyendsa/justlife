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

// Provider chủ sở hữu (Google) — CHỈ nạp khi cloud (có Google env + OWNER_EMAIL).
// Local dev không có env này → mảng provider không có Google → app mở như cũ, không yêu cầu đăng nhập.
const providers: Provider[] = [accessCodeProvider];
if (ownerAuthEnabledEnv()) {
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
      if (account?.provider === "google") {
        const owner = process.env.OWNER_EMAIL?.toLowerCase();
        // Ưu tiên email đã verify từ profile Google; fallback user.email.
        const email = (profile?.email ?? user?.email)?.toLowerCase();
        const verified = profile?.email_verified !== false; // Google trả true cho tài khoản hợp lệ
        if (!owner || !email || email !== owner || !verified) {
          return false; // người lạ / email chưa verify → TỪ CHỐI
        }
        return true;
      }
      return true; // access-code & các provider khác giữ nguyên
    },
  },
});
