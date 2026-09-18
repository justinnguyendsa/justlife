import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { libFile, libFolder } from "@/db/schema";
import { readStored } from "@/lib/storage";
import { getOwnerSession, isOwnerAuthEnabled } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * Phục vụ file trong thư viện cá nhân.
 *
 * 🛡️ P0-T03 (lỗi H7): route này nằm trong ALWAYS_PUBLIC_PREFIXES để link chia sẻ gửi người
 * ngoài vẫn tải được. Trước đây nó phục vụ MỌI file chỉ cần biết id — kể cả file CHƯA bật
 * chia sẻ — và tắt chia sẻ cũng không thu hồi được URL. Nay phải thoả một trong ba:
 *
 *   1. chính file đó đang được chia sẻ (`share_id` khác null), hoặc
 *   2. thư mục cha đang được chia sẻ (trang /share/[shareId] liệt kê file bên trong), hoặc
 *   3. người gọi là chủ sở hữu.
 *
 * Tắt chia sẻ ⇒ `share_id` về null ⇒ URL hết hiệu lực ngay.
 *
 * 🗣️ Bình dân: trước đây ai biết đường dẫn là tải được mọi file, kể cả file riêng tư, và gỡ
 *    chia sẻ rồi vẫn tải được. Giờ chỉ file đang mở chia sẻ (hoặc nằm trong thư mục đang mở
 *    chia sẻ) mới tải được; gỡ chia sẻ là khoá luôn.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = (await db.select().from(libFile).where(eq(libFile.id, id)).limit(1))[0];

  // Chỉ phục vụ file dạng upload có storedName (không phục vụ kind=link).
  if (!f || f.kind !== "upload" || !f.storedName) {
    return new Response("Không tìm thấy", { status: 404 });
  }

  let allowed = Boolean(f.shareId);

  if (!allowed && f.folderId) {
    const folder = (
      await db.select({ shareId: libFolder.shareId }).from(libFolder).where(eq(libFolder.id, f.folderId)).limit(1)
    )[0];
    allowed = Boolean(folder?.shareId);
  }

  if (!allowed) {
    // Chủ sở hữu luôn tải được file của mình. Ở máy local (owner-auth tắt) giữ DX cũ.
    allowed = !isOwnerAuthEnabled() || Boolean(await getOwnerSession());
  }

  // Không tiết lộ "file có tồn tại hay không" — trả 404 giống hệt trường hợp không tìm thấy.
  if (!allowed) return new Response("Không tìm thấy", { status: 404 });

  try {
    const buf = await readStored(f.storedName);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": f.mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Lỗi đọc file", { status: 500 });
  }
}
