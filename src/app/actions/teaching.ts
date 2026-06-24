"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcClass, tcStudent, tcSession, tcAttendance, tcAssignment, tcGrade } from "@/db/lms/schema";
import { genId } from "@/lib/id";
import { deleteStudentCascade } from "@/lib/lms/cascade";
import { logAccess } from "@/lib/lms/audit";

function refreshClass(id?: string) {
  revalidatePath("/teaching/classes");
  if (id) revalidatePath(`/teaching/classes/${id}`);
}

// ===== Class =====
export async function createClass(input: { name: string; term?: string }) {
  const id = genId();
  await lmsDb.insert(tcClass).values({ id, name: input.name, term: input.term ?? null, status: "active", createdAt: Date.now() });
  refreshClass();
  return { ok: true, id };
}

// Clone: copy assignment + roster học viên, KHÔNG copy điểm/điểm danh/buổi (chống copy-paste khi mở lớp mới).
export async function cloneClass(fromId: string, input: { name: string; term?: string }) {
  const id = genId();
  const now = Date.now();
  await lmsDb.insert(tcClass).values({ id, name: input.name, term: input.term ?? null, status: "active", createdAt: now });
  const students = await lmsDb.select().from(tcStudent).where(eq(tcStudent.classId, fromId));
  for (const s of students) await lmsDb.insert(tcStudent).values({ id: genId(), classId: id, name: s.name, email: s.email, note: s.note, createdAt: now });
  const assignments = await lmsDb.select().from(tcAssignment).where(eq(tcAssignment.classId, fromId));
  for (const a of assignments) await lmsDb.insert(tcAssignment).values({ id: genId(), classId: id, title: a.title, dueAt: null, maxScore: a.maxScore, createdAt: now });
  refreshClass();
  return { ok: true, id };
}

export async function archiveClass(id: string) {
  await lmsDb.update(tcClass).set({ status: "archived" }).where(eq(tcClass.id, id));
  refreshClass(id);
  return { ok: true };
}

// ===== Students =====
export async function addStudent(input: { classId: string; name: string; email?: string }) {
  await lmsDb.insert(tcStudent).values({ id: genId(), classId: input.classId, name: input.name, email: input.email ?? null, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true };
}
// Xóa HV = CASCADE (S5): xóa SẠCH điểm/điểm danh/bài nộp(+file)/đồng ý/mã truy cập/lms_user/tc_student
// trong 1 transaction — KHÔNG để mồ côi (R-JL-STUDENT-PII-01, AC-13). Audit ghi trong cascade.
export async function removeStudent(id: string, classId: string) {
  await deleteStudentCascade(id, "instructor");
  refreshClass(classId);
  return { ok: true };
}

// ===== Session + attendance =====
export async function createSession(input: { classId: string; dateAt: number; topic?: string }) {
  const id = genId();
  await lmsDb.insert(tcSession).values({ id, classId: input.classId, dateAt: input.dateAt, topic: input.topic ?? null, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true, id };
}
export async function setAttendance(sessionId: string, classId: string, entries: { studentId: string; status: string }[]) {
  const now = Date.now();
  await lmsDb.delete(tcAttendance).where(eq(tcAttendance.sessionId, sessionId));
  for (const e of entries) await lmsDb.insert(tcAttendance).values({ id: genId(), sessionId, studentId: e.studentId, status: e.status, markedAt: now });
  refreshClass(classId);
  return { ok: true };
}

// ===== Assignment + grade =====
export async function createAssignment(input: { classId: string; title: string; dueAt?: number | null; maxScore?: number }) {
  const id = genId();
  await lmsDb.insert(tcAssignment).values({ id, classId: input.classId, title: input.title, dueAt: input.dueAt ?? null, maxScore: input.maxScore ?? 10, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true, id };
}
export async function setGrade(input: { assignmentId: string; studentId: string; classId: string; score: number | null; feedback: string | null }) {
  const existing = (await lmsDb.select().from(tcGrade).where(and(eq(tcGrade.assignmentId, input.assignmentId), eq(tcGrade.studentId, input.studentId))).limit(1))[0];
  const now = Date.now();
  if (existing) {
    await lmsDb.update(tcGrade).set({ score: input.score, feedback: input.feedback, gradedAt: now }).where(eq(tcGrade.id, existing.id));
  } else {
    await lmsDb.insert(tcGrade).values({ id: genId(), assignmentId: input.assignmentId, studentId: input.studentId, score: input.score, feedback: input.feedback, gradedAt: now });
  }
  // Audit sửa điểm (append-only, KHÔNG ghi điểm số/nhận xét — chỉ id bài tập). Actor = instructor.
  await logAccess({ actor: "instructor", action: "grade_edit", targetType: "grade", targetId: input.assignmentId });
  refreshClass(input.classId);
  return { ok: true };
}

// ===== Update / Delete helpers =====
export async function updateAssignment(id: string, input: { title?: string; dueAt?: number | null; maxScore?: number }) {
  await lmsDb.update(tcAssignment).set(input).where(eq(tcAssignment.id, id));
  // classId không biết trực tiếp → revalidate rộng
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteSession(id: string, classId: string) {
  await lmsDb.delete(tcAttendance).where(eq(tcAttendance.sessionId, id));
  await lmsDb.delete(tcSession).where(eq(tcSession.id, id));
  refreshClass(classId);
  return { ok: true };
}

export async function deleteAssignment(id: string, classId: string) {
  await lmsDb.delete(tcGrade).where(eq(tcGrade.assignmentId, id));
  await lmsDb.delete(tcAssignment).where(eq(tcAssignment.id, id));
  refreshClass(classId);
  return { ok: true };
}
