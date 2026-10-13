# QC Report — UI P2.4 Màn Tập trung (13/10/2026)

Nhánh: `ui/p2-4-focus` (chồng trên `ui/p2-3-calendar`). Người soát: qa-verifier (Sonnet, medium) — soát tĩnh qua git.
Spec: `SPEC-UI-P2-4-Focus-13102026.md` · Story: `US-UI-P2-4-Focus-13102026.md`.

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint / Test | ✅ | tsc sạch, vitest 48/48 (thêm test `parseClock`), lint 0 lỗi trên file đổi |
| Schema/API | ✅ | Không đổi schema. Dùng lại `setTaskStatus`, `createTask`, `addRest` — đều có `requireOwner` |
| Quyền | ✅ | middleware/`authorized()` phủ `/focus` (route group không đổi URL), về `/login` khi chưa đăng nhập, fail-closed ở production |
| Edge cases | ✅ (sau sửa) | M1, M2, M3, L1, L2, L3 đã sửa — xem dưới |
| Error states | ✅ | Toast tiếng Việt cho cả `ok:false` và `catch` |
| Design token | ✅ | Không emoji, không hardcode màu, không token compat, 1 điểm vàng (thanh tiến độ), vùng chạm ≥44px |
| Reuse | ✅ | Button/Input/Badge/Toaster; hàm thuần trong `focus-timer.ts` có test |
| Thống kê phút/phiên | ✅ | Tạm dừng/tiếp tục/xong việc/hết phiên không cộng trùng, không thiếu |

## Verdict lần 1: ⚠️ NEEDS-FIX → sau sửa: ✅ PASS

F01–F08 và AC1–AC7 đều đạt.

## Fix list và kết quả

| # | Mức | Vấn đề | Đã làm |
|---|---|---|---|
| M1 | Vừa | `aria-label` timer, `aria-valuenow`, "còn N phút" dùng `remaining` chưa chờ `mounted` → lệch hydrate khi khôi phục đồng hồ | `remaining` = `SESSION_MS` cho tới khi `mounted` — mọi chỗ hiển thị đều theo |
| M2 | Vừa | Ghi nhanh: Enter 2 lần tạo 2 việc trùng | Cờ `capturing` + xoá ô ngay; lỗi thì trả lại chữ vào ô |
| M3 | Vừa-Thấp | "Xong việc" dùng đồng hồ cũ sau `await` → hết phiên giữa chừng thì cộng trùng, ghi đè `ended` | Đọc `clockRef.current` sau `await`, chỉ cộng khi `running && !ended`; hết việc đang làm thì dừng đồng hồ |
| L1 | Thấp | `loadTimer` không kiểm tra hình dạng (NaN:NaN) | Hàm thuần `parseClock` kiểm tra từng trường + test |
| L2 | Thấp | Đồng hồ chạy khi không có việc; khôi phục đồng hồ ngày cũ cộng vào hôm nay | Chỉ tự chạy khi có việc; bỏ đồng hồ đã lưu nếu khác ngày (giờ VN); chưa có đồng hồ thì nút "Bắt đầu" |
| L3 | Thấp | Hết phiên thì mất nút "Xong việc này" | Thêm nút ghost "Xong việc này" ở trạng thái hết phiên |
| L4 | Thấp | `countdown` chưa chờ `mounted` | Giữ nguyên — chỉ lệch khi vượt mốc giờ trong vài giây |
| L5 | Thấp | `createTask` không giới hạn độ dài tiêu đề | Hành vi có sẵn — đưa vào backlog validate `createTask` |
| L6 | Thấp | `<main>` lồng trong `/ui-kit` | Chỉ trang tham chiếu dev — bỏ qua |
| — | Thấp | `Nav` "Việc" match `/focus` thừa (màn không có Nav) | Giữ — vô hại |

## Kiểm chứng sau sửa
- `/ui-kit` (dev, dữ liệu mẫu, `persist={false}`, bọc `inert`): tab mới, đồng hồ đếm từ 25:00, nút "Tạm dừng" đúng, console không lỗi hydrate.
- UAT trên `/focus` thật: **chờ chủ dự án đăng nhập** (không nhập mật khẩu thay).
