"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee } from "lucide-react";

import { addRest } from "@/app/actions/habits";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";

const GOAL_MIN = 60;

// Nghỉ ngơi hôm nay (SPEC-UI-P2.1 T05): tiến độ phút nghỉ / 60 + ghi nhanh 10 phút.
export function RestToday({ todayMin }: { todayMin: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pct = Math.min(100, Math.round((todayMin / GOAL_MIN) * 100));

  const rest10 = () =>
    start(async () => {
      await addRest({ minutes: 10 });
      toast("Đã ghi 10 phút nghỉ");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div
        role="progressbar"
        aria-label="Phút nghỉ hôm nay"
        aria-valuemin={0}
        aria-valuemax={GOAL_MIN}
        aria-valuenow={Math.min(todayMin, GOAL_MIN)}
        className="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div className="bg-primary h-full rounded-full transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <Button variant="outline" className="w-full" onClick={rest10} disabled={pending}>
        <Coffee aria-hidden="true" />
        Nghỉ 10 phút
      </Button>
    </div>
  );
}
