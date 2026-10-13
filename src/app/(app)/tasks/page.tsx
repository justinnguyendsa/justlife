import Link from "next/link";
import { AlarmClock, Target } from "lucide-react";
import { listTasks } from "@/db/queries";
import { getSettings } from "@/app/actions/settings";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

// Màn "Việc" (Inbox): xem toàn bộ việc chưa xong, tìm/lọc theo mảng, đặt ưu tiên & đổi trạng thái.
// Đọc dữ liệu phía server (đã sort priority desc, null cuối), trao cho island tương tác.
export default async function TasksPage() {
  const [initial, settings] = await Promise.all([
    listTasks(),
    getSettings(["wip_limit"]),
  ]);
  // T16 — WIP limit từ DB (mặc định 3 nếu chưa cấu hình)
  const wipLimit = parseInt(settings["wip_limit"] ?? "3", 10);
  return (
    <>
      <PageHeader
        title="Việc"
        sub="Tất cả việc chưa xong — chọn để đặt ưu tiên"
        action={
          <>
            {/* Lối vào Hạn và Tập trung cho tới khi Hạn thành tab trong Việc (P2.2). */}
            <Button asChild variant="outline" size="sm">
              <Link href="/deadlines"><AlarmClock aria-hidden="true" />Hạn</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/focus"><Target aria-hidden="true" />Tập trung</Link>
            </Button>
          </>
        }
      />
      <TasksClient initial={initial} wipLimit={wipLimit} />
    </>
  );
}
