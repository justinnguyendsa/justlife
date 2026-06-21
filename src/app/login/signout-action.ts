"use server";

import { signOut } from "@/auth";

// Server action ĐĂNG XUẤT chủ sở hữu → xoá phiên rồi về /login.
// 🗣️ Bình dân: bấm là thoát tài khoản, quay lại màn hình đăng nhập.

export async function logoutOwner() {
  await signOut({ redirectTo: "/login" });
}
