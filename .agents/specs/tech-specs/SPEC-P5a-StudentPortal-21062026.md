# SPEC — P5a Cổng học viên (Student Portal), build an toàn LOCAL trước

**Date:** 21062026 · **Phase:** P5a (local-first, deploy-ready; go-live = P5b) · **Status:** Ready-to-build theo stage
**Nguồn:** ADR-002 (multiuser LMS) · TUÂN THỦ `Privacy-Audit-P5-21062026.md` (6 blocker + required) · Gate: `privacy-auditor` (R-JL-STUDENT-PII-01).
**Stack:** Next.js 15 App Router · TS · Drizzle · libSQL (`lms.db` riêng) · Auth.js v5 · tokens.css · copy 100% tiếng Việt (R-JL-VN-COPY-01).

> ⚠️ Phase nhạy cảm nhất: PII trẻ vị thành niên. Spec này là **hợp đồng kiến trúc** cho builder. Builder KHÔNG được bỏ bước cách ly/upload/audit.

---

## 0. Phạm vi (R-JL-NO-BLOAT-01)

**TRONG scope P5a (local):**
- Học viên đăng nhập (access-code = chính ở P5a; Google OAuth cấu hình sẵn, bật ở P5b).
- Học viên xem **hồ sơ + điểm của riêng mình**, **tài liệu các lớp mình thuộc**, **nộp bài + xem bài đã nộp**.
- Consent (minor → guardian), audit log, cascade delete.
- Tách `lms.db`; mã hóa field định danh; upload/download an toàn.

**NGOÀI scope (parking lot / P5b):** cloud deploy, Turso, object storage, email provider, nhắn tin HV↔GV, thông báo realtime, diễn đàn, thanh toán, mở instructor area qua internet.

---

## 1. Kiến trúc tách 2 mặt (nhắc lại — bất biến)

```
src/
  db/
    client.ts            ← 🔵 PERSONAL (giữ nguyên; KHÔNG còn tc_*)
    schema.ts            ← bỏ phần tc_* (chuyển sang lms/schema.ts)
    lms/
      client.ts          ← 🟡 LMS: createClient(LMS_DATABASE_URL); Turso ở P5b
      schema.ts          ← tc_* (migrate) + lms_user/access_code/consent_log/access_audit/tc_submission/tc_material
      migrate.ts         ← tạo bảng lms.db (idempotent, raw SQL khớp schema)
  lib/lms/
    crypto.ts            ← AES-256-GCM encryptField/decryptField + blindIndex
    access-code.ts       ← sinh/hash/verify access-code + rate-limit
    portal-queries.ts    ← ⭐ data-access wrapper SCOPED (studentId từ session)
    audit.ts             ← ghi access_audit (append-only)
    storage.ts           ← vùng đĩa LMS riêng data/lms/ (clone guard từ src/lib/storage.ts)
    consent.ts           ← kiểm/ghi consent_log
  app/
    (lms)/
      layout.tsx         ← layout portal (tokens.css, font)
      login/page.tsx     ← đăng nhập (Google + access-code)
      portal/
        page.tsx         ← dashboard HV
        grades/page.tsx  ← điểm của tôi
        materials/page.tsx ← tài liệu lớp
        submissions/page.tsx ← nộp bài + bài đã nộp
    api/lms/
      submission/route.ts ← POST nộp bài (auth+whitelist+quota)
      file/[ref]/route.ts ← GET tải file (auth+scope, attachment+nosniff)
  middleware.ts          ← bảo vệ (lms) + /api/lms/*
  auth.config.ts  auth.ts ← Auth.js v5
.env.lms                 ← LMS_DATABASE_URL, LMS_ENCRYPTION_KEY, LMS_INDEX_KEY, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET (P5b)
```

**Bất biến cách ly (CRITICAL):** không file nào trong `app/(lms)/**`, `app/api/lms/**`, `lib/lms/**` được `import` từ `@/db/client` hay `@/db/schema` (personal). Portal CHỈ chạm `@/db/lms/client`. Review/lint chặn.

---

## 2. Data model `lms.db` (đầy đủ + cờ mã hóa)

> 🔒 = mã hóa at-rest (AES-256-GCM, app-level). `idx` = blind-index deterministic (HMAC) để lookup. `score` **KHÔNG** mã hóa (giữ số cho P6).

### 2.1 Bảng migrate từ personal (giữ nguyên cột, thêm cờ mã hóa khi ghi)
```
tc_class       id, name, term, status(active|archived), createdAt
tc_student     id, classId, name🔒, email🔒, emailIndex(idx), note🔒, createdAt
tc_session     id, classId, dateAt, topic, createdAt
tc_attendance  id, sessionId, studentId, status(present|absent|late), markedAt
tc_assignment  id, classId, title, dueAt, maxScore, createdAt
tc_grade       id, assignmentId, studentId, score(SỐ — không mã hóa), feedback🔒, gradedAt
```

### 2.2 Bảng mới
```
lms_user       id, studentId, authProvider(google|credentials),
               authSubject🔒+idx(google sub hoặc null cho credentials),
               email🔒, emailIndex(idx), isMinor(0|1), guardianContact🔒(nullable),
               status(active|disabled), createdAt, lastLoginAt(nullable)

access_code    id, lmsUserId, codeHash(hash, KHÔNG lưu code thô), createdAt,
               expiresAt, usedAt(nullable), attemptCount(default 0), lockedUntil(nullable)

consent_log    id, studentId, type(data_processing|minor_guardian), granted(0|1),
               grantedAt, guardianContact🔒(nullable), noticeVersion, channel(portal|offline)

access_audit   id, ts, actorType(student|instructor|system), actorRef,
               action, targetType(nullable), targetId(nullable),
               result(ok|denied), ipHash(nullable)         -- APPEND-ONLY, KHÔNG PII thô

tc_submission  id, classId, assignmentId, studentId, fileRef(uuid, không đoán được),
               originalName🔒(nullable), mime, size, submittedAt, status(submitted|late|returned)

tc_material    id, classId, title, fileRef(nullable), url(nullable), mime, size,
               visibility(class|draft), createdAt
```

### 2.3 Index cần thiết
```
idx_lms_user_email   ON lms_user(emailIndex)        -- login-lookup không giải mã
idx_lms_user_subject ON lms_user(authSubject) trên blind-index -- Google login-lookup
idx_lms_user_student ON lms_user(studentId)
idx_access_code_user ON access_code(lmsUserId)
idx_consent_student  ON consent_log(studentId)
idx_submission_student ON tc_submission(studentId)
idx_submission_assign  ON tc_submission(assignmentId)
idx_material_class   ON tc_material(classId)
idx_tc_student_class ON tc_student(classId)   -- (đã có, migrate sang)
idx_tc_grade_student ON tc_grade(studentId)   -- THÊM: scoping getMyGrades
idx_audit_ts         ON access_audit(ts)
```

> 🛠️ **Migration tc_*:** cùng dialect SQLite → tạo bảng ở `lms.db` rồi copy dữ liệu (export/import hoặc `INSERT…SELECT` nếu attach). Lần migrate, các field định danh đang là **plaintext** trong personal db → **mã hóa khi ghi sang lms.db** (đọc thô → `encryptField` → ghi cipher). Sau migrate, **xóa tc_* khỏi personal db** (DROP) để không còn bản PII ở personal.
> 🗣️ **Bình dân:** Bê dữ liệu lớp từ "sổ chung" sang "sổ lớp riêng", và **khóa lại** thông tin nhận dạng trong lúc bê. Xong thì xóa bản cũ ở sổ chung.

---

## 3. Auth + session (Auth.js v5)

### 3.1 Provider
- **Credentials (access-code)** — DÙNG NGAY P5a:
  - `authorize({ code })`: chuẩn hóa code → tìm `access_code` qua `codeHash` (so hash); kiểm `lockedUntil`(còn khóa → từ chối), `expiresAt`(hết hạn → từ chối), `usedAt` (one-time-ish: nếu chính sách one-time thì đã dùng → từ chối). Sai → `attemptCount++`, nếu vượt ngưỡng (vd 5) set `lockedUntil = now + 15p`. Đúng → set `usedAt`, trả `lms_user` (id, studentId, isMinor).
  - **KHÔNG** trả lỗi tiết lộ "code tồn tại hay không" (chống enumeration) — thông báo chung "Mã không hợp lệ hoặc đã hết hạn".
- **Google OAuth** — CẤU HÌNH SẴN, bật P5b:
  - `profile`: map `sub`→`authSubject` (qua blind-index để lookup), `email`→`email🔒`+`emailIndex`. Lần đầu: tạo/liên kết `lms_user` với `studentId` (Minh phải pre-link email→student để chống người lạ tự tạo tài khoản). P5a để secret rỗng/không bật trong UI.

### 3.2 Session & callbacks
- Cookie **httpOnly + Secure + SameSite=Lax**; `AUTH_SECRET` từ env.
- `jwt` callback: lần login gắn `token.studentId`, `token.isMinor`, `token.role="student"`, `token.lmsUserId`.
- `session` callback: copy sang `session.user.{studentId,isMinor,role,lmsUserId}`.
- **Không lưu PII** (tên/email) trong token nếu tránh được — chỉ id + cờ.

### 3.3 Middleware (`src/middleware.ts`)
```
matcher: ["/lms/portal/:path*", "/api/lms/:path*"]   (KHÔNG chặn /lms/login)
- Chưa có session hợp lệ → redirect /lms/login (page) hoặc 401 (api).
- Có session nhưng role≠student → 403.
- (lms) layout còn check consent: minor chưa có consent guardian → ép sang trang consent.
```

> ⚠️ **studentId LẤY TỪ session** ở callback. Mọi handler/wrapper nhận `studentId` server-derived. **Cấm** đọc studentId từ query/body/header.

🗣️ **Bình dân:** Đăng nhập bằng mã truy cập (nhập sai nhiều lần bị khóa tạm). Phiên đăng nhập giữ "bạn là học viên nào", và hệ thống chỉ tin con số đó — không tin thứ gửi từ trình duyệt.

---

## 4. Scoping / cách ly (CRITICAL — blocker #1)

### 4.1 Wrapper `lib/lms/portal-queries.ts` — API tối thiểu
| Hàm | Vào | Ra | Quy tắc |
|---|---|---|---|
| `getMyProfile(studentId)` | studentId(session) | hồ sơ HV (giải mã field hiển thị) | `WHERE tc_student.id = studentId` |
| `getMyGrades(studentId)` | studentId(session) | [{assignmentTitle, score, feedback, gradedAt}] | join `tc_grade`×`tc_assignment`, **`WHERE tc_grade.studentId = studentId`** |
| `getMyClassIds(studentId)` | studentId | [classId] | từ `tc_student.classId` (HV có thể nhiều bản ghi/nhiều lớp) |
| `getMyClassMaterials(studentId)` | studentId | [tc_material] | `WHERE classId IN (myClassIds) AND visibility='class'` |
| `getMySubmissions(studentId)` | studentId | [tc_submission] | **`WHERE studentId = studentId`** |
| `assertMembership(studentId, classId)` | | throw nếu không thuộc | dùng trước mọi truy cập theo classId |
| `assertOwnsSubmission(studentId, ref)` | | throw nếu không phải chủ | dùng trong download route |
| `deleteStudentCascade(studentId)` | | void | transaction — mục 7 |

**Bất biến:**
1. Mọi hàm nhận `studentId` **server-derived** (không phải tham số từ request).
2. Mọi `SELECT` trả dữ liệu cá nhân có `WHERE studentId = :session` ở **tầng DB**.
3. Truy cập theo id object (submission/material) → kèm membership/ownership check (chống IDOR object-level).
4. UI/route **chỉ gọi wrapper** — KHÔNG tự viết Drizzle query với id từ request.
5. Mỗi hàm đọc PII/điểm/bài → gọi `audit(...)`.

🗣️ **Bình dân:** Một cửa duy nhất lấy dữ liệu, luôn hỏi "bạn là ai" và chỉ đưa đồ của chính bạn. Sửa id trên URL cũng vô ích.

---

## 5. Upload + download an toàn (CRITICAL — blocker #3)

### 5.1 POST `/api/lms/submission`
- Auth bắt buộc (middleware + `auth()` trong handler). `studentId` từ session.
- Body: `assignmentId`, `classId`, `file`. → `assertMembership(studentId, classId)`; xác nhận `assignmentId` thuộc `classId`.
- **Whitelist** (chốt): `pdf, doc, docx, ppt, pptx, xls, xlsx, png, jpg, jpeg, zip`. Kiểm **đuôi + MIME**; từ chối `html, svg, exe, js, sh, bat, …`.
- **Quota:** ≤ 25MB/file (theo MAX hiện có); ≤ 5 file / assignment / HV; rate-limit (vd ≤ 10 upload/giờ/HV).
- Lưu `data/lms/submissions/<fileRef>` với `fileRef = genId()` (uuid). Ghi `tc_submission` (`originalName🔒`). Audit `action=submit`.
- Trả `{ ok, submissionId }`. Lỗi → message tiếng Việt, KHÔNG lộ đường dẫn server.

### 5.2 GET `/api/lms/file/[ref]`
- Auth bắt buộc. Phân loại `ref`:
  - submission: `assertOwnsSubmission(studentId, ref)` (HV chủ) **hoặc** instructor.
  - material: `assertMembership(studentId, material.classId)`.
- Headers cứng: **`Content-Disposition: attachment; filename*=UTF-8''<encoded>`**, **`X-Content-Type-Options: nosniff`**, `Content-Type` map theo whitelist (KHÔNG tin mime client). Đọc qua `lib/lms/storage.ts` (guard path-traversal). Audit `action=download`.
- KHÔNG dùng `/api/library/file/[id]` cho tài liệu/bài lớp.

🗣️ **Bình dân:** Chỉ nhận file lành, dung lượng có hạn; tải về luôn ở dạng "tải xuống" (không tự mở, chặn mã độc); link là mã ngẫu nhiên; chỉ chủ bài/giảng viên tải được.

---

## 6. Mã hóa (`lib/lms/crypto.ts`) — blocker #4
- `LMS_ENCRYPTION_KEY` (32 byte base64, env) — **KHÔNG hardcode**. Thiếu key → app **fail fast** (throw lúc khởi tạo), không chạy ở chế độ "quên mã hóa".
- `encryptField(plain): "v1:" + base64(iv|tag|ct)` (AES-256-GCM, iv 12 byte ngẫu nhiên). `decryptField(c)`.
- `blindIndex(value): hex(HMAC-SHA256(normalize(value), LMS_INDEX_KEY))` (key riêng). `normalize` = trim + lowercase cho email.
- Helper `encOpt/decOpt` cho field nullable.

🗣️ **Bình dân:** Khóa thông tin nhận dạng bằng chìa bí mật trong cấu hình; vẫn tra "email này là ai" bằng dấu vân tay một chiều mà không mở khóa.

---

## 7. Consent + audit + cascade — required

### 7.1 Consent (`lib/lms/consent.ts`)
- Privacy notice **tiếng Việt** (versioned `noticeVersion`).
- Vào portal lần đầu → màn hình consent `data_processing`. Nếu `isMinor=1` → **bắt buộc** `minor_guardian` (nhập `guardianContact🔒`) TRƯỚC khi xem/nộp gì. Chưa consent → layout `(lms)` chặn.
- Ghi `consent_log` (append-only, chỉ thêm bản ghi).

### 7.2 Audit (`lib/lms/audit.ts`)
- `audit({actorType, actorRef, action, targetType?, targetId?, result})` → insert `access_audit`. **KHÔNG** ghi tên/email/điểm/nội dung. `ipHash` nếu có (hash, không thô).
- Gọi ở: login (ok/denied), view_grade, view_material, submit, download, delete_cascade, export.

### 7.3 Cascade (`deleteStudentCascade`)
- **1 transaction** `lms.db`: xóa `tc_grade`, `tc_attendance`, `tc_submission`, `consent_log`, `access_code`, `lms_user`, `tc_student` (theo studentId/lmsUserId). Sau commit: xóa **file** `tc_submission.fileRef` trong `data/lms/`. Audit `delete_cascade` (ngoài transaction để giữ vết).
- **Retention:** chốt số ngày ở P5b (cơ chế xóa đã sẵn).

---

## 8. Kế hoạch STAGE (mỗi stage tsc + next build XANH) — cho orchestrator

| Stage | Deliverables | Cách test LOCAL | Gate trước khi sang stage sau |
|---|---|---|---|
| **S1 DB split** | `db/lms/{client,schema,migrate}.ts`; bỏ `tc_*` khỏi `db/schema.ts`; refactor `db/teaching.ts` + `app/actions/teaching.ts` → client LMS; script `db:lms:migrate` + di chuyển dữ liệu (mã hóa khi ghi); `.env.lms.example`. | `npm run db:lms:migrate` tạo `lms.db`; `/teaching` của Minh vẫn hoạt động (đọc lms.db); personal db không còn `tc_*`. `tsc`+build xanh. | privacy-auditor: xác nhận tách DB + không import chéo |
| **S2 Auth** | `auth.config.ts`,`auth.ts`,`middleware.ts`; `lib/lms/crypto.ts`,`lib/lms/access-code.ts`; callback gắn studentId/isMinor; cài `next-auth@5`+`@auth/core`. | Seed 2 HV giả lập + access-code (script); `/lms/login` đăng nhập bằng access-code; vào `/lms/portal` khi chưa login bị chặn; nhập sai 5 lần bị khóa. `tsc`+build xanh. | qa: middleware chặn đúng; rate-limit hoạt động |
| **S3 Portal pages** | `(lms)/{login,portal,portal/grades,portal/materials}`; `lib/lms/portal-queries.ts`+`audit.ts`. UI tiếng Việt, tokens.css. | Login HV-A → chỉ thấy điểm/tài liệu của A; sửa id trên URL/gọi API với id HV-B → **bị từ chối**. `tsc`+build xanh. | qa: **test cách ly IDOR** (2 HV) PASS |
| **S4 Submission** | `/api/lms/submission`(POST), `/api/lms/file/[ref]`(GET), `(lms)/portal/submissions`, `lib/lms/storage.ts`. | HV-A nộp file hợp lệ → hiện ở bài đã nộp; nộp `.html/.exe` bị từ chối; vượt quota bị chặn; HV-B **không** tải được file HV-A; header `attachment`+`nosniff` có mặt. | qa: upload an toàn + scope download |
| **S5 Consent/Audit/Cascade** | `lib/lms/consent.ts` + privacy notice VN + màn consent; `audit()` gắn mọi truy cập; `deleteStudentCascade`. | HV minor chưa consent guardian → bị chặn; xem điểm → sinh dòng audit (không chứa PII); xóa HV → sạch mọi bảng + file. | **privacy-auditor PASS toàn bộ 6 blocker** → QC gate → P5b |

> Sau S5: vào R-JL-QC-GATE-01 (qa-verifier → uat-worker). P5b (go-live) là phase riêng theo ADR-002 Quyết định 9.

---

## 9. Acceptance Criteria (AC) — phải pass trước khi đóng P5a

**Cách ly (CRITICAL):**
- AC-1: Không file nào trong `app/(lms)/**`, `app/api/lms/**`, `lib/lms/**` import `@/db/client`/`@/db/schema`. (grep = 0 kết quả)
- AC-2: `getMyGrades/getMySubmissions/getMyClassMaterials` luôn có `WHERE studentId`/membership; gọi với studentId của session.
- AC-3: HV-A đăng nhập KHÔNG đọc được điểm/bài/tài liệu của HV-B qua bất kỳ route/URL nào (kể cả đổi id). Personal OS (task/today/…) **không reachable** từ scope HV.

**Auth:**
- AC-4: Cookie session httpOnly+Secure+SameSite; không tự cuộn crypto (dùng Auth.js).
- AC-5: studentId luôn từ session; cấm từ client.
- AC-6: access-code: hash (không lưu thô), rate-limit (khóa sau N lần), expiresAt; thông báo lỗi chung (chống enumeration).

**Upload/Download:**
- AC-7: `/api/lms/submission` bắt buộc auth; whitelist + quota; file lạ bị từ chối.
- AC-8: `/api/lms/file/[ref]` auth + scope; `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`; không serve qua route library public.

**Mã hóa:**
- AC-9: `tc_student.name/email/note`, `lms_user.email/guardianContact`, `tc_grade.feedback`, `tc_submission.originalName`, `consent_log.guardianContact` lưu **ciphertext**; `score` lưu **số**. Thiếu key → fail fast.
- AC-10: login-lookup qua blind-index (không quét giải mã toàn bảng).

**Consent/Audit/Cascade:**
- AC-11: minor phải có consent guardian trước khi xem/nộp.
- AC-12: mọi truy cập PII/điểm/bài/tải/xóa có dòng `access_audit` (append-only, không PII thô).
- AC-13: `deleteStudentCascade` xóa đủ bảng + file trong 1 transaction; còn lại 0 bản ghi của HV đó.

**Chung:**
- AC-14: copy UI 100% tiếng Việt; màu/font từ tokens.css (no hardcode).
- AC-15: mỗi stage `tsc` + `next build` xanh.

---

## 10. Điểm rủi ro cần builder lưu ý
- **Refactor import teaching (S1):** `db/teaching.ts` + `app/actions/teaching.ts` hiện import `@/db/client` → đổi sang `@/db/lms/client`. Bỏ sót = vẫn dùng DB chung (rò rỉ). grep `from "@/db/client"` trong vùng teaching = phải 0.
- **Mã hóa khi migrate:** field định danh đang plaintext ở personal db → mã hóa lúc ghi sang lms.db; quên = lưu thô.
- **`score` KHÔNG mã hóa** (cố ý — P6). Đừng "tiện tay" mã hóa cả điểm.
- **Auth.js v5 còn beta-ish:** pin version cụ thể; theo doc NextAuth v5 (App Router). Credentials provider cần `authorize` + JWT session.
- **IDOR object-level:** dễ quên ở download route — luôn `assertOwns/assertMembership` trước khi trả file.
- **Personal file route** (`/api/library/file/[id]`) `inline`+no-auth: KHÔNG dùng cho lớp; ghi parking lot siết trước khi Personal lên cloud.

## 11. Liên quan
- ADR-002 (quyết định + lý do) · Privacy-Audit-P5 (6 blocker) · ADR-001 (nền libSQL/two-faces) · design-system.md (tokens.css) · 00-critical-rules.md.
