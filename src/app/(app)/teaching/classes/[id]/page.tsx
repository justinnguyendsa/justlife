import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getClassDetail, getAttendance, getGrades, getSubmissions, getClassSummary, getAssignmentSubmissionStats, getStudentProgressInClass } from "@/db/teaching";
import { getFilesForClass } from "@/db/library";
import type { TcAttendance, TcGrade } from "@/db/lms/schema";
import { PageHeader } from "@/components/PageHeader";
import { LinkedFiles } from "@/components/LinkedFiles";
import { ClassDetailClient, type SubmissionRow } from "./ClassDetailClient";

export const dynamic = "force-dynamic";

// Chi tiết lớp: tab Học viên · Điểm danh · Chấm bài.
// MVP single-user: nạp sẵn điểm danh theo từng buổi + điểm theo từng bài tập vào map
// (dữ liệu nhỏ) để client đổi buổi/bài tập không cần gọi query riêng.
export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const attendanceBySession: Record<string, TcAttendance[]> = {};
  for (const s of detail.sessions) {
    attendanceBySession[s.id] = await getAttendance(s.id);
  }

  const gradesByAssignment: Record<string, TcGrade[]> = {};
  const submissionsByAssignment: Record<string, SubmissionRow[]> = {};
  for (const a of detail.assignments) {
    gradesByAssignment[a.id] = await getGrades(a.id);
    submissionsByAssignment[a.id] = await getSubmissions(a.id);
  }

  const files = await getFilesForClass(id);

  const summary = await getClassSummary(id);

  const submissionStats: Record<string, { totalStudents: number; submittedCount: number; pendingGradeCount: number }> = {};
  for (const a of detail.assignments) {
    submissionStats[a.id] = await getAssignmentSubmissionStats(a.id, id);
  }

  const studentProgress = await getStudentProgressInClass(id);

  return (
    <>
      <Link href="/teaching/classes" className="btn line sm" style={{ marginBottom: 10 }}>
        <ChevronLeft strokeWidth={2} />Tất cả lớp
      </Link>
      <PageHeader title={detail.cls.name} sub={detail.cls.term ?? undefined} />
      <ClassDetailClient
        detail={detail}
        attendanceBySession={attendanceBySession}
        gradesByAssignment={gradesByAssignment}
        submissionsByAssignment={submissionsByAssignment}
        summary={summary}
        submissionStats={submissionStats}
        studentProgress={studentProgress}
      />
      <LinkedFiles files={files} />
    </>
  );
}
