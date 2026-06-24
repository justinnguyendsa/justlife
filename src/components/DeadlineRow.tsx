import React from "react";
import Link from "next/link";
import type { DeadlineEntry } from "@/db/deadlines";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";

// Tính escalation level theo dueAt + now (T22).
function getEscalationLevel(dueAt: number, now: number): 1 | 2 | 3 {
  if (dueAt < now) return 3;               // quá hạn
  const diff = dueAt - now;
  if (diff <= 86_400_000) return 2;        // <= 1 ngày (khẩn)
  return 1;                                // còn thời gian (cảnh báo)
}

const ESCALATION_STYLE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { background: "var(--accent)", color: "white" },
  2: { background: "orange", color: "white" },
  3: { background: "var(--danger)", color: "white" },
};

const ESCALATION_LABEL: Record<1 | 2 | 3, string> = {
  1: "Cảnh báo",
  2: "Khẩn",
  3: "Quá hạn",
};

// Hàng deadline thống nhất (Việc + Học). Bấm → tới nguồn (/tasks hoặc /study/[id]).
export function DeadlineRow({ e, now }: { e: DeadlineEntry; now?: number }) {
  const dl = countdown(e.dueAt, now);
  const currentNow = now ?? Date.now();
  const level = getEscalationLevel(e.dueAt, currentNow);
  return (
    <Link href={e.href} className="card task">
      <span className="bar" style={{ background: AREA_VAR[e.area] }} />
      <div className="b">
        <div className="t">{e.title}</div>
        <div className="meta">
          <span className={`chip ${e.area}`}>{e.source === "study" ? "học" : AREA_LABEL[e.area]}</span>
          {/* T22 — escalation badge theo level tính từ dueAt */}
          <span className="chip" style={ESCALATION_STYLE[level]}>
            {ESCALATION_LABEL[level]}
          </span>
          <span className={"chip dl" + (dl.level === "over" ? " over" : "")}>{dl.label}</span>
          {e.source === "study" && <span className="chip st">{e.sub}</span>}
        </div>
      </div>
    </Link>
  );
}
