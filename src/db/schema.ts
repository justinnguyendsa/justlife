import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ===== personal.db — Phase 1 (single-user, no auth) =====
// Quy ước: thời gian lưu epoch milliseconds (UTC); hiển thị format Asia/Ho_Chi_Minh (lib/format).
// "area" = mảng đời sống: work | teach | study | growth (màu module trong tokens.css).

export const task = sqliteTable("task", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  note: text("note"), // ⚠ privacy: có thể chứa nội dung nhạy cảm — mã hóa app-level khi bật sync (R-JL-STUDENT-PII/PRIVACY)
  area: text("area").notNull().default("work"), // work|teach|study|growth
  status: text("status").notNull().default("inbox"), // inbox|todo|doing|review|done
  effort: integer("effort"), // 1..5 (null = chưa đặt)
  impact: integer("impact"), // 1..5 (null = chưa đặt)
  deadlineAt: integer("deadline_at"), // epoch ms (null = không deadline)
  priorityScore: integer("priority_score"), // 0..100 (null nếu thiếu effort/impact)
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  doneAt: integer("done_at"),
});

export const fixedSchedule = sqliteTable("fixed_schedule", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  area: text("area").notNull().default("work"),
  startMin: integer("start_min").notNull(), // phút từ 00:00 (giờ địa phương)
  endMin: integer("end_min").notNull(),
  weekdayMask: integer("weekday_mask").notNull(), // bit0=T2 ... bit6=CN
  createdAt: integer("created_at").notNull(),
});

export const timeBlock = sqliteTable("time_block", {
  id: text("id").primaryKey(),
  taskId: text("task_id"), // null nếu block tự do
  title: text("title").notNull(),
  startAt: integer("start_at").notNull(), // epoch ms
  endAt: integer("end_at").notNull(),
  area: text("area").notNull().default("work"),
  createdAt: integer("created_at").notNull(),
});

export const deadline = sqliteTable("deadline", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  dueAt: integer("due_at").notNull(),
  milestone: text("milestone").notNull(), // T-7 | T-3 | T-1 | T-0
  escalationLevel: integer("escalation_level").notNull().default(1), // stored: 1=warning,2=urgent (3=overdue tính read-time)
  snoozeUntil: integer("snooze_until"),
  createdAt: integer("created_at").notNull(),
});

export const userSettings = sqliteTable("user_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const event = sqliteTable("event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload"), // JSON string — tối thiểu PII
  at: integer("at").notNull(),
});

export type Task = typeof task.$inferSelect;
export type FixedSchedule = typeof fixedSchedule.$inferSelect;
export type TimeBlock = typeof timeBlock.$inferSelect;
export type Deadline = typeof deadline.$inferSelect;
export type Area = "work" | "teach" | "study" | "growth";
export type Status = "inbox" | "todo" | "doing" | "review" | "done";

// ===== Teaching (tc_*) ĐÃ CHUYỂN sang lms.db — xem src/db/lms/schema.ts (ADR-002 Q1). =====
// Personal.db KHÔNG còn chứa tc_* (R-JL-TWO-FACES-01). Import type Tc* từ "@/db/lms/schema".

// ===== Study OS (học cao học, Phase 3 — single-user personal) =====
export const stCourse = sqliteTable("st_course", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  term: text("term"),
  createdAt: integer("created_at").notNull(),
});
export const stItem = sqliteTable("st_item", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("assignment"), // assignment|quiz|project|exam
  dueAt: integer("due_at"),
  status: text("status").notNull().default("todo"), // todo|doing|done
  createdAt: integer("created_at").notNull(),
  doneAt: integer("done_at"),
});
export const stNote = sqliteTable("st_note", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  url: text("url"),
  createdAt: integer("created_at").notNull(),
});
export type StCourse = typeof stCourse.$inferSelect;
export type StItem = typeof stItem.$inferSelect;
export type StNote = typeof stNote.$inferSelect;

// ===== Library (tài liệu — folders + files, dùng chung Học & Dạy) =====
export const libFolder = sqliteTable("lib_folder", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id"), // null = gốc
  shareId: text("share_id"),   // có = đang chia sẻ qua link
  createdAt: integer("created_at").notNull(),
});
export const libFile = sqliteTable("lib_file", {
  id: text("id").primaryKey(),
  folderId: text("folder_id"), // null = gốc
  name: text("name").notNull(),
  kind: text("kind").notNull().default("link"), // upload | link
  url: text("url"),             // kind=link
  storedName: text("stored_name"), // kind=upload (tên file trên đĩa)
  mime: text("mime"),
  size: integer("size"),
  shareId: text("share_id"),
  linkClassId: text("link_class_id"),   // gắn lớp (dạy) — chuẩn bị P5
  linkCourseId: text("link_course_id"), // gắn môn (học)
  createdAt: integer("created_at").notNull(),
});
export type LibFolder = typeof libFolder.$inferSelect;
export type LibFile = typeof libFile.$inferSelect;

// ===== Habit + Rest (Phase 4 — single-user personal) =====
export const hbHabit = sqliteTable("hb_habit", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  area: text("area").notNull().default("growth"),
  createdAt: integer("created_at").notNull(),
  archivedAt: integer("archived_at"),
});
export const hbLog = sqliteTable("hb_log", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").notNull(),
  dateKey: text("date_key").notNull(), // YYYY-MM-DD (Asia/HCM); có log = hoàn thành ngày đó
  createdAt: integer("created_at").notNull(),
});
export const restBlock = sqliteTable("rest_block", {
  id: text("id").primaryKey(),
  dateKey: text("date_key").notNull(),
  minutes: integer("minutes").notNull().default(20),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
});
export type HbHabit = typeof hbHabit.$inferSelect;
export type HbLog = typeof hbLog.$inferSelect;
export type RestBlock = typeof restBlock.$inferSelect;
