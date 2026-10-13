// Thống kê lớp tính trong bộ nhớ từ dữ liệu đã gom (SPEC-Perf-P1 T08).
// Giữ đúng ngữ nghĩa các hàm cũ trong src/db/teaching.ts: getClassSummary,
// getAssignmentSubmissionStats, getStudentProgressInClass — chỉ đổi cách lấy dữ liệu.

export type SubRef = { studentId: string; assignmentId: string };
export type GradeRef = { studentId: string; assignmentId: string; score: number | null };

export type ClassSummary = { studentCount: number; assignmentCount: number; avgSubmissionPct: number; avgScore: number | null };
export type SubmissionStats = { totalStudents: number; submittedCount: number; pendingGradeCount: number };
export type StudentProgress = Record<string, { submitted: number; total: number; avgScore: number | null }>;

const round1 = (n: number) => Math.round(n * 10) / 10;

function avgScoreOf(grades: GradeRef[]): number | null {
  const scored = grades.filter((g) => g.score != null);
  return scored.length > 0 ? round1(scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length) : null;
}

/** % nộp TB chỉ tính bài nộp của học viên trong lớp; điểm TB tính mọi điểm của các bài tập lớp. */
export function classSummary(studentIds: string[], assignmentIds: string[], subs: SubRef[], grades: GradeRef[]): ClassSummary {
  const studentCount = studentIds.length;
  const assignmentCount = assignmentIds.length;
  if (studentCount === 0 || assignmentCount === 0) {
    return { studentCount, assignmentCount, avgSubmissionPct: 0, avgScore: null };
  }
  const inClass = new Set(studentIds);
  const inAssignments = new Set(assignmentIds);
  const submittedByStudent = new Map<string, Set<string>>();
  for (const s of subs) {
    if (!inClass.has(s.studentId) || !inAssignments.has(s.assignmentId)) continue;
    if (!submittedByStudent.has(s.studentId)) submittedByStudent.set(s.studentId, new Set());
    submittedByStudent.get(s.studentId)!.add(s.assignmentId);
  }
  const totalPct = studentIds.reduce((sum, sid) => sum + ((submittedByStudent.get(sid)?.size ?? 0) / assignmentCount) * 100, 0);
  const avgSubmissionPct = Math.round(totalPct / studentCount);
  const avgScore = avgScoreOf(grades.filter((g) => inAssignments.has(g.assignmentId)));
  return { studentCount, assignmentCount, avgSubmissionPct, avgScore };
}

/** Tổng HV trong lớp, số HV đã nộp, số HV đã nộp mà chưa có dòng điểm. */
export function assignmentSubmissionStats(assignmentId: string, studentIds: string[], subs: SubRef[], grades: GradeRef[]): SubmissionStats {
  const totalStudents = studentIds.length;
  if (totalStudents === 0) return { totalStudents, submittedCount: 0, pendingGradeCount: 0 };
  const inClass = new Set(studentIds);
  const submitted = new Set(subs.filter((s) => s.assignmentId === assignmentId && inClass.has(s.studentId)).map((s) => s.studentId));
  const graded = new Set(grades.filter((g) => g.assignmentId === assignmentId && inClass.has(g.studentId)).map((g) => g.studentId));
  const pendingGradeCount = [...submitted].filter((sid) => !graded.has(sid)).length;
  return { totalStudents, submittedCount: submitted.size, pendingGradeCount };
}

/** Số bài đã nộp và điểm TB của từng HV trong lớp; {} khi lớp chưa có bài tập hoặc học viên. */
export function studentProgress(studentIds: string[], assignmentIds: string[], subs: SubRef[], grades: GradeRef[]): StudentProgress {
  const totalAssignments = assignmentIds.length;
  if (totalAssignments === 0 || studentIds.length === 0) return {};
  const inAssignments = new Set(assignmentIds);
  const result: StudentProgress = {};
  for (const sid of studentIds) {
    const mySubs = new Set(subs.filter((s) => s.studentId === sid && inAssignments.has(s.assignmentId)).map((s) => s.assignmentId));
    const myGrades = grades.filter((g) => g.studentId === sid && inAssignments.has(g.assignmentId));
    result[sid] = { submitted: mySubs.size, total: totalAssignments, avgScore: avgScoreOf(myGrades) };
  }
  return result;
}

/** Nhóm mảng theo khoá; mọi khoá trong `keys` đều có mặt (mảng rỗng nếu không có dòng nào). */
export function groupBy<T>(keys: string[], rows: T[], keyOf: (r: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = Object.fromEntries(keys.map((k) => [k, [] as T[]]));
  for (const r of rows) {
    const k = keyOf(r);
    if (out[k]) out[k].push(r);
  }
  return out;
}
