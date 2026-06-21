"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Folder, FileText, Upload, Link2, Share2, Trash2, FolderPlus, ChevronRight, X, Tag,
} from "lucide-react";
import type { LibFolder, LibFile } from "@/db/schema";
import type { listClasses } from "@/db/teaching";
import type { listCourses } from "@/db/study";
import {
  createFolder, deleteFolder, addLink, deleteFile,
  toggleShareFolder, toggleShareFile, assignFile,
} from "@/app/actions/library";
import { toast } from "@/components/Toaster";

// Lấy đúng kiểu trả về từ query để khỏi lệch khi schema/db đổi.
type ClassRow = Awaited<ReturnType<typeof listClasses>>[number];
type CourseRow = Awaited<ReturnType<typeof listCourses>>[number];

type Props = {
  folder: LibFolder | null; // null = đang ở gốc
  crumbs: { id: string; name: string }[];
  subfolders: LibFolder[];
  files: LibFile[];
  classes: ClassRow[];
  courses: CourseRow[];
};

// Đổi byte → chuỗi gọn (KB/MB) cho chip kích thước.
function fmtSize(bytes: number | null | undefined): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Copy link chia sẻ vào clipboard (có guard khi trình duyệt không hỗ trợ).
async function copyShareLink(shareId: string) {
  const link = `${location.origin}/share/${shareId}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      toast("Đã copy link chia sẻ");
    } else {
      toast(link); // fallback: hiện link để tự copy
    }
  } catch {
    toast(link);
  }
}

type SheetKind = "folder" | "link" | null;

export function LibraryClient({ folder, crumbs, subfolders, files, classes, courses }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Upload có state pending riêng (không qua server action).
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet tạo thư mục / thêm link.
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [folderName, setFolderName] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Sheet gắn lớp/môn cho 1 file.
  const [assignFor, setAssignFor] = useState<LibFile | null>(null);
  const [assignKind, setAssignKind] = useState<"class" | "course">("class");
  const [assignTarget, setAssignTarget] = useState<string>("");

  const parentId = folder?.id ?? null;
  const empty = subfolders.length === 0 && files.length === 0;

  // Esc đóng mọi sheet (desktop).
  useEffect(() => {
    const anyOpen = sheet !== null || assignFor !== null;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, assignFor]);

  // Khi mở sheet gắn lớp/môn: nạp lựa chọn hiện có của file.
  useEffect(() => {
    if (!assignFor) return;
    if (assignFor.linkCourseId) { setAssignKind("course"); setAssignTarget(assignFor.linkCourseId); }
    else if (assignFor.linkClassId) { setAssignKind("class"); setAssignTarget(assignFor.linkClassId); }
    else { setAssignKind("class"); setAssignTarget(""); }
  }, [assignFor]);

  function closeAll() {
    setSheet(null);
    setFolderName(""); setLinkName(""); setLinkUrl("");
    setAssignFor(null); setAssignTarget("");
  }

  /* ===== Tạo thư mục ===== */
  function submitFolder() {
    const nm = folderName.trim();
    if (!nm) { toast("Nhập tên thư mục", true); return; }
    start(async () => {
      await createFolder({ name: nm, parentId });
      closeAll();
      router.refresh();
      toast("Đã tạo thư mục");
    });
  }

  /* ===== Thêm link ===== */
  function submitLink() {
    const nm = linkName.trim();
    const url = linkUrl.trim();
    if (!nm) { toast("Nhập tên tài liệu", true); return; }
    if (!url) { toast("Nhập đường dẫn (URL)", true); return; }
    start(async () => {
      await addLink({ folderId: parentId, name: nm, url });
      closeAll();
      router.refresh();
      toast("Đã thêm link");
    });
  }

  /* ===== Tải lên (fetch tới route handler, không dùng server action) ===== */
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng file
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folderId", parentId ?? "");
      const res = await fetch("/api/library/upload", { method: "POST", body: fd });
      if (res.ok) {
        router.refresh();
        toast("Đã tải lên");
      } else {
        let msg = "Tải lên thất bại";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error as string; // VD: "File vượt 25MB"
        } catch { /* giữ msg mặc định */ }
        toast(msg, true);
      }
    } catch {
      toast("Không tải lên được — kiểm tra kết nối", true);
    } finally {
      setUploading(false);
    }
  }

  /* ===== Xóa thư mục / tệp ===== */
  function removeFolder(f: LibFolder) {
    if (!confirm(`Xóa thư mục "${f.name}" và toàn bộ nội dung bên trong?`)) return;
    start(async () => {
      await deleteFolder(f.id);
      router.refresh();
      toast("Đã xóa thư mục");
    });
  }
  function removeFile(f: LibFile) {
    if (!confirm(`Xóa tệp "${f.name}"?`)) return;
    start(async () => {
      await deleteFile(f.id);
      router.refresh();
      toast("Đã xóa tệp");
    });
  }

  /* ===== Chia sẻ ===== */
  function shareFolder(f: LibFolder) {
    start(async () => {
      const r = await toggleShareFolder(f.id);
      router.refresh();
      if (r.ok && r.shareId) await copyShareLink(r.shareId);
      else toast("Đã tắt chia sẻ");
    });
  }
  function shareFile(f: LibFile) {
    start(async () => {
      const r = await toggleShareFile(f.id);
      router.refresh();
      if (r.ok && r.shareId) await copyShareLink(r.shareId);
      else toast("Đã tắt chia sẻ");
    });
  }

  /* ===== Gắn lớp/môn ===== */
  function submitAssign() {
    if (!assignFor) return;
    const id = assignTarget || null;
    start(async () => {
      await assignFile({
        fileId: assignFor.id,
        classId: assignKind === "class" ? id : null,
        courseId: assignKind === "course" ? id : null,
      });
      closeAll();
      router.refresh();
      toast(id ? "Đã gắn nhãn" : "Đã bỏ gắn nhãn");
    });
  }

  // Nhãn lớp/môn đang gắn (hiện trên thẻ tệp).
  function assignLabel(f: LibFile): string | null {
    if (f.linkClassId) return classes.find((c) => c.id === f.linkClassId)?.name ?? "Lớp đã gắn";
    if (f.linkCourseId) return courses.find((c) => c.id === f.linkCourseId)?.name ?? "Môn đã gắn";
    return null;
  }

  // href mở/tải tệp theo loại.
  const fileHref = (f: LibFile) => (f.kind === "upload" ? `/api/library/file/${f.id}` : f.url ?? "#");

  const busy = pending || uploading;

  return (
    <>
      {/* ===== Breadcrumb ===== */}
      <nav
        aria-label="Đường dẫn thư mục"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}
      >
        <Link href="/library" style={{ fontWeight: 600, color: crumbs.length ? "var(--brand)" : "var(--text-primary)" }}>Tài liệu</Link>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
              <ChevronRight strokeWidth={1.8} style={{ width: 15, height: 15, color: "var(--text-faint)", flex: "none" }} />
              {last
                ? <span aria-current="page" style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</span>
                : <Link href={`/library/${c.id}`} style={{ fontWeight: 600, color: "var(--brand)" }}>{c.name}</Link>}
            </span>
          );
        })}
      </nav>

      {/* ===== Toolbar ===== */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--space-3)" }}>
        <button className="btn line sm" disabled={busy} onClick={() => { closeAll(); setSheet("folder"); }}>
          <FolderPlus strokeWidth={1.9} />Tạo thư mục
        </button>
        <button className="btn line sm" disabled={busy} onClick={() => { closeAll(); setSheet("link"); }}>
          <Link2 strokeWidth={1.9} />Thêm link
        </button>
        <button className="btn primary sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          <Upload strokeWidth={1.9} />{uploading ? "Đang tải..." : "Tải lên"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={onPickFile}
          aria-label="Chọn tệp để tải lên"
        />
      </div>

      {empty ? (
        <div className="empty">Thư mục trống — tạo thư mục con, tải tệp lên hoặc thêm một link để bắt đầu.</div>
      ) : (
        <>
          {/* ===== Thư mục con ===== */}
          {subfolders.length > 0 && (
            <>
              <div className="sec">
                <h2><span className="secdot" style={{ background: "var(--brand)" }} /><Folder strokeWidth={1.8} style={{ width: 15, height: 15 }} />Thư mục</h2>
                <span className="cnt">{subfolders.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-2)" }}>
                {subfolders.map((sf) => (
                  <div className="card" key={sf.id} style={{ marginBottom: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Link href={`/library/${sf.id}`} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Folder strokeWidth={1.8} style={{ width: 22, height: 22, color: "var(--brand)", flex: "none" }} />
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sf.name}</span>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {sf.shareId && <span className="chip st doing"><Share2 strokeWidth={1.8} style={{ width: 12, height: 12 }} />Đang chia sẻ</span>}
                      <button className="btn line sm" disabled={busy} onClick={() => shareFolder(sf)} aria-label={`Chia sẻ thư mục ${sf.name}`} title="Chia sẻ">
                        <Share2 strokeWidth={1.9} />
                      </button>
                      <button className="btn line sm" disabled={busy} onClick={() => removeFolder(sf)} aria-label={`Xóa thư mục ${sf.name}`} title="Xóa">
                        <Trash2 strokeWidth={1.9} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== Tệp ===== */}
          {files.length > 0 && (
            <>
              <div className="sec" style={{ marginTop: 18 }}>
                <h2><span className="secdot" style={{ background: "var(--brand)" }} /><FileText strokeWidth={1.8} style={{ width: 15, height: 15 }} />Tệp</h2>
                <span className="cnt">{files.length}</span>
              </div>
              <div className="card">
                {files.map((f) => {
                  const size = fmtSize(f.size);
                  const label = assignLabel(f);
                  return (
                    <div className="setrow" key={f.id} style={{ flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: "1 1 220px", minWidth: 0 }}>
                        <FileText strokeWidth={1.8} style={{ width: 20, height: 20, color: "var(--brand)", flex: "none", marginTop: 1 }} />
                        <div style={{ minWidth: 0 }}>
                          <div className="l" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                          <div className="meta" style={{ marginTop: 5 }}>
                            <span className="chip st">{f.kind === "upload" ? "file" : "link"}</span>
                            {size && <span className="chip score">{size}</span>}
                            {f.shareId && <span className="chip st doing"><Share2 strokeWidth={1.8} style={{ width: 12, height: 12 }} />đã chia sẻ</span>}
                            {label && <span className="chip teach"><Tag strokeWidth={1.8} style={{ width: 12, height: 12 }} />{label}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <a className="btn line sm" href={fileHref(f)} target="_blank" rel="noopener noreferrer">Mở</a>
                        <button className="btn line sm" disabled={busy} onClick={() => shareFile(f)} aria-label={`Chia sẻ tệp ${f.name}`} title="Chia sẻ">
                          <Share2 strokeWidth={1.9} />
                        </button>
                        <button className="btn line sm" disabled={busy} onClick={() => setAssignFor(f)} aria-label={`Gắn lớp hoặc môn cho ${f.name}`} title="Gắn lớp/môn">
                          <Tag strokeWidth={1.9} />
                        </button>
                        <button className="btn line sm" disabled={busy} onClick={() => removeFile(f)} aria-label={`Xóa tệp ${f.name}`} title="Xóa">
                          <Trash2 strokeWidth={1.9} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== Sheet: tạo thư mục ===== */}
      {sheet === "folder" && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="sheet" role="dialog" aria-label="Tạo thư mục">
            <h3>Tạo thư mục</h3>
            <div className="field">
              <label>Tên thư mục</label>
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="VD: Tài liệu lớp DS501"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") submitFolder(); }}
              />
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={closeAll}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={submitFolder}>
                {pending ? "Đang lưu..." : "Tạo thư mục"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sheet: thêm link ===== */}
      {sheet === "link" && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="sheet" role="dialog" aria-label="Thêm link tài liệu">
            <h3>Thêm link</h3>
            <div className="field">
              <label>Tên tài liệu</label>
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="VD: Slide bài giảng tuần 1"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Đường dẫn (URL)</label>
              <input
                type="url"
                inputMode="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => { if (e.key === "Enter") submitLink(); }}
              />
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={closeAll}>Hủy</button>
              <button className="btn primary block" disabled={pending} onClick={submitLink}>
                {pending ? "Đang lưu..." : "Thêm link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sheet: gắn lớp/môn ===== */}
      {assignFor && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="sheet" role="dialog" aria-label={`Gắn lớp hoặc môn cho ${assignFor.name}`}>
            <h3>Gắn lớp / môn</h3>
            <div className="setrow" style={{ borderBottom: "none", paddingBottom: 4 }}>
              <div style={{ minWidth: 0 }}>
                <div className="l" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignFor.name}</div>
                <div className="d">chọn 1 lớp (dạy) hoặc 1 môn (học)</div>
              </div>
            </div>

            <div className="seg" role="tablist">
              <button
                role="tab"
                className={assignKind === "class" ? "on" : ""}
                onClick={() => { setAssignKind("class"); setAssignTarget(""); }}
              >Lớp dạy</button>
              <button
                role="tab"
                className={assignKind === "course" ? "on" : ""}
                onClick={() => { setAssignKind("course"); setAssignTarget(""); }}
              >Môn học</button>
            </div>

            {assignKind === "class" ? (
              <div className="field">
                <label>Lớp dạy</label>
                {classes.length === 0 ? (
                  <div className="d">Chưa có lớp nào — tạo lớp ở mục “Dạy học” trước.</div>
                ) : (
                  <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}>
                    <option value="">— Không gắn —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            ) : (
              <div className="field">
                <label>Môn học</label>
                {courses.length === 0 ? (
                  <div className="d">Chưa có môn nào — tạo môn ở mục “Học tập” trước.</div>
                ) : (
                  <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}>
                    <option value="">— Không gắn —</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            )}

            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn line block" disabled={pending} onClick={closeAll}>
                <X strokeWidth={1.9} />Hủy
              </button>
              <button className="btn primary block" disabled={pending} onClick={submitAssign}>
                {pending ? "Đang lưu..." : "Lưu nhãn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
