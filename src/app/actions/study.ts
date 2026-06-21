"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stCourse, stItem, stNote } from "@/db/schema";
import { genId } from "@/lib/id";

function refresh(courseId?: string) {
  revalidatePath("/study");
  if (courseId) revalidatePath(`/study/${courseId}`);
}

// ===== Course =====
export async function createCourse(input: { name: string; code?: string; term?: string }) {
  const id = genId();
  await db.insert(stCourse).values({ id, name: input.name, code: input.code ?? null, term: input.term ?? null, createdAt: Date.now() });
  refresh();
  return { ok: true, id };
}
export async function deleteCourse(id: string) {
  await db.delete(stItem).where(eq(stItem.courseId, id));
  await db.delete(stNote).where(eq(stNote.courseId, id));
  await db.delete(stCourse).where(eq(stCourse.id, id));
  refresh();
  return { ok: true };
}

// ===== Item (bài tập/đồ án/quiz/thi) =====
export async function createItem(input: { courseId: string; title: string; kind: string; dueAt?: number | null }) {
  await db.insert(stItem).values({ id: genId(), courseId: input.courseId, title: input.title, kind: input.kind, dueAt: input.dueAt ?? null, status: "todo", createdAt: Date.now() });
  refresh(input.courseId);
  return { ok: true };
}
export async function setItemStatus(id: string, courseId: string, status: string) {
  await db.update(stItem).set({ status, doneAt: status === "done" ? Date.now() : null }).where(eq(stItem.id, id));
  refresh(courseId);
  return { ok: true };
}
export async function deleteItem(id: string, courseId: string) {
  await db.delete(stItem).where(eq(stItem.id, id));
  refresh(courseId);
  return { ok: true };
}

// ===== Note / tài liệu =====
export async function createNote(input: { courseId: string; title: string; body?: string; url?: string }) {
  await db.insert(stNote).values({ id: genId(), courseId: input.courseId, title: input.title, body: input.body ?? null, url: input.url ?? null, createdAt: Date.now() });
  refresh(input.courseId);
  return { ok: true };
}
export async function deleteNote(id: string, courseId: string) {
  await db.delete(stNote).where(eq(stNote.id, id));
  refresh(courseId);
  return { ok: true };
}
