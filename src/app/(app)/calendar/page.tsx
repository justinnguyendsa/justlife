import { getCalendarData } from "@/db/queries";
import { PageHeader } from "@/components/PageHeader";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

// Màn "Lịch" (US-05, S7): xem khối cố định hôm nay + time-block (việc đã xếp),
// kéo-thả để đổi giờ (desktop) / chạm-đặt (mobile). Đọc dữ liệu phía server,
// trao cho island tương tác. Múi giờ hiển thị: Asia/Ho_Chi_Minh (lib/format).
export default async function CalendarPage() {
  const { day0, fixed, blocks, tasks } = await getCalendarData();
  return (
    <>
      <PageHeader title="Lịch" sub="Xếp việc né giờ bận" />
      <CalendarClient day0={day0} fixed={fixed} blocks={blocks} tasks={tasks} />
    </>
  );
}
