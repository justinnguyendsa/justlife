import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "node:crypto";

// 🟡 Vùng đĩa LMS RIÊNG (SPEC-P5a §5). TÁCH HOÀN TOÀN khỏi personal data/library (R-JL-TWO-FACES-01).
// 2 kho con: submissions (bài nộp HV) + materials (tài liệu lớp do giảng viên đăng). data/ đã gitignore.
//
// Bảo mật:
//  - fileRef sinh bằng crypto (randomBytes) → không đoán được (chống dò file qua URL).
//  - Guard path-traversal: mọi đường dẫn phải nằm TRONG kho con (resolveInside).
//  - Lưu theo ĐÚNG fileRef (không kèm tên gốc → tên gốc🔒 chỉ ở DB).
//
// ⚠ go-live (P-LMS-0): Vercel serverless KHÔNG giữ đĩa → cần object storage adapter; hiện local-disk.
//
// 🗣️ Bình dân: file của lớp cất ở "kho riêng", tên trên đĩa là mã ngẫu nhiên, không ai trèo ra ngoài kho.

const SUBMISSIONS_DIR = path.resolve(process.cwd(), "data", "lms", "submissions");
const MATERIALS_DIR = path.resolve(process.cwd(), "data", "lms", "materials");

// Guard path-traversal: đường dẫn phải nằm TRONG `dir`.
function resolveInside(dir: string, ref: string): string {
  const p = path.resolve(dir, ref);
  if (p !== dir && !p.startsWith(dir + path.sep)) {
    throw new Error("invalid path");
  }
  return p;
}

/** Sinh fileRef ngẫu nhiên (crypto, 128-bit hex). Không đoán được, hợp lệ làm tên file. */
export function genFileRef(): string {
  return randomBytes(16).toString("hex");
}

async function writeRef(dir: string, ref: string, buf: Buffer): Promise<string> {
  // Chặn ref lạ (chỉ hex an toàn) — phòng hờ nếu ref đến từ nguồn khác.
  if (!/^[0-9a-f]{8,}$/.test(ref)) throw new Error("invalid ref");
  const dest = resolveInside(dir, ref);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(dest, buf);
  return ref;
}
async function readRef(dir: string, ref: string): Promise<Buffer> {
  return fs.readFile(resolveInside(dir, ref));
}
async function deleteRef(dir: string, ref: string): Promise<void> {
  try {
    await fs.unlink(resolveInside(dir, ref));
  } catch {
    /* đã xóa / không tồn tại */
  }
}

// ---- Bài nộp học viên ----
export const writeSubmission = (ref: string, buf: Buffer) => writeRef(SUBMISSIONS_DIR, ref, buf);
export const readSubmission = (ref: string) => readRef(SUBMISSIONS_DIR, ref);
export const deleteSubmission = (ref: string) => deleteRef(SUBMISSIONS_DIR, ref);

// ---- Tài liệu lớp (giảng viên đăng) ----
export const writeMaterial = (ref: string, buf: Buffer) => writeRef(MATERIALS_DIR, ref, buf);
export const readMaterial = (ref: string) => readRef(MATERIALS_DIR, ref);
export const deleteMaterial = (ref: string) => deleteRef(MATERIALS_DIR, ref);
