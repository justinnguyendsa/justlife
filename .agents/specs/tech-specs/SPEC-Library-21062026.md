# Tech Spec — Thư viện tài liệu (Library) · files + folders + share

**Date:** 21062026 · single-user local · dùng chung cho **Học (cao học)** và **Dạy (lớp)**.

## Phạm vi
Một thư viện hợp nhất: cây **folder** (lồng nhau) + **file** (upload thật HOẶC link URL). Tạo/xóa folder & file, **upload + download** file thật (lưu đĩa local, metadata DB), **chia sẻ** folder/file bằng **share link** (`/share/[shareId]`).

**Honest scope "share":**
- Local: share link mở/tải được trên máy + LAN ngay.
- Ra ngoài cho học viên: cần host + auth → **Phase 5**. P2/P3 chuẩn bị sẵn: shareId + cờ "chia sẻ cho lớp" (linkClassId).
- Upload lưu **đĩa local** (`data/library/`), KHÔNG sync qua Turso (chỉ metadata sync). P5 → object storage.

## Data model (personal.db)
| Bảng | Field |
|---|---|
| `lib_folder` | id, name, parentId?(null=gốc), shareId?(unique), createdAt |
| `lib_file` | id, folderId?(null=gốc), name, kind('upload'\|'link'), url?(link), storedName?(upload), mime?, size?, shareId?(unique), linkClassId?, linkCourseId?, createdAt |

> `linkClassId`/`linkCourseId`: gắn file với 1 lớp (dạy) hoặc 1 môn (học) để tổ chức + (P5) chia sẻ cho lớp.

## Hạ tầng file (BẢO MẬT — tự làm)
- Upload: **route handler** `POST /api/library/upload` (FormData: file + folderId). Giới hạn **25MB**; lưu `data/library/<id>__<safeName>`; chống path-traversal (sanitize name, chỉ ghi trong data dir). Metadata → `lib_file`.
- Download/xem: `GET /api/library/file/[id]` → stream file + content-type + content-disposition. Guard id hợp lệ.
- `data/` đã gitignore.

## Server actions (`actions/library.ts`)
- `createFolder({name,parentId?})` · `deleteFolder(id)` (xóa đệ quy + file con + file đĩa)
- `addLink({folderId?,name,url,linkClassId?,linkCourseId?})`
- `deleteFile(id)` (xóa file đĩa nếu upload)
- `toggleShare(kind:'folder'|'file', id)` → tạo/bỏ shareId
- `assignTo({fileId, classId?, courseId?})` (gắn lớp/môn)

## Queries (`db/library.ts`)
- `getFolder(id?|null)` → `{folder|null (root), crumbs[], subfolders[], files[]}`
- `resolveShare(shareId)` → file hoặc folder (+ contents) hoặc null

## Màn hình (route `/library`, nav "Tài liệu")
1. **/library** và **/library/[folderId]** — breadcrumb + lưới subfolder + danh sách file; nút **Tạo folder**, **Tải file lên** (upload), **Thêm link**; mỗi item: mở/tải, **Chia sẻ** (bật → copy link), gắn lớp/môn, xóa.
2. **/share/[shareId]** — trang xem chia sẻ: file → tải/mở; folder → liệt kê nội dung (đệ quy 1 cấp). Không cần auth (single-user local).

## AC
- AC-L1 Tạo folder lồng nhau; breadcrumb điều hướng.
- AC-L2 Upload file thật (≤25MB) → tải lại được; thêm link → mở tab mới.
- AC-L3 Chia sẻ file/folder → có link copy; mở `/share/[id]` thấy đúng nội dung.
- AC-L4 Gắn file với lớp/môn (chuẩn bị P5).
- AC-L5 Xóa folder → xóa file con (đĩa + DB). Tiếng Việt, token-only, responsive, light/dark.

## Nav
Thêm "Tài liệu" (icon FolderOpen) vào personal nav. (Khi nav quá dài, P4 sẽ gộp hub.)
