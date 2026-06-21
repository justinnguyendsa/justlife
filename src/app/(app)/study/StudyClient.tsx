"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, GraduationCap, CalendarClock, ListChecks } from "lucide-react";
import type { listCourses, getUpcomingStudy } from "@/db/study";
import { createCourse } from "@/app/actions/study";
import { countdown } from "@/lib/format";
import { toast } from "@/components/Toaster";

// Lấy đúng kiểu trả về từ query để khỏi lệch khi schema/db đổi.
type CourseRow = Awaited<ReturnType<typeof listCourses>>[number];
type UpcomingRow = Awaited<ReturnType<typeof getUpcomingStudy>>[number];

// Nhãn tiếng Việt cho loại mục học.
const KIND_LABEL: Record<string, string> = {
  assignment: "Bài tập",
  quiz: "Quiz",
  project: "Đồ án",
  exam: "Thi",
};

export function StudyClient({ courses, upcoming }: { courses: CourseRow[]; upcoming: UpcomingRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [term, setTerm] = useState("");

  // Đóng sheet bằng Esc (desktop).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() { setOpen(false); setName(""); setCode(""); setTerm(""); }

  function submit() {
    const nm = name.trim();
    if (!nm) { toast("Nhập tên môn học", true); return; }
    start(async () => {
      const r = await createCourse({ name: nm, code: code.trim() || undefined, term: term.trim() || undefined });
      close();
      router.refresh();
      if (r.ok) router.push(`/study/${r.id}`);
      toast("Đã tạo môn học");
    });
  }

  return (
    <>
      {/* ===== Sắp đến hạn — gộp item mọi môn, deadline tăng dần ===== */}
      <div className="sec">
        <h2>
          <span className="secdot" style={{ background: "var(--module-study)" }} />
          <CalendarClock strokeWidth={1.8} style={{ width: 15, height: 15 }} />Sắp đến hạn
        </h2>
        {upcoming.length > 0 && <span className="cnt">{upcoming.length}</span>}
      </div>
      {upcoming.length === 0 ? (
        <div className="empty">Không có bài nào sắp đến hạn trong 14 ngày tới — cứ yên tâm học.</div>
      ) : (
        <div>
          {upcoming.map((it) => {
            const cd = it.dueAt != null ? countdown(it.dueAt) : null;
            return (
              <Link key={it.id} href={`/study/${it.courseId}`} className="task card" style={{ alignItems: "center" }}>
                <span className="bar" style={{ background: "var(--module-study)" }} />
                <div className="b">
                  <div className="t">{it.title}</div>
                  <div className="meta">
                    <span className="chip study">{KIND_LABEL[it.kind] ?? it.kind}</span>
                    {it.courseName && <span className="chip st">{it.courseName}</span>}
                    {cd && <span className={"chip dl" + (cd.level === "over" ? " over" : "")}>{cd.label}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ===== Môn học ===== */}
      <div className="sec" style={{ marginTop: 22 }}>
        <h2>
          <span className="secdot" style={{ background: "var(--module-study)" }} />
          <GraduationCap strokeWidth={1.8} style={{ width: 16, height: 16 }} />Môn học
        </h2>
        {courses.length > 0 && <span className="cnt">{courses.length}</span>}
      </div>

      <button className="btn primary block" style={{ marginBottom: 14 }} onClick={() => { close(); setOpen(true); }}>
        <Plus strokeWidth={2} />Tạo môn
      </button>

      {courses.length === 0 ? (
        <div className="empty">Chưa có môn học nào — nhấn “Tạo môn” để thêm môn đầu tiên.</div>
      ) : (
        <div>
          {courses.map((c) => {
            const cd = c.nextDueAt != null ? countdown(c.nextDueAt) : null;
            return (
              <Link key={c.id} href={`/study/${c.id}`} className="task card" style={{ alignItems: "center" }}>
                <span className="bar" style={{ background: "var(--module-study)" }} />
                <div className="b">
                  <div className="t">{c.name}</div>
                  <div className="meta">
                    {c.code && <span className="chip study">{c.code}</span>}
                    {c.term && <span className="chip st">{c.term}</span>}
                    <span className="chip st">
                      <ListChecks strokeWidth={1.8} style={{ width: 13, height: 13 }} />
                      {c.doneCount}/{c.itemCount} mục xong
                    </span>
                    {cd
                      ? <span className={"chip dl" + (cd.level === "over" ? " over" : "")}>gần nhất: {cd.label}</span>
                      : <span className="chip st">chưa có hạn</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ===== Sheet: tạo môn ===== */}
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="sheet" role="dialog" aria-label="Tạo môn học">
            <h3>Tạo môn học</h3>
            <div className="field">
              <label>Tên môn</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Học máy nâng cao" autoFocus />
            </div>
            <div className="field">
              <label>Mã môn (không bắt buộc)</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: DS501" />
            </div>
            <div className="field">
              <label>Kỳ học (không bắt buộc)</label>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="VD: Học kỳ 2 · 2026" />
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={close}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={submit}>
                {pending ? "Đang lưu..." : "Tạo môn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
