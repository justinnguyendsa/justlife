import type { FixedSchedule, TimeBlock } from "@/db/schema";

// Giờ Việt Nam: cố định UTC+7, không có giờ mùa hè. Server (Vercel) chạy giờ UTC, nên mọi phép tính
// "đầu ngày", "thứ mấy", "đầu tuần" phải theo giờ Việt Nam chứ không theo giờ của máy đang chạy.
// Trước đây dùng setHours/getDay (giờ máy) → trên server, đầu ngày lệch 7 tiếng và lịch cố định
// có thể rơi sang thứ khác.
export const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Thứ trong tuần theo giờ Việt Nam: 0=CN … 6=T7 (cùng quy ước Date.getDay()). */
export function vnWeekday(ms: number): number {
  return new Date(ms + VN_OFFSET_MS).getUTCDay();
}

/** Ngày trong tháng (1–31) theo giờ Việt Nam. */
export function vnDayOfMonth(ms: number): number {
  return new Date(ms + VN_OFFSET_MS).getUTCDate();
}

// weekdayMask: bit0=T2(Mon) ... bit6=CN(Sun). JS getDay(): 0=CN..6=T7.
export function weekdayBit(date: Date): number {
  const js = vnWeekday(date.getTime()); // 0..6 (CN..T7), theo giờ Việt Nam
  const idx = js === 0 ? 6 : js - 1; // → 0..6 (T2..CN)
  return 1 << idx;
}
export function maskHasDate(mask: number, date: Date): boolean {
  return (mask & weekdayBit(date)) !== 0;
}
export const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function rangesOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2;
}

// 00:00 giờ Việt Nam của ngày chứa mốc `ms` (epoch ms).
export function startOfDay(ms: number): number {
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
}

// 00:00 thứ Hai (giờ Việt Nam) của tuần chứa mốc `ms`.
export function startOfWeek(ms: number): number {
  const d0 = startOfDay(ms);
  return d0 - ((vnWeekday(d0) + 6) % 7) * DAY_MS;
}

// "YYYY-MM-DD" → 00:00 giờ Việt Nam của ngày đó; NaN nếu sai định dạng.
export function parseVnDate(dateStr: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? Date.parse(`${dateStr}T00:00:00+07:00`) : NaN;
}

// Quy đổi 1 fixed_schedule (phút trong ngày) → khoảng epoch ms cho 1 ngày cụ thể.
export function fixedToRange(f: FixedSchedule, dayStart: number): { startAt: number; endAt: number } {
  return { startAt: dayStart + f.startMin * 60_000, endAt: dayStart + f.endMin * 60_000 };
}

export type Conflict = { kind: "fixed" | "block"; label: string; startAt: number; endAt: number };

// Kiểm xung đột của 1 khoảng dự kiến với: các fixed_schedule áp dụng hôm đó + các time_block khác.
export function detectConflicts(
  startAt: number,
  endAt: number,
  fixeds: FixedSchedule[],
  blocks: TimeBlock[],
  ignoreBlockId?: string
): Conflict[] {
  const dayStart = startOfDay(startAt);
  const day = new Date(dayStart);
  const out: Conflict[] = [];
  for (const f of fixeds) {
    if (!maskHasDate(f.weekdayMask, day)) continue;
    const r = fixedToRange(f, dayStart);
    if (rangesOverlap(startAt, endAt, r.startAt, r.endAt)) out.push({ kind: "fixed", label: f.label, ...r });
  }
  for (const b of blocks) {
    if (b.id === ignoreBlockId) continue;
    if (rangesOverlap(startAt, endAt, b.startAt, b.endAt)) out.push({ kind: "block", label: b.title, startAt: b.startAt, endAt: b.endAt });
  }
  return out;
}
