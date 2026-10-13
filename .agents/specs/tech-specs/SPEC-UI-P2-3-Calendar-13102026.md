---
id: SPEC-UI-P2.3
user_story: US-UI-P2-3-Calendar-13102026.md
date: 2026-10-13
depends_on: SPEC-UI-P2.2 (nhánh ui/p2-2-tasks)
---

# SPEC-UI-P2.3 — Màn Lịch

## Backend
Không đổi. Các action dùng lại:
- `updateTimeBlock(id, startAt, endAt)` → `{ ok, conflicts }`
- `deleteTimeBlock(id)`
- `createTimeBlock(...)`
- `setTaskStatus(taskId, "done")`

Tất cả đều gọi `requireOwner()`.

## Frontend
| ID | Việc | File |
|---|---|---|
| F01 | Trang: chỉ lấy dữ liệu, `PageHeader` chuyển vào client (cần trạng thái ngày/tuần) | `src/app/(app)/calendar/page.tsx` |
| F02 | Thanh tiêu đề: ‹ Hôm nay ›, công tắc Ngày/Tuần, Thêm khối; tóm tắt = ngày (`fmtDayShort`) hoặc khoảng tuần | `src/app/(app)/calendar/CalendarClient.tsx` |
| F03 | Lưới ngày: Tailwind + token. Khối cố định dùng `areaSoftClass`, việc đã xếp dùng `areaSolidClass`, trùng dùng `bg-destructive`. Vạch giờ hiện tại. Giữ nguyên logic kéo-thả. Bấm hoặc chạm (không kéo) gọi `onSelect` | `src/components/CalendarDragDrop.tsx` |
| F04 | Bảng **Khối đang chọn**: giờ bắt đầu/kết thúc, chọn nhanh thời lượng, kiểm trùng tại chỗ (`detectConflicts`), Lưu, Đánh dấu xong, Xoá | `src/app/(app)/calendar/BlockEditor.tsx` |
| F05 | Cột phải (web): BlockEditor (hoặc gợi ý) + **Khe trống** (`freeSlots`). Điện thoại: BlockEditor trong Sheet | `CalendarClient.tsx` |
| F06 | Hộp **Thêm khối** dùng Dialog shadcn + token. Nhận giờ điền sẵn từ ô giờ hoặc khe trống | `CalendarClient.tsx` |
| F07 | Lưới tuần: đổi màu sang class token (bỏ `#fff`, `var(--accent)`, `AREA_VAR`). Không đổi logic ngày | `src/components/CalendarWeekView.tsx` |

## Quy tắc
- **Bấm hay kéo:**
  - Chuột: pointerup mà khối di chuyển < 4px thì tính là bấm (chọn).
  - Chạm: nhả trước 0,3 giây và không cuộn thì tính là chạm (chọn).
- **Giờ trong BlockEditor** dùng `<input type="time">`. Đổi sang epoch bằng `day0 + phút`, với `day0` = `startOfDay(block.startAt)` theo giờ Việt Nam.
  - Giờ kết thúc ≤ giờ bắt đầu thì báo lỗi, không lưu.
- **Kiểm trùng** loại trừ chính khối đang sửa (`ignoreBlockId`).
- **Khe trống:** xem hôm nay thì `now` = `Date.now()`; ngày khác thì `now` = `day0` (cả ngày).

## QC
- `tsc`, `vitest`, `next build` đều qua. Lint không thêm lỗi.
- Không hardcode màu (kể cả `#fff`), không dùng token compat trong `calendar/*`, `CalendarDragDrop.tsx`, `CalendarWeekView.tsx`.
- Nút chỉ có icon thì có `aria-label`. Khối kéo được có `aria-label` mô tả.

## Ngoài phạm vi
- "Gợi ý xếp lịch" tự động. Cần thuật toán + spec riêng (gắn với trụ time-block), để sau.
- Kéo dãn chiều cao khối (resize).
