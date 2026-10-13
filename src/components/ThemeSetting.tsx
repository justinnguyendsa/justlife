"use client";
import { useSyncExternalStore } from "react";

import { THEME_EVENT, THEME_KEY, applyThemePref, isThemePref, readThemePref, repaintFromStorage } from "@/lib/theme";
import { Segmented } from "@/components/Segmented";

const OPTIONS = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo máy" },
];

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    repaintFromStorage();
    cb();
  };
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

// Chọn giao diện (SPEC-UI-P2.5 F06). Server chưa biết lựa chọn nên vẽ "Sáng" trước,
// rồi useSyncExternalStore đổi sang giá trị thật trên máy — không lệch hydrate.
export function ThemeSetting() {
  const pref = useSyncExternalStore(subscribe, readThemePref, () => "light" as const);
  return <Segmented options={OPTIONS} value={pref} onChange={(v) => isThemePref(v) && applyThemePref(v)} ariaLabel="Giao diện" />;
}
