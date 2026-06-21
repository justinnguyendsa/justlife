"use server";

import { signIn } from "@/auth";

// Server action đăng nhập CHỦ SỞ HỮU bằng Google (provider "google").
// signIn("google") sẽ điều hướng sang Google → callback. Người KHÔNG phải owner bị từ chối ở
// callback signIn (auth.ts) → Auth.js đưa về trang lỗi/login mặc định. redirectTo = /today khi thành công.
//
// 🗣️ Bình dân: bấm nút là chuyển sang Google đăng nhập; xong quay lại app. Sai email thì không vào được.

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/today" });
}
