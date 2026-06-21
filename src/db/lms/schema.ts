import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
  status: text("status").notNull().default("active"), // active|archived
  createdAt: integer("created_at").notNull(),
});
export const tcStudent = sqliteTable("tc_student", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
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
  title: text("title").notNull(),
  dueAt: integer("due_at"),
  maxScore: integer("max_score").notNull().default(10),
  createdAt: integer("created_at").notNull(),
});
export const tcGrade = sqliteTable("tc_grade", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id").notNull(),
  studentId: text("student_id").notNull(),
  score: integer("score"), // KHÔNG mã hóa (giữ số — P6)
  feedback: text("feedback"), // 🔒 privacy-review (nhận xét cá nhân)
  gradedAt: integer("graded_at"),
});

// ---- Bảng LMS mới (ADR-002 §2.2 / SPEC-P5a §2.2) — định nghĩa schema; dùng từ S2 ----
export const lmsUser = sqliteTable("lms_user", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(), // soft link → tc_student.id (no FK chéo cũng không FK trong-DB ở S1)
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
  title: text("title").notNull(),
  fileRef: text("file_ref"), // nullable — file trong vùng đĩa LMS
  url: text("url"), // nullable — link ngoài
  mime: text("mime"),
  size: integer("size"),
  visibility: text("visibility").notNull().default("class"), // class|draft
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
