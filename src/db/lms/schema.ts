import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ===== lms.db — Phase 5 (LMS-lite multi-user, TÁCH khỏi personal.db) =====
// ADR-002 + SPEC-P5a. R-JL-TWO-FACES-01 / R-JL-STUDENT-PII-01.
// Quy ước thời gian: epoch milliseconds (UTC); hiển thị format Asia/Ho_Chi_Minh.
//
// 🔒 = field ĐỊNH DANH (PII) — sẽ mã hóa at-rest AES-256-GCM (stage sau, trước go-live).
//      Ở S1 vẫn lưu PLAINTEXT (local) — mã hóa là stage riêng (SPEC-P5a §6, ADR-002 Q6).
// idx  = blind-index deterministic (HMAC) để login-lookup không cần giải mã.
// score KHÔNG mã hóa (giữ số cho P6 thống kê — quyết định chủ dự án #3).
// ⚠ privacy-review: mọi field 🔒 dưới đây phải được auditor soát ở stage mã hóa.

// ---- Bảng migrate từ personal (giữ NGUYÊN cột để không vỡ /teaching) ----
export const tcClass = sqliteTable("tc_class", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  term: text("term"),
  courseId: text("course_id"), // S0: link → tc_course.id (nullable, backfilled by migrate-s0)
  status: text("status").notNull().default("active"), // active|archived
  createdAt: integer("created_at").notNull(),
});
export const tcStudent = sqliteTable("tc_student", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  personId: text("person_id"), // S0: link → lms_person.id (nullable, backfilled by migrate-s0)
  name: text("name").notNull(), // 🔒 privacy-review (PII, có thể minor)
  email: text("email"), // 🔒 privacy-review (PII)
  emailIndex: text("email_index"), // idx — blind-index của email (thêm cho S2 login-lookup; null ở S1)
  note: text("note"), // 🔒 privacy-review
  createdAt: integer("created_at").notNull(),
});
export const tcSession = sqliteTable("tc_session", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  dateAt: integer("date_at").notNull(),
  topic: text("topic"),
  createdAt: integer("created_at").notNull(),
});
export const tcAttendance = sqliteTable("tc_attendance", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  studentId: text("student_id").notNull(),
  status: text("status").notNull().default("present"), // present|absent|late
  markedAt: integer("marked_at").notNull(),
});
export const tcAssignment = sqliteTable("tc_assignment", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  categoryId: text("category_id"), // P-LMS-5: link → tc_grade_category.id (nullable — bài cũ chưa phân nhóm)
  title: text("title").notNull(),
  dueAt: integer("due_at"),
  maxScore: real("max_score").notNull().default(10),
  descriptionMd: text("description_md"), // P-LMS-1: mô tả bài tập (markdown)
  createdAt: integer("created_at").notNull(),
});
export const tcGrade = sqliteTable("tc_grade", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id").notNull(),
  studentId: text("student_id").notNull(),
  score: real("score"), // KHÔNG mã hóa (giữ số — P6)
  feedback: text("feedback"), // 🔒 privacy-review (nhận xét cá nhân)
  gradedAt: integer("graded_at"),
});

// ---- Bảng LMS mới (ADR-002 §2.2 / SPEC-P5a §2.2) — định nghĩa schema; dùng từ S2 ----
export const lmsUser = sqliteTable("lms_user", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(), // soft link → tc_student.id (no FK chéo cũng không FK trong-DB ở S1)
  personId: text("person_id"), // S0: link → lms_person.id (nullable, backfilled by migrate-s0)
  authProvider: text("auth_provider").notNull().default("credentials"), // google|credentials
  authSubject: text("auth_subject"), // 🔒 privacy-review (google sub; null cho credentials)
  authSubjectIndex: text("auth_subject_index"), // idx — blind-index của authSubject (Google login-lookup)
  email: text("email"), // 🔒 privacy-review (PII)
  emailIndex: text("email_index"), // idx — blind-index của email (login-lookup)
  isMinor: integer("is_minor").notNull().default(0), // 0|1
  guardianContact: text("guardian_contact"), // 🔒 privacy-review (nullable)
  status: text("status").notNull().default("active"), // active|disabled
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at"),
});
export const accessCode = sqliteTable("access_code", {
  id: text("id").primaryKey(),
  lmsUserId: text("lms_user_id").notNull(),
  codeHash: text("code_hash").notNull(), // hash — KHÔNG lưu code thô
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),
  usedAt: integer("used_at"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lockedUntil: integer("locked_until"),
});
export const consentLog = sqliteTable("consent_log", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  type: text("type").notNull(), // data_processing|minor_guardian
  granted: integer("granted").notNull().default(0), // 0|1
  grantedAt: integer("granted_at"),
  guardianContact: text("guardian_contact"), // 🔒 privacy-review (nullable)
  noticeVersion: text("notice_version"),
  channel: text("channel").notNull().default("portal"), // portal|offline
});
export const accessAudit = sqliteTable("access_audit", {
  id: text("id").primaryKey(),
  ts: integer("ts").notNull(),
  actorType: text("actor_type").notNull(), // student|instructor|system
  actorRef: text("actor_ref"), // lmsUserId|"minh"|"system"
  action: text("action").notNull(), // login|view_grade|view_material|submit|download|export|delete_cascade|...
  targetType: text("target_type"), // grade|material|submission|student|class (nullable)
  targetId: text("target_id"), // nullable
  result: text("result").notNull().default("ok"), // ok|denied
  ipHash: text("ip_hash"), // hash — KHÔNG lưu IP thô (APPEND-ONLY, không PII thô)
});
export const tcSubmission = sqliteTable("tc_submission", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  assignmentId: text("assignment_id").notNull(),
  studentId: text("student_id").notNull(),
  fileRef: text("file_ref").notNull(), // uuid — không đoán được; tên file trong vùng đĩa LMS
  originalName: text("original_name"), // 🔒 privacy-review (có thể chứa tên HV, nullable)
  mime: text("mime"),
  size: integer("size"),
  submittedAt: integer("submitted_at").notNull(),
  status: text("status").notNull().default("submitted"), // submitted|late|returned
});
export const tcMaterial = sqliteTable("tc_material", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  lessonId: text("lesson_id"), // P-LMS-2: gắn tài liệu vào lesson (nullable, tương thích cũ)
  title: text("title").notNull(),
  fileRef: text("file_ref"), // nullable — file trong vùng đĩa LMS
  url: text("url"), // nullable — link ngoài
  mime: text("mime"),
  size: integer("size"),
  visibility: text("visibility").notNull().default("class"), // class|draft
  createdAt: integer("created_at").notNull(),
});

// ---- P-LMS-1: theo dõi hoàn thành tài liệu ----
export const tcMaterialProgress = sqliteTable("tc_material_progress", {
  id: text("id").primaryKey(),
  materialId: text("material_id").notNull(),
  studentId: text("student_id").notNull(),
  completedAt: integer("completed_at").notNull(),
});

// ---- S0: Identity / Course / Enrollment (ADR-003 QĐ0, xương sống) ----

// Khóa học = nội dung tái dùng (module/lesson/quiz/code treo vào đây).
// `tc_class` trở thành "đợt mở lớp/cohort" của tc_course.
export const tcCourse = sqliteTable("tc_course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), // thường KHÔNG PII → plaintext
  slug: text("slug"), // URL-friendly, unique
  descriptionMd: text("description_md"),
  status: text("status").notNull().default("draft"), // draft|published|archived
  createdAt: integer("created_at").notNull(),
});

// 1 DÒNG / 1 NGƯỜI HỌC — chuẩn hóa danh tính (ADR-003 QĐ0).
// PII mã hóa 1 lần. lms_user.studentId → trỏ sang lms_person.id (thay vì tc_student.id nhân bản).
export const lmsPerson = sqliteTable("lms_person", {
  id: text("id").primaryKey(),
  displayName: text("display_name"), // 🔒 privacy-review (PII, có thể minor)
  email: text("email"), // 🔒 privacy-review (PII)
  emailIndex: text("email_index"), // idx — blind-index của email
  isMinor: integer("is_minor").notNull().default(0), // 0|1
  status: text("status").notNull().default("active"), // active|disabled
  createdAt: integer("created_at").notNull(),
});

// (person × class/course). Tiến độ/điểm/chứng chỉ neo vào enrollment.
export const enrollment = sqliteTable("enrollment", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(), // -> lms_person.id
  classId: text("class_id").notNull(), // -> tc_class.id
  courseId: text("course_id"), // -> tc_course.id (nullable — lớp cũ chưa có course)
  role: text("role").notNull().default("student"), // student (dữ cho TA/co-teacher sau)
  status: text("status").notNull().default("active"), // active|completed|dropped
  enrolledAt: integer("enrolled_at").notNull(),
  completedAt: integer("completed_at"), // nullable
});

// ---- P-LMS-2: Cấu trúc khóa học (ADR-003 QĐ1.1) ----

// Module = chương trong khóa học. Sắp xếp bởi position.
export const tcModule = sqliteTable("tc_module", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  title: text("title").notNull(),
  descriptionMd: text("description_md"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

// Lesson = bài học trong module. kind: text|video|reading.
export const tcLesson = sqliteTable("tc_lesson", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").notNull(), // -> tc_module.id
  title: text("title").notNull(),
  contentMd: text("content_md"), // nội dung markdown
  videoUrl: text("video_url"), // CHỈ embed host whitelist (YouTube/Vimeo/Drive)
  kind: text("kind").notNull().default("text"), // text|video|reading
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

// Tiến độ xuyên-khóa (ADR-003 QĐ1.4). Mở rộng tc_material_progress.
export const tcProgress = sqliteTable("tc_progress", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(), // -> lms_person.id
  courseId: text("course_id").notNull(), // -> tc_course.id
  itemType: text("item_type").notNull(), // lesson|quiz|code|material
  itemId: text("item_id").notNull(), // id of the item
  status: text("status").notNull().default("done"), // done|in_progress
  completedAt: integer("completed_at"),
});

// ---- P-LMS-3: Quiz + Question Bank (ADR-003 QĐ1.2 + QĐ2) ----

// Câu hỏi (question bank). correctJson MÃ HÓA 🔒 — KHÔNG gửi xuống client.
export const tcQuestion = sqliteTable("tc_question", {
  id: text("id").primaryKey(),
  courseId: text("course_id"), // -> tc_course.id (nullable: câu chung hoặc theo khóa)
  type: text("type").notNull(), // mcq_single|mcq_multi|true_false|short
  stemMd: text("stem_md").notNull(), // nội dung câu hỏi (markdown)
  choicesJson: text("choices_json"), // JSON array các lựa chọn [{label, text}]
  correctJson: text("correct_json"), // 🔒 MÃ HÓA at-rest. Đáp án đúng. KHÔNG gửi client.
  points: real("points").notNull().default(1), // điểm/câu
  createdAt: integer("created_at").notNull(),
});

// Bài quiz (gắn vào khóa/lesson).
export const tcQuiz = sqliteTable("tc_quiz", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  lessonId: text("lesson_id"), // -> tc_lesson.id (nullable)
  title: text("title").notNull(),
  timeLimitSec: integer("time_limit_sec"), // nullable = không giới hạn
  maxAttempts: integer("max_attempts").notNull().default(1),
  shuffle: integer("shuffle").notNull().default(0), // 0|1 — trộn thứ tự câu + đáp án
  revealAfter: integer("reveal_after").notNull().default(0), // 0|1 — hiển đáp án sau khi nộp
  status: text("status").notNull().default("draft"), // draft|published
  createdAt: integer("created_at").notNull(),
});

// Câu hỏi trong quiz (n-n, có thứ tự).
export const tcQuizQuestion = sqliteTable("tc_quiz_question", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull(), // -> tc_quiz.id
  questionId: text("question_id").notNull(), // -> tc_question.id
  position: integer("position").notNull().default(0),
});

// Lần làm bài (attempt). answersJson MÃ HÓA 🔒.
export const tcQuizAttempt = sqliteTable("tc_quiz_attempt", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull(), // -> tc_quiz.id
  personId: text("person_id").notNull(), // -> lms_person.id (server-derived)
  answersJson: text("answers_json"), // 🔒 MÃ HÓA at-rest. Bài làm HV.
  score: real("score"), // điểm đạt
  maxScore: real("max_score"), // điểm tối đa
  startedAt: integer("started_at").notNull(),
  submittedAt: integer("submitted_at"), // nullable = chưa nộp
  gradedAt: integer("graded_at"), // nullable
});

// ---- P-LMS-5: Gradebook trọng số + Chứng chỉ (ADR-003 QĐ1.5 + 1.7) ----

// Nhóm điểm (ví dụ: Thi 30%, Bài tập 40%, Quiz 30%).
export const tcGradeCategory = sqliteTable("tc_grade_category", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  name: text("name").notNull(), // "Thi", "Bài tập", "Quiz"
  weight: real("weight").notNull().default(1), // trọng số (ví dụ 0.3 = 30%)
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

// Chứng chỉ hoàn thành khóa học.
export const tcCertificate = sqliteTable("tc_certificate", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(), // -> lms_person.id
  courseId: text("course_id").notNull(), // -> tc_course.id
  issuedAt: integer("issued_at").notNull(),
  verifyCode: text("verify_code").notNull(), // unique, random ~128bit, không đoán được
  criteriaSnapshotJson: text("criteria_snapshot_json"), // snapshot tiêu chí tại thời điểm cấp
  revoked: integer("revoked").notNull().default(0), // 0|1
});

// ---- P-LMS-4: Code Auto-grade HackerRank-like (ADR-003 QĐ1.3 + QĐ3) ----

// Bài code (gắn vào khóa/lesson).
export const tcCodeProblem = sqliteTable("tc_code_problem", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  lessonId: text("lesson_id"), // -> tc_lesson.id (nullable)
  title: text("title").notNull(),
  statementMd: text("statement_md").notNull(), // đề bài markdown
  languagesJson: text("languages_json").notNull().default('["python","javascript"]'), // JSON array ngôn ngữ cho phép
  timeLimitMs: integer("time_limit_ms").notNull().default(5000), // giới hạn thời gian (ms)
  memLimitMb: integer("mem_limit_mb").notNull().default(256), // giới hạn bộ nhớ (MB)
  totalWeight: real("total_weight").notNull().default(100), // điểm tối đa
  status: text("status").notNull().default("draft"), // draft|published
  createdAt: integer("created_at").notNull(),
});

// Bộ test (ẩn + công khai). Test ẩn: input/expected MÃ HÓA 🔒.
export const tcTestCase = sqliteTable("tc_test_case", {
  id: text("id").primaryKey(),
  problemId: text("problem_id").notNull(), // -> tc_code_problem.id
  input: text("input"), // 🔒 MÃ HÓA nếu isHidden=1
  expectedOutput: text("expected_output").notNull(), // 🔒 MÃ HÓA nếu isHidden=1
  isHidden: integer("is_hidden").notNull().default(0), // 0=công khai, 1=ẩn
  weight: real("weight").notNull().default(1), // trọng số test case
  position: integer("position").notNull().default(0),
});

// Lần nộp code. sourceCode MÃ HÓA 🔒 (PII/sở hữu trí tuệ HV).
export const tcCodeSubmission = sqliteTable("tc_code_submission", {
  id: text("id").primaryKey(),
  problemId: text("problem_id").notNull(), // -> tc_code_problem.id
  personId: text("person_id").notNull(), // -> lms_person.id (server-derived)
  language: text("language").notNull(), // python|javascript|...
  sourceCode: text("source_code"), // 🔒 MÃ HÓA at-rest
  status: text("status").notNull().default("queued"), // queued|running|done|error
  score: real("score"), // điểm đạt (Σ weight pass / totalWeight)
  passedCount: integer("passed_count"),
  totalCount: integer("total_count"),
  verdict: text("verdict"), // AC|WA|TLE|MLE|RE|CE
  ranAt: integer("ran_at"), // khi chấm xong
  createdAt: integer("created_at").notNull(),
});

// Kết quả từng test case. Test ẩn: CHỈ lưu pass/fail.
export const tcCodeRun = sqliteTable("tc_code_run", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull(), // -> tc_code_submission.id
  testCaseId: text("test_case_id").notNull(), // -> tc_test_case.id
  passed: integer("passed").notNull().default(0), // 0|1
  timeMs: integer("time_ms"),
  memKb: integer("mem_kb"),
  stdout: text("stdout"), // output thực tế (CHỈ cho test công khai)
  stderr: text("stderr"), // error output
});

// ---- P-LMS-6: Forum + Mã ghi danh (ADR-003 QĐ1.6) ----

// Thread thảo luận (gắn vào khóa, tùy chọn gắn lesson).
export const tcThread = sqliteTable("tc_thread", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  lessonId: text("lesson_id"), // -> tc_lesson.id (nullable)
  authorType: text("author_type").notNull(), // instructor|student
  authorRef: text("author_ref").notNull(), // "owner" (instructor) hoặc lms_person.id (student)
  title: text("title").notNull(),
  status: text("status").notNull().default("open"), // open|locked
  createdAt: integer("created_at").notNull(),
});

// Bài viết trong thread.
export const tcPost = sqliteTable("tc_post", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(), // -> tc_thread.id
  authorType: text("author_type").notNull(), // instructor|student
  authorRef: text("author_ref").notNull(), // "owner" hoặc lms_person.id
  bodyMd: text("body_md").notNull(), // nội dung markdown
  parentId: text("parent_id"), // -> tc_post.id (nullable, reply-to)
  hidden: integer("hidden").notNull().default(0), // 0|1 — kiểm duyệt (ẩn thay xóa cứng)
  createdAt: integer("created_at").notNull(),
});

// Mã tham gia lớp (self-enrol). 6 ký tự A-Z/2-9 (loại O/0/I/1).
export const classEnrolCode = sqliteTable("class_enrol_code", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(), // -> tc_course.id
  code: text("code").notNull(), // mã ngắn 6 ký tự
  maxUses: integer("max_uses"), // nullable = không giới hạn
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"), // nullable = không hết hạn
  active: integer("active").notNull().default(1), // 0|1
  createdAt: integer("created_at").notNull(),
});

// ---- Types (migrate: TcClass... ; mới: LmsUser...) ----
export type TcClass = typeof tcClass.$inferSelect;
export type TcStudent = typeof tcStudent.$inferSelect;
export type TcSession = typeof tcSession.$inferSelect;
export type TcAttendance = typeof tcAttendance.$inferSelect;
export type TcAssignment = typeof tcAssignment.$inferSelect;
export type TcGrade = typeof tcGrade.$inferSelect;
export type LmsUser = typeof lmsUser.$inferSelect;
export type AccessCode = typeof accessCode.$inferSelect;
export type ConsentLog = typeof consentLog.$inferSelect;
export type AccessAudit = typeof accessAudit.$inferSelect;
export type TcSubmission = typeof tcSubmission.$inferSelect;
export type TcMaterial = typeof tcMaterial.$inferSelect;
export type TcMaterialProgress = typeof tcMaterialProgress.$inferSelect;
export type LmsPerson = typeof lmsPerson.$inferSelect;
export type TcCourse = typeof tcCourse.$inferSelect;
export type Enrollment = typeof enrollment.$inferSelect;
export type TcModule = typeof tcModule.$inferSelect;
export type TcLesson = typeof tcLesson.$inferSelect;
export type TcProgress = typeof tcProgress.$inferSelect;
export type TcQuiz = typeof tcQuiz.$inferSelect;
export type TcQuestion = typeof tcQuestion.$inferSelect;
export type TcQuizQuestion = typeof tcQuizQuestion.$inferSelect;
export type TcQuizAttempt = typeof tcQuizAttempt.$inferSelect;
export type TcGradeCategory = typeof tcGradeCategory.$inferSelect;
export type TcCertificate = typeof tcCertificate.$inferSelect;
export type TcCodeProblem = typeof tcCodeProblem.$inferSelect;
export type TcTestCase = typeof tcTestCase.$inferSelect;
export type TcCodeSubmission = typeof tcCodeSubmission.$inferSelect;
export type TcCodeRun = typeof tcCodeRun.$inferSelect;
export type TcThread = typeof tcThread.$inferSelect;
export type TcPost = typeof tcPost.$inferSelect;
export type ClassEnrolCode = typeof classEnrolCode.$inferSelect;

