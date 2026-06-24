"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Task } from "@/db/schema";
import { updateTask, deleteTask, setTaskStatus } from "@/app/actions/tasks";
import { calcPriorityScore } from "@/lib/priority";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";
import { toast } from "@/components/Toaster";

// Bộ lọc theo mảng đời sống (US-02). "all" = không lọc.
const AREA_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "work", label: "Việc" },
  { key: "teach", label: "Dạy" },
  { key: "study", label: "Học" },
  { key: "growth", label: "Bản thân" },
];

// Trạng thái có thể đặt từ sheet (US-02 AC-02-4). "done" tự ẩn việc khỏi list.
const STATUSES: { key: string; label: string }[] = [
  { key: "todo", label: "Cần làm" },
  { key: "doing", label: "Đang làm" },
  { key: "done", label: "Xong" },
];

// T17 — số việc mỗi trang
const PAGE_SIZE = 20;

// Bỏ dấu để tìm kiếm không phân biệt dấu — gõ "bao cao" vẫn ra "báo cáo" (US-02 edge case).
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d").trim();
}

export function TasksClient({ initial, wipLimit }: { initial: Task[]; wipLimit: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [effort, setEffort] = useState(3);
  const [impact, setImpact] = useState(3);

  // T15 — edit states cho sheet
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  // T17 — phân trang
  const [page, setPage] = useState(1);

  // Server là nguồn sự thật; mỗi refresh() trả `initial` mới → đồng bộ lại view.
  const tasks = initial;
  const open = openId ? tasks.find((t) => t.id === openId) ?? null : null;

  // Số việc "đang làm" hiện tại — dùng cho cảnh báo WIP mềm (US-04 AC-04-1/04-5).
  const doingCount = useMemo(() => tasks.filter((t) => t.status === "doing").length, [tasks]);

  // Khi mở 1 việc: nạp Effort/Impact/Title/Note/Deadline hiện có.
  useEffect(() => {
    if (!open) return;
    setEffort(open.effort ?? 3);
    setImpact(open.impact ?? 3);
    setEditTitle(open.title);
    setEditNote(open.note ?? "");
    setEditDeadline(
      open.deadlineAt ? new Date(open.deadlineAt).toISOString().split("T")[0] : ""
    );
  }, [open]);

  // Đóng sheet bằng phím Esc (desktop).
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const filtered = useMemo(() => {
    const fq = fold(q);
    return tasks.filter((t) => {
      if (area !== "all" && t.area !== area) return false;
      if (fq && !fold(t.title).includes(fq)) return false;
      return true;
    });
  }, [tasks, q, area]);

  // T17 — reset page khi filter thay đổi
  useEffect(() => setPage(1), [q, area]);

  // T17 — slice theo trang
  const paged = filtered.slice(0, page * PAGE_SIZE);

  // Điểm ưu tiên tự tính ngay khi chỉnh Effort/Impact (US-03 AC-03-5), giữ deadline hiện có.
  const liveScore = open
    ? calcPriorityScore({
        effort,
        impact,
        deadlineAt: editDeadline
          ? new Date(editDeadline + "T23:59:59").getTime()
          : open.deadlineAt,
      })
    : null;

  // T16 — changeStatus dùng wipLimit từ prop, toast cảnh báo nếu wip_exceeded
  function changeStatus(t: Task, status: string) {
    start(async () => {
      const res = await setTaskStatus(t.id, status);
      if (res.ok === false && res.wip_exceeded) {
        toast(
          `Đang làm ${res.current}/${res.limit} việc — vượt giới hạn WIP`,
          true
        );
        return;
      }
      if (status === "done") setOpenId(null);
      router.refresh();
      toast(status === "done" ? "Đã đánh dấu xong" : `Đã chuyển: ${labelOf(status)}`);
    });
  }

  // T15 — saveAll: lưu toàn bộ fields (title, note, effort, impact, deadline)
  function saveAll(t: Task) {
    if (editTitle.trim() === "") {
      toast("Vui lòng nhập tiêu đề", true);
      return;
    }
    const newDeadlineAt = editDeadline
      ? new Date(editDeadline + "T23:59:59").getTime()
      : null;
    start(async () => {
      const res = await updateTask(t.id, {
        title: editTitle.trim(),
        note: editNote.trim() || undefined,
        effort,
        impact,
        deadlineAt: newDeadlineAt,
      });
      if (res.ok === false && res.wip_exceeded) {
        toast(
          `Đang làm ${res.current}/${res.limit} việc — vượt giới hạn WIP`,
          true
        );
        return; // không đóng sheet
      }
      if (!res.ok) {
        toast(res.error ?? "Lưu thất bại", true);
        return;
      }
      setOpenId(null);
      router.refresh();
      toast("Lưu thành công");
    });
  }

  // T15 — xóa việc với confirm
  function handleDelete(t: Task) {
    if (!confirm("Xóa việc này?")) return;
    start(async () => {
      await deleteTask(t.id);
      setOpenId(null);
      router.refresh();
      toast("Đã xóa việc");
    });
  }

  return (
    <>
      <div className="search">
        <Search strokeWidth={1.8} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm việc theo tên..." aria-label="Tìm việc" />
      </div>

      <div className="filters">
        {AREA_FILTERS.map((f) => (
          <button key={f.key} className={"fil" + (area === f.key ? " on" : "")} onClick={() => setArea(f.key)}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {tasks.length === 0
            ? "Chưa có việc nào — nhấn nút + để thêm việc đầu tiên."
            : q.trim()
              ? `Không tìm thấy việc nào khớp "${q.trim()}".`
              : "Không có việc nào trong mảng này."}
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {paged.map((t) => {
            const dl = t.deadlineAt != null ? countdown(t.deadlineAt) : null;
            return (
              <button key={t.id} className="task card" onClick={() => setOpenId(t.id)}>
                <span className="bar" style={{ background: AREA_VAR[t.area] }} />
                <div className="b">
                  <div className="t">{t.title}</div>
                  <div className="meta">
                    <span className={`chip ${t.area}`}>{AREA_LABEL[t.area]}</span>
                    {t.status === "doing" && <span className="chip st doing">đang làm</span>}
                    {dl && <span className={"chip dl" + (dl.level === "over" ? " over" : "")}>{dl.label}</span>}
                    {t.priorityScore != null && <span className="chip score">{t.priorityScore} điểm</span>}
                    {t.priorityScore == null && <span className="chip st">chưa ưu tiên</span>}
                  </div>
                </div>
              </button>
            );
          })}

          {/* T17 — nút Xem thêm */}
          {filtered.length > paged.length && (
            <button className="btn ghost block" onClick={() => setPage((p) => p + 1)}>
              Xem thêm ({filtered.length - paged.length} việc nữa)
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="sheet" role="dialog" aria-label="Chi tiết việc">

            {/* T15 — edit title */}
            <div className="field">
              <label>Tiêu đề</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Tiêu đề việc..."
              />
            </div>

            {/* T15 — edit note */}
            <div className="field" style={{ marginTop: 8 }}>
              <label>Ghi chú</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Ghi chú (tùy chọn)..."
                rows={3}
              />
            </div>

            <div className="setrow">
              <div><div className="l">Mảng</div><div className="d">phân loại đời sống</div></div>
              <span className={`chip ${open.area}`}>{AREA_LABEL[open.area]}</span>
            </div>

            {/* T15 — edit deadline */}
            <div className="field" style={{ marginTop: 8 }}>
              <label>Hạn chót</label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>

            <div className="row2" style={{ marginTop: 12 }}>
              <div className="setrow" style={{ border: "none", padding: "4px 0" }}>
                <div className="l">Effort</div>
                <div className="stepper">
                  <button onClick={() => setEffort((v) => Math.max(1, v - 1))} aria-label="Giảm effort">–</button>
                  <span className="v">{effort}</span>
                  <button onClick={() => setEffort((v) => Math.min(5, v + 1))} aria-label="Tăng effort">+</button>
                </div>
              </div>
              <div className="setrow" style={{ border: "none", padding: "4px 0" }}>
                <div className="l">Impact</div>
                <div className="stepper">
                  <button onClick={() => setImpact((v) => Math.max(1, v - 1))} aria-label="Giảm impact">–</button>
                  <span className="v">{impact}</span>
                  <button onClick={() => setImpact((v) => Math.min(5, v + 1))} aria-label="Tăng impact">+</button>
                </div>
              </div>
            </div>

            <div className="scorebox"><span>Điểm ưu tiên (tự tính)</span><span className="n">{liveScore ?? "—"}</span></div>

            <div className="field" style={{ marginTop: 4 }}>
              <label>Trạng thái</label>
              <div className="seg">
                {STATUSES.map((s) => (
                  <button key={s.key} className={open.status === s.key ? "on" : ""} disabled={pending} onClick={() => changeStatus(open, s.key)}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* T15 — buttons: Đóng + Lưu + Xóa */}
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={() => setOpenId(null)}>Đóng</button>
              <button className="btn primary block" disabled={pending} onClick={() => saveAll(open)}>{pending ? "Đang lưu..." : "Lưu"}</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                className="btn ghost block"
                disabled={pending}
                onClick={() => handleDelete(open)}
                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              >
                Xóa việc
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function labelOf(status: string): string {
  return STATUSES.find((s) => s.key === status)?.label ?? status;
}
