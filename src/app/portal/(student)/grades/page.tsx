import { redirect } from "next/navigation";
import { GraduationCap, MessageSquareText, CalendarCheck, BarChart3 } from "lucide-react";
import {
  getSessionStudentId,
  getMyGrades,
  getMyAssignments,
  getMyAttendance,
  getMyLearningSummary,
} from "@/lib/lms/portal-queries";
import { logAccess } from "@/lib/lms/audit";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// "Điểm của tôi": tab Bài tập & Điểm / Điểm danh / Tóm tắt học tập.
// MỌI dữ liệu lấy qua portal-queries với studentId từ session (scoped, chống IDOR).

export default async function PortalGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const { tab = "grades" } = await searchParams;

  const [assignments, grades, attendance, summary] = await Promise.all([
    getMyAssignments(studentId),
    getMyGrades(studentId),
    getMyAttendance(studentId),
    getMyLearningSummary(studentId),
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

  // Sắp xếp điểm danh: mới nhất trước
  const sortedAttendance = [...attendance].sort((a, b) => (b.dateAt ?? 0) - (a.dateAt ?? 0));

  return (
    <>
      <div className="portal-hello">
        <h1>Điểm của tôi</h1>
        <p className="sub">Điểm, điểm danh và tóm tắt học tập của bạn.</p>
      </div>

      {/* ST-4: Tab bar */}
      <div className="tabs">
        <a href="/portal/grades" className={tab === "grades" ? "on" : ""}>
          Bài tập &amp; Điểm
        </a>
        <a href="/portal/grades?tab=attendance" className={tab === "attendance" ? "on" : ""}>
          Điểm danh
        </a>
        <a href="/portal/grades?tab=summary" className={tab === "summary" ? "on" : ""}>
          Tóm tắt
        </a>
      </div>

      {/* Tab: Bài tập & Điểm */}
      {tab === "grades" && (
        <>
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
        </>
      )}

      {/* Tab: Điểm danh */}
      {tab === "attendance" && (
        <>
          <div className="sec">
            <h2><span className="secdot portal-secdot-teach" />Điểm danh</h2>
            <span className="cnt">{sortedAttendance.length} buổi</span>
          </div>

          {sortedAttendance.length === 0 ? (
            <div className="card">
              <div className="empty">Chưa có dữ liệu điểm danh.</div>
            </div>
          ) : (
            <div className="stack">
              {sortedAttendance.map((a) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  present: { label: "Có mặt", cls: "chip ok" },
                  late: { label: "Đi muộn", cls: "chip warn" },
                  absent: { label: "Vắng", cls: "chip err" },
                };
                const st = statusMap[a.status] ?? { label: a.status, cls: "chip" };
                return (
                  <div key={a.attendanceId} className="card portal-row">
                    <CalendarCheck strokeWidth={2} aria-hidden className="portal-row-ic" />
                    <div className="grow">
                      <div className="t portal-strong">
                        {a.dateAt != null ? fmtDate(a.dateAt) : "—"}
                      </div>
                      {a.topic && <div className="portal-sub">{a.topic}</div>}
                    </div>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Tóm tắt */}
      {tab === "summary" && (
        <>
          <div className="sec">
            <h2><span className="secdot portal-secdot-teach" />Tóm tắt học tập</h2>
          </div>

          <div className="portal-summary-grid">
            <div className="portal-summary-card">
              <div className="portal-summary-n">
                {summary.attendanceRate != null ? `${summary.attendanceRate}%` : "—"}
              </div>
              <div className="portal-summary-l">Tỉ lệ có mặt</div>
              <div className="portal-summary-sub">
                {summary.presentCount}/{summary.totalSessions} buổi
              </div>
            </div>

            <div className="portal-summary-card">
              <div className="portal-summary-n">{summary.avgScore ?? "—"}</div>
              <div className="portal-summary-l">Điểm trung bình</div>
              <div className="portal-summary-sub">tất cả bài đã chấm</div>
            </div>

            <div className="portal-summary-card">
              <div className="portal-summary-n">{summary.submitted}</div>
              <div className="portal-summary-l">Bài đã nộp</div>
              <div className="portal-summary-sub">/ {summary.totalAssignments} bài tổng</div>
            </div>

            <div className="portal-summary-card">
              <div className="portal-summary-n">{summary.totalSessions}</div>
              <div className="portal-summary-l">Tổng số buổi</div>
              <div className="portal-summary-sub">đã ghi nhận</div>
            </div>
          </div>
        </>
      )}

      <div className="portal-cta">
        <a href="/portal" className="btn line"><GraduationCap strokeWidth={2} aria-hidden />Về trang chủ</a>
        {tab !== "grades" && (
          <a href="/portal/grades" className="btn line"><BarChart3 strokeWidth={2} aria-hidden />Xem điểm</a>
        )}
      </div>
    </>
  );
}
