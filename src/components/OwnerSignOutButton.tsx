"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutOwner } from "@/app/login/signout-action";
import { Button } from "@/components/ui/button";

// Nút Đăng xuất chủ sở hữu (client island) — nằm ở Cài đặt → Tài khoản (SPEC-UI-P2.5 F07).
// Gọi server action → xoá phiên → về /login.

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
      <Button type="submit" variant="outline" className="h-11 md:h-9" disabled={pending}>
        <LogOut aria-hidden="true" />
        {pending ? "Đang đăng xuất…" : "Đăng xuất"}
      </Button>
    </form>
  );
}
