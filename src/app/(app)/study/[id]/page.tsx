import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCourseDetail } from "@/db/study";
import { getFilesForCourse } from "@/db/library";
import { PageHeader } from "@/components/PageHeader";
import { LinkedFiles } from "@/components/LinkedFiles";
import { CourseDetailClient } from "./CourseDetailClient";

export const dynamic = "force-dynamic";

// Chi tiết môn học: 2 tab — "Bài tập & Đồ án" (item + deadline + trạng thái)
// và "Ghi chú & tài liệu" (note + link). Dữ liệu nhỏ → nạp sẵn ở server.
export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCourseDetail(id);
  if (!detail) notFound();
  const files = await getFilesForCourse(id);

  const sub = [detail.course.code, detail.course.term].filter(Boolean).join(" · ") || undefined;

  return (
    <>
      <Link href="/study" className="btn line sm" style={{ marginBottom: 10 }}>
        <ChevronLeft strokeWidth={2} />Tất cả môn
      </Link>
      <PageHeader title={detail.course.name} sub={sub} />
      <CourseDetailClient detail={detail} />
      <LinkedFiles files={files} />
    </>
  );
}
