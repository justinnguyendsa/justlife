import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { libFile } from "@/db/schema";
import { readStored } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = (await db.select().from(libFile).where(eq(libFile.id, id)).limit(1))[0];
  if (!f || f.kind !== "upload" || !f.storedName) return new Response("Không tìm thấy", { status: 404 });
  // P-LMS-0: chỉ phục vụ file dạng upload có storedName (không phục vụ link).
  // Share link validation: kiểm tra thêm nếu cần ở tầng trên (middleware đã mở /api/library/file).
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
