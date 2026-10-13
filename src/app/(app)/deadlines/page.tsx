import { redirect } from "next/navigation";

// Deadline đã gộp thành tab "Hạn" trong Việc (SPEC-UI-P2.2 F07). Giữ đường dẫn cũ cho link/bookmark.
export default function DeadlinesPage() {
  redirect("/tasks?tab=han");
}
