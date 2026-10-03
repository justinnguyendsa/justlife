import { NextRequest } from "next/server";
import { denyIfNotOwner } from "@/lib/auth-guard";
import { getSubmissionById } from "@/db/teaching";
import { readSubmission } from "@/lib/lms/storage";
import { getExt, mimeForExt } from "@/lib/lms/upload-policy";
import { logAccess } from "@/lib/lms/audit";

// GET /api/teaching/submission/[id] — instructor (Minh) tải bài nộp để chấm.
// 🛡️ P-LMS-0: bảo vệ bằng owner-auth khi chạy cloud (ownerAuthEnabledEnv).
// Local dev (không có Google cấu hình) → cho qua (DX cũ). attachment + nosniff giữ nguyên.
//
// 🗣️ Bình dân: route này để chính Minh tải bài học viên về máy chấm; vẫn tải-xuống an toàn
//    (không mở thẳng trong trình duyệt).

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // P0: dùng chung denyIfNotOwner() cho nhất quán (fail-closed ở production khi thiếu env).
  // Bản cũ dùng ownerAuthEnabledEnv() trực tiếp → thiếu env là BỎ QUA kiểm tra, trong khi
  // route này phục vụ FILE BÀI NỘP của học viên (PII).
  const denied = await denyIfNotOwner();
  if (denied) return denied;

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
