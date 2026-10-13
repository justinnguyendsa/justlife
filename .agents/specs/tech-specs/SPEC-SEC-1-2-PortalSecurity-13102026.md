---
id: SPEC-SEC-1.2
user_story: US-SEC-1-2-PortalSecurity-13102026.md
date: 2026-10-13
branch: fix/portal-security (từ main 8efc1fc)
---

# SPEC-SEC-1.2 — Vá bảo mật cổng học viên

Không đổi schema và không cần migration. Toàn bộ là backend, giao diện chỉ đổi đúng phần liên kết Gmail ở Hồ sơ. Restyle để P2.6.

## Lỗi đã xác minh
| # | Lỗi | Bằng chứng |
|---|---|---|
| E1 | Cấp mã mới không thu hồi mã cũ | `issueAccessCode` chỉ đặt `usedAt` cho mã **chưa dùng**. `verifyAccessCode` cố ý bỏ qua `usedAt`, và còn ghi `usedAt` khi đăng nhập thành công. Kết quả: mã cũ còn hiệu lực tới khi hết hạn (30 ngày). |
| E2 | Chặn đoán mã dùng bộ đếm **chung** | Mảng `_failHits` không theo khoá nào. 5 lần sai bất kỳ khoá mọi lượt đăng nhập bằng mã trong 15 phút trên instance đó (ai cũng khoá được cả lớp). Khoá theo từng mã (`attemptCount`, `lockedUntil`) không bao giờ được ghi. |
| E3 | Liên kết Gmail không xác minh chủ | `linkGoogleEmail` lưu bất kỳ chuỗi nào có "@". Ai cũng chiếm trước được Gmail của người khác. |
| E4 | `jwt` mặc định là owner | Hàm `jwt` cho `role = "owner"` khi user không có `studentId`. Hiện an toàn nhờ `signIn` chặn, nhưng chỉ cần một lỗi ở `signIn` là thành leo quyền. |
| E5 | `POST /api/lms/material-progress` thiếu kiểm quyền | Không kiểm đồng ý phụ huynh. Không kiểm tài liệu có thuộc lớp của học viên và có `visibility = class` hay không. |

## Thiết kế sửa
| ID | Việc | File |
|---|---|---|
| S01 | **Thu hồi mã:** `issueAccessCode` đặt `expiresAt = now - 1` cho **mọi** mã còn hạn của `lmsUserId` (không lọc theo `usedAt`), rồi mới tạo mã mới. Sửa chú thích cho đúng thực tế. | `src/lib/lms/access-code.ts` |
| S02 | **Bộ chặn theo khoá:** module thuần `createFailThrottle({ windowMs, perKeyMax, globalMax })` gồm `isBlocked(key, now)` và `recordFail(key, now)`. Có giới hạn số khoá trong bộ nhớ, tự dọn. Đặt `perKeyMax = 10` mỗi 15 phút, `globalMax = 300` mỗi 15 phút. Có test. | `src/lib/lms/fail-throttle.ts`, `tests/unit/fail-throttle.test.ts` |
| S03 | `verifyAccessCode(raw, { clientKey })` dùng S02 với khoá = IP (không có IP thì dùng `"unknown"`). Bỏ `_failHits` chung. Giữ kiểm `lockedUntil` cho dữ liệu cũ. Ghi chú rõ: bộ đếm nằm trong bộ nhớ từng instance; store bền để sang giai đoạn 3. | `src/lib/lms/access-code.ts` |
| S04 | `authorize(credentials, request)`: lấy IP từ `x-forwarded-for` (phần tử đầu, do Vercel đặt), hoặc `x-real-ip`, rồi truyền vào `clientKey`. | `src/auth.ts` |
| S05 | **Ý định liên kết có ký:** module `link-intent.ts`. `signIntent(studentId, now)` tạo chuỗi `v1.<studentId>.<exp>.<hmac>`, dùng HMAC-SHA256 với khoá suy ra từ `AUTH_SECRET` (nhãn `jl-gmail-link`), sống 10 phút. `verifyIntent(token, now)` trả `studentId` hoặc `null`, so khớp hằng-thời-gian và kiểm hết hạn. Hàm thuần nhận `secret` để test. | `src/lib/lms/link-intent.ts`, `tests/unit/link-intent.test.ts` |
| S06 | Server action `startGmailLink()`: lấy `studentId` **từ session** (không có thì từ chối). Đặt cookie `jl-gmail-link` (HttpOnly, Secure ở production, SameSite=Lax, `path=/api/auth`, `max-age` 600), rồi `signIn("google", { redirectTo: "/portal/profile?linked=1" })`. | `src/app/portal/(student)/profile/actions.ts` |
| S07 | Trong `signIn` (auth.ts), nhánh Google không phải owner: nếu có cookie `jl-gmail-link` hợp lệ **và** `email_verified` thì gọi `linkVerifiedGoogleEmail(studentId, email)`. Hàm này kiểm trùng bằng `emailIndex` (Gmail của học viên khác thì không gắn) và không gắn `OWNER_EMAIL`. Sau đó xoá cookie và chạy tiếp đường tra `emailIndex` như cũ để đăng nhập vào đúng học viên. Liên kết lỗi thì `return false`. | `src/auth.ts`, `src/lib/lms/portal-queries.ts` |
| S08 | Bỏ `linkGoogleEmail` (nhận chuỗi tuỳ ý) và `linkGoogleEmailAction`. Thêm `unlinkGmail()`: lấy `studentId` từ session, xoá `email` và `emailIndex` của `lmsUser`. | `portal-queries.ts`, `profile/actions.ts` |
| S09 | **Gia cố `jwt`:** chỉ đặt `role = "owner"` khi `user.email` (đã lowercase và trim) trùng `OWNER_EMAIL` và owner-auth đang bật, **hoặc** khi owner-auth tắt (dev, giữ hành vi cũ). Không trùng thì không có role và không có `studentId`, coi như chưa đăng nhập. Hàm thuần `resolveRole({ studentId, email }, ownerEmail, ownerAuthOn)` có test. | `src/auth.config.ts`, `src/lib/auth-role.ts`, `tests/unit/auth-role.test.ts` |
| S10 | `material-progress`: thêm cổng đồng ý (giống route tải tài liệu), và `assertCanSeeMaterialId(studentId, materialId)`: tài liệu thuộc lớp của học viên và `visibility = class`. Sai thì trả 403, cùng một thông báo cho cả không tồn tại và không có quyền. | `src/app/api/lms/material-progress/route.ts`, `portal-queries.ts` |
| S11 | Hồ sơ: bỏ form gõ email. Chưa liên kết: nút **Liên kết bằng Google** (form gọi `startGmailLink`), hiện khi provider Google đang bật. Đã liên kết: email đã che, chữ "đã xác minh qua Google", nút **Gỡ liên kết**. Hiện thông báo khi `?linked=1`. | `ProfileClient.tsx`, `profile/page.tsx` |

## Quy tắc
- `studentId` luôn lấy từ session, không bao giờ nhận từ client.
- Thông báo lỗi đăng nhập giữ là câu chung.
- Không ghi email thô vào log. Chỉ log độ dài và cờ, như hiện có.
- Không nới danh sách đường dẫn công khai (`ALWAYS_PUBLIC`) hay điều kiện `authorized()`.

## Giới hạn đã biết (để giai đoạn 3)
- Phiên JWT đã cấp từ mã cũ vẫn sống tới khi hết hạn. Thu hồi phiên cần store phiên hoặc kiểm phiên bản phía server.
- Bộ đếm chặn đoán mã nằm trong bộ nhớ từng instance serverless. Cần store bền (bảng hoặc KV).

## QC
- tsc, vitest (test mới cho `fail-throttle`, `link-intent`, `auth-role`), build và lint đều qua.
- Rà toàn repo không còn chỗ gọi `linkGoogleEmail` hay `_failHits`.
- Mọi action và route đã đổi đều kiểm session.
