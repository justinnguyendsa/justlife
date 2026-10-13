import Link from "next/link";
import type { DeadlineEntry } from "@/db/deadlines";
import { countdown } from "@/lib/format";
import { areaBadge, areaTitle } from "@/lib/areas";
import { Badge } from "@/components/ui/badge";

// Một dòng hạn (việc hoặc bài học) — dùng ở Hôm nay và tab Hạn của Việc.
// Chip đỏ = quá hạn, vàng = trong 3 ngày, viền = còn xa.
export function DueItem({ e, now }: { e: DeadlineEntry; now: number }) {
  const c = countdown(e.dueAt, now);
  return (
    <li className="border-b last:border-b-0">
      <Link href={e.href} className="hover:bg-accent flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors">
        <Badge variant={c.level === "over" ? "danger" : c.level === "warn" ? "warn" : "outline"} className="font-mono">
          {c.label}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
        <Badge variant={areaBadge(e.area)} className="hidden sm:inline-flex">
          {e.source === "study" ? e.sub : areaTitle(e.area)}
        </Badge>
      </Link>
    </li>
  );
}
