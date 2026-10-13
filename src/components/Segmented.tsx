"use client";
import { cn } from "@/lib/utils";

// Nhóm nút chọn 1 (role radio) — dùng cho mảng, công sức, tác động.
// `value` rỗng = chưa chọn mục nào (vd. công sức chưa đặt).
export function Segmented({ options, value, onChange, ariaLabel }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="bg-muted grid auto-cols-fr grid-flow-col gap-0.5 rounded-[10px] p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { if (!on) onChange(o.value); }}
            className={cn(
              "min-h-11 rounded-md px-1 text-[13px] font-semibold transition-colors md:min-h-[34px]",
              on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
