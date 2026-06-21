import { getFolder } from "@/db/library";
import { listClasses } from "@/db/teaching";
import { listCourses } from "@/db/study";
import { PageHeader } from "@/components/PageHeader";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";

// Thư viện tài liệu (gốc): cây folder + file (upload/link) dùng chung Học & Dạy.
// Đọc nội dung folder gốc + danh sách lớp/môn để gắn file, trao cho island LibraryClient.
export default async function LibraryPage() {
  const [data, classes, courses] = await Promise.all([
    getFolder(null),
    listClasses(),
    listCourses(),
  ]);
  // getFolder(null) luôn trả về object (gốc không thể null).
  const { folder, crumbs, subfolders, files } = data!;
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
