import { eq, inArray } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import {
  accessCode,
  consentLog,
  lmsUser,
  tcAttendance,
  tcGrade,
  tcStudent,
  tcSubmission,
} from "@/db/lms/schema";
import { deleteSubmission } from "@/lib/lms/storage";
import { logAccess } from "@/lib/lms/audit";

// 🗑️ Cascade delete 1 học viên (SPEC-P5a §7.3, blocker "required", AC-13). R-JL-STUDENT-PII-01.
// BẤT BIẾN:
//  - 1 TRANSACTION cho mọi bảng lms.db → atomic (toàn bộ thành công hoặc rollback, KHÔNG để mồ côi).
//  - Xóa: tc_grade, tc_attendance, tc_submission, consent_log, access_code, lms_user, tc_student
//    (theo studentId; access_code theo lmsUserId resolve từ studentId).
//  - File bài nộp trên đĩa: xóa SAU commit DB (file IO ngoài transaction; deleteSubmission idempotent).
//  - Audit action="delete_student" GHI NGOÀI transaction (giữ vết cả khi xóa thành công).
//
// ⚠ Hành động PHÁ HỦY dữ liệu → chỉ gọi từ luồng có chủ đích (removeStudent của instructor).
//   Chỉ chạm lms.db (KHÔNG đụng personal.db — R-JL-TWO-FACES-01).
//
// 🗣️ Bình dân: xóa SẠCH một học viên — điểm, điểm danh, bài nộp (kèm file trên đĩa), đồng ý, mã
//    truy cập, tài khoản — trong một lần "tất cả hoặc không", không bỏ sót gì.

export interface CascadeResult {
  studentId: string;
  deleted: {
    grades: number;
    attendance: number;
    submissions: number;
    consents: number;
    accessCodes: number;
    lmsUsers: number;
    student: number;
  };
  filesDeleted: number;
}

/**
 * Xóa cascade toàn bộ dữ liệu của 1 học viên trong lms.db (atomic) + file bài nộp trên đĩa.
 * @param studentId tc_student.id
 * @param actor ai thực hiện (mặc định "instructor") — cho audit.
 */
export async function deleteStudentCascade(
  studentId: string,
  actor: string = "instructor",
): Promise<CascadeResult> {
  if (!studentId) throw new Error("[lms/cascade] studentId bắt buộc.");

  // Thu thập fileRef bài nộp TRƯỚC khi xóa (để xóa file đĩa sau commit). Chỉ id/ref — không PII.
  const subRows = await lmsDb
    .select({ fileRef: tcSubmission.fileRef })
    .from(tcSubmission)
    .where(eq(tcSubmission.studentId, studentId));
  const fileRefs = subRows.map((r) => r.fileRef).filter((r): r is string => !!r);

  // Resolve lms_user của HV (access_code gắn qua lmsUserId, không phải studentId).
  const users = await lmsDb
    .select({ id: lmsUser.id })
    .from(lmsUser)
    .where(eq(lmsUser.studentId, studentId));
  const lmsUserIds = users.map((u) => u.id);

  // ===== 1 TRANSACTION: xóa mọi bảng (atomic) =====
  const deleted = await lmsDb.transaction(async (tx) => {
    const grades = await tx.delete(tcGrade).where(eq(tcGrade.studentId, studentId));
    const attendance = await tx.delete(tcAttendance).where(eq(tcAttendance.studentId, studentId));
    const submissions = await tx.delete(tcSubmission).where(eq(tcSubmission.studentId, studentId));
    const consents = await tx.delete(consentLog).where(eq(consentLog.studentId, studentId));
    // access_code theo lmsUserId (nếu HV có lms_user); bỏ qua nếu không có.
    let accessCodes = 0;
    if (lmsUserIds.length > 0) {
      const r = await tx.delete(accessCode).where(inArray(accessCode.lmsUserId, lmsUserIds));
      accessCodes = r.rowsAffected ?? 0;
    }
    const lmsUsers = await tx.delete(lmsUser).where(eq(lmsUser.studentId, studentId));
    const student = await tx.delete(tcStudent).where(eq(tcStudent.id, studentId));

    return {
      grades: grades.rowsAffected ?? 0,
      attendance: attendance.rowsAffected ?? 0,
      submissions: submissions.rowsAffected ?? 0,
      consents: consents.rowsAffected ?? 0,
      accessCodes,
      lmsUsers: lmsUsers.rowsAffected ?? 0,
      student: student.rowsAffected ?? 0,
    };
  });

  // ===== Sau commit: xóa file đĩa (idempotent) =====
  let filesDeleted = 0;
  for (const ref of fileRefs) {
    await deleteSubmission(ref);
    filesDeleted++;
  }

  // Audit NGOÀI transaction (giữ vết hành động xóa; targetId = studentId là id, không PII thô).
  await logAccess({
    actor,
    actorType: actor === "instructor" ? "instructor" : "system",
    action: "delete_student",
    targetType: "student",
    targetId: studentId,
  });

  return { studentId, deleted, filesDeleted };
}
