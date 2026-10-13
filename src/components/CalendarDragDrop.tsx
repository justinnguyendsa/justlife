"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FixedSchedule, TimeBlock } from "@/db/schema";
import { updateTimeBlock } from "@/app/actions/schedule";
import { maskHasDate, fixedToRange, detectConflicts, startOfDay, type Conflict } from "@/lib/scheduler";
import { fmtTime } from "@/lib/format";
import { areaSoftClass, areaSolidClass } from "@/lib/areas";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";

// Lưới giờ ngày 07:00–23:00 (SPEC-UI-P2.3 F03) — mỗi giờ cao 46px.
// Khối cố định: nền nhạt, không kéo. Việc đã xếp: nền đặc, kéo dọc đổi giờ (chuột kéo ngay,
// chạm giữ 0,3 giây). Bấm/chạm không kéo = chọn khối để sửa ở bảng "Khối đang chọn".
const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_PX = 46;
const HOUR_MS = 3_600_000;
const SNAP_MIN = 15;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const GRID_PX = HOURS.length * HOUR_PX;
const MIN_BLOCK_PX = 18;
const LONG_PRESS_MS = 300;
const CLICK_SLOP_PX = 4;

type Range = { startAt: number; endAt: number };

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
  now,
  fixed,
  blocks,
  selectedId,
  onSelect,
  onBlockUpdated,
  onCreateRequest,
}: {
  day0: number;
  now: number;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  selectedId: string | null;
  onSelect: (b: TimeBlock) => void;
  onBlockUpdated: (conflicts: Conflict[]) => void;
  onCreateRequest: (startHHMM: string) => void;
}) {
  const dayDate = useMemo(() => new Date(day0), [day0]);
  const fixedRanges = useMemo(
    () =>
      fixed
        .filter((f) => maskHasDate(f.weekdayMask, dayDate))
        .map((f) => ({ id: f.id, label: f.label, area: f.area, ...fixedToRange(f, day0) })),
    [fixed, dayDate, day0],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerY0: number; top0: number; height: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTop, setDragTop] = useState(0);
  const [dragConflict, setDragConflict] = useState(false);

  // Chạm (touch): chờ long-press mới kéo; nhả sớm mà không cuộn = chạm để chọn.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const tapCandidate = useRef(false);
  const pendingDrag = useRef<{ b: TimeBlock; pointerId: number; clientY: number; el: HTMLElement } | null>(null);

  function computeConflict(id: string, range: Range): boolean {
    return detectConflicts(range.startAt, range.endAt, fixed, blocks, id).length > 0;
  }

  function activateDrag(b: TimeBlock, pointerY0: number, el: HTMLElement, pointerId: number) {
    try { el.setPointerCapture(pointerId); } catch { /* đã nhả */ }
    const top0 = topPxOf(b.startAt, day0);
    const height = ((b.endAt - b.startAt) / HOUR_MS) * HOUR_PX;
    drag.current = { id: b.id, pointerY0, top0, height };
    setDragId(b.id);
    setDragTop(top0);
    setDragConflict(false);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    pendingDrag.current = null;
  }

  // Huỷ mọi trạng thái kéo (pointercancel, mất capture, unmount) — khối không bị kẹt ở "đang kéo".
  function resetDrag() {
    clearLongPress();
    drag.current = null;
    longPressActive.current = false;
    tapCandidate.current = false;
    setDragId(null);
    setDragConflict(false);
  }

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  function onBlockPointerDown(e: React.PointerEvent, b: TimeBlock) {
    if (e.button !== 0) return;
    if (e.pointerType === "mouse") {
      e.preventDefault();
      activateDrag(b, e.clientY, e.currentTarget as HTMLElement, e.pointerId);
      return;
    }
    clearLongPress(); // chạm đa điểm: bỏ timer cũ trước khi đặt timer mới
    longPressActive.current = false;
    tapCandidate.current = true;
    pendingDrag.current = { b, pointerId: e.pointerId, clientY: e.clientY, el: e.currentTarget as HTMLElement };
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      tapCandidate.current = false;
      if (pendingDrag.current) {
        const { b: pb, clientY, el, pointerId } = pendingDrag.current;
        activateDrag(pb, clientY, el, pointerId);
      }
    }, LONG_PRESS_MS);
  }

  function onBlockPointerMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" && !longPressActive.current) {
      // Ngón tay di chuyển trước long-press = đang cuộn → không kéo, không chọn.
      if (pendingDrag.current && Math.abs(e.clientY - pendingDrag.current.clientY) > CLICK_SLOP_PX) {
        tapCandidate.current = false;
        clearLongPress();
      }
      return;
    }
    const d = drag.current;
    if (!d) return;
    const nextTop = Math.max(0, Math.min(GRID_PX - d.height, d.top0 + (e.clientY - d.pointerY0)));
    setDragTop(nextTop);
    const newStart = startAtFromTop(nextTop, day0);
    setDragConflict(computeConflict(d.id, { startAt: newStart, endAt: newStart + (d.height / HOUR_PX) * HOUR_MS }));
  }

  function onBlockPointerUp(e: React.PointerEvent, b: TimeBlock) {
    if (e.pointerType !== "mouse" && !longPressActive.current) {
      const wasTap = tapCandidate.current;
      tapCandidate.current = false;
      clearLongPress();
      if (wasTap) onSelect(b);
      return;
    }
    const d = drag.current;
    if (!d) return;
    longPressActive.current = false;
    pendingDrag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* đã nhả */ }
    drag.current = null;
    setDragId(null);

    if (Math.abs(dragTop - d.top0) < CLICK_SLOP_PX) {
      onSelect(b); // bấm, không kéo
      return;
    }
    const newStart = startAtFromTop(dragTop, day0);
    const newEnd = newStart + (d.height / HOUR_PX) * HOUR_MS;
    updateTimeBlock(d.id, newStart, newEnd)
      .then((res) => onBlockUpdated(res.conflicts))
      .catch(() => toast("Chưa đổi được giờ — kiểm tra kết nối rồi thử lại", true));
  }

  // Bấm/chạm ô giờ trống (click: không kích hoạt khi đang cuộn) → mở hộp Thêm khối.
  function onGridClick(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    onCreateRequest(fmtTime(startAtFromTop(e.clientY - rect.top, day0)));
  }

  const isToday = startOfDay(now) === day0;
  const nowTop = topPxOf(now, day0);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-card relative overflow-hidden rounded-lg border">
        {HOURS.map((h) => (
          <div key={h} className="border-border/70 flex h-[46px] border-t first:border-t-0">
            <span className="text-muted-foreground border-border/70 w-12 shrink-0 border-r px-1.5 pt-0.5 text-right font-mono text-[11px]">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        <div
          ref={gridRef}
          onClick={onGridClick}
          className="absolute inset-y-0 right-1.5 left-12 cursor-copy"
          aria-label="Lưới giờ — bấm vào ô trống để thêm khối"
        >
          {fixedRanges.map((f) => {
            const top = topPxOf(f.startAt, day0);
            const height = Math.max(MIN_BLOCK_PX, ((f.endAt - f.startAt) / HOUR_MS) * HOUR_PX);
            return (
              <div
                key={f.id}
                role="img"
                aria-label={`Giờ bận cố định: ${f.label}, ${fmtTime(f.startAt)}–${fmtTime(f.endAt)}`}
                className={cn("pointer-events-none absolute inset-x-0.5 overflow-hidden rounded-md px-2 py-1 text-xs leading-4 font-semibold", areaSoftClass(f.area))}
                style={{ top: top + 1, height: height - 2 }}
              >
                {f.label}
                {height >= 34 && <span className="block font-mono text-[11px] font-medium opacity-80">{fmtTime(f.startAt)}–{fmtTime(f.endAt)}</span>}
              </div>
            );
          })}

          {blocks.map((b) => {
            const dragging = dragId === b.id;
            const top = dragging ? dragTop : topPxOf(b.startAt, day0);
            const height = Math.max(MIN_BLOCK_PX, ((b.endAt - b.startAt) / HOUR_MS) * HOUR_PX);
            const liveStart = dragging ? startAtFromTop(dragTop, day0) : b.startAt;
            const liveEnd = liveStart + (b.endAt - b.startAt);
            const conflict = dragging && dragConflict;
            const selected = selectedId === b.id;
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Việc đã xếp: ${b.title}, ${fmtTime(b.startAt)}–${fmtTime(b.endAt)}. Bấm để sửa, kéo để đổi giờ.`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(b); } }}
                className={cn(
                  "absolute inset-x-0.5 cursor-grab touch-none overflow-hidden rounded-md px-2 py-1 text-xs leading-4 font-semibold select-none",
                  conflict ? "bg-destructive text-destructive-foreground" : areaSolidClass(b.area),
                  dragging && "z-10 cursor-grabbing shadow-lg",
                  selected && !dragging && "ring-ring ring-offset-card z-[5] ring-2 ring-offset-2",
                )}
                style={{ top: top + 1, height: height - 2 }}
                onPointerDown={(e) => onBlockPointerDown(e, b)}
                onPointerMove={onBlockPointerMove}
                onPointerUp={(e) => onBlockPointerUp(e, b)}
                onPointerCancel={resetDrag}
                onLostPointerCapture={() => { if (drag.current?.id === b.id) resetDrag(); }}
                onContextMenu={(e) => e.preventDefault()}
              >
                {b.title}
                {height >= 34 && <span className="block font-mono text-[11px] font-medium opacity-90">{fmtTime(liveStart)}–{fmtTime(liveEnd)}</span>}
              </div>
            );
          })}

          {isToday && nowTop >= 0 && nowTop <= GRID_PX && (
            <div aria-hidden="true" className="bg-destructive pointer-events-none absolute -left-1 right-0 z-20 h-0.5" style={{ top: nowTop }}>
              <span className="bg-destructive absolute -top-[3px] -left-1 size-2 rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5"><i className="bg-area-work-soft border-area-work/40 size-2.5 rounded-sm border" /> Giờ bận cố định</span>
        <span className="inline-flex items-center gap-1.5"><i className="bg-area-work size-2.5 rounded-sm" /> Việc đã xếp</span>
        <span className="inline-flex items-center gap-1.5"><i className="bg-destructive size-2.5 rounded-sm" /> Trùng khi kéo</span>
      </div>
    </div>
  );
}
