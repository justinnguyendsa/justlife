import { notFound } from "next/navigation";
import { getFolder } from "@/db/library";
import { listClasses } from "@/db/teaching";
import { listCourses } from "@/db/study";
import { PageHeader } from "@/components/PageHeader";
import { LibraryClient } from "../LibraryClient";

export const dynamic = "force-dynamic";

// Một folder cụ thể: cùng UI với gốc, chỉ khác id. notFound() nếu folder không tồn tại.
export default async function LibraryFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const [data, classes, courses] = await Promise.all([
    getFolder(folderId),
    listClasses(),
    listCourses(),
  ]);
  if (!data) notFound();
  const { folder, crumbs, subfolders, files } = data;
  return (
    <>
      <PageHeader title="Tài liệu" sub="Học + Dạy" />
      <LibraryClient
        folder={folder}
        crumbs={crumbs}
        subfolders={subfolders}
        files={files}
        classes={classes}
        courses={courses}
      />
    </>
  );
}
