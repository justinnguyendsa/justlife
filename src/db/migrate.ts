import { libsql } from "./client";

// Tạo bảng (idempotent). Dùng raw SQL để không phụ thuộc drizzle-kit — khớp src/db/schema.ts.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS task (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT,
    area TEXT NOT NULL DEFAULT 'work',
    status TEXT NOT NULL DEFAULT 'inbox',
    effort INTEGER,
    impact INTEGER,
    deadline_at INTEGER,
    priority_score INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    done_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS fixed_schedule (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT 'work',
    start_min INTEGER NOT NULL,
    end_min INTEGER NOT NULL,
    weekday_mask INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS time_block (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    title TEXT NOT NULL,
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    area TEXT NOT NULL DEFAULT 'work',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS deadline (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    milestone TEXT NOT NULL,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    snooze_until INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS event (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_task_status ON task(status)`,
  `CREATE INDEX IF NOT EXISTS idx_task_deadline ON task(deadline_at)`,
  `CREATE INDEX IF NOT EXISTS idx_deadline_task ON deadline(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_block_start ON time_block(start_at)`,
  // Teaching (tc_*) ĐÃ CHUYỂN sang lms.db — xem src/db/lms/migrate.ts (ADR-002 Q1, R-JL-TWO-FACES-01).
  // Study OS (P3)
  `CREATE TABLE IF NOT EXISTS st_course (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT, term TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS st_item (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'assignment', due_at INTEGER, status TEXT NOT NULL DEFAULT 'todo', created_at INTEGER NOT NULL, done_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS st_note (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT, url TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_st_item_course ON st_item(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_st_item_due ON st_item(due_at)`,
  `CREATE INDEX IF NOT EXISTS idx_st_note_course ON st_note(course_id)`,
  // Library (tài liệu)
  `CREATE TABLE IF NOT EXISTS lib_folder (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, share_id TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lib_file (id TEXT PRIMARY KEY, folder_id TEXT, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'link', url TEXT, stored_name TEXT, mime TEXT, size INTEGER, share_id TEXT, link_class_id TEXT, link_course_id TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_lib_folder_parent ON lib_folder(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lib_file_folder ON lib_file(folder_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lib_folder_share ON lib_folder(share_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lib_file_share ON lib_file(share_id)`,
  // Habit + Rest (P4)
  `CREATE TABLE IF NOT EXISTS hb_habit (id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT 'growth', created_at INTEGER NOT NULL, archived_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS hb_log (id TEXT PRIMARY KEY, habit_id TEXT NOT NULL, date_key TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rest_block (id TEXT PRIMARY KEY, date_key TEXT NOT NULL, minutes INTEGER NOT NULL DEFAULT 20, note TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_hb_log_habit ON hb_log(habit_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_hb_log_unique ON hb_log(habit_id, date_key)`,
  `CREATE INDEX IF NOT EXISTS idx_rest_date ON rest_block(date_key)`,
];

async function main() {
  for (const sql of STATEMENTS) await libsql.execute(sql);
  console.log("✓ migrate: tạo bảng xong (personal.db)");
}

main().catch((e) => {
  console.error("migrate fail:", e);
  process.exit(1);
});
