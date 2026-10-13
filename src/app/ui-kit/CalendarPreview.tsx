"use client";
import type { FixedSchedule, TimeBlock } from "@/db/schema";
import { CalendarDragDrop } from "@/components/CalendarDragDrop";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { BlockEditor } from "@/app/(app)/calendar/BlockEditor";

// Xem trước Lịch P2.3 trong /ui-kit (dữ liệu mẫu, trang cha đặt inert nên không bấm được).
const H = 3_600_000;
export function CalendarPreview({ day0 }: { day0: number }) {
  const fixed: FixedSchedule[] = [
    { id: "f1", label: "Giờ làm việc (cố định)", area: "work", startMin: 8 * 60 + 30, endMin: 12 * 60, weekdayMask: 127, createdAt: day0 },
    { id: "f2", label: "Lớp Python cơ bản", area: "teach", startMin: 14 * 60, endMin: 15 * 60 + 30, weekdayMask: 127, createdAt: day0 },
  ];
  const blocks: TimeBlock[] = [
    { id: "b1", taskId: "t1", title: "Viết đề xuất dashboard tồn kho", startAt: day0 + 13 * H, endAt: day0 + 14 * H, area: "work", createdAt: day0 },
    { id: "b2", taskId: null, title: "Ôn thống kê nhiều biến", startAt: day0 + 19.5 * H, endAt: day0 + 21 * H, area: "study", createdAt: day0 },
    { id: "b3", taskId: null, title: "Chạy bộ 5 km", startAt: day0 + 21 * H, endAt: day0 + 22 * H, area: "growth", createdAt: day0 },
  ];
  const noop = () => {};
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <CalendarDragDrop day0={day0} now={day0 + 15.75 * H} fixed={fixed} blocks={blocks} selectedId="b2" onSelect={noop} onBlockUpdated={noop} onCreateRequest={noop} />
        <div className="bg-popover rounded-lg border p-5">
          <BlockEditor block={blocks[1]} task={null} fixed={fixed} blocks={blocks} onClose={noop} />
        </div>
      </div>
      <CalendarWeekView weekStart={day0} fixed={fixed} blocks={blocks} onDayClick={noop} />
    </div>
  );
}
