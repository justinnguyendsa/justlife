# ADR-002: Cổng học viên multi-user (LMS) — tách DB, Auth.js, cách ly & build an toàn LOCAL trước (P5a)

**Status:** Accepted *(Minh chốt 21/06/2026 — build P5a local-first, go-live P5b tách sau)*
**Date:** 21062026
**Author:** architect (justlife)
**Gate bắt buộc:** `privacy-auditor` (R-JL-STUDENT-PII-01) — ADR này TUÂN THỦ trọn vẹn `Privacy-Audit-P5-21062026.md` (6 blocker + required).
**Kế thừa:** ADR-001 (one-app-two-faces, libSQL/Turso, Drizzle, Next.js 15).

> Đây là phase **nhạy cảm nhất** của justlife: PII học viên, **có thể là trẻ vị thành niên**. Sai kiến trúc cách ly = rò rỉ PII trẻ em = rủi ro pháp lý. Vì vậy mọi quyết định ở đây nghiêng về **an toàn trước, tiện sau**.
> Giải thích song ngữ: 🛠️ *kỹ thuật* + 🗣️ *bình dân* (R-JL-DUAL-LANG-EXPLAIN-01).

---

## Context

### Hiện trạng code (đọc từ repo thật, 21/06)
- **MỘT DB client duy nhất** `src/db/client.ts` (`export const db`) phục vụ CẢ Personal (`task`, `time_block`, `deadline`…) LẪN Teaching (`tc_*`) + Library (`lib_*`) trong cùng `local.db`. → vi phạm tinh thần R-JL-TWO-FACES-01 nếu bê lên multi-user.
- **Teaching nằm chung route group** `src/app/(app)/teaching/...` với Personal — không có ranh giới auth.
- `src/db/teaching.ts` query KHÔNG có "viewer scope" → `getGrades(assignmentId)` trả **toàn bộ** điểm; `getClassDetail` trả cả roster. An toàn khi single-user (chỉ Minh xem), **nguy hiểm** khi học viên đăng nhập.
- `src/app/api/library/file/[id]/route.ts`: GET theo `id`, **KHÔNG auth** (IDOR), `Content-Disposition: inline`, tin `mime` client → **XSS + IDOR** nếu mở cho học viên.
- `src/app/share/[shareId]/page.tsx`: public, no-auth, link thẳng tới route file trên → tài liệu lớp có thể lộ.
- `src/lib/id.ts`: `genId = crypto.randomUUID()` (~122-bit) — đủ làm khóa chính, **KHÔNG** đủ/đúng vai trò "access code bí mật" (cần phát sinh + hash + rate-limit riêng).
- Upload (`src/app/api/library/upload/route.ts` + `src/lib/storage.ts`): ghi đĩa local `data/library`, có guard path-traversal, **không auth**, không whitelist loại file, không quota theo người.

> **Kết luận hiện trạng:** code P2 **không rò rỉ khi chạy local single-user**. Rủi ro phát sinh đúng lúc P5 — khi có actor thứ hai (học viên) và (về sau) internet. ADR này dựng hàng rào TRƯỚC khi điều đó xảy ra.

### Quyết định chủ dự án đã chốt (đưa thẳng vào ADR — không debate lại)
1. **Build an toàn LOCAL trước (P5a):** chưa cloud/email; test bằng **đăng nhập học viên giả lập** (access-code seed sẵn); code **deploy-ready**. Go-live (P5b) tách thành phase sau.
2. **Auth:** **Google OAuth là CHÍNH** (production, bật ở go-live) qua **Auth.js (NextAuth v5)**; **access-code (Credentials provider) là PHỤ** — dùng để build/test local NGAY + phục vụ HV chưa thành niên không có email. Session **httpOnly + Secure + SameSite**, dùng thư viện Auth.js (**KHÔNG tự cuộn crypto session**).
3. **Mã hóa:** chỉ field **ĐỊNH DANH** (tên / email / note / guardian) mã hóa at-rest **app-level**; **GIỮ điểm số dạng số** trong DB LMS (đã cô lập) để P6 thống kê được.

---

## Quyết định 1 — Tách DB LMS (`lms.db`) hoàn toàn

### Options Considered

#### Option A — Giữ 1 DB chung, tách bằng schema/prefix `tc_*` *(hiện trạng)*
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★★ (không phải làm gì) |
| Cost | ★★★★★ |
| Privacy | ★☆☆☆☆ — PII học viên (có thể minor) **chung instance** với việc riêng Minh; 1 lỗi query/FK = lộ chéo |
| Solo-fit | ★★★★☆ |

**Pros:** Không tốn công. **Cons:** **Vi phạm R-JL-TWO-FACES-01 + blocker #5 Privacy-Audit** (yêu cầu `lms.db`/Turso riêng, credential riêng, portal chỉ kết nối DB này). Một câu `JOIN` nhầm hay một FK chéo là đủ rò rỉ. KHÔNG chấp nhận được cho PII trẻ vị thành niên.

#### Option B — DB LMS riêng `lms.db` + client riêng, migrate `tc_*` sang (cùng engine libSQL) *(CHỌN)*
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★☆ — thêm 1 client + 1 file env + migration cùng engine (không viết lại SQL dialect) |
| Cost | ★★★★★ — local 0đ; go-live thêm 1 Turso DB free-tier |
| Privacy | ★★★★★ — cô lập vật lý: 2 file/2 credential; Personal **không reachable** từ scope LMS |
| Solo-fit | ★★★★☆ — 1 lần thiết lập, sau đó rõ ràng |

**Pros:** Đúng R-JL-TWO-FACES-01 + blocker #5. Cùng engine libSQL → migration là **copy bảng cùng dialect SQLite**, không rewrite. Drizzle hỗ trợ nhiều client trong 1 codebase. **Cons:** Phải refactor import của teaching từ `@/db/client` sang client LMS (một lần).

### Decision
**Chọn Option B.** Thêm `lms.db` (libSQL **file local** ở P5a; **Turso** ở go-live P5b) với client **riêng** `src/db/lms/client.ts` đọc credential **riêng** từ `.env.lms`. **Di chuyển toàn bộ `tc_*`** (class/student/session/attendance/assignment/grade) + (mới) submission/lms_user/consent/audit sang `lms.db`. **Personal `db` cũ KHÔNG còn chứa `tc_*`.** Portal CHỈ import client LMS — không có đường nào chạm `db` personal.

- **Library của lớp (`lib_file` có `link_class_id`):** KHÔNG serve qua route library public hiện tại. Tài liệu lớp được phục vụ **scoped** qua route LMS riêng `/api/lms/material/[fileRef]` (có auth + class-membership check), file lưu trong **vùng đĩa LMS riêng** `data/lms/`. Bản ghi metadata tài liệu lớp đặt trong `lms.db` (bảng `tc_material` mới — xem Quyết định 2), KHÔNG dùng chung `lib_file` của Personal.

🛠️ **Kỹ thuật:** `createClient({ url: process.env.LMS_DATABASE_URL })` cho file `lms.db`; ở go-live thêm `authToken` + `syncUrl` Turso. Drizzle instance thứ hai `dbLms = drizzle(libsqlLms, { schema: lmsSchema })`. Migration `tc_*` = `CREATE TABLE ... ; INSERT INTO lms... SELECT ... FROM old` (cùng SQLite dialect) hoặc export/import — không đổi kiểu dữ liệu.
🗣️ **Bình dân:** Tách hẳn **hai cuốn sổ, hai ổ khóa**: sổ việc riêng của Minh và sổ lớp học (có thông tin học viên). Cổng học viên chỉ được đưa chìa khóa mở **đúng cuốn sổ lớp**, không bao giờ với tới sổ riêng.

---

## Quyết định 2 — Data model LMS bổ sung (đánh dấu field mã hóa)

> Nguyên tắc xuyên suốt: **thu tối thiểu** (R-JL-STUDENT-PII-01, blocker #2). Field **🔒** = mã hóa at-rest app-level (định danh). Điểm số (`score`) **KHÔNG** mã hóa (giữ số để P6 thống kê — quyết định chủ dự án #3).

Thêm vào `lms.db` (ngoài `tc_*` đã migrate):

```
lms_user        id, studentId(soft link → tc_student.id), authProvider(google|credentials),
                authSubject(🔒/blind-index: google sub HOẶC access-code hash),
                email🔒, emailIndex(blind-index deterministic, để login-lookup),
                isMinor(bool), guardianContact🔒(nullable), createdAt, lastLoginAt, status(active|disabled)
                # 1 dòng/1 tài khoản đăng nhập. studentId nối sang hồ sơ lớp.
                # KHÔNG lưu password thô. Credentials provider: lưu accessCodeHash (xem Quyết định 3).

access_code     id, lmsUserId, codeHash(🔒 = hash, KHÔNG lưu code thô), createdAt,
                expiresAt, usedAt(nullable), attemptCount, lockedUntil(nullable)
                # access-code = PHỤ; one-time-ish + rate-limit. Bảng riêng để xoay/thu hồi.

consent_log     id, studentId, type(data_processing|minor_guardian), granted(bool),
                grantedAt, guardianContact🔒(nullable), notice_version, channel(portal|offline)
                # blocker #2: minor cần consent phụ huynh TRƯỚC khi đưa PII lên cloud.
                # Append-only về mặt nghiệp vụ (chỉ thêm bản ghi mới, không sửa lịch sử).

access_audit    id, ts, actorType(student|instructor|system), actorRef(lmsUserId|"minh"|"system"),
                action(login|view_grade|view_material|submit|download|export|delete_cascade|...),
                targetType(grade|material|submission|student|class), targetId,
                result(ok|denied), ipHash(nullable, KHÔNG lưu IP thô)
                # APPEND-ONLY. KHÔNG chứa PII thô (không tên/email/điểm trong log) — blocker required.

tc_submission   id, classId, assignmentId, studentId, fileRef(tên file trong vùng đĩa LMS),
                originalName🔒(nullable — có thể chứa tên HV), mime, size,
                submittedAt, status(submitted|late|returned)
                # bài nộp của học viên. fileRef KHÔNG đoán được; phục vụ qua route có auth.

tc_material     id, classId, title, fileRef(nullable, file vùng đĩa LMS), url(nullable, link ngoài),
                mime, size, visibility(class|draft), createdAt
                # tài liệu giảng dạy cho lớp — TÁCH khỏi lib_file Personal; phục vụ scoped.
```

**`tc_student` (đã migrate) — bổ sung đánh dấu mã hóa:** `name🔒`, `email🔒` + `emailIndex`(blind-index để dạy/đối chiếu), `note🔒`. `classId` giữ nguyên (không PII). `score`/`feedback` của `tc_grade`: `score` **giữ số**, `feedback🔒` (có thể chứa nhận xét cá nhân → mã hóa).

🛠️ **Kỹ thuật:** Field 🔒 lưu ciphertext (base64 `iv:tag:ct`, AES-256-GCM — xem Quyết định 6). `emailIndex`/`authSubject` blind-index = HMAC-SHA256(email_lowercased, INDEX_KEY) → cho phép `WHERE emailIndex = ?` mà không cần giải mã, và không để lộ email thô trong index.
🗣️ **Bình dân:** Thông tin nhận dạng (tên, email, ghi chú, liên hệ phụ huynh) cất trong **két** — đọc ra phải có chìa. Riêng **điểm số để dạng số bình thường** vì sau này Minh cần thống kê (điểm trung bình, phân bố). Sổ "ai đã xem gì" (audit) **chỉ ghi hành động, không chép nội dung nhạy cảm**.

---

## Quyết định 3 — Auth + session (Auth.js / NextAuth v5)

### Decision
**Auth.js (NextAuth v5)** với **2 provider**:
- **Google OAuth** *(CHÍNH, production)* — `clientId`/`clientSecret` từ env (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`); **bật ở go-live P5b**. P5a có thể để cấu hình sẵn nhưng không cần secret thật.
- **Credentials (access-code)** *(PHỤ, dùng NGAY)* — HV nhập access-code; verify bằng **so hash** (`access_code.codeHash`), **rate-limit** (`attemptCount`/`lockedUntil`), one-time-ish (`usedAt`/`expiresAt`). Dùng để build/test local + HV chưa thành niên không có email.

**Session:** strategy mặc định Auth.js (JWT hoặc database session) với cookie **httpOnly + Secure + SameSite=Lax**; `secret` từ `AUTH_SECRET` (env). **KHÔNG tự viết crypto session/CSRF** — để Auth.js lo (blocker #6).

**studentId LẤY TỪ session** (callback `session`/`jwt` gắn `studentId` + `isMinor` từ `lms_user`). **KHÔNG bao giờ nhận studentId từ client/body/query.**

**Middleware** `src/middleware.ts`: bảo vệ route group **`(lms)`** (phần portal học viên) + tất cả **`/api/lms/*`**. Chưa đăng nhập → redirect `/lms/login`. Route group Personal `(app)` **không** đi qua auth học viên (vẫn single-user Minh).

> ⚠️ **Lưu ý cách ly instructor vs student:** Minh (giảng viên) và học viên là 2 vai khác nhau. P5a: cổng học viên `(lms)/portal` chỉ cho `role=student`. Trang quản lý lớp của Minh (`/teaching`) tạm thời vẫn là Personal-side single-user (không đăng nhập học viên). Ở go-live cần tách rõ "instructor area" vs "student portal" nếu mở instructor qua internet — ghi vào P5b checklist.

🛠️ **Kỹ thuật:** `auth.config.ts` (providers + callbacks) + `middleware.ts` dùng `auth()` matcher cho `(lms)` & `/api/lms/*`. Credentials `authorize()` tra `lms_user` theo `accessCodeHash`, kiểm `lockedUntil`/`expiresAt`, tăng `attemptCount` khi sai. Callback `session({ session, token })` set `session.user.studentId`.
🗣️ **Bình dân:** Dùng **thư viện đăng nhập chuẩn** (Auth.js) thay vì tự chế — an toàn hơn nhiều. Đăng nhập chính bằng Google; ai chưa đủ tuổi/không có email thì dùng **mã truy cập** Minh cấp (có giới hạn số lần nhập sai). Hệ thống tự biết "bạn là học viên nào" từ phiên đăng nhập, **không tin con số gửi từ trình duyệt**.

---

## Quyết định 4 — Cách ly + scoping (CRITICAL — blocker #1)

### Decision
Mọi truy cập dữ liệu của portal đi qua **một data-access wrapper duy nhất**: `src/lib/lms/portal-queries.ts`. Nguyên tắc bất biến:

1. **studentId từ session**, truyền vào wrapper — wrapper KHÔNG nhận id từ client.
2. **Filter WHERE ở tầng DB** theo `studentId` cho MỌI query trả dữ liệu cá nhân (điểm, bài nộp, điểm danh).
3. **Class-membership check**: trước khi trả material/assignment của 1 lớp, xác nhận `studentId` thuộc `classId` (qua `tc_student.classId`).
4. **Object-level authz chống IDOR**: truy cập theo id (submission, material) PHẢI kèm điều kiện `AND studentId = :session` hoặc membership check — không cho id "trần".
5. **Portal KHÔNG import `@/db/client`** (personal). Lint/review chặn import chéo. Personal OS **không reachable** từ bất kỳ code path nào trong scope HV.

API portal cung cấp đúng các hàm tối thiểu:
```
getMyProfile(studentId)            → hồ sơ của chính HV (giải mã field cần hiển thị)
getMyGrades(studentId)             → điểm của riêng HV (join assignment, WHERE studentId)
getMyClassMaterials(studentId)     → tài liệu các lớp HV thuộc (membership check)
getMySubmissions(studentId)        → bài đã nộp của riêng HV
assertMembership(studentId, classId) → ném lỗi nếu không thuộc lớp
```

🛠️ **Kỹ thuật:** Wrapper là **lớp chặn IDOR tập trung** — UI/route chỉ gọi wrapper, không tự viết query Drizzle với id từ request. Mọi hàm nhận `studentId` (server-derived) là tham số đầu. Test cách ly: seed 2 HV, đăng nhập HV-A, assert KHÔNG đọc được điểm/bài HV-B (kể cả khi đổi id trên URL).
🗣️ **Bình dân:** Có **một cửa duy nhất** lấy dữ liệu cho cổng học viên, và cửa đó luôn hỏi "bạn là ai?" rồi **chỉ đưa đồ của chính bạn**. Dù học viên có thử sửa số trên thanh địa chỉ để xem điểm bạn khác, hệ thống vẫn từ chối.

---

## Quyết định 5 — Upload bài nộp an toàn (CRITICAL — blocker #3)

### Decision
Route **`/api/lms/submission`** (POST) — **bắt buộc auth** (middleware + double-check session trong handler):
- **studentId từ session**; `assignmentId` + `classId` validate membership.
- **Whitelist loại file** (vd `pdf, docx, pptx, xlsx, png, jpg, zip` — chốt danh sách trong spec), kiểm cả MIME **và** đuôi; từ chối executable/HTML/SVG.
- **Quota theo HV** (vd tổng ≤ N MB / số file ≤ M mỗi assignment) + **rate-limit** nộp.
- Lưu **vùng đĩa LMS riêng** `data/lms/submissions/` (local P5a) → **object storage** ở go-live (P5b); `fileRef` là tên **không đoán được** (uuid), KHÔNG lộ tên gốc trên URL.
- **KHÔNG serve qua route library public.** Tải về qua route LMS có auth (Quyết định dưới).

Route **tải file** (bài nộp + tài liệu lớp) `/api/lms/file/[ref]` (GET) — **auth + scope**:
- Bài nộp: chỉ chủ bài (HV) **và** instructor được tải (`WHERE studentId = session OR role=instructor`).
- Tài liệu lớp: membership check.
- Header **`Content-Disposition: attachment`** + **`X-Content-Type-Options: nosniff`** (chống render/XSS) + `Content-Type` an toàn (không tin mime client mù quáng — map theo whitelist).

> 🔧 **Fix-on-sight (Personal, ngoài LMS scope nhưng đụng chung pattern):** route `/api/library/file/[id]` hiện `inline` + tin mime + no-auth. Vì nó nằm vùng Personal single-user (chỉ Minh) → **không phải blocker P5a**, nhưng GHI vào parking lot để siết (`attachment` + `nosniff`) trước khi Personal lên cloud. Tài liệu **lớp** sẽ KHÔNG dùng route này nữa.

🛠️ **Kỹ thuật:** Validate `file.type` ∈ whitelist + magic-bytes nếu cần; sinh `fileRef = genId()` (uuid, không phải tên gốc); ghi `data/lms/...`; trả về metadata. Download route set headers cứng, đọc file qua `resolveInside` (đã có guard path-traversal trong `storage.ts`, nhân bản cho thư mục LMS).
🗣️ **Bình dân:** Học viên chỉ nộp được **loại file lành** (không file chạy được/HTML), dung lượng có hạn. File tải về luôn ở chế độ **"tải xuống"** chứ không mở thẳng trong trình duyệt (chặn mã độc). Tên file trên đường link là mã ngẫu nhiên nên không ai đoán mò file của người khác.

---

## Quyết định 6 — Mã hóa at-rest field định danh (High — blocker #4)

### Decision
Util **`src/lib/lms/crypto.ts`**:
- **AES-256-GCM** (Node `crypto`), key 32 byte từ **`LMS_ENCRYPTION_KEY`** (env, base64) — **KHÔNG hardcode** (R-JL-NO-HARDCODE-01).
- `encryptField(plain) → "v1:iv:tag:ct"` (versioned để xoay key về sau); `decryptField(cipher) → plain`.
- **Blind-index** `blindIndex(value) = HMAC-SHA256(normalize(value), LMS_INDEX_KEY)` (env riêng) — cho `emailIndex`, `authSubject` để **login-lookup deterministic** mà không giải mã.
- Áp cho: `tc_student.name/email/note`, `lms_user.email/guardianContact`, `consent_log.guardianContact`, `tc_grade.feedback`, `tc_submission.originalName`. **KHÔNG** áp cho `score` (giữ số).

> **P5a (local):** vẫn dùng mã hóa thật với key local trong `.env.lms` (test path mã hóa/giải mã sớm, tránh "ghép vội lúc go-live"). Privacy-Audit cho phép mã hóa "khi lên cloud" nhưng làm sớm an toàn hơn và rẻ → **bật từ P5a**.

🛠️ **Kỹ thuật:** GCM cho cả tính bảo mật + toàn vẹn (tag). Versioned prefix `v1:` cho phép key-rotation (giải mã v1, ghi lại v2). Blind-index tách key với encryption key để compromise 1 cái không lộ cái kia.
🗣️ **Bình dân:** Dữ liệu nhận dạng được **khóa lại bằng một chìa bí mật** cất trong cấu hình (không nằm trong code). Vẫn tra cứu được "email này là ai" nhờ một **dấu vân tay một chiều** của email, mà không cần mở khóa toàn bộ.

---

## Quyết định 7 — Cascade delete + audit (required)

### Decision
- **`deleteStudentCascade(studentId)`** trong `src/lib/lms/portal-queries.ts` (hoặc `lms/admin.ts`): **1 transaction libSQL** xóa đủ bảng — `tc_grade`, `tc_attendance`, `tc_submission` (+ **file vật lý** trong `data/lms/`), `consent_log`, `access_code`, `lms_user`, `tc_student`. Ghi `access_audit(action=delete_cascade)` (không kèm PII thô).
- **Audit mọi truy cập** PII/điểm/bài nộp/tải file/export: gọi `audit(...)` trong wrapper portal-queries + download route. Append-only.
- **Retention policy:** quyết định cụ thể (giữ bao lâu sau khi lớp kết thúc) → chốt ở **go-live P5b** với Minh (Privacy-Audit mục required). P5a: chỉ cần cơ chế xóa hoạt động + audit.

🛠️ **Kỹ thuật:** libSQL hỗ trợ transaction (`db.transaction` / `BEGIN…COMMIT`); xóa file ngoài DB làm sau khi commit (hoặc best-effort + log). Audit insert KHÔNG nằm trong transaction xóa để không mất vết nếu rollback.
🗣️ **Bình dân:** Khi cần **xóa một học viên**, hệ thống xóa **sạch mọi dấu vết** (điểm, điểm danh, bài nộp + file, đồng ý, tài khoản) trong một lần, và **ghi lại là đã xóa**. Mọi lần xem điểm/bài đều được ghi nhật ký để truy vết.

---

## Quyết định 8 — Kế hoạch build P5a theo STAGE (mỗi stage tsc + build XANH)

> Để orchestrator build từng bước an toàn. Mỗi stage **độc lập biên dịch được** (`tsc` + `next build` pass) và có cách test local rõ ràng.

| Stage | Nội dung | Test được local thế nào | Gate |
|---|---|---|---|
| **S1 — DB split + migration + lms schema** | `src/db/lms/client.ts` (đọc `.env.lms`), `src/db/lms/schema.ts` (tc_* migrate + lms_user/access_code/consent_log/access_audit/tc_submission/tc_material), migrate script `db:lms:migrate`, di chuyển `tc_*` khỏi personal `schema.ts`, refactor `teaching.ts`/`actions/teaching.ts` import sang client LMS. | `npm run db:lms:migrate` tạo `lms.db`; trang `/teaching` của Minh vẫn chạy (giờ đọc lms.db); `tsc`+build xanh. | privacy-auditor xem split |
| **S2 — Auth.js + access-code + middleware** | `auth.config.ts` (Google cấu hình sẵn + Credentials access-code), `auth.ts`, `src/middleware.ts` bảo vệ `(lms)` + `/api/lms/*`, `lib/lms/crypto.ts` + `lib/lms/access-code.ts` (sinh/hash/verify/rate-limit), callback gắn `studentId`/`isMinor`. | Seed 2 HV giả lập + access-code; đăng nhập bằng access-code ở `/lms/login`; truy cập `/lms/portal` khi chưa login → bị chặn. `tsc`+build xanh. | qa: chặn route hoạt động |
| **S3 — Portal pages** | `(lms)/login`, `(lms)/portal` (dashboard), `(lms)/portal/grades` (my-grades), `(lms)/portal/materials`; `lib/lms/portal-queries.ts` (scoped, từ session). UI tiếng Việt + tokens.css. | Đăng nhập HV-A: chỉ thấy điểm/tài liệu của A; đổi id trên URL **không** lộ data HV-B. `tsc`+build xanh. | qa cách ly IDOR |
| **S4 — Submission + secure upload/download** | `/api/lms/submission` (POST, auth+whitelist+quota), `/api/lms/file/[ref]` (GET, auth+scope, attachment+nosniff), trang nộp bài trong portal, vùng đĩa `data/lms/`. | HV-A nộp file hợp lệ → xuất hiện ở "bài đã nộp"; file lạ (.html/.exe) bị từ chối; HV-B KHÔNG tải được file HV-A. | qa upload an toàn |
| **S5 — Consent + audit + cascade** | Privacy notice tiếng Việt + `consent_log` (minor → guardian), ghi `access_audit` ở mọi truy cập PII, `deleteStudentCascade` (transaction + xóa file). | HV minor phải qua consent trước khi vào portal; xem điểm → có dòng audit; xóa HV → sạch mọi bảng + file. | privacy-auditor PASS toàn bộ |

> **Sau S5:** P5a hoàn tất, deploy-ready (local). Vào **gate QC**: qa-verifier → uat-worker (R-JL-QC-GATE-01) → mới sang P5b.

---

## Quyết định 9 — Go-live (P5b) checklist (kế thừa Privacy-Audit mục 9)

Bật ở phase sau, cần Minh chốt hạ tầng/chi phí + privacy-auditor **pass lại**:
- [ ] Deploy Vercel; **Turso cloud** cho `lms.db` (DB **riêng** với personal) — Minh duyệt third-party giữ PII.
- [ ] Bật **Google OAuth** thật (`AUTH_GOOGLE_ID/SECRET`), `AUTH_SECRET` production, cookie Secure.
- [ ] **Object storage** cho submission/material thay đĩa local — Minh duyệt third-party.
- [ ] **Email provider** (nếu cần gửi access-code/thông báo) — Minh duyệt third-party.
- [ ] Key mã hóa production (`LMS_ENCRYPTION_KEY`/`LMS_INDEX_KEY`) quản trong secret manager, có quy trình rotation.
- [ ] **Consent thật** + privacy notice tiếng Việt phiên bản hoá; minor + guardian flow đầy đủ.
- [ ] **Retention policy** chốt số ngày + job dọn.
- [ ] Rà **share link public** không lộ tài liệu lớp (tài liệu lớp đã tách sang route LMS — xác nhận).
- [ ] Tách rõ **instructor area** vs **student portal** nếu mở instructor qua internet.
- [ ] privacy-auditor re-audit toàn bộ 6 blocker trên môi trường cloud.

---

## Consequences

- ✅ **Dễ hơn / an toàn hơn:** PII học viên cô lập vật lý (2 DB/2 credential); cách ly IDOR tập trung 1 wrapper; upload/ download an toàn; mã hóa + audit + cascade sẵn từ P5a.
- ✅ **Build-test ngay:** access-code + đĩa local → chạy/QA toàn bộ luồng **không cần cloud/email**.
- ✅ **Không rewrite khi go-live:** cùng engine libSQL → đổi `lms.db` file sang Turso = đổi config; đĩa local → object storage = đổi adapter storage; Google OAuth đã cấu hình sẵn = bật secret.
- ⚠️ **Khó hơn:** thêm Auth.js + crypto util + refactor teaching import (một lần). Thêm phụ thuộc `next-auth@5` (+ `@auth/core`).
- ⚠️ **Khó hơn:** mọi query portal phải qua wrapper — kỷ luật code (bù lại bằng review/lint chặn import `@/db/client` trong scope LMS).
- 🔁 **Phải xem lại nếu:** mở instructor qua internet (cần tách vai rõ); cần zero-knowledge (provider không đọc được — đã có encryption app-level, cân nhắc mở rộng); Turso/object-storage/email do Minh chốt ở P5b.

---

## Phụ thuộc mới cần cài (S2)
- `next-auth@^5` (NextAuth v5 / Auth.js) + `@auth/core`. (Drizzle adapter `@auth/drizzle-adapter` **chỉ nếu** chọn database-session; JWT session thì không bắt buộc.)
- Không thêm crypto lib ngoài (dùng Node `crypto` built-in).

## Liên quan
- `Privacy-Audit-P5-21062026.md` (6 blocker + required — ADR này tuân thủ) · `ADR-001-tech-stack-21062026.md` (nền) · `SPEC-P5a-StudentPortal-21062026.md` (data model + auth + scoping + stage + AC) · `00-critical-rules.md` (R-JL-TWO-FACES / STUDENT-PII / PRIVACY / LOCAL-FIRST / NO-HARDCODE / QC-GATE).
