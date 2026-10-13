---
id: SPEC-UI-P2.1
user_story: US-UI-P2-1-Today-13102026.md
date: 2026-10-13
depends_on: SPEC-UI-P2.0 (nhánh ui/p2-0-foundation)
---

# SPEC-UI-P2.1 — Màn Hôm nay

## Dữ liệu
Không đổi schema. Server lấy song song (`Promise.all`): `getTodayData`, `getUnifiedDeadlines`, `listHabits`, `getRest`.

Hành động có sẵn, chỉ thêm revalidate `/today`:
- `setTaskStatus(id, "done" | "doing")`: khi chạm giới hạn đang làm thì trả `wip_exceeded`. UI báo "Đã đủ N việc đang làm".
- `toggleHabitToday(id)`, `addRest({ minutes: 10 })`.

## Bảng task
| ID | Việc | File |
|---|---|---|
| T01 | Trang Hôm nay: lấy dữ liệu song song, tính hạn 48 giờ, timeline + khe trống, bố cục 2 cột (web) / 1 cột (điện thoại) | `src/app/(app)/today/page.tsx` |
| T02 | Thẻ **Đang làm**: nền `highlight-soft`, viền `highlight`, nút `highlight` (điểm vàng duy nhất) | `src/app/(app)/today/NowCard.tsx` (client) |
| T03 | Hàng việc ưu tiên: vạch màu mảng, chip, điểm, nút ▶ (bắt đầu tập trung) và ✓ (xong) | `src/app/(app)/today/TaskRow.tsx` (client) |
| T04 | Thói quen hôm nay: danh sách có ô tick (web), chip (điện thoại) | `src/app/(app)/today/HabitsToday.tsx` (client) |
| T05 | Nghỉ ngơi: tiến độ phút/60, nút Nghỉ 10 phút | `src/app/(app)/today/RestToday.tsx` (client) |
| T06 | Tính khe trống trong ngày (hàm thuần) + unit test | `src/lib/day-slots.ts`, `tests/unit/day-slots.test.ts` |
| T07 | Nút **Thêm việc** ở thanh tiêu đề và phím **N** mở hộp Thêm việc (sự kiện `jl:add-task`) | `src/components/AddTask.tsx`, `src/components/AddTaskButton.tsx` |
| T08 | Revalidate `/today` khi tick thói quen hoặc ghi nghỉ | `src/app/actions/habits.ts` |
| T09 | Định dạng ngày ngắn "Thứ Năm, 09/10" | `src/lib/format.ts` (`fmtDayShort`) |
| T10 | Màu khối lịch: nền `--area-*`, chữ `--area-*-on`. Khe trống là viền đứt. | trong T01 |

## Quy tắc
- **Khe trống** (`freeSlots`):
  - Tính trong khoảng 07:00–22:00 giờ VN của ngày đang xem, chỉ phần sau mốc `now`.
  - Trừ đi các khối đã có (gộp các khối chồng nhau). Giữ khe từ 60 phút trở lên. Tối đa 2 khe.
- **Hạn 48 giờ** = quá hạn ∪ (`dueAt` ≤ `now` + 48 giờ), sắp tăng dần theo hạn, tối đa 5 dòng. Có link "Xem tất cả" sang `/deadlines`.
- Việc trong "Ưu tiên" lấy từ `top` (đã loại việc đang làm).
- Không dùng tên token compat (`--brand`, `--module-*`, `--surface`…) trong các file của màn này.

## QC
- `tsc`, `vitest` (thêm test `day-slots`), `next build` đều qua. Lint không thêm lỗi.
- Không có màu viết cứng. Copy tiếng Việt. Nút chỉ có icon thì có `aria-label`.
- Các nút hành động có trạng thái chờ (`useTransition`) và báo lỗi bằng toast.
