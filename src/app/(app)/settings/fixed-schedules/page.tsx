import { redirect } from "next/navigation";

// Màn giờ bận cũ đã gộp vào Cài đặt (SPEC-UI-P2.5 F09). Giữ đường dẫn cũ cho bookmark.
export default function FixedSchedulesPage() {
  redirect("/settings");
}
