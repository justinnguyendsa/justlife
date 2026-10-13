import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth-guard";

// Deadline đã gộp thành tab "Hạn" trong Việc (SPEC-UI-P2.2 F07). Giữ đường dẫn cũ cho link/bookmark.
export default async function DeadlinesPage() {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  redirect("/tasks?tab=han");
}
