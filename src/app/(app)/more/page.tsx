import Link from "next/link";
import { Sprout, FolderOpen, SlidersHorizontal, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const ITEMS = [
  { href: "/develop", label: "Phát triển", desc: "Thói quen · nghỉ ngơi · học cao học", Icon: Sprout, color: "var(--module-growth)" },
  { href: "/library", label: "Tài liệu", desc: "Thư viện file & folder (học + dạy)", Icon: FolderOpen, color: "var(--brand)" },
  { href: "/settings", label: "Cài đặt", desc: "Lịch cố định · WIP · giao diện", Icon: SlidersHorizontal, color: "var(--text-secondary)" },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="Khác" sub="Các mục khác" />
      <div className="stack">
        {ITEMS.map(({ href, label, desc, Icon, color }) => (
          <Link key={href} href={href} className="card task" style={{ alignItems: "center" }}>
            <span className="bar" style={{ background: color }} />
            <div className="b">
              <div className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon strokeWidth={1.9} width={18} height={18} />{label}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{desc}</div>
            </div>
            <ChevronRight strokeWidth={1.9} width={18} height={18} style={{ alignSelf: "center", color: "var(--text-faint)" }} />
          </Link>
        ))}
      </div>
    </>
  );
}
