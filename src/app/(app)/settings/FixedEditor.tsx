"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import type { FixedSchedule } from "@/db/schema";
import { addFixedSchedule, deleteFixedSchedule, updateFixedSchedule } from "@/app/actions/schedule";
import { AREAS } from "@/lib/areas";
import { FIXED_LABEL_MAX, validateFixed } from "@/lib/fixed-schedule";
import { hhmmToMin, minToHHMM } from "@/lib/format";
import { WEEKDAYS } from "@/lib/scheduler";
import { cn } from "@/lib/utils";
import { toast } from "@/components/Toaster";
import { Segmented } from "@/components/Segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Hộp thoại thêm / sửa khung giờ bận (SPEC-UI-P2.5 F04). `block = null` → thêm mới.
// Kiểm tra bằng cùng `validateFixed` với server để báo lỗi ngay tại chỗ.
export function FixedEditor({ open, block, onOpenChange }: { open: boolean; block: FixedSchedule | null; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(block?.label ?? "");
  const [area, setArea] = useState(block?.area ?? "work");
  const [startHHMM, setStartHHMM] = useState(minToHHMM(block?.startMin ?? 510));
  const [endHHMM, setEndHHMM] = useState(minToHHMM(block?.endMin ?? 1080));
  const [mask, setMask] = useState(block?.weekdayMask ?? 0b0011111);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (pending) return;
    const v = validateFixed({ label, area, startMin: hhmmToMin(startHHMM), endMin: hhmmToMin(endHHMM), weekdayMask: mask });
    if (!v.ok) return setError(v.error);
    setError(null);
    start(async () => {
      try {
        const r = block ? await updateFixedSchedule(block.id, v.value) : await addFixedSchedule(v.value);
        if (!r.ok) return setError(r.error ?? "Chưa lưu được, thử lại nhé");
        toast(block ? "Đã lưu khung giờ bận" : "Đã thêm khung giờ bận — Lịch sẽ né khung này");
        onOpenChange(false);
        router.refresh();
      } catch {
        setError("Chưa lưu được — kiểm tra kết nối rồi thử lại");
      }
    });
  };

  const remove = () => {
    if (!block || pending) return;
    start(async () => {
      try {
        const r = await deleteFixedSchedule(block.id);
        if (!r.ok) return setError("Chưa xoá được, thử lại nhé");
        toast(`Đã xoá khung "${block.label}"`);
        onOpenChange(false);
        router.refresh();
      } catch {
        setError("Chưa xoá được — kiểm tra kết nối rồi thử lại");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{block ? "Sửa khung giờ bận" : "Thêm khung giờ bận"}</DialogTitle>
          <DialogDescription>Lịch và gợi ý xếp việc sẽ né khung này.</DialogDescription>
        </DialogHeader>
        <form noValidate className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-label">Tên khung</Label>
            <Input id="fx-label" className="h-11 md:h-10" value={label} onChange={(e) => { setLabel(e.target.value); setError(null); }} placeholder="Ví dụ: Giờ làm việc" maxLength={FIXED_LABEL_MAX} />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Mảng</legend>
            <Segmented options={AREAS.map((a) => ({ value: a.key, label: a.label }))} value={area} onChange={(v) => { setArea(v); setError(null); }} ariaLabel="Mảng" />
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fx-start">Bắt đầu</Label>
              <Input id="fx-start" type="time" className="h-11 font-mono md:h-10" value={startHHMM} onChange={(e) => { setStartHHMM(e.target.value); setError(null); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fx-end">Kết thúc</Label>
              <Input id="fx-end" type="time" className="h-11 font-mono md:h-10" value={endHHMM} onChange={(e) => { setEndHHMM(e.target.value); setError(null); }} />
            </div>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Lặp lại</legend>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => {
                const on = (mask & (1 << i)) !== 0;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setMask((m) => m ^ (1 << i)); setError(null); }}
                    className={cn(
                      "h-11 rounded-md border text-[13px] font-semibold transition-colors md:h-9",
                      on ? "bg-primary-soft text-primary-soft-foreground border-transparent" : "bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-destructive text-[13px]">{error}</p>}
          <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
            {block && (
              <Button type="button" variant="destructive-ghost" className="h-11 md:mr-auto md:h-10" onClick={remove} disabled={pending}>
                <Trash2 aria-hidden="true" />
                Xoá khung
              </Button>
            )}
            <div className="flex flex-1 gap-2 md:flex-none">
              <Button type="button" variant="outline" className="h-11 flex-1 md:h-10" onClick={() => onOpenChange(false)} disabled={pending}>Huỷ</Button>
              <Button type="submit" className="h-11 flex-1 md:h-10" disabled={pending}>{pending ? "Đang lưu…" : "Lưu khung"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
