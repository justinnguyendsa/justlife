import { asc, eq, isNull } from "drizzle-orm";
import { db } from "./client";
import { libFolder, libFile } from "./schema";

// Nội dung 1 folder (null = gốc) + breadcrumb.
export async function getFolder(id: string | null) {
  let folder = null as typeof libFolder.$inferSelect | null;
  if (id) {
    folder = (await db.select().from(libFolder).where(eq(libFolder.id, id)).limit(1))[0] ?? null;
    if (!folder) return null;
  }
  const crumbs: { id: string; name: string }[] = [];
  let cur = folder;
  while (cur) {
    crumbs.unshift({ id: cur.id, name: cur.name });
    cur = cur.parentId ? (await db.select().from(libFolder).where(eq(libFolder.id, cur.parentId)).limit(1))[0] ?? null : null;
  }
  const subfolders = await db.select().from(libFolder)
    .where(id ? eq(libFolder.parentId, id) : isNull(libFolder.parentId)).orderBy(asc(libFolder.name));
  const files = await db.select().from(libFile)
    .where(id ? eq(libFile.folderId, id) : isNull(libFile.folderId)).orderBy(asc(libFile.name));
  return { folder, crumbs, subfolders, files };
}

// File đã gắn với 1 môn (học) / 1 lớp (dạy) — để hiện trong chi tiết course/class.
export async function getFilesForCourse(courseId: string) {
  return db.select().from(libFile).where(eq(libFile.linkCourseId, courseId)).orderBy(asc(libFile.name));
}
export async function getFilesForClass(classId: string) {
  return db.select().from(libFile).where(eq(libFile.linkClassId, classId)).orderBy(asc(libFile.name));
}

// Giải mã share link → file hoặc folder (+ nội dung 1 cấp).
export async function resolveShare(shareId: string) {
  const file = (await db.select().from(libFile).where(eq(libFile.shareId, shareId)).limit(1))[0];
  if (file) return { type: "file" as const, file };
  const folder = (await db.select().from(libFolder).where(eq(libFolder.shareId, shareId)).limit(1))[0];
  if (folder) {
    const subfolders = await db.select().from(libFolder).where(eq(libFolder.parentId, folder.id)).orderBy(asc(libFolder.name));
    const files = await db.select().from(libFile).where(eq(libFile.folderId, folder.id)).orderBy(asc(libFile.name));
    return { type: "folder" as const, folder, subfolders, files };
  }
  return null;
}
