import type { FixedSchedule, TimeBlock } from "@/db/schema";

// weekdayMask: bit0=T2(Mon) ... bit6=CN(Sun). JS getDay(): 0=CN..6=T7.
export function weekdayBit(date: Date): number {
  const js = date.getDay(); // 0..6 (CN..T7)
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

// Đầu ngày (local) cho 1 mốc thời gian.
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
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
