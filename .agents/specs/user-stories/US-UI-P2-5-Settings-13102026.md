---
id: US-UI-P2.5
feature: Màn Cài đặt + phần Giao diện/Giờ bận ở trang Khác (canvas J08)
date: 2026-10-13
depends_on: US-UI-P2.0
design: canvas bản 27 — board "08 · Cài đặt"
---

# US-UI-P2.5 — Chỉnh giờ bận, giới hạn, giao diện, tài khoản ở một chỗ

**Là** Minh, **tôi muốn** một trang Cài đặt gọn. Ở đó tôi sửa được giờ bận cố định (giờ làm, giờ dạy, giờ học), chọn số việc được làm cùng lúc, chọn sáng / tối / theo máy, và đăng xuất. **Để** Lịch né đúng giờ bận và app không cho tôi ôm quá nhiều việc.

> Phần **Đồng bộ với justudy** trên canvas để sang F6. Trang này chưa hiện phần đó: không hiện nút giả, không ghi "sẵn sàng".

## Tiêu chí chấp nhận
**AC1 — Bố cục.**
- Web: hai cột. Trái là thẻ **Giờ bận cố định**. Phải là ba thẻ **Giới hạn đang làm**, **Giao diện**, **Tài khoản**.
- Điện thoại: các thẻ xếp thành một cột theo đúng thứ tự đó.

**AC2 — Giờ bận cố định.**
- Mỗi khung hiện: vạch màu theo mảng, tên, giờ (font mono), 7 ô T2…CN (ô sáng là ngày có lặp), nút **Sửa**.
- Chưa có khung nào thì hiện câu hướng dẫn.

**AC3 — Thêm / sửa / xoá khung.**
- **Thêm khung** hoặc **Sửa** mở hộp thoại gồm: Tên, Mảng, Bắt đầu, Kết thúc, Lặp lại (chọn ngày).
- Báo lỗi ngay tại chỗ (tiếng Việt) khi: thiếu tên, giờ kết thúc không sau giờ bắt đầu, hoặc chưa chọn ngày nào.
- Khi sửa có thêm nút **Xoá khung**.
- Lưu xong thì danh sách cập nhật, có thông báo. Lịch và Hôm nay né khung mới.

**AC4 — Giới hạn đang làm.**
- Chọn **1 / 2 / 3 / Không giới hạn**. Chọn là lưu ngay, có thông báo.
- Khi đã đủ số việc đang làm, bấm Bắt đầu việc mới thì app nhắc tạm dừng một việc trước (như hiện nay).
- Chọn "Không giới hạn" thì không nhắc nữa.

**AC5 — Giao diện.**
- Chọn **Sáng / Tối / Theo máy**. Đổi màu ngay, không cần tải lại.
- Lựa chọn được nhớ trên máy này và giữ sau khi tải lại (không nháy màu sai).
- "Theo máy" đi theo cài đặt sáng / tối của hệ điều hành, kể cả khi hệ điều hành đổi lúc đang mở app.

**AC6 — Tài khoản.**
- Hiện "Đăng nhập bằng Google" kèm email đã che bớt (ví dụ `minh•••••@gmail.com`). Có nút **Đăng xuất**.
- Khi chạy trên máy mà đăng nhập chủ sở hữu đang tắt thì ghi rõ điều đó, không có nút Đăng xuất.
- Nút Đăng xuất chỉ nằm ở Cài đặt (thanh bên không còn nút này, giống canvas).

**AC7 — Trang Khác (điện thoại).**
- Dưới danh sách lối tắt có phần **Giao diện** (Sáng / Tối / Theo máy) và phần **Giờ bận cố định** dạng gọn: tên, ngày, giờ.
- Bấm vào phần giờ bận thì mở Cài đặt.

**AC8 — Đúng design system.** Không emoji, không màu viết cứng, copy tiếng Việt, vùng chạm ≥ 44px trên điện thoại. Màn này không có điểm vàng.

## UAT
1. Mở **Cài đặt** trên web: thấy hai cột như mô tả ở AC1.
2. Bấm **Thêm khung**. Nhập "Dạy lớp Python", chọn mảng Dạy, 14:00–15:30, chọn T3 và T5, rồi Lưu. Khung mới hiện trong danh sách, ô T3 và T5 sáng. Mở **Lịch** ngày thứ Ba thấy khung giờ bận đó.
3. Bấm **Sửa** ở khung vừa thêm, đổi kết thúc thành 13:00 rồi Lưu: hiện lỗi "Giờ kết thúc phải sau giờ bắt đầu", không lưu.
4. Bấm **Xoá khung**: khung biến mất.
5. Ở **Giới hạn đang làm** chọn **1**. Sang Việc, bắt đầu việc thứ hai: app nhắc tạm dừng một việc trước. Quay lại chọn **Không giới hạn**, bắt đầu lại: được.
6. Ở **Giao diện** chọn **Tối**: app tối ngay. Tải lại trang: vẫn tối. Chọn **Theo máy**: app theo hệ điều hành.
7. Ở **Tài khoản** thấy email đã che. Bấm **Đăng xuất**: về trang đăng nhập.
8. Trên điện thoại mở **Khác**: thấy Giao diện và danh sách giờ bận gọn ở cuối trang.
