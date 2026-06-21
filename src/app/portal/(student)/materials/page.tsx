import { redirect } from "next/navigation";
import { BookOpen, ExternalLink, FileText, Clock } from "lucide-react";
import {
  getSessionStudentId,
  getMyMaterials,
  getMyClasses,
} from "@/lib/lms/portal-queries";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// "Tài liệu lớp": tài liệu các lớp tôi thuộc về (đã scoped + visibility='class' ở wrapper).
// S3: hiện LINK ngoài (mở được) + metadata file. Tải file an toàn qua route riêng là S4.

function fmtSize(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalMaterialsPage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [materials, classes] = await Promise.all([
    getMyMaterials(studentId),
    getMyClasses(studentId),
  ]);

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  // Mới nhất trước.
  const rows = [...materials].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return (
    <>
      <div className="portal-hello">
        <h1>Tài liệu lớp</h1>
        <p className="sub">Tài liệu giảng viên chia sẻ cho lớp của bạn.</p>
      </div>

      <div className="sec">
        <h2><span className="secdot portal-secdot-teach" />Tài liệu</h2>
        <span className="cnt">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">Chưa có tài liệu nào được chia sẻ.</div>
        </div>
      ) : (
        <div className="stack">
          {rows.map((m) => {
            const size = fmtSize(m.size);
            const className = classNameById.get(m.classId);
            return (
              <div key={m.id} className="card portal-row">
                <FileText strokeWidth={2} aria-hidden className="portal-row-ic" />
                <div className="grow">
                  <div className="t portal-strong">{m.title}</div>
                  <div className="meta">
                    {className && <span className="chip teach">{className}</span>}
                    {size && <span className="chip st">{size}</span>}
                    {m.createdAt != null && <span className="chip st">{fmtDate(m.createdAt)}</span>}
                  </div>
                </div>

                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn line sm"
                  >
                    <ExternalLink strokeWidth={2} aria-hidden />
                    Mở
                  </a>
                ) : m.fileRef ? (
                  <span className="chip st portal-soon" title="Tải tệp an toàn sẽ có ở bản cập nhật sau">
                    <Clock strokeWidth={2} aria-hidden />
                    Sắp có
                  </span>
                ) : null}
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
