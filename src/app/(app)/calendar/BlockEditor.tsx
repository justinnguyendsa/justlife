"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import type { FixedSchedule, Task, TimeBlock } from "@/db/schema";
import { deleteTimeBlock, updateTimeBlock } from "@/app/actions/schedule";
import { setTaskStatus } from "@/app/actions/tasks";
import { detectConflicts, startOfDay } from "@/lib/scheduler";
import { areaBadge, areaTitle } from "@/lib/areas";
import { fmtTime, hhmmToMin } from "@/lib/format";
import { toast } from "@/components/Toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/Segmented";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { value: "30", label: "30 phút" },
  { value: "60", label: "1 giờ" },
  { value: "90", label: "1 giờ 30" },
  { value: "120", label: "2 giờ" },
];

// Bảng "Khối đang chọn" (SPEC-UI-P2.3 F04): đổi giờ, chọn nhanh thời lượng, kiểm trùng tại chỗ,
// Lưu · Đánh dấu xong (nếu gắn việc) · Xoá. Cha đặt key={block.id} để reset khi đổi khối.
export function BlockEditor({
  block,
  task,
  fixed,
  blocks,
  onClose,
  showClose = true,
}: {
  block: TimeBlock;
  task: Task | null;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  onClose: () => void;
  showClose?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [startHHMM, setStartHHMM] = useState(fmtTime(block.startAt));
  const [endHHMM, setEndHHMM] = useState(fmtTime(block.endAt));

  const day0 = startOfDay(block.startAt);
  const sMin = hhmmToMin(startHHMM);
  const eMin = hhmmToMin(endHHMM);
  const valid = Number.isFinite(sMin) && Number.isFinite(eMin) && eMin > sMin;
  const startAt = day0 + sMin * 60_000;
  const endAt = day0 + eMin * 60_000;
  const dur = valid ? String(eMin - sMin) : "";
  const changed = valid && (startAt !== block.startAt || endAt !== block.endAt);

  const conflicts = useMemo(
    () => (valid ? detectConflicts(startAt, endAt, fixed, blocks, block.id) : []),
    [valid, startAt, endAt, fixed, blocks, block.id],
  );

  const setDuration = (v: string) => {
    if (!Number.isFinite(sMin)) return;
    const e = Math.min(sMin + Number(v), 24 * 60 - 1);
    setEndHHMM(`${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`);
  };

  const save = () => {
    if (!valid) return toast("Giờ kết thúc phải sau giờ bắt đầu", true);
    start(async () => {
      try {
        const r = await updateTimeBlock(block.id, startAt, endAt);
        toast(r.conflicts.length ? `Đã lưu — trùng với ${r.conflicts[0].label}` : `Đã lưu ${fmtTime(startAt)}–${fmtTime(endAt)}`, r.conflicts.length > 0);
        router.refresh();
      } catch {
        toast("Chưa lưu được — kiểm tra kết nối rồi thử lại", true);
      }
    });
  };

  const markDone = () => {
    if (!task) return;
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
  };

  const remove = () => {
    if (!confirm(`Xoá khối "${block.title}" khỏi lịch? Việc gắn kèm (nếu có) vẫn còn.`)) return;
    start(async () => {
      try {
        await deleteTimeBlock(block.id);
        toast("Đã xoá khối");
        onClose();
        router.refresh();
      } catch {
        toast("Chưa xoá được — thử lại nhé", true);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold">Khối đang chọn</span>
        {showClose && (
          <Button variant="ghost" size="icon" className="size-11 md:size-10" aria-label="Đóng" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-[17px] leading-6 font-semibold">{block.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={areaBadge(block.area)}>{areaTitle(block.area)}</Badge>
          {task && <Badge variant="outline">gắn với việc “{task.title}”</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`be-s-${block.id}`}>Bắt đầu</Label>
          <Input id={`be-s-${block.id}`} type="time" step={900} className="h-11 font-mono md:h-9" value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`be-e-${block.id}`}>Kết thúc</Label>
          <Input id={`be-e-${block.id}`} type="time" step={900} className="h-11 font-mono md:h-9" value={endHHMM} onChange={(e) => setEndHHMM(e.target.value)} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Thời lượng nhanh</legend>
        <Segmented options={DURATIONS} value={DURATIONS.some((d) => d.value === dur) ? dur : ""} onChange={setDuration} ariaLabel="Thời lượng nhanh" />
      </fieldset>

      <div
        role="status"
        className={cn(
          "flex flex-col gap-0.5 rounded-lg px-4 py-3",
          !valid ? "bg-warning-soft text-warning-soft-foreground" : conflicts.length ? "bg-destructive-soft" : "bg-success-soft",
        )}
      >
        {!valid ? (
          <span className="text-xs font-semibold">Giờ kết thúc phải sau giờ bắt đầu</span>
        ) : conflicts.length ? (
          <>
            <span className="text-destructive-soft-foreground text-xs font-semibold">Trùng lịch</span>
            <span className="text-[13px]">
              {conflicts.map((c) => `${c.label} (${fmtTime(c.startAt)}–${fmtTime(c.endAt)})`).join(" · ")}
            </span>
          </>
        ) : (
          <>
            <span className="text-success-soft-foreground text-xs font-semibold">Không trùng lịch</span>
            <span className="text-[13px]">{fmtTime(startAt)}–{fmtTime(endAt)}</span>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {task && (
          <Button className="h-11 flex-1 md:h-10" onClick={markDone} disabled={pending}>
            <Check aria-hidden="true" />
            Đánh dấu xong
          </Button>
        )}
        <Button variant={task ? "outline" : "default"} className="h-11 flex-1 md:h-10" onClick={save} disabled={pending || !changed}>
          Lưu
        </Button>
      </div>
      <Button variant="destructive-ghost" className="h-11 self-start px-2 md:h-10" onClick={remove} disabled={pending}>
        Xoá khối
      </Button>
    </div>
  );
}
