import type { NextAuthConfig } from "next-auth";

// Auth.js v5 — cấu hình NỀN, an toàn cho Edge (middleware import được).
// KHÔNG import node:crypto / DB / provider có side-effect ở đây (middleware chạy Edge runtime).
// Provider thật (Credentials + authorize gọi DB) khai báo trong auth.ts (Node runtime).
// ADR-002 Q3, SPEC-P5a §3, blocker #6.
//
// 🗣️ Bình dân: file này khai báo "luật phiên đăng nhập" + ai được vào đâu; phần kiểm tra mã
//    truy cập (đụng cơ sở dữ liệu) để ở auth.ts vì middleware không chạy được code nặng đó.

export const authConfig = {
  trustHost: true, // local + tự host: tin Host header (P5b set domain cụ thể nếu cần)
  session: { strategy: "jwt" },
  pages: {
    signIn: "/portal/login",
  },
  providers: [], // điền ở auth.ts (Credentials + Google optional) — middleware không cần providers
  callbacks: {
    // Gắn danh tính server-derived vào token. KHÔNG lưu PII (tên/email) — chỉ id + cờ.
    async jwt({ token, user }) {
      if (user) {
        // `user` đến từ authorize()/profile() — đã là server-derived.
        const u = user as { id?: string; studentId?: string; lmsUserId?: string; isMinor?: boolean };
        if (u.studentId) token.studentId = u.studentId;
        if (u.lmsUserId) token.lmsUserId = u.lmsUserId;
        if (typeof u.isMinor === "boolean") token.isMinor = u.isMinor;
        token.role = "student";
      }
      return token;
    },
    async session({ session, token }) {
      // Expose studentId (+ cờ) ra session. studentId LẤY TỪ token (không tin client).
      const s = session as typeof session & {
        studentId?: string;
        lmsUserId?: string;
        isMinor?: boolean;
        role?: string;
      };
      s.studentId = token.studentId as string | undefined;
      s.lmsUserId = token.lmsUserId as string | undefined;
      s.isMinor = token.isMinor as boolean | undefined;
      s.role = (token.role as string | undefined) ?? "student";
      return session;
    },
  },
} satisfies NextAuthConfig;
