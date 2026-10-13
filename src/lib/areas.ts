export { AREA_LABEL } from "./format";

// CSS var theo mảng — dùng cho thanh màu/khối. KHÔNG hardcode hex (R-JL-NO-HARDCODE).
export const AREA_VAR: Record<string, string> = {
  work: "var(--module-work)",
  teach: "var(--module-teach)",
  study: "var(--module-study)",
  growth: "var(--module-growth)",
};

export const AREAS: { key: string; label: string }[] = [
  { key: "work", label: "Việc" },
  { key: "teach", label: "Dạy" },
  { key: "study", label: "Học" },
  { key: "growth", label: "Bản thân" },
];

// Class Tailwind theo mảng (chuỗi tĩnh để Tailwind quét được) — dùng token Lam & Nắng.
type AreaKey = "work" | "teach" | "study" | "growth";
const pick = <T,>(map: Record<AreaKey, T>, area: string): T => map[(area in map ? area : "work") as AreaKey];

const BAR: Record<AreaKey, string> = { work: "bg-area-work", teach: "bg-area-teach", study: "bg-area-study", growth: "bg-area-growth" };
// Khối việc đã xếp: nền đặc + chữ -on (đạt ≥ 4.5:1).
const SOLID: Record<AreaKey, string> = {
  work: "bg-area-work text-area-work-on",
  teach: "bg-area-teach text-area-teach-on",
  study: "bg-area-study text-area-study-on",
  growth: "bg-area-growth text-area-growth-on",
};
// Khối cố định (giờ bận): nền nhạt + chữ -foreground, để phân biệt với việc đã xếp.
const SOFT: Record<AreaKey, string> = {
  work: "bg-area-work-soft text-area-work-foreground",
  teach: "bg-area-teach-soft text-area-teach-foreground",
  study: "bg-area-study-soft text-area-study-foreground",
  growth: "bg-area-growth-soft text-area-growth-foreground",
};

export const areaBarClass = (area: string) => pick(BAR, area);
export const areaSolidClass = (area: string) => pick(SOLID, area);
export const areaSoftClass = (area: string) => pick(SOFT, area);
export const areaBadge = (area: string): AreaKey => (["work", "teach", "study", "growth"].includes(area) ? (area as AreaKey) : "work");

// Nhãn mảng viết hoa chữ đầu cho chip ("Việc", "Dạy", "Học", "Bản thân").
const AREA_TITLE: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.key, a.label]));
export const areaTitle = (area: string) => AREA_TITLE[area] ?? area;
