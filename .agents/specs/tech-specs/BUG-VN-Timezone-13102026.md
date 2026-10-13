---
id: BUG-VN-Timezone
date: 2026-10-13
found_by: regression-detector (gate Phase 1 Perf)
severity: cao — ảnh hưởng trụ time-block (R-JL-RESPECT-SCHEDULE-01)
---

# Lỗi: "đầu ngày" và "thứ mấy" tính theo giờ máy chủ, không theo giờ Việt Nam

## Hiện tượng
Server Vercel chạy giờ **UTC**. `startOfDay`, `weekdayBit` (dùng bởi `maskHasDate`, `detectConflicts`), `getMonday` (Lịch) dùng `setHours` / `getDay` theo giờ của máy:
- "Hôm nay" trên server bắt đầu lúc **07:00 giờ Việt Nam**, không phải 00:00.
- Lịch cố định 08:30 hiển thị thành **15:30** (cộng từ nửa đêm UTC, rồi định dạng theo giờ VN).
- Từ 00:00 đến 07:00 giờ VN, server coi là ngày hôm trước, nên lịch cố định có thể **rơi sang thứ khác**, và kiểm tra trùng lịch sai.
- Cổng học viên: dải 7 ngày của tuần lệch một ngày trong khoảng 00:00–07:00 giờ VN.
- `GET /api/personal/today?date=YYYY-MM-DD` đọc ngày theo giờ máy.

Ở máy local (đặt giờ Việt Nam) thì không thấy lỗi, nên bị sót.

## Nguyên nhân gốc
Phép tính ngày dựa vào múi giờ của tiến trình. Việt Nam cố định UTC+7, không có giờ mùa hè, nên tính theo offset cố định là đúng và chạy được ở cả server lẫn trình duyệt.

## Cách sửa
`src/lib/scheduler.ts`:
- `startOfDay` tính theo UTC+7.
- Thêm `vnWeekday`, `vnDayOfMonth`, `startOfWeek` (thứ Hai 00:00 VN) và `parseVnDate`.
- `weekdayBit` dùng `vnWeekday`.

Áp vào các chỗ đang tự tính ngày theo giờ máy:
- `calendar/page.tsx` và `CalendarClient.tsx`: `getMonday` → `startOfWeek`; nút "Hôm nay" dùng `startOfDay`.
- `CalendarWeekView.tsx`: hôm nay, tên thứ, ngày trong tháng.
- `portal/(student)/page.tsx`: dải 7 ngày của tuần.
- `api/personal/today`: dùng `parseVnDate`, trả 400 nếu `date` sai định dạng.

## Chống tái diễn
`tests/unit/scheduler-tz.test.ts` đặt `TZ=UTC` (giả lập server). Có 7 test, cả 7 đều **trượt với code cũ** và **qua với code mới**.

## Không đổi
Dữ liệu đã lưu (epoch ms UTC), `dateKey` (đã dùng `Intl` với `Asia/Ho_Chi_Minh`), định dạng hiển thị.
