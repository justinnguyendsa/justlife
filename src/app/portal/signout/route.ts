import { signOut } from "@/auth";
import type { NextRequest } from "next/server";

// Route handler đăng xuất: redirect về /portal/login sau khi xóa session.
// Dùng cho nút "Đăng xuất" dạng <a href="/portal/signout"> (không cần form POST).
// Auth.js v5: signOut với redirectTo sẽ throw NEXT_REDIRECT → Next tự xử lý.

export async function GET(_req: NextRequest) {
  await signOut({ redirectTo: "/portal/login" });
}
