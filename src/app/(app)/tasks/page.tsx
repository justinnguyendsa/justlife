import { listTasks } from "@/db/queries";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

// Màn "Việc" (Inbox): xem toàn bộ việc chưa xong, tìm/lọc theo mảng, đặt ưu tiên & đổi trạng thái.
// Đọc dữ liệu phía server (đã sort priority desc, null cuối), trao cho island tương tác.
export default async function TasksPage() {
  const initial = await listTasks();
  return (
    <>
      <PageHeader title="Việc" sub="Tất cả việc chưa xong — chọn để đặt ưu tiên" />
      <TasksClient initial={initial} />
    </>
  );
}
