import Link from "next/link";
import { Flame, Moon, BookOpen, ChevronRight, Sprout } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

// Hub "Cuộc sống" (tạm — SPEC-UI-P2.0 T08): 3 lối vào Thói quen · Nghỉ ngơi · Học cao học.
// Sẽ thay bằng màn tổng quan 6 mảng khi làm F3 (canvas J05).
// Chỉ là màn điều hướng (không đọc DB) — mỗi mục là 1 card với icon tròn nền màu mảng.
const HUBS = [
  {
    href: "/habits",
    label: "Thói quen",
    desc: "Thể lực · tiếng Anh · ngủ",
    Icon: Flame,
    color: "var(--area-growth-foreground)",
    weak: "var(--growth-weak)",
  },
  {
    href: "/rest",
    label: "Nghỉ ngơi",
    desc: "Khối nghỉ · chống burnout",
    Icon: Moon,
    color: "var(--area-teach-foreground)",
    weak: "var(--teach-weak)",
  },
  {
    href: "/study",
    label: "Học cao học",
    desc: "Môn · bài tập · ghi chú",
    Icon: BookOpen,
    color: "var(--area-study-foreground)",
    weak: "var(--study-weak)",
  },
];

export default function DevelopPage() {
  return (
    <>
      <PageHeader title="Cuộc sống" sub="Thói quen · nghỉ ngơi · học" />

      <div className="stack">
        {HUBS.map(({ href, label, desc, Icon, color, weak }) => (
          <Link key={href} href={href} className="card task" style={{ alignItems: "center" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "var(--radius-pill)",
                background: weak,
                color,
                flex: "none",
              }}
            >
              <Icon strokeWidth={1.9} width={22} height={22} />
            </span>
            <div className="b">
              <div className="t">{label}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{desc}</div>
            </div>
            <ChevronRight strokeWidth={1.9} width={18} height={18} style={{ alignSelf: "center", color: "var(--text-faint)" }} />
          </Link>
        ))}
      </div>

      <div
        className="muted"
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginTop: 16, lineHeight: 1.5 }}
      >
        <Sprout strokeWidth={1.8} width={16} height={16} style={{ flex: "none", color: "var(--area-growth-foreground)" }} />
        Bật so le, đừng ôm hết cùng lúc — mỗi lần thêm một thói quen nhỏ là đủ.
      </div>
    </>
  );
}
