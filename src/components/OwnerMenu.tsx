import { getOwnerSession } from "@/lib/auth-guard";
import { OwnerSignOutButton } from "./OwnerSignOutButton";

// Hiển thị nút "Đăng xuất" CHỦ SỞ HỮU ở sidebar Personal — CHỈ khi owner-auth bật và đã đăng nhập owner.
// Local dev (owner-auth tắt) → trả null → không có gì hiện (sidebar như cũ).
//
// 🗣️ Bình dân: chỉ khi app chạy trên mạng và Minh đã đăng nhập mới hiện nút thoát.

export async function OwnerMenu() {
  const session = await getOwnerSession();
  if (!session) return null;
  return <OwnerSignOutButton />;
}
