"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { Task } from "@/db/schema";
import { AREAS } from "@/lib/areas";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { TaskRow } from "../today/TaskRow";
import { TaskDetail } from "./TaskDetail";

const PAGE_SIZE = 20;
const FILTERS = [{ key: "all", label: "Tất cả mảng" }, ...AREAS];

// Bỏ dấu để tìm kiếm không phân biệt dấu — gõ "bao cao" vẫn ra "báo cáo" (US-02 edge case).
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d").trim();
}

// Tab "Tất cả" của Việc (SPEC-UI-P2.2 F03): tìm + lọc mảng, 3 nhóm, chi tiết ở cột phải (web)
// hoặc sheet từ dưới lên (điện thoại).
export function TasksClient({ tasks, now }: { tasks: Task[]; now: number }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const open = openId ? tasks.find((t) => t.id === openId) ?? null : null;

  const { doing, todo, inbox, total } = useMemo(() => {
    const fq = fold(q);
    const list = tasks.filter((t) => (area === "all" || t.area === area) && (!fq || fold(t.title).includes(fq)));
    return {
      doing: list.filter((t) => t.status === "doing"),
      todo: list.filter((t) => t.status !== "doing" && t.priorityScore != null),
      inbox: list.filter((t) => t.status !== "doing" && t.priorityScore == null),
      total: list.length,
    };
  }, [tasks, q, area]);

  // Phân trang chỉ áp cho nhóm Cần làm (dài nhất); Đang làm và Hộp việc thường ngắn.
  const todoShown = todo.slice(0, limit);

  const row = (t: Task) => (
    <TaskRow key={t.id} task={t} now={now} showFocus={false} selected={t.id === openId} onOpen={() => setOpenId(t.id === openId ? null : t.id)} />
  );

  const detail = open ? <TaskDetail key={open.id} task={open} onClose={() => setOpenId(null)} headingId="task-detail-h" /> : null;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:gap-7">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-[260px]">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setLimit(PAGE_SIZE); }}
              placeholder="Tìm việc"
              aria-label="Tìm việc theo tên"
              className="h-11 pl-9 md:h-9"
            />
          </div>
          <div role="group" aria-label="Lọc theo mảng" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {FILTERS.map((f) => {
              const on = area === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { setArea(f.key); setLimit(PAGE_SIZE); }}
                  className={cn(
                    "min-h-11 shrink-0 rounded-sm border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors md:min-h-8",
                    on ? "bg-primary-soft text-primary-soft-foreground border-transparent" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {total === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-[13px]">
            {tasks.length === 0
              ? "Chưa có việc nào — bấm Thêm việc (phím N) để ghi việc đầu tiên."
              : q.trim()
                ? `Không tìm thấy việc nào khớp "${q.trim()}".`
                : "Không có việc nào trong mảng này."}
          </p>
        ) : (
          <>
            {doing.length > 0 && (
              <Group id="g-doing" title="Đang làm">{doing.map(row)}</Group>
            )}
            {todo.length > 0 && (
              <Group id="g-todo" title="Cần làm" note="xếp theo điểm ưu tiên">
                {todoShown.map(row)}
                {todo.length > todoShown.length && (
                  <button
                    type="button"
                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    className="text-primary hover:bg-accent min-h-11 rounded-md text-[13px] font-semibold"
                  >
                    Xem thêm ({todo.length - todoShown.length} việc nữa)
                  </button>
                )}
              </Group>
            )}
            {inbox.length > 0 && (
              <Group id="g-inbox" title="Hộp việc — chưa ưu tiên" note={`${inbox.length} việc`}>{inbox.map(row)}</Group>
            )}
          </>
        )}
      </div>

      {/* Web: chi tiết ở cột phải, dính khi cuộn */}
      <aside
        aria-labelledby={open ? "task-detail-h" : undefined}
        aria-label={open ? undefined : "Chi tiết việc"}
        className="hidden md:block"
      >
        <div className="bg-popover sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto rounded-lg border p-5">
          {isDesktop && detail ? (
            detail
          ) : (
            <p className="text-muted-foreground text-[13px]">Chọn một việc để xem và sửa chi tiết. Mọi thay đổi tự lưu.</p>
          )}
        </div>
      </aside>

      {/* Điện thoại: sheet từ dưới lên */}
      <Sheet open={!isDesktop && open != null} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[22px] px-5 pt-3 pb-6">
          <SheetTitle className="sr-only">Chi tiết việc</SheetTitle>
          {!isDesktop && detail}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Group({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
        {note && <span className="text-muted-foreground text-xs">{note}</span>}
      </div>
      {children}
    </section>
  );
}
