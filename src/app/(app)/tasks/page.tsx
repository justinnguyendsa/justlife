import { listTasks } from "@/db/queries";
import { getSettings } from "@/app/actions/settings";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader title="Việc" sub="Tất cả việc chưa xong — chọn để đặt ưu tiên" />
      <TasksClient initial={initial} wipLimit={wipLimit} />
    </>
  );
}
