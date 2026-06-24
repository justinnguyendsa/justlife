"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from "lucide-react";
import type { FixedSchedule, TimeBlock, Task } from "@/db/schema";
import { createTimeBlock } from "@/app/actions/schedule";
import type { Conflict } from "@/lib/scheduler";
import { fmtTime, fmtDate } from "@/lib/format";
import { AREAS } from "@/lib/areas";
import { toast } from "@/components/Toaster";
import { CalendarDragDrop } from "@/components/CalendarDragDrop";
import { CalendarWeekView, getWeekDays } from "@/components/CalendarWeekView";

// ─── Helper: lấy thứ Hai đầu tuần chứa `ms` (local time) ───────────────────
export function getMonday(ms: number): number {
  const d = new Date(ms);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 86_400_000;
const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_MS = 3_600_000;

export function CalendarClient({
  day0: initialDay0,
  fixed,
  blocks,
  tasks,
}: {
  day0: number;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // ─── View mode toggle ─────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [day0, setDay0] = useState(initialDay0);
  const [weekStart, setWeekStart] = useState(() => getMonday(initialDay0));

  // Khi chuyển sang tuần, đảm bảo weekStart luôn đồng bộ với ngày hiện tại
  function switchToWeek() {
    setWeekStart(getMonday(day0));
    setViewMode("week");
    // Cần load blocks của cả tuần — trigger router refresh với param weekStart
    const ws = getMonday(day0);
    router.push(`/calendar?weekStart=${ws}`);
  }

  function switchToDay(d?: number) {
    const target = d ?? day0;
    setDay0(target);
    setViewMode("day");
    router.push(`/calendar?day=${target}`);
  }

  // ─── Điều hướng ngày/tuần ─────────────────────────────────────────────────
  function prevDay() {
    const next = day0 - DAY_MS;
    setDay0(next);
    router.push(`/calendar?day=${next}`);
  }
  function nextDay() {
    const next = day0 + DAY_MS;
    setDay0(next);
    router.push(`/calendar?day=${next}`);
  }
  function todayDay() {
    const t0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    setDay0(t0);
    router.push(`/calendar?day=${t0}`);
  }

  function prevWeek() {
    const ws = weekStart - 7 * DAY_MS;
    setWeekStart(ws);
    router.push(`/calendar?weekStart=${ws}`);
  }
  function nextWeek() {
    const ws = weekStart + 7 * DAY_MS;
    setWeekStart(ws);
    router.push(`/calendar?weekStart=${ws}`);
  }
  function todayWeek() {
    const ws = getMonday(Date.now());
    setWeekStart(ws);
    router.push(`/calendar?weekStart=${ws}`);
  }

  // ─── Sheet "Thêm khối" ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selTaskId, setSelTaskId] = useState<string | "">("");
  const [freeTitle, setFreeTitle] = useState("");
  const [area, setArea] = useState<string>("work");
  const [startHHMM, setStartHHMM] = useState("09:00");
  const [durMin, setDurMin] = useState(60);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function openSheet(hhmm?: string) {
    setSelTaskId("");
    setFreeTitle("");
    setArea("work");
    setDurMin(60);
    if (hhmm) setStartHHMM(hhmm);
    setSheetOpen(true);
  }

  // Callback từ CalendarDragDrop khi block được cập nhật thành công
  function onBlockUpdated(conflicts: Conflict[]) {
    router.refresh();
    if (conflicts.length) {
      toast(`Trùng lịch: ${conflicts[0].label}`, true);
    }
  }

  // Tạo block từ sheet
  function submitCreate() {
    const picked = selTaskId ? tasks.find((t) => t.id === selTaskId) ?? null : null;
    const title = picked ? picked.title : freeTitle.trim();
    if (!title) {
      toast("Hãy chọn một việc hoặc nhập tiêu đề", true);
      return;
    }
    const [hh, mm] = startHHMM.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      toast("Giờ bắt đầu không hợp lệ", true);
      return;
    }
    const startAt = day0 + (hh * 60 + mm) * 60_000;
    const endAt = startAt + durMin * 60_000;
    const useArea = picked ? picked.area : area;
    start(async () => {
      const res = await createTimeBlock({
        taskId: picked?.id ?? null,
        title,
        startAt,
        endAt,
        area: useArea,
      });
      setSheetOpen(false);
      router.refresh();
      if (res.conflicts.length) {
        toast(`Trùng lịch: ${res.conflicts[0].label}`, true);
      } else {
        toast(`Đã xếp ${title} · ${fmtTime(startAt)}–${fmtTime(endAt)}`);
      }
    });
  }

  // ─── Render header tuần ─────────────────────────────────────────────────
  function WeekRangeLabel() {
    const days = getWeekDays(weekStart);
    const first = days[0];
    const last = days[6];
    return (
      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        {fmtDate(first)} – {fmtDate(last)}
      </span>
    );
  }

  return (
    <>
      {/* ─── Toolbar: toggle Day/Week + điều hướng ─────────────────────────── */}
      <div className="flex between center" style={{ margin: "4px 0 10px", gap: 8, flexWrap: "wrap" }}>
        {/* Toggle Day / Week */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
          <button
            className={"btn" + (viewMode === "day" ? "" : " ghost")}
            style={{ borderRadius: 0, gap: 4, padding: "5px 10px", fontSize: 13 }}
            onClick={() => switchToDay()}
            aria-pressed={viewMode === "day"}
            title="Xem ngày"
          >
            <CalendarDays width={14} height={14} /> Ngày
          </button>
          <button
            className={"btn" + (viewMode === "week" ? "" : " ghost")}
            style={{ borderRadius: 0, gap: 4, padding: "5px 10px", fontSize: 13, borderLeft: "1px solid var(--border)" }}
            onClick={switchToWeek}
            aria-pressed={viewMode === "week"}
            title="Xem tuần"
          >
            <LayoutGrid width={14} height={14} /> Tuần
          </button>
        </div>

        {/* Điều hướng */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="btn ghost"
            style={{ padding: "5px 8px" }}
            onClick={viewMode === "day" ? prevDay : prevWeek}
            aria-label={viewMode === "day" ? "Ngày trước" : "Tuần trước"}
          >
            <ChevronLeft width={16} height={16} />
          </button>

          {viewMode === "day" ? (
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", minWidth: 120, textAlign: "center" }}>
              {fmtDate(day0)}
            </span>
          ) : (
            <WeekRangeLabel />
          )}

          <button
            className="btn ghost"
            style={{ padding: "5px 8px" }}
            onClick={viewMode === "day" ? nextDay : nextWeek}
            aria-label={viewMode === "day" ? "Ngày tiếp" : "Tuần tiếp"}
          >
            <ChevronRight width={16} height={16} />
          </button>

          <button
            className="btn line sm"
            style={{ fontSize: 12, padding: "4px 8px" }}
            onClick={viewMode === "day" ? todayDay : todayWeek}
          >
            Hôm nay
          </button>
        </div>

        {/* Nút thêm khối (chỉ hiện ở DayView) */}
        {viewMode === "day" && (
          <button className="btn line sm" onClick={() => openSheet()}>
            <Plus strokeWidth={2} width={16} height={16} /> Thêm khối
          </button>
        )}
      </div>

      {/* ─── Chú thích thời gian (DayView) ─────────────────────────────────── */}
      {viewMode === "day" && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {fmtTime(day0 + START_HOUR * HOUR_MS)}–{fmtTime(day0 + (END_HOUR + 1) * HOUR_MS)}
          </span>
        </div>
      )}

      {/* ─── View chính ─────────────────────────────────────────────────────── */}
      {viewMode === "day" ? (
        <CalendarDragDrop
          day0={day0}
          fixed={fixed}
          blocks={blocks}
          tasks={tasks}
          onBlockUpdated={onBlockUpdated}
          onCreateRequest={(hhmm) => openSheet(hhmm)}
        />
      ) : (
        <CalendarWeekView
          weekStart={weekStart}
          fixed={fixed}
          blocks={blocks}
          onDayClick={(d) => {
            setDay0(d);
            setViewMode("day");
            router.push(`/calendar?day=${d}`);
          }}
        />
      )}

      {/* ─── FAB phụ: thêm khối nhanh trên mobile (DayView) ─────────────────── */}
      {viewMode === "day" && (
        <button className="fab" aria-label="Thêm khối lịch" onClick={() => openSheet()}>
          <Plus strokeWidth={2} />
        </button>
      )}

      {/* ─── Sheet thêm khối ────────────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="sheet" role="dialog" aria-label="Thêm khối lịch">
            <h3>Thêm khoảng tập trung</h3>

            <div className="field">
              <label>Chọn việc (tùy chọn)</label>
              <select
                value={selTaskId}
                onChange={(e) => setSelTaskId(e.target.value)}
                aria-label="Chọn việc để gắn"
              >
                <option value="">— Không gắn việc, nhập tiêu đề tự do —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {!selTaskId && (
              <>
                <div className="field">
                  <label>Tiêu đề khối</label>
                  <input
                    value={freeTitle}
                    onChange={(e) => setFreeTitle(e.target.value)}
                    placeholder="Ví dụ: Tập trung viết báo cáo..."
                    aria-label="Tiêu đề khối"
                  />
                </div>
                <div className="field">
                  <label>Mảng</label>
                  <div className="areapick">
                    {AREAS.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        className={`a ${a.key}` + (area === a.key ? " on" : "")}
                        onClick={() => setArea(a.key)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="row2">
              <div className="field">
                <label>Giờ bắt đầu</label>
                <input
                  type="time"
                  value={startHHMM}
                  onChange={(e) => setStartHHMM(e.target.value)}
                  aria-label="Giờ bắt đầu"
                />
              </div>
              <div className="field">
                <label>Thời lượng (phút)</label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setDurMin((v) => Math.max(15, v - 15))}
                    aria-label="Giảm thời lượng"
                  >
                    –
                  </button>
                  <span className="v">{durMin}</span>
                  <button
                    type="button"
                    onClick={() => setDurMin((v) => Math.min(480, v + 15))}
                    aria-label="Tăng thời lượng"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={() => setSheetOpen(false)}>
                Hủy
              </button>
              <button className="btn primary block" disabled={pending} onClick={submitCreate}>
                {pending ? "Đang lưu..." : "Lưu khối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
