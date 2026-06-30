# Kế hoạch điều hành — Nâng justlife LMS thành nền tảng học tập đầy đủ

**Ngày:** 30/06/2026 · **Soạn cho:** chủ dự án Minh · **Loại:** kế hoạch điều hành (tổng hợp audit 5 trục + gap analysis + ADR-003)
**Bối cảnh:** justlife "một app hai mặt" — Personal OS (chỉ Minh) + LMS-lite (đa học viên). Mục tiêu: nâng cổng học viên lên nền tảng đầy đủ kiểu **Moodle** (khóa/quiz/question bank/gradebook) · **Coursera** (module/video/tiến độ/chứng chỉ) · **HackerRank** (bài code/auto-grade/leaderboard).
**Trọng tâm:** Minh dạy lập trình ở MindX → bài code chấm tự động là gap giá trị nhất.

> Bất biến xuyên suốt: **R-JL-TWO-FACES** (lms.db tách hẳn personal.db) · **R-JL-STUDENT-PII** (PII tối thiểu, mã hóa, audit, consent minor) · **R-JL-SHIP-SMALL** · **R-JL-NO-BLOAT** · **R-JL-PRIVACY / LOCAL-FIRST** · copy 100% tiếng Việt · token Cobalt & Amber.
> Tài liệu nguồn: `.agents/specs/LMS-gap-analysis.md` · `.agents/specs/architecture/ADR-003-LMS-platform.md` · `ADR-002-multiuser-lms` · `GOLIVE-P5b-runbook.md` · audit 5 trục.

---

## 1. Tình trạng hiện tại — bảng sức khỏe 5 trục

| # | Trục | Điểm | Tóm tắt | Điểm mạnh nhất | Lỗ hổng nặng nhất |
|---|---|:---:|---|---|---|
| 1 | **Kiến trúc & Data model** | **3/5** | Nền "teaching-lite" kỷ luật cao nhưng đóng khung quanh "lớp phẳng", chưa có khái niệm khóa học | Tách two-faces sạch (đã verify), surrogate key + index hợp lý, wrapper portal-queries chống IDOR tập trung | KHÔNG có course→module→lesson, KHÔNG enrollment (1 HV nhiều lớp = nhiều dòng trùng), score INTEGER quá hẹp, integrity 100% app-enforced (không cascade khi xóa lớp) |
| 2 | **Privacy & Security** | **3/5** | Lõi bảo mật chuẩn nhưng còn "cửa tạm" chưa khóa + mã hóa at-rest chưa thực sự bật | AES-256-GCM + blind-index (key tách, fail-fast), studentId server-derived, audit append-only không PII, cascade atomic | 🔴 `/api/debug-auth` còn live (token lộ trong git); 🔴 `DISABLE_OWNER_AUTH` mở toàn khu owner; PII còn plaintext at-rest; consent minor KHÔNG enforce ở tầng API; rate-limit in-memory vô hiệu trên serverless |
| 3 | **Design-system & UX** | **4/5** | Portal bám design-system tốt; còn vài chỗ hardcode sót | Token-driven, copy 100% tiếng Việt, icon lucide nhất quán, đủ bộ trạng thái loading/empty/error, responsive | Token KHÔNG tồn tại dùng kèm fallback hex (`--success`/`--warn-weak`…) → vừa hardcode vừa VỠ dark mode; va chạm tên lớp `.tabs`/`.chip.warn`; portal không có lối bật dark mode |
| 4 | **Code health & Reuse** | **3/5** | Cấu trúc tốt nhưng có trùng lặp + export thừa | portal-queries abstraction, auth enforcement nhất quán, crypto/audit/storage tách sạch | `fmtSize()` lặp 3 nơi; `decName` vs `safeDecrypt` lặp; export thừa `getMySubmission`/`safeEqualHex`; logic tải file lặp 2 route; debug endpoint chưa có script dọn |
| 5 | **Năng lực sản phẩm** | **3/5** | Luồng MVP chạy được nhưng chưa go-live + thiếu phần lớn năng lực LMS đầy đủ | 3 luồng Instructor đủ (lớp/điểm danh/chấm) + 5 trang Portal (dashboard/bài tập/điểm/tài liệu/hồ sơ) + tiến độ Coursera-style (Phase 6) | Local-only (chưa P5b): không object storage → mất file khi redeploy; instructor area không auth khi ra internet; thiếu hoàn toàn quiz/module/auto-grade/forum/chứng chỉ |

**Điểm sức khỏe tổng: 3,2/5.** Nền nhạy cảm (tách DB, crypto, scoping, audit, consent) làm rất tốt — đủ vững cho lớp nhỏ của Minh hiện tại. Nhưng (a) còn cửa bảo mật tạm phải khóa trước khi nhận HV thật, và (b) khoảng cách kiến trúc lớn tới mục tiêu LMS đầy đủ.

---

## 2. Khoảng cách tới Moodle / Coursera / HackerRank (gap analysis tóm tắt)

Độ phủ năng lực dạy-học cốt lõi hiện ~**1/8**. Đã có: lớp, điểm danh, bài tập nộp-file + chấm tay, tài liệu, gradebook đơn giản, tiến độ %.

| Nhóm năng lực | Độ phủ | Ưu tiên (bối cảnh dạy code) | Ghi chú |
|---|:---:|:---:|---|
| (c) **Bài code auto-grade + leaderboard** | **0%** | ⭐⭐⭐⭐⭐ | Gap giá trị nhất — biến justlife từ "sổ điểm" thành "nơi luyện code". Cần ADR sandbox (Judge0/Piston self-host) |
| (a) **Cấu trúc khóa học** (module/lesson/video) | ~10% | ⭐⭐⭐⭐ | Xương sống để gắn quiz/code/tiến độ/chứng chỉ. Hiện chỉ có `tc_material` phẳng |
| (b) **Quiz + question bank + auto-grade** | **0%** | ⭐⭐⭐⭐ | Đòn bẩy lớn khi lớp đông (chấm tay không scale). Bắt đầu MCQ/đúng-sai chấm server |
| (g) **Gradebook trọng số + rubric** | ~35% | ⭐⭐⭐ | Có 1 điểm/bài; thiếu trọng số/điểm tổng/rubric/export CSV |
| (d) **Tiến độ & hoàn thành** | ~60% | ⭐⭐⭐ | **Mạnh nhất** (Phase 6) — chỉ thiếu tiến độ cấp lesson (phụ thuộc nhóm a) |
| (h) **Enrollment** (cohort/self) | ~30% | ⭐⭐ | Có thêm tay; thiếu import CSV + tự ghi danh |
| (e) **Chứng chỉ** | **0%** | ⭐⭐ | Phụ thuộc (d)+(b/c) để "đạt" có nghĩa |
| (f) **Forum / Q&A / peer review** | **0%** | ⭐⭐ | Lớp MindX có buổi trực tiếp → không phải đòn bẩy đầu |

**3 gap lớn nhất (làm trước):** (1) bài code auto-grade; (2) cấu trúc khóa học module→lesson→video; (3) quiz tự chấm.
**Quick wins:** nhúng video YouTube/Drive vào material · quiz MCQ tự chấm tối giản · leaderboard từ điểm có sẵn · đánh dấu hoàn thành material · export/import CSV điểm/HV · thêm `descriptionMd` cho bài tập.

> ⚠️ Lưu ý: `st_course/st_lesson` trong `personal.db` là **Study OS cá nhân của Minh**, KHÔNG phải khóa học cho học viên. LMS thực sự chưa có tính năng nâng cao nào.

---

## 3. Kiến trúc đề xuất — tóm tắt ADR-003

ADR-003 (`.agents/specs/architecture/ADR-003-LMS-platform.md`, status **Proposed — chờ Minh chốt**) đã được viết đầy đủ. Tóm tắt 7 quyết định:

| QĐ | Nội dung | Cốt lõi |
|---|---|---|
| **0** | **Identity / Enrollment / Course làm xương sống** (làm TRƯỚC) | Thêm `tc_course` (nội dung tái dùng) + `lms_person` (1 dòng/người, chuẩn hóa danh tính) + `enrollment` (person × class/course). `tc_class` thành "đợt mở lớp/cohort". Migration một lần gộp `tc_student` trùng. Refactor scoping `myClassIds → myEnrollments` (ripple gói trong 1 file portal-queries) |
| **1** | **Schema mới trong lms.db** (giữ two-faces) | `tc_module`/`tc_lesson` (a) · `tc_quiz`/`tc_question`/`tc_quiz_question`/`tc_quiz_attempt` (b) · `tc_code_problem`/`tc_test_case`/`tc_code_submission`/`tc_code_run` (c) · `tc_progress` (d) · `tc_certificate` (e) · `tc_thread`/`tc_post` (f) · `tc_grade_category` (g). Field PII mới mã hóa 🔒: `correctJson`, `answersJson`, `sourceCode`, test ẩn, `lms_person.email/displayName` |
| **2** | **Auto-grade quiz an toàn** | Đáp án `correctJson` **mã hóa at-rest + KHÔNG gửi xuống client**; chấm 100% ở server; time-limit/maxAttempts enforce server-side; chống chép (shuffle + pick ngẫu nhiên). Quy tắc cứng: component làm bài KHÔNG nhận `correctJson` ở bất kỳ prop nào |
| **3** ⭐ | **Cách chấm code (lớn nhất)** | Vercel KHÔNG chạy được untrusted code → tách worker/sandbox riêng. **Khuyến nghị: Piston (3C) hoặc Judge0 (3B) self-host**. Cấm: runner tự làm (3A) ở production; cloud judge (3D) gửi code HV ra ngoài. 7 điều kiện an ninh bắt buộc: host Linux riêng cách ly · network egress OFF · vá CVE (Judge0 ≥1.13.1) · API không phơi internet · giới hạn time/mem cứng · `sourceCode`+test ẩn mã hóa · audit. Dev local dùng adapter `CodeJudge` (3A, chặn `NODE_ENV=production`) để dựng UI trước |
| **4** | **Content delivery** | Video: **embed host whitelist** (YouTube/Vimeo/Drive) + iframe sandbox, KHÔNG tự host. File: object storage ở go-live (Vercel không giữ đĩa) + route auth + attachment + nosniff |
| **5** | **Tiến độ & chứng chỉ** | Tiến độ neo vào `enrollment + tc_progress` (% khóa = item done/tổng). Chứng chỉ derive từ progress+grade, snapshot tiêu chí, PDF server-side, `/verify/[code]` công khai chỉ hiện tên khóa + ngày + hợp lệ |
| **6** | **Cascade & integrity** | Mỗi bảng mới thêm vào cascade NGAY khi tạo (cùng PR). Thêm `deleteClassCascade`/`deleteCourseCascade`/`deletePersonCascade`. Bật FK ON DELETE CASCADE **nội-DB** cho quan hệ cấu trúc (module→lesson…). **ESLint `no-restricted-imports`** chặn `@/db/client` trong portal/lib/lms/api/lms (biến two-faces từ review thủ công → fail build) |

**Cách chấm code (gọn):** HV gõ code trên web → ghi `tc_code_submission(status=queued)` → đẩy job qua kênh kín tới sandbox self-host → worker chạy từng `tc_test_case` (network OFF, giới hạn time/mem) → ghi `tc_code_run` + cập nhật điểm = Σ(weight case pass)/totalWeight. Test ẩn chỉ trả pass/fail, không lộ input.

---

## 4. Lộ trình phân phase — bảng P-LMS-*

> Mỗi phase độc lập biên dịch (tsc+build XANH), có giá trị dùng được ngay, qua R-JL-QC-GATE-01 (qa → uat → privacy). Tổng ~26–35 tuần thực tế theo lịch Minh (6–10h/tuần).

| Phase | Mục tiêu | Must-haves | Phụ thuộc | Gate | Ước lượng |
|---|---|---|---|---|:---:|
| **P-LMS-0** 🔒 | **Hardening + go-live (GATE CỨNG trước mọi phase khác)** | Gỡ `/api/debug-auth`; bỏ `DISABLE_OWNER_AUTH`; enforce consent minor ở tầng API; rate-limit access-code → Turso store bền; mã hóa field định danh cũ plaintext; object storage adapter; owner-auth bảo vệ `/api/teaching/*`; Google OAuth whitelist email | — | privacy-auditor (6 blocker) + smoke test | **S/M** |
| **P-LMS-1** | **Quick wins dùng được ngay** | Embed video whitelist vào `tc_material`; export điểm CSV + import HV CSV; `descriptionMd` cho bài tập; đánh dấu hoàn thành material; leaderboard từ điểm có sẵn; route `/api/lms/material/[ref]` (đang "Sắp có") | P-LMS-0 | qa + uat | **M** |
| **S0** | **Nền identity/course (xương sống — QĐ 0+6)** | `tc_course` + `lms_person` + `enrollment`; migration gộp danh tính (idempotent, dry-run); đổi `score`→REAL; refactor portal-queries sang `myEnrollments`; `deleteClassCascade`/`deleteCourseCascade`; ESLint no-restricted-imports; FK nội-DB | P-LMS-0 | privacy-auditor (identity gộp + cascade) | **M/L** |
| **P-LMS-2** | **Cấu trúc khóa học (a) + tiến độ lesson (d)** | `tc_module`/`tc_lesson` + gắn material vào lesson; mở `tc_progress` xuống lesson; tái dùng `getMyLearningSummary` | S0 | qa + uat | **L** |
| **P-LMS-3** | **Quiz tự chấm (b)** | `tc_quiz`/`tc_question`/`tc_quiz_question`/`tc_quiz_attempt`; auto-grade server (QĐ 2); MCQ/true-false trước → question bank + đề ngẫu nhiên sau; điểm về gradebook | P-LMS-2 | privacy-auditor (đáp án/bài làm) | **L** |
| **P-LMS-4** ⭐ | **Bài code auto-grade (c) — gap giá trị nhất** | **ADR sandbox Minh chốt TRƯỚC** (3B/3C) + privacy-auditor PASS + 7 điều kiện an ninh; `tc_code_problem`/`tc_test_case`/`tc_code_submission`/`tc_code_run`; editor + run + verdict + leaderboard; adapter `CodeJudge` | P-LMS-2, **Minh duyệt hạ tầng** | privacy-auditor + an ninh sandbox | **XL (~7–10 tuần)** |
| **P-LMS-5** | **Gradebook nâng cao (g) + chứng chỉ (e)** | `tc_grade_category` + trọng số/điểm tổng; (optional rubric); `tc_certificate` + PDF + `/verify/[code]` công khai | P-LMS-3/P-LMS-4 | qa + uat + privacy (verify công khai) | **M/L** |
| **P-LMS-6** | **Q&A nhẹ (f) + enrollment nâng cao (h)** | `tc_thread`/`tc_post` (sanitize markdown + kiểm duyệt ẩn); self-enrol bằng mã lớp (rate-limit, audit) | S0 | privacy-auditor (UGC) | **M** |

**Parking lot cứng (ngoài 4 trụ hoặc đụng privacy/local-first chưa có quyết định):** peer review, forum đa lớp, self-enrol mở, multi-role/TA, email notification, AI-assist code review, cloud judge (3D), transcript/skill-tracking Coursera.

---

## 5. VIỆC CẦN LÀM NGAY (P-LMS-0 — trước khi nhận học viên thật)

> Đây là GATE cứng. Không phase nào go-live cho tới khi xong các mục dưới. 2 mục đầu là **Critical — escalate ngay**.

### 5.1 🔴 Gỡ endpoint debug tạm `/api/debug-auth`
- **File:** `src/app/api/debug-auth/route.ts` (xóa hẳn) + bỏ `/api/debug-auth` khỏi `ALWAYS_PUBLIC_PREFIXES` ở `src/auth.config.ts:29`.
- **Lý do:** token cố định `jl-dbg-7e02f205` đã **lộ trong source/git history** → ai đọc repo/commit là có token → rò cấu hình (ownerEmailDomain, độ dài AUTH_SECRET, tên cookie, lần đăng nhập gần nhất). Là **blocker go-live số 1**.
- **Lưu ý:** runbook GOLIVE-P5b hiện **KHÔNG liệt kê** việc gỡ này → đã bổ sung vào checklist (mục 5.6).
- 🗣️ *Bình dân:* đây là cửa hậu để soi cấu hình lúc debug; chìa khóa của nó nằm sẵn trong mã nguồn → phải tháo bỏ hẳn, không chỉ đổi chìa.

### 5.2 🔴 Bỏ công tắc `DISABLE_OWNER_AUTH`
- **File:** `src/auth.config.ts:16-21` (`ownerAuthEnabledEnv()` trả `false` nếu biến này tồn tại). Commit `5a46421`/`0ffa540` xác nhận đang dùng tạm.
- **Hành động:** xóa nhánh `if (process.env.DISABLE_OWNER_AUTH) return false;` + đảm bảo biến này KHÔNG tồn tại trên Vercel prod.
- **Lý do:** nếu sót `=1` trên prod → middleware cho qua TẤT CẢ route Personal OS + `/teaching` + `/api/{teaching,library,personal}` không cần đăng nhập; `requireOwner()` thành no-op → **toàn khu owner mở toang** (dữ liệu cá nhân Minh + PII toàn bộ học viên qua `/teaching`).
- **Phụ thuộc:** chỉ bỏ được khi đã có Google OAuth thật (`AUTH_GOOGLE_ID` + `OWNER_EMAIL`) — nếu không sẽ tự khóa mình ra ngoài. Làm cùng Bước 2 runbook.

### 5.3 Xác nhận login owner hoạt động
- **Cơ chế hiện tại (đã verify, đúng):** `auth.ts` chỉ cho Google qua khi `email === OWNER_EMAIL` + `email_verified` (KHÔNG dựa `account.provider` → đã vá lỗ hổng Auth.js v5 beta). `jwt` callback gán `role="owner"` cho user không-studentId.
- **Việc cần làm:** sau khi có Google OAuth, smoke test: Minh login → vào được Personal + Dạy học; tài khoản Google lạ → bị từ chối (`return false`); HV login access-code → chỉ thấy `/portal` của mình.
- **Dọn kèm:** sau khi xác nhận, gỡ `console.log("[student-gmail-signin] OK, studentId…")` (`auth.ts:113`) và diag verbose (`auth.ts:120`) để giảm rò manh mối trên log Vercel.

### 5.4 Hardening privacy (bắt buộc trước HV thật)
| Việc | File / vị trí | Mức |
|---|---|:---:|
| **Mã hóa field định danh cũ plaintext** (`tc_student.name/email/note`, `feedback`, `originalName`, `guardianContact`) khi đẩy lên Turso; ghi từ `/teaching` phải đi qua `encryptField` | `schema.ts:24-28,57,113`; `teaching.ts`; runbook B7 | 🟠 HIGH |
| **Enforce consent minor ở tầng API** (hiện chỉ gate ở RSC layout) — `POST /api/lms/submission` + `GET /api/lms/file/[ref]` phải check `hasValidConsent`/`getIsMinor`, không chỉ studentId | `src/app/api/lms/**`; `src/lib/lms/consent.ts` | 🟠 HIGH |
| **Rate-limit access-code → Turso store bền** (hiện `_failHits[]` in-memory per-process → vô hiệu trên Vercel multi-instance/cold-start; entropy ~39.6 bit là thấp khi rate-limit không hiệu lực) | `src/lib/lms/access-code.ts:34-45` | 🟠 HIGH |
| **Auth cho route instructor** `GET /api/teaching/submission/[id]` (hiện không check owner, nhận id từ URL → ai đoán id tải được file PII khi ra internet) | `src/app/api/teaching/submission/[id]/route.ts` | 🟠 HIGH |
| **Object storage adapter** (file bài nộp/tài liệu lưu đĩa local → Vercel serverless không giữ đĩa → MẤT file khi redeploy) | `src/lib/lms/storage.ts`; runbook B3 | 🔴 blocker P5b |
| **ESLint `no-restricted-imports`** chặn `@/db/client` trong `portal/**` + `lib/lms/**` + `api/lms/**` (hiện `eslint.config.js` CHƯA có rule này → two-faces chỉ review thủ công) | `eslint.config.js` | 🟡 MED (làm ở S0) |
| **Guard seed/dev** refuse-on-prod cho `issueFixedAccessCodeForDev` + seed (code cố định `DEV1-2345`/`DEV2-MINR`) | `src/lib/lms/access-code.ts:140`; `src/db/lms/seed.ts` | 🟡 MED |
| **Route `/api/library/file/[id]`** public + inline + mime-from-client → nguy cơ stored-XSS; ép attachment + nosniff + chỉ phục vụ file đã đánh dấu share | `src/app/api/library/file/[id]/route.ts`; `auth.config.ts:29` | 🟡 MED |

### 5.5 Quyết định cần Minh chốt (chặn build các phase liên quan)
1. **[P-LMS-4]** Hạ tầng chấm code: self-host Piston (3C) / Judge0 (3B) — có **chi phí VPS** + cần kỷ luật patch. → chốt phương án + duyệt third-party.
2. **[go-live]** Object storage cho file PII (Vercel Blob / R2 / S3) — third-party giữ dữ liệu.
3. **[go-live]** Retention policy — số tháng giữ dữ liệu sau khi lớp kết thúc (chưa chốt).
4. **[go-live]** Privacy notice tiếng Việt + consent HV tự bấm đồng ý trên portal (hiện consent_log ghi qua instructor, không phải HV tự bấm).

### 5.6 Checklist go-live (bổ sung mục còn thiếu vào runbook P5b)
- [ ] 🔴 **Gỡ `/api/debug-auth`** (THIẾU trong runbook hiện tại — bổ sung)
- [ ] 🔴 **Bỏ `DISABLE_OWNER_AUTH`** khỏi env prod
- [ ] Owner-auth chặn Personal + `/teaching` + `/api/teaching/*` (test ẩn danh không vào được)
- [ ] File bài nộp/thư viện lên object storage (không mất khi redeploy)
- [ ] Field định danh đã mã hóa trên Turso (chạy bước re-encrypt + DROP bản plaintext)
- [ ] Google login chỉ cho email đã cấp vào lớp (whitelist)
- [ ] Consent phụ huynh + privacy notice tiếng Việt hiển thị cho HV
- [ ] Rate-limit access-code chuyển store bền
- [ ] Key production mới (KHÔNG dùng key dev — mất `LMS_ENCRYPTION_KEY` = mất dữ liệu mã hóa)
- [ ] privacy-auditor chạy lại trên cấu hình cloud → pass
- [ ] Smoke test phân quyền chéo (HV khác không thấy dữ liệu của nhau)

---

## 6. Rủi ro lớn nhất + cách giảm

| # | Rủi ro | Mức | Cách giảm |
|---|---|:---:|---|
| 1 | **Cửa bảo mật tạm còn live khi ra internet** (`/api/debug-auth` + `DISABLE_OWNER_AUTH`) → người lạ chạm khu owner + rò cấu hình (token nằm sẵn trong git) | 🔴 Cao nhất | P-LMS-0 mục 5.1+5.2: gỡ endpoint + bỏ cờ; bổ sung vào checklist go-live; smoke test ẩn danh trước khi bật cho lớp thử |
| 2 | **Sandbox-escape chạy code untrusted của HV vị thành niên** → chiếm máy chủ + nghĩa vụ pháp lý | 🔴 Cao nhất | KHÔNG chạy trên Vercel; self-host cách ly + network egress OFF + patch CVE + 7 điều kiện ADR-003 QĐ3; KHÔNG dùng runner 3A ở prod; **Minh duyệt + privacy-auditor PASS trước khi build P-LMS-4** |
| 3 | **PII (có thể minor) plaintext at-rest trên cloud + consent không enforce ở API** → lộ dữ liệu trẻ em khi breach / xử lý không có cơ sở pháp lý | 🟠 Cao | P-LMS-0 mục 5.4: mã hóa lại trước go-live + DROP bản plaintext; enforce consent ở `/api/lms/*`; privacy-auditor là GATE mọi feature LMS thêm PII |
| 4 | **Ripple kiến trúc nếu build quiz/code TRƯỚC khi chốt identity/course** → refactor lại roster + scoping toàn hệ | 🟠 Cao | Làm **S0 (identity/enrollment/course) TRƯỚC** P-LMS-2+; ripple gói trong 1 file `portal-queries` (`myEnrollments`); ADR-003 QĐ0 đã chốt phương án |
| 5 | **Mất file khi redeploy Vercel** (đĩa local ephemeral) + **mất state rate-limit** (in-memory) | 🟠 Cao | Object storage adapter + rate-limit Turso store **trước go-live** (P-LMS-0); cả hai là blocker P5b đã biết |
| 6 | **Mồ côi dữ liệu khi thêm nhiều bảng mới** (lms.db không FK/cascade tự động) | 🟡 Vừa | ADR-003 QĐ6: cascade-cùng-PR + FK ON DELETE nội-DB + `deleteCourse/ClassCascade`; ESLint no-restricted-imports chặn rò chéo |

---

## Liên quan
`.agents/specs/LMS-gap-analysis.md` · `.agents/specs/architecture/ADR-003-LMS-platform.md` · `ADR-002-multiuser-lms-21062026.md` · `ADR-001-tech-stack-21062026.md` · `GOLIVE-P5b-runbook.md` · `SPEC-P5a-StudentPortal-21062026.md` · `.agents/rules/00-critical-rules.md` (R-JL-TWO-FACES / STUDENT-PII / PRIVACY / LOCAL-FIRST / SHIP-SMALL / NO-BLOAT / SPEC-FIRST / QC-GATE / NO-HARDCODE).
