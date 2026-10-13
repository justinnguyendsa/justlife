# QC Report — UI P2.3 Màn Lịch (13/10/2026)
Nhánh `ui/p2-3-calendar` (trên `ui/p2-2-tasks`). qa-verifier soát tĩnh qua git. tsc, vitest 43/43, build và lint đã chạy, đều qua.

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint | PASS | Lỗi lint giảm: CalendarClient 2 → 1, CalendarDragDrop 2 → 0 |
| Schema/API | PASS | Không đổi backend |
| Edge cases | NEEDS-FIX → **đã sửa** | B1, D1 |
| Error states | PASS | |
| Design token | PASS | 0 hardcode, 0 token compat |
| F01–F07 · AC1–AC7 | PASS (kèm lưu ý) | |

## Verdict tổng: NEEDS-FIX → đã sửa

## Đã sửa sau QC
- **[Trung bình] B1:** `key` của BlockEditor gồm cả `startAt` và `endAt`, nên kéo khối đang chọn sẽ làm bảng sửa nhận giờ mới. Lưu không còn ghi đè lần kéo.
- **[Trung bình] D1:** `onPointerCancel` và `onLostPointerCapture` gọi `resetDrag()`, đặt lại `drag`, `longPressActive`, `dragId`, `tapCandidate` và trạng thái trùng.
- **[Thấp] D3:** xoá timer cũ trước khi đặt timer long-press mới (chạm đa điểm), và dọn timer khi unmount.
- **[Thấp] D4:** khối chặn menu ngữ cảnh (`onContextMenu`) để long-press trên Android không bật menu.
- **[Thấp] C1:** chuyển Tuần → Ngày thì về hôm nay nếu hôm nay thuộc tuần đang xem, không thì về thứ Hai của tuần đó.

## Để lại (ghi nhận)
- **D2:** `touch-none` trên khối nên vuốt bắt đầu từ khối không cuộn trang. Lưới ngoài khối vẫn cuộn được. Sẽ cân nhắc chuyển sang `pan-y` cho tới khi long-press kích hoạt, ở lượt tinh chỉnh cảm ứng.
- **C2:** vạch giờ hiện tại đứng yên cho tới khi tải lại.
- **C3:** chưa chặn khối vượt quá nửa đêm.
- **W1:** khối ở lưới tuần chưa thao tác được bằng bàn phím (bấm tiêu đề cột vẫn được).
