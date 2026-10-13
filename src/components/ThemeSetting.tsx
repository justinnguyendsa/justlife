"use client";
import { useSyncExternalStore } from "react";

import { THEME_EVENT, applyThemePref, isThemePref, readThemePref } from "@/lib/theme";
import { Segmented } from "@/components/Segmented";

const OPTIONS = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo máy" },
];

function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// Chọn giao diện (SPEC-UI-P2.5 F06). Server chưa biết lựa chọn nên vẽ "Sáng" trước,
// rồi useSyncExternalStore đổi sang giá trị thật trên máy — không lệch hydrate.
export function ThemeSetting() {
  const pref = useSyncExternalStore(subscribe, readThemePref, () => "light" as const);
  return <Segmented options={OPTIONS} value={pref} onChange={(v) => isThemePref(v) && applyThemePref(v)} ariaLabel="Giao diện" />;
}
