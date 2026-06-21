"use client";
import { useEffect, useState } from "react";
import { Play, Check, X } from "lucide-react";

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
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <>
      <button className="btn primary block mt-4" onClick={() => { setSec(1500); setOn(true); }}>
        <Play strokeWidth={2} /> Vào Focus — làm 1 việc
      </button>
      {on && (
        <div className="focus-overlay">
          <div className="lab">Đang tập trung · 1 việc</div>
          <div className="ft">{title}</div>
          <div className="tm">{fmt(sec)}</div>
          <div className="fa">
            <button className="btn amber" onClick={() => setOn(false)}><Check strokeWidth={2} /> Xong</button>
            <button className="btn ghost" onClick={() => setOn(false)}><X strokeWidth={2} /> Thoát</button>
          </div>
        </div>
      )}
    </>
  );
}
