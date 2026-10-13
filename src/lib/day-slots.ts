// Khe trống trong ngày để xếp việc (SPEC-UI-P2.1 T06). Hàm thuần, không phụ thuộc giờ máy:
// `day0` là 00:00 giờ Việt Nam (startOfDay), các mốc khác là epoch ms.

const MIN = 60_000;
const HOUR = 60 * MIN;
const STEP = 15 * MIN;

export type Span = { startAt: number; endAt: number };

export function freeSlots(
  day0: number,
  busy: Span[],
  now: number,
  { fromHour = 7, toHour = 22, minMinutes = 60, max = 2 } = {},
): Span[] {
  // Bắt đầu từ mốc muộn hơn giữa 07:00 và "bây giờ" (làm tròn lên bội số 15 phút).
  const winStart = Math.max(day0 + fromHour * HOUR, Math.ceil(now / STEP) * STEP);
  const winEnd = day0 + toHour * HOUR;
  if (winStart >= winEnd) return [];

  const sorted = busy
    .filter((b) => b.endAt > winStart && b.startAt < winEnd)
    .sort((a, b) => a.startAt - b.startAt);

  const gaps: Span[] = [];
  let cursor = winStart;
  for (const b of sorted) {
    if (b.startAt > cursor) gaps.push({ startAt: cursor, endAt: b.startAt });
    cursor = Math.max(cursor, b.endAt);
  }
  if (cursor < winEnd) gaps.push({ startAt: cursor, endAt: winEnd });

  return gaps.filter((g) => g.endAt - g.startAt >= minMinutes * MIN).slice(0, max);
}
