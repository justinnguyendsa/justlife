import React from "react";
import Link from "next/link";
import type { DeadlineEntry } from "@/db/deadlines";
import { AREA_VAR, AREA_LABEL } from "@/lib/areas";
import { countdown } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AreaVariant = "work" | "teach" | "study" | "growth";

// Tính escalation level theo dueAt + now (T22).
function getEscalationLevel(dueAt: number, now: number): 1 | 2 | 3 {
  if (dueAt < now) return 3; // quá hạn
  const diff = dueAt - now;
  if (diff <= 86_400_000) return 2; // <= 1 ngày (khẩn)
  return 1; // còn thời gian (cảnh báo)
}

// Dùng variant của Badge thay vì style inline — trước đây level 2 hardcode "orange"
// và level 1 dùng var(--accent) + chữ trắng (sau khi đổi design system thì mất chữ).
const ESCALATION_VARIANT: Record<1 | 2 | 3, "warning" | "destructive"> = {
  1: "warning",
  2: "warning",
  3: "destructive",
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
    <Link href={e.href} className="block">
      <Card className="mb-2 flex-row items-start gap-3 rounded-xl border p-3 py-3 shadow-none transition-colors hover:border-ring">
        <span
          aria-hidden
          className="w-1 shrink-0 self-stretch rounded-sm"
          style={{ background: AREA_VAR[e.area] }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-tight font-semibold">{e.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={e.area as AreaVariant}>
              {e.source === "study" ? "học" : AREA_LABEL[e.area]}
            </Badge>
            {/* T22 — escalation badge theo level tính từ dueAt */}
            <Badge variant={ESCALATION_VARIANT[level]}>{ESCALATION_LABEL[level]}</Badge>
            <Badge
              variant={dl.level === "over" ? "destructive" : "warning"}
              className="font-mono"
            >
              {dl.label}
            </Badge>
            {e.source === "study" && <Badge variant="outline">{e.sub}</Badge>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
