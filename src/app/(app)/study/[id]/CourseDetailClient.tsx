"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ExternalLink, ListTodo, NotebookPen } from "lucide-react";
import type { getCourseDetail } from "@/db/study";
import type { StItem, StNote } from "@/db/schema";
import {
  createItem, setItemStatus, deleteItem,
  createNote, deleteNote,
} from "@/app/actions/study";
import { countdown, fmtDate } from "@/lib/format";
import { toast } from "@/components/Toaster";

// Kiểu trả về của getCourseDetail (đã loại null vì page cha gọi notFound()).
type Detail = NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>;
type Tab = "items" | "notes";
type Router = ReturnType<typeof useRouter>;
type Start = ReturnType<typeof useTransition>[1];

type Kind = "assignment" | "quiz" | "project" | "exam";
const KINDS: { key: Kind; label: string }[] = [
  { key: "assignment", label: "Bài tập" },
  { key: "quiz", label: "Quiz" },
  { key: "project", label: "Đồ án" },
  { key: "exam", label: "Thi" },
];
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.key, k.label]));

type ItemStatus = "todo" | "doing" | "done";
const STATUSES: { key: ItemStatus; label: string }[] = [
  { key: "todo", label: "Chưa làm" },
  { key: "doing", label: "Đang làm" },
  { key: "done", label: "Xong" },
];

export function CourseDetailClient({ detail }: { detail: Detail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("items");
  const courseId = detail.course.id;

  return (
    <>
      <div className="tabs" role="tablist">
        <button role="tab" className={tab === "items" ? "on" : ""} onClick={() => setTab("items")}>Bài tập &amp; Đồ án</button>
        <button role="tab" className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Ghi chú &amp; tài liệu</button>
      </div>

      {tab === "items" && (
        <ItemsTab courseId={courseId} items={detail.items} pending={pending} start={start} router={router} />
      )}
      {tab === "notes" && (
        <NotesTab courseId={courseId} notes={detail.notes} pending={pending} start={start} router={router} />
      )}
    </>
  );
}

/* ============ TAB: BÀI TẬP & ĐỒ ÁN ============ */
function ItemsTab({ courseId, items, pending, start, router }: {
  courseId: string; items: StItem[]; pending: boolean; start: Start; router: Router;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("assignment");
  const [due, setDue] = useState(""); // input date "YYYY-MM-DD" (optional)

  function add() {
    const t = title.trim();
    if (!t) { toast("Nhập tên bài/đồ án", true); return; }
    let dueAt: number | null = null;
    if (due) {
      const ms = new Date(due + "T23:59:59").getTime(); // hết ngày deadline
      if (Number.isNaN(ms)) { toast("Hạn nộp không hợp lệ", true); return; }
      dueAt = ms;
    }
    start(async () => {
      await createItem({ courseId, title: t, kind, dueAt });
      setTitle(""); setKind("assignment"); setDue("");
      router.refresh();
      toast("Đã thêm mục");
    });
  }
  function changeStatus(it: StItem, status: ItemStatus) {
    if (it.status === status) return;
    start(async () => {
      await setItemStatus(it.id, courseId, status);
      router.refresh();
      toast("Đã đổi trạng thái");
    });
  }
  function del(it: StItem) {
    start(async () => {
      await deleteItem(it.id, courseId);
      router.refresh();
      toast("Đã xóa mục");
    });
  }

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <>
      {/* Form thêm mục */}
      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Tên bài / đồ án</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài tập tuần 3 — hồi quy" />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Loại</label>
          <div className="seg" style={{ margin: "2px 0 0" }}>
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                className={kind === k.key ? "on" : ""}
                disabled={pending}
                onClick={() => setKind(k.key)}
              >{k.label}</button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Hạn nộp (không bắt buộc)</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <button className="btn ghost block" disabled={pending} onClick={add}><Plus strokeWidth={2} />Thêm mục</button>
      </div>

      <div className="sec">
        <h2>
          <span className="secdot" style={{ background: "var(--module-study)" }} />
          <ListTodo strokeWidth={1.8} style={{ width: 15, height: 15 }} />Danh sách
        </h2>
        {items.length > 0 && <span className="cnt">{doneCount}/{items.length} xong</span>}
      </div>

      {items.length === 0 ? (
        <div className="empty">Chưa có mục nào — thêm bài tập, quiz, đồ án hay kỳ thi ở trên.</div>
      ) : (
        <div>
          {items.map((it) => {
            const cd = it.dueAt != null ? countdown(it.dueAt) : null;
            return (
              <div key={it.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t" style={{ marginBottom: 6 }}>{it.title}</div>
                    <div className="meta">
                      <span className="chip study">{KIND_LABEL[it.kind] ?? it.kind}</span>
                      {it.dueAt != null
                        ? <span className={"chip dl" + (it.status !== "done" && cd?.level === "over" ? " over" : "")}>
                            {it.status === "done" ? `hạn ${fmtDate(it.dueAt)}` : cd?.label}
                          </span>
                        : <span className="chip st">không hạn</span>}
                    </div>
                  </div>
                  <button className="btn line sm" disabled={pending} onClick={() => del(it)} aria-label={`Xóa ${it.title}`}>
                    <Trash2 strokeWidth={1.9} />
                  </button>
                </div>
                <div className="seg" style={{ marginBottom: 0 }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      className={it.status === s.key ? "on" : ""}
                      disabled={pending}
                      onClick={() => changeStatus(it, s.key)}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============ TAB: GHI CHÚ & TÀI LIỆU ============ */
function NotesTab({ courseId, notes, pending, start, router }: {
  courseId: string; notes: StNote[]; pending: boolean; start: Start; router: Router;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");

  function add() {
    const t = title.trim();
    if (!t) { toast("Nhập tiêu đề ghi chú", true); return; }
    start(async () => {
      await createNote({ courseId, title: t, url: url.trim() || undefined, body: body.trim() || undefined });
      setTitle(""); setUrl(""); setBody("");
      router.refresh();
      toast("Đã thêm ghi chú");
    });
  }
  function del(n: StNote) {
    start(async () => {
      await deleteNote(n.id, courseId);
      router.refresh();
      toast("Đã xóa ghi chú");
    });
  }

  return (
    <>
      {/* Form thêm ghi chú */}
      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Tiêu đề</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Slide chương 2 — Trực quan hóa" />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Link tài liệu (không bắt buộc)</label>
          <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." autoComplete="off" />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Nội dung (không bắt buộc)</label>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tóm tắt, ghi nhớ, công thức..." />
        </div>
        <button className="btn ghost block" disabled={pending} onClick={add}><Plus strokeWidth={2} />Thêm ghi chú</button>
      </div>

      <div className="sec">
        <h2>
          <span className="secdot" style={{ background: "var(--module-study)" }} />
          <NotebookPen strokeWidth={1.8} style={{ width: 15, height: 15 }} />Ghi chú &amp; tài liệu
        </h2>
        {notes.length > 0 && <span className="cnt">{notes.length}</span>}
      </div>

      {notes.length === 0 ? (
        <div className="empty">Chưa có ghi chú nào — lưu slide, tài liệu hay ghi nhớ cho môn này.</div>
      ) : (
        <div>
          {notes.map((n) => (
            <div key={n.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t">{n.title}</div>
                  {n.body && <div className="meta" style={{ display: "block", whiteSpace: "pre-wrap", marginTop: 6 }}>{n.body}</div>}
                  {n.url && (
                    <a
                      className="btn line sm"
                      style={{ marginTop: 10 }}
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink strokeWidth={1.9} />Mở tài liệu
                    </a>
                  )}
                </div>
                <button className="btn line sm" disabled={pending} onClick={() => del(n)} aria-label={`Xóa ${n.title}`}>
                  <Trash2 strokeWidth={1.9} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
