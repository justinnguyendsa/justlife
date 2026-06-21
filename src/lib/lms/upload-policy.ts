// 🛡️ Chính sách upload bài nộp (SPEC-P5a §5, blocker #3). Stack-agnostic, không side-effect.
// Whitelist đuôi + MIME suy từ đuôi (KHÔNG tin mime client). Size + quota.
//
// 🗣️ Bình dân: chỉ nhận file "lành" (tài liệu/ảnh/nén), từ chối file thực thi/web (.exe/.html/.svg…);
//    dung lượng có hạn; mỗi học viên có hạn mức số file + tổng dung lượng.

// Giới hạn (chốt theo SPEC §5; ≤15MB theo yêu cầu Stage 4).
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB / file
export const MAX_FILES_PER_STUDENT = 20; // ≤ 20 file / học viên (tổng các lớp)
export const MAX_TOTAL_BYTES_PER_STUDENT = 100 * 1024 * 1024; // ≤ 100MB / học viên

// Whitelist: đuôi → MIME chuẩn (Content-Type khi trả file lấy TỪ đây, không từ client).
const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

// MIME client được CHẤP NHẬN tương ứng từng đuôi (kiểm chéo — không tin tuyệt đối, chỉ để chặn lệch rõ ràng).
// zip hay bị gửi là application/octet-stream/x-zip-compressed → cho phép các biến thể phổ biến.
const EXT_ALLOWED_CLIENT_MIME: Record<string, string[]> = {
  pdf: ["application/pdf", "application/octet-stream"],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "application/zip",
  ],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",
    "application/zip",
  ],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "application/zip",
  ],
  png: ["image/png", "application/octet-stream"],
  jpg: ["image/jpeg", "application/octet-stream"],
  jpeg: ["image/jpeg", "application/octet-stream"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

/** Lấy đuôi file (lowercase, không dấu chấm) từ tên gốc. "" nếu không có. */
export function getExt(filename: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}

/** Đuôi có nằm trong whitelist không. */
export function isAllowedExt(ext: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXT_MIME, ext);
}

/** MIME chuẩn TỪ đuôi (nguồn Content-Type khi trả file). octet-stream nếu lạ. */
export function mimeForExt(ext: string): string {
  return EXT_MIME[ext] ?? "application/octet-stream";
}

/**
 * Kết quả kiểm 1 file upload. ok=false kèm message tiếng Việt (KHÔNG lộ đường dẫn server).
 */
export type FileCheck =
  | { ok: true; ext: string; mime: string }
  | { ok: false; error: string };

/**
 * Kiểm 1 file: đuôi whitelist + MIME client hợp lệ với đuôi + size ≤ MAX.
 * `clientMime` chỉ dùng để CHẶN lệch rõ ràng; Content-Type khi trả file luôn lấy từ đuôi.
 */
export function checkUploadFile(
  originalName: string,
  size: number,
  clientMime: string,
): FileCheck {
  const ext = getExt(originalName);
  if (!ext || !isAllowedExt(ext)) {
    return { ok: false, error: "Định dạng file không được phép. Chỉ nhận: PDF, Word, PowerPoint, Excel, ảnh PNG/JPG, ZIP." };
  }
  if (size <= 0) {
    return { ok: false, error: "File rỗng." };
  }
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: "File vượt quá 15MB." };
  }
  // Kiểm chéo MIME client với đuôi (chỉ chặn lệch rõ ràng, ví dụ .pdf nhưng mime text/html).
  const allowed = EXT_ALLOWED_CLIENT_MIME[ext] ?? [];
  const cm = (clientMime || "").toLowerCase().split(";")[0].trim();
  if (cm && allowed.length > 0 && !allowed.includes(cm)) {
    return { ok: false, error: "Loại file không khớp định dạng cho phép." };
  }
  return { ok: true, ext, mime: mimeForExt(ext) };
}
