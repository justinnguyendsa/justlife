"use server";

import { lmsDb } from "@/db/lms/client";
import { tcThread, tcPost, classEnrolCode, enrollment, lmsPerson, tcClass } from "@/db/lms/schema";
import { eq, and } from "drizzle-orm";
import { genId } from "@/lib/id";
import { logAccess } from "@/lib/lms/audit";
import { getSessionStudentId, getMyPersonId, myEnrollments } from "@/lib/lms/portal-queries";
import { revalidatePath } from "next/cache";

// P-LMS-6: Student forum actions + self-enrol.
// studentId/personId SERVER-DERIVED. Enrollment check trước mọi thao tác.

/** HV tạo thread (hỏi bài). */
export async function studentCreateThread(input: { courseId: string; lessonId?: string | null; title: string }) {
  const studentId = await getSessionStudentId();
  if (!studentId) throw new Error("Chưa đăng nhập.");
  const personId = await getMyPersonId(studentId);
  if (!personId) throw new Error("Chưa có hồ sơ.");
  // Enrollment check
  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === input.courseId)) throw new Error("FORBIDDEN");

  const id = genId();
  await lmsDb.insert(tcThread).values({
    id, courseId: input.courseId, lessonId: input.lessonId ?? null,
    authorType: "student", authorRef: personId,
    title: input.title, status: "open", createdAt: Date.now(),
  });
  await logAccess({ actor: studentId, action: "create_thread", targetType: "thread", targetId: id });
  revalidatePath("/portal", "layout");
  return { ok: true, id };
}

/** HV trả lời trong thread. */
export async function studentReplyThread(input: { threadId: string; bodyMd: string; parentId?: string | null }) {
  const studentId = await getSessionStudentId();
  if (!studentId) throw new Error("Chưa đăng nhập.");
  const personId = await getMyPersonId(studentId);
  if (!personId) throw new Error("Chưa có hồ sơ.");

  // Load thread → check enrollment
  const thread = (await lmsDb.select().from(tcThread).where(eq(tcThread.id, input.threadId)).limit(1))[0];
  if (!thread) throw new Error("Thread không tồn tại.");
  if (thread.status === "locked") throw new Error("Thread đã khóa.");

  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === thread.courseId)) throw new Error("FORBIDDEN");

  const id = genId();
  await lmsDb.insert(tcPost).values({
    id, threadId: input.threadId,
    authorType: "student", authorRef: personId,
    bodyMd: input.bodyMd, parentId: input.parentId ?? null,
    hidden: 0, createdAt: Date.now(),
  });
  await logAccess({ actor: studentId, action: "create_post", targetType: "post", targetId: id });
  revalidatePath("/portal", "layout");
  return { ok: true, id };
}

/** HV tự ghi danh bằng mã (self-enrol). */
export async function selfEnrolByCode(code: string) {
  const studentId = await getSessionStudentId();
  if (!studentId) throw new Error("Chưa đăng nhập.");
  const personId = await getMyPersonId(studentId);
  if (!personId) throw new Error("Chưa có hồ sơ.");

  // Tìm mã
  const codes = await lmsDb.select().from(classEnrolCode)
    .where(and(eq(classEnrolCode.code, code.toUpperCase().trim()), eq(classEnrolCode.active, 1)))
    .limit(1);
  const enrolCode = codes[0];
  if (!enrolCode) throw new Error("Mã không hợp lệ hoặc đã hết hạn.");

  // Kiểm tra hết hạn
  if (enrolCode.expiresAt && Date.now() > enrolCode.expiresAt) {
    throw new Error("Mã đã hết hạn.");
  }

  // Kiểm tra số lượt
  if (enrolCode.maxUses && enrolCode.usedCount >= enrolCode.maxUses) {
    throw new Error("Mã đã hết lượt sử dụng.");
  }

  // Kiểm tra đã ghi danh chưa
  const existing = await lmsDb.select({ id: enrollment.id }).from(enrollment)
    .where(and(eq(enrollment.personId, personId), eq(enrollment.courseId, enrolCode.courseId)))
    .limit(1);
  if (existing.length > 0) throw new Error("Bạn đã ghi danh khóa này rồi.");

  // Tìm classId liên kết course (enrollment.classId là NOT NULL)
  const classRows = await lmsDb.select({ id: tcClass.id }).from(tcClass)
    .where(and(eq(tcClass.courseId, enrolCode.courseId), eq(tcClass.status, "active")))
    .limit(1);
  const classId = classRows[0]?.id ?? "";

  // Ghi danh
  await lmsDb.insert(enrollment).values({
    id: genId(), personId, courseId: enrolCode.courseId,
    classId,
    status: "active", enrolledAt: Date.now(),
  });

  // Tăng usedCount
  await lmsDb.update(classEnrolCode).set({ usedCount: enrolCode.usedCount + 1 })
    .where(eq(classEnrolCode.id, enrolCode.id));

  await logAccess({ actor: studentId, action: "self_enrol", targetType: "enrol_code", targetId: enrolCode.id });
  revalidatePath("/portal", "layout");
  return { ok: true, courseId: enrolCode.courseId };
}
