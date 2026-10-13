# QC Report — UI P2.5 Màn Cài đặt (13/10/2026)

**Nhánh:** `ui/p2-5-settings`, đã gộp main (P2.0–P2.4 và bản sửa giờ VN).
**Người soát:** qa-verifier (Sonnet, medium). Soát tĩnh qua git bằng `git diff origin/main...origin/ui/p2-5-settings`, bỏ qua các commit merge.
**Đối chiếu:** `SPEC-UI-P2-5-Settings-13102026.md` và `US-UI-P2-5-Settings-13102026.md`.

| Chiều | Kết quả | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint / Test | ✅ | tsc sạch. vitest 76/76, có test mới cho wip, fixed-schedule, theme, maskEmail. Build qua. Lint 0 lỗi trên file đổi; 2 lỗi react-refresh ở `src/app/layout.tsx` có sẵn từ main. |
| Schema / API | ✅ | Không đổi schema. `setSetting` (ghi được khoá tuỳ ý) thay bằng `setWipLimit`, chỉ ghi `wip_limit`. `add/updateFixedSchedule` không còn nhận cột tuỳ ý. |
| Quyền / bảo mật | ✅ | 4 action ghi đều gọi `requireOwner()` ở dòng đầu. Email gốc không xuống client. |
| Edge cases | ✅ sau sửa | M1 và các mục Thấp xem bảng dưới. |
| Error states | ✅ | Toast và lỗi tại chỗ đều tiếng Việt. Lỗi mạng bắt bằng try/catch. |
| Design token | ✅ | Không hex/rgb, không emoji, không class compat, không `--highlight`, không `style=` trong file đổi. |
| Reuse | ✅ | Dùng lại Dialog, Input, Label, Button, Segmented, Toaster, `areaBarClass`, `WEEKDAYS`, `minToHHMM`. `hhmmToMin` giờ dùng chung. |

Mọi mục B01–B06, F01–F11 và AC1–AC8 đều đạt (một số kèm ghi chú bên dưới).

## Kết luận
- **Lần 1:** ⚠️ NEEDS-FIX nhẹ: 0 lỗi chặn, 1 lỗi Vừa, 12 lỗi Thấp hoặc ghi nhận.
- **Sau sửa:** ✅ PASS.

## Phát hiện và kết quả xử lý
| # | Mức | Vấn đề | Đã làm |
|---|---|---|---|
| M1 | Vừa | Ô giờ có `step={900}`. Giờ lẻ (ví dụ 14:20) bị trình duyệt chặn bằng bong bóng tiếng Anh, nên `validateFixed` không chạy. | Bỏ `step`. Thêm `noValidate` cho form để mọi lỗi đi qua `validateFixed` (tiếng Việt). |
| L1 | Thấp | Link ở trang Khác có `aria-label`, che mất tên khung và giờ với trình đọc màn hình. | Bỏ `aria-label`, thêm dòng `sr-only` bên trong link. |
| L2 | Thấp | Nút Xoá khung dùng `ghost` kèm `text-destructive`. | Đổi sang `variant="destructive-ghost"`. |
| L3 | Thấp | `maxLength={80}` viết cứng. | Dùng `FIXED_LABEL_MAX`. |
| L4 | Thấp | `toMin` viết trùng ở FixedEditor và BlockEditor. | Gộp thành `hhmmToMin` trong `lib/format.ts`. |
| L5 | Thấp | Tab khác đổi giao diện thì nút chọn đổi, nhưng màu thật của tab này không đổi. | Sự kiện `storage` với khoá `jl-theme` gọi `repaintFromStorage()`. |
| L6 | Thấp | Bấm nhanh hai lựa chọn WIP: lần lưu đầu lỗi sẽ ghi đè lựa chọn sau đã lưu xong. | Thêm ref `saved` và `latest`. Chỉ trả về giá trị đã lưu khi lựa chọn bị lỗi vẫn là lựa chọn mới nhất. |
| L7 | Thấp | Hộp thoại vẫn đóng được (Esc, bấm nền) khi đang lưu. Nút X chỉ 16px. | Chặn đóng khi `pending`. Kích thước nút X của Dialog (dùng chung) để lượt tinh chỉnh chung. |
| L8 | Thấp | `tokens.css` thiếu `color-scheme`, nên ô giờ và thanh cuộn gốc không theo chế độ tối. | Thêm `color-scheme: light` ở `:root` và `dark` ở khối tối. |
| L9 | Thấp | Còn thiếu ca test. | Thêm `parseWipLimit("10")`, `parseWipLimit("")`; `validateFixed` với NaN, end < start, nhãn đúng 80 ký tự, mask 127. Phần gộp của `updateFixedSchedule` chưa test, để sau. |
| L10 | Thấp | Lỗi tại chỗ không tự mất khi sửa trường. | Xoá lỗi khi đổi tên, mảng, giờ hoặc ngày. |
| L11 | Ghi nhận | Hai ngày liền nhau hiện "T2, T3"; chỉ gộp khi từ 3 ngày. | Giữ nguyên. Đã có test chủ đích. |
| L12 | Ghi nhận | Tên email đúng 5 ký tự thì hiện 4 ký tự. | Đúng spec, giữ nguyên. |
| I1 | UAT | Email lấy từ `session.user.email`. | UAT bước 7 xác nhận trên production. |
| I2 | Ghi nhận | Xoá khung không có bước xác nhận. Lỗi lưu hiện tại chỗ, không qua toast. | Theo F04, giữ nguyên. |
| I3 | Ghi nhận | `themeColor` meta theo hệ điều hành. | Có sẵn từ main, bỏ qua. |

## Kiểm chứng
- QC chạy `THEME_SCRIPT` trong sandbox `vm` với 9 ca, tất cả đúng:
  - Không có giá trị hoặc giá trị lạ → giao diện sáng.
  - `dark` → giao diện tối.
  - `system` → theo hệ điều hành.
  - Sự kiện `change` chỉ áp lại khi lựa chọn đang là `system`.
  - `localStorage` hoặc `matchMedia` không dùng được → không lỗi.
- Builder xem trên `/ui-kit`:
  - Web 2 cột, điện thoại 1 cột, không cuộn ngang.
  - Lựa chọn `dark` và `system` áp đúng khi tải trang, nút chọn hiện đúng.
  - Console không có lỗi.
- Tương phản các token chính đều ≥ 4.5 ở cả sáng và tối.

## Chuyển sang UAT (cần chủ dự án đăng nhập)
1. Hệ điều hành đổi sáng/tối khi đang mở app (AC5).
2. Lưu được khung giờ lẻ, ví dụ 14:20 (M1).
3. Email che hiện đúng trên production, và Đăng xuất về `/login` (AC6).
