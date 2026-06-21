import { and, isNotNull, ne } from "drizzle-orm";
import { db } from "./client";
import { task, stItem, stCourse } from "./schema";
import { AREA_LABEL } from "@/lib/format";

const DAY = 86_400_000;

export type DeadlineEntry = {
  id: string; title: string; area: string; dueAt: number;
  source: "task" | "study"; sub: string; href: string;
};

// Gộp deadline từ Việc (task) + Học (st_item) thành 1 danh sách thống nhất.
export async function getUnifiedDeadlines(now = Date.now()) {
  const tasks = await db.select().from(task).where(and(ne(task.status, "done"), isNotNull(task.deadlineAt)));
  const items = await db.select().from(stItem).where(and(ne(stItem.status, "done"), isNotNull(stItem.dueAt)));
  const courses = await db.select().from(stCourse);
  const courseName = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  const entries: DeadlineEntry[] = [
    ...tasks.map((t) => ({ id: t.id, title: t.title, area: t.area, dueAt: t.deadlineAt!, source: "task" as const, sub: AREA_LABEL[t.area] ?? "việc", href: "/tasks" })),
    ...items.map((i) => ({ id: i.id, title: i.title, area: "study", dueAt: i.dueAt!, source: "study" as const, sub: courseName[i.courseId] ?? "học", href: `/study/${i.courseId}` })),
  ].sort((a, b) => a.dueAt - b.dueAt);

  return {
    overdue: entries.filter((e) => e.dueAt < now),
    upcoming: entries.filter((e) => e.dueAt >= now && e.dueAt <= now + 7 * DAY),
    later: entries.filter((e) => e.dueAt > now + 7 * DAY),
    next24h: entries.filter((e) => e.dueAt <= now + DAY), // cho "Deadline 24 giờ" ở Hôm nay (gồm cả quá hạn)
  };
}
