import { listTasks } from "@/db/queries";
import { FocusClient } from "./FocusClient";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const allTasks = await listTasks();
  // Lọc task đang doing, sắp theo priority cao nhất trước
  const doing = allTasks.filter((t) => t.status === "doing");

  return (
    <main style={{ padding: "var(--space-4)", maxWidth: 600, margin: "0 auto" }}>
      <h1
        className="page-h"
        style={{ marginBottom: 24, fontFamily: "var(--font-heading)" }}
      >
        🎯 Focus Mode
      </h1>
      <FocusClient doing={doing} />
    </main>
  );
}
