"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/db/schema";
import { setTaskStatus } from "@/app/actions/tasks";
import { countdown, fmtDate } from "@/lib/format";
import { calcPriorityScore } from "@/lib/priority";

const AREA_LABEL: Record<string, string> = {
  work: "Việc",
  teach: "Dạy",
  study: "Học",
  growth: "Bản thân",
};

export function FocusClient({ doing }: { doing: Task[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [index, setIndex] = useState(0);

  const task = doing[index] ?? null;

  function advance() {
    // Chuyển sang task tiếp theo (vòng lại đầu nếu hết)
    if (doing.length <= 1) {
      router.refresh();
    } else {
      setIndex((i) => {
        const next = i < doing.length - 1 ? i + 1 : 0;
        return next;
      });
      router.refresh();
    }
  }

  function handleDone() {
    if (!task) return;
    start(async () => {
      await setTaskStatus(task.id, "done");
      advance();
    });
  }

  function handleDefer() {
    if (!task) return;
    start(async () => {
      await setTaskStatus(task.id, "todo");
      advance();
    });
  }

  // Empty state
  if (!task) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          gap: 20,
          padding: "var(--space-4)",
        }}
      >
        <div style={{ fontSize: 56 }}>🎉</div>
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            textAlign: "center",
            fontFamily: "var(--font-heading)",
          }}
        >
          Không còn việc cần làm — nghỉ ngơi xứng đáng!
        </p>
        <a
          href="/tasks"
          className="btn line"
          style={{ minHeight: 44, padding: "0 24px", fontSize: 15 }}
        >
          Bắt đầu vào một việc
        </a>
      </div>
    );
  }

  // Countdown + priority
  const countdownInfo = task.deadlineAt ? countdown(task.deadlineAt) : null;
  const score =
    task.priorityScore ??
    calcPriorityScore({ effort: task.effort, impact: task.impact, deadlineAt: task.deadlineAt });

  const levelColor: Record<string, string> = {
    ok: "var(--brand)",
    warn: "#f59e0b",
    over: "var(--danger)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* Counter badge */}
      {doing.length > 1 && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Đang làm{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {index + 1} / {doing.length}
          </strong>
        </p>
      )}

      {/* Task card */}
      <div
        className="card"
        style={{
          padding: 32,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Area badge + deadline */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className={`chip ${task.area}`} style={{ fontSize: 12 }}>
            {AREA_LABEL[task.area] ?? task.area}
          </span>
          {countdownInfo && (
            <span
              className="chip"
              style={{
                fontSize: 12,
                background: "transparent",
                border: `1px solid ${levelColor[countdownInfo.level]}`,
                color: levelColor[countdownInfo.level],
              }}
            >
              ⏰ {countdownInfo.label}
            </span>
          )}
          {task.deadlineAt && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Hạn: {fmtDate(task.deadlineAt)}
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            fontFamily: "var(--font-heading)",
          }}
        >
          {task.title}
        </h2>

        {/* Note preview */}
        {task.note && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              borderLeft: "3px solid var(--border)",
              paddingLeft: 12,
            }}
          >
            {task.note}
          </p>
        )}

        {/* Priority score */}
        {score != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 4,
              borderTop: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Điểm ưu tiên</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: score >= 70 ? "var(--danger)" : score >= 50 ? "#f59e0b" : "var(--brand)",
              }}
            >
              {score}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          className="btn primary"
          id="focus-done-btn"
          disabled={pending}
          onClick={handleDone}
          style={{
            minHeight: 48,
            width: "100%",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {pending ? "Đang lưu..." : "✅ Xong"}
        </button>
        <button
          className="btn line"
          id="focus-defer-btn"
          disabled={pending}
          onClick={handleDefer}
          style={{
            minHeight: 48,
            width: "100%",
            fontSize: 15,
          }}
        >
          ⏭ Không làm lúc này
        </button>
      </div>
    </div>
  );
}
