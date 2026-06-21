import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcAssignment, tcSubmission } from "@/db/lms/schema";
import {
  getSessionStudentId,
  assertMembership,
} from "@/lib/lms/portal-queries";
import { encryptFieldOpt } from "@/lib/lms/crypto";
import { genFileRef, writeSubmission } from "@/lib/lms/storage";
import {
  checkUploadFile,
  MAX_FILES_PER_STUDENT,
  MAX_TOTAL_BYTES_PER_STUDENT,
} from "@/lib/lms/upload-policy";
import { logAccess } from "@/lib/lms/audit";

// POST /api/lms/submission — học viên nộp bài (SPEC-P5a §5.1, blocker #3, AC-7).
// Bề mặt tấn công lớn nhất: file đến từ HV qua internet → bảo mật tối đa.
// Bất biến:
//  - BẮT BUỘC session học viên (getSessionStudentId; 401 nếu không) — studentId TỪ SESSION (chống IDOR).
//  - assertMembership(studentId, classId của assignment) — chỉ nộp cho lớp mình thuộc.
//  - Whitelist đuôi + MIME (không tin mime client) + size ≤15MB + quota (số file & tổng dung lượng).
//  - fileRef ngẫu nhiên (crypto); originalName🔒 (mã hóa at-rest); KHÔNG lộ đường dẫn server khi lỗi.
//
// 🗣️ Bình dân: chỉ học viên đã đăng nhập mới nộp được, và chỉ nộp cho lớp của mình; file phải "lành",
//    không quá nặng, không vượt hạn mức; tên file thật được khóa lại, link là mã ngẫu nhiên.

export const runtime = "nodejs";

function err(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  // 1) Auth bắt buộc — studentId TỪ session (nguồn duy nhất).
  const studentId = await getSessionStudentId();
  if (!studentId) return err("Bạn cần đăng nhập để nộp bài.", 401);

  // 2) Parse form.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("Dữ liệu gửi lên không hợp lệ.", 400);
  }
  const assignmentId = (form.get("assignmentId") as string) || "";
  const file = form.get("file");
  if (!assignmentId) return err("Thiếu mã bài tập.", 400);
  if (!(file instanceof File)) return err("Thiếu file.", 400);

  // 3) Bài tập tồn tại → suy ra classId → assertMembership (chỉ nộp cho lớp mình thuộc).
  const asg = (
    await lmsDb
      .select({ id: tcAssignment.id, classId: tcAssignment.classId })
      .from(tcAssignment)
      .where(eq(tcAssignment.id, assignmentId))
      .limit(1)
  )[0];
  if (!asg) return err("Không tìm thấy bài tập.", 404);
  try {
    await assertMembership(studentId, asg.classId);
  } catch {
    return err("Bạn không thuộc lớp của bài tập này.", 403);
  }

  // 4) Whitelist đuôi + MIME + size ≤15MB (Content-Type khi trả file lấy TỪ đuôi, không tin client).
  const check = checkUploadFile(file.name, file.size, file.type || "");
  if (!check.ok) return err(check.error, 415);

  // 5) Quota theo HV: số file + tổng dung lượng (qua các lớp).
  const existing = await lmsDb
    .select({ size: tcSubmission.size })
    .from(tcSubmission)
    .where(eq(tcSubmission.studentId, studentId));
  if (existing.length >= MAX_FILES_PER_STUDENT) {
    return err(`Bạn đã đạt giới hạn ${MAX_FILES_PER_STUDENT} bài nộp. Hãy liên hệ giảng viên.`, 429);
  }
  const usedBytes = existing.reduce((sum, r) => sum + (r.size ?? 0), 0);
  if (usedBytes + file.size > MAX_TOTAL_BYTES_PER_STUDENT) {
    return err("Bạn đã vượt tổng dung lượng cho phép (100MB).", 429);
  }

  // 6) Lưu file (ref ngẫu nhiên crypto) + insert tc_submission.
  //    studentId TỪ session; originalName🔒; mime lấy TỪ đuôi (an toàn).
  const buf = Buffer.from(await file.arrayBuffer());
  const fileRef = genFileRef();
  try {
    await writeSubmission(fileRef, buf);
  } catch {
    return err("Không lưu được file. Vui lòng thử lại.", 500);
  }

  const now = Date.now();
  const dueAt = (
    await lmsDb
      .select({ dueAt: tcAssignment.dueAt })
      .from(tcAssignment)
      .where(eq(tcAssignment.id, assignmentId))
      .limit(1)
  )[0]?.dueAt;
  const status = dueAt != null && now > dueAt ? "late" : "submitted";

  const submissionId = genFileRef(); // id ngẫu nhiên (không đoán được)
  await lmsDb.insert(tcSubmission).values({
    id: submissionId,
    classId: asg.classId,
    assignmentId,
    studentId, // ⬅ TỪ session (chống IDOR)
    fileRef,
    originalName: encryptFieldOpt(file.name), // 🔒 mã hóa at-rest (privacy-review)
    mime: check.mime, // suy từ đuôi, không tin client
    size: file.size,
    submittedAt: now,
    status,
  });

  // Audit nộp bài (append-only, KHÔNG PII thô — chỉ studentId + submissionId là id ngẫu nhiên).
  await logAccess({
    actor: studentId,
    action: "submit",
    targetType: "submission",
    targetId: submissionId,
  });

  return NextResponse.json({ ok: true, submissionId, status });
}

// Đảm bảo chỉ POST: từ chối các method khác rõ ràng (an toàn).
export async function GET() {
  return err("Phương thức không được hỗ trợ.", 405);
}
