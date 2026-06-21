import { NextRequest } from "next/server";
import { getSubmissionById } from "@/db/teaching";
import { readSubmission } from "@/lib/lms/storage";
import { getExt, mimeForExt } from "@/lib/lms/upload-policy";
import { logAccess } from "@/lib/lms/audit";

// GET /api/teaching/submission/[id] — instructor (Minh) tải bài nộp để chấm.
// Personal-side: khu /teaching là single-user (chỉ Minh, local). P5b sẽ bảo vệ instructor area
// khi đưa lên internet (ADR-002 Q9). Hiện local Minh = tin cậy → không gắn auth học viên ở đây.
// Vẫn cứng: attachment + nosniff (tải xuống, không tự mở) + Content-Type suy từ đuôi.
//
// 🗣️ Bình dân: route này để chính Minh tải bài học viên về máy chấm; vẫn tải-xuống an toàn
//    (không mở thẳng trong trình duyệt). Bảo vệ bằng đăng nhập giảng viên sẽ thêm ở bản go-live.

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sub = await getSubmissionById(id);
  if (!sub) return new Response("Không tìm thấy bài nộp.", { status: 404 });

  let buf: Buffer;
  try {
    buf = await readSubmission(sub.fileRef);
  } catch {
    return new Response("Không tìm thấy file.", { status: 404 });
  }

  // Audit instructor tải bài để chấm (append-only, KHÔNG PII thô — chỉ submission id).
  await logAccess({
    actor: "instructor",
    action: "download",
    targetType: "submission",
    targetId: id,
  });

  const downloadName = sub.originalName || `bai-nop-${id}`;
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
