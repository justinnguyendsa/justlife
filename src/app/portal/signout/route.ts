import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { LINK_INTENT_COOKIE } from "@/lib/lms/link-intent";

// Route handler đăng xuất: redirect về /portal/login sau khi xóa session.
// Dùng cho nút "Đăng xuất" dạng <a href="/portal/signout"> (không cần form POST).
// Auth.js v5: signOut với redirectTo sẽ throw NEXT_REDIRECT → Next tự xử lý.
// Xoá luôn phiếu liên kết Gmail còn sót (SPEC-SEC-1.2 H1) — máy chung không để lại gì cho người sau.

export async function GET() {
  (await cookies()).delete({ name: LINK_INTENT_COOKIE, path: "/api/auth" });
  await signOut({ redirectTo: "/portal/login" });
}
