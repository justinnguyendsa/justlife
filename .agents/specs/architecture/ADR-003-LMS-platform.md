# ADR-003: Mở rộng LMS-lite thành nền tảng học tập đầy đủ (course/quiz/code/progress/certificate/forum)

**Status:** Proposed *(chờ Minh chốt — đặc biệt Quyết định 3: hạ tầng chấm code = third-party/self-host, có chi phí + đụng dữ liệu)*
**Date:** 30062026
**Author:** architect (justlife)
**Kế thừa:** ADR-001 (one-app-two-faces, libSQL/Turso, Drizzle, Next.js 15) · ADR-002 (lms.db tách, Auth.js, scoping IDOR, crypto AES-256-GCM + blind-index, audit, cascade, consent).
**Gate bắt buộc:** `privacy-auditor` (R-JL-STUDENT-PII-01) cho MỌI nhóm thêm dữ liệu cá nhân mới (đáp án quiz, source code, bài viết forum). Quyết định 3 còn cần `privacy-auditor` + **Minh duyệt third-party** trước khi build.
**Đầu vào:** `LMS-gap-analysis.md` (8 nhóm a–h, ưu tiên, lộ trình P7–P11) + kết quả audit 5 trục (sức khỏe 3/5, ripple risk nếu xây trước khi chốt course-model).

> Giải thích song ngữ (R-JL-DUAL-LANG-EXPLAIN-01): 🛠️ *kỹ thuật* · 🗣️ *bình dân*.
> Tinh thần xuyên suốt: **R-JL-SHIP-SMALL** (chia P7→P11, không big-bang) · **R-JL-PRIVACY / STUDENT-PII / LOCAL-FIRST** (PII tối thiểu, mã hóa, audit, không tự ý gửi dữ liệu ra ngoài) · **R-JL-TWO-FACES** (tất cả bảng mới nằm trong `lms.db`, KHÔNG chạm `personal.db`) · **R-JL-NO-BLOAT** (LMS là subsystem hợp lệ theo P6 amended, nhưng vẫn chỉ build cái phục vụ dạy-học cốt lõi).

---

## Context

### Vấn đề
LMS hiện tại (P5/P6) là **"lớp dạy phẳng"**: `tc_class → tc_student/tc_session/tc_assignment/tc_grade/tc_submission/tc_material`. Audit 5 trục kết luận **sức khỏe 3/5**: nền bảo mật + cách ly **rất tốt** (đã verify), nhưng data model **đóng khung quanh "một lớp"** chứ chưa phải **"một nền tảng khóa học"** (Moodle/Coursera/HackerRank). Gap analysis xác nhận độ phủ năng lực dạy-học cốt lõi mới **~1/8**.

Mục tiêu nâng cấp (Minh đặt): **Moodle** (course/quiz/question-bank/gradebook), **Coursera** (module/lesson/video/tiến độ/chứng chỉ), **HackerRank** (bài code/auto-grade/test-case/leaderboard). Trọng tâm số 1: **bài code** vì Minh dạy lập trình ở MindX.

### Ràng buộc kiến trúc cứng (kế thừa, KHÔNG debate lại)
1. **lms.db tách hoàn toàn personal.db** — mọi bảng mới nằm trong `src/db/lms/schema.ts`; portal/`lib/lms` KHÔNG import `@/db/client`. (R-JL-TWO-FACES-01 — đã verify ở audit.)
2. **studentId luôn server-derived** qua wrapper `portal-queries.ts`; mọi dữ liệu cá nhân có `WHERE studentId`/membership ở tầng DB (chống IDOR). Bảng mới PHẢI gắn vào pattern này.
3. **PII mã hóa at-rest** (AES-256-GCM) + **blind-index** cho login-lookup; **score giữ dạng số** cho thống kê P6. Field PII mới phải đánh dấu 🔒.
4. **Cùng engine libSQL/Turso, Drizzle** — không thêm DB engine mới (no Postgres/Mongo).
5. **Single deploy Vercel** cho web app — nhưng chấm code untrusted KHÔNG chạy trên Vercel (xem Quyết định 3).

### Rủi ro ripple đã được audit cảnh báo (lý do ADR này phải có TRƯỚC khi code P7+)
> "Mọi thứ đang hang off `classId` phẳng và **KHÔNG có enrollment** → thêm tính năng giờ sẽ phải refactor lại roster + scoping + portal-queries sau này → 'sai kiến trúc = ripple toàn hệ, effort extra'."

Đây là quyết định kiến trúc nền tảng nhất của ADR-003 và được xử lý ở **Quyết định 0** dưới đây.

---

## Quyết định 0 — Identity / Enrollment / Course làm XƯƠNG SỐNG (làm TRƯỚC mọi nhóm)

> Đây là quyết định gốc. Nếu bỏ qua, mọi nhóm (quiz/code/progress/certificate) sẽ tiếp tục "treo vào classId phẳng" và phải refactor lại lần nữa — đúng loại ripple persona phải tránh.

### Vấn đề chuẩn-hóa danh tính (audit gap)
Hiện **1 học viên học nhiều lớp = NHIỀU dòng `tc_student` trùng danh tính** (mỗi dòng 1 `classId`). Code đã workaround bằng `myClassIds()` dedupe theo `tc_student.id` và `lms_user` giả định ~1:1 studentId. Khi thêm progress/certificate/leaderboard **xuyên-khóa**, mô hình này sẽ vỡ (không biết "cùng một người" qua nhiều lớp).

### Options Considered

#### Option 0A — Giữ "lớp phẳng", vá thêm bảng treo vào classId *(hiện trạng nối dài)*
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★★ (không đổi gì) |
| Cost | ★★★★★ |
| Privacy | ★★★☆☆ — không tệ hơn, nhưng identity nhân bản khó xóa sạch (cascade phải lặp theo từng dòng) |
| Solo-fit | ★★☆☆☆ — **nợ kỹ thuật dồn**, mỗi nhóm mới lại ripple |

**Cons:** Không có "người" và "khóa" → không thể làm tiến độ/chứng chỉ/leaderboard xuyên-khóa đúng; trùng PII (mã hóa N lần cùng 1 email); cascade ngày càng dễ mồ côi.

#### Option 0B — Thêm `course` + `enrollment`, GIỮ `tc_class` làm "đợt mở lớp/cohort" *(CHỌN)*
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★☆☆ — thêm 2–3 bảng + 1 lớp migration "gộp danh tính" (một lần) |
| Cost | ★★★★★ — vẫn libSQL, 0đ thêm |
| Privacy | ★★★★★ — **1 dòng/người** → mã hóa 1 lần, cascade theo personId gọn, audit rõ |
| Solo-fit | ★★★★☆ — thiết lập 1 lần, sau đó mọi nhóm mới "cắm vào" course/enrollment có sẵn |

**Pros:** Đúng chuẩn LMS (Moodle dùng course + enrolment; class = instance/cohort). Tách **"khóa học" (tái dùng nội dung)** khỏi **"đợt mở lớp" (roster + lịch theo kỳ)**. `enrollment` cho phép tiến độ/điểm/chứng chỉ gắn vào **(person × course)** ổn định.
**Cons:** Cần 1 migration gộp các `tc_student` trùng → `lms_person` + tạo `enrollment`. Code teaching/portal phải đọc qua lớp identity mới (một lần refactor có kiểm soát).

#### Option 0C — Bê nguyên mô hình Moodle đầy đủ (context/role/capability/cohort/group)
| Trục | Đánh giá |
|---|---|
| Complexity | ★☆☆☆☆ — RBAC capability-based, context tree… |
| Cost | ★★★★☆ |
| Privacy | ★★★★☆ |
| Solo-fit | ★☆☆☆☆ — **over-engineer** cho 1 giảng viên (R-JL-SINGLE-USER-01 / NO-BLOAT) |

**Cons:** Vi phạm tinh thần "đơn giản nhất có thể". Minh là **giảng viên duy nhất**, chưa cần TA/co-teacher/groups/capability. Bỏ.

### Decision
**Chọn Option 0B.** Đưa vào `lms.db`:

```
tc_course      id, title🔒?(thường KHÔNG PII → để plaintext), slug, descriptionMd,
               status(draft|published|archived), createdAt
               # "Khóa học" = nội dung tái dùng (module/lesson/quiz/code-problem treo vào ĐÂY).

lms_person     id, displayName🔒, email🔒, emailIndex(blind-index), isMinor, createdAt, status
               # 1 DÒNG / 1 NGƯỜI HỌC (chuẩn hóa danh tính). PII mã hóa 1 lần.
               # lms_user.studentId → trỏ sang lms_person.id (thay vì tc_student.id nhân bản).

enrollment     id, personId, classId, courseId, role(student), status(active|completed|dropped),
               enrolledAt, completedAt(nullable)
               # (person × class/course). Tiến độ/điểm/chứng chỉ neo vào enrollment.
               # role để dành: hiện chỉ 'student' (KHÔNG mở TA/co-teacher — single-user).
```

**Quan hệ:** `tc_class.courseId` (mỗi đợt mở lớp thuộc 1 khóa) · `enrollment(personId → lms_person, classId → tc_class, courseId → tc_course)` · `tc_student` **giữ lại** như "hồ sơ HV trong 1 lớp" nhưng `tc_student.personId` trỏ về `lms_person` (gộp danh tính). Module/lesson/quiz/code-problem treo vào **courseId** (tái dùng qua nhiều đợt mở lớp).

**Migration một lần (S0):** gộp `tc_student` trùng (theo `emailIndex`, fallback theo tên+lớp nếu chưa có email) → tạo `lms_person`; tạo `tc_course` mặc định cho mỗi `tc_class` đang có (hoặc gộp theo tên); tạo `enrollment` từ các cặp (person × class) hiện hữu; backfill `lms_user.personId`. Script idempotent, chạy 1 lần, có dry-run đếm trước.

🛠️ **Kỹ thuật:** `tc_class` trở thành **section/cohort** của `tc_course`; identity tách sang `lms_person` (chuẩn hóa). Wrapper `portal-queries` đổi `myClassIds(studentId)` → `myEnrollments(personId)` (lấy classId/courseId từ `enrollment WHERE personId`). Đây là nơi DUY NHẤT cần sửa scoping → ripple được **kiểm soát trong 1 file**.
🗣️ **Bình dân:** Tách rõ **"khóa học"** (giáo trình dùng lại nhiều kỳ) khỏi **"lớp/đợt"** (danh sách HV của kỳ này), và mỗi **người học chỉ có 1 hồ sơ gốc** dù học nhiều lớp. Nhờ vậy "đã học xong khóa", "chứng chỉ", "xếp hạng" mới tính đúng cho từng người.

---

## Quyết định 1 — Schema mới trong lms.db (giữ two-faces)

> Nguyên tắc: **referential integrity vẫn app-enforced** (libSQL không bật FK cross-concern theo ADR-002), nhưng **mỗi bảng mới PHẢI được thêm vào danh sách cascade** (xem Quyết định 6) ngay khi tạo — chống mồ côi. Field 🔒 = mã hóa AES-256-GCM. `score`/điểm số = số (REAL — xem dưới).

### 1.1 — Cấu trúc nội dung khóa học (nhóm a) — ⭐⭐⭐⭐ xương sống
```
tc_module      id, courseId, title, descriptionMd?, position(int), createdAt
tc_lesson      id, moduleId, title, contentMd?, videoUrl?(host whitelist), position(int),
               kind(text|video|reading), createdAt
               # videoUrl: CHỈ embed host whitelist (YouTube/Vimeo/Drive) — chống XSS iframe.
tc_material    + lessonId?(nullable)   # gắn tài liệu vào lesson (giữ classId? để tương thích cũ)
```
🛠️ Treo vào `courseId` (tái dùng). `position` cho thứ tự; drip/sequential **chưa làm** (ship-small).
🗣️ Cho khóa một "mục lục": chương → bài → (video + tài liệu).

### 1.2 — Quiz + question bank + auto-grade (nhóm b) — ⭐⭐⭐⭐
```
tc_question        id, courseId?(hoặc bankCategory), type(mcq_single|mcq_multi|true_false|short),
                   stemMd, choicesJson, correctJson🔒, points(REAL), createdAt
                   # ⚠ correctJson MÃ HÓA 🔒 — đáp án đúng KHÔNG để plaintext, KHÔNG gửi xuống client.
tc_quiz            id, courseId, lessonId?, title, timeLimitSec?, maxAttempts(default 1),
                   shuffle(bool), revealAfter(bool), status(draft|published), createdAt
tc_quiz_question   id, quizId, questionId, position, pickFromCategory?(int)
                   # n-n; pickFromCategory>0 = "rút K câu ngẫu nhiên từ category" (Moodle-style).
tc_quiz_attempt    id, quizId, personId, answersJson🔒, score(REAL), maxScore(REAL),
                   startedAt, submittedAt(nullable), gradedAt
                   # answersJson 🔒 (bài làm = dữ liệu cá nhân). 1 dòng/lần làm. scoped theo personId.
```
🛠️ **Auto-grade ở server** (Quyết định 2). `correctJson` mã hóa → ngay cả khi rò DB cũng không lộ đáp án.
🗣️ HV làm trắc nghiệm, chấm điểm ngay; Minh soạn 1 lần dùng nhiều lớp; mỗi người 1 đề hơi khác (chống chép).

### 1.3 — Bài code kiểu HackerRank (nhóm c) — ⭐⭐⭐⭐⭐ trọng tâm
```
tc_code_problem    id, courseId, lessonId?, title, statementMd, languagesJson,
                   timeLimitMs, memLimitMb, totalWeight(REAL), status(draft|published), createdAt
tc_test_case       id, problemId, input🔒?, expectedOutput🔒, isHidden(bool), weight(REAL), position
                   # test ẩn (isHidden=1): input/expected MÃ HÓA + KHÔNG bao giờ trả ra client.
tc_code_submission id, problemId, personId, language, sourceCode🔒, status(queued|running|done|error),
                   score(REAL), passedCount, totalCount, verdict(text), ranAt, createdAt
                   # sourceCode 🔒 (PII/sở hữu trí tuệ HV). status async (chấm ở worker — Quyết định 3).
tc_code_run        id, submissionId, testCaseId, passed(bool), timeMs?, memKb?, hiddenSafeMsg
                   # kết quả từng case; với test ẩn CHỈ lưu pass/fail (KHÔNG lưu/expose input ẩn).
```
🛠️ Chấm = đẩy job sang **sandbox worker** (Quyết định 3), gom kết quả case → điểm = Σ(weight case pass)/totalWeight. **Egress mạng sandbox TẮT**; time/mem cứng.
🗣️ HV gõ code trên web, chạy thử với ví dụ, nộp → hệ thống chấm bằng nhiều bộ test (có bộ giấu), cho điểm theo số test đúng.

### 1.4 — Tiến độ & hoàn thành (nhóm d) — ⭐⭐⭐ (mở rộng Phase 6 đã có)
```
tc_progress    id, personId, courseId, itemType(lesson|quiz|code|material), itemId,
               status(done|in_progress), completedAt
               # UNIQUE(personId,itemType,itemId). % khóa = done / tổng item published của course.
```
🛠️ Tái dùng `getMyLearningSummary` (Phase 6) nhưng tính theo `enrollment + tc_progress` thay vì đếm submission.
🗣️ Nâng "đã nộp bao nhiêu %" thành "đã học xong bao nhiêu % khóa", tick từng bài.

### 1.5 — Chứng chỉ (nhóm e) — ⭐⭐
```
tc_certificate id, personId, courseId, issuedAt, verifyCode(unique, random ~128bit),
               criteriaSnapshotJson, revoked(bool default 0)
               # verify công khai /verify/[code] CHỈ hiện: tên khóa + ngày + hợp lệ. KHÔNG lộ PII thừa.
```
🛠️ Render PDF server-side (lib PDF thuần JS, không service ngoài). `verifyCode` không đoán được.
🗣️ Học xong + đạt điểm → giấy chứng nhận có mã tra cứu.

### 1.6 — Forum / Q&A (nhóm f) — ⭐⭐
```
tc_thread      id, courseId, lessonId?, authorType(student|instructor), authorRef,
               title, status(open|locked), createdAt
tc_post        id, threadId, authorType, authorRef, bodyMd, parentId?(reply lồng), createdAt,
               hidden(bool default 0)   # kiểm duyệt: ẩn thay vì xóa cứng
```
🛠️ `bodyMd` render **sanitize** (chống stored-XSS — dùng allowlist markdown→HTML). authorRef = personId|"owner".
🗣️ Chỗ hỏi-đáp công khai trong lớp để khỏi lặp câu hỏi. (Peer review để sau — phức tạp + nhạy cảm.)

### 1.7 — Gradebook nâng cao (nhóm g) — ⭐⭐⭐ + đổi kiểu điểm
```
tc_grade_category  id, courseId, name, weight(REAL)
tc_assignment      + categoryId?, descriptionMd?   # (quick win: thêm mô tả)
tc_grade.score     → ĐỔI INTEGER → REAL            # cho điểm thập phân + auto-grade phân số
tc_assignment.maxScore → ĐỔI INTEGER → REAL
```
> **Quyết định kiểu điểm:** chuyển `score`/`maxScore`/mọi điểm auto-grade sang **REAL** (số thực). Audit chỉ rõ INTEGER quá hẹp cho auto-grade (% test-case, điểm quiz phân số, trọng số). Vẫn là **số** (không mã hóa) → P6 thống kê được. Migration: `ALTER`/recreate cột (SQLite: tạo cột mới REAL, copy, drop — script S0).
🛠️ Điểm tổng = Σ(điểm nhóm × weight). Rubric: để **bước sau** (`tc_rubric` optional) — ship-small. Export CSV = quick win (scope owner, audit `export`).
🗣️ Tự tính điểm tổng kết theo tỉ lệ (thi 30%…), điểm lẻ được (8.5).

### 1.8 — Enrollment nâng cao (nhóm h) — ⭐⭐
Đã có `enrollment` (Quyết định 0). Thêm **import CSV** (quick win) + (tùy chọn xa) self-enrol bằng `class_enrol_code`. **KHÔNG** làm multi-role/groups (single-user).

### Bảng tổng hợp field PII mới cần mã hóa (cho privacy-auditor)
| Bảng.field | Lý do 🔒 |
|---|---|
| `lms_person.displayName`, `.email` | PII (có thể minor) — mã hóa, `emailIndex` blind-index |
| `tc_question.correctJson` | đáp án đúng — không để lộ kể cả khi rò DB / xuống client |
| `tc_quiz_attempt.answersJson` | bài làm HV = dữ liệu cá nhân |
| `tc_test_case.input/expectedOutput` (test ẩn) | lộ = lộ lời giải; mã hóa + không expose |
| `tc_code_submission.sourceCode` | code HV = PII + sở hữu trí tuệ |
| `tc_post.bodyMd` | nội dung HV viết — cân nhắc (thường không mã hóa để search, nhưng phải sanitize + kiểm duyệt) |

---

## Quyết định 2 — Cơ chế AUTO-GRADE quiz (lưu đáp án an toàn, chấm phía server)

### Decision
1. **Đáp án đúng (`tc_question.correctJson`) mã hóa at-rest** (🔒, AES-256-GCM) và **KHÔNG BAO GIỜ gửi xuống client** khi HV đang làm bài. Client chỉ nhận `stemMd` + `choicesJson` (đã trộn thứ tự nếu `shuffle`).
2. **Chấm 100% ở server** trong Server Action / Route Handler `(/api/lms/quiz/submit)`:
   - studentId/personId **server-derived**; validate `enrollment` (membership) + `maxAttempts` + `timeLimit` (so `startedAt`).
   - Giải mã `correctJson` **chỉ trong bộ nhớ server** lúc chấm; so với `answersJson` HV gửi.
   - Tính điểm theo loại: `mcq_single`/`true_false` = đúng/sai; `mcq_multi` = all-or-nothing hoặc partial (chốt ở spec); `short` = so khớp chuẩn hóa (lowercase/trim, optional regex/accept-list).
   - Ghi `tc_quiz_attempt(score, gradedAt)`; đẩy điểm sang gradebook (`tc_grade` hoặc cột tổng hợp); audit `submit_quiz`.
3. **Chống chép:** `shuffle` thứ tự câu/đáp án per-attempt; `pickFromCategory` rút ngẫu nhiên K câu từ category; reveal đáp án chỉ sau khi nộp/hết hạn (`revealAfter`).
4. **Idempotent submit:** 1 attempt = 1 lần chấm; resubmit tạo attempt mới (nếu còn lượt) — KHÔNG ghi đè, giữ lịch sử (audit).

🛠️ **Kỹ thuật:** Đáp án nằm ở DB dạng ciphertext; quá trình "lộ đáp án" duy nhất là khi server tự giải mã để chấm → không có đường nào ra client. Time-limit enforce bằng so `startedAt` server-side (không tin đồng hồ client). `answersJson` lưu lại (🔒) để Minh xem lại/khiếu nại.
🗣️ **Bình dân:** Máy chủ giữ đáp án trong "két", chỉ mở ra **lúc chấm**, rồi báo điểm — trình duyệt của HV không bao giờ nhìn thấy đáp án trước. Mỗi HV một đề xáo trộn nên khó nhìn bài nhau.

### Rủi ro & đánh đổi
- ⚠️ `short` (trả lời ngắn) auto-grade dễ "sai oan" (chính tả/biến thể) → bắt đầu chỉ MCQ/true-false (chấm chắc chắn), `short` thêm accept-list/regex sau.
- ⚠️ Nếu lỡ để `correctJson` lọt vào props của React Server→Client (hydration) là lộ → **quy tắc cứng:** quiz-taking component KHÔNG nhận `correctJson` ở bất kỳ prop nào; lint/review chặn. (Thêm vào checklist privacy giống "portal không import @/db/client".)

---

## Quyết định 3 — Kiến trúc CHẤM CODE (HackerRank-like): self-host vs dịch vụ — ⭐ quyết định lớn nhất

> **Đây là quyết định có chi phí + đụng dữ liệu cá nhân → BẮT BUỘC Minh duyệt + privacy-auditor TRƯỚC khi build (R-JL-LOCAL-FIRST-01).** Chạy **code không tin cậy của học viên** là rủi ro an ninh hạng nặng (sandbox-escape → chiếm máy chủ), càng nặng vì có **HV vị thành niên** (nghĩa vụ pháp lý).

### Ràng buộc nền tảng quan trọng
**Vercel serverless KHÔNG chạy được untrusted code an toàn** (không kiểm soát kernel/namespace/cgroup, không bật `--privileged`, timeout ngắn, ephemeral). → Việc chấm code **PHẢI tách ra một worker/sandbox riêng**, KHÔNG nằm trong Vercel function. Web app (Vercel) chỉ **xếp hàng job** và **đọc kết quả** (async).

### Options Considered

#### Option 3A — Tự dựng runner (subprocess + timeout, KHÔNG sandbox thật)
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★☆ — viết nhanh (Python `subprocess` + `timeout`) |
| Cost | ★★★★★ — 0đ |
| Privacy | ★★★☆☆ — code không rời máy mình (tốt cho LOCAL-FIRST) |
| **An ninh** | ★☆☆☆☆ — **KHÔNG cô lập kernel**: code HV chạy như tiến trình thường, có thể đọc file/ra mạng/ngốn tài nguyên |
| Solo-fit | ★★☆☆☆ |

**Verdict:** **CHỈ chấp nhận môi trường LOCAL một mình Minh** (dev/thử nghiệm), **TUYỆT ĐỐI KHÔNG cho production đa người** (audit + gap analysis đều cấm: rủi ro sandbox-escape với minor).

#### Option 3B — Judge0 self-host (Docker + `isolate`) — **KHUYẾN NGHỊ cho production**
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★☆☆ — chạy 1 stack Docker (api + worker + db + redis), cần 1 host Linux (VPS) ngoài Vercel |
| Cost | ★★★☆☆ — 1 VPS nhỏ (vài đô/tháng) — Minh duyệt |
| **Privacy** | ★★★★★ — **code HV KHÔNG rời hạ tầng của Minh** (self-host), đúng R-JL-LOCAL-FIRST |
| **An ninh** | ★★★★☆ — `isolate` (Linux namespaces + cgroups), giới hạn time/mem; **nhưng** ship `--privileged` + có lịch sử CVE 2024 (CVE-2024-29021, vá ở 1.13.1) → **phải:** chạy host riêng/cách ly, cập nhật ≥1.13.1, **TẮT network egress** worker, đặt sau firewall, không phơi API ra internet |
| Solo-fit | ★★★☆☆ — phải vận hành 1 service + patch định kỳ (nhưng giá trị xứng cho trọng tâm dạy code) |

**Pros:** Đa ngôn ngữ sẵn (Python/JS/C++/Java…), chấm thật, kiểm soát giới hạn, **dữ liệu không ra ngoài**. **Cons:** Phải có 1 host Linux riêng + kỷ luật bảo mật/patch.

#### Option 3C — Piston self-host (Docker, oriented untrusted code)
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★☆ — nhẹ hơn Judge0 (ít thành phần) |
| Cost | ★★★☆☆ — 1 VPS nhỏ |
| Privacy | ★★★★★ — self-host, code không rời |
| An ninh | ★★★★☆ — thiết kế cho untrusted code; vẫn cần network-off + patch + host cách ly |
| Solo-fit | ★★★★☆ — đơn giản hơn để vận hành solo |

**Pros:** Gọn, định hướng untrusted, dễ vận hành cho 1 người. **Cons:** Ít "battery-included" hơn Judge0 (queue/verdict structure phải tự lắp thêm), nhưng phù hợp ship-small.

#### Option 3D — Dịch vụ cloud chấm code (Judge0 RapidAPI / Sphere Engine / E2B…)
| Trục | Đánh giá |
|---|---|
| Complexity | ★★★★★ — không vận hành |
| Cost | ★★☆☆☆ — trả phí theo lượt / subscription |
| **Privacy** | ★☆☆☆☆ — **GỬI code HV ra bên thứ ba** → đụng R-JL-PRIVACY/LOCAL-FIRST/STUDENT-PII; code HV vị thành niên rời hạ tầng |
| An ninh | ★★★★★ (họ lo sandbox) |
| Solo-fit | ★★★★☆ |

**Verdict:** Tiện nhất nhưng **xung đột privacy-first** (giống Turso/object-storage ở P5b nhưng nhạy hơn vì là **mã + có thể PII trong code**). **Chỉ chọn nếu Minh chấp nhận đánh đổi privacy** sau khi privacy-auditor cân nhắc + cập nhật consent/notice.

### Decision (khuyến nghị — chờ Minh chốt)
- **Khuyến nghị: Option 3C (Piston self-host) cho production**, hoặc **3B (Judge0 self-host)** nếu cần đa ngôn ngữ rộng + hệ sinh thái chấm thi sẵn. Cả hai **giữ code HV trong hạ tầng của Minh** (đúng LOCAL-FIRST) và **tách hẳn khỏi Vercel**.
- **Bắt buộc kèm theo (điều kiện build):** (1) worker chạy trên **host Linux riêng, cách ly**, KHÔNG chung máy với DB PII; (2) **network egress của sandbox = OFF**; (3) phiên bản đã vá CVE (Judge0 ≥1.13.1); (4) API judge **không phơi ra internet** — chỉ Vercel function gọi qua kênh kín (mạng nội bộ/secret token); (5) giới hạn time/mem/output cứng; (6) `sourceCode` + test ẩn **mã hóa at-rest** trong lms.db; (7) audit `run_code`/`submit_code`.
- **Cho giai đoạn dev local của Minh:** có thể dùng **Option 3A** để dựng UI/luồng (editor → run → verdict) **trước**, đằng sau 1 **adapter interface** (`CodeJudge`), rồi đổi sang 3C/3B ở go-live **không rewrite** (chỉ đổi implementation adapter). **Cờ chặn:** adapter 3A **từ chối chạy nếu `NODE_ENV=production`** (giống guard seed/dev đã có).

🛠️ **Kỹ thuật:** Định nghĩa interface `interface CodeJudge { run(req): Promise<Verdict> }`; web app chỉ phụ thuộc interface. Submit code → ghi `tc_code_submission(status=queued)` → đẩy job (HTTP nội bộ tới Piston/Judge0, hoặc queue) → worker chấm từng `tc_test_case` → ghi `tc_code_run` + cập nhật `tc_code_submission(status=done, score, verdict)`. Test ẩn: chỉ trả pass/fail + thông báo an toàn, **không** trả input/expected.
🗣️ **Bình dân:** Chạy bài code của HV là việc nguy hiểm (như mở file lạ) → KHÔNG cho chạy trên máy chủ web. Ta đặt một **"phòng cách ly"** riêng (self-host) để chạy, **ngắt mạng** phòng đó, và web chỉ gửi đề + nhận điểm. Tạm thời lúc làm thử trên máy Minh thì dùng cách đơn giản, nhưng **khóa không cho lên mạng thật**.

### Rủi ro lớn nhất của ADR (escalate)
> **Sandbox-escape khi chạy code untrusted của HV vị thành niên = rủi ro an ninh + pháp lý cao nhất toàn dự án.** Vì vậy nhóm (c) **không được build production** cho tới khi: Minh duyệt hạ tầng/chi phí + privacy-auditor PASS + đủ 7 điều kiện trên. Trước đó chỉ làm UI/adapter local (3A, chặn prod).

---

## Quyết định 4 — Content delivery (video / file) trên Vercel + object storage

### Decision
- **Video bài giảng:** KHÔNG tự host video (tốn băng thông/đĩa, Vercel không hợp). Dùng **embed qua host whitelist** (YouTube/Vimeo/Drive) — `tc_lesson.videoUrl` chỉ chấp nhận host trong allowlist, render `<iframe sandbox>` (chống XSS/clickjacking). Quick win đã nêu trong gap analysis.
- **File (material/submission):** giữ kiến trúc ADR-002 — local đĩa ở P5a; **object storage ở go-live**. Vì Vercel serverless **không giữ đĩa**, file PHẢI ra **object storage** trước khi nhận HV thật (đây cũng là blocker P5b đã biết). Phục vụ qua route LMS có auth + `Content-Disposition: attachment` + `nosniff` (đã có cho submission; **làm tiếp** cho material `/api/lms/material/[ref]` — hiện còn "Sắp có").
- **Object storage = third-party giữ dữ liệu → Minh duyệt** (S3-compatible: Cloudflare R2 / Backblaze B2 / Vercel Blob…). File PII (bài nộp) cân nhắc **mã hóa client-side trước khi upload** hoặc dùng bucket private + signed URL ngắn hạn. Giữ `fileRef` không đoán được; không lộ tên gốc trên URL.

🛠️ **Kỹ thuật:** Adapter `Storage` interface (đã có `storage.ts` cho local) → thêm impl object-storage; route file đọc qua adapter. Video: `isAllowedEmbedHost(url)` + map sang embed URL chuẩn; iframe `sandbox="allow-scripts allow-same-origin"` tối thiểu.
🗣️ **Bình dân:** Video thì **nhúng từ YouTube/Drive** (không tự chứa) cho nhẹ; file bài nộp/tài liệu chuyển sang **kho lưu trữ đám mây** (vì Vercel không giữ file lâu), nhưng vẫn khóa quyền — chỉ đúng người tải được.

### Rủi ro & đánh đổi
- ⚠️ Object storage là third-party giữ PII → cùng nhóm rủi ro Turso (đã chấp nhận ở P5b với điều kiện). Privacy-auditor soát lại.
- ⚠️ Embed iframe = tin host ngoài (YouTube) → giới hạn allowlist + sandbox iframe để giảm bề mặt.

---

## Quyết định 5 — Tiến độ & chứng chỉ

### Decision
- **Tiến độ:** neo vào `enrollment` + `tc_progress` (Quyết định 1.4). **% khóa = số item `done` / tổng item published của course** (lesson/quiz/code/material). Tận dụng lại `getMyLearningSummary`/`getMyClassProgress` (Phase 6) — đổi nguồn đếm từ "submission" sang "progress + enrollment". Đánh dấu hoàn thành: lesson/material = thủ công (tick) hoặc tự động (xem hết video — xa); quiz/code = tự động khi đạt ngưỡng.
- **Chứng chỉ:** cấp khi **đạt tiêu chí** (vd: hoàn thành ≥X% + điểm tổng ≥ ngưỡng) — tiêu chí lưu `criteriaSnapshotJson` (chụp lại lúc cấp để truy vết). Render **PDF server-side** (lib JS thuần, không service ngoài). Trang **`/verify/[code]` công khai** chỉ hiện tên khóa + ngày + hợp lệ/không (KHÔNG lộ PII thừa; cân nhắc cho HV chọn ẩn tên — bảo vệ minor).

🛠️ **Kỹ thuật:** Certificate là **dẫn xuất** (derive) từ progress+grade tại thời điểm cấp → snapshot tiêu chí để về sau đổi tiêu chí không làm sai chứng chỉ cũ. `verifyCode` = random ~128bit (như fileRef), unique, revoke được.
🗣️ **Bình dân:** "Đã học xong bao nhiêu %" tính theo số bài đã hoàn thành; học xong + đủ điểm → nhận **giấy chứng nhận PDF** có mã tra cứu công khai (chỉ hiện tên khóa, không lộ thông tin riêng).

---

## Quyết định 6 — Referential integrity & cascade cho bảng mới (sửa gap mồ côi)

> Audit chỉ rõ: lms.db **không có FK/ON DELETE**, cascade phải liệt kê tay; thêm bảng mới mà quên sửa cascade = **mồ côi dữ liệu**. ADR-003 thêm RẤT nhiều bảng → phải xử lý có hệ thống.

### Decision
1. **Mỗi bảng mới có dữ liệu cá nhân/treo vào person/class/course PHẢI được thêm vào cascade NGAY khi tạo** (định nghĩa schema + cascade trong cùng PR). Bảng cần thêm vào `deleteStudentCascade`/(mới) `deletePersonCascade`: `tc_quiz_attempt`, `tc_code_submission` (+ `tc_code_run`), `tc_progress`, `tc_certificate`, `tc_post`/`tc_thread` (theo author), `enrollment`, `lms_person`.
2. **Thêm `deleteCourseCascade(courseId)` và `deleteClassCascade(classId)`** (audit chỉ ra hiện chỉ `archiveClass`, KHÔNG có xóa lớp cascade). Xóa course → module/lesson/quiz/question-link/code-problem/test-case + (cảnh báo nếu còn enrollment/submission).
3. **Bật `PRAGMA foreign_keys` + FK ON DELETE CASCADE TRONG CÙNG lms.db** cho các quan hệ nội-bộ an toàn (module→lesson, quiz→quiz_question, problem→test_case, submission→code_run). **KHÔNG** FK chéo sang personal.db (giữ R-JL-TWO-FACES). → giảm gánh "liệt kê tay" cho quan hệ cấu trúc; giữ app-enforced cho quan hệ person (vì còn audit/file đĩa cần xử lý ngoài DB).
4. **ESLint rule cứng** `no-restricted-imports` chặn `@/db/client` trong `src/app/portal/**` + `src/lib/lms/**` + `src/app/api/lms/**` (audit đề xuất — biến bất biến two-faces từ "review thủ công" thành "fail build"). Thêm cùng đợt này.

🛠️ **Kỹ thuật:** FK nội-DB chỉ cho quan hệ "cha-con cấu trúc" (xóa cha → con tự đi); quan hệ "person/file/audit" giữ transaction tay (vì có IO đĩa + audit ngoài DB). Migration bật FK: tạo bảng mới có `REFERENCES ... ON DELETE CASCADE` + `PRAGMA foreign_keys=ON` ở client.
🗣️ **Bình dân:** Mỗi lần thêm "ngăn tủ" mới (quiz, bài code, chứng chỉ…) là **gắn luôn vào máy hủy tài liệu** để khi xóa học viên/khóa không sót giấy tờ; và đặt **rào tự động** (lint) để không ai vô tình nối nhầm sang sổ riêng của Minh.

---

## Quyết định 7 — Lộ trình build theo phase (ship-small, mỗi phase tsc+build XANH, qua QC-GATE)

> Map với lộ trình P7–P11 trong gap analysis. Mỗi phase độc lập biên dịch + có giá trị dùng được ngay (R-JL-SHIP-SMALL). Nhóm (c) tách riêng vì cần Minh duyệt hạ tầng.

| Phase | Nội dung | Phụ thuộc | Gate |
|---|---|---|---|
| **S0 — Nền identity/course (Quyết định 0+6)** | `tc_course` + `lms_person` + `enrollment`; migration gộp danh tính; đổi `score`→REAL; refactor `portal-queries` sang `myEnrollments`; thêm `deleteClassCascade`/`deleteCourseCascade`; ESLint no-restricted-imports; FK nội-DB. | — | privacy-auditor xem identity gộp + cascade |
| **P7 — Cấu trúc khóa học (a) + quick wins** | `tc_module`/`tc_lesson` + gắn material vào lesson + **embed video whitelist**; mở tiến độ (d) xuống lesson (`tc_progress`); **Export CSV** + **Import CSV** + `descriptionMd` bài tập. | S0 | qa + uat |
| **P8 — Quiz tự chấm (b)** | `tc_quiz`/`tc_question`/`tc_quiz_question`/`tc_quiz_attempt`; auto-grade server (Quyết định 2); MCQ/true-false trước → question-bank + đề ngẫu nhiên sau. Điểm về gradebook. | P7 | privacy-auditor (đáp án/bài làm) |
| **P9 — Bài code (c) ⭐** | **ADR/duyệt hạ tầng TRƯỚC** (Quyết định 3): Minh chốt 3B/3C + privacy-auditor PASS + 7 điều kiện. Rồi: `tc_code_problem`/`tc_test_case`/`tc_code_submission`/`tc_code_run`; editor + run + verdict + leaderboard; adapter `CodeJudge`. | P7, **Minh duyệt** | privacy-auditor + an ninh sandbox |
| **P10 — Gradebook nâng cao (g) + chứng chỉ (e)** | `tc_grade_category` + trọng số; (optional rubric); `tc_certificate` + PDF + `/verify/[code]`. | P8/P9 | qa + uat + privacy (verify công khai) |
| **P11 — Tương tác (f) + enrollment nâng cao (h)** | `tc_thread`/`tc_post` (sanitize + kiểm duyệt); (xa) peer review; self-enrol code. | S0 | privacy-auditor (UGC) |

> **Trước khi nhận HV thật (chặn mọi phase go-live):** gỡ/đóng cờ `src/app/api/debug-auth/route.ts` + bỏ `DISABLE_OWNER_AUTH`; hoàn tất go-live P5b (Turso + object storage + Google OAuth whitelist + mã hóa lại PII plaintext + rate-limit access-code chuyển store bền). Đây là **điều kiện tiên quyết** đã ghi ở audit, ADR-003 không thay thế.

---

## Rủi ro lớn & đánh đổi (tổng hợp)

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Sandbox-escape chạy code untrusted (HV minor)** | 🔴 Cao nhất | KHÔNG chạy trên Vercel; self-host cách ly + network-off + patch + 7 điều kiện; KHÔNG dùng runner 3A ở prod; Minh duyệt + privacy-auditor PASS trước build |
| **Lộ đáp án quiz** (correctJson xuống client / rò DB) | 🟠 Cao | Mã hóa `correctJson`; chấm server-only; lint chặn prop chứa đáp án |
| **Ripple do thiếu identity/enrollment** | 🟠 Cao | Quyết định 0 làm TRƯỚC (S0); refactor scoping gói trong `portal-queries` |
| **Mồ côi dữ liệu khi thêm nhiều bảng** | 🟠 Cao | Quyết định 6: cascade-cùng-PR + FK nội-DB + `deleteCourse/ClassCascade` |
| **Gửi code/PII ra third-party** (3D/object-storage/Turso) | 🟠 Cao | Ưu tiên self-host (3B/3C); object-storage private + signed URL; Minh duyệt từng third-party |
| **Stored-XSS từ UGC** (forum bodyMd, video embed, file inline) | 🟡 Vừa | Sanitize markdown allowlist; iframe sandbox + host whitelist; file attachment+nosniff |
| **score INTEGER quá hẹp cho auto-grade** | 🟡 Vừa | Đổi REAL ở S0 (1 migration) |
| **Over-engineer (Moodle-full)** | 🟡 Vừa | Bỏ capability/role/groups; ship-small theo phase; quick wins trước |

---

## Consequences

- ✅ **Dễ hơn / đúng hơn:** có **xương sống course/enrollment** → quiz/code/tiến độ/chứng chỉ "cắm vào" không ripple; identity chuẩn hóa (mã hóa PII 1 lần, cascade gọn); điểm REAL đủ cho auto-grade; cascade + FK nội-DB + lint chặn rò chéo → bớt nợ kỹ thuật audit nêu.
- ✅ **Ship được từng phần:** P7 (khóa học + quick wins) dùng được ngay mà chưa cần đụng sandbox; nhóm code (P9) tách riêng, không chặn phần khác.
- ✅ **Privacy-first giữ nguyên:** mọi bảng trong lms.db; field nhạy cảm (đáp án/code/bài làm) mã hóa; chấm server/self-host; third-party đều qua duyệt.
- ⚠️ **Khó hơn:** S0 cần 1 migration gộp danh tính + refactor scoping (một lần, có kiểm soát). Nhóm code cần **1 host Linux riêng** (chi phí + vận hành/patch) — đánh đổi xứng cho trọng tâm dạy lập trình, nhưng **phải Minh chốt**.
- ⚠️ **Phụ thuộc mới (theo phase):** P7: lib markdown sanitize + (PDF ở P10) — JS thuần, không service ngoài. P9: Piston/Judge0 self-host (Docker, host riêng) — **third-party hạ tầng, Minh duyệt**. Object storage (go-live) — Minh duyệt.
- 🔁 **Phải xem lại nếu:** Minh muốn mở **TA/co-teacher** (khi đó thêm `enrollment.role` + capability nhẹ); muốn **peer review** (thêm bảng + scoping ẩn danh); chọn **3D cloud judge** (privacy-auditor phải cân nhắc lại + cập nhật consent/notice); cần **transcript/skill-tracking** Coursera (xa).

---

## Privacy flags (cần privacy-auditor + chủ dự án duyệt TRƯỚC khi build)
1. **[BẮT BUỘC duyệt — P9]** Hạ tầng chấm code: self-host Piston/Judge0 (3B/3C, khuyến nghị) **vs** cloud judge (3D, gửi code HV ra ngoài). Có **chi phí VPS** + đụng **code HV (có thể minor)**. → Minh chốt + privacy-auditor + 7 điều kiện an ninh.
2. **[duyệt — go-live]** Object storage cho file PII (third-party giữ dữ liệu) — bucket private + signed URL + cân nhắc mã hóa trước upload.
3. **[review — P8/P9/P11]** Field nhạy cảm mới mã hóa at-rest: `correctJson`, `answersJson`, `sourceCode`, test ẩn; UGC forum sanitize + kiểm duyệt.
4. **[review — P10]** Trang `/verify/[code]` công khai: chỉ tên khóa + ngày + hợp lệ; cân nhắc cho HV ẩn tên (bảo vệ minor).

## Liên quan
- `ADR-001-tech-stack-21062026.md` · `ADR-002-multiuser-lms-21062026.md` · `Privacy-Audit-P5-21062026.md` · `GOLIVE-P5b-runbook.md` · `LMS-gap-analysis.md` · `00-critical-rules.md` (R-JL-TWO-FACES / STUDENT-PII / PRIVACY / LOCAL-FIRST / SHIP-SMALL / NO-BLOAT / NO-HARDCODE / SPEC-FIRST / QC-GATE).

## Nguồn tham khảo (chấm code self-host vs cloud)
- Judge0 (self-host, `isolate` sandbox): https://github.com/judge0/judge0 · https://judge0.com/
- Judge0 sandbox-escape + CVE-2024-29021 (vá ở 1.13.1 — lý do phải patch + cách ly + network-off): https://tantosec.com/blog/judge0/ · https://thehackernews.com/2024/04/sandbox-escape-vulnerabilities-in.html
- So sánh engine chấm code (Judge0/Piston/E2B): https://rustbox.sh/blog/rustbox-vs-judge0-vs-e2b-vs-piston-code-execution-engine
