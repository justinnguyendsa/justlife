import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth-guard";

// Màn giờ bận cũ đã gộp vào Cài đặt (SPEC-UI-P2.5 F09). Giữ đường dẫn cũ cho bookmark.
export default async function FixedSchedulesPage() {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  redirect("/settings");
}
