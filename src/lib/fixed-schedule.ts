import { AREAS } from "./areas";
import { WEEKDAYS } from "./scheduler";

// Khung giờ bận cố định (SPEC-UI-P2.5 B04, F10). Hàm thuần — dùng chung cho form (báo lỗi tại chỗ) và server action.

export type FixedInput = { label: string; area: string; startMin: number; endMin: number; weekdayMask: number };
export const FIXED_LABEL_MAX = 80;

const AREA_KEYS = new Set(AREAS.map((a) => a.key));
const isMin = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1440;

export function validateFixed(input: FixedInput): { ok: true; value: FixedInput } | { ok: false; error: string } {
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (!label) return { ok: false, error: "Nhập tên khung" };
  if (label.length > FIXED_LABEL_MAX) return { ok: false, error: `Tên khung tối đa ${FIXED_LABEL_MAX} ký tự` };
  if (!AREA_KEYS.has(input.area)) return { ok: false, error: "Chọn mảng cho khung" };
  if (!isMin(input.startMin) || !isMin(input.endMin)) return { ok: false, error: "Giờ không hợp lệ" };
  if (input.endMin <= input.startMin) return { ok: false, error: "Giờ kết thúc phải sau giờ bắt đầu" };
  if (!Number.isInteger(input.weekdayMask) || input.weekdayMask < 1 || input.weekdayMask > 127) {
    return { ok: false, error: "Chọn ít nhất một ngày lặp lại" };
  }
  return { ok: true, value: { label, area: input.area, startMin: input.startMin, endMin: input.endMin, weekdayMask: input.weekdayMask } };
}

/** "T2–T6", "T3, T5", "Hằng ngày" — bit0 = T2 … bit6 = CN. */
export function weekdayRange(mask: number): string {
  const on = WEEKDAYS.map((_, i) => (mask & (1 << i)) !== 0);
  if (on.every(Boolean)) return "Hằng ngày";
  const idx = on.flatMap((v, i) => (v ? [i] : []));
  if (idx.length === 0) return "";
  const contiguous = idx.length >= 3 && idx[idx.length - 1] - idx[0] === idx.length - 1;
  return contiguous ? `${WEEKDAYS[idx[0]]}–${WEEKDAYS[idx[idx.length - 1]]}` : idx.map((i) => WEEKDAYS[i]).join(", ");
}
