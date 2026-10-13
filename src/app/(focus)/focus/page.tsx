import { listTasks } from "@/db/queries";
import { FocusClient } from "./FocusClient";
import { requireOwner } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Màn Tập trung (SPEC-UI-P2.4, canvas J04): việc đang làm (ưu tiên cao trước) + "tiếp theo".
export default async function FocusPage() {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  const all = await listTasks();
  const doing = all.filter((t) => t.status === "doing");
  const next = all.find((t) => t.status !== "doing" && t.priorityScore != null) ?? null;
  return <FocusClient doing={doing} next={next} />;
}
