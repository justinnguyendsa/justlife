import { listCourses, getUpcomingStudy } from "@/db/study";
import { PageHeader } from "@/components/PageHeader";
import { StudyClient } from "./StudyClient";

export const dynamic = "force-dynamic";

// Màn "Học tập" (trụ #3 — Thạc sĩ Data Science): danh sách môn + khu "Sắp đến hạn"
// gộp item mọi môn. Đọc dữ liệu phía server (kèm số mục/đã xong/bài gần hạn nhất),
// trao cho island tương tác StudyClient.
export default async function StudyPage() {
  const [courses, upcoming] = await Promise.all([
    listCourses(),
    getUpcomingStudy(Date.now()),
  ]);
  return (
    <>
      <PageHeader title="Học tập" sub="Thạc sĩ Data Science" />
      <StudyClient courses={courses} upcoming={upcoming} />
    </>
  );
}
