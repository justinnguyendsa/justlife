import { handlers } from "@/auth";

// Auth.js v5 route handler (App Router). Mọi request /api/auth/* đi qua đây.
// Node runtime (mặc định) — authorize() cần node:crypto + DB.
//
// ⚠ Import PHẢI là "@/auth" (= src/auth.ts). Trước đây là "../../../../../auth" — trỏ ra
// auth.ts ở THƯ MỤC GỐC, bản cũ KHÔNG có callback signIn (gate OWNER_EMAIL) và gán
// role="student" cho mọi tài khoản Google → owner bị khoá ngoài, người lạ vào được /portal.
export const { GET, POST } = handlers;
