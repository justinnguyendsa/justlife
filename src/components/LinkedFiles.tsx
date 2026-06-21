import Link from "next/link";
import { FileText, ExternalLink, Download, FolderOpen } from "lucide-react";
import type { LibFile } from "@/db/schema";
import { Section } from "./Section";

// Tài liệu thư viện đã gắn với 1 môn (học) hoặc 1 lớp (dạy). Dùng ở chi tiết course/class.
export function LinkedFiles({ files }: { files: LibFile[] }) {
  return (
    <>
      <Section color="var(--brand)" title="Tài liệu" cnt={String(files.length)} />
      {files.length ? files.map((f) => {
        const href = f.kind === "upload" ? `/api/library/file/${f.id}` : (f.url ?? "#");
        return (
          <a key={f.id} className="card task" href={href} target="_blank" rel="noopener noreferrer" style={{ alignItems: "center" }}>
            <span className="bar" style={{ background: "var(--brand)" }} />
            <div className="b">
              <div className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}><FileText strokeWidth={1.8} width={16} height={16} />{f.name}</div>
              <div className="meta"><span className="chip st">{f.kind === "upload" ? "file" : "link"}</span></div>
            </div>
            {f.kind === "upload"
              ? <Download strokeWidth={1.9} width={18} height={18} style={{ color: "var(--text-faint)" }} />
              : <ExternalLink strokeWidth={1.9} width={18} height={18} style={{ color: "var(--text-faint)" }} />}
          </a>
        );
      }) : <div className="empty">Chưa gắn tài liệu. Mở Thư viện → gắn file cho mục này.</div>}
      <Link href="/library" className="btn ghost block" style={{ marginTop: 8 }}><FolderOpen strokeWidth={2} />Mở thư viện</Link>
    </>
  );
}
