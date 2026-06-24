import { and, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedSchedule, timeBlock, task } from "@/db/schema";
import type { TimeBlock } from "@/db/schema";
import { startOfDay } from "@/lib/scheduler";
import { PageHeader } from "@/components/PageHeader";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

// Lấy Thứ Hai đầu tuần (server-side)
function getMonday(ms: number): number {
  const d = new Date(ms);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Màn "Lịch" (US-05, S7): xem khối cố định hôm nay + time-block (việc đã xếp),
// kéo-thả để đổi giờ (desktop) / chạm-đặt (mobile). Đọc dữ liệu phía server,
// trao cho island tương tác. Múi giờ hiển thị: Asia/Ho_Chi_Minh (lib/format).
//
// Query params:
//   ?day=<epochMs>        — xem 1 ngày cụ thể (DayView)
//   ?weekStart=<epochMs>  — xem tuần bắt đầu từ thứ Hai đó (WeekView)
//   (không có gì)         — mặc định: ngày hôm nay, DayView
export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const now = Date.now();

  const fixed = await db.select().from(fixedSchedule);
  const tasks = await db.select().from(task).where(ne(task.status, "done")).orderBy();

  let day0: number;
  let blocks: TimeBlock[];

  const weekStartParam = typeof params.weekStart === "string" ? params.weekStart : undefined;
  const dayParam = typeof params.day === "string" ? params.day : undefined;

  if (weekStartParam) {
    // WeekView: tải blocks cho cả 7 ngày của tuần
    const ws = parseInt(weekStartParam, 10);
    const weekMonday = getMonday(isNaN(ws) ? now : ws);
    day0 = weekMonday;
    const weekEnd = weekMonday + 7 * DAY;
    blocks = await db
      .select()
      .from(timeBlock)
      .where(and(gte(timeBlock.startAt, weekMonday), lte(timeBlock.startAt, weekEnd)))
      .orderBy(asc(timeBlock.startAt));
  } else if (dayParam) {
    // DayView: tải blocks của 1 ngày
    const dayMs = parseInt(dayParam, 10);
    day0 = startOfDay(isNaN(dayMs) ? now : dayMs);
    blocks = await db
      .select()
      .from(timeBlock)
      .where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, day0 + DAY)))
      .orderBy(asc(timeBlock.startAt));
  } else {
    // Mặc định: ngày hôm nay
    day0 = startOfDay(now);
    blocks = await db
      .select()
      .from(timeBlock)
      .where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, day0 + DAY)))
      .orderBy(asc(timeBlock.startAt));
  }

  return (
    <>
      <PageHeader title="Lịch" sub="Xếp việc né giờ bận" />
      <CalendarClient day0={day0} fixed={fixed} blocks={blocks} tasks={tasks} />
    </>
  );
}
