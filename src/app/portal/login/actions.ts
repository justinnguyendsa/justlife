"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

// Server action đăng nhập bằng mã truy cập (provider "access-code").
// Trả lỗi tiếng Việt CHUNG khi sai (chống enumeration — không tiết lộ mã tồn tại hay không).
// Auth.js v5: lỗi xác thực → AuthError (bắt + báo chung); redirect thành công → lỗi NEXT_REDIRECT
// KHÔNG phải AuthError → re-throw để Next điều hướng vào /portal.
//
// 🗣️ Bình dân: nhận mã từ form, nhờ hệ thống kiểm; đúng thì vào cổng, sai thì báo "mã không hợp lệ".

export async function loginWithCode(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const code = String(formData.get("code") || "").trim();
  if (!code) {
    return { error: "Vui lòng nhập mã truy cập." };
  }
  try {
    await signIn("access-code", { code, redirectTo: "/portal" });
    return { error: "" };
  } catch (err) {
    // Lỗi xác thực của Auth.js (sai/hết hạn/khóa) → thông báo CHUNG.
    if (err instanceof AuthError) {
      return { error: "Mã không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại." };
    }
    // Mọi thứ khác (gồm redirect thành công) → để Next xử lý.
    throw err;
  }
}

/** Đăng nhập bằng Google OAuth (redirect sang Google, sau đó Auth.js xử lý callback). */
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/portal" });
}
