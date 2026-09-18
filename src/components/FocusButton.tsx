"use client";
import { useEffect, useState } from "react";
import { Play, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Focus mode: 1 việc duy nhất + đồng hồ Pomodoro 25'. Chống nhảy việc (P3 mental load).
export function FocusButton({ title }: { title?: string }) {
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(1500);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [on]);

  if (!title) return null;

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      <Button
        className="mt-4 w-full"
        onClick={() => {
          setSec(1500);
          setOn(true);
        }}
      >
        <Play strokeWidth={2} /> Vào Focus — làm 1 việc
      </Button>

      {on && (
        // Nền tối cố định ở CẢ hai theme: Focus là khoảnh khắc "tắt bớt thế giới".
        <div className="fixed inset-0 z-70 flex flex-col items-center justify-center gap-0 bg-[var(--focus-bg)] p-8 text-center text-white">
          <div className="font-mono text-[11px] tracking-[1px] text-[var(--focus-sub)] uppercase">
            Đang tập trung · 1 việc
          </div>
          <div className="my-4 max-w-[320px] text-[23px] font-extrabold">{title}</div>
          <div className="text-warning mt-1.5 mb-6 font-mono text-[44px] font-extrabold">
            {fmt(sec)}
          </div>
          <div className="flex gap-2">
            <Button variant="warning" onClick={() => setOn(false)}>
              <Check strokeWidth={2} /> Xong
            </Button>
            <Button variant="secondary" onClick={() => setOn(false)}>
              <X strokeWidth={2} /> Thoát
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
