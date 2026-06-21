import { asc, desc, eq } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcClass, tcStudent, tcSession, tcAttendance, tcAssignment, tcGrade, tcSubmission } from "@/db/lms/schema";
import { decryptFieldOpt } from "@/lib/lms/crypto";

export async function listClasses() {
  const classes = await lmsDb.select().from(tcClass).orderBy(desc(tcClass.createdAt));
  const out = [];
  for (const c of classes) {
    const s = await lmsDb.select().from(tcStudent).where(eq(tcStudent.classId, c.id));
    const ses = await lmsDb.select().from(tcSession).where(eq(tcSession.classId, c.id));
    out.push({ ...c, studentCount: s.length, sessionCount: ses.length });
  }
  return out;
}

export async function getClassDetail(id: string) {
  const cls = (await lmsDb.select().from(tcClass).where(eq(tcClass.id, id)).limit(1))[0] ?? null;
  if (!cls) return null;
  const students = await lmsDb.select().from(tcStudent).where(eq(tcStudent.classId, id)).orderBy(asc(tcStudent.name));
  const sessions = await lmsDb.select().from(tcSession).where(eq(tcSession.classId, id)).orderBy(desc(tcSession.dateAt));
  const assignments = await lmsDb.select().from(tcAssignment).where(eq(tcAssignment.classId, id)).orderBy(desc(tcAssignment.createdAt));
  return { cls, students, sessions, assignments };
}

export async function getAttendance(sessionId: string) {
  return lmsDb.select().from(tcAttendance).where(eq(tcAttendance.sessionId, sessionId));
}

export async function getGrades(assignmentId: string) {
  return lmsDb.select().from(tcGrade).where(eq(tcGrade.assignmentId, assignmentId));
}

// originalName🔒 giải mã để hiển thị; nếu plaintext (S1) → trả nguyên (an toàn cả 2 chiều).
function decName(v: string | null): string | null {
  if (v == null) return null;
  if (v.startsWith("v1:")) {
    try { return decryptFieldOpt(v); } catch { return null; }
  }
  return v;
}

// Bài nộp của 1 bài tập (instructor xem ai đã nộp để chấm). Personal-side: Minh tin cậy local.
export async function getSubmissions(assignmentId: string) {
  const rows = await lmsDb.select().from(tcSubmission).where(eq(tcSubmission.assignmentId, assignmentId));
  return rows.map((s) => ({ ...s, originalName: decName(s.originalName) }));
}

// 1 bài nộp theo id (instructor tải về để chấm). null nếu không có.
export async function getSubmissionById(id: string) {
  const s = (await lmsDb.select().from(tcSubmission).where(eq(tcSubmission.id, id)).limit(1))[0];
  if (!s) return null;
  return { ...s, originalName: decName(s.originalName) };
}
