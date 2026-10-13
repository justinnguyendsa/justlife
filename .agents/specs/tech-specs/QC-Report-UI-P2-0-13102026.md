# QC Report — UI P2.0 Nền giao diện Lam & Nắng
Nhánh `ui/p2-0-foundation` (so với `main`). qa-verifier soát tĩnh qua git; tsc, vitest 33/33, build và lint đã chạy trước, đều qua.

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck, build, lint | PASS | |
| Task T01–T10 | PASS | T04 và T06 có ghi chú |
| Token | PASS | Đủ sáng và tối. `--accent` giữ là nền hover nhạt. `@theme` không sai tên token nào. |
| Hardcode màu | PASS có ghi chú | `themeColor` là ngoại lệ hợp lệ. Còn `--hairline-on` dạng literal trong lớp compat. Không có gradient mới. |
| Điều hướng | NEEDS-FIX → **ĐÃ SỬA** | Trên web mất lối vào `/focus`, `/deadlines`, `/library`. |
| Reuse / ModeSwitch | PASS | Không còn chỗ nào import ModeSwitch. |
| A11y | PASS có ghi chú | |

## Verdict tổng: PASS có ghi chú

## Đã sửa sau QC (commit kế tiếp)
- [Cao] Việc có thêm nút **Hạn** và **Tập trung** ở thanh tiêu đề. Thanh bên có thêm **Tài liệu** (tạm, tới F1).
- [Thấp] `--focus-bg` và `--focus-sub` chuyển về `tokens.css`. `.chip.warn` bỏ hex dự phòng, dùng token. Xoá CSS chết `.modeswitch`.
- [Thấp] Nhóm cuối của thanh bên bọc trong `<nav aria-label="Điều hướng phụ">`.
- [Thấp] Ví dụ `PageHeader` trong `/ui-kit` đặt trong khung `md:px-7`.

## Để lại cho P2.x
- `select.tsx` vẫn cao `h-9` và còn `shadow-xs`.
- CSS chết của khung cũ: `.sidebar`, `.nav-link`, `.bottom-nav`. Dọn khi xoá lớp compat.
- `focus/page.tsx` còn `<main>` lồng và emoji (P2.4).
- Kiểm tra bằng mắt khi UAT: bóng của card, sheet và fab vẫn hiện (`--shadow-*` qua `@theme`).
