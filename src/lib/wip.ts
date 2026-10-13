// Giới hạn số việc đang làm cùng lúc (SPEC-UI-P2.5 B01). `0` = không giới hạn.
export const WIP_DEFAULT = 3;
export const WIP_MAX = 10;

/** Đọc giá trị `wip_limit` đã lưu: số nguyên 0–10; sai hoặc thiếu → 3. */
export function parseWipLimit(raw: string | null | undefined): number {
  if (raw == null || !/^\d+$/.test(raw.trim())) return WIP_DEFAULT;
  const n = Number(raw.trim());
  return n <= WIP_MAX ? n : WIP_DEFAULT;
}

export const isValidWipLimit = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= WIP_MAX;

/** Đã đủ việc đang làm chưa (giới hạn 0 = không bao giờ đủ). */
export const isWipExceeded = (current: number, limit: number) => limit > 0 && current >= limit;
