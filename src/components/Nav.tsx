"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  AlarmClock,
  SlidersHorizontal,
  Sprout,
  FolderOpen,
  MoreHorizontal,
  Target,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Sidebar (desktop): đầy đủ. Bottom-nav (mobile): 4 mục chính + "Khác".
export const NAV_ITEMS = [
  { href: "/today", label: "Hôm nay", Icon: LayoutDashboard },
  { href: "/tasks", label: "Việc", Icon: Inbox },
  { href: "/focus", label: "Focus", Icon: Target },
  { href: "/calendar", label: "Lịch", Icon: CalendarDays },
  { href: "/develop", label: "Phát triển", Icon: Sprout },
  { href: "/library", label: "Tài liệu", Icon: FolderOpen },
  { href: "/deadlines", label: "Deadline", Icon: AlarmClock },
  { href: "/settings", label: "Cài đặt", Icon: SlidersHorizontal },
];

const BOTTOM_ITEMS = [
  { href: "/today", label: "Hôm nay", Icon: LayoutDashboard },
  { href: "/tasks", label: "Việc", Icon: Inbox },
  { href: "/focus", label: "Focus", Icon: Target },
  { href: "/calendar", label: "Lịch", Icon: CalendarDays },
  { href: "/more", label: "Khác", Icon: MoreHorizontal },
];
const MORE_PATHS = [
  "/more",
  "/develop",
  "/habits",
  "/rest",
  "/study",
  "/library",
  "/settings",
  "/deadlines",
];

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) => {
    if (variant === "bottom" && href === "/more") return MORE_PATHS.some((p) => path.startsWith(p));
    return path === href || path.startsWith(href + "/");
  };
  const items = variant === "bottom" ? BOTTOM_ITEMS : NAV_ITEMS;

  if (variant === "bottom") {
    return (
      <nav className="bg-card fixed inset-x-0 bottom-0 z-30 flex h-[62px] border-t md:hidden">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-[3px] text-[10px] font-semibold transition-colors [&_svg]:size-[21px]",
              active(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon strokeWidth={1.9} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <>
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors [&_svg]:size-5 [&_svg]:shrink-0",
            active(href)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <Icon strokeWidth={1.9} />
          {label}
        </Link>
      ))}
    </>
  );
}
