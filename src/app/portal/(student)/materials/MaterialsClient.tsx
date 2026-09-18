"use client";
import { useState, useTransition } from "react";
import { FileText, ExternalLink, Download, BookOpen } from "lucide-react";
import type { Embed } from "@/lib/lms/embed";

// P-LMS-1: client component cho toggle hoàn thành tài liệu.
// Nhận dữ liệu đã pre-compute server-side (materials, embeds, completedIds) — KHÔNG fetch danh sách.
// Chỉ gọi API POST toggle khi HV click — state lạc quan, rollback nếu lỗi.

interface Material {
  id: string;
  classId: string;
  title: string;
  fileRef: string | null;
  url: string | null;
  mime: string | null;
  size: number | null;
  createdAt: number | null;
}

interface Props {
  materials: Material[];
  completedIds: string[];            // truyền array (Set không serialize qua RSC boundary)
  embeds: Record<string, Embed | null>; // pre-computed embeds keyed by material id
  classNameById: Record<string, string>;
  fmtSize?: (bytes: number | null | undefined) => string | null;
}

export default function MaterialsClient({
  materials,
  completedIds: initialCompletedArr,
  embeds,
  classNameById,
}: Props) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(initialCompletedArr));
  const [pending, startTransition] = useTransition();

  async function toggleComplete(materialId: string) {
    const isCompleted = completed.has(materialId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/lms/material-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId, completed: !isCompleted }),
        });
        if (res.ok) {
          setCompleted((prev) => {
            const next = new Set(prev);
            if (isCompleted) next.delete(materialId);
            else next.add(materialId);
            return next;
          });
        }
      } catch {
        /* ignore — trạng thái giữ nguyên */
      }
    });
  }

  const completedCount = materials.filter((m) => completed.has(m.id)).length;
  const progressPct =
    materials.length > 0 ? Math.round((completedCount / materials.length) * 100) : 0;

  // Mới nhất trước.
  const rows = [...materials].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  function fmtSizeLocal(bytes: number | null | undefined): string | null {
    if (bytes == null || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <div className="portal-hello">
        <h1>Tài liệu lớp</h1>
        <p className="sub">Tài liệu &amp; bài giảng giảng viên chia sẻ cho lớp của bạn.</p>
      </div>

      {/* P-LMS-1: thanh tiến độ hoàn thành tài liệu */}
      {materials.length > 0 && (
        <div className="sec" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2><span className="secdot portal-secdot-teach" />Tài liệu</h2>
            <span className="cnt">{completedCount}/{materials.length} đã hoàn thành ({progressPct}%)</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: "var(--clr-border, #e2e8f0)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "var(--clr-ok, #22c55e)",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">Chưa có tài liệu nào được chia sẻ.</div>
        </div>
      ) : (
        <div className="stack">
          {rows.map((m) => {
            const size = fmtSizeLocal(m.size);
            const className = classNameById[m.classId];
            const embed = embeds[m.id];
            const isDone = completed.has(m.id);
            return (
              <div key={m.id} className={`card portal-material${isDone ? " portal-material-done" : ""}`}>
                <div className="portal-row" style={{ padding: 0 }}>
                  <FileText strokeWidth={2} aria-hidden className="portal-row-ic" />
                  <div className="grow">
                    <div className="t portal-strong">
                      {isDone && <span style={{ marginRight: "0.25rem" }}>✅</span>}
                      {m.title}
                    </div>
                    <div className="meta">
                      {className && <span className="chip teach">{className}</span>}
                      {size && <span className="chip st">{size}</span>}
                    </div>
                  </div>

                  {!embed && m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn line sm">
                      <ExternalLink strokeWidth={2} aria-hidden />Mở
                    </a>
                  )}
                  {!embed && !m.url && m.fileRef && (
                    <a href={`/api/lms/material/${m.fileRef}`} className="btn line sm" download>
                      <Download strokeWidth={2} aria-hidden />Tải
                    </a>
                  )}

                  <button
                    className={`btn sm${isDone ? " solid" : " line"}`}
                    onClick={() => toggleComplete(m.id)}
                    disabled={pending}
                    style={{ minWidth: "10rem" }}
                  >
                    {isDone ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </button>
                </div>

                {embed && (
                  <div className="portal-embed">
                    <iframe
                      src={embed.src}
                      title={m.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="portal-cta">
        <a href="/portal" className="btn line"><BookOpen strokeWidth={2} aria-hidden />Về trang chủ</a>
      </div>
    </>
  );
}
