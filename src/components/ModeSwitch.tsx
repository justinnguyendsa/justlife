"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, GraduationCap } from "lucide-react";

// Hai mặt: Cá nhân ↔ Dạy học. Mode suy ra từ route (/teaching/*), không cần state.
export function ModeSwitch() {
  const path = usePathname();
  const teach = path.startsWith("/teaching");
  return (
    <div className="modeswitch" role="tablist" aria-label="Chế độ">
      <Link href="/today" className={!teach ? "on" : ""}><User strokeWidth={1.9} />Cá nhân</Link>
      <Link href="/teaching/classes" className={teach ? "on teach" : ""}><GraduationCap strokeWidth={1.9} />Dạy học</Link>
    </div>
  );
}
