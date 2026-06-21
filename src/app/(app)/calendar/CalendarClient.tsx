"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { FixedSchedule, TimeBlock, Task } from "@/db/schema";
import { createTimeBlock, updateTimeBlock } from "@/app/actions/schedule";
import { maskHasDate, fixedToRange, detectConflicts } from "@/lib/scheduler";
import { fmtTime } from "@/lib/format";
import { AREA_VAR, AREAS } from "@/lib/areas";
import { toast } from "@/components/Toaster";

// Lưới giờ hiển thị 07:00–23:00 — mỗi giờ cao 46px (khớp CSS `.cal .hour`).
const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_PX = 46;
const HOUR_MS = 3_600_000;
const SNAP_MIN = 15; // snap kéo-thả về bội số 15 phút
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const GRID_PX = HOURS.length * HOUR_PX; // chiều cao vùng kéo-thả
const MIN_BLOCK_PX = 16; // chiều cao tối thiểu để chip vẫn đọc được

type Range = { startAt: number; endAt: number };

// Quy đổi vị trí dọc (px tính từ đỉnh lưới) ↔ mốc thời gian trong ngày.
function topPxOf(ms: number, day0: number): number {
  return ((ms - day0) / HOUR_MS - START_HOUR) * HOUR_PX;
}
function startAtFromTop(topPx: number, day0: number): number {
  const rawMin = (START_HOUR + topPx / HOUR_PX) * 60;
  const snapped = Math.round(rawMin / SNAP_MIN) * SNAP_MIN;
  return day0 + snapped * 60_000;
}

export function CalendarClient({
  day0,
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

  // Khối cố định áp dụng cho NGÀY đang xem (lọc theo weekdayMask), quy đổi sang khoảng epoch.
  const dayDate = useMemo(() => new Date(day0), [day0]);
  const fixedRanges = useMemo(
    () =>
      fixed
        .filter((f) => maskHasDate(f.weekdayMask, dayDate))
        .map((f) => ({ id: f.id, label: f.label, area: f.area, ...fixedToRange(f, day0) })),
    [fixed, dayDate, day0]
  );

  // --- Trạng thái kéo-thả (Pointer Events: hỗ trợ cả chuột & chạm) ---
  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerY0: number; top0: number; height: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTop, setDragTop] = useState(0); // vị trí top hiện tại khi đang kéo
  const [dragConflict, setDragConflict] = useState(false);

  // --- Sheet "Thêm khối" ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selTaskId, setSelTaskId] = useState<string | "">("");
  const [freeTitle, setFreeTitle] = useState("");
  const [area, setArea] = useState<string>("work");
  const [startHHMM, setStartHHMM] = useState("09:00");
  const [durMin, setDurMin] = useState(60);

  // Đóng sheet bằng phím Esc (desktop).
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // Kéo block đè khối khác/cố định → tính realtime để tô đỏ (.conflict).
  function computeConflict(id: string, range: Range): boolean {
    const others = blocks.filter((b) => b.id !== id).map((b) => ({ ...b }));
    return detectConflicts(range.startAt, range.endAt, fixed, others, id).length > 0;
  }

  function onBlockPointerDown(e: React.PointerEvent, b: TimeBlock) {
    // Chỉ kéo bằng nút trái chuột hoặc chạm/bút.
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const top0 = topPxOf(b.startAt, day0);
    const height = (b.endAt - b.startAt) / HOUR_MS * HOUR_PX;
    drag.current = { id: b.id, pointerY0: e.clientY, top0, height };
    setDragId(b.id);
    setDragTop(top0);
    setDragConflict(false);
  }

  function onBlockPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const delta = e.clientY - d.pointerY0;
    // Clamp để block luôn nằm trọn trong lưới 07:00–24:00.
    const maxTop = GRID_PX - d.height;
    const nextTop = Math.max(0, Math.min(maxTop, d.top0 + delta));
    setDragTop(nextTop);
    const newStart = startAtFromTop(nextTop, day0);
    const newEnd = newStart + (d.height / HOUR_PX) * HOUR_MS;
    setDragConflict(computeConflict(d.id, { startAt: newStart, endAt: newEnd }));
  }

  function onBlockPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer đã nhả */
    }
    drag.current = null;
    setDragId(null);

    const finalTop = dragTop;
    // Không di chuyển đáng kể → coi như chạm, bỏ qua.
    if (Math.abs(finalTop - d.top0) < 2) return;

    const newStart = startAtFromTop(finalTop, day0);
    const newEnd = newStart + (d.height / HOUR_PX) * HOUR_MS;
    start(async () => {
      const res = await updateTimeBlock(d.id, newStart, newEnd);
      router.refresh();
      if (res.conflicts.length) {
        toast(`Trùng lịch: ${res.conflicts[0].label}`, true);
      } else {
        toast(`Đã xếp ${fmtTime(newStart)}–${fmtTime(newEnd)}`);
      }
    });
  }

  // Mobile: chạm vào ô giờ trống → mở sheet với giờ điền sẵn theo dòng giờ vừa chạm.
  function onGridPointerDown(e: React.PointerEvent) {
    if (drag.current) return; // đang kéo block → bỏ qua
    if (e.target !== e.currentTarget) return; // chỉ nhận chạm vào nền lưới, không phải lên block
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const ms = startAtFromTop(y, day0);
    setStartHHMM(fmtTime(ms));
    openSheet();
  }

  function openSheet() {
    setSelTaskId("");
    setFreeTitle("");
    setArea("work");
    setDurMin(60);
    setSheetOpen(true);
  }

  // Tạo block từ sheet: ưu tiên việc đã chọn, nếu không thì dùng tiêu đề tự do.
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

  return (
    <>
      <div className="flex between center" style={{ margin: "4px 0 10px" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          {fmtTime(day0 + START_HOUR * HOUR_MS)}–{fmtTime(day0 + (END_HOUR + 1) * HOUR_MS)}
        </span>
        <button className="btn line sm" onClick={openSheet}>
          <Plus strokeWidth={2} width={16} height={16} /> Thêm khối
        </button>
      </div>

      <div className="cal">
        {/* Lưới giờ nền 07:00–23:00 */}
        {HOURS.map((h) => (
          <div className="hour" key={h}>
            <span className="lab">{String(h).padStart(2, "0")}</span>
          </div>
        ))}

        {/* Lớp chứa các khối — bắt chạm nền để mở sheet (mobile chạm-đặt) */}
        <div
          className="blocks"
          ref={gridRef}
          style={{ pointerEvents: "auto" }}
          onPointerDown={onGridPointerDown}
        >
          {/* Khối cố định hôm nay — read-only, không kéo (AC-05-5) */}
          {fixedRanges.map((f) => {
            const top = topPxOf(f.startAt, day0);
            const height = Math.max(MIN_BLOCK_PX, ((f.endAt - f.startAt) / HOUR_MS) * HOUR_PX);
            return (
              <div
                key={f.id}
                className="blk fixed"
                role="img"
                aria-label={`Khối cố định: ${f.label}, ${fmtTime(f.startAt)}–${fmtTime(f.endAt)}`}
                style={{ top, height, background: AREA_VAR[f.area] }}
              >
                {f.label}
                <small>
                  {fmtTime(f.startAt)}–{fmtTime(f.endAt)}
                </small>
              </div>
            );
          })}

          {/* Time-block (việc đã xếp) — kéo-thả dọc đổi giờ (AC-05-3/05-4) */}
          {blocks.map((b) => {
            const dragging = dragId === b.id;
            const top = dragging ? dragTop : topPxOf(b.startAt, day0);
            const height = Math.max(MIN_BLOCK_PX, ((b.endAt - b.startAt) / HOUR_MS) * HOUR_PX);
            // Giờ hiển thị cập nhật realtime trong lúc kéo.
            const liveStart = dragging ? startAtFromTop(dragTop, day0) : b.startAt;
            const liveEnd = liveStart + (b.endAt - b.startAt);
            const conflict = dragging && dragConflict;
            return (
              <div
                key={b.id}
                className={"blk movable" + (dragging ? " drag" : "") + (conflict ? " conflict" : "")}
                role="button"
                aria-label={`Việc đã xếp: ${b.title}, ${fmtTime(b.startAt)}–${fmtTime(b.endAt)}. Kéo để đổi giờ.`}
                style={{ top, height, background: AREA_VAR[b.area] }}
                onPointerDown={(e) => onBlockPointerDown(e, b)}
                onPointerMove={onBlockPointerMove}
                onPointerUp={onBlockPointerUp}
              >
                {b.title}
                <small>
                  {fmtTime(liveStart)}–{fmtTime(liveEnd)}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chú thích + cách dùng theo thiết bị */}
      <div className="legend">
        <span>
          <i style={{ background: "var(--module-work)" }} /> Khối cố định
        </span>
        <span>
          <i style={{ background: "var(--accent)" }} /> Việc đã xếp (kéo được)
        </span>
        <span>
          <i style={{ background: "var(--danger)" }} /> Trùng lịch
        </span>
      </div>
      <div className="empty" style={{ padding: "10px 4px", textAlign: "left" }}>
        Máy tính: kéo khối việc lên/xuống để đổi giờ. Điện thoại: chạm ô giờ trống để thêm khối, hoặc kéo khối bằng ngón.
      </div>

      {blocks.length === 0 && fixedRanges.length === 0 && (
        <div className="empty">Hôm nay chưa có khối nào — nhấn “Thêm khối” để xếp việc vào lịch.</div>
      )}

      {/* FAB phụ: thêm khối nhanh trên mobile */}
      <button className="fab" aria-label="Thêm khối lịch" onClick={openSheet}>
        <Plus strokeWidth={2} />
      </button>

      {/* Sheet thêm khối */}
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
