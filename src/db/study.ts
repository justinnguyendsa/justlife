import { and, asc, desc, eq, isNotNull, lte, ne } from "drizzle-orm";
import { db } from "./client";
import { stCourse, stItem, stNote } from "./schema";

const DAY = 86_400_000;

// 1 truy vấn lấy mọi mục rồi nhóm theo môn, thay vì 1 truy vấn mỗi môn (SPEC-Perf-P1 T05).
export async function listCourses() {
  const [courses, allItems] = await Promise.all([
    db.select().from(stCourse).orderBy(desc(stCourse.createdAt)),
    db.select().from(stItem),
  ]);
  const byCourse = new Map<string, typeof allItems>();
  for (const i of allItems) {
    const arr = byCourse.get(i.courseId) ?? [];
    arr.push(i);
    byCourse.set(i.courseId, arr);
  }
  return courses.map((c) => {
    const items = byCourse.get(c.id) ?? [];
    const pending = items.filter((i) => i.status !== "done" && i.dueAt != null).sort((a, b) => a.dueAt! - b.dueAt!);
    return { ...c, itemCount: items.length, doneCount: items.filter((i) => i.status === "done").length, nextDueAt: pending[0]?.dueAt ?? null };
  });
}

export async function getCourseDetail(id: string) {
  const [courseRows, items, notes] = await Promise.all([
    db.select().from(stCourse).where(eq(stCourse.id, id)).limit(1),
    db.select().from(stItem).where(eq(stItem.courseId, id)).orderBy(asc(stItem.dueAt)),
    db.select().from(stNote).where(eq(stNote.courseId, id)).orderBy(desc(stNote.createdAt)),
  ]);
  const course = courseRows[0] ?? null;
  if (!course) return null;
  return { course, items, notes };
}

export async function getUpcomingStudy(now = Date.now()) {
  const [items, courses] = await Promise.all([
    db.select().from(stItem)
      .where(and(ne(stItem.status, "done"), isNotNull(stItem.dueAt), lte(stItem.dueAt, now + 14 * DAY)))
      .orderBy(asc(stItem.dueAt)),
    db.select().from(stCourse),
  ]);
  const map = Object.fromEntries(courses.map((c) => [c.id, c.name]));
  return items.map((i) => ({ ...i, courseName: map[i.courseId] ?? "" }));
}
