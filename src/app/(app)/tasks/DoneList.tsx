"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

import type { Task } from "@/db/schema";
import { setTaskStatus } from "@/app/actions/tasks";
import { areaBadge, areaTitle } from "@/lib/areas";
import { fmtDate } from "@/lib/format";
import { toast } from "@/components/Toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Tab Đã xong của Việc (SPEC-UI-P2.2 F06): 50 việc xong gần nhất + Hoàn tác về "Cần làm".
export function DoneList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const undo = (t: Task) =>
    start(async () => {
      try {
        const r = await setTaskStatus(t.id, "todo");
        if (!r.ok) return toast("Chưa hoàn tác được, thử lại nhé", true);
        toast(`Đã đưa "${t.title}" về Cần làm`);
        router.refresh();
      } catch {
        toast("Chưa hoàn tác được — kiểm tra kết nối rồi thử lại", true);
      }
    });

  if (tasks.length === 0) {
    return <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-[13px]">Chưa có việc nào xong. Xong việc đầu tiên rồi quay lại đây nhé.</p>;
  }

  return (
    <ul className="bg-card max-w-[760px] overflow-hidden rounded-lg border">
      {tasks.map((t) => (
        <li key={t.id} className="flex min-h-14 items-center gap-3 border-b px-4 py-2 last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-muted-foreground truncate text-sm line-through decoration-1">{t.title}</span>
            <div className="flex items-center gap-2">
              <Badge variant={areaBadge(t.area)}>{areaTitle(t.area)}</Badge>
              {t.doneAt && <span className="text-muted-foreground font-mono text-xs">xong {fmtDate(t.doneAt)}</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={() => undo(t)} disabled={pending} aria-label={`Hoàn tác: ${t.title}`}>
            <Undo2 aria-hidden="true" />
            Hoàn tác
          </Button>
        </li>
      ))}
    </ul>
  );
}
