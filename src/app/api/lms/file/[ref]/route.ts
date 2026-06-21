import { NextRequest } from "next/server";
import {
  getSessionStudentId,
  assertOwnsSubmission,
} from "@/lib/lms/portal-queries";
import { readSubmission } from "@/lib/lms/storage";
import { getExt, mimeForExt } from "@/lib/lms/upload-policy";
import { logAccess } from "@/lib/lms/audit";

// GET /api/lms/file/[ref] — học viên tải bài nộp CỦA MÌNH (SPEC-P5a §5.2, blocker #3, AC-8).
// Bất biến:
//  - BẮT BUỘC session học viên (getSessionStudentId; 401 nếu không).
//  - assertOwnsSubmission(studentId, ref): chỉ CHỦ bài nộp tải được (chống IDOR object-level).
//  - Content-Disposition: attachment (KHÔNG inline) + X-Content-Type-Options: nosniff.
//  - Content-Type lấy TỪ đuôi tên gốc (không tin mime client lưu trước).
//  - KHÔNG dùng route /api/library/file/[id] (public/inline) cho bài nộp lớp.
//
// 🗣️ Bình dân: chỉ học viên đã đăng nhập và đúng là chủ bài nộp mới tải được; file luôn tải xuống
//    (không tự mở trong trình duyệt → chặn mã độc); người khác sửa mã trên URL cũng vô ích.

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;

  // 1) Auth bắt buộc — studentId TỪ session.
  const studentId = await getSessionStudentId();
  if (!studentId) return new Response("Bạn cần đăng nhập.", { status: 401 });

  // 2) Ownership: chỉ chủ bài nộp (không tiết lộ ref tồn tại hay không — cùng một lỗi 403).
  let sub: Awaited<ReturnType<typeof assertOwnsSubmission>>;
  try {
    sub = await assertOwnsSubmission(studentId, ref);
  } catch {
    return new Response("Không có quyền truy cập.", { status: 403 });
  }

  // 3) Đọc file (storage guard path-traversal).
  let buf: Buffer;
  try {
    buf = await readSubmission(sub.fileRef);
  } catch {
    return new Response("Không tìm thấy file.", { status: 404 });
  }

  // Audit tải file (append-only, KHÔNG PII thô — chỉ studentId + submission id).
  await logAccess({
    actor: studentId,
    action: "download",
    targetType: "submission",
    targetId: sub.id,
  });

  // 4) Headers cứng: attachment + nosniff; Content-Type TỪ đuôi tên gốc (không tin mime cũ).
  const downloadName = sub.originalName || `bai-nop-${ref}`;
  const ext = getExt(downloadName);
  const contentType = ext ? mimeForExt(ext) : sub.mime || "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
