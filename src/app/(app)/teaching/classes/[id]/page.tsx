import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getClassDetailBundle } from "@/db/teaching";
import { getFilesForClass } from "@/db/library";
import { PageHeader } from "@/components/PageHeader";
import { LinkedFiles } from "@/components/LinkedFiles";
import { ClassDetailClient } from "./ClassDetailClient";
import { requireOwner } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Chi tiết lớp: tab Học viên · Điểm danh · Chấm bài.
// MVP single-user: nạp sẵn điểm danh theo từng buổi + điểm theo từng bài tập vào map
// (dữ liệu nhỏ) để client đổi buổi/bài tập không cần gọi query riêng.
// Dữ liệu lấy theo số truy vấn cố định, không tăng theo số buổi/bài tập (SPEC-Perf-P1 T08).
export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  const { id } = await params;
  const [bundle, files] = await Promise.all([getClassDetailBundle(id), getFilesForClass(id)]);
  if (!bundle) notFound();

  return (
    <>
      <Link href="/teaching/classes" className="btn line sm" style={{ marginBottom: 10 }}>
        <ChevronLeft strokeWidth={2} />Tất cả lớp
      </Link>
      <PageHeader title={bundle.detail.cls.name} sub={bundle.detail.cls.term ?? undefined} />
      <ClassDetailClient
        detail={bundle.detail}
        attendanceBySession={bundle.attendanceBySession}
        gradesByAssignment={bundle.gradesByAssignment}
        submissionsByAssignment={bundle.submissionsByAssignment}
        summary={bundle.summary}
        submissionStats={bundle.submissionStats}
        studentProgress={bundle.studentProgress}
        materials={bundle.materials}
      />
      <LinkedFiles files={files} />
    </>
  );
}
