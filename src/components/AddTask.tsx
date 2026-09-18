"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { createTask } from "@/app/actions/tasks";
import { calcPriorityScore } from "@/lib/priority";
import { AREAS } from "@/lib/areas";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AREA_ACTIVE: Record<string, string> = {
  work: "border-area-work bg-area-work/12 text-area-work-foreground",
  teach: "border-area-teach bg-area-teach/12 text-area-teach-foreground",
  study: "border-area-study bg-area-study/12 text-area-study-foreground",
  growth: "border-area-growth bg-area-growth/18 text-area-growth-foreground",
};

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between py-1">
      <div className="text-[13px] font-semibold">{label}</div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-[30px]"
          aria-label={`Giảm ${label}`}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <Minus />
        </Button>
        <span className="min-w-[22px] text-center font-mono text-lg font-extrabold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-[30px]"
          aria-label={`Tăng ${label}`}
          onClick={() => onChange(Math.min(5, value + 1))}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

// Capture toàn cục: bắt việc nhanh từ mọi màn, đặt Effort/Impact/Deadline NGAY lúc tạo (điểm ưu tiên tự tính).
export function AddTask() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("work");
  const [deadline, setDeadline] = useState(""); // yyyy-mm-dd
  const [effort, setEffort] = useState(3);
  const [impact, setImpact] = useState(3);
  const [pending, start] = useTransition();
  const router = useRouter();

  const deadlineAt = deadline ? new Date(deadline + "T23:59:59").getTime() : null;
  const score = calcPriorityScore({ effort, impact, deadlineAt });

  function reset() {
    setTitle("");
    setArea("work");
    setDeadline("");
    setEffort(3);
    setImpact(3);
  }

  function save() {
    if (!title.trim()) {
      toast("Nhập tên việc đã nhé", true);
      return;
    }
    start(async () => {
      await createTask({ title: title.trim(), area, deadlineAt, effort, impact });
      setOpen(false);
      reset();
      router.refresh();
      toast(`Đã thêm vào Inbox · ưu tiên ${score ?? "—"}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          aria-label="Thêm việc"
          className="fixed right-[18px] bottom-[78px] z-25 size-[54px] rounded-[17px] shadow-lg md:bottom-7 [&_svg:not([class*='size-'])]:size-6"
        >
          <Plus strokeWidth={2.2} />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thêm việc nhanh</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-task-title">Việc cần làm</Label>
            <Input
              id="add-task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Chuẩn bị slide buổi 6..."
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Mảng</Label>
            <div className="flex gap-1.5">
              {AREAS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={area === a.key}
                  onClick={() => setArea(a.key)}
                  className={cn(
                    "flex-1 rounded-lg border-[1.5px] px-1 py-2 text-xs font-semibold transition-colors",
                    area === a.key
                      ? AREA_ACTIVE[a.key]
                      : "text-muted-foreground hover:bg-accent border-input"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-task-deadline">Deadline (không bắt buộc)</Label>
            <Input
              id="add-task-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-md px-3.5 py-3">
            <span className="text-sm">Điểm ưu tiên (tự tính)</span>
            <span className="text-warning font-mono text-2xl font-extrabold">{score ?? "—"}</span>
          </div>

          <div className="flex gap-2.5">
            <Stepper label="Effort" value={effort} onChange={setEffort} />
            <Stepper label="Impact" value={impact} onChange={setImpact} />
          </div>

          <Button className="w-full" disabled={pending} onClick={save}>
            {pending ? "Đang lưu..." : "Lưu vào Inbox"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
