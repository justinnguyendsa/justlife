# QC Report — UI P2.2 Màn Việc + tab Hạn + Đã xong (13/10/2026)
Nhánh `ui/p2-2-tasks` (trên `ui/p2-1-today`). Builder đã chạy: tsc sạch, vitest 43/43, build qua, lint không thêm lỗi. QC soát tĩnh qua git.

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint | PASS | |
| Schema/API (B01–B04) | PASS | `area` được validate trước khi ghi. `requireOwner` giữ nguyên. Hoàn tác xoá `doneAt`. |
| Edge cases | NEEDS-FIX → **đã sửa** | #1, #3, #8 |
| Error states | PASS → **đã sửa #7** | |
| Design token | PASS | 0 hardcode, 0 token compat |
| AC1–AC8 | NEEDS-FIX → **đã sửa** | AC3 viền lam, AC4 điểm ưu tiên |

## Verdict tổng: NEEDS-FIX → đã sửa hết fix list

## Đã sửa sau QC
1. **[Vừa]** Công sức và Tác động chưa đặt thì để trống (không chọn sẵn 3). Điểm hiện "—", kèm gợi ý "Chọn cả Công sức và Tác động".
2. **[Vừa]** Việc đang làm có viền lam (AC3). Không ảnh hưởng Hôm nay, vì ở đó chỉ hiện việc chưa làm.
3. **[Thấp]** Ô hạn chỉ lưu khi xoá hạn hoặc khi ngày đủ dạng `YYYY-MM-DD` với năm ≥ 2000.
4. **[Thấp]** Sheet chỉ còn 1 nút đóng (`showClose`). Thêm `SheetDescription`.
5. **[Thấp]** Đóng bằng Esc hoặc chạm ra ngoài thì rời ô đang gõ trước (blur), nên chữ vẫn được lưu.
6. **[Thấp]** Các lần lưu được xếp hàng (`queue`), không chạy song song.
7. **[Thấp]** Xoá việc có kiểm tra `r.ok`.
8. **[Thấp]** Đánh dấu xong một việc thì đóng chi tiết của chính việc đó (`onDone`).

Thêm: tách `Segmented` thành `src/components/Segmented.tsx` để dùng lại cho Lịch.

## Backlog (ngoài phạm vi P2.2)
- `createTask` chưa validate `area`.
- `updateTask` chưa validate `status`.
