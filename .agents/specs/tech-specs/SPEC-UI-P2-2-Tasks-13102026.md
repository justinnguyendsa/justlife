---
id: SPEC-UI-P2.2
user_story: US-UI-P2-2-Tasks-13102026.md
date: 2026-10-13
depends_on: SPEC-UI-P2.1 (nhánh ui/p2-1-today)
---

# SPEC-UI-P2.2 — Màn Việc + tab Hạn + Đã xong

## Backend (làm trước)
| ID | Việc | File |
|---|---|---|
| B01 | `updateTask` nhận thêm `area`. Chỉ chấp nhận `work`, `teach`, `study`, `growth`; giá trị khác trả `{ ok: false, error }`. Vẫn gọi `requireOwner()` | `src/app/actions/tasks.ts` |
| B02 | `listDoneTasks(limit = 50)`: lấy việc có `status = done`, sắp theo `doneAt` giảm dần | `src/db/queries.ts` |
| B03 | Hoàn tác: dùng `setTaskStatus(id, "todo")` có sẵn (đã xoá `doneAt`) | — |
| B04 | `refresh()` của actions/tasks giữ `/today`, `/tasks`, `/calendar`, `/deadlines` | không đổi |

## Frontend
| ID | Việc | File |
|---|---|---|
| F01 | Trang Việc: đọc `?tab=` (`tat-ca` mặc định, `han`, `xong`), lấy dữ liệu song song, tiêu đề có số đếm | `src/app/(app)/tasks/page.tsx` |
| F02 | Thanh tab (Link): đếm hạn ≤ 7 ngày (gồm quá hạn) | `src/app/(app)/tasks/TaskTabs.tsx` |
| F03 | Tab Tất cả: tìm không dấu, lọc mảng, 3 nhóm, ✓ xong, chọn việc | `src/app/(app)/tasks/TasksClient.tsx` (viết lại) |
| F04 | Chi tiết việc dùng chung cho cột phải (web) và sheet (điện thoại), tự lưu | `src/app/(app)/tasks/TaskDetail.tsx` |
| F05 | Tab Hạn: 3 nhóm, mỗi dòng có chip hạn, chip mảng hoặc môn, link tới nguồn | `src/app/(app)/tasks/DueList.tsx` |
| F06 | Tab Đã xong: danh sách + Hoàn tác | `src/app/(app)/tasks/DoneList.tsx` |
| F07 | `/deadlines` chuyển hướng sang `/tasks?tab=han`. Sửa link ở Hôm nay và trang Khác | `src/app/(app)/deadlines/page.tsx`, `today/page.tsx`, `more/page.tsx` |
| F08 | Bỏ nút tạm "Hạn" và "Tập trung" ở thanh tiêu đề Việc (P2.0). Tập trung vào qua nút Bắt đầu và Hôm nay | `src/app/(app)/tasks/page.tsx` |
| F09 | Hook `useMediaQuery` để chọn cột phải hay sheet | `src/lib/use-media-query.ts` |
| F10 | Dòng việc dùng chung với Hôm nay (`TaskRow`): thêm prop `onOpen`, `selected`, `showFocus`, `onDone`. Việc đang làm có viền lam | `src/app/(app)/today/TaskRow.tsx` |

## Quy tắc tự lưu
- **Ô chữ** (tên, ghi chú): lưu khi rời ô hoặc nhấn Enter (riêng với tên). Không lưu nếu giá trị không đổi.
  - Tên rỗng thì không lưu, khôi phục tên cũ và báo lỗi.
- **Chọn** (mảng, công sức, tác động) và **hạn**: lưu ngay khi đổi.
- **Chữ trạng thái**: "Đang lưu…" → "Đã lưu" → "Chưa lưu được" (kèm toast).
- Điểm ưu tiên trên giao diện tính bằng `calcPriorityScore` giống server.
- Hạn = `Date.parse("YYYY-MM-DDT23:59:59+07:00")` (23:59:59 giờ VN, không phụ thuộc trình duyệt). Hiển thị bằng `dateKey`. Chỉ lưu khi ngày đủ và năm ≥ 2000.
- Công sức và Tác động chưa đặt thì để trống. Điểm chỉ có khi đặt đủ cả hai.
- Các lần lưu được xếp hàng tuần tự ở client.

## QC
- `tsc`, `vitest`, `next build` đều qua. Lint không thêm lỗi.
- Không dùng token compat. Không hardcode màu. Nút chỉ có icon thì có `aria-label`. Tab dùng `aria-current`.
- `updateTask` từ chối `area` không hợp lệ.
