# Privacy Requirements — P5 Cổng học viên (gate R-JL-STUDENT-PII-01)

**Date:** 21062026 · **Verdict:** 🚫 NEEDS-FIX (chưa đủ điều kiện build cho tới khi spec P5 bao trùm mục 1–8) · **Lưu ý:** code P2 local single-user KHÔNG rò rỉ; rủi ro là khi bê kiến trúc lên multi-user/cloud.

## Phát hiện nền (từ code thật)
- Chỉ MỘT DB client (`src/db/client.ts`) cho cả Personal + LMS → vi phạm tinh thần R-JL-TWO-FACES.
- Query teaching (`src/db/teaching.ts`) không có "viewer scope" → trả tất cả điểm/roster.
- `api/library/file/[id]` GET theo id, **không auth** (IDOR) + `Content-Disposition: inline` + tin mime client → XSS/IDOR nếu mở cho học viên.
- `/share/[shareId]` public no-auth (ổn cho local, lỗ hổng khi internet + PII lớp).
- Upload ghi đĩa local → serverless cloud không có đĩa bền → phải đổi object storage.

## 6 BLOCKER trước go-live
1. **Cách ly dữ liệu (CRITICAL):** route `/api/lms/*` + group `(lms)` tách cứng; query nhận `studentId` TỪ session (không từ client); filter WHERE ở tầng DB; object-level authz chống IDOR; class-membership check.
2. **Consent + minor (CRITICAL):** thu tối thiểu (tên/email/điểm); `is_minor` + `guardian_contact`; `consent_log`; minor cần consent phụ huynh TRƯỚC khi tạo tài khoản/đưa PII lên cloud; privacy notice tiếng Việt.
3. **Upload an toàn (CRITICAL):** bắt buộc session; `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`; whitelist loại file; quota/rate-limit; object storage; KHÔNG serve qua route public.
4. **Mã hóa at-rest (High/Critical):** app-level cho field định danh (tên/email/note/guardian) khi lên cloud; key trong env.
5. **Tách DB LMS (High):** `lms.db`/Turso riêng, credential riêng `.env.lms`; portal chỉ kết nối DB này; migrate `tc_*` sang (cùng engine, không viết lại).
6. **Auth (High):** token ≥128-bit (crypto, KHÔNG genId/Math.random), hết hạn ngắn, one-time, lưu hash, rate-limit; session httpOnly+Secure+SameSite.

## Required (không blocker nhưng bắt buộc theo rule)
- **Audit log** append-only mọi truy cập PII/điểm/bài (không chứa PII thô).
- **Cascade delete** `deleteStudentCascade` (grade/attendance/submission/file/consent/token/audit) trong 1 transaction + **retention policy**.
- Rà **share link public** không lộ tài liệu lớp.
- **Third-party giữ PII** (email provider, object storage, Turso) — Minh duyệt từng cái (R-JL-LOCAL-FIRST).

## Chiến lược build (đề xuất)
- **P5a — build an toàn LOCAL trước:** tách lms.db + scoping + auth (access-code) + cách ly + upload an toàn + consent + audit + cascade. Test bằng đăng nhập học viên giả lập (chưa cần email/cloud). Sẵn sàng deploy.
- **P5b — go-live:** deploy Vercel + Turso cloud + email provider + mã hóa key + consent thật + privacy notice. Cần Minh chốt hạ tầng/chi phí + privacy-auditor pass lại.

## Quyết định cần chủ dự án chốt
1. Cách tiếp cận: P5a local-first (khuyến nghị) vs cloud-deploy ngay.
2. Auth: access-code/HV (khuyến nghị build-now) vs magic-link email vs cả hai.
3. Mã hóa điểm: chỉ định danh (giữ điểm số để thống kê P6 — khuyến nghị) vs mã hóa cả điểm.
4. (go-live) Retention: giữ dữ liệu HV bao lâu sau khi lớp kết thúc.
5. (go-live) Duyệt third-party: email · object storage · Turso.
