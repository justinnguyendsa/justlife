import Link from "next/link";
import { getTodayData } from "@/db/queries";
import { getUnifiedDeadlines, type DeadlineEntry } from "@/db/deadlines";
import { getRest, listHabits } from "@/db/habits";
import { PageHeader } from "@/components/PageHeader";
import { AddTaskButton } from "@/components/AddTaskButton";
import { Badge } from "@/components/ui/badge";
import { countdown, fmtDayShort, fmtDuration, fmtTime } from "@/lib/format";
import { areaBadge, areaSoftClass, areaSolidClass, areaTitle } from "@/lib/areas";
import { fixedToRange, maskHasDate, startOfDay } from "@/lib/scheduler";
import { freeSlots } from "@/lib/day-slots";
import { cn } from "@/lib/utils";
import { NowCard } from "./NowCard";
import { TaskRow } from "./TaskRow";
import { HabitsToday } from "./HabitsToday";
import { RestToday } from "./RestToday";

export const dynamic = "force-dynamic";

const H48 = 48 * 3_600_000;

type Slot = { kind: "fixed" | "block" | "free"; label: string; area: string; startAt: number; endAt: number };

// Màn Hôm nay (SPEC-UI-P2.1, canvas J01). Web: 2 cột (nội dung | lịch · thói quen · nghỉ).
// Điện thoại: Đang làm → Ưu tiên → Hạn → Thói quen → Tiếp theo trên lịch.
export default async function TodayPage() {
  const now = Date.now();
  const [{ doing, top, blocks, fixed }, deadlines, habits, rest] = await Promise.all([
    getTodayData(now),
    getUnifiedDeadlines(now),
    listHabits(now),
    getRest(now),
  ]);

  const day0 = startOfDay(now);
  const dayDate = new Date(day0);
  const busy: Slot[] = [
    ...fixed.filter((f) => maskHasDate(f.weekdayMask, dayDate)).map((f) => ({ kind: "fixed" as const, label: f.label, area: f.area, ...fixedToRange(f, day0) })),
    ...blocks.map((b) => ({ kind: "block" as const, label: b.title, area: b.area, startAt: b.startAt, endAt: b.endAt })),
  ];
  const free: Slot[] = freeSlots(day0, busy, now).map((s) => ({ kind: "free", label: "", area: "work", ...s }));
  const timeline = [...busy, ...free].sort((a, b) => a.startAt - b.startAt);
  const upcomingTimeline = timeline.filter((s) => s.endAt > now).slice(0, 3);

  const due48: DeadlineEntry[] = [...deadlines.overdue, ...deadlines.upcoming.filter((e) => e.dueAt <= now + H48)];
  const nowTask = doing[0] ?? top[0] ?? null;
  const priorities = doing[0] ? top.slice(0, 3) : top.slice(1, 4);
  const habitRows = habits.map((h) => ({ id: h.id, name: h.name, streak: h.streak, doneToday: h.doneToday }));

  const sub = [
    fmtDayShort(now),
    `còn ${Math.min(top.length, 3)} việc ưu tiên`,
    due48.length ? `${due48.length} hạn trong 48 giờ` : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader title="Hôm nay" sub={sub} action={<AddTaskButton />} />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          <NowCard task={nowTask} doing={Boolean(doing[0])} extra={Math.max(0, doing.length - 1)} now={now} />

          <section aria-labelledby="today-top" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="today-top" className="text-[15px] font-semibold">Ưu tiên hôm nay</h2>
              <Link href="/tasks" className="text-primary text-[13px] font-semibold">Xem tất cả việc</Link>
            </div>
            {priorities.length ? (
              priorities.map((t) => <TaskRow key={t.id} task={t} now={now} />)
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-[13px]">
                Đặt Effort và Impact cho việc để app xếp ưu tiên giúp bạn.
              </p>
            )}
          </section>

          <section aria-labelledby="today-due" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="today-due" className="text-[15px] font-semibold">Hạn sắp tới</h2>
              <Link href="/deadlines" className="text-primary text-[13px] font-semibold">Xem tất cả hạn</Link>
            </div>
            {due48.length ? (
              <ul className="bg-card overflow-hidden rounded-lg border">
                {due48.slice(0, 5).map((e) => {
                  const c = countdown(e.dueAt, now);
                  return (
                    <li key={e.source + e.id} className="border-b last:border-b-0">
                      <Link href={e.href} className="hover:bg-accent flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors">
                        <Badge variant={c.level === "over" ? "danger" : "warn"} className="font-mono">{c.label}</Badge>
                        <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                        <Badge variant={areaBadge(e.area)} className="hidden sm:inline-flex">{e.source === "study" ? e.sub : areaTitle(e.area)}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-[13px]">Không có hạn nào trong 48 giờ tới.</p>
            )}
          </section>

          {/* Điện thoại: thói quen dạng chip + tiếp theo trên lịch */}
          <section aria-labelledby="today-habits-m" className="flex flex-col gap-2 md:hidden">
            <h2 id="today-habits-m" className="text-[15px] font-semibold">Thói quen</h2>
            <HabitsToday habits={habitRows} variant="chips" />
          </section>
          <section aria-labelledby="today-next-m" className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center justify-between">
              <h2 id="today-next-m" className="text-[15px] font-semibold">Tiếp theo trên lịch</h2>
              <span className="text-muted-foreground font-mono text-xs">Nghỉ {rest.todayMin}/60 phút</span>
            </div>
            <Timeline slots={upcomingTimeline} empty="Không còn khối nào trên lịch hôm nay." />
          </section>
        </div>

        {/* Web: cột phải */}
        <aside className="hidden flex-col gap-4 md:flex" aria-label="Lịch, thói quen và nghỉ ngơi hôm nay">
          <section className="bg-card flex flex-col gap-2.5 rounded-lg border p-4" aria-labelledby="today-cal">
            <div className="flex items-center justify-between">
              <h2 id="today-cal" className="text-[15px] font-semibold">Lịch hôm nay</h2>
              <Link href="/calendar" className="text-primary text-[13px] font-semibold">Mở lịch</Link>
            </div>
            <Timeline slots={timeline} empty="Hôm nay chưa có khối lịch nào." />
          </section>
          <section className="bg-card flex flex-col gap-1 rounded-lg border p-4" aria-labelledby="today-habits">
            <h2 id="today-habits" className="pb-1 text-[15px] font-semibold">Thói quen hôm nay</h2>
            <HabitsToday habits={habitRows} variant="list" />
          </section>
          <section className="bg-card flex flex-col gap-3 rounded-lg border p-4" aria-labelledby="today-rest">
            <div className="flex items-center justify-between">
              <h2 id="today-rest" className="text-[15px] font-semibold">Nghỉ ngơi</h2>
              <span className="text-muted-foreground font-mono text-xs">{rest.todayMin} / 60 phút</span>
            </div>
            <RestToday todayMin={rest.todayMin} />
          </section>
        </aside>
      </div>
    </>
  );
}

// Dòng thời gian trong ngày: khối cố định (nền nhạt), việc đã xếp (nền đặc), khe trống (viền đứt).
function Timeline({ slots, empty }: { slots: Slot[]; empty: string }) {
  if (!slots.length) return <p className="text-muted-foreground text-[13px]">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {slots.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground w-10 shrink-0 font-mono text-xs">{fmtTime(s.startAt)}</span>
          {s.kind === "free" ? (
            <Link
              href={`/calendar?day=${startOfDay(s.startAt)}`}
              className="border-input text-muted-foreground hover:bg-accent flex min-h-11 flex-1 items-center rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium transition-colors md:min-h-8"
            >
              Trống {fmtDuration(Math.round((s.endAt - s.startAt) / 60_000))} · xếp việc vào đây
            </Link>
          ) : (
            <span
              className={cn(
                "min-h-8 flex-1 truncate rounded-md px-2.5 py-1.5 text-xs font-semibold",
                s.kind === "fixed" ? areaSoftClass(s.area) : areaSolidClass(s.area),
              )}
            >
              {s.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
