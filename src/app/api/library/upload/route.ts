import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { libFile } from "@/db/schema";
import { genId } from "@/lib/id";
import { writeUpload } from "@/lib/storage";

export const runtime = "nodejs";

const MAX = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const folderId = (form.get("folderId") as string) || null;
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Thiếu file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "File vượt 25MB" }, { status: 413 });

  const id = genId();
  const buf = Buffer.from(await file.arrayBuffer());
  const storedName = await writeUpload(id, file.name, buf);
  await db.insert(libFile).values({
    id, folderId, name: file.name, kind: "upload", storedName,
    mime: file.type || "application/octet-stream", size: file.size, createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}
