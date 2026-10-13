// Giao diện Sáng / Tối / Theo máy (SPEC-UI-P2.5 F06). Lựa chọn lưu ở localStorage `jl-theme` trên máy này;
// <html> mang `data-theme` + class `.dark` (shadcn). Bộ nhớ bị chặn thì vẫn đổi màu được, chỉ không nhớ.

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "jl-theme";
export const THEME_EVENT = "jl-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export const isThemePref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

let memoryPref: ThemePref | null = null; // dự phòng khi localStorage bị chặn

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemePref(v) ? v : (memoryPref ?? "light");
  } catch {
    return memoryPref ?? "light";
  }
}

export function applyThemePref(pref: ThemePref) {
  const systemDark = typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
  const t = resolveTheme(pref, systemDark);
  const d = document.documentElement;
  d.setAttribute("data-theme", t);
  d.classList.toggle("dark", t === "dark");
  memoryPref = pref;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* bỏ qua — chỉ không nhớ được */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

// Chạy trước khi vẽ trang (layout) để không nháy màu sai. Khi lựa chọn là "Theo máy",
// hệ điều hành đổi sáng/tối lúc đang mở app thì áp lại ngay.
export const THEME_SCRIPT = `(function(){var d=document.documentElement;function pref(){try{var v=localStorage.getItem('${THEME_KEY}');return v==='dark'||v==='system'?v:'light';}catch(e){return 'light';}}function apply(){var p=pref(),m=window.matchMedia?window.matchMedia('${DARK_QUERY}'):null;var t=p==='system'?(m&&m.matches?'dark':'light'):p;d.setAttribute('data-theme',t);d.classList.toggle('dark',t==='dark');}try{apply();var m=window.matchMedia&&window.matchMedia('${DARK_QUERY}');if(m&&m.addEventListener)m.addEventListener('change',function(){if(pref()==='system')apply();});}catch(e){d.setAttribute('data-theme','light');}})();`;
