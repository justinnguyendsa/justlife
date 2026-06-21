import type { DefaultSession } from "next-auth";

// Mở rộng type Auth.js v5: gắn danh tính học viên (server-derived) vào Session/User/JWT.
// studentId/lmsUserId/isMinor/role lấy từ token (callback) — KHÔNG tin client.

declare module "next-auth" {
  interface Session {
    studentId?: string;
    lmsUserId?: string;
    isMinor?: boolean;
    role?: string;
    user?: DefaultSession["user"];
  }
  interface User {
    studentId?: string;
    lmsUserId?: string;
    isMinor?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    studentId?: string;
    lmsUserId?: string;
    isMinor?: boolean;
    role?: string;
  }
}
