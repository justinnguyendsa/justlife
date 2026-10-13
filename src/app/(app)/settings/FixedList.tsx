import type { FixedSchedule } from "@/db/schema";
import { areaBarClass } from "@/lib/areas";
import { weekdayRange } from "@/lib/fixed-schedule";
import { minToHHMM } from "@/lib/format";
import { WEEKDAYS } from "@/lib/scheduler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Danh sách khung giờ bận (SPEC-UI-P2.5 F03): vạch màu mảng · tên · giờ · 7 ô ngày · Sửa.
// Ô ngày bật dùng primary-soft (success để dành cho "đã xong").
export function FixedList({ fixed, onEdit }: { fixed: FixedSchedule[]; onEdit: (f: FixedSchedule) => void }) {
  if (fixed.length === 0) {
    return <p className="text-muted-foreground border-t pt-3 text-[13px]">Chưa có giờ bận nào. Thêm giờ làm, giờ dạy, giờ học để Lịch tự né.</p>;
  }
  return (
    <ul className="flex flex-col">
      {fixed.map((f) => (
        <li key={f.id} className="flex items-center gap-3 border-t py-2.5">
          <span className={cn("w-1 self-stretch rounded-full", areaBarClass(f.area))} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{f.label}</span>
              <span className="text-muted-foreground font-mono text-[13px]">{minToHHMM(f.startMin)} – {minToHHMM(f.endMin)}</span>
            </div>
            <DayPills mask={f.weekdayMask} />
          </div>
          <Button variant="ghost" size="sm" className="h-11 md:h-8" onClick={() => onEdit(f)} aria-label={`Sửa ${f.label}`}>Sửa</Button>
        </li>
      ))}
    </ul>
  );
}

function DayPills({ mask }: { mask: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Lặp lại: ${weekdayRange(mask)}`}>
      {WEEKDAYS.map((d, i) => (
        <span
          key={d}
          aria-hidden="true"
          className={cn(
            "grid size-7 place-items-center rounded-md border text-[11px] font-semibold md:size-[30px]",
            mask & (1 << i) ? "bg-primary-soft text-primary-soft-foreground border-transparent" : "bg-card text-muted-foreground",
          )}
        >
          {d}
        </span>
      ))}
    </span>
  );
}
