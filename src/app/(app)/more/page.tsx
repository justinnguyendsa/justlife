import Link from "next/link";
import { asc } from "drizzle-orm";
import { AlarmClock, ChevronRight, FolderOpen, GraduationCap, SlidersHorizontal } from "lucide-react";
import { db } from "@/db/client";
import { fixedSchedule } from "@/db/schema";
import { areaBarClass } from "@/lib/areas";
import { weekdayRange } from "@/lib/fixed-schedule";
import { minToHHMM } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { ThemeSetting } from "@/components/ThemeSetting";

export const dynamic = "force-dynamic";

// Trang "Khác" trên điện thoại (SPEC-UI-P2.0 T07 + SPEC-UI-P2.5 F08, canvas J08 bản mobile).
// Dạy học và Tài liệu tạm ở đây cho tới khi chuyển sang justudy (F1).
const ITEMS = [
  { href: "/teaching/classes", label: "Mở justudy", desc: "Dạy học: lớp, điểm danh, chấm bài", Icon: GraduationCap },
  { href: "/tasks?tab=han", label: "Hạn", desc: "Việc và bài học sắp đến hạn", Icon: AlarmClock },
  { href: "/library", label: "Tài liệu", desc: "Thư viện file và link chia sẻ", Icon: FolderOpen },
  { href: "/settings", label: "Cài đặt", desc: "Giờ bận, giới hạn, giao diện, tài khoản", Icon: SlidersHorizontal },
];

export default async function MorePage() {
  const fixed = await db.select().from(fixedSchedule).orderBy(asc(fixedSchedule.startMin));
  return (
    <>
      <PageHeader title="Khác" />
      <div className="flex flex-col gap-5">
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

        <section aria-labelledby="more-theme" className="flex flex-col gap-2">
          <h2 id="more-theme" className="text-[13px] font-bold">Giao diện</h2>
          <ThemeSetting />
        </section>

        <section aria-labelledby="more-fixed" className="flex flex-col gap-2">
          <h2 id="more-fixed" className="text-[13px] font-bold">Giờ bận cố định</h2>
          <Link href="/settings" aria-label="Sửa giờ bận trong Cài đặt" className="flex flex-col gap-2">
            {fixed.length === 0 ? (
              <span className="bg-card text-muted-foreground hover:bg-accent rounded-lg border px-3 py-3 text-[13px] transition-colors">
                Chưa có giờ bận nào — thêm trong Cài đặt
              </span>
            ) : (
              fixed.map((f) => (
                <span key={f.id} className="bg-card hover:bg-accent flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors">
                  <span className={cn("h-8 w-1 shrink-0 rounded-full", areaBarClass(f.area))} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold">{f.label}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {weekdayRange(f.weekdayMask)} · {minToHHMM(f.startMin)} – {minToHHMM(f.endMin)}
                    </span>
                  </span>
                </span>
              ))
            )}
          </Link>
        </section>
      </div>
    </>
  );
}
