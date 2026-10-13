"use client";
import { useSyncExternalStore } from "react";

// true khi media query khớp (SPEC-UI-P2.2 F09). Server render trả false (coi như điện thoại),
// trình duyệt cập nhật ngay sau khi hydrate.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP_QUERY = "(min-width: 768px)";
