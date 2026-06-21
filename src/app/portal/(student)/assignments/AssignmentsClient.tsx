"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  FileCheck2,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { fmtDate, fmtTime, countdown } from "@/lib/format";

// Client island: list bài tập + NỘP BÀI (input file → fetch POST /api/lms/submission).
// Hiện "đã nộp: <tên file>" + nút tải về /api/lms/file/[ref] (chỉ chủ tải được — server enforce).
// studentId KHÔNG truyền từ client — server lấy từ session. Copy 100% tiếng Việt, token-only.
//
// 🗣️ Bình dân: học viên chọn file rồi bấm nộp; nộp xong thấy tên file đã nộp và nút tải lại.

type SubmissionView = {
  id: string;
  fileRef: string;
  originalName: string | null;
  mime: string | null;
  size: number | null;
  submittedAt: number | null;
  status: string;
} | null;

type AssignmentView = {
  id: string;
  title: string;
  dueAt: number | null;
  maxScore: number;
};

type Row = { assignment: AssignmentView; submission: SubmissionView };

function fmtSize(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip";

export function AssignmentsClient({ rows }: { rows: Row[] }) {
  return (
    <div className="stack">
      {rows.map((r) => (
        <AssignmentCard key={r.assignment.id} row={r} />
      ))}
    </div>
  );
}

function AssignmentCard({ row }: { row: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { assignment: a, submission: sub } = row;
  const now = Date.now();
  const cd = a.dueAt != null ? countdown(a.dueAt, now) : null;

  function pick() {
    setError("");
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input để có thể chọn lại cùng tên file lần sau.
    e.target.value = "";
    if (!file) return;
    setError("");

    const fd = new FormData();
    fd.append("assignmentId", a.id);
    fd.append("file", file);

    start(async () => {
      try {
        const res = await fetch("/api/lms/submission", { method: "POST", body: fd });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!res.ok || !data?.ok) {
          setError(data?.error || "Nộp bài thất bại. Vui lòng thử lại.");
          return;
        }
        router.refresh();
      } catch {
        setError("Lỗi kết nối. Vui lòng thử lại.");
      }
    });
  }

  const submitted = sub != null;

  return (
    <div className="card">
      <div className="portal-row">
        <FileCheck2 strokeWidth={2} aria-hidden className="portal-row-ic" />
        <div className="grow">
          <div className="t portal-strong">{a.title}</div>
          <div className="meta">
            {a.dueAt != null && (
              <span className="chip dl">
                <CalendarClock strokeWidth={2} aria-hidden style={{ width: 13, height: 13 }} />
                Hạn: {fmtDate(a.dueAt)} {fmtTime(a.dueAt)}
              </span>
            )}
            {cd && (
              <span className={"chip dl" + (cd.level === "over" ? " over" : "")}>{cd.label}</span>
            )}
            <span className="chip st">thang {a.maxScore}</span>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="portal-sub-done">
          <CheckCircle2 strokeWidth={2} aria-hidden className="portal-sub-done-ic" />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="portal-sub-label">
              Đã nộp{sub?.status === "late" ? " (muộn)" : ""}
            </div>
            <div className="portal-sub-file" title={sub?.originalName ?? undefined}>
              {sub?.originalName ?? "tệp đã nộp"}
              {fmtSize(sub?.size) ? ` · ${fmtSize(sub?.size)}` : ""}
              {sub?.submittedAt != null ? ` · ${fmtDate(sub.submittedAt)} ${fmtTime(sub.submittedAt)}` : ""}
            </div>
          </div>
          <a
            href={`/api/lms/file/${sub?.fileRef}`}
            className="btn line sm"
            download
          >
            <Download strokeWidth={2} aria-hidden />
            Tải về
          </a>
        </div>
      ) : null}

      {error && (
        <div className="portal-err" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
          <AlertCircle strokeWidth={2} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        hidden
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        className="btn line block sm"
        style={{ marginTop: 10 }}
        disabled={pending}
        onClick={pick}
      >
        <Upload strokeWidth={2} aria-hidden />
        {pending ? "Đang nộp…" : submitted ? "Nộp lại bài khác" : "Nộp bài"}
      </button>
    </div>
  );
}
