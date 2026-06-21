"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Plus, Trash2, Check } from "lucide-react";
import type { listHabits } from "@/db/habits";
import { createHabit, deleteHabit, toggleHabitToday } from "@/app/actions/habits";
import { toast } from "@/components/Toaster";

// Kiểu trả về của query (đã kèm streak/doneToday/last7) — bám query để khỏi lệch khi schema đổi.
type HabitRow = Awaited<ReturnType<typeof listHabits>>[number];

// Nhãn thứ ngắn cho 7 ô tuần (chỉ số đầu tuần Asia/HCM theo key YYYY-MM-DD).
const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
function dowOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  // Dùng UTC để khỏi lệch múi giờ — chỉ cần thứ trong tuần, không cần giờ.
  return DOW_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// Gợi ý thói quen lành mạnh (hướng tăng cân/khỏe mạnh, KHÔNG ăn kiêng/giảm cân).
const SUGGESTIONS = ["Tập tăng cơ 30 phút", "Học tiếng Anh 20 phút", "Ngủ trước 23h"];

export function HabitsClient({ habits }: { habits: HabitRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  // Đóng sheet bằng Esc (desktop).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() { setOpen(false); setName(""); }

  function submit() {
    const nm = name.trim();
    if (!nm) { toast("Nhập tên thói quen", true); return; }
    start(async () => {
      await createHabit({ name: nm });
      close();
      router.refresh();
      toast("Đã thêm thói quen");
    });
  }

  function toggle(h: HabitRow) {
    start(async () => {
      const r = await toggleHabitToday(h.id);
      router.refresh();
      toast(r.done ? "Đã đánh dấu hôm nay" : "Đã bỏ đánh dấu hôm nay");
    });
  }

  function del(h: HabitRow) {
    if (!confirm(`Xóa thói quen "${h.name}"? Toàn bộ lịch sử chuỗi sẽ mất.`)) return;
    start(async () => {
      await deleteHabit(h.id);
      router.refresh();
      toast("Đã xóa thói quen");
    });
  }

  return (
    <>
      <button className="btn primary block" style={{ marginBottom: 14 }} onClick={() => { close(); setOpen(true); }}>
        <Plus strokeWidth={2} />Thêm thói quen
      </button>

      {habits.length === 0 ? (
        <div className="empty">
          Chưa có thói quen nào — nhấn “Thêm thói quen” để bắt đầu.
          <br />Gợi ý: tập tăng cơ, học tiếng Anh, ngủ đúng giờ.
        </div>
      ) : (
        <div>
          {habits.map((h) => (
            <div key={h.id} className="card" style={{ marginBottom: 12 }}>
              {/* Hàng trên: tên + streak + nút xóa */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t" style={{ marginBottom: 8 }}>{h.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Flame strokeWidth={1.9} width={18} height={18} style={{ color: "var(--module-growth)", flex: "none" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 22, lineHeight: 1, color: "var(--module-growth)" }}>
                      {h.streak}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {h.streak === 0 ? "chưa có chuỗi" : `ngày liên tiếp`}
                    </span>
                  </div>
                </div>
                <button className="btn line sm" disabled={pending} onClick={() => del(h)} aria-label={`Xóa ${h.name}`}>
                  <Trash2 strokeWidth={1.9} />
                </button>
              </div>

              {/* 7 ô tuần (cũ → mới) */}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {h.last7.map((d) => (
                  <div key={d.key} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      title={d.key + (d.done ? " · đã làm" : " · chưa làm")}
                      aria-label={`${dowOf(d.key)} ${d.key}: ${d.done ? "đã làm" : "chưa làm"}`}
                      style={{
                        height: 26,
                        borderRadius: "var(--radius-sm)",
                        background: d.done ? "var(--module-growth)" : "var(--surface-2)",
                        border: d.done ? "none" : "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {d.done && <Check strokeWidth={2.4} width={14} height={14} style={{ color: "var(--on-amber)" }} />}
                    </div>
                    <div className="muted" style={{ fontSize: 10, marginTop: 4, fontFamily: "var(--font-mono)" }}>{dowOf(d.key)}</div>
                  </div>
                ))}
              </div>

              {/* Nút bật/tắt hôm nay */}
              <button
                className={"btn block sm " + (h.doneToday ? "amber" : "ghost")}
                style={{ marginTop: 12 }}
                disabled={pending}
                onClick={() => toggle(h)}
                aria-pressed={h.doneToday}
              >
                {h.doneToday ? (<><Check strokeWidth={2.2} />Đã xong hôm nay</>) : (<><Flame strokeWidth={1.9} />Hôm nay</>)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sheet: thêm thói quen */}
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="sheet" role="dialog" aria-label="Thêm thói quen">
            <h3>Thêm thói quen</h3>
            <div className="field">
              <label>Tên thói quen</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !pending) submit(); }}
                placeholder="VD: Tập tăng cơ 30 phút"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip st" style={{ cursor: "pointer", border: "1px solid var(--border)" }} onClick={() => setName(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={close}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={submit}>
                {pending ? "Đang lưu..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
