# QC Report — UI 3c.1 + 3c.2: primitive Radix sang Base UI (14/10/2026)

**Phạm vi:**
- 3c.1: đã merge (PR #16): `git diff 1a20807^..d0a97df -- src package.json`.
- 3c.2: PR #17, nhánh `ui/3c2-dialog`: `git diff origin/main...origin/ui/3c2-dialog`.

**Người soát:** qa-verifier (Sonnet). Soát tĩnh qua git. Có đọc `node_modules/@base-ui/react` v1.8.0 và biên dịch Tailwind từ `globals.css` ở thư mục tạm. Không checkout.

**Đối chiếu:** `ADR-005-Next16-BaseUI-13102026.md` §6 và §8, `design-system.md`, `tokens.css`.

| Chiều | Kết quả | Chi tiết |
|---|---|---|
| Typecheck | ✅ | 0 lỗi ở `dialog`, `sheet`, `button`, `label`, `badge`, `AddTask`, `OverlayPreview` và các nơi gọi. |
| Build | ✅ | Vercel preview của PR #17 SUCCESS. Smoke 8/8 trên `next build` + `next start`. |
| Lint | ✅ | Còn 4 lỗi `react-refresh/only-export-components`, đều có sẵn từ main (`layout.tsx` metadata/viewport, `badge.tsx`, `button.tsx`). |
| Test | ✅ | vitest 224/224. |
| Schema / API | ✅ | Đúng các phần Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close. `onOpenChange(open, eventDetails)` vẫn đúng ở cả 4 nơi gọi. `DialogTrigger render={<Button/>}` hợp lệ. |
| Edge cases | ✅ sau sửa | M2, L1 đã xử lý. Còn L2, để sau. |
| Error states | ✅ sau sửa | M1: toast đã nổi trên lớp phủ. |
| Design token | ✅ | `bg-overlay` thay `bg-black/50`. Không thêm mã màu hex/oklch/rgb mới. Nút X rộng 44px trên điện thoại. Sheet dưới giữ bo góc 22px. |
| Reuse | ✅ | Còn trùng lặp nhỏ (L4), gom khi có dịp. |

**Bảng 7 mục kiểm kỹ:**
1. Button (type mặc định, props, ref, dùng trong server component): ✅
2. Link-as-button: ✅
3. Dialog/Sheet: ✅
4. Token: ✅
5. Layout `isolate`: ❌ ở lần 1 → ✅ sau sửa
6. Phụ thuộc: ✅
7. Hồi quy Calendar và Tasks: ✅ (đọc mã)

## Kết luận
- **Lần 1:** ⚠️ NEEDS-FIX. 0 lỗi chặn, 2 lỗi Vừa (M1, M2), 4 lỗi Thấp, 1 ghi nhận, 1 mục chuyển UAT.
- **Sau sửa:** ✅ PASS.

## Phát hiện và kết quả xử lý
| # | Mức | Vấn đề | Đã làm |
|---|---|---|---|
| M1 | Vừa | `isolate` bọc cả `<Toaster />`. sonner không dùng portal, nên toast (z 999999999) bị nhốt trong lớp `isolate`, còn lớp phủ của Base UI (z-50, portal ra `body`) nằm trên. Khi hộp thoại/sheet đang mở, toast lỗi bị che. | Đưa `<Toaster />` ra `src/app/layout.tsx`, đặt ngang hàng và sau `div.isolate`. Xoá 2 chỗ trong layout con. Đã kiểm trên trình duyệt: `elementFromPoint` ở giữa toast trả về chính toast khi hộp thoại đang mở; ảnh chụp thấy toast sáng rõ trên lớp phủ. |
| M2 | Vừa | Chưa làm hạng mục iOS 26+ mà ADR yêu cầu. | `body { position: relative; min-height: 100dvh }`. Lớp phủ của Dialog và Sheet đổi sang `absolute inset-0`. Đã kiểm: lớp phủ phủ hết chiều cao body (10433px trên `/ui-kit`). Cần thử trên iPhone iOS 26 thật. |
| L1 | Thấp | `DialogContent` không có `max-h`, nên trên màn thấp nút Lưu có thể bị cắt mất. | Thêm `max-h-[calc(100dvh-2rem)] overflow-y-auto`. |
| L2 | Thấp (có từ trước) | Nội dung Sheet mất ngay khi đóng, nên sheet trượt xuống trống trong 300ms. | Giữ nguyên, giống hành vi với Radix. Để sau. |
| L3 | Thấp | AddTask không có `DialogDescription`. | Thêm mô tả dạng `sr-only`. |
| L4 | Thấp | `WithClassName` và class của nút X bị lặp ở dialog.tsx và sheet.tsx. | Để lượt dọn sau. |
| L5 | Ghi nhận | ADR §6.3 ghi Badge dùng `useRender`; builder dùng `<span>` thường vì không chỗ nào dùng `asChild`. | Chấp nhận. Ghi chú vào ADR khi cập nhật. |
| L6 | UAT | Mở Thêm việc bằng cảm ứng: `autoFocus` có thể làm bàn phím ảo tự bật. | Kiểm khi UAT. |

## Kiểm chứng thêm sau sửa
- `/ui-kit`, khối "Hộp thoại và sheet (Base UI)": thêm nút "Thử thông báo" ngay trong hộp thoại, dùng để kiểm M1 bằng mắt.
- Kiểm tra máy: `tsc` sạch · vitest 224/224 · smoke 8/8 · lint không thêm lỗi.

## Chuyển sang UAT (máy thật, khung 375px)
1. Thêm việc: bấm +, bỏ trống tên rồi bấm Lưu → phải thấy rõ toast cảnh báo. Kiểm bàn phím ảo có tự bật không (L6).
2. Lịch trên điện thoại: chạm vào khối → sheet mở và không tự đóng ngay. Đổi giờ, Lưu → toast "Trùng lịch" hiện rõ. Esc hoặc chạm nền đóng được.
3. Dialog "Thêm khối lịch" trên iPhone SE: cuộn được và chạm được nút Lưu.
4. FixedEditor: Esc, bấm nền, nút X khi đang lưu đều không đóng hộp thoại.
5. Việc trên điện thoại: mở sheet chi tiết, gõ vào ô tên rồi Esc hoặc chạm nền → nội dung tự lưu.
6. iPhone iOS 26: lớp phủ phủ kín cả vùng dưới thanh trình duyệt.
7. Chế độ sáng và tối: màu lớp phủ đúng.
