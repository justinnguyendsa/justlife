"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Play, X } from "lucide-react";

import type { Task } from "@/db/schema";
import { deleteTask, setTaskStatus, updateTask } from "@/app/actions/tasks";
import { calcPriorityScore } from "@/lib/priority";
import { AREAS } from "@/lib/areas";
import { dateKey } from "@/lib/format";
import { endOfVnDate } from "@/lib/scheduler";
import { toast } from "@/components/Toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/Segmented";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type Patch = Parameters<typeof updateTask>[1];

const LEVELS = [1, 2, 3, 4, 5];
// "YYYY-MM-DD" → 23:59:59 giờ Việt Nam (hạn chót "hết ngày").

// Chi tiết việc, tự lưu (SPEC-UI-P2.2 F04): ô chữ lưu khi rời ô, lựa chọn lưu ngay.
// Dùng chung cho cột phải (web) và sheet (điện thoại). Cha đặt key={task.id} để reset khi đổi việc.
// `onClose`: đóng chi tiết (cả sau khi xoá). `showClose`: hiện nút X (sheet đã có nút đóng riêng).
export function TaskDetail({ task, onClose, showClose = true, headingId }: { task: Task; onClose?: () => void; showClose?: boolean; headingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<SaveState>("idle");
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note ?? "");
  const [area, setArea] = useState(task.area);
  const [effort, setEffort] = useState<number | null>(task.effort);
  const [impact, setImpact] = useState<number | null>(task.impact);
  // Xếp hàng các lần lưu: tránh 2 lần lưu chạy song song làm điểm ưu tiên tính trên dữ liệu cũ.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [due, setDue] = useState(task.deadlineAt ? dateKey(task.deadlineAt) : "");

  const deadlineAt = due ? endOfVnDate(due) : null;
  const score = calcPriorityScore({ effort, impact, deadlineAt });

  const save = (patch: Patch) => {
    setState("saving");
    const run = async () => {
      try {
        const r = await updateTask(task.id, patch);
        if (!r.ok) {
          setState("error");
          toast("error" in r && r.error ? r.error : "Chưa lưu được, thử lại nhé", true);
          return;
        }
        setState("saved");
        router.refresh();
      } catch {
        setState("error");
        toast("Chưa lưu được — kiểm tra kết nối rồi thử lại", true);
      }
    };
    queue.current = queue.current.then(run);
  };

  const saveTitle = () => {
    const v = title.trim();
    if (v === task.title) return;
    if (!v) {
      setTitle(task.title);
      return toast("Tên việc không được để trống", true);
    }
    save({ title: v });
  };

  const begin = () =>
    start(async () => {
      try {
        if (task.status !== "doing") {
          const r = await setTaskStatus(task.id, "doing");
          if (!r.ok) {
            return toast("wip_exceeded" in r && r.wip_exceeded ? `Đã đủ ${r.limit} việc đang làm — tạm dừng một việc trước` : "Chưa bắt đầu được, thử lại nhé", true);
          }
        }
        router.push("/focus");
      } catch {
        toast("Chưa bắt đầu được — kiểm tra kết nối rồi thử lại", true);
      }
    });

  const remove = () => {
    if (!confirm(`Xoá việc "${task.title}"? Không hoàn tác được.`)) return;
    start(async () => {
      try {
        const r = await deleteTask(task.id);
        if (r && "ok" in r && !r.ok) return toast("error" in r && r.error ? r.error : "Chưa xoá được, thử lại nhé", true);
        toast("Đã xoá việc");
        onClose?.();
        router.refresh();
      } catch {
        toast("Chưa xoá được — thử lại nhé", true);
      }
    });
  };

  const stateLabel = { idle: "", saving: "Đang lưu…", saved: "Đã lưu", error: "Chưa lưu được" }[state];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-muted-foreground text-xs font-semibold">
          Chi tiết
          {stateLabel && (
            <span aria-live="polite" className={cn("font-medium", state === "error" ? "text-destructive-soft-foreground" : state === "saved" ? "text-success-soft-foreground" : "")}>
              {" · "}{stateLabel}
            </span>
          )}
        </h2>
        {onClose && showClose && (
          <Button variant="ghost" size="icon" className="size-11 md:size-10" aria-label="Đóng chi tiết" onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`td-title-${task.id}`}>Tên việc</Label>
        <Input
          id={`td-title-${task.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          maxLength={500}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Mảng</legend>
        <Segmented
          options={AREAS.map((a) => ({ value: a.key, label: a.label }))}
          value={area}
          onChange={(v) => { setArea(v); save({ area: v }); }}
          ariaLabel="Mảng"
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Công sức</legend>
          <Segmented options={LEVELS.map((n) => ({ value: String(n), label: String(n) }))} value={effort == null ? "" : String(effort)} onChange={(v) => { setEffort(+v); save({ effort: +v }); }} ariaLabel="Công sức" />
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Tác động</legend>
          <Segmented options={LEVELS.map((n) => ({ value: String(n), label: String(n) }))} value={impact == null ? "" : String(impact)} onChange={(v) => { setImpact(+v); save({ impact: +v }); }} ariaLabel="Tác động" />
        </fieldset>
      </div>

      <div className="bg-card flex items-center justify-between rounded-lg border px-4 py-3">
        <span className="flex flex-col">
          <span className="text-[13px]">Điểm ưu tiên</span>
          {score == null && <span className="text-muted-foreground text-xs">Chọn cả Công sức và Tác động để tính điểm</span>}
        </span>
        <span className="text-primary font-mono text-[15px] font-bold">{score ?? "—"}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`td-due-${task.id}`}>Hạn</Label>
        <Input
          id={`td-due-${task.id}`}
          type="date"
          className="font-mono"
          value={due}
          onChange={(e) => {
            const v = e.target.value;
            setDue(v);
            // Chỉ lưu khi xoá hạn hoặc ngày đã đủ (năm ≥ 2000) — tránh lưu lúc đang gõ dở năm.
            if (v === "") save({ deadlineAt: null });
            else if (/^\d{4}-\d{2}-\d{2}$/.test(v) && +v.slice(0, 4) >= 2000) save({ deadlineAt: endOfVnDate(v) });
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`td-note-${task.id}`}>Ghi chú</Label>
        <Textarea
          id={`td-note-${task.id}`}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note.trim() !== (task.note ?? "")) save({ note: note.trim() }); }}
          placeholder="Ghi chú (không bắt buộc)"
        />
      </div>

      <div className="flex gap-2">
        <Button className="h-11 flex-1 md:h-10" onClick={begin} disabled={pending}>
          <Play className="fill-current" aria-hidden="true" />
          {task.status === "doing" ? "Tiếp tục tập trung" : "Bắt đầu"}
        </Button>
        <Link href="/calendar" className={cn(buttonVariants({ variant: "outline" }), "h-11 flex-1 md:h-10")}>
          <CalendarPlus aria-hidden="true" />Xếp vào lịch
        </Link>
      </div>
      <Button variant="destructive-ghost" className="h-11 self-start px-2 md:h-10" onClick={remove} disabled={pending}>
        Xoá việc
      </Button>
    </div>
  );
}
