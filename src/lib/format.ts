// Hiển thị thời gian theo Asia/Ho_Chi_Minh. Lưu UTC ms, format ở đây.
export const TZ = "Asia/Ho_Chi_Minh";
const DAY = 86_400_000;

export function fmtTime(ms: number): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(ms);
}
// "dd/MM" — Intl vi-VN với chỉ ngày + tháng trả "13-10", nên ghép lại cho thống nhất với "Thứ Ba, 13/10".
export function fmtDate(ms: number): string {
  const parts = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: TZ }).formatToParts(ms);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}`;
}
export function fmtDayName(ms: number): string {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(ms);
}

// "Thứ Năm, 09/10" — dòng tóm tắt ở thanh tiêu đề.
export function fmtDayShort(ms: number): string {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: TZ }).format(ms);
}

// Thời lượng thân thiện: "45 phút", "1 giờ 30", "2 giờ".
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${String(m).padStart(2, "0")}`;
}

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Đếm ngược thân thiện + mức độ khẩn (cho màu chip).
export function countdown(deadlineAt: number, now = Date.now()): { label: string; level: "ok" | "warn" | "over" } {
  const diff = deadlineAt - now;
  if (diff <= 0) {
    const overDays = Math.floor(-diff / DAY);
    return { label: overDays >= 1 ? `quá hạn ${overDays} ngày` : "quá hạn", level: "over" };
  }
  const days = Math.floor(diff / DAY);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return { label: `còn ${hours} giờ`, level: "warn" };
  if (days <= 1) return { label: "còn 1 ngày", level: "warn" };
  return { label: `còn ${days} ngày`, level: days <= 3 ? "warn" : "ok" };
}

export const AREA_LABEL: Record<string, string> = { work: "việc", teach: "dạy", study: "học", growth: "bản thân" };

// Khóa ngày YYYY-MM-DD theo Asia/HCM (cho habit streak / rest).
export function dateKey(ms: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(ms);
}
