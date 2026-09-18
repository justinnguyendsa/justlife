"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";

// Toggle light/dark — đặt data-theme + class .dark trên <html> (shadcn dùng .dark),
// lưu localStorage. Mặc định light (xem script no-flash ở layout).
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const cur =
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(cur);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("jl-theme", next);
    } catch {}
  }

  return (
    <Button variant="outline" onClick={toggle} aria-label="Đổi giao diện sáng/tối">
      {theme === "dark" ? <Sun strokeWidth={1.9} /> : <Moon strokeWidth={1.9} />}
      {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
    </Button>
  );
}
