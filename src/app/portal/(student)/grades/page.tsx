import { redirect } from "next/navigation";
import { GraduationCap, MessageSquareText } from "lucide-react";
import {
  getSessionStudentId,
  getMyGrades,
  getMyAssignments,
} from "@/lib/lms/portal-queries";
import { logAccess } from "@/lib/lms/audit";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// "Điểm của tôi": MỌI bài tập của lớp tôi × điểm × nhận xét. Chưa có điểm → "Chưa chấm".
// Ghép getMyAssignments (bài tập lớp tôi) + getMyGrades (điểm của tôi) — đều scoped theo studentId.

export default async function PortalGradesPage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [assignments, grades] = await Promise.all([
    getMyAssignments(studentId),
    getMyGrades(studentId),
  ]);

  // Audit xem điểm (append-only, KHÔNG PII thô — chỉ studentId). Best-effort, không chặn render.
  await logAccess({ actor: studentId, action: "view_grades", targetType: "grade" });

  // Map điểm theo assignmentId để tra nhanh.
  const gradeByAssignment = new Map(grades.map((g) => [g.assignmentId, g]));

  // Mỗi bài tập → kèm điểm (nếu có). Sắp xếp: đã chấm gần nhất / bài mới tạo trước.
  const rows = assignments
    .map((a) => ({ assignment: a, grade: gradeByAssignment.get(a.id) ?? null }))
    .sort((x, y) => {
      const gx = x.grade?.gradedAt ?? x.assignment.createdAt ?? 0;
      const gy = y.grade?.gradedAt ?? y.assignment.createdAt ?? 0;
      return gy - gx;
    });

  const gradedCount = rows.filter((r) => r.grade && r.grade.score != null).length;

  return (
    <>
      <div className="portal-hello">
        <h1>Điểm của tôi</h1>
        <p className="sub">Điểm và nhận xét cho từng bài tập của bạn.</p>
      </div>

      <div className="sec">
        <h2><span className="secdot portal-secdot-teach" />Bài tập &amp; điểm</h2>
        <span className="cnt">đã chấm {gradedCount}/{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">Chưa có bài tập nào trong lớp của bạn.</div>
        </div>
      ) : (
        <div className="stack">
          {rows.map(({ assignment: a, grade: g }) => {
            const hasScore = g != null && g.score != null;
            return (
              <div key={a.id} className="card">
                <div className="portal-row">
                  <span className="portal-bar" aria-hidden />
                  <div className="grow">
                    <div className="t portal-strong">{a.title}</div>
                    <div className="portal-sub">
                      {hasScore && g?.gradedAt != null
                        ? `Chấm ngày ${fmtDate(g.gradedAt)}`
                        : a.dueAt != null
                          ? `Hạn nộp ${fmtDate(a.dueAt)}`
                          : "Bài tập"}
                    </div>
                  </div>
                  {hasScore ? (
                    <span className="portal-score">
                      {g?.score}
                      <span className="portal-max">/{a.maxScore}</span>
                    </span>
                  ) : (
                    <span className="chip st">Chưa chấm</span>
                  )}
                </div>

                {hasScore && g?.feedback ? (
                  <div className="portal-fb-box">
                    <MessageSquareText strokeWidth={2} aria-hidden className="portal-fb-ic" />
                    <p className="portal-fb">{g.feedback}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="portal-cta">
        <a href="/portal" className="btn line"><GraduationCap strokeWidth={2} aria-hidden />Về trang chủ</a>
      </div>
    </>
  );
}
