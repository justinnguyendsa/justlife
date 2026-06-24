"use server";

import { getSessionStudentId, linkGoogleEmail } from "@/lib/lms/portal-queries";

// Server action: liên kết Gmail cho học viên đang đăng nhập.
// studentId LẤY TỪ SESSION (server-derived) — KHÔNG nhận từ client.
// Bất biến bảo mật: emailIndex check trùng ở tầng DB, không tiết lộ email người khác.

export async function linkGoogleEmailAction(
  gmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const studentId = await getSessionStudentId();
  if (!studentId) return { ok: false, error: "Chưa đăng nhập." };
  return linkGoogleEmail(studentId, gmail);
}
