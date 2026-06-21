"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, CalendarDays, AlarmClock, SlidersHorizontal, Sprout, FolderOpen, MoreHorizontal } from "lucide-react";

// Sidebar (desktop): đầy đủ. Bottom-nav (mobile): 4 mục chính + "Khác".
export const NAV_ITEMS = [
  { href: "/today", label: "Hôm nay", Icon: LayoutDashboard },
  { href: "/tasks", label: "Việc", Icon: Inbox },
  { href: "/calendar", label: "Lịch", Icon: CalendarDays },
  { href: "/develop", label: "Phát triển", Icon: Sprout },
  { href: "/library", label: "Tài liệu", Icon: FolderOpen },
  { href: "/deadlines", label: "Deadline", Icon: AlarmClock },
  { href: "/settings", label: "Cài đặt", Icon: SlidersHorizontal },
];

const BOTTOM_ITEMS = [
  { href: "/today", label: "Hôm nay", Icon: LayoutDashboard },
  { href: "/tasks", label: "Việc", Icon: Inbox },
  { href: "/calendar", label: "Lịch", Icon: CalendarDays },
  { href: "/deadlines", label: "Deadline", Icon: AlarmClock },
  { href: "/more", label: "Khác", Icon: MoreHorizontal },
];
const MORE_PATHS = ["/more", "/develop", "/habits", "/rest", "/study", "/library", "/settings"];

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) => {
    if (variant === "bottom" && href === "/more") return MORE_PATHS.some((p) => path.startsWith(p));
    return path === href || path.startsWith(href + "/");
  };
  const items = variant === "bottom" ? BOTTOM_ITEMS : NAV_ITEMS;
  if (variant === "bottom") {
    return (
      <nav className="bottom-nav">
        {items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={active(href) ? "active" : ""}><Icon strokeWidth={1.9} />{label}</Link>
        ))}
      </nav>
    );
  }
  return (
    <>
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={"nav-link" + (active(href) ? " active" : "")}><Icon strokeWidth={1.9} />{label}</Link>
      ))}
    </>
  );
}
