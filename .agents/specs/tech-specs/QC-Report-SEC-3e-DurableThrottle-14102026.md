# QC Report — 3e phần 2: Bộ chặn đoán mã lưu bền, cấp mã nguyên tử, một Gmail một học viên (14/10/2026)

**Nhánh:** `feat/3e-durable-throttle`. Lần soát 1 trên commit `8357c65`, tách từ main `8610cab`.

**Người soát:** privacy-auditor (Opus, effort xhigh). Soát tĩnh, chỉ đọc.

**Đối chiếu:**
- `ADR-005-Next16-BaseUI-13102026.md` §8 (3e);
- `QC-Report-SEC-1-2-13102026.md` (M1 "đếm trước khi truy vấn", L6 transaction);
- `00-critical-rules.md` (R-JL-PRIVACY-01).

| Chiều | Kết quả | Chi tiết |
|---|---|---|
| Typecheck / Test / Smoke | ✅ | tsc sạch. vitest 250/250. Smoke 9/9 trên bản build production. Ca smoke mới: mã sai có ghi vào `auth_throttle`, khoá đúng bằng HMAC với `AUTH_SECRET` thật. |
| Nguyên tử | ✅ | Upsert `… RETURNING` chịu được bắn song song. `batch` của libSQL qua HTTP chạy BEGIN…COMMIT trong một request. Subquery `createdAt` chạy sau UPDATE trong cùng giao dịch. |
| Không lưu IP thô | ✅ sau sửa | Khoá = HMAC(khoá con suy từ `AUTH_SECRET`, IP), IPv6 gộp theo dải /64. Thiếu secret thì không ghi DB. |
| Từ chối dịch vụ | ✅ sau sửa | Khi trần chung bị vượt, chỉ chặn nơi đã thử quá 3 lượt. Học viên gõ đúng ngay vẫn vào được. |
| Migration | ✅ | Chỉ thêm, chạy lại an toàn. Gặp Gmail trùng thì chỉ in số đếm và thoát mã 2. |
| Log | ✅ | Không có IP hay email trong log. |

## Kết luận
- **Lần 1:** ✅ PASS (không chặn merge). 0 Cao, 3 Vừa, 7 Thấp.
- **Sau sửa:** đã sửa M1–M3, L2, L3, L5, L6. L1, L4, L7 ghi nhận, xem bảng dưới.

## Phát hiện và kết quả xử lý

| # | Mức | Vấn đề | Xử lý |
|---|---|---|---|
| M1 | Vừa | Khoảng 15 IP × 20 lượt là chạm trần chung 300, khoá đăng nhập của mọi học viên. Bảng dùng chung nên giờ khoá được trên mọi instance. | **Đã sửa.** Khi bị dồn dập, chỉ chặn nơi có `keyCount > FLOOD_MAX_ATTEMPTS (3)`. IPv6 gộp theo /64. |
| M2 | Vừa | Lượt đã bị chặn vẫn ghi vào DB, tốn quota Turso. | **Đã sửa.** Chỉ cộng khi `count <= max`, nên khoá đã bị chặn không ghi thêm và trần chung dừng ở max+1. Ghi `usedAt` sau khi đăng nhập đúng chuyển thành best-effort. **Khuyến nghị cho chủ dự án:** bật rate limit của Vercel WAF cho `/api/auth/callback/access-code`. |
| M3 | Vừa | Secret rỗng (vd chỉ đặt `AUTH_SECRET_1..3`) khiến khoá thành sha256 trần, dò ngược ra IPv4 được. | **Đã sửa.** Không có secret thì không ghi DB, chỉ đếm trong bộ nhớ và cảnh báo. Khoá con suy ra bằng HMAC giống link-intent. |
| L1 | Thấp | Cửa sổ cố định cho phép dồn gấp đôi lượt thử ngay sát ranh giới cửa sổ. | **Ghi nhận.** Không gian mã 31^8 ≈ 8.5e11 nên ảnh hưởng không đáng kể. |
| L2 | Thấp | Lỗi ở bước trần chung hoặc bước dọn làm bỏ luôn quyết định đã có từ DB. | **Đã sửa.** Quyết định theo khoá chốt trước. Bước trần chung và bước dọn có try/catch riêng. |
| L3 | Thấp | Chú thích về thời gian lưu dữ liệu sai. | **Đã sửa** chú thích trong `schema.ts`. |
| L4 | Thấp | Khi rơi về bộ nhớ chỉ cảnh báo một lần, dễ không ai thấy. | **Ghi nhận.** `npm run db:lms:check:turso` báo thiếu bảng `auth_throttle`. |
| L5 | Thấp | Gặp Gmail trùng, migrate vẫn in "✓" và thoát mã 0. | **Đã sửa.** In tóm tắt cảnh báo to và thoát mã 2. |
| L6 | Thấp | Liên kết Gmail ghi theo `student_id` (không unique), có thể báo "taken" giả. | **Đã sửa.** Ghi theo `id` hàng. |
| L7 | Thấp | Cả lớp dùng chung một IP thì chung 20 lượt. | **Ghi nhận.** Đã quyết ở SEC-1.2, theo dõi khi go-live. |

## Soát lại sau sửa: ✅ PASS
Auditor xác nhận các điểm sau đều đúng: logic khi bị dồn dập, cách trả lại lượt với phép cộng có điều kiện, và L2, M3, L5, L6.

Phát sinh 3 điểm Thấp mới:

| # | Mức | Vấn đề | Xử lý |
|---|---|---|---|
| N1 | Thấp | Không còn trần cứng toàn cục. Khi bị dồn dập, mỗi địa chỉ hoặc dải /64 mới vẫn được 3 lượt, nên kẻ có M địa chỉ đoán được khoảng 300 + 3M lượt mỗi cửa sổ. Mức này không tệ hơn trước 3e (khi mỗi instance đếm riêng). | **Chờ chủ dự án chọn.** Có ba hướng: rate limit của Vercel WAF (khuyến nghị), mã dài hơn, hoặc thêm một bậc chặn chặt hơn. Lớp bảo vệ thật vẫn là không gian mã khoảng 40 bit. |
| N2 | Thấp | Bộ đếm dự phòng trong bộ nhớ vẫn theo kiểu cũ: chạm trần chung là chặn hết, nhưng chỉ trong một instance. | **Ghi nhận.** Đây là mức trước 3e. Nên thêm cảnh báo khi rơi về bộ nhớ (theo dõi log `[access-code] bảng auth_throttle chưa sẵn sàng`). |
| N3 | Thấp | Địa chỉ IPv4-mapped dạng hex (`::ffff:c000:201`) bị gộp chung dải với `::1`. | **Đã sửa.** Đổi về dạng IPv4 chấm, có test. |

## Việc của chủ dự án sau khi merge
1. Chạy `npm run db:lms:migrate:turso`. Trước khi chạy, app vẫn đếm trong bộ nhớ như cũ.
2. Nếu migrate thoát mã 2 (có Gmail trùng), dọn dữ liệu trùng. Việc này gộp với M3 của SEC-1.2 và cần anh duyệt.
3. Nên bật rate limit của Vercel WAF cho đường đăng nhập bằng mã.
