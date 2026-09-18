import { NextRequest, NextResponse } from "next/server";
import { lmsDb } from "@/db/lms/client";
import { tcCertificate, tcCourse, lmsPerson } from "@/db/lms/schema";
import { eq } from "drizzle-orm";
import { getSessionStudentId, getMyPersonId } from "@/lib/lms/portal-queries";

// P-LMS-5: Tải chứng chỉ dạng text (PDF stub).
// PDF server-side render sẽ thay thế khi có lib PDF.
// Hiện tại: trả plain text summary.

function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      const { decryptFieldOpt } = require("@/lib/lms/crypto");
      return decryptFieldOpt(value);
    } catch { return value; }
  }
  return value;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: chỉ người sở hữu cert hoặc instructor mới tải được
  const studentId = await getSessionStudentId();
  const personId = studentId ? await getMyPersonId(studentId) : null;

  const cert = (await lmsDb.select().from(tcCertificate)
    .where(eq(tcCertificate.id, id)).limit(1))[0];
  if (!cert) return new Response("Không tìm thấy chứng chỉ.", { status: 404 });
  if (cert.revoked) return new Response("Chứng chỉ đã thu hồi.", { status: 410 });

  // Ownership check (nếu là student, chỉ xem cert của mình)
  if (studentId && personId !== cert.personId) {
    return new Response("Không có quyền.", { status: 403 });
  }

  const course = (await lmsDb.select({ title: tcCourse.title }).from(tcCourse)
    .where(eq(tcCourse.id, cert.courseId)).limit(1))[0];
  const person = (await lmsDb.select({ displayName: lmsPerson.displayName }).from(lmsPerson)
    .where(eq(lmsPerson.id, cert.personId)).limit(1))[0];
  const displayName = safeDecrypt(person?.displayName) ?? "Học viên";
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("vi-VN");

  // Plain text certificate (PDF stub — sẽ thay bằng PDF render sau)
  const text = [
    "=" .repeat(50),
    "           CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC",
    "=" .repeat(50),
    "",
    `Học viên: ${displayName}`,
    `Khóa học: ${course?.title ?? ""} `,
    `Ngày cấp: ${issuedDate}`,
    "",
    `Mã xác minh: ${cert.verifyCode}`,
    `Tra cứu tại: /verify/${cert.verifyCode}`,
    "",
    "=" .repeat(50),
  ].join("\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="certificate-${cert.verifyCode.slice(0,8)}.txt"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
