import { NextRequest } from "next/server";
import { getSessionStudentId, assertCanAccessMaterial } from "@/lib/lms/portal-queries";
import { readMaterial } from "@/lib/lms/storage";
import { getExt, mimeForExt } from "@/lib/lms/upload-policy";
import { logAccess } from "@/lib/lms/audit";

// GET /api/lms/material/[ref] — học viên tải FILE tài liệu lớp (an toàn, scoped).
// Bất biến (chống IDOR): studentId LẤY TỪ session; assertCanAccessMaterial kiểm material thuộc lớp
// HV là thành viên + visibility='class'. Trả attachment + nosniff (tải xuống, không tự mở).
//
// 🗣️ Bình dân: chỉ học viên trong lớp mới tải được tài liệu của lớp đó; sửa link trên URL cũng vô ích.

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;

  const studentId = await getSessionStudentId();
  if (!studentId) return new Response("Chưa đăng nhập.", { status: 401 });

  let material;
  try {
    material = await assertCanAccessMaterial(studentId, ref); // scope: thành viên lớp + visibility class
  } catch {
    return new Response("Không có quyền với tài liệu này.", { status: 403 });
  }
  if (!material.fileRef) {
    return new Response("Tài liệu này là liên kết ngoài.", { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readMaterial(material.fileRef);
  } catch {
    return new Response("Không tìm thấy file.", { status: 404 });
  }

  // Audit tải tài liệu (append-only, KHÔNG PII thô — chỉ studentId + material id).
  await logAccess({ actor: studentId, action: "download", targetType: "material", targetId: material.id });

  const downloadName = material.title || `tai-lieu-${material.id}`;
  const ext = getExt(downloadName);
  const contentType = material.mime || (ext ? mimeForExt(ext) : "application/octet-stream");

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
