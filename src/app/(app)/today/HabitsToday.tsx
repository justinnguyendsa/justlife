"use client";
import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";

import { toggleHabitToday } from "@/app/actions/habits";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";

export type HabitToday = { id: string; name: string; streak: number; doneToday: boolean };

// Thói quen hôm nay (SPEC-UI-P2.1 T04): tick 1 chạm, phản hồi ngay (optimistic), lỗi thì hoàn lại.
// variant "list" cho cột phải web, "chips" cho điện thoại.
export function HabitsToday({ habits, variant }: { habits: HabitToday[]; variant: "list" | "chips" }) {
  const [pending, start] = useTransition();
  const [items, flip] = useOptimistic(habits, (state, id: string) =>
    state.map((h) => (h.id === id ? { ...h, doneToday: !h.doneToday, streak: h.streak + (h.doneToday ? -1 : 1) } : h)),
  );

  const toggle = (h: HabitToday) => {
    if (pending) return;
    start(async () => {
      flip(h.id);
      try {
        await toggleHabitToday(h.id);
      } catch {
        toast("Chưa lưu được thói quen, thử lại nhé", true);
      }
    });
  };

  if (habits.length === 0) {
    return <p className="text-muted-foreground text-[13px]">Chưa có thói quen nào. Thêm ở Cuộc sống → Thói quen.</p>;
  }

  if (variant === "chips") {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-pressed={h.doneToday}
            onClick={() => toggle(h)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold transition-colors",
              h.doneToday ? "bg-success-soft text-success-soft-foreground border-transparent" : "bg-card text-foreground",
            )}
          >
            {h.doneToday && <Check className="size-4" aria-hidden="true" />}
            {h.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((h) => (
        <li key={h.id} className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={h.doneToday}
            aria-label={`${h.doneToday ? "Bỏ đánh dấu" : "Đánh dấu"} ${h.name} hôm nay`}
            onClick={() => toggle(h)}
            className="grid size-11 shrink-0 place-items-center"
          >
            <span
              className={cn(
                "grid size-[22px] place-items-center rounded-full border-2 transition-colors",
                h.doneToday ? "bg-success border-success text-success-foreground" : "border-input",
              )}
            >
              {h.doneToday && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
            </span>
          </button>
          <span className="flex-1 text-[13px] leading-[18px] font-medium">{h.name}</span>
          <span className="text-muted-foreground font-mono text-xs">{h.streak} ngày</span>
        </li>
      ))}
    </ul>
  );
}
