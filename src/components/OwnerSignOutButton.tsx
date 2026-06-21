"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutOwner } from "@/app/login/signout-action";

// Nút Đăng xuất chủ sở hữu (client island). Gọi server action → xoá phiên → về /login.

export function OwnerSignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await logoutOwner();
        });
      }}
    >
      <button
        type="submit"
        className="btn line block sm"
        disabled={pending}
        title="Đăng xuất khỏi tài khoản chủ sở hữu"
      >
        <LogOut strokeWidth={2} aria-hidden />
        {pending ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
    </form>
  );
}
