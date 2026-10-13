import { createHmac, timingSafeEqual } from "node:crypto";

// "Ý định liên kết Gmail" có ký (SPEC-SEC-1.2 S05). Học viên đang đăng nhập bấm "Liên kết bằng
// Google" → server đặt cookie chứa studentId + hạn + HMAC. Ở callback Google, chỉ khi cookie hợp lệ
// mới gắn email ĐÃ ĐƯỢC GOOGLE XÁC MINH vào đúng học viên đó. Không ai tự gõ email của người khác được.
//
// 🗣️ Bình dân: một "phiếu hẹn" có chữ ký, sống 10 phút, chứng minh chính học viên này vừa bấm liên kết.

export const LINK_INTENT_COOKIE = "jl-gmail-link";
export const LINK_INTENT_TTL_MS = 10 * 60_000;

const deriveKey = (secret: string) => createHmac("sha256", secret).update("jl-gmail-link").digest();
const mac = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

/** Tạo phiếu `v1.<studentId>.<exp>.<hmac>`. studentId không chứa dấu chấm (genId). */
export function signIntent(studentId: string, now: number, secret: string): string {
  if (!studentId || studentId.includes(".")) throw new Error("[link-intent] studentId không hợp lệ.");
  if (!secret) throw new Error("[link-intent] thiếu secret.");
  const payload = `v1.${studentId}.${now + LINK_INTENT_TTL_MS}`;
  return `${payload}.${mac(deriveKey(secret), payload)}`;
}

/** Trả studentId nếu phiếu đúng chữ ký và còn hạn; ngược lại null. */
export function verifyIntent(token: string | undefined | null, now: number, secret: string): string | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, studentId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!studentId || !Number.isFinite(exp) || exp <= now) return null;
  const expected = Buffer.from(mac(deriveKey(secret), `v1.${studentId}.${expRaw}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return studentId;
}
