# QC Report — UI P2.1 Màn Hôm nay (13/10/2026)
Nhánh `ui/p2-1-today` (trên `ui/p2-0-foundation`). qa-verifier soát tĩnh qua git.

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint | PASS | tsc sạch, next build qua, lint không thêm lỗi |
| Schema / API | PASS | Không đổi schema. Action vẫn gọi `requireOwner`. Có revalidate `/today`. |
| Edge cases | PASS có ghi chú | Hạn 48 giờ không trùng và không sót. Khe trống đúng spec. |
| Error states | PASS có ghi chú | Thiếu try/catch → **đã sửa** |
| Design token | PASS | 0 màu cứng, 0 token compat, 1 điểm vàng |
| Reuse | PASS | |

## Verdict tổng: PASS có ghi chú

## Đã sửa sau QC
- **F6 (Trung bình):** khối xem trước trong `/ui-kit` gọi server action thật, nên giờ bọc `inert` (khoá bấm) và sửa nhãn.
- **F3, F4:** `NowCard`, `TaskRow`, `RestToday` có try/catch, kiểm `r.ok`, và báo lỗi bằng toast tiếng Việt.
- **F1:** vùng chạm 44px trên điện thoại cho Xong, Tập trung, ▶, Nghỉ 10 phút và khe trống.
- **F2:** `getTodayData` lấy 4 việc, nên danh sách Ưu tiên luôn đủ 3 hàng khi việc đầu lên thẻ gợi ý.
- **F5:** phím N bỏ qua khi đang mở listbox, menu, dialog hoặc combobox, khi đang gõ IME, và khi sự kiện đã bị chặn.
- **F7:** thêm 3 ca biên cho `freeSlots`: khe đúng 60 và 59 phút, khối tràn khỏi cửa sổ 07–22, khối sát nhau.
- **F8:** không cho bấm chồng khi một thói quen đang lưu.
- **F9:** khối Hạn trên điện thoại là chủ ý. Đã ghi vào US AC8.
