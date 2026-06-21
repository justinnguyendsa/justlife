# Tech Spec — Phase 1 MVP: Quản lý Việc + Deadline

## Liên kết
- US: `US-MVP-Task-Deadline-21062026.md` (US-01 → US-09)
- ADR: `ADR-001-tech-stack-21062026.md`
- Stack: Next.js 15 · TypeScript · Drizzle · libSQL (SQLite) · Server Actions · Route Handlers
- Design: `design-system.md` (Cobalt & Amber · Be Vietnam Pro · Inter · lucide)

---

## Data / Schema changes (`personal.db`)

> Tất cả bảng P1 nằm trong `src/lib/db/personal/schema.ts`. Migration chạy qua Drizzle Kit (`drizzle/personal/`).

### Bảng 1 — `task`
```ts
// src/lib/db/personal/schema.ts
export const task = sqliteTable('task', {
  id:             text('id').primaryKey(),           // nanoid, gen phía server
  title:          text('title').notNull(),            // max 500 ký tự, trim trước khi lưu
  note:           text('note'),                       // PRIVACY-FLAG: ghi chú tự do — xem Privacy notes
  status:         text('status', {
                    enum: ['inbox','todo','doing','done','archived']
                  }).notNull().default('inbox'),
  effort:         integer('effort'),                 // 1–5, nullable = chưa set
  impact:         integer('impact'),                 // 1–5, nullable = chưa set
  deadline_at:    integer('deadline_at', { mode: 'timestamp' }), // UTC epoch
  priority_score: real('priority_score'),            // null nếu effort|impact chưa set
  done_at:        integer('done_at', { mode: 'timestamp' }),
  created_at:     integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at:     integer('updated_at', { mode: 'timestamp' }).notNull(),
  // wip_limit đã xóa — chỉ lưu trong user_settings (key "wip_limit")
});
```
- Field nhạy cảm: `note` — xem Privacy notes.
- `deadline_at` lưu UTC; UI hiển thị theo `Asia/Ho_Chi_Minh`.
- `wip_limit` KHÔNG có trên bảng `task`. Toàn bộ code đọc WIP limit phải dùng `user_settings` key `"wip_limit"` (xem Bảng 5). Builder không tạo column này trong migration.

### Bảng 2 — `fixed_schedule`
```ts
export const fixedSchedule = sqliteTable('fixed_schedule', {
  id:           text('id').primaryKey(),
  label:        text('label').notNull(),          // ví dụ "Làm việc", "Dạy tối"
  rrule:        text('rrule').notNull(),           // iCal RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
  start_time:   text('start_time').notNull(),      // "HH:MM" 24h, timezone Asia/Ho_Chi_Minh
  end_time:     text('end_time').notNull(),        // "HH:MM" — phải > start_time (kiểm tra ở app layer)
  weekday_mask: integer('weekday_mask').notNull(), // bitmask 0–127 (bit 0=Sun … bit 6=Sat), dư thừa với rrule nhưng dùng cho query nhanh
  created_at:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at:   integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```
- Không có field nhạy cảm.
- `start_time`/`end_time` là local time strings (không UTC), vì lịch cố định mang tính "giờ địa phương" không thay đổi theo DST.

### Bảng 3 — `time_block`
```ts
export const timeBlock = sqliteTable('time_block', {
  id:               text('id').primaryKey(),
  task_id:          text('task_id'),          // soft FK → task.id (nullable: block không gắn task)
  title:            text('title'),            // override khi không có task
  start_at:         integer('start_at', { mode: 'timestamp' }).notNull(), // UTC epoch
  end_at:           integer('end_at', { mode: 'timestamp' }).notNull(),
  kind:             text('kind', {
                      enum: ['work','teach','study','growth','rest','fixed']
                    }).notNull().default('work'),
  is_fixed:         integer('is_fixed', { mode: 'boolean' }).notNull().default(false),
  created_at:       integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at:       integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```
- `start_at`/`end_at` lưu UTC; hiển thị theo `Asia/Ho_Chi_Minh`.
- Block qua nửa đêm (end_at ngày sau) là hợp lệ — UI phải xử lý.

### Bảng 4 — `deadline`
```ts
export const deadline = sqliteTable('deadline', {
  id:               text('id').primaryKey(),
  task_id:          text('task_id').notNull(),   // soft FK → task.id
  due_at:           integer('due_at', { mode: 'timestamp' }).notNull(), // UTC epoch
  milestone_label:  text('milestone_label').notNull(), // "T-7","T-3","T-1","T-0"
  escalation_level: integer('escalation_level').notNull().default(1),
                    // stored: 1 = warning (T-7/T-3/T-1), 2 = urgent (T-0)
                    // effective: tính tại read-time (xem logic escalation bên dưới)
  snooze_until:     integer('snooze_until', { mode: 'timestamp' }), // null = không snooze
  created_at:       integer('created_at', { mode: 'timestamp' }).notNull(),
});
```
- Mỗi task có deadline sẽ sinh đúng 4 row (T-7, T-3, T-1, T-0). Khi deadline thay đổi, xóa 4 row cũ và tạo lại.
- `snooze_until`: PRIVACY-FLAG nhẹ — thời điểm hành vi người dùng.

#### Logic escalation — giá trị insert khi rebuild 4 mốc (T04, hàm `rebuildDeadlines`)

Khi `updateTask` thay đổi `deadline_at`, xóa toàn bộ row `deadline` cũ của task rồi insert 4 row mới với các giá trị `escalation_level` cố định theo mốc:

| milestone_label | due_at (tính từ deadline_at) | escalation_level insert |
|---|---|---|
| `"T-7"` | `deadline_at - 7 * 24h` | `1` |
| `"T-3"` | `deadline_at - 3 * 24h` | `1` |
| `"T-1"` | `deadline_at - 1 * 24h` | `1` |
| `"T-0"` | `deadline_at` (chính xác) | `2` |

> Giá trị `stored_level` = 1 nghĩa là "cảnh báo đang tiến đến"; = 2 nghĩa là "đến hạn hôm nay". Giá trị 3 (quá hạn) KHÔNG bao giờ được lưu vào DB — nó được tính động tại read-time.

#### `effective_escalation` — tính tại read-time (T04, T11 và mọi hàm đọc deadline)

Mọi hàm trả về deadline object (Server Action, Route Handler) phải tính thêm trường ảo `effective_escalation` trước khi serialize response:

```
function effectiveEscalation(row: DeadlineRow, now: Date): number {
  // Quá hạn: task.deadline_at < now (so sánh deadline gốc của task)
  // hoặc đơn giản hơn: due_at của mốc T-0 < now
  if (task.deadline_at !== null && task.deadline_at < now) return 3;
  return row.escalation_level; // stored value: 1 hoặc 2
}
```

- Level 3 (quá hạn) **không cần cron / background job** — tính mỗi lần đọc bằng so sánh `task.deadline_at < now`.
- Trường `effective_escalation` xuất hiện trong response type `DeadlineWithTask` nhưng không có trong schema DB.

#### Tôn trọng `snooze_until` tại read-time

Khi `snooze_until` không null và `now < snooze_until`, hàm đọc **ẩn** deadline khỏi danh sách cảnh báo (không trả về trong `upcoming`/`deadlines_24h`). Khi `snooze_until` hết hạn (`now >= snooze_until`), deadline hiện lại tự động — không cần cron, không cần DB update. Rule áp dụng trong T11 (`/api/personal/deadlines`) và T10 (`/api/personal/today`).

```
// Pseudo-code trong query layer
const visible = deadlines.filter(d =>
  d.snooze_until === null || now >= d.snooze_until
);
```

### Bảng 5 — `user_settings`
```ts
export const userSettings = sqliteTable('user_settings', {
  key:   text('key').primaryKey(),   // e.g. "wip_limit", "onboarding_done"
  value: text('value').notNull(),    // JSON string hoặc primitive
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```
- Single-user, dùng key-value cho cài đặt nhẹ (WIP limit, preset onboarding).
- WIP limit default = `"3"` (string JSON). Đây là **nguồn duy nhất** cho WIP limit — không đọc từ bảng `task`.

### Bảng 6 — `event` (append-only)
```ts
export const event = sqliteTable('event', {
  id:      text('id').primaryKey(),
  ts:      integer('ts', { mode: 'timestamp' }).notNull(),
  type:    text('type').notNull(),    // e.g. "task.created", "task.status_changed"
  payload: text('payload').notNull(), // JSON — PRIVACY-FLAG: có thể chứa title/note
});
```
- Append-only, không UPDATE/DELETE.
- PRIVACY-FLAG: `payload` có thể chứa tiêu đề/ghi chú task — mã hóa app-level ở P5 nếu cần zero-knowledge.

### Migration note
- File: `drizzle/personal/0001_initial_p1.sql`
- Thứ tự tạo bảng: `user_settings` → `task` → `fixed_schedule` → `time_block` → `deadline` → `event`
- Migration là task riêng (T01), phải hoàn tất trước mọi task đọc DB (T02 trở đi).
- **Lưu ý migration:** bảng `task` KHÔNG có column `wip_limit`. Builder kiểm tra lại trước khi chạy.

---

## API / Boundary

> Pattern: **Server Actions** cho mutation (create/update/delete); **Route Handlers** (`/api/personal/*`) cho read khi cần streaming hoặc gọi từ client component. Đầu vào validate bằng Zod. Lỗi trả `{ error: string }` (tiếng Việt), không throw ra ngoài.

### Server Actions — Task (`src/app/(personal)/inbox/actions.ts`, `src/lib/actions/task.ts`)

| Action | Input (Zod) | Output | Lỗi |
|---|---|---|---|
| `createTask(data)` | `{ title: string (1–500) }` | `{ task: Task }` | `"Vui lòng nhập tiêu đề"` / `"Tiêu đề quá dài (tối đa 500 ký tự)"` |
| `updateTask(id, data)` | `{ title?, note?, status?, effort?(1-5), impact?(1-5), deadline_at?(Date) }` | `{ task: Task }` | `"Không tìm thấy việc"` / validation errors |
| `deleteTask(id)` | `{ id: string }` | `{ ok: true }` | `"Không tìm thấy việc"` |
| `archiveTask(id)` | `{ id: string }` | `{ task: Task }` | — |

- `createTask`: trim title, reject nếu chỉ whitespace, nanoid cho id, `created_at = updated_at = Date.now()`.
- `updateTask`: nếu `effort`/`impact`/`deadline_at` thay đổi → tính lại `priority_score` via `lib/priority.ts`; nếu `deadline_at` thay đổi → gọi `rebuildDeadlines(task_id, deadline_at)` (xóa 4 row cũ, insert 4 row mới với `escalation_level` theo bảng mốc trong Bảng 4).
- `updateTask` với `status = 'doing'`: kiểm tra WIP count vs `user_settings['wip_limit']`; nếu vượt → trả `{ wip_exceeded: true, current: N, limit: N }` (client quyết định có show confirm không). **Đọc limit từ `user_settings` — không từ `task`.**
- Debounce guard: action idempotent bằng optimistic ID từ client hoặc unique constraint trên `id`.

### Server Actions — Fixed Schedule (`src/lib/actions/fixedSchedule.ts`)

| Action | Input (Zod) | Output | Lỗi |
|---|---|---|---|
| `createFixedSchedule(data)` | `{ label, rrule, start_time("HH:MM"), end_time("HH:MM"), weekday_mask }` | `{ schedule: FixedSchedule }` | `"Giờ kết thúc phải sau giờ bắt đầu"` |
| `updateFixedSchedule(id, data)` | same fields (partial) | `{ schedule: FixedSchedule }` | same |
| `deleteFixedSchedule(id)` | `{ id }` | `{ ok: true }` | `"Không tìm thấy khối lịch"` |

- Validate `end_time > start_time` ở server (không chỉ client).
- Khi tạo/sửa: kiểm tra overlap với block khác → `{ overlap: true, conflicting_id: string }` (warn, không block cứng).

### Server Actions — Time Block (`src/lib/actions/timeBlock.ts`)

| Action | Input (Zod) | Output | Lỗi |
|---|---|---|---|
| `createTimeBlock(data)` | `{ task_id?, title?, start_at, end_at, kind }` | `{ timeBlock: TimeBlock, conflicts: ConflictResult[] }` | `"Giờ kết thúc phải sau giờ bắt đầu"` |
| `updateTimeBlock(id, data)` | partial same | `{ timeBlock: TimeBlock, conflicts: ConflictResult[] }` | — |
| `deleteTimeBlock(id)` | `{ id }` | `{ ok: true }` | — |

```ts
// ConflictResult — dùng cho cả T06 (action) và T20 (ConflictWarningModal)
type ConflictResult = {
  kind: 'fixed_schedule' | 'time_block';
  id: string;
  label: string;      // tên khối xung đột
  start_at: Date;
  end_at: Date;
};
```

- `conflicts`: mảng các khối bị trùng giờ (fixed_schedule HOẶC time_block khác của người dùng). Client (T20 ConflictWarningModal) hiển thị cảnh báo và yêu cầu confirm nếu `conflicts.length > 0`.
- Logic kiểm tra xung đột: `src/lib/scheduler.ts` — hàm `checkConflicts(start_at, end_at, excludeBlockId?): ConflictResult[]`.
- T20 (ConflictWarningModal) nhận `conflicts: ConflictResult[]` qua props và hiển thị tên + giờ của từng xung đột. Modal được gọi từ T26 (CalendarDragDrop) và T06 flow tạo/sửa block.
- Phát sinh `event` row `"time_block.created"` / `"time_block.updated"`.

### Server Actions — Settings (`src/lib/actions/settings.ts`)

| Action | Input | Output | Lỗi |
|---|---|---|---|
| `getSettings(keys[])` | `string[]` | `Record<string, string>` | — |
| `setSetting(key, value)` | `{ key, value: string }` | `{ ok: true }` | `"Key không hợp lệ"` |

### Route Handlers — Read (`/api/personal/`)

| Route | Method | Query params | Response | Lỗi |
|---|---|---|---|---|
| `/api/personal/tasks` | GET | `status?`, `sort?('created'|'priority')`, `page?`, `limit?(default 20)` | `{ tasks: Task[], total: number, page: number }` | 400 validation |
| `/api/personal/tasks/[id]` | GET | — | `{ task: Task, deadlines: DeadlineWithEffective[] }` | 404 |
| `/api/personal/today` | GET | `date?(ISO, default today VN)` | `{ doing: Task[], priority_top: Task[], deadlines_24h: DeadlineWithEffective[], time_blocks: TimeBlock[] }` | 400 |
| `/api/personal/deadlines` | GET | `window_days?(default 7)` | `{ upcoming: DeadlineWithTask[], overdue: DeadlineWithTask[] }` | 400 |
| `/api/personal/fixed-schedules` | GET | — | `{ schedules: FixedSchedule[] }` | — |

```ts
// DeadlineWithEffective — response type (không phải DB schema)
type DeadlineWithEffective = Deadline & {
  effective_escalation: 1 | 2 | 3; // tính tại read-time
  task: Pick<Task, 'id' | 'title' | 'deadline_at'>;
};
```

- Tất cả timestamps trong response: ISO 8601 string (UTC). Client format theo `Asia/Ho_Chi_Minh`.
- `today` endpoint: "hôm nay" tính theo `Asia/Ho_Chi_Minh` (offset +7); query nhận `date` parameter dạng `YYYY-MM-DD` (local VN).
- **T11 và T10** phải lọc bỏ deadline có `snooze_until != null && now < snooze_until` trước khi trả về.
- **T11 và T10** phải tính `effective_escalation` (xem logic Bảng 4) cho mỗi deadline row.

### `lib/priority.ts` — công thức priority_score

```
urgency   = max(0, 1 - (deadline_at - now) / (7 * 24 * 3600 * 1000))  // 1 = quá hạn, 0 = >7 ngày
score     = (urgency * 50) + (impact / 5 * 30) + ((6 - effort) / 5 * 20)
// range 0–100, deterministic
// edge: effort = null OR impact = null → score = null
// edge: effort = 0 → treat as null (avoid division by zero)
// edge: deadline_at = null → urgency = 0
```

- Hàm `calcPriorityScore(task: Pick<Task, 'deadline_at'|'effort'|'impact'>): number | null`
- Export pure function, không side-effect, dễ unit test.

### `lib/scheduler.ts` — kiểm tra xung đột lịch cố định

```
checkConflicts(start_at: Date, end_at: Date, excludeBlockId?: string): ConflictResult[]
expandRrule(schedule: FixedSchedule, date: Date): { start: Date, end: Date } | null
```

- `checkConflicts` kiểm tra CẢ HAI nguồn xung đột: `fixed_schedule` (expand rrule theo ngày) VÀ các `time_block` hiện có (trừ `excludeBlockId`).
- `expandRrule`: tính xem một `fixed_schedule` có xuất hiện vào `date` không (dựa trên `weekday_mask` và `rrule`).
- Thư viện rrule: `rrule` (npm) — không tự implement.
- Trả về `ConflictResult[]` (xem type ở mục Time Block actions).

---

## Bảng task

| ID | Mô tả | Owner agent | File dự kiến | Depends | Reuse? | Effort |
|----|-------|-------------|--------------|---------|--------|--------|
| T01 | Migration P1: tạo 6 bảng personal.db (user_settings, task, fixed_schedule, time_block, deadline, event). Bảng `task` KHÔNG có column `wip_limit`. | backend-builder | `drizzle/personal/0001_initial_p1.sql`, `src/lib/db/personal/schema.ts`, `src/lib/db/personal/client.ts` | — | NEW | S |
| T02 | lib/priority.ts — hàm `calcPriorityScore` + unit tests | backend-builder | `src/lib/priority.ts`, `tests/unit/priority.test.ts` | T01 | NEW | S |
| T03 | lib/scheduler.ts — `checkConflicts` (fixed_schedule + time_block) + `expandRrule` (dùng rrule npm); trả `ConflictResult[]` | backend-builder | `src/lib/scheduler.ts`, `tests/unit/scheduler.test.ts` | T01 | NEW | S |
| T04 | Server Actions: task CRUD (`createTask`, `updateTask`, `archiveTask`) + hàm `rebuildDeadlines(task_id, deadline_at)` insert 4 mốc với `escalation_level` đúng (T-7→1, T-3→1, T-1→1, T-0→2). WIP limit đọc từ `user_settings`. | backend-builder | `src/lib/actions/task.ts` | T01, T02 | NEW | M |
| T05 | Server Actions: fixed_schedule CRUD | backend-builder | `src/lib/actions/fixedSchedule.ts` | T01, T03 | NEW | S |
| T06 | Server Actions: time_block CRUD + conflict check; trả `ConflictResult[]`; wire với T20 (ConflictWarningModal) khi `conflicts.length > 0` | backend-builder | `src/lib/actions/timeBlock.ts` | T01, T03 | NEW | S |
| T07 | Server Actions: settings get/set + event append helper | backend-builder | `src/lib/actions/settings.ts`, `src/lib/actions/event.ts` | T01 | NEW | S |
| T08 | Route Handler GET /api/personal/tasks (list + phân trang) | backend-builder | `src/app/api/personal/tasks/route.ts` | T04 | NEW | S |
| T09 | Route Handler GET /api/personal/tasks/[id] | backend-builder | `src/app/api/personal/tasks/[id]/route.ts` | T04 | NEW | XS |
| T10 | Route Handler GET /api/personal/today — tính `effective_escalation` tại read-time; lọc `snooze_until`; trả `DeadlineWithEffective[]` | backend-builder | `src/app/api/personal/today/route.ts` | T04, T06 | NEW | S |
| T11 | Route Handler GET /api/personal/deadlines — tính `effective_escalation` tại read-time; lọc `snooze_until`; trả `{ upcoming, overdue }` với `DeadlineWithTask[]` | backend-builder | `src/app/api/personal/deadlines/route.ts` | T04 | NEW | S |
| T12 | Route Handler GET /api/personal/fixed-schedules | backend-builder | `src/app/api/personal/fixed-schedules/route.ts` | T05 | NEW | XS |
| T13 | UI Component: InboxQuickAdd (AC-01-1, AC-01-4, AC-01-6) — modal/inline, mobile-44px, debounce | frontend-builder | `src/components/personal/InboxQuickAdd.tsx` | T04 | NEW | M |
| T14 | UI Component: TaskCard (hiện title, status badge, priority_score, "Chưa ưu tiên" badge) | frontend-builder | `src/components/personal/TaskCard.tsx` | — | NEW | S |
| T15 | UI Component: TaskDetail (Effort/Impact slider 1–5, deadline picker, score live-update, AC-03-1..5) | frontend-builder | `src/components/personal/TaskDetail.tsx` | T04, T02 | NEW | M |
| T16 | UI Component: StatusSwitcher (inbox→todo→doing→done inline, WIP warn modal, AC-02-4, AC-04-1,5) | frontend-builder | `src/components/personal/StatusSwitcher.tsx` | T04, T07 | NEW | S |
| T17 | Page /inbox — danh sách, tìm kiếm client-side, sort ưu tiên, empty state, phân trang (AC-02-1..6) | frontend-builder | `src/app/(personal)/inbox/page.tsx` | T08, T13, T14, T15, T16 | NEW | M |
| T18 | Page /(personal)/focus — Focus mode 1 task, auto-next, empty state (AC-04-2, AC-04-3) | frontend-builder | `src/app/(personal)/focus/page.tsx` | T17 | NEW | M |
| T19 | UI Component: CalendarDayView (lịch ngày hiển thị time-block + khối cố định màu cobalt, không kéo block cố định, AC-05-1..6) — wrapper/container; kéo-thả thực hiện bởi T26 | frontend-builder | `src/components/personal/CalendarDayView.tsx` | T06, T05, T26 | NEW | M |
| T20 | UI Component: ConflictWarningModal — nhận `conflicts: ConflictResult[]` qua props, hiển thị tên + giờ từng xung đột, 2 nút "Hủy" / "Tạo dù vậy" (AC-05-2, AC-05-4). Dùng cho cả kéo-thả (T26) và tạo block thủ công. | frontend-builder | `src/components/personal/ConflictWarningModal.tsx` | T06 | NEW | XS |
| T21 | Page /today — 4 section: doing / top priority / deadline 24h / lịch hôm nay (AC-09-1..5) | frontend-builder | `src/app/(personal)/today/page.tsx` | T10, T14, T19 | NEW | M |
| T22 | Page /deadlines — danh sách task 7 ngày tới + quá hạn, badge escalation màu theo `effective_escalation` (1=vàng, 2=cam, 3=đỏ) (AC-07-1..6, AC-08-1..5) | frontend-builder | `src/app/(personal)/deadlines/page.tsx` | T11 | NEW | M |
| T23 | Page /settings/fixed-schedules — CRUD khối cố định, preset onboarding, rrule (AC-06-1..6) | frontend-builder | `src/app/(personal)/settings/fixed-schedules/page.tsx` | T12, T05 | NEW | M |
| T24 | Root layout (personal) — nạp font (next/font Be Vietnam Pro + Inter + Geist Mono), tokens.css, mobile-first nav | frontend-builder | `src/app/(personal)/layout.tsx`, `src/styles/tokens.css`, `src/styles/globals.css` | — | NEW | S |
| T25 | E2E smoke test Playwright: create task → update status → view today (AC-01-2, AC-02-4, AC-09-1) | backend-builder | `tests/e2e/p1-smoke.spec.ts` | T17, T21 | NEW | S |
| T26 | UI Component: CalendarDragDrop — kéo-thả time-block trên lưới ngày/tuần (desktop mouse + mobile touch "chạm-để-đặt"). Khuyến nghị: custom component thuần CSS Grid + Pointer Events API (không cần thư viện nặng). Khi thả xong gọi `updateTimeBlock`; nếu `conflicts.length > 0` mở T20 ConflictWarningModal. Không cho kéo block `is_fixed = true`. | frontend-builder | `src/components/personal/CalendarDragDrop.tsx` | T06, T20 | NEW | L |
| T27 | UI Component: CalendarWeekView — lưới tuần 7 cột, tích hợp T26 (kéo-thả), mobile scroll ngang, nút "Hôm nay" để jump về ngày hiện tại. Hiển thị time-block + khối cố định giống CalendarDayView. | frontend-builder | `src/components/personal/CalendarWeekView.tsx` | T19, T26 | NEW | M |

**Tổng: 27 tasks.**

### Wave 3 — tasks chạy song song (file disjoint)

Sau khi T01 (migration) done:

- **Wave A (backend song song):** T02 · T03 · T07 (không phụ thuộc nhau, file riêng)
- **Wave B (backend → sau Wave A):** T04 · T05 · T06 · T08 · T09 · T10 · T11 · T12
- **Wave C (frontend song song, không phụ thuộc nhau):** T13 · T14 · T20 · T24 (file riêng)
- **Wave D (frontend → sau Wave C + Wave B):** T15 · T16 · T17 · T18 · T21 · T22 · T23 · T26
- **Wave E (calendar → sau T06 + T26):** T19 · T27
- **Wave F:** T25 (sau Wave E)

> T26 phụ thuộc T06 (action) và T20 (modal). T19 và T27 phụ thuộc T26. Wave E là barrier calendar để builder không bắt đầu T19/T27 khi kéo-thả chưa xong.

### Ghi chú kéo-thả (T26) — lựa chọn kỹ thuật

**Khuyến nghị: custom component thuần Pointer Events API + CSS Grid.**

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| Custom (Pointer Events + CSS Grid) | Nhẹ, SSR-safe, không bundle thêm, CSP-friendly, full control mobile touch | Tốn ~L effort (đã ghi) |
| `@dnd-kit/core` | API tốt, accessible, SSR-compatible | Thêm ~15kB, cần custom sensor cho touch calendar |
| `react-big-calendar` | Feature-rich | SSR khó, bundle lớn, khó customize design-system |
| `FullCalendar` | Nhiều tính năng | License phức tạp, bundle rất lớn, over-engineer cho P1 |

Quyết định P1: **custom component** (T26). Nếu effort thực tế vượt L, escalate lên orchestrator để xem xét `@dnd-kit/core` (SSR-compatible, bundle chấp nhận được).

**Mobile "chạm-để-đặt":** Tap vào slot trống trên calendar (không phải drag) → mở inline time-picker chọn end time → tạo block. Drag (long-press > 300ms) = di chuyển block đã có.

---

## Edge cases & error states

| Case | Xử lý |
|---|---|
| Tiêu đề task chỉ whitespace | `title.trim() === ''` → reject, trả lỗi `"Vui lòng nhập tiêu đề"` |
| Tiêu đề > 500 ký tự | Cắt ở 500 hoặc trả lỗi `"Tiêu đề quá dài (tối đa 500 ký tự)"` — ưu tiên cắt để không mất data |
| Spam submit (double click Enter) | Nút/action disable ngay sau submit đầu tiên; re-enable sau response |
| `effort = 0` trong priority formula | Treat as `null` → `priority_score = null` |
| `effort / impact` null khi tính score | `priority_score = null`; badge "Chưa ưu tiên" trên UI |
| Deadline quá khứ | Task vẫn hiện, `effective_escalation = 3` (tính read-time), badge đỏ "Quá hạn" |
| Deadline hôm nay 00:00 | Quy ước: deadline date-only mặc định 23:59:59 Asia/Ho_Chi_Minh |
| Deadline ngày hôm nay vs ngày mai | urgency formula phân biệt rõ (urgency(T+0) > urgency(T+1)) |
| Tie-break priority_score bằng nhau | Sort thêm bằng `created_at ASC` |
| WIP-limit = 1 | Vẫn hoạt động; chỉ 1 task `doing` được phép |
| WIP vượt do data cũ | Hiển thị `"X/limit đang làm — quá giới hạn"`, không block read |
| Focus mode không còn task | Empty state: `"Không còn việc cần làm — nghỉ ngơi xứng đáng!"` |
| Today view rỗng hoàn toàn | Empty state tiếng Việt tích cực, không lỗi, không màn trắng |
| Time-block qua nửa đêm | `end_at > start_at` (UTC), UI render trên 2 ngày |
| Hai time-block người dùng tạo trùng giờ | `checkConflicts` kiểm tra cả time_block khác (không chỉ fixed_schedule); trả `ConflictResult` với `kind: 'time_block'` |
| Fixed schedule giờ bắt đầu ≥ kết thúc | Validate server: `"Giờ kết thúc phải sau giờ bắt đầu"`, không lưu |
| Fixed schedule overlap nhau | Warn (không block): `"Khối này trùng với [label]"` |
| Xóa fixed_schedule đã có time-block | time-block giữ nguyên; chỉ mất conflict-check cho block đó |
| Sửa deadline liên tục | Xóa 4 row `deadline` cũ của task rồi insert lại — không duplicate |
| `snooze_until` hết hạn khi app đóng | Lần mở app tiếp theo: server tính `snooze_until < now` → escalation hiện lại tự động |
| Nhiều escalation cùng lúc (>5) | Hiển thị tất cả, không collapse — Minh cần thấy hết |
| Offset múi giờ thiết bị ≠ server | Timestamps lưu UTC, format theo `Intl.DateTimeFormat` với `timeZone: 'Asia/Ho_Chi_Minh'` trên client |
| Offline (Turso sync chưa bật P1) | SQLite local → không cần handle offline riêng ở P1; ghi chú sẵn cho P2 |
| Kéo block cố định (`is_fixed=true`) | T26 disable drag trên block này; không gọi action |
| Drop block ra ngoài lưới calendar | Revert về vị trí ban đầu (optimistic update rollback) |
| Mobile touch + scroll page cùng lúc | Long-press > 300ms mới kích hoạt drag; scroll < 300ms không trigger |

---

## Privacy notes

| Field | Bảng | Mức độ | Hành động |
|---|---|---|---|
| `note` | `task` | NHẠY CẢM — ghi chú tự do, có thể chứa sức khỏe/cảm xúc | Cờ `privacy-auditor`: cân nhắc app-level encryption ở P5; P1 để clear text trong SQLite local |
| `payload` | `event` | NHẠY CẢM — có thể mirror title + note của task | Cờ `privacy-auditor`: P5 mã hóa payload nếu bật Turso sync |
| `snooze_until` | `deadline` | Hành vi thời gian — nhẹ | Không cần mã hóa P1 |
| `title` | `task` | Bình thường (mô tả việc) | Không nhạy cảm, nhưng không log ra console/error tracker |

> R-JL-PRIVACY-01: Dữ liệu nằm trong `personal.db` (SQLite local file). Chưa có mã hóa at-rest ở P1 — chấp nhận được vì local-first, single-user, máy Minh. Khi bật Turso sync (P2+), `privacy-auditor` phải review `note` + `event.payload` trước khi ship.

---

## Test plan (cho qa-verifier)

### 1. Typecheck + Build
```bash
npx tsc --noEmit
next build
```
Pass: 0 TS errors, build success.

### 2. Lint
```bash
eslint src/ --ext .ts,.tsx
```
Pass: 0 errors (warnings review thủ công).

### 3. Unit tests (Vitest)

| File test | Covers | Cases |
|---|---|---|
| `tests/unit/priority.test.ts` | `lib/priority.ts` | effort=null → null; impact=null → null; effort=0 → null; deadline quá khứ → urgency=1; deadline >7d → urgency=0; same input = same output; tie-break score |
| `tests/unit/scheduler.test.ts` | `lib/scheduler.ts` | block trong giờ làm → conflict kind=fixed_schedule; block trùng time_block khác → conflict kind=time_block; block ngoài → no conflict; block qua nửa đêm; rrule T2-T6; weekday không match → no conflict; excludeBlockId loại đúng |
| `tests/unit/actions-task.test.ts` | `lib/actions/task.ts` | title rỗng → error; title whitespace → error; title 501 ký tự → cắt/error; tạo thành công → status=inbox; WIP exceed → wip_exceeded response (đọc từ user_settings); deadline thay đổi → rebuild 4 deadline rows với escalation_level đúng (T-7→1, T-3→1, T-1→1, T-0→2) |
| `tests/unit/escalation.test.ts` | `effectiveEscalation()` trong T10/T11 | deadline_at quá khứ → effective=3; snooze_until tương lai → lọc khỏi list; snooze_until quá khứ → hiện lại; stored_level=2 + chưa quá hạn → effective=2 |

### 4. Edge/Error tests (Playwright)

| Test ID | Steps | Expected |
|---|---|---|
| E01 | Tạo task tiêu đề rỗng → submit | Lỗi tiếng Việt hiện, không tạo task |
| E02 | Tạo task hợp lệ | Task xuất hiện đầu danh sách Inbox, status = "Inbox" |
| E03 | Tìm kiếm từ khóa tiếng Việt "báo cáo" | Lọc đúng real-time, không cần reload |
| E04 | Chuyển task thứ 4 sang "Đang làm" (WIP=3 default) | Modal cảnh báo WIP tiếng Việt |
| E05 | Tạo time-block trùng giờ làm | ConflictWarningModal hiện, bấm Hủy → không tạo |
| E06 | Tạo time-block ngoài giờ cố định | Tạo thành công, hiện trên lịch |
| E07 | Deadline ngày hôm qua | Badge "Quá hạn" đỏ (effective_escalation=3), task ghim đầu /deadlines |
| E08 | Đánh dấu task Done | Task biến khỏi cảnh báo deadline |
| E09 | /today view với đủ data | 4 section hiện đúng (doing, top priority, deadline 24h, time-blocks) |
| E10 | Today/Inbox rỗng hoàn toàn | Empty state tiếng Việt, không lỗi |
| E11 | Mobile viewport 390px — nút Thêm việc | Kích thước ≥44×44px, ô nhập không bị bàn phím che |
| E12 | Fixed schedule start ≥ end | Lỗi tiếng Việt, không lưu |
| E13 | Kéo time-block sang slot mới trên desktop | Block di chuyển, `updateTimeBlock` được gọi, lịch cập nhật |
| E14 | Kéo time-block vào giờ cố định | ConflictWarningModal hiện với tên khối cố định |
| E15 | Tap slot trống trên mobile 390px | Inline time-picker mở, tạo block mới |
| E16 | Thử kéo block cố định (is_fixed=true) | Không drag được, con trỏ/touch không phản hồi |

### 5. Performance
- `/today` route: load < 2s trên mạng mô phỏng 4G (`Playwright networkConditions`).
- Inbox 500 tasks: scroll không chậm (phân trang server-side 20/page).
- CalendarWeekView 50 time-block: render < 100ms (kiểm tra bằng React DevTools Profiler trong dev).

---

## Reusable assets ghi nhận

| Asset | Dùng tại | Ghi chú |
|---|---|---|
| `src/styles/tokens.css` | T24, tất cả component | Single source — không hardcode màu/font |
| `lucide-react` | T13..T23, T26, T27 | stroke 1.5–2, size 16/20/24 |
| `rrule` (npm) | T03, T05, T19 | Không tự implement rrule |
| `nanoid` (npm) | T04..T07 | Gen ID phía server |
| `next/font` | T24 | Be Vietnam Pro + Inter + Geist Mono |
| Pointer Events API (browser built-in) | T26 | Dùng cho drag desktop + touch mobile — không cần thư viện thêm ở P1 |
