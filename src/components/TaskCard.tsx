import type { Task } from "@/db/schema";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AreaVariant = "work" | "teach" | "study" | "growth";

// Presentational (server). Hiển thị 1 việc. Mọi màu lấy từ token theo mảng.
export function TaskCard({
  task,
  trailingScore,
  now,
}: {
  task: Task;
  trailingScore?: boolean;
  now?: number;
}) {
  const dl = task.deadlineAt != null ? countdown(task.deadlineAt, now) : null;

  return (
    <Card className="mb-2 flex-row items-start gap-3 rounded-xl border p-3 py-3 shadow-none transition-colors hover:border-ring">
      <span
        aria-hidden
        className="w-1 shrink-0 self-stretch rounded-sm"
        style={{ background: AREA_VAR[task.area] }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-tight font-semibold">{task.title}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={task.area as AreaVariant}>{AREA_LABEL[task.area]}</Badge>
          {task.status === "doing" && <Badge variant="secondary">đang làm</Badge>}
          {dl && (
            <Badge variant={dl.level === "over" ? "destructive" : "warning"} className="font-mono">
              {dl.label}
            </Badge>
          )}
          {!trailingScore && task.priorityScore != null && (
            <Badge variant="outline" className="font-mono">
              {task.priorityScore} điểm
            </Badge>
          )}
          {task.priorityScore == null && task.status !== "done" && (
            <Badge variant="outline">chưa ưu tiên</Badge>
          )}
        </div>
      </div>
      {trailingScore && task.priorityScore != null && (
        <span className={cn("text-primary self-center pl-1.5 font-mono text-[15px] font-extrabold")}>
          {task.priorityScore}
        </span>
      )}
    </Card>
  );
}
