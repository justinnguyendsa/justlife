"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Copy, Users, CalendarDays, Archive } from "lucide-react";
import type { TcClass } from "@/db/lms/schema";
import { createClass, cloneClass, archiveClass } from "@/app/actions/teaching";
import { toast } from "@/components/Toaster";

// listClasses() trả về lớp kèm số học viên + số buổi (tính sẵn ở server).
type ClassRow = TcClass & { studentCount: number; sessionCount: number };

type Mode = null | "create" | { clone: ClassRow };

export function ClassesClient({ classes }: { classes: ClassRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");

  // Đóng sheet bằng Esc (desktop).
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  function close() { setMode(null); setName(""); setTerm(""); }

  function openClone(c: ClassRow) {
    setName(`${c.name} (lớp mới)`);
    setTerm("");
    setMode({ clone: c });
  }

  function submit() {
    const nm = name.trim();
    if (!nm) { toast("Nhập tên lớp", true); return; }
    const tm = term.trim() || undefined;
    start(async () => {
      if (mode && typeof mode === "object" && "clone" in mode) {
        const r = await cloneClass(mode.clone.id, { name: nm, term: tm });
        close();
        router.refresh();
        if (r.ok) router.push(`/teaching/classes/${r.id}`);
        toast("Đã nhân bản lớp — học viên giữ nguyên, điểm để trống");
      } else {
        const r = await createClass({ name: nm, term: tm });
        close();
        router.refresh();
        if (r.ok) router.push(`/teaching/classes/${r.id}`);
        toast("Đã tạo lớp mới");
      }
    });
  }

  function archive(c: ClassRow) {
    start(async () => {
      await archiveClass(c.id);
      router.refresh();
      toast("Đã lưu trữ lớp");
    });
  }

  const active = classes.filter((c) => c.status !== "archived");
  const archived = classes.filter((c) => c.status === "archived");
  const isClone = mode && typeof mode === "object" && "clone" in mode;

  return (
    <>
      <div className="row2" style={{ marginTop: 12 }}>
        <button className="btn primary block" onClick={() => { setName(""); setTerm(""); setMode("create"); }}>
          <Plus strokeWidth={2} />Tạo lớp
        </button>
        <button
          className="btn line block"
          disabled={active.length === 0}
          onClick={() => active.length && openClone(active[0])}
        >
          <Copy strokeWidth={1.9} />Tạo từ lớp cũ
        </button>
      </div>

      {active.length === 0 ? (
        <div className="empty">Chưa có lớp nào — nhấn “Tạo lớp” để mở lớp đầu tiên.</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {active.map((c) => (
            <Link key={c.id} href={`/teaching/classes/${c.id}`} className="task card" style={{ alignItems: "center" }}>
              <span className="bar" style={{ background: "var(--module-teach)" }} />
              <div className="b">
                <div className="t">{c.name}</div>
                <div className="meta">
                  {c.term && <span className="chip teach">{c.term}</span>}
                  <span className="chip st"><Users strokeWidth={1.8} style={{ width: 13, height: 13 }} />{c.studentCount} học viên</span>
                  <span className="chip st"><CalendarDays strokeWidth={1.8} style={{ width: 13, height: 13 }} />{c.sessionCount} buổi</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <div className="sec"><h2><span className="secdot" style={{ background: "var(--text-faint)" }} />Đã lưu trữ</h2><span className="cnt">{archived.length}</span></div>
          {archived.map((c) => (
            <div key={c.id} className="setrow">
              <div>
                <div className="l">{c.name}</div>
                <div className="d">{c.term ? c.term + " · " : ""}{c.studentCount} học viên · {c.sessionCount} buổi</div>
              </div>
              <Link href={`/teaching/classes/${c.id}`} className="btn line sm">Xem</Link>
            </div>
          ))}
        </>
      )}

      {mode && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="sheet" role="dialog" aria-label={isClone ? "Tạo lớp từ lớp cũ" : "Tạo lớp mới"}>
            <h3>{isClone ? "Tạo lớp từ lớp cũ" : "Tạo lớp mới"}</h3>

            {isClone && (
              <div className="field">
                <label>Lớp nguồn</label>
                <select
                  value={(mode as { clone: ClassRow }).clone.id}
                  onChange={(e) => {
                    const src = active.find((c) => c.id === e.target.value);
                    if (src) setMode({ clone: src });
                  }}
                >
                  {active.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.term ? ` · ${c.term}` : ""}</option>
                  ))}
                </select>
                <div className="d" style={{ marginTop: 6 }}>Sao chép danh sách học viên + bài tập, KHÔNG sao chép điểm & điểm danh.</div>
              </div>
            )}

            <div className="field">
              <label>Tên lớp</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Data Analyst K12" autoFocus />
            </div>
            <div className="field">
              <label>Kỳ học (không bắt buộc)</label>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="VD: Học kỳ 2 · 2026" />
            </div>

            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={close}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={submit}>
                {pending ? "Đang lưu..." : isClone ? "Nhân bản lớp" : "Tạo lớp"}
              </button>
            </div>

            {isClone && active.length > 0 && (
              <button
                className="btn line block sm"
                style={{ marginTop: 10 }}
                disabled={pending}
                onClick={() => archive((mode as { clone: ClassRow }).clone)}
              >
                <Archive strokeWidth={1.8} />Lưu trữ lớp nguồn
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
