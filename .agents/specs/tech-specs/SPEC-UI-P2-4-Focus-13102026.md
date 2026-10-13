---
id: SPEC-UI-P2.4
user_story: US-UI-P2-4-Focus-13102026.md
date: 2026-10-13
depends_on: SPEC-UI-P2.3 (nhánh ui/p2-3-calendar)
---

# SPEC-UI-P2.4 — Màn Tập trung

## Backend
Không đổi schema. Các action dùng lại:
- `setTaskStatus(id, "done")`
- `createTask({ title, area, deadlineAt: null, effort: null, impact: null })`: ghi vào Hộp việc.
- `addRest({ minutes: 5 })`

Tất cả đều gọi `requireOwner()`.

**Lưu ý:** "Hôm nay đã tập trung" và số phiên lưu trên **trình duyệt** (`localStorage`, khoá theo ngày giờ VN), không lưu server.
- Đây chỉ là tiện ích trên máy đang dùng.
- Số liệu tập trung trên server (cho mảng Công việc, F3) sẽ làm ở feature sau.

## Frontend
| ID | Việc | File |
|---|---|---|
| F01 | Chuyển `/focus` sang route group `(focus)` có layout riêng, không có thanh bên hay thanh dưới. URL giữ nguyên `/focus`. Middleware vẫn chặn theo đường dẫn. | `src/app/(focus)/layout.tsx`, `src/app/(focus)/focus/page.tsx` |
| F02 | Server lấy `listTasks()` (một truy vấn), tách việc đang làm và "tiếp theo" (việc chưa làm có điểm cao nhất). | `page.tsx` |
| F03 | Khung: Thoát tập trung (link về `/today`), dòng phiên, thanh dưới (Tiếp theo + Hôm nay đã tập trung). | `FocusClient.tsx` |
| F04 | Đồng hồ Pomodoro 25 phút. Lưu `{ taskId, endsAt, remainingMs, running }` vào `sessionStorage` để giữ khi tải lại. Hết giờ thì chuyển sang trạng thái "Hết phiên". | `src/lib/focus-timer.ts` + `FocusClient.tsx` |
| F05 | Hết phiên: +25 phút, +1 phiên (`localStorage`). Có nút Nghỉ 5 phút (`addRest`) và Phiên tiếp. | `FocusClient.tsx` |
| F06 | Xong việc này: cộng số phút đã chạy của phiên dở, `setTaskStatus(done)`, sang việc kế tiếp. | `FocusClient.tsx` |
| F07 | Ghi nhanh (Enter): gọi `createTask` vào Hộp việc, xoá ô nhập, toast. | `FocusClient.tsx` |
| F08 | Hàm thuần cho đồng hồ (còn lại, %, định dạng mm:ss), có unit test | `src/lib/focus-timer.ts`, `tests/unit/focus-timer.test.ts` |

## Quy tắc
- Thanh tiến độ dùng `bg-highlight`. Đây là điểm vàng duy nhất của màn; nút chính dùng màu lam.
- Đọc và ghi `localStorage` / `sessionStorage` đều bọc try/catch. Trình duyệt chặn bộ nhớ thì màn vẫn chạy, chỉ không nhớ được.
- Khoá ngày dùng `dateKey()` (giờ VN).
- Hết phiên phát hiện bằng `endsAt <= now` khi tick 1 giây. Tab ẩn thì tick có thể chậm, nhưng thời gian vẫn đúng vì tính theo `endsAt`.

## QC
- `tsc`, `vitest` (thêm test `focus-timer`), `next build` đều qua. Lint không thêm lỗi.
- Không emoji, không hardcode màu, không dùng token compat. Copy tiếng Việt. Vùng chạm ≥ 44px.
- `/focus` vẫn bị chặn với người không phải chủ (middleware theo path).
