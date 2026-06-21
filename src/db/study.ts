import { and, asc, desc, eq, isNotNull, lte, ne } from "drizzle-orm";
import { db } from "./client";
import { stCourse, stItem, stNote } from "./schema";

const DAY = 86_400_000;

export async function listCourses() {
  const courses = await db.select().from(stCourse).orderBy(desc(stCourse.createdAt));
  const out = [];
  for (const c of courses) {
    const items = await db.select().from(stItem).where(eq(stItem.courseId, c.id));
    const pending = items.filter((i) => i.status !== "done" && i.dueAt != null).sort((a, b) => a.dueAt! - b.dueAt!);
    out.push({ ...c, itemCount: items.length, doneCount: items.filter((i) => i.status === "done").length, nextDueAt: pending[0]?.dueAt ?? null });
  }
  return out;
}

export async function getCourseDetail(id: string) {
  const course = (await db.select().from(stCourse).where(eq(stCourse.id, id)).limit(1))[0] ?? null;
  if (!course) return null;
  const items = await db.select().from(stItem).where(eq(stItem.courseId, id)).orderBy(asc(stItem.dueAt));
  const notes = await db.select().from(stNote).where(eq(stNote.courseId, id)).orderBy(desc(stNote.createdAt));
  return { course, items, notes };
}

export async function getUpcomingStudy(now = Date.now()) {
  const items = await db.select().from(stItem)
    .where(and(ne(stItem.status, "done"), isNotNull(stItem.dueAt), lte(stItem.dueAt, now + 14 * DAY)))
    .orderBy(asc(stItem.dueAt));
  const courses = await db.select().from(stCourse);
  const map = Object.fromEntries(courses.map((c) => [c.id, c.name]));
  return items.map((i) => ({ ...i, courseName: map[i.courseId] ?? "" }));
}
