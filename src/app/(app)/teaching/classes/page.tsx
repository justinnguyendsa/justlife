import { listClasses } from "@/db/teaching";
import { PageHeader } from "@/components/PageHeader";
import { ClassesClient } from "./ClassesClient";
import { requireOwner } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Màn "Lớp học" (mặt Dạy học): danh sách lớp đang dạy, tạo lớp mới hoặc nhân bản từ lớp cũ.
// Đọc dữ liệu phía server (kèm số học viên + số buổi), trao cho island tương tác.
export default async function ClassesPage() {
  await requireOwner(); // chặn phía server, không chỉ dựa vào middleware (ADR-005 3a)
  const classes = await listClasses();
  return (
    <>
      <PageHeader title="Lớp học" sub="Lớp đang dạy — chọn để điểm danh & chấm bài" />
      <ClassesClient classes={classes} />
    </>
  );
}
