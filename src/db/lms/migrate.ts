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
];

async function main() {
  for (const sql of STATEMENTS) await lmsLibsql.execute(sql);
  console.log("✓ migrate: tạo bảng xong (lms.db)");
}

main().catch((e) => {
  console.error("migrate lms fail:", e);
  process.exit(1);
});
