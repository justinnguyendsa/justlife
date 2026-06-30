# LMS Gap Analysis — justlife vs Moodle · Coursera · HackerRank

**Date:** 30/06/2026 · **Author:** research agent (justlife) · **Loại:** nghiên cứu + gap analysis (KHÔNG code)
**Bối cảnh:** justlife là "một app hai mặt". Mặt LMS hiện là **quản lý lớp + cổng học viên nhẹ** (class/student/attendance/assignment/grade/submission/material + tiến độ kiểu Coursera). Mục tiêu: nâng lên **nền tảng học tập đầy đủ** lấy cảm hứng Moodle (cấu trúc + đánh giá) · Coursera (nội dung + tiến độ + chứng chỉ) · HackerRank (bài code chấm tự động).
**Trọng tâm ưu tiên:** Minh dạy **lập trình** ở MindX → **coding-challenge có sức nặng nhất**.

> Giải thích song ngữ (R-JL-DUAL-LANG-EXPLAIN-01): 🛠️ kỹ thuật · 🗣️ bình dân.
> Mọi đề xuất phải tôn trọng bất biến: **R-JL-TWO-FACES** (lms.db tách hẳn personal.db), **R-JL-STUDENT-PII** (PII tối thiểu, mã hóa, audit), **R-JL-SHIP-SMALL**, **R-JL-NO-BLOAT**, **R-JL-PRIVACY**, copy 100% tiếng Việt, token Cobalt & Amber.

---

## 0. TL;DR

justlife đã làm **rất tốt phần nền nhạy cảm** (tách DB, auth, scoping chống IDOR, mã hóa PII, audit append-only, cascade delete, consent) và **một phần trải nghiệm Coursera** (thanh tiến độ, streak, thống kê 28 ngày, tóm tắt học tập). Nhưng về **năng lực dạy-học cốt lõi**, justlife mới phủ ~**1/8** so với 3 nền tảng tham chiếu:

- ✅ Có: lớp học, điểm danh, bài tập **nộp-file** + chấm tay, tài liệu, gradebook **đơn giản** (1 điểm/bài), tiến độ %.
- ❌ Thiếu hoàn toàn: **cấu trúc nội dung khóa học** (module/lesson/video), **quiz + question bank + chấm tự động**, **bài code kiểu HackerRank** (đề + test-case + chấm sandbox + leaderboard), **chứng chỉ**, **forum/Q&A/peer review**, **gradebook trọng số + rubric**, **ghi danh tự phục vụ**.

**3 gap lớn nhất** (xem §11): (1) Bài code auto-grade — đúng trọng tâm dạy lập trình; (2) Cấu trúc khóa học module/lesson/video — xương sống mọi LMS; (3) Quiz + question bank chấm tự động — đòn bẩy lớn cho lớp đông.

**Quick wins** (xem §12): bật **link video YouTube/Drive** vào material, **quiz trắc nghiệm tự chấm** tối giản, **trang xếp hạng (leaderboard) theo điểm có sẵn**, **trạng thái hoàn thành thủ công** cho material.

---

## 1. Hiện trạng justlife (đọc từ repo thật)

**Schema `lms.db`** (`src/db/lms/schema.ts`): `tc_class`, `tc_student`, `tc_session`, `tc_attendance`, `tc_assignment` (chỉ `title/dueAt/maxScore`), `tc_grade` (1 `score` số + `feedback`), `tc_submission` (nộp **file**), `tc_material` (file/url + `visibility`), `lms_user`, `access_code`, `consent_log`, `access_audit`.

**Cổng học viên** (`src/app/portal/**`): dashboard, grades, materials, assignments, profile, consent. Đăng nhập access-code (HV) / Google (owner).

**Khu dạy (owner)** (`src/app/(app)/teaching/**` + `src/app/actions/teaching.ts`): CRUD class/student/session/attendance/assignment/grade; thống kê lớp (`getClassSummary`, `getStudentProgressInClass`, `getAssignmentSubmissionStats`).

**Tiến độ kiểu Coursera đã có** (`src/lib/lms/portal-queries.ts`, Phase 6 ST-1~4): `getMyClassProgress` (% nộp/lớp), `getMyActivityDates` (streak calendar), `getMyStats28d`, `getMyLearningSummary`.

**Bảo mật** (`src/lib/lms/**`): crypto AES-256-GCM + blind-index, access-code rate-limit, audit append-only, cascade delete, consent, upload-policy, storage guard.

> ⚠️ **Lưu ý:** `st_course/st_lesson` trong `src/db/schema.ts` là **Study OS cá nhân của Minh** (personal.db) — KHÔNG phải khóa học cho học viên. Trường `kind` của task có nhãn "quiz" chỉ là enum phân loại, **không** có engine quiz. → LMS thực sự **chưa có** bất kỳ tính năng nâng cao nào dưới đây.

---

## 2. Khung tham chiếu — bộ tính năng cốt lõi 3 nền tảng

| Nền tảng | Cốt lõi (đã xác nhận qua nguồn) |
|---|---|
| **Moodle** | Course → section/activity; **Quiz** (đa dạng loại câu hỏi: MCQ, đúng/sai, trả lời ngắn, kéo-thả…) + **Question bank** (kho câu hỏi theo category, tái dùng, **đề ngẫu nhiên** từ category); **Gradebook** nâng cao (trọng số, phương pháp chấm); **Activities**: Lesson, Forum, **Workshop** (peer assessment), SCORM, Survey; **Enrolment**: self-enrolment, **cohort** (ghi danh hàng loạt). |
| **Coursera** | Khóa → **module/tuần** → **video lessons** (transcript, tóm tắt) → quiz auto-grade + bài peer-review; **thanh tiến độ** per-course + tóm tắt tuần; **competency/skill tracking**; **chứng chỉ** hoàn thành (giá trị hồ sơ/LinkedIn); peer review (kể cả ML-assisted). |
| **HackerRank** | Bài code + **test-case** (công khai + ẩn) tăng dần độ khó; **chấm tự động** = % test-case pass; **biên dịch/chạy thử trong sandbox** trước nộp; phản hồi tức thì; **leaderboard** theo domain/điểm; đa ngôn ngữ lập trình. |

**Hạ tầng chấm code khả thi self-host:** **Judge0** (open-source, sandbox bằng `isolate`/Linux namespaces+cgroups giống Docker; API nộp code → chạy giới hạn thời gian/bộ nhớ → trả kết quả; dùng cho e-learning & competitive programming). → Lựa chọn tham chiếu cho nhóm (c).

---

## 3. Nhóm (a) — Nội dung khóa học (course / module / lesson / video / tài nguyên)

| Khía cạnh | justlife đang ở đâu | Target (Moodle/Coursera) |
|---|---|---|
| Đơn vị "khóa học" | ❌ Chỉ có **lớp** (`tc_class`) — không có khái niệm khóa/môn có cấu trúc | "Khóa" hoặc dùng lớp làm vùng chứa; thêm tầng **module/chương → lesson/bài** có thứ tự |
| Module / chương | ❌ Không có | Module có `order`, tiêu đề, mô tả |
| Lesson / bài giảng | ❌ Không có (chỉ có tài liệu rời) | Lesson = nội dung text/markdown + video nhúng + tài nguyên đính kèm |
| Video bài giảng | ⚠️ Chỉ có `tc_material.url` (link trần, không phân loại) | Video nhúng (YouTube/Vimeo/Drive) gắn vào lesson; (xa) transcript/tóm tắt |
| Tài nguyên | ✅ `tc_material` (file/url, `visibility=class|draft`, serve scoped) | Đã ổn — cần gắn material vào **lesson/module** thay vì chỉ vào lớp |
| Trình tự / khóa mở dần | ❌ Không | (Moodle) điều kiện hoàn thành mở bài kế (drip/sequential) |

**Trạng thái:** 🔴 thiếu xương sống. Hiện tài liệu là danh sách phẳng theo lớp.
**Ưu tiên:** ⭐⭐⭐⭐ (cao) — là khung để mọi thứ khác (quiz, tiến độ, chứng chỉ) gắn vào. Nhưng có thể làm **tối giản** trước (module → lesson → embed video + material), chưa cần drip.

🛠️ Thêm bảng `tc_module(classId, title, order)`, `tc_lesson(moduleId, title, contentMd, videoUrl, order)`; FK `tc_material.lessonId?`. Video = nhúng iframe có whitelist host (chống XSS).
🗣️ Cho lớp một "mục lục": chương → bài → (video + tài liệu), thay vì một đống file rời.

---

## 4. Nhóm (b) — Đánh giá (quiz, question bank, đề ngẫu nhiên, auto-grade)

| Khía cạnh | justlife đang ở đâu | Target |
|---|---|---|
| Quiz online | ❌ Không có. "Assignment" chỉ là **nộp file + chấm tay** | Quiz làm trực tiếp trên web, nhiều câu hỏi |
| Loại câu hỏi | ❌ Không có | MCQ (1/nhiều đáp án), đúng/sai, trả lời ngắn (so khớp), (xa) kéo-thả/điền khuyết |
| Question bank | ❌ Không có | Kho câu hỏi theo **category**, tái dùng nhiều quiz |
| Đề ngẫu nhiên | ❌ Không có | Rút N câu ngẫu nhiên từ category; trộn thứ tự đáp án (chống chép) |
| Chấm tự động | ❌ Chấm tay 100% | MCQ/đúng-sai/trả-lời-ngắn auto-grade tức thì |
| Giới hạn thời gian / số lần làm | ❌ Không có | Time limit, số attempt, hiện đáp án sau hạn |

**Trạng thái:** 🔴 thiếu hoàn toàn. Đây là đòn bẩy lớn khi lớp đông (chấm tay không scale).
**Ưu tiên:** ⭐⭐⭐⭐ (cao) — sau/song song cấu trúc khóa học. Bắt đầu bằng **MCQ + đúng/sai tự chấm**; question bank + đề ngẫu nhiên là bước 2.

🛠️ `tc_quiz(classId/lessonId, title, timeLimit, maxAttempts, shuffle)`, `tc_question(bankCategory, type, stemMd, choicesJson, correctJson, points)`, `tc_quiz_question` (n-n, hỗ trợ "rút ngẫu nhiên K từ category"), `tc_quiz_attempt(studentId, quizId, answersJson, score, startedAt, submittedAt)`. Auto-grade so `answersJson` với `correctJson` ở **server** (không lộ đáp án ra client). Điểm đổ về `tc_grade` (tái dùng gradebook).
🗣️ Cho học viên làm **bài trắc nghiệm chấm điểm ngay**; Minh soạn câu hỏi một lần, dùng lại nhiều lớp; mỗi HV một đề hơi khác để khó chép.

⚠️ **Privacy/bảo mật:** đáp án đúng KHÔNG bao giờ gửi xuống client trước khi nộp; điểm quiz scope theo `studentId` như mọi dữ liệu cá nhân; audit `submit_quiz`.

---

## 5. Nhóm (c) — Bài code kiểu HackerRank (đề + test-case + chấm tự động/sandbox + leaderboard) ⭐ TRỌNG TÂM

| Khía cạnh | justlife đang ở đâu | Target (HackerRank) |
|---|---|---|
| Đề bài code | ❌ Không có (chỉ nộp file) | Đề có mô tả, input/output mẫu, ràng buộc, ngôn ngữ cho phép |
| Trình soạn code trên web | ❌ Không có | Code editor trong trình duyệt; chọn ngôn ngữ |
| Test-case | ❌ Không có | Test công khai (mẫu) + **test ẩn**; nhiều case tăng độ khó |
| Chấm tự động | ❌ Không có | Chạy code với test → điểm = **% case pass**; phản hồi case nào fail (không lộ input ẩn) |
| Sandbox chạy an toàn | ❌ Không có | Cô lập tài nguyên (CPU/RAM/time), không cho code phá host/ra mạng |
| Chạy thử trước nộp | ❌ Không có | "Run" với case mẫu trước khi "Submit" |
| Leaderboard | ❌ Không có | Xếp hạng theo tổng điểm / số bài AC |
| Đa ngôn ngữ | ❌ Không có | Python/JS/C++/Java… (Minh dạy gì thì bật nấy) |

**Trạng thái:** 🔴 thiếu hoàn toàn — nhưng **đây là tính năng có giá trị nhất cho bối cảnh Minh dạy lập trình ở MindX**.
**Ưu tiên:** ⭐⭐⭐⭐⭐ (cao nhất theo bối cảnh). Đây là điểm khác biệt biến justlife từ "sổ điểm" thành "nơi luyện code".

**Quyết định kiến trúc lớn (cần Minh chốt — đề xuất ADR mới):**
- **Phương án A — Judge0 self-host (khuyến nghị):** Docker + worker `isolate`. Chấm thật, đa ngôn ngữ, kiểm soát giới hạn. Tốn 1 service chạy nền + chi phí hạ tầng; cần siết bảo mật (đã có lịch sử CVE sandbox-escape → phải cập nhật + network-egress off).
- **Phương án B — Judge0 cloud/API bên thứ ba:** nhanh, không vận hành; nhưng **gửi code HV ra ngoài** → đụng R-JL-PRIVACY/LOCAL-FIRST, cần Minh duyệt third-party (như Turso/object-storage ở P5b).
- **Phương án C — runner tối giản tự làm** (chỉ Python, chạy subprocess giới hạn timeout, KHÔNG sandbox thật): rẻ nhưng **rủi ro bảo mật cao** (code HV chạy trên máy chủ) → chỉ chấp nhận **local một mình Minh**, KHÔNG cho go-live đa người.

🛠️ Bảng: `tc_code_problem(classId, title, statementMd, languagesJson, timeLimitMs, memLimitMb)`, `tc_test_case(problemId, input, expectedOutput, isHidden, weight)`, `tc_code_submission(studentId, problemId, language, sourceCode🔒?, status, score, passed, total, ranAt)`, `tc_leaderboard` (view tính từ submission). Chấm = đẩy job sang Judge0, gom kết quả case → điểm. **Egress mạng của sandbox phải tắt**; giới hạn time/mem cứng.
🗣️ Học viên gõ code ngay trên web, bấm chạy thử với ví dụ, rồi nộp; hệ thống tự chấm bằng nhiều bộ test (có bộ giấu) và cho điểm theo số test đúng; có bảng xếp hạng để tạo động lực.

⚠️ **Privacy:** `sourceCode` của HV là dữ liệu cá nhân → cân nhắc mã hóa-at-rest hoặc retention ngắn; leaderboard chỉ hiện **tên hiển thị/biệt danh**, không lộ email; audit `run_code`/`submit_code`. Sandbox-escape là rủi ro pháp lý lớn vì có HV vị thành niên → **không dùng phương án C cho production**.

---

## 6. Nhóm (d) — Tiến độ & hoàn thành (Coursera)

| Khía cạnh | justlife đang ở đâu | Target |
|---|---|---|
| Thanh tiến độ per-lớp | ✅ `getMyClassProgress` (% bài đã nộp) | ✅ tương đương cơ bản |
| Streak / hoạt động | ✅ `getMyActivityDates` (calendar 28 ngày) | ✅ có, thậm chí vượt Coursera cơ bản |
| Thống kê cá nhân | ✅ `getMyStats28d`, `getMyLearningSummary` | ✅ tốt |
| Hoàn thành theo **bài/lesson** | ❌ Chưa (vì chưa có lesson) | Đánh dấu xong từng lesson/video/quiz → % khóa |
| Điều kiện hoàn thành | ❌ Không có | "Hoàn thành khi: xem video + đạt quiz ≥ X%" |
| Tiến độ theo **kỹ năng** (skill) | ❌ Không có | (Coursera) competency score — xa, optional |

**Trạng thái:** 🟢 nhóm **mạnh nhất** của justlife — đã có nền Coursera-style. Khoảng trống chỉ là **tiến độ ở cấp lesson/module** (phụ thuộc §3) và **rule hoàn thành**.
**Ưu tiên:** ⭐⭐⭐ (vừa) — nâng cấp tự nhiên sau khi có cấu trúc khóa học. Tận dụng lại code Phase 6.

🛠️ Thêm `tc_progress(studentId, lessonId|itemId, status, completedAt)`; % khóa = hoàn thành / tổng item. Tái dùng `getMyLearningSummary`.
🗣️ Mở rộng "đã nộp bài bao nhiêu %" thành "đã học xong bao nhiêu % khóa", tick từng bài.

---

## 7. Nhóm (e) — Chứng chỉ (Certificate)

| Khía cạnh | justlife đang ở đâu | Target |
|---|---|---|
| Cấp chứng chỉ | ❌ Không có | Khi đạt điều kiện (hoàn thành + điểm ≥ ngưỡng) → cấp |
| Bản chứng chỉ | ❌ Không có | Trang/PDF có tên HV, khóa, ngày, mã xác thực |
| Xác thực công khai | ❌ Không có | Link/QR kiểm tra chứng chỉ thật (verify code) |

**Trạng thái:** 🔴 chưa có. Phụ thuộc nhóm (d) + (b)/(c) (phải đo được "đạt").
**Ưu tiên:** ⭐⭐ (thấp-vừa) — giá trị động lực tốt cho HV MindX, nhưng đến **sau** khi đã có khóa + đánh giá để "đạt" có ý nghĩa. Bản tối giản (PDF + verify code) là đủ ở giai đoạn đầu.

🛠️ `tc_certificate(studentId, classId, issuedAt, verifyCode, criteriaSnapshotJson)`; render PDF server-side; trang `/verify/[code]` công khai (chỉ hiện tên khóa + hợp lệ, **không** lộ PII thừa).
🗣️ Học xong + đạt điểm → nhận **giấy chứng nhận** có mã tra cứu, khoe được trên hồ sơ.

⚠️ **Privacy:** trang verify công khai chỉ nên hiện tối thiểu (tên khóa, ngày, hợp lệ/không) — cân nhắc cho HV chọn ẩn tên; tránh lộ PII trẻ vị thành niên.

---

## 8. Nhóm (f) — Tương tác (forum / discussion / Q&A / peer review)

| Khía cạnh | justlife đang ở đâu | Target |
|---|---|---|
| Forum/thảo luận lớp | ❌ Không có | Thread theo lớp/bài; trả lời lồng nhau |
| Q&A hỏi-đáp | ❌ Không có | Hỏi gắn vào lesson/bài; Minh/HV trả lời |
| Bình luận bài giảng | ❌ Không có | Comment dưới lesson/video |
| Peer review | ❌ Không có | (Moodle Workshop / Coursera) HV chấm chéo theo rubric |
| Thông báo/nhắc | ⚠️ Không có (chỉ `dueAt` hiển thị) | Thông báo bài mới/hạn nộp (email ở P5b) |

**Trạng thái:** 🔴 chưa có tương tác hai chiều nào.
**Ưu tiên:** ⭐⭐ (thấp-vừa). Với lớp MindX có buổi học trực tiếp/chat sẵn, forum **không phải đòn bẩy đầu**. **Q&A theo bài** đơn giản là phần đáng làm nhất của nhóm này. **Peer review** đáng giá nhưng phức tạp + nhạy cảm (HV xem bài nhau) → để sau.

🛠️ `tc_thread(classId/lessonId, authorStudentId|owner, title)`, `tc_post(threadId, authorRef, bodyMd, parentId?)`. Peer review: `tc_peer_assignment` + `tc_peer_review(reviewerId, submissionId, rubricScoresJson)`.
🗣️ Cho lớp một chỗ **hỏi-đáp công khai** để khỏi lặp câu hỏi; (xa) cho HV chấm bài nhau theo khung điểm.

⚠️ **Privacy:** nội dung HV viết = dữ liệu cá nhân; cần kiểm duyệt/ẩn; peer review để HV thấy bài nhau → phải scope cẩn thận + ẩn danh người chấm.

---

## 9. Nhóm (g) — Gradebook nâng cao (trọng số, rubric)

| Khía cạnh | justlife đang ở đâu | Target (Moodle) |
|---|---|---|
| Sổ điểm | ✅ `tc_grade` (1 điểm số/bài) + tổng quan lớp | Có |
| Nhiều cột điểm tổng hợp | ⚠️ Có nhiều assignment nhưng **không có điểm tổng/trọng số** | Điểm cuối = Σ(điểm×trọng số) theo nhóm (quiz 30% + bài tập 40% + thi 30%) |
| Trọng số / nhóm điểm | ❌ Không có | Category có trọng số |
| Rubric / tiêu chí chấm | ❌ Không có (chỉ feedback tự do) | Rubric nhiều tiêu chí × mức điểm; marking guide |
| Letter grade / thang | ⚠️ Chỉ điểm số thô | Quy đổi thang điểm/chữ, đường cong |
| Xuất điểm | ❌ Không có | Export CSV/Excel |

**Trạng thái:** 🟡 có cơ bản, thiếu phần "nâng cao" (trọng số + rubric).
**Ưu tiên:** ⭐⭐⭐ (vừa) — **trọng số/điểm tổng** rất hữu ích khi đã có nhiều loại đánh giá (quiz + code + bài tập). **Rubric** đáng làm cho chấm bài tập dự án. **Export CSV** là quick win.

🛠️ `tc_grade_category(classId, name, weight)`; `tc_assignment.categoryId`; tính điểm tổng có trọng số. Rubric: `tc_rubric(criteriaJson)` + `tc_grade.rubricScoresJson`. Export = stream CSV (scope owner).
🗣️ Tự tính **điểm tổng kết** theo tỉ lệ (vd thi cuối 30%), và chấm bài theo **bảng tiêu chí** cho công bằng, minh bạch.

---

## 10. Nhóm (h) — Ghi danh / Enrollment (self-enroll, cohort)

| Khía cạnh | justlife đang ở đâu | Target (Moodle) |
|---|---|---|
| Thêm HV vào lớp | ✅ `addStudent` (owner thêm tay từng người) | Có |
| Ghi danh hàng loạt (cohort) | ❌ Không có | Import danh sách / cohort → ghi danh 1 lần |
| Tự ghi danh (self-enrol) | ❌ Không có | HV nhập mã lớp / tự đăng ký vào lớp công khai |
| HV thuộc nhiều lớp | ✅ Đã hỗ trợ (`myClassIds` xử lý nhiều bản ghi) | Có |
| Vai trò (role) | ⚠️ Chỉ student vs owner; chưa có TA/co-teacher | Nhiều vai (teacher/TA/student) |
| Nhóm trong lớp (groups) | ❌ Không có | Chia nhóm trong lớp |

**Trạng thái:** 🟡 có ghi danh thủ công cơ bản; thiếu hàng loạt + tự phục vụ.
**Ưu tiên:** ⭐⭐ (thấp-vừa cho 1 giảng viên). **Import CSV danh sách HV** là quick win hữu ích cho lớp MindX đông. **Self-enrol bằng mã lớp** tiện nhưng phải cân nhắc privacy (ai vào được). Multi-role/groups chưa cần khi chỉ mình Minh dạy.

🛠️ Import CSV → tạo `tc_student` hàng loạt (1 transaction) + sinh access-code/lời mời. Self-enrol: `class_enrol_code` + form HV nhập (rate-limit, audit). Role: thêm `lms_user.role` khi mở TA.
🗣️ Dán danh sách lớp một lần thay vì gõ từng HV; (tùy chọn) phát một mã lớp để HV tự vào.

⚠️ **Privacy:** self-enrol mở cửa lớp → phải chống spam/abuse, audit, và **consent minor vẫn bắt buộc** trước khi thu PII.

---

## 11. Bảng tổng hợp độ phủ + ưu tiên

| Nhóm năng lực | justlife | Độ phủ | Ưu tiên (bối cảnh Minh dạy code) | Phụ thuộc |
|---|---|---|---|---|
| (c) **Bài code auto-grade + leaderboard** | ❌ | 0% | ⭐⭐⭐⭐⭐ | ADR sandbox (Judge0) — Minh chốt |
| (a) **Cấu trúc khóa học** (module/lesson/video) | ❌ | ~10% (chỉ material) | ⭐⭐⭐⭐ | — (nền cho d/e) |
| (b) **Quiz + question bank + auto-grade** | ❌ | 0% | ⭐⭐⭐⭐ | nên có (a) trước |
| (g) **Gradebook trọng số + rubric** | 🟡 | ~35% | ⭐⭐⭐ | hữu ích sau (b)/(c) |
| (d) **Tiến độ & hoàn thành** | ✅ | ~60% | ⭐⭐⭐ | cấp lesson cần (a) |
| (h) **Enrollment** (cohort/self) | 🟡 | ~30% | ⭐⭐ | — |
| (e) **Chứng chỉ** | ❌ | 0% | ⭐⭐ | cần (d)+(b/c) |
| (f) **Forum/Q&A/peer review** | ❌ | 0% | ⭐⭐ | — |

**3 GAP LỚN NHẤT (đề xuất làm trước):**
1. **(c) Bài code chấm tự động + leaderboard** — đúng trọng tâm dạy lập trình ở MindX; biến justlife thành nơi luyện code, không chỉ ghi điểm. Cần Minh chốt kiến trúc sandbox (ADR mới).
2. **(a) Cấu trúc khóa học module → lesson → video + tài nguyên** — xương sống để gắn quiz/code/tiến độ/chứng chỉ; có thể làm tối giản trước.
3. **(b) Quiz + question bank + chấm tự động** — đòn bẩy lớn cho lớp đông, giảm chấm tay; bắt đầu bằng MCQ/đúng-sai.

---

## 12. Quick wins (giá trị cao / công thấp, tôn trọng ship-small)

| Quick win | Vì sao đáng làm | Ghi chú kỹ thuật |
|---|---|---|
| **Nhúng video vào tài liệu** | Tận dụng `tc_material.url` sẵn có → có "bài giảng video" ngay mà chưa cần module | Whitelist host (YouTube/Vimeo/Drive), render iframe an toàn (chống XSS) |
| **Đánh dấu hoàn thành material thủ công** | Mở rộng tiến độ Coursera-style đã có xuống cấp tài liệu | Thêm `tc_progress` tối giản (studentId, materialId, done) |
| **Quiz trắc nghiệm tự chấm (MCQ/đúng-sai)** | Phần rẻ nhất của nhóm (b), giá trị lớn; chưa cần question bank | 2 bảng `tc_quiz` + `tc_question`; chấm so đáp án ở server |
| **Leaderboard theo điểm có sẵn** | Tạo động lực ngay từ `tc_grade` hiện có, chưa cần engine code | View xếp hạng điểm TB/lớp; chỉ hiện tên hiển thị (privacy) |
| **Export điểm CSV (owner)** | Gradebook hữu dụng hơn nhiều với 1 nút | Stream CSV scope owner; audit `export` |
| **Import HV bằng CSV** | Tiết kiệm thời gian nhập lớp MindX đông | Parse CSV → `addStudent` hàng loạt 1 transaction; vẫn cần consent minor |
| **Mô tả bài tập (description/đính kèm)** | `tc_assignment` hiện chỉ có title — thêm mô tả/markdown là cải thiện rẻ | Thêm cột `descriptionMd`, `attachmentRef?` |

> Mọi quick win vẫn phải qua R-JL-QC-GATE-01 (qa → uat → privacy) và giữ copy tiếng Việt + token.

---

## 13. Khuyến nghị lộ trình (ship-small, không big-bang)

- **P7 — Khóa học có cấu trúc (a) + quick wins video/tiến độ:** module → lesson → embed video + gắn material; mở rộng tiến độ xuống lesson. *(Nền cho mọi thứ.)*
- **P8 — Quiz tự chấm (b):** MCQ/đúng-sai → question bank → đề ngẫu nhiên. Điểm đổ về gradebook.
- **P9 — Bài code (c) ⭐:** **ADR sandbox trước** (Judge0 self-host vs cloud — Minh chốt theo privacy/chi phí) → đề + test-case + chấm + chạy thử → leaderboard.
- **P10 — Gradebook nâng cao (g) + chứng chỉ (e):** trọng số + rubric + export; chứng chỉ khi "đạt".
- **P11 — Tương tác (f) + enrollment nâng cao (h):** Q&A theo bài → (xa) peer review; import CSV/self-enrol.

> ⚠️ Trước khi nhận **học viên thật**: gỡ/đóng cờ endpoint tạm `src/app/api/debug-auth/route.ts` (đã ghi chú DEBUG) và hoàn tất checklist go-live P5b (ADR-002 §9). Mọi nhóm thêm dữ liệu cá nhân (quiz answer, source code, post) phải qua privacy-auditor như P5.

---

## Nguồn tham khảo

- Moodle — Features / Quiz / Question bank / Question types / Activities / Enrolment & cohort:
  - https://docs.moodle.org/502/en/Features
  - https://docs.moodle.org/502/en/Question_banks
  - https://docs.moodle.org/502/en/Quiz_activity
  - https://docs.moodle.org/502/en/Question_types
- Coursera — modules/video/progress/peer review/certificates:
  - https://blog.coursera.org/new-progress-tracking-features-on-coursera/
  - https://blog.coursera.org/announcing-new-products-tools-and-features-to-support-learners-educators-and-institutions-with-their-rapidly-evolving-teaching-and-learning-needs/
- HackerRank — scoring/test-cases/auto-grade/leaderboard:
  - https://www.hackerrank.com/scoring
  - https://www.hackerrank.com/writing/auto-grading-coding-tests-save-80-percent-review-time
  - https://support.hackerrank.com/hc/en-us/articles/115006676188-Scoring-a-Coding-Question
- Judge0 — sandbox/online judge tự host (cho nhóm c):
  - https://github.com/judge0/judge0
  - https://judge0.com/
  - https://tantosec.com/blog/judge0/ (lưu ý sandbox-escape — bảo mật)
