import Link from "next/link";
import type { DeadlineEntry } from "@/db/deadlines";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";

// Hàng deadline thống nhất (Việc + Học). Bấm → tới nguồn (/tasks hoặc /study/[id]).
export function DeadlineRow({ e, now }: { e: DeadlineEntry; now?: number }) {
  const dl = countdown(e.dueAt, now);
  return (
    <Link href={e.href} className="card task">
      <span className="bar" style={{ background: AREA_VAR[e.area] }} />
      <div className="b">
        <div className="t">{e.title}</div>
        <div className="meta">
          <span className={`chip ${e.area}`}>{e.source === "study" ? "học" : AREA_LABEL[e.area]}</span>
          <span className={"chip dl" + (dl.level === "over" ? " over" : "")}>{dl.label}</span>
          {e.source === "study" && <span className="chip st">{e.sub}</span>}
        </div>
      </div>
    </Link>
  );
}
