import { lmsLibsql } from "./client";

// Tạo bảng lms.db (idempotent). Raw SQL — khớp src/db/lms/schema.ts (ADR-002 §2, SPEC-P5a §2.3).
// 🟡 DB RIÊNG, tách hoàn toàn personal.db (R-JL-TWO-FACES-01).
const STATEMENTS = [
  // ---- tc_* (migrate từ personal) ----
  `CREATE TABLE IF NOT EXISTS tc_class (id TEXT PRIMARY KEY, name TEXT NOT NULL, term TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_student (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT, email_index TEXT, note TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_session (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, date_at INTEGER NOT NULL, topic TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_attendance (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, student_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present', marked_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_assignment (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, title TEXT NOT NULL, due_at INTEGER, max_score INTEGER NOT NULL DEFAULT 10, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_grade (id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, student_id TEXT NOT NULL, score INTEGER, feedback TEXT, graded_at INTEGER)`,
  // ---- bảng LMS mới ----
  `CREATE TABLE IF NOT EXISTS lms_user (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, auth_provider TEXT NOT NULL DEFAULT 'credentials', auth_subject TEXT, auth_subject_index TEXT, email TEXT, email_index TEXT, is_minor INTEGER NOT NULL DEFAULT 0, guardian_contact TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, last_login_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS access_code (id TEXT PRIMARY KEY, lms_user_id TEXT NOT NULL, code_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER, used_at INTEGER, attempt_count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER)`,
  `CREATE TABLE IF NOT EXISTS consent_log (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, type TEXT NOT NULL, granted INTEGER NOT NULL DEFAULT 0, granted_at INTEGER, guardian_contact TEXT, notice_version TEXT, channel TEXT NOT NULL DEFAULT 'portal')`,
  `CREATE TABLE IF NOT EXISTS access_audit (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, actor_type TEXT NOT NULL, actor_ref TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, result TEXT NOT NULL DEFAULT 'ok', ip_hash TEXT)`,
  `CREATE TABLE IF NOT EXISTS tc_submission (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, assignment_id TEXT NOT NULL, student_id TEXT NOT NULL, file_ref TEXT NOT NULL, original_name TEXT, mime TEXT, size INTEGER, submitted_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'submitted')`,
  `CREATE TABLE IF NOT EXISTS tc_material (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, title TEXT NOT NULL, file_ref TEXT, url TEXT, mime TEXT, size INTEGER, visibility TEXT NOT NULL DEFAULT 'class', created_at INTEGER NOT NULL)`,
  // ---- P-LMS-1: schema changes ----
  `ALTER TABLE tc_assignment ADD COLUMN description_md TEXT`,
  `CREATE TABLE IF NOT EXISTS tc_material_progress (id TEXT PRIMARY KEY, material_id TEXT NOT NULL, student_id TEXT NOT NULL, completed_at INTEGER NOT NULL)`,
  // ---- index (SPEC-P5a §2.3) ----
  `CREATE INDEX IF NOT EXISTS idx_tc_student_class ON tc_student(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tc_session_class ON tc_session(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tc_attendance_session ON tc_attendance(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tc_assignment_class ON tc_assignment(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tc_grade_assignment ON tc_grade(assignment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tc_grade_student ON tc_grade(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lms_user_email ON lms_user(email_index)`,
  `CREATE INDEX IF NOT EXISTS idx_lms_user_subject ON lms_user(auth_subject_index)`,
  `CREATE INDEX IF NOT EXISTS idx_lms_user_student ON lms_user(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_access_code_user ON access_code(lms_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_consent_student ON consent_log(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_submission_student ON tc_submission(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_submission_assign ON tc_submission(assignment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_material_class ON tc_material(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_ts ON access_audit(ts)`,
  // ---- P-LMS-1: material progress indexes ----
  `CREATE INDEX IF NOT EXISTS idx_material_progress_student ON tc_material_progress(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_material_progress_material ON tc_material_progress(material_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_material_progress_unique ON tc_material_progress(material_id, student_id)`,
  // ---- S0: new tables (ADR-003 QĐ0) ----
  `CREATE TABLE IF NOT EXISTS tc_course (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT, description_md TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lms_person (id TEXT PRIMARY KEY, display_name TEXT, email TEXT, email_index TEXT, is_minor INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS enrollment (id TEXT PRIMARY KEY, person_id TEXT NOT NULL, class_id TEXT NOT NULL, course_id TEXT, role TEXT NOT NULL DEFAULT 'student', status TEXT NOT NULL DEFAULT 'active', enrolled_at INTEGER NOT NULL, completed_at INTEGER)`,
  // ---- S0: ALTER TABLE additions ----
  `ALTER TABLE tc_class ADD COLUMN course_id TEXT`,
  `ALTER TABLE tc_student ADD COLUMN person_id TEXT`,
  `ALTER TABLE lms_user ADD COLUMN person_id TEXT`,
  // ---- S0: indexes ----
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_course_slug ON tc_course(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_person_email ON lms_person(email_index)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollment_person ON enrollment(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollment_class ON enrollment(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollment_course ON enrollment(course_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_person_class ON enrollment(person_id, class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_student_person ON tc_student(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lms_user_person ON lms_user(person_id)`,
  // ---- S0: score INTEGER -> REAL ----
  // SQLite type affinity is flexible: existing INTEGER values auto-convert to REAL on read.
  // Since Drizzle maps both to JS number, the schema.ts change (integer→real) is sufficient.
  // No data migration needed for SQLite (INTEGER is compatible with REAL affinity).
  // ---- P-LMS-2: course structure (ADR-003 QĐ1.1) ----
  `CREATE TABLE IF NOT EXISTS tc_module (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, description_md TEXT, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_lesson (id TEXT PRIMARY KEY, module_id TEXT NOT NULL, title TEXT NOT NULL, content_md TEXT, video_url TEXT, kind TEXT NOT NULL DEFAULT 'text', position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_progress (id TEXT PRIMARY KEY, person_id TEXT NOT NULL, course_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'done', completed_at INTEGER)`,
  // P-LMS-2: gắn material vào lesson
  `ALTER TABLE tc_material ADD COLUMN lesson_id TEXT`,
  // P-LMS-2: indexes
  `CREATE INDEX IF NOT EXISTS idx_module_course ON tc_module(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_module ON tc_lesson(module_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_person ON tc_progress(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_course ON tc_progress(course_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_unique ON tc_progress(person_id, item_type, item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_material_lesson ON tc_material(lesson_id)`,
  // ---- P-LMS-3: Quiz + Question Bank (ADR-003 QĐ1.2) ----
  `CREATE TABLE IF NOT EXISTS tc_question (id TEXT PRIMARY KEY, course_id TEXT, type TEXT NOT NULL, stem_md TEXT NOT NULL, choices_json TEXT, correct_json TEXT, points REAL NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_quiz (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, lesson_id TEXT, title TEXT NOT NULL, time_limit_sec INTEGER, max_attempts INTEGER NOT NULL DEFAULT 1, shuffle INTEGER NOT NULL DEFAULT 0, reveal_after INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_quiz_question (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, question_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS tc_quiz_attempt (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, person_id TEXT NOT NULL, answers_json TEXT, score REAL, max_score REAL, started_at INTEGER NOT NULL, submitted_at INTEGER, graded_at INTEGER)`,
  // P-LMS-3: indexes
  `CREATE INDEX IF NOT EXISTS idx_question_course ON tc_question(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_course ON tc_quiz(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_lesson ON tc_quiz(lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_question_quiz ON tc_quiz_question(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempt_quiz ON tc_quiz_attempt(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempt_person ON tc_quiz_attempt(person_id)`,
  // ---- P-LMS-5: Gradebook trọng số + Chứng chỉ ----
  `CREATE TABLE IF NOT EXISTS tc_grade_category (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, name TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_certificate (id TEXT PRIMARY KEY, person_id TEXT NOT NULL, course_id TEXT NOT NULL, issued_at INTEGER NOT NULL, verify_code TEXT NOT NULL, criteria_snapshot_json TEXT, revoked INTEGER NOT NULL DEFAULT 0)`,
  // P-LMS-5: assignment -> category
  `ALTER TABLE tc_assignment ADD COLUMN category_id TEXT`,
  // P-LMS-5: indexes
  `CREATE INDEX IF NOT EXISTS idx_grade_category_course ON tc_grade_category(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_certificate_person ON tc_certificate(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_certificate_course ON tc_certificate(course_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_verify ON tc_certificate(verify_code)`,
  // ---- P-LMS-4: Code Auto-grade (ADR-003 QĐ1.3) ----
  `CREATE TABLE IF NOT EXISTS tc_code_problem (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, lesson_id TEXT, title TEXT NOT NULL, statement_md TEXT NOT NULL, languages_json TEXT NOT NULL DEFAULT '["python","javascript"]', time_limit_ms INTEGER NOT NULL DEFAULT 5000, mem_limit_mb INTEGER NOT NULL DEFAULT 256, total_weight REAL NOT NULL DEFAULT 100, status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_test_case (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, input TEXT, expected_output TEXT NOT NULL, is_hidden INTEGER NOT NULL DEFAULT 0, weight REAL NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS tc_code_submission (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, person_id TEXT NOT NULL, language TEXT NOT NULL, source_code TEXT, status TEXT NOT NULL DEFAULT 'queued', score REAL, passed_count INTEGER, total_count INTEGER, verdict TEXT, ran_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_code_run (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, test_case_id TEXT NOT NULL, passed INTEGER NOT NULL DEFAULT 0, time_ms INTEGER, mem_kb INTEGER, stdout TEXT, stderr TEXT)`,
  // P-LMS-4: indexes
  `CREATE INDEX IF NOT EXISTS idx_code_problem_course ON tc_code_problem(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_test_case_problem ON tc_test_case(problem_id)`,
  `CREATE INDEX IF NOT EXISTS idx_code_submission_problem ON tc_code_submission(problem_id)`,
  `CREATE INDEX IF NOT EXISTS idx_code_submission_person ON tc_code_submission(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_code_run_submission ON tc_code_run(submission_id)`,
  // ---- P-LMS-6: Forum + Enrollment nâng cao ----
  `CREATE TABLE IF NOT EXISTS tc_thread (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, lesson_id TEXT, author_type TEXT NOT NULL, author_ref TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tc_post (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, author_type TEXT NOT NULL, author_ref TEXT NOT NULL, body_md TEXT NOT NULL, parent_id TEXT, hidden INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS class_enrol_code (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, code TEXT NOT NULL, max_uses INTEGER, used_count INTEGER NOT NULL DEFAULT 0, expires_at INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
  // P-LMS-6: indexes
  `CREATE INDEX IF NOT EXISTS idx_thread_course ON tc_thread(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_thread_lesson ON tc_thread(lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_post_thread ON tc_post(thread_id)`,
  `CREATE INDEX IF NOT EXISTS idx_post_parent ON tc_post(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_enrol_code_course ON class_enrol_code(course_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_enrol_code_code ON class_enrol_code(code)`,
];

async function main() {
  // Script KHÔNG tự nạp .env. Chạy trần = sửa FILE LOCAL, không phải Turso. In rõ đích đến
  // để không bao giờ migrate nhầm DB rồi tưởng đã xong.
  const target = process.env.LMS_DATABASE_URL || "file:lms.db";
  const isRemote = target.startsWith("libsql:") || target.startsWith("https:");
  console.log(
    "Dich den: " + target.replace(/([?&](authToken|auth_token)=)[^&]+/gi, "$1***") +
      (isRemote ? "   <<< REMOTE (Turso) >>>" : "   <<< FILE LOCAL tren may ban >>>"),
  );
  for (const sql of STATEMENTS) {
    try {
      await lmsLibsql.execute(sql);
    } catch (e) {
      // ALTER TABLE fails if column already exists — safe to ignore
      if (String(e).includes('duplicate column') || String(e).includes('already exists')) {
        continue;
      }
      throw e;
    }
  }
  console.log(`✓ migrate: tạo bảng xong — ${isRemote ? "Turso (remote)" : "file local"}`);
}

main().catch((e) => {
  console.error("migrate lms fail:", e);
  process.exit(1);
});
