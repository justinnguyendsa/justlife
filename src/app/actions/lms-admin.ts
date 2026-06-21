"use server";
import { eq } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcStudent } from "@/db/lms/schema";
import { issueAccessCode } from "@/lib/lms/access-code";
import { recordConsent } from "@/lib/lms/consent";

// Instructor-side action: Minh cấp mã truy cập cho 1 học viên (gọi từ trang /teaching sau — S3+).
// Trả CODE THÔ để hiển thị MỘT LẦN cho Minh chép gửi học viên (hệ thống chỉ lưu hash).
// ⚠ Đây là vùng INSTRUCTOR (Minh single-user), KHÔNG phải cổng học viên — không qua middleware portal.
//   Go-live (P5b): cần tách rõ "instructor area" + auth instructor nếu mở qua internet (ADR-002 §Q3 lưu ý).
//
// 🗣️ Bình dân: Minh bấm "cấp mã" cho một học viên → màn hình hiện mã 1 lần (AAAA-BBBB) để gửi.
//    Mã không lưu lại dạng gốc, mất thì cấp mã mới.

export async function issueStudentAccessCode(studentId: string, classId: string) {
  if (!studentId || !classId) {
    return { ok: false as const, error: "Thiếu thông tin học viên/lớp." };
  }

  // Sanity: học viên phải tồn tại và thuộc đúng lớp (chống cấp mã nhầm).
  const student = (
    await lmsDb
      .select({ id: tcStudent.id, classId: tcStudent.classId })
      .from(tcStudent)
      .where(eq(tcStudent.id, studentId))
      .limit(1)
  )[0];

  if (!student) return { ok: false as const, error: "Không tìm thấy học viên." };
  if (student.classId !== classId) {
    return { ok: false as const, error: "Học viên không thuộc lớp này." };
  }

  const issued = await issueAccessCode(studentId);
  return {
    ok: true as const,
    code: issued.code, // THÔ — hiển thị 1 lần
    expiresAt: issued.expiresAt,
  };
}

// ⭐ Cấp mã truy cập + ghi đồng ý CÙNG LÚC (S5). Dùng từ sheet "Cấp mã truy cập" ở tab Học viên.
// Thứ tự QUAN TRỌNG: issueAccessCode TRƯỚC (tạo lms_user) → recordConsent SAU (đặt cờ isMinor +
//   guardianContact🔒 lên lms_user vừa tạo + ghi consent_log). Đảo thứ tự sẽ mất cờ minor.
// Trả CODE THÔ 1 lần để Minh đưa học viên.
//
// 🗣️ Bình dân: một thao tác cho cả việc "đánh dấu đã có đồng ý" và "phát mã đăng nhập"; với học
//    viên chưa đủ 18 thì bắt buộc nhập liên hệ phụ huynh + xác nhận đã có đồng ý.
export async function provisionStudentAccess(input: {
  studentId: string;
  classId: string;
  isMinor: boolean;
  guardianContact?: string | null;
}) {
  const { studentId, classId, isMinor } = input;
  if (!studentId || !classId) {
    return { ok: false as const, error: "Thiếu thông tin học viên/lớp." };
  }
  if (isMinor && (!input.guardianContact || input.guardianContact.trim() === "")) {
    return { ok: false as const, error: "Học viên chưa thành niên: cần nhập liên hệ phụ huynh." };
  }

  // Sanity: HV tồn tại + đúng lớp (chống cấp mã nhầm).
  const student = (
    await lmsDb
      .select({ id: tcStudent.id, classId: tcStudent.classId })
      .from(tcStudent)
      .where(eq(tcStudent.id, studentId))
      .limit(1)
  )[0];
  if (!student) return { ok: false as const, error: "Không tìm thấy học viên." };
  if (student.classId !== classId) {
    return { ok: false as const, error: "Học viên không thuộc lớp này." };
  }

  // 1) Cấp mã → tạo lms_user (nếu chưa có). 2) Ghi đồng ý → đặt cờ minor + guardianContact🔒.
  const issued = await issueAccessCode(studentId);
  await recordConsent({
    studentId,
    isMinor,
    guardianContact: input.guardianContact ?? null,
    channel: "offline", // Minh thu đồng ý ngoài hệ thống rồi xác nhận hộ
  });

  return {
    ok: true as const,
    code: issued.code, // THÔ — hiển thị 1 lần
    expiresAt: issued.expiresAt,
  };
}
