"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GraduationCap, FolderOpen, ClipboardList, User } from "lucide-react";

// Điều hướng cổng học viên (đơn giản): Trang chủ / Bài tập / Điểm / Tài liệu.
// Highlight mục đang mở. Dùng 2 lần: thanh trên (desktop) + thanh dưới (mobile).
// KHÔNG dùng nav Personal, KHÔNG ModeSwitch (khu học viên RIÊNG).

const ITEMS = [
  { href: "/portal", label: "Trang chủ", Icon: Home },
  { href: "/portal/assignments", label: "Bài tập", Icon: ClipboardList },
  { href: "/portal/grades", label: "Điểm", Icon: GraduationCap },
  { href: "/portal/materials", label: "Tài liệu", Icon: FolderOpen },
  { href: "/portal/profile", label: "Hồ sơ", Icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PortalNav({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname() || "/portal";
  const cls = variant === "top" ? "portal-nav" : "portal-bottom";
  return (
    <nav className={cls} aria-label="Điều hướng cổng học viên">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={isActive(pathname, href) ? "on" : undefined}>
          <Icon strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
