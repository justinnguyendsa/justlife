import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRest } from "@/db/habits";
import { PageHeader } from "@/components/PageHeader";
import { RestClient } from "./RestClient";

export const dynamic = "force-dynamic";

// Màn "Nghỉ ngơi" (trụ #4 — nghỉ chủ động chống burnout): tóm tắt hôm nay/tuần + thêm khối nghỉ nhanh.
// Đọc dữ liệu phía server (todayBlocks/todayMin/weekMin), trao cho island RestClient.
export default async function RestPage() {
  const rest = await getRest(Date.now());
  return (
    <>
      <Link href="/develop" className="btn line sm" style={{ marginBottom: 10 }}>
        <ChevronLeft strokeWidth={2} />Phát triển
      </Link>
      <PageHeader title="Nghỉ ngơi" sub="Nghỉ chủ động để bền sức" />
      <RestClient todayBlocks={rest.todayBlocks} todayMin={rest.todayMin} weekMin={rest.weekMin} />
    </>
  );
}
