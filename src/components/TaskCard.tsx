import type { Task } from "@/db/schema";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";

// Presentational (server). Hiển thị 1 việc. Mọi màu lấy từ token theo mảng.
export function TaskCard({ task, trailingScore, now }: { task: Task; trailingScore?: boolean; now?: number }) {
  const dl = task.deadlineAt != null ? countdown(task.deadlineAt, now) : null;
  return (
    <div className="card task">
      <span className="bar" style={{ background: AREA_VAR[task.area] }} />
      <div className="b">
        <div className="t">{task.title}</div>
        <div className="meta">
          <span className={`chip ${task.area}`}>{AREA_LABEL[task.area]}</span>
          {task.status === "doing" && <span className="chip st doing">đang làm</span>}
          {dl && <span className={"chip dl" + (dl.level === "over" ? " over" : "")}>{dl.label}</span>}
          {!trailingScore && task.priorityScore != null && <span className="chip score">{task.priorityScore} điểm</span>}
          {task.priorityScore == null && task.status !== "done" && <span className="chip st">chưa ưu tiên</span>}
        </div>
      </div>
      {trailingScore && task.priorityScore != null && <span className="pscore">{task.priorityScore}</span>}
    </div>
  );
}
