import { listTasks } from "@/db/queries";
import { FocusClient } from "./FocusClient";

export const dynamic = "force-dynamic";

// Màn Tập trung (SPEC-UI-P2.4, canvas J04): việc đang làm (ưu tiên cao trước) + "tiếp theo".
export default async function FocusPage() {
  const all = await listTasks();
  const doing = all.filter((t) => t.status === "doing");
  const next = all.find((t) => t.status !== "doing" && t.priorityScore != null) ?? null;
  return <FocusClient doing={doing} next={next} />;
}
