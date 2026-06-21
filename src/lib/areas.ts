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
