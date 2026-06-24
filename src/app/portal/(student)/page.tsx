import { redirect } from "next/navigation";
import { GraduationCap, BookOpen, CalendarClock, FileCheck2 } from "lucide-react";
import {
  getSessionStudentId,
  getMyClasses,
  getMyAssignments,
  getMyGrades,
  getMyClassProgress,
  getMyAssignmentsWithSubmission,
  getMyActivityDates,
  getMyStats28d,
} from "@/lib/lms/portal-queries";
import { fmtDate, fmtTime, countdown } from "@/lib/format";

export const dynamic = "force-dynamic";

// Trang chủ cổng học viên: lời chào + bài tiếp theo + streak + stats + lớp + bài sắp tới + điểm.
// MỌI dữ liệu lấy qua portal-queries với studentId từ session (scoped, chống IDOR).

export default async function PortalHomePage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [classes, assignments, grades, classProgress, assignmentsWithSub, activityDates, stats28] =
    await Promise.all([
      getMyClasses(studentId),
      getMyAssignments(studentId),
      getMyGrades(studentId),
      getMyClassProgress(studentId),
      getMyAssignmentsWithSubmission(studentId),
      getMyActivityDates(studentId, 28),
      getMyStats28d(studentId),
    ]);

  const now = Date.now();

  // Bài tập sắp tới: còn hạn (dueAt >= hôm nay), gần nhất trước, tối đa 3.
  const upcoming = assignments
    .filter((a) => a.dueAt != null && a.dueAt >= now)
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
    .slice(0, 3);

  // Điểm mới nhất: đã chấm (score != null), mới nhất trước, tối đa 3.
  const latestGrades = grades
    .filter((g) => g.score != null)
    .sort((a, b) => (b.gradedAt ?? 0) - (a.gradedAt ?? 0))
    .slice(0, 3);

  // ST-1: "Bài tiếp theo" — chưa nộp, có dueAt, sắp hạn nhất
  const nextUp = assignmentsWithSub
    .filter((a) => a.submission === null && a.assignment.dueAt != null)
    .sort((a, b) => (a.assignment.dueAt ?? 0) - (b.assignment.dueAt ?? 0))[0]
    ?.assignment ?? null;
  const cdNext = nextUp?.dueAt != null ? countdown(nextUp.dueAt, now) : null;

  // ST-1: Map progress theo classId
  const progressByClass = new Map(classProgress.map((p) => [p.classId, p]));

  // ST-2: Streak 7 ngày — T2 → CN tuần hiện tại
  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  const activitySet = new Set(activityDates);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const day = d.getDay(); // 0=CN
    const diffToMon = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMon + i);
    const key = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    return {
      key,
      label: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i],
      active: activitySet.has(key),
      isToday: key === todayKey,
    };
  });

  return (
    <>
      <div className="portal-hello">
        <h1>Xin chào 👋</h1>
        <p className="sub">Đây là không gian học tập của bạn — điểm, bài tập và tài liệu lớp.</p>
      </div>

      {/* ST-1: Bài tiếp theo */}
      {nextUp && (
        <div className="portal-nextup">
          <div className="portal-nextup-badge">Bài tiếp theo</div>
          <div className="portal-nextup-title">{nextUp.title}</div>
          <div className="portal-nextup-meta">
            {nextUp.dueAt && (
              <span className="chip dl">Hạn: {fmtDate(nextUp.dueAt)} {fmtTime(nextUp.dueAt)}</span>
            )}
            {cdNext && (
              <span className={`chip dl${cdNext.level === "over" ? " over" : ""}`}>{cdNext.label}</span>
            )}
          </div>
          <a href="/portal/assignments" className="btn primary" style={{ marginTop: "var(--space-3)" }}>
            Nộp bài
          </a>
        </div>
      )}

      {/* ST-2 + ST-3: Widgets học tập */}
      <div className="portal-widgets">
        {/* Streak 7 ngày */}
        <div className="portal-widget">
          <div className="portal-widget-title">🔥 Tuần này</div>
          <div className="portal-week">
            {weekDays.map((d) => (
              <div
                key={d.key}
                className={`portal-day${d.active ? " active" : ""}${d.isToday ? " today" : ""}`}
              >
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats 28 ngày */}
        <div className="portal-widget">
          <div className="portal-widget-title">📊 28 ngày qua</div>
          <div className="portal-stats">
            <div className="portal-stat">
              <div className="portal-stat-n">{stats28.submittedCount}</div>
              <div className="portal-stat-l">bài đã nộp</div>
            </div>
            <div className="portal-stat">
              <div className="portal-stat-n">{stats28.avgScore ?? "—"}</div>
              <div className="portal-stat-l">điểm TB</div>
            </div>
            <div className="portal-stat">
              <div className="portal-stat-n">{stats28.attendedCount}</div>
              <div className="portal-stat-l">buổi có mặt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lớp đang học */}
      <div className="sec">
        <h2><span className="secdot portal-secdot-teach" />Lớp đang học</h2>
        <span className="cnt">{classes.length}</span>
      </div>
      {classes.length === 0 ? (
        <div className="card"><div className="empty">Bạn chưa được thêm vào lớp nào. Liên hệ giảng viên nhé.</div></div>
      ) : (
        <div className="stack">
          {classes.map((c) => {
            const progress = progressByClass.get(c.id);
            return (
              <div key={c.id} className="card portal-row">
                <span className="portal-bar" aria-hidden />
                <div className="grow">
                  <div className="t portal-strong">{c.name}</div>
                  <div className="portal-sub">
                    {c.term ? c.term : "Lớp học"}
                    {c.status === "archived" ? " · đã lưu trữ" : ""}
                  </div>
                  {/* ST-1: Progress bar */}
                  {progress && (
                    <>
                      <div className="portal-progress-wrap">
                        <div className="portal-progress-bar" style={{ width: `${progress.pct}%` }} />
                      </div>
                      <div className="portal-progress-label">
                        {progress.submitted}/{progress.total} bài đã nộp
                      </div>
                    </>
                  )}
                </div>
                <GraduationCap strokeWidth={2} aria-hidden className="portal-row-ic" />
              </div>
            );
          })}
        </div>
      )}

      {/* Bài tập sắp tới */}
      <div className="sec">
        <h2><span className="secdot portal-secdot-amber" />Bài tập sắp tới</h2>
        <span className="cnt">{upcoming.length}</span>
      </div>
      {upcoming.length === 0 ? (
        <div className="card"><div className="empty">Không có bài tập nào sắp đến hạn. 🎉</div></div>
      ) : (
        <div className="stack">
          {upcoming.map((a) => {
            const cd = a.dueAt != null ? countdown(a.dueAt, now) : null;
            return (
              <div key={a.id} className="card portal-row">
                <CalendarClock strokeWidth={2} aria-hidden className="portal-row-ic" />
                <div className="grow">
                  <div className="t">{a.title}</div>
                  <div className="meta">
                    {a.dueAt != null && (
                      <span className="chip dl">Hạn: {fmtDate(a.dueAt)} {fmtTime(a.dueAt)}</span>
                    )}
                    {cd && (
                      <span className={"chip dl" + (cd.level === "over" ? " over" : "")}>{cd.label}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Điểm mới nhất */}
      <div className="sec">
        <h2><span className="secdot portal-secdot-teach" />Điểm mới nhất</h2>
        <span className="cnt">{latestGrades.length}</span>
      </div>
      {latestGrades.length === 0 ? (
        <div className="card"><div className="empty">Chưa có điểm nào được công bố.</div></div>
      ) : (
        <div className="stack">
          {latestGrades.map((g) => (
            <div key={g.gradeId} className="card portal-row">
              <FileCheck2 strokeWidth={2} aria-hidden className="portal-row-ic" />
              <div className="grow">
                <div className="t">{g.assignmentTitle}</div>
                {g.gradedAt != null && <div className="portal-sub">Chấm ngày {fmtDate(g.gradedAt)}</div>}
              </div>
              <span className="portal-score">{g.score}<span className="portal-max">/{g.maxScore}</span></span>
            </div>
          ))}
        </div>
      )}

      <div className="portal-cta">
        <a href="/portal/grades" className="btn line"><GraduationCap strokeWidth={2} aria-hidden />Xem tất cả điểm</a>
        <a href="/portal/materials" className="btn line"><BookOpen strokeWidth={2} aria-hidden />Tài liệu lớp</a>
      </div>
    </>
  );
}
