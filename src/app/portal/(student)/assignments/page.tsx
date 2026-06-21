import { redirect } from "next/navigation";
import { ClipboardList, ShieldCheck } from "lucide-react";
import {
  getSessionStudentId,
  getMyAssignmentsWithSubmission,
} from "@/lib/lms/portal-queries";
import { AssignmentsClient } from "./AssignmentsClient";

export const dynamic = "force-dynamic";

// "Bài tập": MỌI bài tập của lớp tôi + trạng thái đã nộp của TÔI + nộp bài.
// Dữ liệu qua getMyAssignmentsWithSubmission(studentId) — scoped theo studentId (session, chống IDOR).
// Nộp/tải file qua /api/lms/* (auth + whitelist + ownership) ở client.

export default async function PortalAssignmentsPage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const data = await getMyAssignmentsWithSubmission(studentId);

  // Sắp xếp: còn hạn gần nhất trước; bài không hạn xuống cuối.
  const rows = [...data].sort((x, y) => {
    const dx = x.assignment.dueAt ?? Number.MAX_SAFE_INTEGER;
    const dy = y.assignment.dueAt ?? Number.MAX_SAFE_INTEGER;
    return dx - dy;
  });

  const submittedCount = rows.filter((r) => r.submission != null).length;

  return (
    <>
      <div className="portal-hello">
        <h1>Bài tập</h1>
        <p className="sub">Xem bài tập của lớp và nộp bài của bạn.</p>
      </div>

      <div className="sec">
        <h2><span className="secdot portal-secdot-amber" />Bài tập &amp; nộp bài</h2>
        <span className="cnt">đã nộp {submittedCount}/{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">Chưa có bài tập nào trong lớp của bạn.</div>
        </div>
      ) : (
        <AssignmentsClient
          rows={rows.map((r) => ({
            assignment: {
              id: r.assignment.id,
              title: r.assignment.title,
              dueAt: r.assignment.dueAt,
              maxScore: r.assignment.maxScore,
            },
            submission: r.submission,
          }))}
        />
      )}

      <p className="portal-note">
        <ShieldCheck strokeWidth={2} aria-hidden className="portal-note-ic" />
        Nhận tệp PDF, Word, PowerPoint, Excel, ảnh PNG/JPG, ZIP · tối đa 15MB mỗi tệp.
      </p>

      <div className="portal-cta">
        <a href="/portal" className="btn line"><ClipboardList strokeWidth={2} aria-hidden />Về trang chủ</a>
      </div>
    </>
  );
}
