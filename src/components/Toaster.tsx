"use client";
import { useEffect, useState } from "react";

export function toast(message: string, warn = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jl-toast", { detail: { message, warn } }));
}

export function Toaster() {
  const [t, setT] = useState<{ message: string; warn: boolean } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function on(e: Event) {
      const d = (e as CustomEvent).detail;
      setT(d);
      clearTimeout(timer);
      timer = setTimeout(() => setT(null), 2200);
    }
    window.addEventListener("jl-toast", on);
    return () => { window.removeEventListener("jl-toast", on); clearTimeout(timer); };
  }, []);
  return <div className={"toast" + (t ? " show" : "") + (t?.warn ? " warn" : "")}>{t?.message}</div>;
}
