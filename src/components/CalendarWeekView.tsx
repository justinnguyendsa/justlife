"use client";
import { useMemo } from "react";
import type { FixedSchedule, TimeBlock } from "@/db/schema";
import { maskHasDate, fixedToRange } from "@/lib/scheduler";
import { fmtTime, fmtDate } from "@/lib/format";
import { areaSoftClass, areaSolidClass } from "@/lib/areas";
import { cn } from "@/lib/utils";

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_PX = 46;
const HOUR_MS = 3_600_000;
const MIN_BLOCK_PX = 16;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const DAY_MS = 86_400_000;

// Tên thứ rút gọn (T2–CN)
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function getWeekDays(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS);
}

function topPxOf(ms: number, day0: number): number {
  return ((ms - day0) / HOUR_MS - START_HOUR) * HOUR_PX;
}

export function CalendarWeekView({
  weekStart,
  fixed,
  blocks,
  onDayClick,
}: {
  weekStart: number;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  onDayClick: (day0: number) => void;
}) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today0 = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Tính fixed ranges cho từng ngày
  const fixedByDay = useMemo(() => {
    return days.map((day0) => {
      const dayDate = new Date(day0);
      return fixed
        .filter((f) => maskHasDate(f.weekdayMask, dayDate))
        .map((f) => ({ id: f.id, label: f.label, area: f.area, ...fixedToRange(f, day0) }));
    });
  }, [days, fixed]);

  // Lọc blocks theo từng ngày
  const blocksByDay = useMemo(() => {
    return days.map((day0) => {
      const dayEnd = day0 + DAY_MS;
      return blocks.filter((b) => b.startAt >= day0 && b.startAt < dayEnd);
    });
  }, [days, blocks]);

  const gridHeight = HOURS.length * HOUR_PX;

  return (
    <div className="bg-card overflow-x-auto rounded-lg border" style={{ WebkitOverflowScrolling: "touch" }}>
      <div
        className="week-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `48px repeat(7, minmax(96px, 1fr))`,
          minWidth: 48 + 7 * 96,
          position: "relative",
        }}
      >
        {/* Header: ô góc trống + 7 cột ngày */}
        <div
          className="bg-card sticky top-0 z-[4] h-12 border-b"
        />
        {days.map((day0, i) => {
          const d = new Date(day0);
          const isToday = day0 === today0;
          return (
            <button
              key={day0}
              onClick={() => onDayClick(day0)}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "sticky top-0 z-[3] flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 border-b p-0 transition-colors",
                i === 0 && "border-l",
                isToday ? "bg-primary-soft text-primary-soft-foreground" : "bg-card text-foreground hover:bg-accent",
              )}
              aria-label={`Chuyển sang xem ngày ${fmtDate(day0)}`}
            >
              <span className="text-[11px] opacity-80">{DAY_NAMES[d.getDay()]}</span>
              <span className="font-mono text-base font-bold">{String(d.getDate()).padStart(2, "0")}</span>
            </button>
          );
        })}

        {/* Body: cột giờ + 7 cột ngày */}
        {/* Cột giờ */}
        <div
          className="relative border-r"
          style={{ height: gridHeight }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: (h - START_HOUR) * HOUR_PX,
                width: "100%",
                height: HOUR_PX,
                display: "flex",
                alignItems: "flex-start",
                paddingTop: 2,
                justifyContent: "center",
                boxSizing: "border-box",
              }}
              className="border-border/70 border-t"
            >
              <span className="text-muted-foreground font-mono text-[11px]">
                {String(h).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        {/* 7 cột ngày */}
        {days.map((day0, colIdx) => {
          const isToday = day0 === today0;
          return (
            <div
              key={day0}
              style={{ height: gridHeight }}
              className={cn("relative cursor-pointer border-l", isToday && "bg-primary-soft/40")}
              onClick={() => onDayClick(day0)}
            >
              {/* Kẻ ngang từng giờ */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: (h - START_HOUR) * HOUR_PX,
                    left: 0,
                    right: 0,
                  }}
                  className="border-border/50 border-t"
                />
              ))}

              {/* Khối cố định */}
              {fixedByDay[colIdx].map((f) => {
                const top = topPxOf(f.startAt, day0);
                const height = Math.max(MIN_BLOCK_PX, ((f.endAt - f.startAt) / HOUR_MS) * HOUR_PX);
                return (
                  <div
                    key={f.id}
                    role="img"
                    aria-label={`Khối cố định: ${f.label}, ${fmtTime(f.startAt)}–${fmtTime(f.endAt)}`}
                    style={{
                      position: "absolute",
                      top,
                      left: 2,
                      right: 2,
                      height,
                      zIndex: 1,
                    }}
                    className={cn("pointer-events-none overflow-hidden rounded-sm px-1 py-0.5 text-[11px]", areaSoftClass(f.area))}
                  >
                    <span style={{ display: "block", fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.label}
                    </span>
                    {height >= 28 && (
                      <small className="font-mono text-[10px] opacity-85">
                        {fmtTime(f.startAt)}–{fmtTime(f.endAt)}
                      </small>
                    )}
                  </div>
                );
              })}

              {/* Time-block */}
              {blocksByDay[colIdx].map((b) => {
                const top = topPxOf(b.startAt, day0);
                const height = Math.max(MIN_BLOCK_PX, ((b.endAt - b.startAt) / HOUR_MS) * HOUR_PX);
                return (
                  <div
                    key={b.id}
                    role="button"
                    aria-label={`Việc đã xếp: ${b.title}, ${fmtTime(b.startAt)}–${fmtTime(b.endAt)}`}
                    onClick={(e) => { e.stopPropagation(); onDayClick(day0); }}
                    style={{
                      position: "absolute",
                      top,
                      left: 2,
                      right: 2,
                      height,
                      zIndex: 2,
                    }}
                    className={cn("cursor-pointer overflow-hidden rounded-sm px-1 py-0.5 text-[11px]", areaSolidClass(b.area))}
                  >
                    <span style={{ display: "block", fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.title}
                    </span>
                    {height >= 28 && (
                      <small className="font-mono text-[10px] opacity-85">
                        {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                      </small>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
