import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listHabits } from "@/db/habits";
import { PageHeader } from "@/components/PageHeader";
import { HabitsClient } from "./HabitsClient";
import { requireOwner } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Màn "Thói quen" (trụ #4): mỗi thói quen có streak + 7 ô tuần + bật/tắt hôm nay.
// Đọc dữ liệu phía server (kèm streak/doneToday/last7), trao cho island HabitsClient.
export default async function HabitsPage() {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  const habits = await listHabits(Date.now());
  return (
    <>
      <Link href="/develop" className="btn line sm" style={{ marginBottom: 10 }}>
        <ChevronLeft strokeWidth={2} />Phát triển
      </Link>
      <PageHeader title="Thói quen" sub="Đều đặn mỗi ngày, tích thành chuỗi" />
      <HabitsClient habits={habits} />
    </>
  );
}
