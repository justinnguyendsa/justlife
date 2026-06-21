import NextAuth from "next-auth";
import type { Provider } from "@auth/core/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { verifyAccessCode } from "@/lib/lms/access-code";

// Auth.js v5 — instance đầy đủ (Node runtime). Bọc authConfig + provider thật.
// - Credentials("access-code"): authorize({code}) → verifyAccessCode → {id, studentId, isMinor, lmsUserId}.
// - Google: CHỈ thêm khi có AUTH_GOOGLE_ID/SECRET (optional — bật ở go-live P5b).
// studentId LẤY TỪ verifyAccessCode (server-derived) → callback jwt/session (auth.config.ts).
// ADR-002 Q3, SPEC-P5a §3.
//
// 🗣️ Bình dân: học viên nhập mã truy cập → hệ thống kiểm tra ở DB rồi cấp phiên đăng nhập
//    "bạn là học viên nào". Đăng nhập Google chỉ bật khi có khóa Google (lúc go-live).

const providers: Provider[] = [
  Credentials({
    id: "access-code",
    name: "Mã truy cập",
    credentials: {
      code: { label: "Mã truy cập", type: "text" },
    },
    async authorize(credentials) {
      const code = typeof credentials?.code === "string" ? credentials.code : "";
      if (!code) return null;
      const result = await verifyAccessCode(code);
      if (!result) return null; // thông báo lỗi chung do Auth.js xử lý — chống enumeration
      // Trả object danh tính server-derived; KHÔNG kèm PII.
      return {
        id: result.studentId,
        studentId: result.studentId,
        lmsUserId: result.lmsUserId,
        isMinor: result.isMinor,
      };
    },
  }),
];

// Google optional — chỉ đăng ký khi có secret (P5a thường KHÔNG có → bỏ qua an toàn).
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // P5b: profile() phải map sub→authSubject(blind-index) + pre-link email→student
      // (chống người lạ tự tạo tài khoản). Khai báo đầy đủ ở stage go-live.
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
});
