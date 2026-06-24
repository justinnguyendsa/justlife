import { and, asc, desc, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "./client";
import { task, fixedSchedule, timeBlock } from "./schema";
import { startOfDay } from "@/lib/scheduler";

const DAY = 86_400_000;

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.query.userSettings.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function listTasks(area?: string) {
  const where = area
    ? and(ne(task.status, "done"), ne(task.status, "archived"), eq(task.area, area))
    : and(ne(task.status, "done"), ne(task.status, "archived"));
  return db.select().from(task).where(where)
    .orderBy(sql`${task.priorityScore} IS NULL`, desc(task.priorityScore), desc(task.createdAt));
}

export async function getTask(id: string) {
  const r = await db.select().from(task).where(eq(task.id, id)).limit(1);
  return r[0] ?? null;
}

export async function getTodayData(now = Date.now()) {
  const doing = await db.select().from(task).where(eq(task.status, "doing")).orderBy(desc(task.priorityScore));
  const top = await db.select().from(task)
    .where(and(ne(task.status, "done"), ne(task.status, "doing"), isNotNull(task.priorityScore)))
    .orderBy(desc(task.priorityScore)).limit(3);
  const day0 = startOfDay(now);
  const blocks = await db.select().from(timeBlock)
    .where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, day0 + DAY))).orderBy(asc(timeBlock.startAt));
  const fixed = await db.select().from(fixedSchedule);
  return { doing, top, blocks, fixed };
}

export async function getCalendarData(dayMs = Date.now()) {
  const day0 = startOfDay(dayMs);
  const fixed = await db.select().from(fixedSchedule);
  const blocks = await db.select().from(timeBlock)
    .where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, day0 + DAY))).orderBy(asc(timeBlock.startAt));
  const tasks = await db.select().from(task).where(ne(task.status, "done")).orderBy(desc(task.priorityScore));
  return { day0, fixed, blocks, tasks };
}

export async function getDeadlinesData(now = Date.now()) {
  const rows = await db.select().from(task)
    .where(and(ne(task.status, "done"), isNotNull(task.deadlineAt))).orderBy(asc(task.deadlineAt));
  const overdue = rows.filter((t) => t.deadlineAt! < now);
  const upcoming = rows.filter((t) => t.deadlineAt! >= now && t.deadlineAt! <= now + 7 * DAY);
  const later = rows.filter((t) => t.deadlineAt! > now + 7 * DAY);
  return { overdue, upcoming, later };
}
