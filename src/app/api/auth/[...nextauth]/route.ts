import { handlers } from "../../../../../auth";

// Auth.js v5 route handler (App Router). Mọi request /api/auth/* đi qua đây.
// Node runtime (mặc định) — authorize() cần node:crypto + DB.
export const { GET, POST } = handlers;
