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
  try {
    const buf = await readStored(f.storedName);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": f.mime || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new Response("Lỗi đọc file", { status: 500 });
  }
}
