# QC Report — SEC 1.2: Vá bảo mật cổng học viên (13/10/2026)

**Nhánh:** `fix/portal-security`. Lần soát 1 trên commit `fee40b0`, tách từ main `8efc1fc`.

**Người soát:** privacy-auditor (Opus, effort cao).
- Soát tĩnh qua git, không checkout.
- Đọc mã nguồn thư viện ở chế độ chỉ-đọc để xác nhận hành vi luồng Google, cookie và phiên: `@auth/core` 0.41.2, `next-auth` 5.0.0-beta.31, `next` 15.5.19.

**Đối chiếu:** `SPEC-SEC-1-2-PortalSecurity-13102026.md`, `US-SEC-1-2-PortalSecurity-13102026.md`, `00-critical-rules.md` (R-JL-PRIVACY-01, R-JL-STUDENT-PII-01).

| Chiều | Kết quả | Chi tiết |
|---|---|---|
| Typecheck / Build / Lint / Test | ✅ | tsc sạch, vitest 92/92, build sạch. Cảnh báo `jose` (CompressionStream) ở middleware có sẵn từ thư viện. Lint không thêm lỗi mới. |
| Leo quyền lên owner | ✅ | Không adapter nên `signIn` và `jwt` nhận cùng một object user. Owner chỉ khi email trùng `OWNER_EMAIL`. Không có đường nào cho học viên hoặc người lạ thành owner. |
| Khoá nhầm chủ sở hữu | ✅ | Nhánh owner chạy trước. Email chuẩn hoá giống nhau ở `signIn` và `resolveRole`. Phiên owner đang có vẫn giữ. |
| Edge-safe | ✅ | `auth-role.ts` là hàm thuần. |
| Cookie phiếu liên kết | ✅ sau sửa | Đọc rồi xoá ở mọi nhánh Google. Chỉ gắn khi phiên hiện tại đúng là học viên trong phiếu. Xoá khi đăng xuất. TTL 5 phút. |
| Chặn đoán mã | ✅ sau sửa | Đếm lượt trước khi truy vấn, trả lại lượt khi đúng mã. Một IP chỉ góp tối đa ngưỡng riêng vào trần chung. Không tính lượt cho đầu vào sai định dạng. Ngưỡng 20 lượt mỗi IP. |
| Quyền riêng tư | ✅ | Không log email thô. Email xuống client đã che. Phiên học viên không mang tên, email, ảnh Google. Có audit khi liên kết và gỡ liên kết Gmail. |

## Kết luận
- **Lần 1:** ⚠️ NEEDS-FIX. 0 lỗi chặn, 2 lỗi Cao, 4 lỗi Vừa, 12 lỗi Thấp hoặc ghi nhận.
- **Sau sửa:** ✅ PASS. Còn lại M3 (dọn dữ liệu cũ) và L6 (transaction) chờ quyết định, xem bảng dưới.

## Phát hiện và kết quả xử lý
| # | Mức | Vấn đề | Đã làm |
|---|---|---|---|
| H1 | Cao | Phiếu liên kết không gắn với phiên của người bấm và không bị xoá ở mọi nhánh. Trên máy chung, người sau có thể bị gắn Gmail vào tài khoản người trước. | `takeLinkIntent()` đọc rồi xoá phiếu ngay sau nhánh credentials, ở mọi nhánh. Chỉ gắn khi `(await auth())?.studentId === intentStudentId`. Xoá phiếu ở `/portal/signout` và ở server action đăng xuất của khung. TTL còn 5 phút. |
| H2 | Cao | Phiên JWT tự gia hạn, nên phiên tạo từ mã đã thu hồi sống vô hạn. | Phiên học viên có hạn tuyệt đối 30 ngày tính từ `loginAt`. Phiên cũ không có `loginAt` bị huỷ một lần khi deploy, học viên đăng nhập lại bằng mã. `getSessionStudentId()` kiểm thêm `lms_user.status = active` và mã của phiên chưa hết hạn hay bị thu hồi (`accessCodeId` trong token). Cấp mã mới thì phiên cũ mất hiệu lực ngay. |
| M1 | Vừa | Bắn yêu cầu song song né được bộ đếm, và một IP có thể chạm trần chung. | Tính lượt trước khi truy vấn DB; `refund` khi đúng mã. Một khoá chỉ góp tối đa `perKeyMax` vào trần chung. Có test. |
| M2 | Vừa | Cả lớp chung một IP: 10 lần gõ sai là khoá cả lớp. | Bỏ qua đầu vào sai định dạng ở production (không truy vấn, không tính lượt). `perKeyMax` = 20. Khi bị chặn báo "Bạn đã nhập sai nhiều lần. Thử lại sau ít phút nhé.", không lộ mã có tồn tại hay không. |
| M3 | Vừa | Liên kết Gmail tạo bằng hàm cũ (gõ tay, chưa xác minh) vẫn đăng nhập được. | **Chờ chủ dự án duyệt**: đếm `email_index IS NOT NULL` trên production; nếu có thì xoá một lần để học viên liên kết lại qua Google. |
| M4 | Vừa | Thiếu `prompt: "select_account"`. | Đã thêm. Google luôn hỏi chọn tài khoản khi liên kết. |
| L1 | Thấp | Production thiếu cấu hình owner-auth vẫn trả `owner`. | `resolveRole` trả `null` ở production. Có test. |
| L2 | Thấp | Role null vẫn tạo cookie phiên. | `jwt` trả `null`, không tạo phiên. |
| L3 | Thấp | `?link=constructor` lấy nhầm prototype. | Dùng `Object.hasOwn`. |
| L4 | Thấp | Nhánh liên kết chấp nhận khi thiếu `email_verified`. | Yêu cầu `email_verified === true`. |
| L5 | Thấp | `emailIndex` không unique, `limit(1)` có thể bỏ sót hàng trùng. | Kiểm trùng ngay trong query (`studentId != S`). Đăng nhập Gmail chỉ khi khớp đúng 1 hàng. Unique index để giai đoạn 3. |
| L6 | Thấp | Thu hồi mã và tạo mã mới không nằm trong transaction. | Để giai đoạn 3, cần kiểm transaction của libSQL/Turso. Rủi ro thấp vì chỉ giảng viên cấp mã. |
| L7 | Thấp | `isMinor` lấy từ JWT trước DB. | `material-progress` ưu tiên DB. |
| L8 | Thấp | Phiếu hết hạn thì học viên rơi về trang đăng nhập của chủ. | Về `/portal/profile?link=expired` hoặc `?link=error`, kèm thông báo tiếng Việt. |
| L9 | Thấp | Lỗi 403 khi đánh dấu tài liệu không hiện cho học viên. | MaterialsClient hiện lỗi tiếng Việt từ API. |
| L10 | Thấp | Giả định về `x-forwarded-for` chưa ghi rõ; tên biến `recordGlobalFail` sai. | Ghi chú giả định Vercel. Bỏ biến đặt tên sai. |
| L11 | Ghi nhận | Phiên học viên mang tên, email, ảnh Google. | Xoá `name`, `email`, `picture` khỏi token học viên. |
| L12 | Ghi nhận | Liên kết và gỡ Gmail không có audit. Phiếu chỉ đọc `AUTH_SECRET`. | Thêm audit `link_gmail` / `unlink_gmail`. Nhận cả `NEXTAUTH_SECRET`. Test luồng signIn và DB để giai đoạn 3 (test bảo vệ đăng nhập). |

## Soát lại lần 2 (commit `e37f543`)
privacy-auditor: **PASS, merge được**, 0 lỗi chặn. H1, M1, M2, M4 và các lỗi Thấp đã sửa đúng. Đăng nhập của chủ sở hữu không bị hồi quy. Gọi `auth()` trong `signIn` hợp lệ, không đệ quy. Còn lại:

| # | Mức | Vấn đề | Đã làm |
|---|---|---|---|
| V1 | Vừa | Mã **hết hạn tự nhiên** (30 ngày) bị coi như bị thu hồi. Học viên bị đá ra sau 30 ngày tính từ lúc cấp mã. Lúc deploy, phiên cũ chưa có `loginAt` bị đăng xuất, nên ai có mã đã quá 30 ngày thì không vào lại được. | Chọn (a): chỉ coi là thu hồi khi đã có mã **mới hơn** của cùng học viên. Phiên cũ chưa có `loginAt` bắt đầu tính 30 ngày từ lần đọc đầu tiên sau deploy, không bị đá ra. |
| L-H1b | Thấp | Kiểm phiên khi liên kết Gmail dùng `auth()`, chưa kiểm mã đã thu hồi và trạng thái tài khoản. | Dùng `getSessionStudentId()`, có kiểm status và mã đã thu hồi. |
| — | Ghi nhận | Cấp mã mới không gỡ Gmail đã liên kết. | Nếu thu hồi vì mã bị lộ, hãy kiểm thêm Gmail của học viên đó, hoặc khoá tài khoản (`status`). Khoá tài khoản là công tắc tắt mọi phiên của học viên. |

## Ảnh hưởng khi deploy
- Học viên đang đăng nhập **không bị đăng xuất**. Phiên cũ bắt đầu tính hạn tuyệt đối 30 ngày từ lúc deploy (V1).
- Phiên của chủ sở hữu không bị ảnh hưởng.

## Chuyển sang UAT (cần tài khoản Google thử)
1. Liên kết bằng Google, quay lại thấy email đã che kèm "· đã xác minh qua Google". Đăng xuất, đăng nhập bằng Gmail thì vào đúng học viên đó.
2. Bấm Liên kết rồi bỏ dở, đăng xuất, đăng nhập Google bằng tài khoản khác: phải bị từ chối, không gắn Gmail nào (H1).
3. Gỡ liên kết: Gmail không vào được nữa, mã vẫn vào được. Học viên đăng nhập Gmail mở `/today` thì bị đẩy ra.
4. Cấp mã mới: mã cũ bị từ chối, **và phiên đang mở từ mã cũ cũng mất hiệu lực** (H2).
5. Máy A nhập sai 20 lần thì bị chặn với câu "thử lại sau". Máy B (mạng khác) vẫn vào được.
