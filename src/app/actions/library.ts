"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { libFolder, libFile } from "@/db/schema";
import { genId, genShortId } from "@/lib/id";
import { deleteStored } from "@/lib/storage";

const refresh = () => revalidatePath("/library");

export async function createFolder(input: { name: string; parentId?: string | null }) {
  if (!input.name.trim()) return { ok: false };
  await db.insert(libFolder).values({ id: genId(), name: input.name.trim(), parentId: input.parentId ?? null, createdAt: Date.now() });
  refresh();
  return { ok: true };
}

export async function deleteFolder(id: string) {
  async function rec(fid: string) {
    const subs = await db.select().from(libFolder).where(eq(libFolder.parentId, fid));
    for (const s of subs) await rec(s.id);
    const files = await db.select().from(libFile).where(eq(libFile.folderId, fid));
    for (const f of files) {
      if (f.kind === "upload" && f.storedName) await deleteStored(f.storedName);
      await db.delete(libFile).where(eq(libFile.id, f.id));
    }
    await db.delete(libFolder).where(eq(libFolder.id, fid));
  }
  await rec(id);
  refresh();
  return { ok: true };
}

export async function addLink(input: { folderId?: string | null; name: string; url: string; linkClassId?: string; linkCourseId?: string }) {
  await db.insert(libFile).values({
    id: genId(), folderId: input.folderId ?? null, name: input.name.trim(), kind: "link", url: input.url.trim(),
    linkClassId: input.linkClassId ?? null, linkCourseId: input.linkCourseId ?? null, createdAt: Date.now(),
  });
  refresh();
  return { ok: true };
}

export async function deleteFile(id: string) {
  const f = (await db.select().from(libFile).where(eq(libFile.id, id)).limit(1))[0];
  if (f?.kind === "upload" && f.storedName) await deleteStored(f.storedName);
  await db.delete(libFile).where(eq(libFile.id, id));
  refresh();
  return { ok: true };
}

// Bật/tắt chia sẻ. Trả về shareId mới (hoặc null nếu tắt).
export async function toggleShareFolder(id: string) {
  const row = (await db.select().from(libFolder).where(eq(libFolder.id, id)).limit(1))[0];
  if (!row) return { ok: false };
  const shareId = row.shareId ? null : genShortId();
  await db.update(libFolder).set({ shareId }).where(eq(libFolder.id, id));
  refresh();
  return { ok: true, shareId };
}
export async function toggleShareFile(id: string) {
  const row = (await db.select().from(libFile).where(eq(libFile.id, id)).limit(1))[0];
  if (!row) return { ok: false };
  const shareId = row.shareId ? null : genShortId();
  await db.update(libFile).set({ shareId }).where(eq(libFile.id, id));
  refresh();
  return { ok: true, shareId };
}

// Gắn file với lớp (dạy) / môn (học) — chuẩn bị chia sẻ cho lớp ở P5.
export async function assignFile(input: { fileId: string; classId?: string | null; courseId?: string | null }) {
  await db.update(libFile).set({ linkClassId: input.classId ?? null, linkCourseId: input.courseId ?? null }).where(eq(libFile.id, input.fileId));
  refresh();
  return { ok: true };
}
