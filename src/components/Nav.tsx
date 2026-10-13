"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  House,
  ListChecks,
  MoreHorizontal,
  SlidersHorizontal,
  Sprout,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Điều hướng theo IA mới (canvas bản 27, SPEC-UI-P2.0 T04):
// web = 4 mục chính + lối justudy + Cài đặt; điện thoại = 4 mục chính + "Khác".
// `match` = các đường dẫn làm mục đó sáng lên (màn con, màn cũ chưa chuyển chỗ).
type NavItem = { href: string; label: string; Icon: typeof House; match: string[]; external?: boolean };

const NAV_MAIN: NavItem[] = [
  { href: "/today", label: "Hôm nay", Icon: House, match: ["/today"] },
  { href: "/tasks", label: "Việc", Icon: ListChecks, match: ["/tasks", "/focus"] },
  { href: "/calendar", label: "Lịch", Icon: CalendarDays, match: ["/calendar"] },
  // Tạm trỏ về hub "Phát triển" cho tới khi có màn Cuộc sống thật (F3).
  { href: "/develop", label: "Cuộc sống", Icon: Sprout, match: ["/develop", "/habits", "/rest", "/study"] },
];

// Dạy học và Tài liệu còn ở /teaching, /library cho tới khi chuyển hẳn sang justudy (F1).
// Khi đó bỏ "Tài liệu" khỏi đây (canvas: thanh bên chỉ còn justudy + Cài đặt).
const NAV_FOOT: NavItem[] = [
  { href: "/teaching/classes", label: "justudy", Icon: GraduationCap, match: ["/teaching"], external: true },
  { href: "/library", label: "Tài liệu", Icon: FolderOpen, match: ["/library"] },
  { href: "/settings", label: "Cài đặt", Icon: SlidersHorizontal, match: ["/settings"] },
];

const BOTTOM_ITEMS: NavItem[] = [
  ...NAV_MAIN,
  { href: "/more", label: "Khác", Icon: MoreHorizontal, match: ["/more", "/deadlines", "/library", "/settings", "/teaching"] },
];

function isActive(path: string, item: NavItem) {
  return item.match.some((p) => path === p || path.startsWith(p + "/"));
}

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();

  if (variant === "bottom") {
    return (
      <nav aria-label="Điều hướng" className="bg-card fixed inset-x-0 bottom-0 z-30 grid h-[62px] grid-cols-5 border-t md:hidden">
        {BOTTOM_ITEMS.map((item) => {
          const on = isActive(path, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-[3px] text-[11px] leading-[14px] transition-colors [&_svg]:size-[22px]",
                on ? "text-foreground font-bold [&_svg]:text-primary" : "text-muted-foreground font-medium"
              )}
            >
              <item.Icon strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const link = (item: NavItem) => {
    const on = isActive(path, item);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? "page" : undefined}
        aria-label={item.external ? "Mở justudy — học và dạy" : undefined}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors [&_svg]:size-5 [&_svg]:shrink-0",
          on
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
            : "text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <item.Icon strokeWidth={1.8} aria-hidden="true" />
        {item.label}
        {item.external && <ExternalLink className="ml-auto !size-4" strokeWidth={1.8} aria-hidden="true" />}
      </Link>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-0.5">{NAV_MAIN.map(link)}</nav>
      <div className="flex-1" />
      <nav aria-label="Điều hướng phụ" className="flex flex-col gap-0.5">{NAV_FOOT.map(link)}</nav>
    </div>
  );
}
