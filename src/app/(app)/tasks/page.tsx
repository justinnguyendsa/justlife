import { listDoneTasks, listTasks } from "@/db/queries";
import { getUnifiedDeadlines } from "@/db/deadlines";
import { PageHeader } from "@/components/PageHeader";
import { AddTaskButton } from "@/components/AddTaskButton";
import { TaskTabs, type TaskTab } from "./TaskTabs";
import { TasksClient } from "./TasksClient";
import { DueList } from "./DueList";
import { DoneList } from "./DoneList";

export const dynamic = "force-dynamic";

// Màn Việc (SPEC-UI-P2.2, canvas J02): 3 tab Tất cả · Hạn · Đã xong — tab nằm trên URL (?tab=).
export default async function TasksPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const sp = searchParams ? await searchParams : {};
  const tab: TaskTab = sp.tab === "han" ? "han" : sp.tab === "xong" ? "xong" : "tat-ca";
  // eslint-disable-next-line react-hooks/purity -- server component: chỉ render 1 lần mỗi request
  const now = Date.now();

  const [tasks, deadlines, done] = await Promise.all([
    listTasks(),
    getUnifiedDeadlines(now),
    tab === "xong" ? listDoneTasks() : Promise.resolve([]),
  ]);

  const doingCount = tasks.filter((t) => t.status === "doing").length;
  const dueCount = deadlines.overdue.length + deadlines.upcoming.length;

  return (
    <>
      <PageHeader
        title="Việc"
        sub={`${tasks.length} việc chưa xong · ${doingCount} đang làm`}
        action={<AddTaskButton />}
      />
      <TaskTabs active={tab} dueCount={dueCount} />
      {tab === "han" ? (
        <DueList overdue={deadlines.overdue} upcoming={deadlines.upcoming} later={deadlines.later} now={now} />
      ) : tab === "xong" ? (
        <DoneList tasks={done} />
      ) : (
        <TasksClient tasks={tasks} now={now} />
      )}
    </>
  );
}
