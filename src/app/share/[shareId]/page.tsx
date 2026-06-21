import { notFound } from "next/navigation";
import { Folder, FileText, ExternalLink, Download } from "lucide-react";
import { resolveShare } from "@/db/library";
import type { LibFile } from "@/db/schema";

export const dynamic = "force-dynamic";

function fileHref(f: LibFile) {
  return f.kind === "upload" ? `/api/library/file/${f.id}` : (f.url ?? "#");
}

function FileRow({ f }: { f: LibFile }) {
  const ext = f.kind === "upload";
  return (
    <a className="card task" href={fileHref(f)} target="_blank" rel="noopener noreferrer" style={{ alignItems: "center" }}>
      <span className="bar" style={{ background: "var(--brand)" }} />
      <div className="b">
        <div className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}><FileText strokeWidth={1.8} width={16} height={16} />{f.name}</div>
        <div className="meta"><span className="chip st">{ext ? "file" : "link"}</span></div>
      </div>
      {ext ? <Download strokeWidth={1.9} width={18} height={18} style={{ color: "var(--text-faint)" }} /> : <ExternalLink strokeWidth={1.9} width={18} height={18} style={{ color: "var(--text-faint)" }} />}
    </a>
  );
}

export default async function SharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const r = await resolveShare(shareId);
  if (!r) notFound();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--space-6) var(--space-4) var(--space-10)" }}>
      <div className="brand" style={{ padding: "0 0 var(--space-5)" }}>just<b>life</b></div>
      {r.type === "file" ? (
        <>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>{r.file.name}</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Tài liệu được chia sẻ</p>
          <a className="btn primary" href={fileHref(r.file)} target="_blank" rel="noopener noreferrer">
            {r.file.kind === "upload" ? <><Download strokeWidth={2} /> Tải / Mở file</> : <><ExternalLink strokeWidth={2} /> Mở liên kết</>}
          </a>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 22, marginBottom: 4, display: "flex", alignItems: "center", gap: 9 }}><Folder strokeWidth={1.9} />{r.folder.name}</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Thư mục được chia sẻ · {r.subfolders.length} thư mục con · {r.files.length} tệp</p>
          {r.subfolders.map((sf) => (
            <div className="card task" key={sf.id} style={{ alignItems: "center" }}>
              <span className="bar" style={{ background: "var(--accent)" }} />
              <div className="b"><div className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}><Folder strokeWidth={1.8} width={16} height={16} />{sf.name}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Thư mục con (chia sẻ riêng để mở)</div></div>
            </div>
          ))}
          {r.files.map((f) => <FileRow key={f.id} f={f} />)}
          {r.subfolders.length === 0 && r.files.length === 0 && <div className="empty">Thư mục trống.</div>}
        </>
      )}
    </div>
  );
}
