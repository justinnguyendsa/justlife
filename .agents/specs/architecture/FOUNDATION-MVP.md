# FOUNDATION — MVP build contract (đọc trước khi code màn)

Stack: Next.js 15 App Router · TS · Drizzle/libSQL · CSS variables (tokens.css). Alias `@/*` → `src/*`. Server Components mặc định; thêm `"use client"` cho island tương tác. Mutations qua server actions (đã tự `revalidatePath`); sau khi gọi action ở client → `useRouter().refresh()`.

## Quy ước
- **Tiếng Việt 100%**, **chỉ dùng class/token có sẵn** (KHÔNG hardcode màu/font/hex). Responsive **mobile-first** (shell tự lo nav: sidebar desktop / bottom-nav mobile).
- Ngày giờ: lib/format (Asia/Ho_Chi_Minh). Màu theo mảng: `AREA_VAR[area]`.

## Data đọc — `@/db/queries`
- `listTasks(area?)` → Task[] (chưa done, sort priority desc, null cuối)
- `getTask(id)` → Task | null
- `getCalendarData(dayMs?)` → `{ day0, fixed: FixedSchedule[], blocks: TimeBlock[], tasks: Task[] }`
- `getTodayData`, `getDeadlinesData`, `getSettings` (đã dùng ở màn khác)

## Mutations — server actions
- `@/app/actions/tasks`: `createTask({title,area,deadlineAt,effort,impact})` · `updateTaskPriority(id,{effort,impact,deadlineAt?})` · `setTaskStatus(id,status)`
- `@/app/actions/schedule`: `createTimeBlock({taskId?,title,startAt,endAt,area})→{ok,id,conflicts}` · `updateTimeBlock(id,startAt,endAt)→{ok,conflicts}` · `deleteTimeBlock(id)`
- `conflicts` = `{kind:'fixed'|'block', label, startAt, endAt}[]`

## Components / lib
- `@/components/TaskCard` (SERVER only — KHÔNG import vào client; trong client tự render markup card, xem dưới)
- `@/components/PageHeader` `{title, sub?, action?}`
- `@/components/Toaster` → `toast(msg, warn?)` (client)
- `@/lib/priority` `calcPriorityScore({effort,impact,deadlineAt,now?})` (client-safe, pure)
- `@/lib/format` `fmtTime(ms) fmtDate(ms) fmtDayName(ms) minToHHMM(min) countdown(ms,now?)→{label,level:'ok'|'warn'|'over'} AREA_LABEL`
- `@/lib/scheduler` (pure, client-safe) `maskHasDate(mask,date) fixedToRange(f,dayStart)→{startAt,endAt} startOfDay(ms) detectConflicts(...) WEEKDAYS weekdayBit(date) rangesOverlap`
- `@/lib/areas` `AREA_VAR AREA_LABEL AREAS`
- `@/lib/escalation` `effectiveEscalation(dueAt,stored,now) isSnoozed MILESTONES`
- Types `@/db/schema`: `Task FixedSchedule TimeBlock Deadline Area Status`

## CSS classes có sẵn (globals.css) — dùng lại, đừng tự định nghĩa màu
`.card .task` (con: `.bar` [style background=AREA_VAR], `.b`, `.t`, `.meta`) · `.pscore` ·
`.chip` + biến thể `.work .teach .study .growth .dl .dl.over .st .st.doing .score` ·
`.sec h2 .secdot .cnt` · `.btn` + `.primary .ghost .amber .line .block .sm` · `.fab` ·
`.search` `.filters .fil .fil.on` `.seg` · `.empty` · `.field` `.row2` `.stepper .v` `.setrow .l .d` `.scorebox .n` ·
`.scrim .sheet` (modal) · `.areapick .a.work/teach/study/growth.on` · `.cal .hour .lab .blocks .blk .blk.fixed .blk.movable .blk.movable.drag .blk.conflict` `.legend` · `.mini .mrow .bar`

### Markup card chuẩn (render trong client khi không dùng TaskCard server)
```tsx
<button className="task card" onClick={...}>
  <span className="bar" style={{ background: AREA_VAR[t.area] }} />
  <div className="b">
    <div className="t">{t.title}</div>
    <div className="meta">
      <span className={`chip ${t.area}`}>{AREA_LABEL[t.area]}</span>
      {t.deadlineAt && <span className={"chip dl" + (countdown(t.deadlineAt).level==="over"?" over":"")}>{countdown(t.deadlineAt).label}</span>}
      {t.priorityScore!=null && <span className="chip score">{t.priorityScore} điểm</span>}
    </div>
  </div>
</button>
```

## Self-check bắt buộc trước khi trả
`cd "D:\My project\justlife" && npx tsc --noEmit` → 0 lỗi ở file mình tạo. KHÔNG sửa file dùng chung (chỉ tạo file màn của mình).
