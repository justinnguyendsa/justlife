"use client";

import { useTransition } from "react";
import { LogIn } from "lucide-react";
import { loginWithGoogle } from "./actions";

// Nút "Đăng nhập với Google" cho chủ sở hữu (client island).
// Gọi server action loginWithGoogle → server tự signIn + redirect sang Google (OAuth).
// useTransition để hiện trạng thái đang chuyển hướng.

export function OwnerSignIn() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await loginWithGoogle();
        });
      }}
    >
      <button type="submit" className="btn primary block" disabled={pending}>
        <LogIn strokeWidth={2} aria-hidden />
        {pending ? "Đang chuyển tới Google…" : "Đăng nhập với Google"}
      </button>
    </form>
  );
}
