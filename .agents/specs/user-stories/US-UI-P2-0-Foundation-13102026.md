---
id: US-UI-P2.0
feature: Nền giao diện mới — Lam & Nắng (Phase 2.0 của đợt redesign)
date: 2026-10-13
status: approved (chủ dự án duyệt canvas "justlife · justudy — Thiết kế", bản 27)
design: https://claude.ai/artifact/5P5T6BASXrTzcphDhkQUSJ (trang Design system + justlife)
---

# US-UI-P2.0 — Mở app là thấy khung mới, gọn và đúng màu đã chốt

**Là** Minh, **tôi muốn** cả justlife dùng bảng màu Lam & Nắng, menu gọn chỉ còn 4 mục chính, và tiêu đề trang nằm trên một thanh mỏng, **để** bớt rối mắt và có nhiều chỗ hơn cho nội dung.

## Tiêu chí chấp nhận
**AC1 — Màu đã chốt.** Toàn app (sáng và tối) dùng token Lam & Nắng: lam `oklch(0.52 0.17 252)` làm màu chính, vàng nắng `oklch(0.84 0.16 84)` chỉ dành cho "việc cần làm ngay". Chữ trên nền vàng là màu mực tối. Không có gradient, và không có màu viết cứng trong component.

**AC2 — Chữ số.** Con số (giờ, điểm, đếm) dùng Geist Mono. Chữ thường dùng Inter, nạp qua `next/font`, có bảng mã tiếng Việt.

**AC3 — Menu web.** Thanh bên có: Hôm nay · Việc · Lịch · Cuộc sống. Bên dưới có lối **justudy ↗** (dạy và học) và **Cài đặt**. Không còn nút gạt "Cá nhân / Dạy học".

**AC4 — Menu điện thoại.** Thanh dưới có 5 mục: Hôm nay · Việc · Lịch · Cuộc sống · Khác. Trang **Khác** gồm: justudy (dạy và học), Hạn, Tài liệu, Cài đặt.

**AC5 — Thanh tiêu đề gọn.**
- Trên web: tên trang và dòng tóm tắt nằm trên một thanh cao 56px, nút hành động ở bên phải, thanh dính ở đầu trang khi cuộn.
- Trên điện thoại: tiêu đề lớn, dòng tóm tắt đặt bên dưới.

**AC6 — Không mất lối vào.**
- Mọi màn cũ vẫn mở được: Tập trung (từ Hôm nay hoặc từ việc), Hạn, Thói quen, Nghỉ ngơi, Học, Dạy học, Tài liệu.
- Mục đang mở được tô sáng đúng trên cả web lẫn điện thoại.

**AC7 — Không đổi hành vi.** Dữ liệu, quyền truy cập và các thao tác giữ nguyên. Test, typecheck và build đều qua.

## UAT — các bước kiểm thử
1. Mở **Hôm nay** trên máy tính: thấy thanh bên mới (4 mục + justudy + Cài đặt), không còn nút gạt Cá nhân / Dạy học.
2. Bấm từng mục trên thanh bên: mục đang mở được tô màu lam nhạt.
3. Bấm **justudy ↗**: mở khu Dạy học (lớp học).
4. Thu nhỏ trình duyệt về cỡ điện thoại: thanh dưới có 5 mục. Bấm **Khác**: thấy justudy, Hạn, Tài liệu, Cài đặt.
5. Vào **Cài đặt**, bật chế độ **Tối**: màu đổi đúng, chữ vẫn đọc rõ.
6. Cuộn một trang dài trên máy tính: thanh tiêu đề vẫn dính ở đầu trang.
