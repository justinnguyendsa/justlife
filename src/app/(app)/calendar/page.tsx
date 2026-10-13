import { and, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedSchedule, timeBlock, task } from "@/db/schema";
import { startOfDay, startOfWeek } from "@/lib/scheduler";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

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

  const weekStartParam = typeof params.weekStart === "string" ? params.weekStart : undefined;
  const dayParam = typeof params.day === "string" ? params.day : undefined;

  // Khoảng thời gian cần tải: cả tuần (WeekView), 1 ngày chỉ định, hoặc hôm nay (mặc định).
  let day0: number;
  let rangeEnd: number;
  if (weekStartParam) {
    const ws = parseInt(weekStartParam, 10);
    day0 = startOfWeek(isNaN(ws) ? now : ws);
    rangeEnd = day0 + 7 * DAY;
  } else if (dayParam) {
    const dayMs = parseInt(dayParam, 10);
    day0 = startOfDay(isNaN(dayMs) ? now : dayMs);
    rangeEnd = day0 + DAY;
  } else {
    day0 = startOfDay(now);
    rangeEnd = day0 + DAY;
  }

  // 3 truy vấn độc lập chạy song song (SPEC-Perf-P1 T04).
  const [fixed, tasks, blocks] = await Promise.all([
    db.select().from(fixedSchedule),
    db.select().from(task).where(ne(task.status, "done")).orderBy(),
    db.select().from(timeBlock)
      .where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, rangeEnd)))
      .orderBy(asc(timeBlock.startAt)),
  ]);

  // Thanh tiêu đề nằm trong CalendarClient vì phụ thuộc trạng thái ngày/tuần (SPEC-UI-P2.3 F01).
  return (
    <CalendarClient
      day0={day0}
      now={now}
      fixed={fixed}
      blocks={blocks}
      tasks={tasks}
      initialView={weekStartParam ? "week" : "day"}
    />
  );
}
