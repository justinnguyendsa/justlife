import { and, eq, inArray } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import {
  tcAssignment,
  tcAttendance,
  tcClass,
  tcGrade,
  tcMaterial,
  tcSession,
  tcStudent,
  tcSubmission,
} from "@/db/lms/schema";
import { decryptFieldOpt } from "@/lib/lms/crypto";
import { auth } from "@/auth";

// ⭐ Data-access wrapper SCOPED cho cổng học viên (ADR-002 Q4, SPEC-P5a §4, blocker #1).
// BẤT BIẾN:
//  1. MỌI hàm nhận `studentId` SERVER-DERIVED (từ session) — KHÔNG nhận id từ client/query/body.
//  2. MỌI SELECT trả dữ liệu cá nhân có WHERE studentId / membership ở TẦNG DB.
//  3. Truy cập theo id object → kèm membership/ownership check (chống IDOR object-level).
//  4. UI/route CHỈ gọi wrapper này — KHÔNG tự viết Drizzle query với id từ request.
//  5. KHÔNG trả dữ liệu HV khác / lớp khác / Personal OS.
// KHÔNG import @/db/client (Personal) — chỉ chạm lmsDb.
//
// 🗣️ Bình dân: một cửa duy nhất lấy dữ liệu, luôn hỏi "bạn là ai" và chỉ đưa đồ của chính bạn.
//    Sửa id trên URL cũng vô ích.
//
// Note: field định danh (name/feedback…) hiện PLAINTEXT ở local (S1) → decryptFieldOpt
// chỉ giải mã nếu là ciphertext "v1:"; nếu plaintext thì trả nguyên (an toàn cả 2 chiều).

/** Đọc studentId từ session Auth.js. Null nếu chưa đăng nhập. NGUỒN DUY NHẤT của studentId. */
export async function getSessionStudentId(): Promise<string | null> {
  const session = await auth();
  return session?.studentId ?? null;
}

/** Giải mã an toàn: ciphertext v1 → plaintext; nếu đã là plaintext (local S1) → trả nguyên. */
function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      return decryptFieldOpt(value);
    } catch {
      return null; // dữ liệu hỏng → không lộ rác
    }
  }
  return value;
}

/** Lấy danh sách classId mà HV thuộc về (HV có thể có nhiều bản ghi/nhiều lớp). */
async function myClassIds(studentId: string): Promise<string[]> {
  const rows = await lmsDb
    .select({ classId: tcStudent.classId })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId));
  return [...new Set(rows.map((r) => r.classId))];
}

/**
 * Ném lỗi nếu studentId KHÔNG thuộc classId. Dùng TRƯỚC mọi truy cập theo classId.
 */
export async function assertMembership(studentId: string, classId: string): Promise<void> {
  const ids = await myClassIds(studentId);
  if (!ids.includes(classId)) {
    throw new Error("FORBIDDEN: không thuộc lớp này.");
  }
}

/** Lớp của tôi (chỉ lớp HV thuộc về). */
export async function getMyClasses(studentId: string) {
  const ids = await myClassIds(studentId);
  if (ids.length === 0) return [];
  const classes = await lmsDb
    .select({
      id: tcClass.id,
      name: tcClass.name,
      term: tcClass.term,
      status: tcClass.status,
    })
    .from(tcClass)
    .where(inArray(tcClass.id, ids));
  return classes;
}

/** Điểm của TÔI (chỉ điểm của studentId). join assignment để có tiêu đề/điểm tối đa. */
export async function getMyGrades(studentId: string) {
  const rows = await lmsDb
    .select({
      gradeId: tcGrade.id,
      assignmentId: tcAssignment.id,
      assignmentTitle: tcAssignment.title,
      maxScore: tcAssignment.maxScore,
      classId: tcAssignment.classId,
      score: tcGrade.score, // SỐ — không mã hóa
      feedback: tcGrade.feedback, // 🔒 có thể là ciphertext
      gradedAt: tcGrade.gradedAt,
    })
    .from(tcGrade)
    .innerJoin(tcAssignment, eq(tcGrade.assignmentId, tcAssignment.id))
    .where(eq(tcGrade.studentId, studentId)); // ⬅ scope ở TẦNG DB
  return rows.map((r) => ({ ...r, feedback: safeDecrypt(r.feedback) }));
}

/** Bài tập của các lớp TÔI thuộc về. */
export async function getMyAssignments(studentId: string) {
  const ids = await myClassIds(studentId);
  if (ids.length === 0) return [];
  return lmsDb
    .select()
    .from(tcAssignment)
    .where(inArray(tcAssignment.classId, ids)); // ⬅ scope theo lớp của HV
}

/** Điểm danh của TÔI (chỉ bản ghi của studentId). join session để có ngày/chủ đề. */
export async function getMyAttendance(studentId: string) {
  return lmsDb
    .select({
      attendanceId: tcAttendance.id,
      sessionId: tcSession.id,
      classId: tcSession.classId,
      dateAt: tcSession.dateAt,
      topic: tcSession.topic,
      status: tcAttendance.status,
      markedAt: tcAttendance.markedAt,
    })
    .from(tcAttendance)
    .innerJoin(tcSession, eq(tcAttendance.sessionId, tcSession.id))
    .where(eq(tcAttendance.studentId, studentId)); // ⬅ scope ở TẦNG DB
}

/**
 * Tài liệu các lớp TÔI thuộc về (visibility='class'). KHÔNG trả tài liệu draft / lớp khác.
 * (tc_material trong lms.db — ĐỌC scoped; route tải file ở S4 sẽ tự check membership lần nữa.)
 */
export async function getMyMaterials(studentId: string) {
  const ids = await myClassIds(studentId);
  if (ids.length === 0) return [];
  return lmsDb
    .select({
      id: tcMaterial.id,
      classId: tcMaterial.classId,
      title: tcMaterial.title,
      fileRef: tcMaterial.fileRef,
      url: tcMaterial.url,
      mime: tcMaterial.mime,
      size: tcMaterial.size,
      createdAt: tcMaterial.createdAt,
    })
    .from(tcMaterial)
    .where(
      and(
        inArray(tcMaterial.classId, ids), // ⬅ chỉ lớp của HV
        eq(tcMaterial.visibility, "class"), // ⬅ không lộ draft
      ),
    );
}

// ===== Bài nộp (Stage 4) — luôn scope theo studentId; chống IDOR object-level =====

/** Bài nộp của TÔI cho 1 bài tập (mới nhất nếu nhiều). null nếu chưa nộp. */
export async function getMySubmission(studentId: string, assignmentId: string) {
  const rows = await lmsDb
    .select()
    .from(tcSubmission)
    .where(
      and(
        eq(tcSubmission.studentId, studentId), // ⬅ scope ở TẦNG DB (chống IDOR)
        eq(tcSubmission.assignmentId, assignmentId),
      ),
    );
  if (rows.length === 0) return null;
  // Mới nhất trước; giải mã tên gốc🔒 để hiển thị.
  const latest = [...rows].sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))[0];
  return { ...latest, originalName: safeDecrypt(latest.originalName) };
}

/**
 * Bài tập của các lớp TÔI thuộc về, KÈM trạng thái bài nộp của TÔI (nếu có).
 * Ghép getMyAssignments + bài nộp của studentId — đều scoped theo studentId.
 */
export async function getMyAssignmentsWithSubmission(studentId: string) {
  const assignments = await getMyAssignments(studentId);
  if (assignments.length === 0) return [];

  // Lấy TẤT CẢ bài nộp của TÔI (1 lần) rồi map theo assignmentId — chỉ bài nộp của studentId.
  const mySubs = await lmsDb
    .select()
    .from(tcSubmission)
    .where(eq(tcSubmission.studentId, studentId)); // ⬅ scope ở TẦNG DB

  // Bài nộp mới nhất cho mỗi assignment.
  const latestByAssignment = new Map<string, (typeof mySubs)[number]>();
  for (const s of mySubs) {
    const cur = latestByAssignment.get(s.assignmentId);
    if (!cur || (s.submittedAt ?? 0) > (cur.submittedAt ?? 0)) {
      latestByAssignment.set(s.assignmentId, s);
    }
  }

  return assignments.map((a) => {
    const sub = latestByAssignment.get(a.id) ?? null;
    return {
      assignment: a,
      submission: sub
        ? {
            id: sub.id,
            fileRef: sub.fileRef,
            originalName: safeDecrypt(sub.originalName),
            mime: sub.mime,
            size: sub.size,
            submittedAt: sub.submittedAt,
            status: sub.status,
          }
        : null,
    };
  });
}

/**
 * Ném lỗi nếu studentId KHÔNG phải chủ của bài nộp (ref). Dùng TRƯỚC khi trả file (chống IDOR).
 * Trả về metadata bài nộp (đã xác nhận quyền sở hữu) — gồm tên gốc đã giải mã.
 */
export async function assertOwnsSubmission(studentId: string, fileRef: string) {
  const rows = await lmsDb
    .select()
    .from(tcSubmission)
    .where(eq(tcSubmission.fileRef, fileRef))
    .limit(1);
  const sub = rows[0];
  // Không tiết lộ "ref tồn tại hay không" — cùng một lỗi cho not-found và not-owner.
  if (!sub || sub.studentId !== studentId) {
    throw new Error("FORBIDDEN: không có quyền với bài nộp này.");
  }
  return { ...sub, originalName: safeDecrypt(sub.originalName) };
}
