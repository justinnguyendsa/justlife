"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Play } from "lucide-react";

import type { Task } from "@/db/schema";
import { setTaskStatus } from "@/app/actions/tasks";
import { countdown } from "@/lib/format";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";

// Thẻ "Đang làm" — điểm vàng duy nhất của Hôm nay (SPEC-UI-P2.1 T02).
// Có việc đang làm: Xong + Tiếp tục tập trung. Chưa có: gợi ý việc ưu tiên cao nhất + Bắt đầu tập trung.
export function NowCard({ task, doing, extra, now }: { task: Task | null; doing: boolean; extra: number; now: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!task) {
    return (
      <section aria-label="Đang làm" className="text-muted-foreground rounded-lg border border-dashed p-5 text-sm">
        Chưa có việc nào cần làm. Bấm <b className="text-foreground font-semibold">Thêm việc</b> (phím N trên máy tính) để ghi việc mới.
      </section>
    );
  }

  const dl = task.deadlineAt != null ? countdown(task.deadlineAt, now) : null;
  const meta = [dl?.label, doing && extra > 0 ? `và ${extra} việc khác đang làm` : null].filter(Boolean).join(" · ");

  const markDone = () =>
    start(async () => {
      try {
        const r = await setTaskStatus(task.id, "done");
        if (!r.ok) return toast("Chưa lưu được, thử lại nhé", true);
        toast(`Đã xong: ${task.title}`);
        router.refresh();
      } catch {
        toast("Chưa lưu được — kiểm tra kết nối rồi thử lại", true);
      }
    });

  const focus = () =>
    start(async () => {
      try {
        if (!doing) {
          const r = await setTaskStatus(task.id, "doing");
          if (!r.ok) return toast("wip_exceeded" in r && r.wip_exceeded ? `Đã đủ ${r.limit} việc đang làm — tạm dừng một việc trước` : "Chưa bắt đầu được, thử lại nhé", true);
        }
        router.push("/focus");
      } catch {
        toast("Chưa bắt đầu được — kiểm tra kết nối rồi thử lại", true);
      }
    });

  return (
    <section
      aria-label={doing ? "Đang làm" : "Nên làm tiếp"}
      className="bg-highlight-soft border-highlight flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-highlight-soft-foreground text-xs leading-4 font-semibold">{doing ? "Đang làm" : "Nên làm tiếp"}</span>
        <h2 className="text-[17px] leading-6 font-semibold">{task.title}</h2>
        {meta && <span className="text-[13px] leading-[18px]">{meta}</span>}
      </div>
      <div className="flex shrink-0 gap-2">
        {doing && (
          <Button variant="outline" onClick={markDone} disabled={pending} className="h-11 flex-1 md:h-10 md:flex-none">
            <Check aria-hidden="true" />
            Xong
          </Button>
        )}
        <Button variant="highlight" onClick={focus} disabled={pending} className="h-11 flex-1 md:h-10 md:flex-none">
          <Play className="fill-current" aria-hidden="true" />
          {doing ? "Tiếp tục tập trung" : "Bắt đầu tập trung"}
        </Button>
      </div>
    </section>
  );
}
