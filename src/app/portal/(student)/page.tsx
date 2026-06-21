import { redirect } from "next/navigation";
import { GraduationCap, BookOpen, CalendarClock, FileCheck2 } from "lucide-react";
import {
  getSessionStudentId,
  getMyClasses,
  getMyAssignments,
  getMyGrades,
} from "@/lib/lms/portal-queries";
import { fmtDate, fmtTime, countdown } from "@/lib/format";

export const dynamic = "force-dynamic";

// Trang chủ cổng học viên: lời chào + lớp đang học + bài tập sắp tới + điểm mới nhất.
// MỌI dữ liệu lấy qua portal-queries với studentId từ session (scoped, chống IDOR).

export default async function PortalHomePage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [classes, assignments, grades] = await Promise.all([
    getMyClasses(studentId),
    getMyAssignments(studentId),
    getMyGrades(studentId),
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

  return (
    <>
      <div className="portal-hello">
        <h1>Xin chào 👋</h1>
        <p className="sub">Đây là không gian học tập của bạn — điểm, bài tập và tài liệu lớp.</p>
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
          {classes.map((c) => (
            <div key={c.id} className="card portal-row">
              <span className="portal-bar" aria-hidden />
              <div className="grow">
                <div className="t portal-strong">{c.name}</div>
                <div className="portal-sub">
                  {c.term ? c.term : "Lớp học"}
                  {c.status === "archived" ? " · đã lưu trữ" : ""}
                </div>
              </div>
              <GraduationCap strokeWidth={2} aria-hidden className="portal-row-ic" />
            </div>
          ))}
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
