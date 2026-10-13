"use client";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

// Nút "Thêm việc" ở thanh tiêu đề — mở hộp Thêm việc toàn cục qua sự kiện jl:add-task (SPEC-UI-P2.1 T07).
// Chỉ hiện trên web; điện thoại dùng nút nổi.
export function AddTaskButton() {
  return (
    <Button size="sm" className="hidden md:inline-flex" onClick={() => window.dispatchEvent(new Event("jl:add-task"))}>
      <Plus aria-hidden="true" />
      Thêm việc
      <kbd className="border-primary-foreground/60 rounded-sm border px-1.5 font-sans text-[11px] leading-4 font-semibold">N</kbd>
    </Button>
  );
}
