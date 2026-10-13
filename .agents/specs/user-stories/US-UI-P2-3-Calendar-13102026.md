---
id: US-UI-P2.3
feature: Màn Lịch mới (canvas J03)
date: 2026-10-13
depends_on: US-UI-P2.0, P2.1 (freeSlots), P2.2
design: canvas bản 27 — board "03 · Lịch"
---

# US-UI-P2.3 — Bấm vào khối là sửa được ngay

**Là** Minh, **tôi muốn** xem lịch ngày hoặc tuần, bấm vào một khối việc để đổi giờ, đánh dấu xong hay xoá ngay tại chỗ, và thấy các khe trống để xếp thêm việc, **để** time-block nhanh mà không phá giờ bận cố định.

## Tiêu chí chấp nhận
**AC1 — Thanh tiêu đề.** Hiện "Lịch" và ngày đang xem (hoặc khoảng ngày của tuần). Có nút ‹ Hôm nay ›, công tắc Ngày/Tuần, và nút **Thêm khối**.

**AC2 — Lưới ngày.**
- Hiện từ 07:00 đến 23:00.
- Khối cố định: nền nhạt theo màu mảng, không kéo được.
- Việc đã xếp: nền đặc theo màu mảng, chữ đạt tương phản. Kéo lên/xuống để đổi giờ: chuột kéo ngay, điện thoại giữ 0,3 giây rồi kéo. Khi kéo đè lên khối khác thì khối chuyển đỏ.
- Đang xem hôm nay thì có vạch đỏ ở giờ hiện tại.

**AC3 — Khối đang chọn.**
- Bấm (hoặc chạm) một việc đã xếp để mở bảng sửa: trên web là cột phải, trên điện thoại là sheet.
- Sửa giờ bắt đầu và giờ kết thúc. Chọn nhanh thời lượng 30 phút / 1 giờ / 1 giờ 30 / 2 giờ.
- Hiện ngay "Không trùng lịch" hoặc "Trùng: <tên khối>".
- Nút **Lưu**. Nút **Đánh dấu xong** (chỉ khi khối gắn với một việc). Nút **Xoá khối** (hỏi lại trước khi xoá).

**AC4 — Khe trống.**
- Cột phải (web) liệt kê các khe trống từ 1 giờ trở lên trong ngày đang xem.
- Hôm nay thì chỉ tính khe sau giờ hiện tại.
- Bấm vào một khe thì mở hộp Thêm khối, giờ bắt đầu điền sẵn.

**AC5 — Lưới tuần.**
- 7 cột. Hôm nay tô nền lam nhạt.
- Màu khối giống lưới ngày, không viết cứng màu.
- Bấm một ngày để xem lưới ngày đó.

**AC6 — Thêm khối.**
- Chọn việc (hoặc nhập tiêu đề + mảng), giờ bắt đầu và thời lượng.
- Bị trùng thì báo. Lưu xong thì hiện thông báo kèm giờ.

**AC7 — Đúng design system.** Dùng token Lam & Nắng, không còn `#fff` hay token cũ trong các file của Lịch. Copy tiếng Việt. Vùng chạm ≥ 44px trên điện thoại.

## UAT
1. Mở **Lịch**: thấy giờ bận cố định (nền nhạt) và việc đã xếp (nền đặc). Hôm nay có vạch đỏ ở giờ hiện tại.
2. Bấm một việc đã xếp: bảng "Khối đang chọn" hiện tên, giờ và trạng thái trùng.
3. Chọn **1 giờ 30**, bấm **Lưu**: khối dài ra, có thông báo.
4. Đổi giờ bắt đầu đè lên giờ làm cố định: bảng báo "Trùng: Giờ làm việc".
5. Bấm một khe trống ở cột phải: hộp Thêm khối mở, giờ bắt đầu đã điền.
6. Chuyển sang **Tuần**, bấm một ngày: về lưới ngày của ngày đó.
7. Trên điện thoại: chạm một khối thì sheet sửa hiện ra. Giữ khối rồi kéo để đổi giờ.
