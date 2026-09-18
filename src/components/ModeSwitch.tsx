"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

// Hai mặt: Cá nhân ↔ Dạy học. Mode suy ra từ route (/teaching/*), không cần state.
export function ModeSwitch() {
  const path = usePathname();
  const teach = path.startsWith("/teaching");

  const base =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[13px] font-bold transition-colors [&_svg]:size-[17px]";

  return (
    <div
      className="bg-muted mb-4 flex max-w-[340px] gap-1 rounded-lg p-[3px]"
      role="tablist"
      aria-label="Chế độ"
    >
      <Link
        href="/today"
        role="tab"
        aria-selected={!teach}
        className={cn(
          base,
          teach ? "text-muted-foreground" : "bg-background text-foreground shadow-sm"
        )}
      >
        <User strokeWidth={1.9} />
        Cá nhân
      </Link>
      <Link
        href="/teaching/classes"
        role="tab"
        aria-selected={teach}
        className={cn(
          base,
          teach
            ? "bg-background text-area-teach-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        <GraduationCap strokeWidth={1.9} />
        Dạy học
      </Link>
    </div>
  );
}
