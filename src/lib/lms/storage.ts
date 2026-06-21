import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "node:crypto";

// 🟡 Vùng đĩa LMS RIÊNG cho bài nộp học viên (SPEC-P5a §5, blocker #3).
// TÁCH HOÀN TOÀN khỏi personal `data/library` (R-JL-TWO-FACES-01): không dùng chung thư mục,
// không dùng chung route. `data/` đã gitignore → bài nộp KHÔNG lên git.
//
// Bảo mật:
//  - `fileRef` sinh bằng crypto (randomBytes) → không đoán được (chống dò file qua URL).
//  - Guard path-traversal: mọi đường dẫn phải nằm TRONG SUBMISSIONS_DIR (resolveInside).
//  - Lưu theo ĐÚNG fileRef (không kèm tên gốc vào tên file trên đĩa → tên gốc🔒 chỉ ở DB).
//
// 🗣️ Bình dân: bài nộp của học viên cất ở "kho riêng của lớp" (không lẫn với tủ tài liệu cá nhân);
//    tên file trên đĩa là mã ngẫu nhiên, không lộ tên thật, và không ai trèo ra ngoài kho được.

const SUBMISSIONS_DIR = path.resolve(process.cwd(), "data", "lms", "submissions");

// Guard path-traversal: đường dẫn phải nằm TRONG SUBMISSIONS_DIR.
function resolveInside(ref: string): string {
  const p = path.resolve(SUBMISSIONS_DIR, ref);
  if (p !== SUBMISSIONS_DIR && !p.startsWith(SUBMISSIONS_DIR + path.sep)) {
    throw new Error("invalid path");
  }
  return p;
}

/** Sinh fileRef ngẫu nhiên (crypto, 128-bit hex). Không đoán được, hợp lệ làm tên file. */
export function genFileRef(): string {
  return randomBytes(16).toString("hex");
}

/** Lưu buffer bài nộp theo ref (ref phải do genFileRef sinh). Trả về ref đã lưu. */
export async function writeSubmission(ref: string, buf: Buffer): Promise<string> {
  // Chặn ref lạ (chỉ hex an toàn) — phòng hờ nếu ref đến từ nguồn khác.
  if (!/^[0-9a-f]{8,}$/.test(ref)) throw new Error("invalid ref");
  const dest = resolveInside(ref);
  await fs.mkdir(SUBMISSIONS_DIR, { recursive: true });
  await fs.writeFile(dest, buf);
  return ref;
}

/** Đọc buffer bài nộp theo ref (đã guard path-traversal). */
export async function readSubmission(ref: string): Promise<Buffer> {
  return fs.readFile(resolveInside(ref));
}

/** Xóa file bài nộp theo ref (dùng ở cascade delete S5). Không lỗi nếu đã xóa. */
export async function deleteSubmission(ref: string): Promise<void> {
  try {
    await fs.unlink(resolveInside(ref));
  } catch {
    /* đã xóa / không tồn tại */
  }
}
