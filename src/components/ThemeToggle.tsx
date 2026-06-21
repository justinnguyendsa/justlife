"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Toggle light/dark — đặt data-theme trên <html> + lưu localStorage. Mặc định light (xem script no-flash ở layout).
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(cur);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("jl-theme", next); } catch {}
  }
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Đổi giao diện sáng/tối">
      {theme === "dark" ? <Sun strokeWidth={1.9} /> : <Moon strokeWidth={1.9} />}
      {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
    </button>
  );
}
