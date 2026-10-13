import Link from "next/link";
import { AlarmClock, ChevronRight, FolderOpen, GraduationCap, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// Trang "Khác" trên điện thoại (SPEC-UI-P2.0 T07, canvas J08 bản mobile).
// Dạy học và Tài liệu tạm ở đây cho tới khi chuyển sang justudy (F1).
const ITEMS = [
  { href: "/teaching/classes", label: "Mở justudy", desc: "Dạy học: lớp, điểm danh, chấm bài", Icon: GraduationCap },
  { href: "/tasks?tab=han", label: "Hạn", desc: "Việc và bài học sắp đến hạn", Icon: AlarmClock },
  { href: "/library", label: "Tài liệu", desc: "Thư viện file và link chia sẻ", Icon: FolderOpen },
  { href: "/settings", label: "Cài đặt", desc: "Giờ bận, giới hạn, giao diện, tài khoản", Icon: SlidersHorizontal },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="Khác" />
      <nav aria-label="Các mục khác" className="bg-card overflow-hidden rounded-lg border">
        {ITEMS.map(({ href, label, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="hover:bg-accent flex min-h-14 items-center gap-3 border-b px-4 transition-colors last:border-b-0"
          >
            <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col py-2">
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="text-muted-foreground truncate text-xs">{desc}</span>
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </>
  );
}
