"use client";
import { useMemo, useRef, useState } from "react";
import type { FixedSchedule, TimeBlock, Task } from "@/db/schema";
import { updateTimeBlock } from "@/app/actions/schedule";
import { maskHasDate, fixedToRange, detectConflicts, type Conflict } from "@/lib/scheduler";
import { fmtTime } from "@/lib/format";
import { AREA_VAR, AREAS } from "@/lib/areas";

// Lưới giờ hiển thị 07:00–23:00 — mỗi giờ cao 46px.
const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_PX = 46;
const HOUR_MS = 3_600_000;
const SNAP_MIN = 15; // snap kéo-thả về bội số 15 phút
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const GRID_PX = HOURS.length * HOUR_PX;
const MIN_BLOCK_PX = 16;
const LONG_PRESS_MS = 300; // ngưỡng long-press mobile (ms)

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

export function CalendarDragDrop({
  day0,
  fixed,
  blocks,
  tasks,
  onBlockUpdated,
  onCreateRequest,
}: {
  day0: number;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  tasks: Task[];
  onBlockUpdated: (conflicts: Conflict[]) => void;
  onCreateRequest: (startHHMM: string) => void;
}) {
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
  const [dragTop, setDragTop] = useState(0);
  const [dragConflict, setDragConflict] = useState(false);

  // Long-press mobile: ref lưu timer và trạng thái "đã đủ thời gian long-press"
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  // Lưu pending drag data để kích hoạt sau khi long-press đủ thời gian
  const pendingDrag = useRef<{
    b: TimeBlock;
    pointerId: number;
    clientY: number;
    el: HTMLElement;
  } | null>(null);

  // Kéo block đè khối khác/cố định → tính realtime để tô đỏ (.conflict).
  function computeConflict(id: string, range: Range): boolean {
    const others = blocks.filter((b) => b.id !== id).map((b) => ({ ...b }));
    return detectConflicts(range.startAt, range.endAt, fixed, others, id).length > 0;
  }

  function activateDrag(b: TimeBlock, pointerY0: number, el: HTMLElement, pointerId: number) {
    el.setPointerCapture(pointerId);
    const top0 = topPxOf(b.startAt, day0);
    const height = (b.endAt - b.startAt) / HOUR_MS * HOUR_PX;
    drag.current = { id: b.id, pointerY0, top0, height };
    setDragId(b.id);
    setDragTop(top0);
    setDragConflict(false);
  }

  function onBlockPointerDown(e: React.PointerEvent, b: TimeBlock) {
    if (e.button !== 0) return;
    e.preventDefault();

    // Trên desktop (mouse): kéo ngay. Trên touch: chờ long-press.
    if (e.pointerType === "mouse") {
      activateDrag(b, e.clientY, e.currentTarget as HTMLElement, e.pointerId);
    } else {
      // Mobile: đặt timer, chờ LONG_PRESS_MS ms
      longPressActive.current = false;
      pendingDrag.current = { b, pointerId: e.pointerId, clientY: e.clientY, el: e.currentTarget as HTMLElement };
      longPressTimer.current = setTimeout(() => {
        longPressActive.current = true;
        if (pendingDrag.current) {
          const { b: pb, clientY, el, pointerId } = pendingDrag.current;
          try { el.setPointerCapture(pointerId); } catch { /* đã nhả */ }
          activateDrag(pb, clientY, el, pointerId);
        }
      }, LONG_PRESS_MS);
    }
  }

  function onBlockPointerMove(e: React.PointerEvent) {
    // Mobile: nếu chưa long-press và pointer di chuyển → coi là scroll, hủy timer
    if (e.pointerType !== "mouse" && !longPressActive.current) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        pendingDrag.current = null;
      }
      return;
    }

    const d = drag.current;
    if (!d) return;
    const delta = e.clientY - d.pointerY0;
    const maxTop = GRID_PX - d.height;
    const nextTop = Math.max(0, Math.min(maxTop, d.top0 + delta));
    setDragTop(nextTop);
    const newStart = startAtFromTop(nextTop, day0);
    const newEnd = newStart + (d.height / HOUR_PX) * HOUR_MS;
    setDragConflict(computeConflict(d.id, { startAt: newStart, endAt: newEnd }));
  }

  function onBlockPointerUp(e: React.PointerEvent) {
    // Mobile: nếu chưa đủ long-press → chỉ là tap, bỏ qua drag
    if (e.pointerType !== "mouse" && !longPressActive.current) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        pendingDrag.current = null;
      }
      return;
    }

    const d = drag.current;
    if (!d) return;
    longPressActive.current = false;
    pendingDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer đã nhả */
    }
    drag.current = null;
    setDragId(null);

    const finalTop = dragTop;
    if (Math.abs(finalTop - d.top0) < 2) return;

    const newStart = startAtFromTop(finalTop, day0);
    const newEnd = newStart + (d.height / HOUR_PX) * HOUR_MS;
    updateTimeBlock(d.id, newStart, newEnd).then((res) => {
      onBlockUpdated(res.conflicts);
    });
  }

  // Mobile: chạm vào ô giờ trống → gọi onCreateRequest với giờ tương ứng.
  function onGridPointerDown(e: React.PointerEvent) {
    if (drag.current) return;
    if (e.target !== e.currentTarget) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const ms = startAtFromTop(y, day0);
    onCreateRequest(fmtTime(ms));
  }

  return (
    <>
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
          {/* Khối cố định hôm nay — read-only, không kéo */}
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

          {/* Time-block (việc đã xếp) — kéo-thả dọc đổi giờ */}
          {blocks.map((b) => {
            const dragging = dragId === b.id;
            const top = dragging ? dragTop : topPxOf(b.startAt, day0);
            const height = Math.max(MIN_BLOCK_PX, ((b.endAt - b.startAt) / HOUR_MS) * HOUR_PX);
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

      {/* Chú thích */}
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
        Máy tính: kéo khối việc lên/xuống để đổi giờ. Điện thoại: chạm ô giờ trống để thêm khối, hoặc giữ khối &gt;0.3 giây rồi kéo.
      </div>
    </>
  );
}
