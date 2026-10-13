"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { getSessionStudentId, unlinkGoogleEmail } from "@/lib/lms/portal-queries";
import { LINK_INTENT_COOKIE, LINK_INTENT_TTL_MS, signIntent } from "@/lib/lms/link-intent";

// Liên kết Gmail ĐÃ XÁC MINH (SPEC-SEC-1.2 S06, S08). studentId LẤY TỪ SESSION — KHÔNG nhận từ client.
// Không còn ô gõ email: học viên bấm "Liên kết bằng Google" → server đặt phiếu ý định có ký (10 phút)
// → mở đăng nhập Google → signIn callback chỉ gắn email Google đã xác minh vào đúng học viên này.
//
// 🗣️ Bình dân: muốn dùng Gmail để đăng nhập thì phải chứng minh với Google đó là Gmail của mình.

export async function startGmailLink(): Promise<void> {
  const studentId = await getSessionStudentId();
  if (!studentId) throw new Error("Chưa đăng nhập.");
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Thiếu cấu hình đăng nhập.");

  const jar = await cookies();
  jar.set(LINK_INTENT_COOKIE, signIntent(studentId, Date.now(), secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: Math.floor(LINK_INTENT_TTL_MS / 1000),
  });
  await signIn("google", { redirectTo: "/portal/profile?linked=1" });
}

export async function unlinkGmail(): Promise<{ ok: boolean; error?: string }> {
  const studentId = await getSessionStudentId();
  if (!studentId) return { ok: false, error: "Chưa đăng nhập." };
  try {
    await unlinkGoogleEmail(studentId);
    revalidatePath("/portal/profile");
    return { ok: true };
  } catch (e) {
    console.error("[unlinkGmail]", e);
    return { ok: false, error: "Chưa gỡ được, thử lại nhé." };
  }
}
