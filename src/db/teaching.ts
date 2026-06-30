import { asc, desc, eq, and, inArray } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcClass, tcStudent, tcSession, tcAttendance, tcAssignment, tcGrade, tcSubmission, tcMaterial } from "@/db/lms/schema";
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

// Tài liệu của lớp (instructor quản lý). Mới nhất trước.
export async function getClassMaterials(classId: string) {
  return lmsDb.select().from(tcMaterial).where(eq(tcMaterial.classId, classId)).orderBy(desc(tcMaterial.createdAt));
}

/** Tổng quan lớp: số HV, bài tập, % nộp TB, điểm trung bình. */
export async function getClassSummary(classId: string) {
  const [students, assignments] = await Promise.all([
    lmsDb.select({ id: tcStudent.id }).from(tcStudent).where(eq(tcStudent.classId, classId)),
    lmsDb.select({ id: tcAssignment.id }).from(tcAssignment).where(eq(tcAssignment.classId, classId)),
  ]);
  const studentCount = students.length;
  const assignmentCount = assignments.length;
  if (studentCount === 0 || assignmentCount === 0) {
    return { studentCount, assignmentCount, avgSubmissionPct: 0, avgScore: null };
  }
  const assignmentIds = assignments.map(a => a.id);
  const studentIds = students.map(s => s.id);

  const subs = await lmsDb
    .select({ studentId: tcSubmission.studentId, assignmentId: tcSubmission.assignmentId })
    .from(tcSubmission)
    .where(and(inArray(tcSubmission.assignmentId, assignmentIds), inArray(tcSubmission.studentId, studentIds)));

  const submittedByStudent = new Map<string, Set<string>>();
  for (const s of subs) {
    if (!submittedByStudent.has(s.studentId)) submittedByStudent.set(s.studentId, new Set());
    submittedByStudent.get(s.studentId)!.add(s.assignmentId);
  }
  const totalPct = studentIds.reduce(
    (sum, sid) => sum + ((submittedByStudent.get(sid)?.size ?? 0) / assignmentCount) * 100,
    0,
  );
  const avgSubmissionPct = Math.round(totalPct / studentCount);

  const grades = await lmsDb
    .select({ score: tcGrade.score })
    .from(tcGrade)
    .where(inArray(tcGrade.assignmentId, assignmentIds));
  const scored = grades.filter(g => g.score != null);
  const avgScore =
    scored.length > 0
      ? Math.round((scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length) * 10) / 10
      : null;

  return { studentCount, assignmentCount, avgSubmissionPct, avgScore };
}

/** Tỉ lệ nộp bài: số HV đã nộp, có submission nhưng chưa chấm điểm. */
export async function getAssignmentSubmissionStats(assignmentId: string, classId: string) {
  const students = await lmsDb
    .select({ id: tcStudent.id })
    .from(tcStudent)
    .where(eq(tcStudent.classId, classId));
  const totalStudents = students.length;
  const studentIds = students.map(s => s.id);
  if (totalStudents === 0) return { totalStudents, submittedCount: 0, pendingGradeCount: 0 };

  const subs = await lmsDb
    .select({ studentId: tcSubmission.studentId })
    .from(tcSubmission)
    .where(and(eq(tcSubmission.assignmentId, assignmentId), inArray(tcSubmission.studentId, studentIds)));
  const submittedStudents = new Set(subs.map(s => s.studentId));
  const submittedCount = submittedStudents.size;

  const grades = await lmsDb
    .select({ studentId: tcGrade.studentId })
    .from(tcGrade)
    .where(and(eq(tcGrade.assignmentId, assignmentId), inArray(tcGrade.studentId, studentIds)));
  const gradedStudents = new Set(grades.filter(g => g.studentId).map(g => g.studentId!));
  const pendingGradeCount = [...submittedStudents].filter(sid => !gradedStudents.has(sid)).length;

  return { totalStudents, submittedCount, pendingGradeCount };
}

/** Tiến độ từng HV trong lớp: số bài đã nộp và điểm TB. */
export async function getStudentProgressInClass(classId: string) {
  const assignments = await lmsDb
    .select({ id: tcAssignment.id })
    .from(tcAssignment)
    .where(eq(tcAssignment.classId, classId));
  const totalAssignments = assignments.length;
  const assignmentIds = assignments.map(a => a.id);
  if (totalAssignments === 0) return {} as Record<string, { submitted: number; total: number; avgScore: number | null }>;

  const students = await lmsDb
    .select({ id: tcStudent.id })
    .from(tcStudent)
    .where(eq(tcStudent.classId, classId));
  const studentIds = students.map(s => s.id);
  if (studentIds.length === 0) return {} as Record<string, { submitted: number; total: number; avgScore: number | null }>;

  const [subs, grades] = await Promise.all([
    lmsDb
      .select({ studentId: tcSubmission.studentId, assignmentId: tcSubmission.assignmentId })
      .from(tcSubmission)
      .where(and(inArray(tcSubmission.assignmentId, assignmentIds), inArray(tcSubmission.studentId, studentIds))),
    lmsDb
      .select({ studentId: tcGrade.studentId, score: tcGrade.score })
      .from(tcGrade)
      .where(and(inArray(tcGrade.assignmentId, assignmentIds), inArray(tcGrade.studentId, studentIds))),
  ]);

  const result: Record<string, { submitted: number; total: number; avgScore: number | null }> = {};
  for (const sid of studentIds) {
    const mySubs = new Set(subs.filter(s => s.studentId === sid).map(s => s.assignmentId));
    const myGrades = grades.filter(g => g.studentId === sid && g.score != null);
    const avgScore =
      myGrades.length > 0
        ? Math.round((myGrades.reduce((s, g) => s + (g.score ?? 0), 0) / myGrades.length) * 10) / 10
        : null;
    result[sid] = { submitted: mySubs.size, total: totalAssignments, avgScore };
  }
  return result;
}
