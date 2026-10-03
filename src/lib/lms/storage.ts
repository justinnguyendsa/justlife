import { randomBytes } from "node:crypto";
import { putObject, getObject, deleteObject } from "@/lib/object-store";

// 🟡 Vùng lưu trữ LMS RIÊNG (SPEC-P5a §5). TÁCH HOÀN TOÀN khỏi personal data/library
// (R-JL-TWO-FACES-01). 2 kho con: submissions (bài nộp HV) + materials (tài liệu lớp).
//
// P0-T04: không còn ghi thẳng ra đĩa bằng `fs`. Mọi thao tác đi qua @/lib/object-store —
// Cloudflare R2 ở production, đĩa local ở máy. Xem object-store.ts để biết vì sao bắt buộc.
//
// Bảo mật giữ nguyên như trước:
//  - fileRef sinh bằng crypto (randomBytes 128-bit) → không đoán được (chống dò file qua URL).
//  - Chỉ chấp nhận ref dạng hex → không thể chèn "../" để trèo ra ngoài kho.
//  - Lưu theo ĐÚNG fileRef, không kèm tên gốc (tên gốc 🔒 mã hoá, chỉ nằm ở DB).
//
// 🗣️ Bình dân: file của lớp cất ở "kho riêng", tên trên kho là mã ngẫu nhiên, không ai
//    đoán ra và không ai trèo ra ngoài kho được.

const SUBMISSIONS_PREFIX = "lms/submissions";
const MATERIALS_PREFIX = "lms/materials";

/** Sinh fileRef ngẫu nhiên (crypto, 128-bit hex). Không đoán được, hợp lệ làm tên file. */
export function genFileRef(): string {
  return randomBytes(16).toString("hex");
}

/** Chặn ref lạ — chỉ hex an toàn. Thay cho guard path-traversal của bản dùng đĩa. */
function keyFor(prefix: string, ref: string): string {
  if (!/^[0-9a-f]{8,}$/.test(ref)) throw new Error("invalid ref");
  return `${prefix}/${ref}`;
}

// ---- Bài nộp học viên ----
export const writeSubmission = async (ref: string, buf: Buffer): Promise<string> => {
  await putObject(keyFor(SUBMISSIONS_PREFIX, ref), buf);
  return ref;
};
// async (không phải arrow trả thẳng promise) để ref sai thành REJECT chứ không ném đồng bộ —
// nếu ném đồng bộ thì caller dùng .catch() sẽ hụt lỗi.
export const readSubmission = async (ref: string): Promise<Buffer> =>
  getObject(keyFor(SUBMISSIONS_PREFIX, ref));
export const deleteSubmission = async (ref: string): Promise<void> =>
  deleteObject(keyFor(SUBMISSIONS_PREFIX, ref));

// ---- Tài liệu lớp (giảng viên đăng) ----
export const writeMaterial = async (ref: string, buf: Buffer): Promise<string> => {
  await putObject(keyFor(MATERIALS_PREFIX, ref), buf);
  return ref;
};
export const readMaterial = async (ref: string): Promise<Buffer> =>
  getObject(keyFor(MATERIALS_PREFIX, ref));
export const deleteMaterial = async (ref: string): Promise<void> =>
  deleteObject(keyFor(MATERIALS_PREFIX, ref));
