import Link from "next/link";
import { cn } from "@/lib/utils";

export type TaskTab = "tat-ca" | "han" | "xong";

const TABS: { key: TaskTab; label: string; href: string }[] = [
  { key: "tat-ca", label: "Tất cả", href: "/tasks" },
  { key: "han", label: "Hạn", href: "/tasks?tab=han" },
  { key: "xong", label: "Đã xong", href: "/tasks?tab=xong" },
];

// Thanh tab của Việc (SPEC-UI-P2.2 F02). Tab Hạn có chip đếm hạn ≤ 7 ngày (gồm quá hạn).
export function TaskTabs({ active, dueCount }: { active: TaskTab; dueCount: number }) {
  return (
    <nav aria-label="Nhóm việc" className="mb-4 flex gap-6 border-b">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 text-sm font-semibold transition-colors",
              on ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
            {t.key === "han" && dueCount > 0 && (
              <span className="bg-warning-soft text-warning-soft-foreground rounded-sm px-1.5 font-mono text-xs leading-5">{dueCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
