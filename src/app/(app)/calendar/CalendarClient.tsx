"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { FixedSchedule, TimeBlock, Task } from "@/db/schema";
import { createTimeBlock } from "@/app/actions/schedule";
import { fixedToRange, maskHasDate, startOfDay, type Conflict } from "@/lib/scheduler";
import { freeSlots } from "@/lib/day-slots";
import { fmtDate, fmtDayShort, fmtDuration, fmtTime } from "@/lib/format";
import { AREAS } from "@/lib/areas";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { toast } from "@/components/Toaster";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { CalendarDragDrop } from "@/components/CalendarDragDrop";
import { CalendarWeekView, getWeekDays } from "@/components/CalendarWeekView";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { BlockEditor } from "./BlockEditor";

// ─── Helper: lấy thứ Hai đầu tuần chứa `ms` (local time) ───────────────────
export function getMonday(ms: number): number {
  const d = new Date(ms);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 86_400_000;
const DURATIONS = [
  { value: "30", label: "30 phút" },
  { value: "60", label: "1 giờ" },
  { value: "90", label: "1 giờ 30" },
  { value: "120", label: "2 giờ" },
];

// Màn Lịch (SPEC-UI-P2.3, canvas J03): thanh tiêu đề có điều hướng ngày/tuần; lưới ngày kéo-thả;
// cột phải (web) = Khối đang chọn + Khe trống; điện thoại = sheet sửa khối.
export function CalendarClient({
  day0: initialDay0,
  now,
  fixed,
  blocks,
  tasks,
  initialView,
}: {
  day0: number;
  now: number;
  fixed: FixedSchedule[];
  blocks: TimeBlock[];
  tasks: Task[];
  initialView: "day" | "week";
}) {
  const router = useRouter();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [pending, start] = useTransition();

  const [viewMode, setViewMode] = useState<"day" | "week">(initialView);
  const [day0, setDay0] = useState(initialDay0);
  const [weekStart, setWeekStart] = useState(() => getMonday(initialDay0));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? blocks.find((b) => b.id === selectedId) ?? null : null;
  const selectedTask = selected?.taskId ? tasks.find((t) => t.id === selected.taskId) ?? null : null;

  // ─── Điều hướng (ngày ↔ tuần) ─────────────────────────────────────────────
  const goDay = (d: number) => { setDay0(d); setViewMode("day"); setSelectedId(null); router.push(`/calendar?day=${d}`); };
  const goWeek = (ws: number) => { setWeekStart(ws); setViewMode("week"); setSelectedId(null); router.push(`/calendar?weekStart=${ws}`); };
  const prev = () => (viewMode === "day" ? goDay(day0 - DAY_MS) : goWeek(weekStart - 7 * DAY_MS));
  const next = () => (viewMode === "day" ? goDay(day0 + DAY_MS) : goWeek(weekStart + 7 * DAY_MS));
  const today = () => (viewMode === "day" ? goDay(startOfDay(Date.now())) : goWeek(getMonday(Date.now())));

  // ─── Khe trống của ngày đang xem ──────────────────────────────────────────
  const slots = useMemo(() => {
    const dayDate = new Date(day0);
    const busy = [
      ...fixed.filter((f) => maskHasDate(f.weekdayMask, dayDate)).map((f) => fixedToRange(f, day0)),
      ...blocks.filter((b) => b.startAt >= day0 && b.startAt < day0 + DAY_MS),
    ];
    return freeSlots(day0, busy, startOfDay(now) === day0 ? now : day0, { max: 4 });
  }, [day0, fixed, blocks, now]);

  // ─── Hộp "Thêm khối" ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [selTaskId, setSelTaskId] = useState("");
  const [freeTitle, setFreeTitle] = useState("");
  const [area, setArea] = useState("work");
  const [startHHMM, setStartHHMM] = useState("09:00");
  const [durMin, setDurMin] = useState("60");

  function openAdd(hhmm?: string) {
    setSelTaskId("");
    setFreeTitle("");
    setArea("work");
    setDurMin("60");
    if (hhmm) setStartHHMM(hhmm);
    setAddOpen(true);
  }

  function submitCreate() {
    const picked = selTaskId ? tasks.find((t) => t.id === selTaskId) ?? null : null;
    const title = picked ? picked.title : freeTitle.trim();
    if (!title) return toast("Chọn một việc hoặc nhập tiêu đề khối", true);
    const [hh, mm] = startHHMM.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return toast("Giờ bắt đầu không hợp lệ", true);
    const startAt = day0 + (hh * 60 + mm) * 60_000;
    const endAt = startAt + Number(durMin) * 60_000;
    start(async () => {
      try {
        const res = await createTimeBlock({ taskId: picked?.id ?? null, title, startAt, endAt, area: picked ? picked.area : area });
        setAddOpen(false);
        router.refresh();
        toast(res.conflicts.length ? `Đã xếp — trùng với ${res.conflicts[0].label}` : `Đã xếp ${title} · ${fmtTime(startAt)}–${fmtTime(endAt)}`, res.conflicts.length > 0);
      } catch {
        toast("Chưa xếp được — kiểm tra kết nối rồi thử lại", true);
      }
    });
  }

  function onBlockUpdated(conflicts: Conflict[]) {
    router.refresh();
    if (conflicts.length) toast(`Trùng lịch: ${conflicts[0].label}`, true);
  }

  const sub =
    viewMode === "day"
      ? fmtDayShort(day0)
      : (() => { const d = getWeekDays(weekStart); return `Tuần ${fmtDate(d[0])} – ${fmtDate(d[6])}`; })();

  const toolbar = (
    <>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" className="size-11 md:size-9" onClick={prev} aria-label={viewMode === "day" ? "Ngày trước" : "Tuần trước"}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={today}>Hôm nay</Button>
        <Button variant="outline" size="icon-sm" className="size-11 md:size-9" onClick={next} aria-label={viewMode === "day" ? "Ngày sau" : "Tuần sau"}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <div className="hidden w-[150px] md:block">
        <Segmented
          options={[{ value: "day", label: "Ngày" }, { value: "week", label: "Tuần" }]}
          value={viewMode}
          onChange={(v) => (v === "day" ? goDay(day0) : goWeek(getMonday(day0)))}
          ariaLabel="Kiểu xem"
        />
      </div>
      {viewMode === "day" && (
        <Button size="sm" className="hidden md:inline-flex" onClick={() => openAdd()}>
          <Plus aria-hidden="true" />
          Thêm khối
        </Button>
      )}
    </>
  );

  const editor = selected ? (
    <BlockEditor
      key={selected.id}
      block={selected}
      task={selectedTask}
      fixed={fixed}
      blocks={blocks}
      onClose={() => setSelectedId(null)}
      showClose={isDesktop}
    />
  ) : null;

  return (
    <>
      <PageHeader title="Lịch" sub={sub} action={toolbar} />

      {/* Điện thoại: công tắc Ngày/Tuần dưới tiêu đề */}
      <div className="mb-4 md:hidden">
        <Segmented
          options={[{ value: "day", label: "Ngày" }, { value: "week", label: "Tuần" }]}
          value={viewMode}
          onChange={(v) => (v === "day" ? goDay(day0) : goWeek(getMonday(day0)))}
          ariaLabel="Kiểu xem"
        />
      </div>

      {viewMode === "day" ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:gap-7">
          <CalendarDragDrop
            day0={day0}
            now={now}
            fixed={fixed}
            blocks={blocks}
            selectedId={selectedId}
            onSelect={(b) => setSelectedId((cur) => (cur === b.id ? null : b.id))}
            onBlockUpdated={onBlockUpdated}
            onCreateRequest={(hhmm) => openAdd(hhmm)}
          />

          <aside className="hidden md:block" aria-label="Khối đang chọn và khe trống">
            <div className="bg-popover sticky top-[72px] flex max-h-[calc(100vh-88px)] flex-col gap-5 overflow-y-auto rounded-lg border p-5">
              {isDesktop && editor ? (
                editor
              ) : (
                <p className="text-muted-foreground text-[13px]">Bấm vào một việc đã xếp để đổi giờ, đánh dấu xong hoặc xoá. Kéo khối lên xuống để đổi giờ nhanh.</p>
              )}
              <FreeSlots slots={slots} onPick={(hhmm) => openAdd(hhmm)} />
            </div>
          </aside>

          {/* Điện thoại: khe trống dưới lưới */}
          <div className="md:hidden">
            <FreeSlots slots={slots} onPick={(hhmm) => openAdd(hhmm)} />
          </div>
        </div>
      ) : (
        <CalendarWeekView weekStart={weekStart} fixed={fixed} blocks={blocks} onDayClick={goDay} />
      )}

      {/* Điện thoại: thêm khối bằng nút nổi */}
      {viewMode === "day" && (
        <Button
          size="icon"
          aria-label="Thêm khối lịch"
          onClick={() => openAdd()}
          className="fixed right-[18px] bottom-[150px] z-25 size-[54px] rounded-[17px] shadow-lg md:hidden [&_svg:not([class*='size-'])]:size-6"
        >
          <CalendarClock strokeWidth={2} />
        </Button>
      )}

      {/* Điện thoại: sheet sửa khối */}
      <Sheet open={!isDesktop && selected != null} onOpenChange={(v) => { if (!v) setSelectedId(null); }}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[22px] px-5 pt-3 pb-6">
          <SheetTitle className="sr-only">Sửa khối lịch</SheetTitle>
          <SheetDescription className="sr-only">Đổi giờ, đánh dấu xong hoặc xoá khối.</SheetDescription>
          {!isDesktop && editor}
        </SheetContent>
      </Sheet>

      {/* Hộp Thêm khối */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm khối lịch</DialogTitle>
            <DialogDescription>{fmtDayShort(day0)} — chọn việc có sẵn hoặc đặt tên khối tự do.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-task">Việc (không bắt buộc)</Label>
              <select
                id="cal-task"
                value={selTaskId}
                onChange={(e) => setSelTaskId(e.target.value)}
                className="border-input bg-card h-11 rounded-md border px-3 text-sm md:h-10"
              >
                <option value="">— Không gắn việc, đặt tên tự do —</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            {!selTaskId && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cal-title">Tên khối</Label>
                  <Input id="cal-title" className="h-11 md:h-10" value={freeTitle} onChange={(e) => setFreeTitle(e.target.value)} placeholder="Ví dụ: Tập trung viết báo cáo" />
                </div>
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium">Mảng</legend>
                  <Segmented options={AREAS.map((a) => ({ value: a.key, label: a.label }))} value={area} onChange={setArea} ariaLabel="Mảng" />
                </fieldset>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-start">Giờ bắt đầu</Label>
              <Input id="cal-start" type="time" step={900} className="h-11 font-mono md:h-10" value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Thời lượng</legend>
              <Segmented options={DURATIONS} value={durMin} onChange={setDurMin} ariaLabel="Thời lượng" />
            </fieldset>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1 md:h-10" onClick={() => setAddOpen(false)} disabled={pending}>Huỷ</Button>
              <Button className="h-11 flex-1 md:h-10" onClick={submitCreate} disabled={pending}>{pending ? "Đang lưu…" : "Lưu khối"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FreeSlots({ slots, onPick }: { slots: { startAt: number; endAt: number }[]; onPick: (hhmm: string) => void }) {
  return (
    <section aria-labelledby="cal-free" className="flex flex-col gap-2">
      <h2 id="cal-free" className="text-[15px] font-semibold">Khe trống</h2>
      {slots.length ? (
        <ul className="flex flex-col gap-1.5">
          {slots.map((s) => (
            <li key={s.startAt}>
              <button
                type="button"
                onClick={() => onPick(fmtTime(s.startAt))}
                className="border-input text-muted-foreground hover:bg-accent hover:text-foreground flex min-h-11 w-full items-center justify-between rounded-md border border-dashed px-3 text-[13px] transition-colors md:min-h-9"
              >
                <span className="font-mono">{fmtTime(s.startAt)}–{fmtTime(s.endAt)}</span>
                <span>{fmtDuration(Math.round((s.endAt - s.startAt) / 60_000))} · xếp việc</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-[13px]">Không còn khe trống từ 1 giờ trở lên.</p>
      )}
    </section>
  );
}
