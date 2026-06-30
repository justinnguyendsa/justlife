# LMS Roadmap — justlife "Một app hai mặt"

**Ngày lập:** 30/06/2026
**Tác giả:** pm-worker (justlife)
**Phạm vi:** Nâng cổng học viên từ "quản lý lớp nhẹ" (P5a/P6) thành nền tảng LMS đầy đủ theo hướng Moodle + Coursera + HackerRank.
**Bối cảnh:** Minh dạy lập trình tại MindX → coding-challenge + auto-grade là ưu tiên cao nhất.
**Quy tắc không thay đổi:** R-JL-TWO-FACES-01 (lms.db tách hẳn) · R-JL-STUDENT-PII-01 (PII tối thiểu, mã hóa, audit) · R-JL-SHIP-SMALL-01 · R-JL-NO-BLOAT-01 · R-JL-SPEC-FIRST-01 · R-JL-PRIVACY-01

---

## Lịch thực tế của Minh (tham chiếu khi ước lượng)

| Khối | Giờ | Tính trạng |
|---|---|---|
| Làm DA full-time | 08:30–18:00 T2–T6 | Cố định, KHÔNG build |
| Dạy TA MindX | 19:15–22:15 tối (linh hoạt) | Thường tối T2/T4/T5 — né nếu có lịch |
| Cao học | T7/CN (linh hoạt) | Né buổi học; sáng sớm T7 có thể build |
| Khối build thực tế | Tối sau 22:15; sáng T7 trước 08:00; CN tự do | ~6–10 tiếng/tuần |

Quy ước ước lượng tương đối: **S** = ≤1 ngày build, **M** = 2–5 ngày, **L** = 1–2 tuần, **XL** = >2 tuần.

---

## P-LMS-0 — Hardening go-live (VIỆC NGAY — trước khi nhận học viên thật)

**Mục tiêu:** Đóng tất cả cửa hậu và lỗ hổng bảo mật hiện hữu. Chưa làm bước này thì KHÔNG được mở portal cho học viên thật, dù chỉ 1 người.

**MoSCoW:** TẤT CẢ là Must — không có thì hệ thống KHÔNG an toàn go-live.

| # | Việc | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|---|
| 0.1 | Gỡ hoàn toàn `src/app/api/debug-auth/route.ts` + xóa khỏi `ALWAYS_PUBLIC_PREFIXES` | Must | S | Route trả 404; grep không còn `debug-auth` trong middleware; git commit xác nhận xóa |
| 0.2 | Xóa / vô hiệu hóa cờ `DISABLE_OWNER_AUTH` — không còn bypass owner-auth | Must | S | Biến không tồn tại trong codebase; test ẩn danh vào `/teaching` → redirect login |
| 0.3 | Thêm auth owner vào route `/api/teaching/submission/[id]` (hiện không có) | Must | S | GET có `requireOwner()`; test không token → 401 |
| 0.4 | Enforce consent check ở tầng API route: `POST /api/lms/submission` + `GET /api/lms/file/[ref]` phải gọi `hasValidConsent()` | Must | S | Minor chưa consent gọi API trực tiếp → 403; test case có assert |
| 0.5 | Migrate rate-limit access-code từ in-memory (`_failHits`) sang Turso-based store bền | Must | M | Restart process không reset counter; test brute-force 6+ lần trên 2 instance vẫn lock |
| 0.6 | Mã hóa field định danh cũ (`tc_student.name/email/note`) còn plaintext trên Turso | Must | M | Migration chạy encryptField cho toàn bộ row; `safeDecrypt` decode đúng; plaintext column không còn raw value |
| 0.7 | Object storage adapter (Vercel Blob / R2) thay thế đĩa local | Must | M | Redeploy không mất file; upload/download bài nộp và tài liệu qua adapter mới |
| 0.8 | Seed dev (`DEV1-2345`, `DEV2-MINR`) guard `NODE_ENV !== 'production'` | Must | S | Chạy seed trên prod-env → throw + abort; không tạo account cố định |
| 0.9 | Gỡ/thống nhất `safeEqualHex` + `getMySubmission` (unused exports) — giảm nợ kỹ thuật trước khi mở rộng | Should | S | Không còn exported nhưng không dùng; build TypeScript không warn unused |
| 0.10 | Privacy notice tiếng Việt hiển thị cho học viên lần đăng nhập đầu tiên | Must | S | Trang consent-required hoặc modal rõ nghĩa vụ dữ liệu; consent_log ghi entry học viên tự xác nhận |

**Phụ thuộc:** Phải hoàn thành P-LMS-0 TRƯỚC khi merge bất kỳ phase nào vào production.

**Ước lượng tổng:** M (khoảng 1–1.5 tuần build thực tế trong khung giờ của Minh).

---

## P-LMS-1 — Quick wins + Gradebook hữu dụng

**Mục tiêu:** Biến portal hiện tại thành hữu dụng hơn NGAY cho lớp MindX đang dạy, không cần kiến trúc mới. Tất cả build trên schema hiện có.

**MoSCoW:**

| Feature | Trụ LMS | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|---|
| Mô tả bài tập `descriptionMd` + file đính kèm `attachmentRef` cho `tc_assignment` | Teaching (trụ 6) | Must | S | Owner nhập mô tả markdown; học viên thấy mô tả bài trên trang Bài tập |
| Nhúng video vào tài liệu (whitelist YouTube/Vimeo/Drive, iframe an toàn) | Teaching (trụ 6) | Must | S | URL `.youtube.com` render iframe sandbox; URL khác render link; chống XSS CSP header |
| Đánh dấu hoàn thành material thủ công (`tc_progress` tối giản: studentId, materialId, done) | Teaching (trụ 6) | Must | S | Học viên tick "Đã đọc"; tiến độ lớp tăng; dữ liệu persist |
| Export điểm CSV cho owner | Teaching (trụ 6) | Must | S | Nút "Xuất CSV" trong Dạy học; stream `tc_grade` scope lớp; audit `export_grades`; UTF-8 BOM |
| Import học viên bằng CSV (hàng loạt) | Teaching (trụ 6) | Should | M | Upload CSV cột tên/email/note; parse → `addStudent` hàng loạt 1 transaction; báo lỗi từng dòng; consent minor vẫn bắt buộc |
| Trang xếp hạng (leaderboard) theo điểm TB trong lớp | Teaching (trụ 6) | Should | S | Trang `/portal/leaderboard`; chỉ hiện tên hiển thị/biệt danh (không email); scope lớp |
| Thêm route `/api/lms/material/[ref]` (tải tài liệu file từ portal học viên) | Teaching (trụ 6) | Must | S | Học viên tải được file tài liệu lớp; chip "Sắp có" biến mất; auth + class-membership check |
| Giao diện upload tài liệu lớp cho Instructor (hiện schema có nhưng không có UI) | Teaching (trụ 6) | Must | S | Owner upload file/nhập URL tài liệu từ khu Dạy học; lưu `tc_material` |

**Phụ thuộc:** P-LMS-0 phải hoàn thành trước.

**Parking lot P-LMS-1:**
- Resubmit policy rõ ràng (phức tạp UX, để P-LMS-2)
- Letter grade / thang điểm chữ (cần gradebook nâng cao hơn)

**Ước lượng tổng:** M (1–2 tuần build thực tế).

---

## P-LMS-2 — Cấu trúc khóa học (module / lesson / video)

**Mục tiêu:** Cho lớp một "mục lục" chương → bài → nội dung, thay vì danh sách tài liệu phẳng. Đây là xương sống để quiz, tiến độ theo bài, và chứng chỉ gắn vào sau này.

**ADR bắt buộc trước khi code:** ADR-003 "Course/Enrollment/Content model" — chốt cấu trúc `tc_module` + `tc_lesson` + gắn `tc_material.lessonId` + quy tắc enrollment.

**MoSCoW:**

| Feature | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|
| Schema `tc_module(classId, title, description, order)` + `tc_lesson(moduleId, title, contentMd, videoUrl, order)` | Must | M | Migration idempotent; index đủ; schema.ts + migrate.ts đồng bộ |
| Gắn `tc_material.lessonId?` (nullable — tài liệu cũ không bị vỡ) | Must | S | FK mềm; material có lessonId hiển thị trong lesson; material không có lessonId hiển thị ở level lớp |
| Owner UI tạo/sắp xếp module + lesson (khu Dạy học) | Must | M | CRUD module; CRUD lesson có editor markdown + URL video; kéo thả thứ tự (hoặc số thứ tự thủ công) |
| Trang mục lục khóa học cho học viên (`/portal/course`) | Must | M | Hiển thị module → lesson → tài liệu/video theo thứ tự; học viên thấy tiến độ theo lesson |
| Tiến độ theo lesson: `tc_progress(studentId, lessonId, status, completedAt)` | Must | S | Đánh dấu xem xong lesson → % khóa cập nhật; tái dùng `getMyLearningSummary` |
| Embed video iframe an toàn (whitelist host, CSP, sandbox attr) | Must | S | Chỉ YouTube/Vimeo/Drive được embed; host khác → link ngoài; không XSS |
| Resubmit policy rõ ràng (chỉ cho phép nộp lại khi owner mở, ghi lịch sử) | Should | S | `tc_submission` rõ policy; UI học viên thấy trạng thái nộp + lần nộp mới nhất |

**MoSCoW Could (không block ship):**
- Điều kiện mở bài tuần tự (drip) — để P-LMS-3
- Nhiều vai trò (TA / co-teacher) — Parking lot

**Phụ thuộc:** P-LMS-0 + P-LMS-1 + ADR-003 được Minh phê duyệt.

**Ước lượng tổng:** L (2–3 tuần build thực tế, nặng ở UI khu Dạy học).

---

## P-LMS-3 — Quiz tự chấm (MCQ + đúng/sai)

**Mục tiêu:** Cho học viên làm bài trắc nghiệm chấm điểm ngay. Minh soạn câu hỏi một lần, hệ thống tự chấm — không tốn công chấm tay với lớp đông.

**ADR bắt buộc trước khi code:** ADR-003 phải có (quiz gắn vào lesson/classId).

**MoSCoW:**

| Feature | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|
| Schema `tc_quiz(classId, lessonId?, title, timeLimit, maxAttempts, shuffle, showAnswerAfter)` | Must | S | Migration; index; schema đồng bộ |
| Schema `tc_question(quizId, type, stemMd, choicesJson, correctJson, points, order)` — MCQ + đúng/sai trước | Must | S | Hỗ trợ type='mcq', type='truefalse'; correctJson server-only KHÔNG gửi xuống client |
| Schema `tc_quiz_attempt(studentId, quizId, answersJson, score, startedAt, submittedAt, attempt)` | Must | S | Đủ field; index theo studentId+quizId |
| Owner UI soạn quiz + câu hỏi | Must | M | CRUD quiz; CRUD câu hỏi (nhập đề + đáp án); preview bài quiz |
| Học viên làm quiz trên portal (`/portal/quiz/[id]`) | Must | M | Timer nếu có timeLimit; submit → chấm tức thì ở server; hiển thị điểm + đáp án đúng (nếu showAnswerAfter=true); không gửi correctJson xuống client trước nộp |
| Điểm quiz đổ về `tc_grade` (tái dùng gradebook hiện có) | Must | S | Khi nộp quiz → INSERT vào `tc_grade` với assignmentId là quizId; gradebook owner thấy điểm quiz |
| Audit `submit_quiz` trong `access_audit` | Must | S | Mọi lần nộp quiz ghi audit entry |

**MoSCoW Should:**
- Question bank theo category (tái dùng câu hỏi nhiều quiz) — P-LMS-4
- Đề ngẫu nhiên từ category (chống chép) — P-LMS-4

**MoSCoW Could (không block):**
- Câu hỏi trả lời ngắn (so khớp chuỗi) — P-LMS-4
- Peer review — Parking lot (phức tạp + privacy HV xem bài nhau)

**Phụ thuộc:** P-LMS-2 (lesson schema để gắn quiz vào lesson).

**Ước lượng tổng:** L (2–3 tuần, nặng ở UI quiz làm bài).

---

## P-LMS-4 — Bài code chấm tự động (HackerRank-style) — TRỌNG TÂM

**Mục tiêu:** Học viên gõ code ngay trên web, chạy thử, nộp và nhận điểm % test-case tự động. Biến justlife từ "sổ điểm" thành "nơi luyện code".

**ADR bắt buộc TRƯỚC KHI CODE BẤT KỲ DÒNG NÀO:** ADR-004 "Coding Judge Architecture" — Minh phải chốt phương án sandbox:

| Phương án | Tóm tắt | Tác động privacy | Chi phí | Khuyến nghị |
|---|---|---|---|---|
| A — Judge0 self-host | Docker + isolate worker, kiểm soát hoàn toàn | Code HV không ra ngoài | VPS ~5–10 USD/tháng | **Khuyến nghị** (R-JL-LOCAL-FIRST) |
| B — Judge0 cloud API | Nhanh, không vận hành | Code HV gửi ra bên thứ ba | Tiết kiệm hạ tầng nhưng cần Minh duyệt third-party | Cho phép nếu Minh đồng ý rõ ràng |
| C — Runner tự làm (subprocess) | Dễ build | Rủi ro sandbox-escape cao | Thấp | **KHÔNG dùng cho production** — có HV vị thành niên |

**MoSCoW:**

| Feature | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|
| ADR-004 được Minh chốt (phương án sandbox + privacy decision third-party nếu B) | Must | S (quyết định) | File ADR-004.md được tạo và Minh confirm |
| Schema `tc_code_problem(classId, title, statementMd, languagesJson, timeLimitMs, memLimitMb)` | Must | S | Migration; index; schema đồng bộ |
| Schema `tc_test_case(problemId, input, expectedOutput, isHidden, weight)` | Must | S | isHidden=true → không gửi expectedOutput xuống client |
| Schema `tc_code_submission(studentId, problemId, language, sourceCodeRef, status, score, passedCount, totalCount, ranAt)` | Must | S | sourceCode lưu qua storage adapter (không plaintext DB nếu có thể); audit `submit_code` |
| Owner UI tạo bài code + test-case (khu Dạy học) | Must | M | CRUD đề; CRUD test-case (công khai + ẩn); set giới hạn thời gian/bộ nhớ |
| Code editor trên web cho học viên (Monaco Editor hoặc CodeMirror) | Must | M | Chọn ngôn ngữ; nhập code; nút "Chạy thử" (test công khai) + "Nộp bài" (toàn bộ test) |
| Tích hợp judge service (A hoặc B theo ADR-004): submit → nhận kết quả từng test-case | Must | L | Job gửi code → judge → gom verdict → tính điểm = weight test pass / tổng weight; lưu `tc_code_submission` |
| Phản hồi học viên: test nào pass/fail (không lộ input ẩn và expectedOutput ẩn) | Must | S | UI hiển thị "Test 1: Pass", "Test 2: Fail (Time Limit Exceeded)"; không lộ dữ liệu ẩn |
| Leaderboard bài code theo lớp/bài (`tc_leaderboard` là view tính từ submission) | Must | S | Trang `/portal/leaderboard`; xếp hạng điểm tổng; chỉ hiện tên hiển thị (không email) |
| Điểm bài code đổ về `tc_grade` (tái dùng gradebook) | Must | S | Nộp thành công → ghi `tc_grade`; owner thấy trong gradebook |
| Egress mạng sandbox phải tắt (network-policy hoặc iptables) | Must | S (infra) | Test: code Python `requests.get(...)` → fail trong sandbox |
| Audit `run_code` + `submit_code` cho mọi lần chạy | Must | S | Ghi `access_audit` với studentId hash, problemId, action; không ghi sourceCode thô vào audit |

**MoSCoW Should:**
- Question bank theo category + đề ngẫu nhiên (quiz P-LMS-3 nâng cấp) — tích hợp cùng phase
- Đa ngôn ngữ lập trình (Python/JS/C++ — Minh chọn bật ngôn ngữ nào dạy) — mở theo cấu hình

**MoSCoW Won't-now:**
- Transcript/AI-assist code review — Parking lot
- Competitive programming features (virtual contest, open ranking) — Parking lot

**Phụ thuộc:** P-LMS-2 (schema lesson/classId để gắn bài code); ADR-004 Minh phê duyệt; hạ tầng judge service sẵn sàng.

**Ước lượng tổng:** XL (3–5 tuần build thực tế — phase nặng nhất, phụ thuộc quyết định infra).

---

## P-LMS-5 — Gradebook nâng cao + Chứng chỉ

**Mục tiêu:** Tính điểm tổng kết theo tỉ lệ (quiz 30% + code 40% + bài tập 30%); cấp chứng chỉ hoàn thành có mã xác thực.

**MoSCoW:**

| Feature | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|
| `tc_grade_category(classId, name, weight)` + `tc_assignment.categoryId` | Must | S | Schema + migration; owner thiết lập category cho lớp |
| Tính điểm tổng có trọng số (server-side, cập nhật khi có điểm mới) | Must | M | Gradebook owner hiện cột "Điểm tổng kết" = Σ(điểm×trọng số); học viên thấy điểm tổng trên portal |
| Rubric / tiêu chí chấm cho bài tập (`tc_rubric`, `tc_grade.rubricScoresJson`) | Should | M | Owner nhập rubric khi tạo bài; chấm theo tiêu chí; điểm từng tiêu chí hiện cho học viên |
| `tc_certificate(studentId, classId, issuedAt, verifyCode, criteriaSnapshotJson)` | Should | M | Khi đạt điều kiện (% hoàn thành + điểm ≥ ngưỡng) → owner cấp thủ công hoặc tự động |
| Trang `/verify/[code]` công khai — kiểm tra chứng chỉ | Should | S | Chỉ hiện tên khóa + ngày + hợp lệ/không; KHÔNG lộ PII thừa; học viên chọn ẩn tên nếu muốn |
| PDF chứng chỉ server-side render | Could | M | Nút tải PDF từ portal học viên |
| Xuất gradebook toàn lớp CSV nâng cao (có cột trọng số, điểm tổng) | Must | S | Nâng cấp CSV từ P-LMS-1; thêm cột category + tổng kết; audit `export_grades` |

**Phụ thuộc:** P-LMS-3 (có quiz) + P-LMS-4 (có điểm code) để "đạt" có ý nghĩa; tiến độ theo lesson từ P-LMS-2.

**Ước lượng tổng:** L (2–3 tuần).

---

## P-LMS-6 — Q&A + Tương tác (nhẹ)

**Mục tiêu:** Cho lớp một chỗ hỏi-đáp công khai để khỏi lặp câu hỏi. Không build forum đầy đủ.

**MoSCoW:**

| Feature | MoSCoW | Effort | Định nghĩa Done |
|---|---|---|---|
| `tc_thread(classId, lessonId?, authorRef, title, createdAt)` + `tc_post(threadId, authorRef, bodyMd, parentId?, createdAt)` | Should | M | Schema; học viên mở thread; Minh trả lời; trả lời lồng 1 cấp |
| Trang Q&A trong portal học viên theo lớp/lesson | Should | M | Danh sách thread; xem thread + post; form tạo thread/trả lời |
| Owner moderation: ẩn/xóa post vi phạm | Should | S | Nút ẩn post từ khu Dạy học; học viên không thấy post đã ẩn |
| Thông báo khi có điểm mới / bài tập mới (in-app, không email) | Could | M | Badge thông báo trên portal; feed hoạt động gần nhất |

**MoSCoW Won't-now:**
- Peer review (HV chấm bài nhau) — Parking lot (privacy phức tạp + HV xem bài nhau)
- Email notification — Parking lot (cần email provider + opt-in + unsubscribe)
- Forum đa lớp / global — Parking lot

**Phụ thuộc:** P-LMS-2 (có lessonId để gắn thread vào lesson).

**Ước lượng tổng:** M–L (2–3 tuần).

---

## Bảng tổng hợp ưu tiên (MoSCoW toàn roadmap)

| Feature / nhóm | Trụ | MoSCoW | Phase | Effort | Lý do |
|---|---|---|---|---|---|
| Gỡ debug-auth endpoint | Teaching | Must | P-LMS-0 | S | Cửa hậu nghiêm trọng — blocker go-live |
| Xóa DISABLE_OWNER_AUTH | Teaching | Must | P-LMS-0 | S | Bypass toàn bộ owner-auth |
| Auth route `/api/teaching/submission/[id]` | Teaching | Must | P-LMS-0 | S | Hiện không có auth |
| Enforce consent ở tầng API | Teaching | Must | P-LMS-0 | S | Minor bypass consent qua API |
| Rate-limit store bền (Turso) | Teaching | Must | P-LMS-0 | M | In-memory vô hiệu trên serverless |
| Mã hóa field định danh cũ trên Turso | Teaching | Must | P-LMS-0 | M | PII plaintext at-rest trên cloud |
| Object storage adapter | Teaching | Must | P-LMS-0 | M | File mất khi redeploy Vercel |
| Mô tả bài tập + file đính kèm | Teaching | Must | P-LMS-1 | S | Hữu ích ngay, schema đơn giản |
| Nhúng video vào tài liệu | Teaching | Must | P-LMS-1 | S | Tận dụng material.url sẵn có |
| Export điểm CSV | Teaching | Must | P-LMS-1 | S | Quick win, Minh cần ngay |
| Route tải tài liệu file từ portal | Teaching | Must | P-LMS-1 | S | Hiện chip "Sắp có" — đang thiếu |
| Upload tài liệu lớp cho Instructor | Teaching | Must | P-LMS-1 | S | Schema có nhưng chưa có UI |
| Đánh dấu hoàn thành material | Teaching | Must | P-LMS-1 | S | Mở rộng tiến độ Coursera-style |
| Import HV bằng CSV | Teaching | Should | P-LMS-1 | M | Hữu ích cho lớp đông MindX |
| Leaderboard theo điểm hiện có | Teaching | Should | P-LMS-1 | S | Tạo động lực, dùng data cũ |
| ADR-003 Course/Content model | Teaching | Must | P-LMS-2 | S | Spec trước code — R-JL-SPEC-FIRST |
| Module → Lesson schema + UI | Teaching | Must | P-LMS-2 | L | Xương sống LMS |
| Tiến độ theo lesson | Teaching | Must | P-LMS-2 | S | Mở rộng Phase 6 tự nhiên |
| Quiz MCQ/đúng-sai + tự chấm | Teaching | Must | P-LMS-3 | L | Đòn bẩy lớp đông, giảm chấm tay |
| ADR-004 Judge sandbox (Minh chốt) | Teaching | Must | P-LMS-4 | S | Quyết định kiến trúc — không thể bỏ qua |
| Bài code + test-case + judge | Teaching | Must | P-LMS-4 | XL | Gap giá trị nhất (dạy lập trình) |
| Leaderboard bài code | Teaching | Must | P-LMS-4 | S | Động lực học code |
| Gradebook trọng số | Teaching | Must | P-LMS-5 | M | Cần khi có nhiều loại đánh giá |
| Chứng chỉ hoàn thành | Teaching | Should | P-LMS-5 | M | Giá trị động lực cho HV |
| Q&A theo bài | Teaching | Should | P-LMS-6 | M | Tương tác nhẹ, tránh lặp câu hỏi |

---

## Parking lot (KHÔNG build trong roadmap này)

| Feature | Lý do |
|---|---|
| Peer review (HV chấm bài nhau) | Privacy phức tạp — HV xem bài nhau, cần scope cực cẩn thận; không đủ effort khi Minh bận 3 vai |
| Forum đa lớp / global discussion | Ngoài scope "lớp học của Minh"; bloat management |
| Competitive programming contest (virtual contest, rating ELO) | Ngoài use case dạy học; quá xa so với nhu cầu thực tế |
| Email notification (deadline/điểm mới) | Cần email provider + opt-in + unsubscribe + GDPR; cost vận hành |
| Self-enrol bằng mã lớp (học viên tự vào) | Privacy risk — ai có mã đều vào được; Minh muốn kiểm soát danh sách |
| Multi-role (TA/co-teacher) | Chỉ mình Minh dạy hiện tại; không cần RBAC phức tạp |
| Nhóm trong lớp (groups) | Chưa có use case cụ thể từ MindX |
| AI-assist code review / gợi ý | Gửi code HV ra ngoài — đụng R-JL-PRIVACY-01 + R-JL-LOCAL-FIRST; phải Minh duyệt third-party |
| Transcript video tự động | Cần AI service ngoài; chi phí + privacy |
| Skill/competency tracking kiểu Coursera | Quá phức tạp cho lớp nhỏ; không đáng effort |
| Open gradebook (HV xem điểm nhau) | Privacy — điểm số là PII cá nhân |
| SCORM/xAPI content | Quá phức tạp, không khớp use case hiện tại |
| iOS/Android native app | Vercel PWA đủ cho giai đoạn này |

---

## Thứ tự khuyến nghị và cột mốc kiểm tra

```
P-LMS-0 (hardening, ~1.5 tuần)
  → GATE: privacy-auditor pass 6 blocker + smoke test owner/student login
  → Bật cho 1 lớp thử (HV thật đầu tiên)

P-LMS-1 (quick wins, ~2 tuần)
  → GATE: qa-verifier + uat-worker pass
  → Minh dùng được CSV export cho lớp MindX

P-LMS-2 (cấu trúc khóa học, ~3 tuần)
  → GATE: ADR-003 Minh phê duyệt trước khi code
  → GATE: privacy-auditor pass (thêm bảng mới = dữ liệu mới)

P-LMS-3 (quiz, ~3 tuần)
  → GATE: đáp án không lọt xuống client (QC test case bắt buộc)

P-LMS-4 (bài code, ~5 tuần)
  → GATE: ADR-004 Minh chốt sandbox trước khi viết 1 dòng code
  → GATE: privacy-auditor (sourceCode HV là PII mới)
  → GATE: security test sandbox-escape trước khi bật cho HV thật

P-LMS-5 + P-LMS-6 (gradebook nâng cao + Q&A, ~3 tuần mỗi)
```

---

## Ước lượng tổng và khung thực tế

| Phase | Effort | Thời gian thực tế (6–10h/tuần build) |
|---|---|---|
| P-LMS-0 | M | 2–3 tuần |
| P-LMS-1 | M | 2–3 tuần |
| P-LMS-2 | L | 4–5 tuần |
| P-LMS-3 | L | 4–5 tuần |
| P-LMS-4 | XL | 7–10 tuần |
| P-LMS-5 | L | 4–5 tuần |
| P-LMS-6 | M–L | 3–4 tuần |
| **Tổng** | | **~26–35 tuần** (~6–9 tháng build song song với 3 vai của Minh) |

> Lưu ý: ước lượng dựa trên lịch thực tế của Minh (~6–10h build/tuần). Không cộng dồn — mỗi phase ship được ngay không chờ phase sau.

---

## Ghi chú kiến trúc quan trọng

1. **Ripple risk:** Mọi feature từ P-LMS-2 trở đi gắn vào `lessonId/classId` — ADR-003 phải chốt trước để tránh refactor tốn kém sau này.
2. **Sandbox safety (P-LMS-4):** Chạy code HV vị thành niên = rủi ro pháp lý cao nhất. Không được chọn phương án C (subprocess tự làm). ADR-004 là gate cứng.
3. **Privacy mỗi phase:** Bất kỳ feature nào thêm loại PII mới (quiz answer, sourceCode, post, certificate) đều phải qua privacy-auditor trước khi merge production.
4. **ESLint rule bất biến TWO-FACES:** Thêm `no-restricted-imports` rule chặn import `@/db/client` trong `src/app/portal/**` và `src/lib/lms/**` — hiện chỉ review thủ công, rủi ro khi codebase mở rộng.
5. **Điểm số giữ dạng số:** Không mã hóa `score` (quyết định ADR-002, cho phép thống kê P6/insights).
