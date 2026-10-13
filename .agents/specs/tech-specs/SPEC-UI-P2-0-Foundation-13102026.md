---
id: SPEC-UI-P2.0
user_story: US-UI-P2-0-Foundation-13102026.md
date: 2026-10-13
design_source: canvas bản 27 — project/jl.css (token), J01–J08 (khung)
---

# SPEC-UI-P2.0 — Token Lam & Nắng + khung app mới

## Nguyên tắc
- **Một nguồn token:** `src/styles/tokens.css`. Component chỉ dùng token, qua utility Tailwind hoặc `var(--…)`.
- **Giữ ngữ nghĩa shadcn.** `--accent` của shadcn vẫn là nền hover nhạt (menu, ghost button). Vàng nắng "làm ngay" là token mới **`--highlight`**, để hover của mọi component shadcn không bị vàng.
- **Lớp cầu nối** trong `globals.css` (`--brand`, `--surface`, `--module-*`…) giữ nguyên tên, chỉ trỏ sang token mới. Không thêm tên cũ mới.

## Bảng token (giá trị lấy nguyên từ canvas `jl.css`)

| Nhóm | Token mới / đổi giá trị |
|---|---|
| Nền / chữ | `--background` `--foreground` `--card` `--popover` (+ `-foreground`) |
| Chính | `--primary` `--primary-foreground` · **mới** `--primary-soft` `--primary-soft-foreground` |
| Làm ngay | **mới** `--highlight` `--highlight-foreground` `--highlight-soft` `--highlight-soft-foreground` |
| Trạng thái | `--destructive` `--success` `--warning` (+ `-foreground`) · **mới** `*-soft`, `*-soft-foreground` |
| Mảng | `--area-{work,teach,study,growth}` · **mới** `-soft`, `-on` (chữ trên nền đặc) · `-foreground` (chữ trên nền soft) |
| Khác | `--border` `--input` `--ring` `--overlay` (mới) · `--chart-1..5` trỏ vào mảng · `--sidebar-*` (mục đang chọn = primary-soft) |

Font: Inter (`--font-inter`) + **Geist Mono** (`--font-geist-mono`, mới), nạp bằng `next/font/google`. Đồng thời sửa `--font-sans` đang ghi tên cứng `"Inter"`, thứ không khớp font do `next/font` tự host.

## Bảng task

| ID | Việc | File |
|---|---|---|
| T01 | Viết lại token sáng + tối theo Lam & Nắng | `src/styles/tokens.css` |
| T02 | Nối token mới vào Tailwind (`@theme`); sửa `--font-sans`, thêm `--font-mono` Geist Mono; `--content-max` 1120px | `src/app/globals.css` |
| T03 | Nạp Geist Mono; `themeColor` theo nền mới | `src/app/layout.tsx` |
| T04 | Menu mới: `NAV_MAIN` (4 mục), `NAV_FOOT` (justudy ↗, **Tài liệu — tạm tới F1**, Cài đặt), `BOTTOM_ITEMS` (5 mục); quy tắc tô sáng theo nhóm đường dẫn. Việc có nút **Hạn** và **Tập trung** ở thanh tiêu đề (tạm tới P2.2) | `src/components/Nav.tsx`, `src/app/(app)/tasks/page.tsx` |
| T05 | Khung: thanh bên mới, bỏ `ModeSwitch`, main rộng tối đa 1120px | `src/app/(app)/layout.tsx`, xoá `src/components/ModeSwitch.tsx` |
| T06 | `PageHeader` thành thanh tiêu đề gọn (desktop: dính trên cùng, 56px, tên + tóm tắt cùng dòng; mobile: tiêu đề lớn) | `src/components/PageHeader.tsx` |
| T07 | Trang Khác theo IA mới | `src/app/(app)/more/page.tsx` |
| T08 | Hub "Phát triển" đổi tên thành **Cuộc sống** (tạm, chờ F3) | `src/app/(app)/develop/page.tsx` |
| T09 | Button thêm variant `highlight`. Badge thêm `ok`, `warn`, `danger`, `primary`, `muted`; chip mảng dùng token soft | `src/components/ui/button.tsx`, `badge.tsx` |
| T10 | Cập nhật `design-system.md` (chốt Lam & Nắng, bảng token, quy tắc "một điểm vàng mỗi màn") | `.agents/context/design-system.md` |

## Ánh xạ tô sáng menu
- **Cuộc sống:** `/develop`, `/habits`, `/rest`, `/study`
- **justudy:** `/teaching`
- **Khác (mobile):** `/more`, `/deadlines`, `/library`, `/settings`, `/teaching`
- **Việc:** `/tasks`, `/focus`

## QC
- `tsc`, `vitest`, `next build` đều qua. Lint không thêm lỗi trên file đã đổi.
- Grep diff: không có hex/rgb/oklch ngoài `tokens.css`. Không có `linear-gradient` mới.
- Mọi route trong `(app)` vẫn có lối vào: từ menu, từ trang Khác, hoặc từ màn cha.
- Tương phản chữ trên `--highlight`, `*-soft`, `--area-*-on` giữ đúng giá trị đã kiểm ở bước chọn màu (≥ 4.5:1 cho chữ).

## Ngoài phạm vi
Thiết kế lại nội dung từng màn (P2.1–2.6), ô tìm kiếm Ctrl K (F5, cần backend), màn Cuộc sống thật (F3).
