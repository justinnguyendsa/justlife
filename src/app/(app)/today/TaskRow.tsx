"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import type { Task } from "@/db/schema";
import { setTaskStatus } from "@/app/actions/tasks";
import { areaBadge, areaBarClass, areaTitle } from "@/lib/areas";
import { countdown } from "@/lib/format";
import { toast } from "@/components/Toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Hàng việc ưu tiên ở Hôm nay (SPEC-UI-P2.1 T03): ▶ bắt đầu tập trung, ✓ đánh dấu xong.
export function TaskRow({ task, now, compact = false }: { task: Task; now: number; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dl = task.deadlineAt != null ? countdown(task.deadlineAt, now) : null;

  const markDone = () =>
    start(async () => {
      const r = await setTaskStatus(task.id, "done");
      if (!r.ok) return toast("Chưa lưu được, thử lại nhé", true);
      toast(`Đã xong: ${task.title}`);
      router.refresh();
    });

  const startFocus = () =>
    start(async () => {
      const r = await setTaskStatus(task.id, "doing");
      if (!r.ok && "wip_exceeded" in r && r.wip_exceeded) {
        return toast(`Đã đủ ${r.limit} việc đang làm — tạm dừng một việc trước`, true);
      }
      router.push("/focus");
    });

  return (
    <div
      className={cn(
        "bg-card flex items-center gap-3 rounded-lg border transition-colors",
        compact ? "py-2 pr-1 pl-2.5" : "py-2.5 pr-2 pl-3",
        pending && "opacity-60",
      )}
    >
      <span aria-hidden="true" className={cn("w-1 shrink-0 self-stretch rounded-sm", areaBarClass(task.area))} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={cn("font-semibold", compact ? "text-sm leading-5" : "text-[15px] leading-[22px]")}>{task.title}</span>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={areaBadge(task.area)}>{areaTitle(task.area)}</Badge>
          {dl && (
            <Badge variant={dl.level === "over" ? "danger" : dl.level === "warn" ? "warn" : "outline"} className="font-mono">
              {dl.label}
            </Badge>
          )}
        </div>
      </div>
      {!compact && task.priorityScore != null && (
        <span className="text-primary w-8 text-right font-mono text-[15px] font-bold" title="Điểm ưu tiên">
          {task.priorityScore}
        </span>
      )}
      {!compact && (
        <Button variant="ghost" size="icon" aria-label={`Bắt đầu tập trung: ${task.title}`} onClick={startFocus} disabled={pending}>
          <Play className="fill-current" aria-hidden="true" />
        </Button>
      )}
      <button
        type="button"
        onClick={markDone}
        disabled={pending}
        aria-label={`Đánh dấu xong: ${task.title}`}
        className="grid size-11 shrink-0 place-items-center rounded-full disabled:cursor-wait"
      >
        <span className="border-input hover:border-success size-[22px] rounded-full border-2 transition-colors" />
      </button>
    </div>
  );
}
