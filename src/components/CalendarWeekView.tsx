"use client";
import { useMemo } from "react";
import type { FixedSchedule, TimeBlock } from "@/db/schema";
import { maskHasDate, fixedToRange } from "@/lib/scheduler";
import { fmtTime, fmtDate } from "@/lib/format";
import { AREA_VAR } from "@/lib/areas";

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
    <div className="week-view-outer" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
          className="week-header-corner"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 4,
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            height: 48,
          }}
        />
        {days.map((day0, i) => {
          const d = new Date(day0);
          const isToday = day0 === today0;
          return (
            <button
              key={day0}
              className={"week-day-header" + (isToday ? " today" : "")}
              onClick={() => onDayClick(day0)}
              style={{
                background: isToday ? "var(--accent)" : "var(--surface)",
                color: isToday ? "#fff" : "var(--text-primary)",
                border: "none",
                borderBottom: "1px solid var(--border)",
                borderLeft: i === 0 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                height: 48,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: 0,
                position: "sticky",
                top: 0,
                zIndex: 3,
              }}
              aria-label={`Chuyển sang xem ngày ${fmtDate(day0)}`}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>{DAY_NAMES[d.getDay()]}</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{String(d.getDate()).padStart(2, "0")}</span>
            </button>
          );
        })}

        {/* Body: cột giờ + 7 cột ngày */}
        {/* Cột giờ */}
        <div
          className="week-hour-col"
          style={{
            position: "relative",
            height: gridHeight,
            borderRight: "1px solid var(--border)",
          }}
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
                borderTop: "1px solid var(--border)",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
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
              style={{
                position: "relative",
                height: gridHeight,
                borderLeft: "1px solid var(--border)",
                background: isToday ? "color-mix(in srgb, var(--accent) 4%, transparent)" : undefined,
                cursor: "pointer",
              }}
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
                    borderTop: "1px solid var(--border)",
                    opacity: 0.4,
                  }}
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
                      background: AREA_VAR[f.area] ?? "var(--module-work)",
                      borderRadius: 4,
                      padding: "2px 4px",
                      fontSize: 10,
                      color: "#fff",
                      overflow: "hidden",
                      opacity: 0.75,
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ display: "block", fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.label}
                    </span>
                    {height >= 28 && (
                      <small style={{ fontSize: 9, opacity: 0.85 }}>
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
                      background: AREA_VAR[b.area] ?? "var(--accent)",
                      borderRadius: 4,
                      padding: "2px 4px",
                      fontSize: 10,
                      color: "#fff",
                      overflow: "hidden",
                      cursor: "pointer",
                      zIndex: 2,
                    }}
                  >
                    <span style={{ display: "block", fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.title}
                    </span>
                    {height >= 28 && (
                      <small style={{ fontSize: 9, opacity: 0.85 }}>
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
