# UIUX Spec — Phase 1 MVP: Quản lý Việc + Deadline
> Phiên bản: 21/06/2026 | Tác giả: uiux-spec-writer | Stack: Next.js 15 + TS | Design system: Cobalt & Amber (locked 2026-04-28)
> US gốc: `.agents/specs/user-stories/US-MVP-Task-Deadline-21062026.md` (US-01 → US-09)
> Trụ: **work = `--module-work` (cobalt)** — toàn bộ màu chính của feature này dùng cobalt.
> Lần vá: 21/06/2026 — GAP-01 (S7 TimeBlock Calendar Editor, P0) + GAP-02 (Settings WIP-limit, P1)

---

## Screen Flow

```
[S1: Trang Hôm Nay /today]
  ├─ tap "+ Thêm việc" (FAB) ──────────────────────────────┐
  ├─ tap task card (doing / ưu tiên)                        │
  │    └─ [S3: Chi tiết Task]                               │
  │         ├─ điền Deadline/Effort/Impact → lưu           │
  │         ├─ đổi trạng thái                               │
  │         └─ snooze escalation                            │
  ├─ tap "Xem Inbox" / nav Inbox                           │
  │    └─ [S2: Inbox /inbox]                                │
  │         ├─ fab "+ Thêm việc" ─────────────────────────►│
  │         ├─ tap task → [S3: Chi tiết Task]               │
  │         ├─ tap "Sắp xếp theo ưu tiên"                  │
  │         └─ tap "Focus" → [S5: Focus Mode]               │
  ├─ tap "Xem Deadlines"                                    │
  │    └─ [S4: Deadlines /deadlines]                        │
  │         └─ tap task → [S3: Chi tiết Task]               │
  ├─ tap "Lịch" / nav Calendar                             │
  │    └─ [S7: Lịch Time-block /calendar]                   │
  │         ├─ kéo-thả (desktop) / chạm-đặt (mobile) → tạo block
  │         ├─ tap block → sửa/xóa (bottom sheet)          │
  │         ├─ kéo kích thước block → sửa giờ              │
  │         └─ ConflictWarningModal khi trùng khối cố định  │
  └─ nav "Cài đặt"                                          │
       └─ [S6: Cài đặt /settings]                          │
            ├─ /settings/schedule — Lịch cố định           │
            └─ /settings/wip     — Giới hạn WIP            │
                                                             │
[M1: Modal Thêm Việc Nhanh] ◄────────────────────────────────┘
  └─ Lưu → đóng modal → task hiện đầu danh sách hiện tại
```

**Tổng màn: 7 màn chính + 1 modal overlay + 1 dialog xác nhận WIP (dùng chung) + 1 modal xung đột lịch (dùng chung)**

---

## Mỗi màn

---

### S1 — Trang Hôm Nay (`/today`)

**Mục đích:** Tổng quan buổi sáng — việc đang làm, deadline cận, lịch hôm nay. AC-09-1 → AC-09-5.

#### Layout (mobile-first, 390px)
```
┌─────────────────────────────────┐
│ [Header]  Hôm nay, 21/06        │  ← Be Vietnam Pro Bold 18px, var(--brand)
│           Chủ Nhật              │    Geist Mono 14px ngày/thứ
├─────────────────────────────────┤
│ [Section] ĐANG LÀM              │  ← Inter SemiBold 12px, uppercase, var(--text-muted)
│  TaskCard (doing)               │
│  TaskCard (doing) ...           │
│  — hoặc SuggestionCard nếu rỗng │
├─────────────────────────────────┤
│ [Section] DEADLINE HÔM NAY      │
│  DeadlineBanner (T-0, amber)    │
│  DeadlineBanner (quá hạn, đỏ)  │
├─────────────────────────────────┤
│ [Section] VIỆC ƯU TIÊN TIẾP    │
│  TaskCard (priority cao)        │
│  TaskCard ...                   │
├─────────────────────────────────┤
│ [Section] LỊCH HÔM NAY          │
│  TimelineBlock (các khối giờ)   │
│  EscalationBadge trên block     │
│  [Mở lịch đầy đủ →]            │  ← link sang S7
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
│                          [FAB +]│  ← fixed bottom-right, ≥44×44px
```

#### Component dùng
- **REUSE:** `PageHeader`, `SectionHeader`, `BottomNav`, `FAB` (Floating Action Button)
- **MỚI:** `TaskCard`, `DeadlineBanner`, `SuggestionCard`, `TimelineBlock`, `EscalationBadge`

#### Token màu
- Header accent: `var(--brand)` (cobalt)
- Section label: `var(--text-muted)`
- Deadline T-0: `var(--accent)` (amber) — escalation_level=2
- Deadline quá hạn: `var(--error)` (đỏ) — escalation_level=3
- Khối cố định trên timeline: `var(--module-work)` (cobalt, is_fixed=true)
- FAB: `var(--brand)`, icon lucide `Plus` 24px stroke-2

#### States

**Loading skeleton:**
```
Hiển thị 3 SkeletonCard xếp dọc mỗi section trong khi fetch.
Geist Mono 14px: "Đang tải..." dưới header.
Skeleton dùng var(--surface-raised) animation pulse.
```

**Empty (Today rỗng hoàn toàn):**
```
Icon lucide "Sunrise" 48px, var(--text-muted)
Tiêu đề: "Hôm nay trống — nghỉ ngơi hoặc thêm việc mới"
Sub: "Bấm + để bắt đầu"
CTA: nút "Thêm việc" var(--brand)
```

**Error (fetch thất bại):**
```
Icon lucide "AlertCircle" 32px, var(--error)
Text: "Không tải được dữ liệu — thử lại"
Nút "Thử lại" ghost border var(--brand)
```

**Offline banner (khi Turso sync bật nhưng mất mạng):**
```
Banner nhỏ dưới header: "Đang offline — hiển thị dữ liệu cục bộ"
var(--text-muted), icon lucide "WifiOff" 16px
```

#### Tương tác
- Tap `TaskCard (doing)` → S3 Chi tiết Task
- Tap `FAB +` → mở M1 Modal Thêm Việc Nhanh
- Tap `DeadlineBanner` → S4 Deadlines
- Tap `TimelineBlock` của task có gắn task_id → S3 Chi tiết Task
- Tap `SuggestionCard` → S3 Chi tiết Task (chuyển sang doing)
- Tap "Mở lịch đầy đủ →" → S7 Lịch Time-block
- Swipe-down để refresh (pull-to-refresh)
- Màn hình ≤2 cuộn hết thông tin quan trọng (AC-09-4)

#### Copy tiếng Việt (microcopy)
- Section label đang làm: "ĐANG LÀM"
- Section label deadline: "DEADLINE HÔM NAY"
- Section label ưu tiên: "VIỆC ƯU TIÊN TIẾP"
- Section label lịch: "LỊCH HÔM NAY"
- Link sang S7: "Mở lịch đầy đủ →"
- Empty today: "Hôm nay trống — nghỉ ngơi hoặc thêm việc mới"
- Suggestion khi không có doing: "Bắt tiếp theo: [tên task]"
- Offline: "Đang offline — hiển thị dữ liệu cục bộ"
- DeadlineBanner T-0: "Hôm nay · [tên task]"
- DeadlineBanner quá hạn: "Quá hạn · [tên task]"

#### Đối chiếu AC
- AC-09-1: 4 section đủ (doing / ưu tiên / deadline 24h / lịch)
- AC-09-2: SuggestionCard khi doing rỗng
- AC-09-3: skeleton + lazy load đảm bảo <2s
- AC-09-4: layout ≤2 scroll trên 390px
- AC-09-5: empty state tiếng Việt, không màn trắng
- AC-08-3: EscalationBadge hiện trên TimelineBlock
- AC-07-2: DeadlineBanner hiện khi có mốc cảnh báo

---

### S2 — Inbox (`/inbox`)

**Mục đích:** Xem, tìm kiếm, lọc, phân loại toàn bộ việc. AC-01-*, AC-02-*, AC-03-3, AC-03-4.

#### Layout
```
┌─────────────────────────────────┐
│ [PageHeader]  Inbox             │  ← Be Vietnam Pro Bold 18px
│               [icon Filter] [icon Sort] │  ← lucide 20px, ≥44px tap
├─────────────────────────────────┤
│ [SearchBar]  🔍 Tìm việc...     │  ← Inter 16px, var(--input-bg)
├─────────────────────────────────┤
│ [SortChip row]                  │
│  [Mới nhất] [Ưu tiên] [Hạn chót]│  ← Chip component ≥44px height
├─────────────────────────────────┤
│ [WIPIndicator]  Đang làm: 2/3   │  ← hiện khi có task doing; amber nếu gần limit
├─────────────────────────────────┤
│ [TaskList]                      │
│  TaskCard (inbox/todo/doing)    │
│  TaskCard ...                   │
│  [infinite scroll / pagination] │
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
│                          [FAB +]│
```

#### Component dùng
- **REUSE:** `PageHeader`, `BottomNav`, `FAB`, `SearchBar`, `SortChip`, `TaskCard`
- **MỚI:** `WIPIndicator`, `PriorityBadge`, `StatusChip`, `InfiniteScrollList`

#### Token màu
- SearchBar focus border: `var(--brand)`
- SortChip active: `var(--brand)` fill, text white
- WIPIndicator bình thường: `var(--text-muted)`
- WIPIndicator gần limit (≥WIP limit): `var(--accent)` amber
- WIPIndicator vượt limit: `var(--error)` đỏ
- TaskCard border-left status `inbox`: `var(--brand)` cobalt 3px
- TaskCard border-left status `doing`: `var(--accent)` amber 3px
- Badge "Chưa ưu tiên": `var(--text-muted)` outline
- Badge "Quá hạn": `var(--error)` filled

#### States

**Loading skeleton:**
```
SearchBar skeleton pulse
3–5 TaskCard skeleton (title line + status pill)
```

**Empty (Inbox rỗng):**
```
Icon lucide "InboxIcon" 48px, var(--text-muted)
Text chính: "Inbox trống — thêm việc mới để bắt đầu"
Text phụ: "Mọi việc bạn capture sẽ xuất hiện ở đây"
Nút CTA: "+ Thêm việc đầu tiên" var(--brand)
```

**Empty (tìm kiếm không có kết quả):**
```
Icon lucide "SearchX" 32px, var(--text-muted)
Text: "Không tìm thấy việc nào khớp với "[từ khóa]""
Link: "Xóa bộ lọc"
```

**Error:**
```
Icon lucide "AlertCircle" 32px, var(--error)
Text: "Không tải được danh sách — thử lại"
Nút ghost "Thử lại"
```

#### Tương tác
- Tap `FAB +` → M1 Modal Thêm Việc Nhanh
- Tap `TaskCard` → S3 Chi tiết Task
- Swipe-left trên `TaskCard` → quick action (chuyển sang `doing` hoặc `done`) — thao tác nhanh mobile
- Tap chip "Ưu tiên" → sắp xếp theo `priority_score` DESC
- Search bar: tìm client-side ngay khi gõ (không debounce cần thiết vì local)
- Scroll đến cuối → tải thêm (infinite scroll, batch 20 items)
- Tap `WIPIndicator` → tooltip/popover "Giới hạn WIP hiện tại: 3"

#### Copy tiếng Việt
- Placeholder search: "Tìm việc..."
- Sort chips: "Mới nhất" / "Ưu tiên" / "Hạn chót"
- Empty inbox: "Inbox trống — thêm việc mới để bắt đầu"
- Empty search: "Không tìm thấy "[từ khóa]""
- WIP bình thường: "Đang làm: 2/3"
- WIP vượt limit: "Đang làm: 4/3 — quá giới hạn"
- Badge chưa ưu tiên: "Chưa ưu tiên"
- Badge quá hạn: "Quá hạn"
- Status inbox: "Mới"
- Status todo: "Việc cần làm"
- Status doing: "Đang làm"
- Status done: "Xong"

#### Đối chiếu AC
- AC-01-1: FAB mở M1 từ bất kỳ trang nào
- AC-01-3: task mới hiện đầu danh sách (sắp mới nhất trước)
- AC-01-6: FAB ≥44×44px
- AC-02-1: danh sách inbox+todo sắp mới nhất trước
- AC-02-2: SearchBar lọc phía client
- AC-02-4: StatusChip đổi trạng thái ngay
- AC-02-5: empty state tiếng Việt
- AC-02-6: InfiniteScrollList, không render tất cả
- AC-03-3: SortChip "Ưu tiên" sort theo priority_score
- AC-03-4: badge "Chưa ưu tiên" trên TaskCard
- AC-04-5: WIPIndicator hiện X/limit rõ

---

### S3 — Chi tiết Task (Sheet / Page)

**Mục đích:** Xem và sửa toàn bộ thông tin task. AC-02-3, AC-02-4, AC-03-1 → AC-03-5, AC-04-1, AC-08-4.

**Pattern:** Bottom Sheet trên mobile (slide-up từ dưới, phủ 90% màn hình), full page trên desktop ≥768px.

#### Layout
```
┌─────────────────────────────────┐
│ ─── [drag handle] ───           │  ← bottom sheet indicator
│ [Back/Close] Chi tiết việc  [⋮]│  ← PageHeader sheet variant
├─────────────────────────────────┤
│ [TitleInput]                    │  ← editable, Be Vietnam Pro SemiBold 18px
│  "Viết báo cáo tuần"           │
├─────────────────────────────────┤
│ [StatusRow]                     │
│  Trạng thái: [StatusChip ▼]    │  ← tap để đổi (popover)
│  Tạo lúc: 21/06 09:42          │  ← Geist Mono 13px, var(--text-muted)
├─────────────────────────────────┤
│ [PrioritySection]               │
│  Hạn chót: [DateTimePicker]    │  ← ≥44px, lucide "Calendar"
│  Công sức: [SliderOrStepper 1–5]│  ← lucide "Zap", labels 1=Rất nhẹ 5=Rất nặng
│  Tác động: [SliderOrStepper 1–5]│  ← lucide "Target", labels 1=Rất nhỏ 5=Rất lớn
│  [PriorityScoreChip]  87/100   │  ← Geist Mono Bold, tính realtime
│  — hoặc "Chưa ưu tiên" badge  │
├─────────────────────────────────┤
│ [NoteInput]                     │  ← textarea resizable
│  "Ghi chú..."                   │
├─────────────────────────────────┤
│ [EscalationRow] (nếu có)        │
│  ⚠ Còn 2 tiếng — [Snooze 1 giờ]│  ← amber, lucide "Bell"
│  — hoặc đỏ nếu quá hạn         │
├─────────────────────────────────┤
│ [ActionRow]                     │
│  [Lưu thay đổi]  [Hủy]         │  ← Lưu = var(--brand) filled, ≥44px
└─────────────────────────────────┘
```

#### Component dùng
- **REUSE:** `PageHeader`, `StatusChip`, `DateTimePicker` (nếu đã có)
- **MỚI:** `TaskDetailSheet`, `PrioritySection`, `PriorityScoreChip`, `SliderStepper`, `EscalationRow`, `NoteInput`

#### Token màu
- TitleInput focus: `var(--brand)` underline
- Lưu button: `var(--brand)` background
- Hủy button: ghost, `var(--text-muted)` border
- PriorityScoreChip: `var(--brand)` nếu có điểm; `var(--text-muted)` nếu null
- EscalationRow T-0: `var(--accent)` amber background mờ
- EscalationRow quá hạn: `var(--error)` background mờ
- Slider track fill: `var(--brand)`
- DateTimePicker selected: `var(--brand)`

#### States

**Loading (sheet đang tải dữ liệu task):**
```
TitleInput skeleton 1 dòng
StatusRow skeleton 1 chip
PrioritySection skeleton 3 dòng
```

**Error (lưu thất bại):**
```
Toast inline dưới ActionRow:
"Lưu không thành công — kiểm tra kết nối và thử lại"
icon lucide "AlertCircle" var(--error)
```

**Validation error (title rỗng):**
```
TitleInput border đỏ var(--error)
Text helper bên dưới: "Vui lòng nhập tiêu đề việc"
Nút Lưu disabled (opacity 0.4)
```

**Success (lưu thành công):**
```
Toast: "Đã lưu" icon lucide "Check" var(--success)
Sheet tự đóng sau 300ms (hoặc ở lại nếu user tiếp tục chỉnh)
```

**WIP warning (khi chuyển sang doing và vượt limit):**
```
Dialog xác nhận (xem D1 — Dialog Xác nhận WIP)
```

#### Tương tác
- Gõ tiêu đề: realtime update (không cần Lưu)
- Tap StatusChip → popover 4 lựa chọn: Mới / Việc cần làm / Đang làm / Xong
- Khi chuyển sang "Đang làm" mà vượt WIP limit → kích hoạt D1 Dialog
- Thay đổi Effort/Impact → PriorityScoreChip cập nhật realtime (AC-03-5)
- Tap DateTimePicker → native date-time picker (bottom sheet trên iOS/Android)
- Tap "Snooze 1 giờ" → EscalationRow chuyển mờ, hẹn giờ 1h hiện lại
- Swipe down (trên drag handle) → đóng sheet, hỏi "Lưu thay đổi?" nếu có unsaved change
- Tap ngoài sheet (overlay) → đóng sheet

#### Copy tiếng Việt
- Placeholder tiêu đề: "Nhập tên việc..."
- Placeholder ghi chú: "Thêm ghi chú (tùy chọn)..."
- Label hạn chót: "Hạn chót"
- Label công sức: "Công sức"
- Label tác động: "Tác động"
- Effort label: 1="Rất nhẹ" 2="Nhẹ" 3="Vừa" 4="Nặng" 5="Rất nặng"
- Impact label: 1="Rất nhỏ" 2="Nhỏ" 3="Vừa" 4="Lớn" 5="Rất lớn"
- Priority score: "Điểm ưu tiên: 87/100"
- Priority null: "Chưa ưu tiên"
- Error title: "Vui lòng nhập tiêu đề việc"
- Error save: "Lưu không thành công — kiểm tra kết nối và thử lại"
- Success: "Đã lưu"
- Escalation T-0: "⚠ Còn [X] giờ đến hạn"
- Escalation quá hạn: "Quá hạn [X] giờ"
- Snooze: "Snooze 1 giờ"
- WIP confirmation: "Bạn đang có [X] việc — đã đạt giới hạn WIP ([limit]). Vẫn thêm?"
- Unsaved: "Bạn có thay đổi chưa lưu. Lưu trước khi đóng?"

#### Đối chiếu AC
- AC-02-3: hiện đủ tiêu đề, ghi chú, deadline, priority score, trạng thái
- AC-02-4: StatusChip đổi trạng thái cập nhật ngay
- AC-03-1: 3 trường Deadline / Effort / Impact
- AC-03-2: PriorityScoreChip tính sau khi lưu
- AC-03-4: badge "Chưa ưu tiên" khi thiếu trục
- AC-03-5: score cập nhật realtime khi thay Effort/Impact
- AC-04-1: kích hoạt D1 WIP Dialog khi vượt limit
- AC-08-4: EscalationRow + Snooze 1 giờ

---

### S4 — Deadlines (`/deadlines`)

**Mục đích:** Danh sách task có deadline sắp tới và quá hạn. AC-07-2 → AC-07-6, AC-08-1, AC-08-2.

#### Layout
```
┌─────────────────────────────────┐
│ [PageHeader]  Deadlines         │
│               [icon Filter]     │
├─────────────────────────────────┤
│ [Section]  QUÁ HẠN              │  ← var(--error), icon "AlertOctagon"
│  DeadlineCard (ghim, đỏ)        │
│  DeadlineCard ...               │
├─────────────────────────────────┤
│ [Section]  HÔM NAY              │  ← var(--accent) amber
│  DeadlineCard (amber)           │
├─────────────────────────────────┤
│ [Section]  7 NGÀY TỚI           │  ← var(--text-muted)
│  DeadlineCard + CountdownChip  │
│  DeadlineCard ...               │
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
```

#### Component dùng
- **REUSE:** `PageHeader`, `SectionHeader`, `BottomNav`, `TaskCard` (variant deadline)
- **MỚI:** `DeadlineCard`, `CountdownChip`

#### Token màu
- Section quá hạn: `var(--error)` label + icon
- Section hôm nay: `var(--accent)` amber label
- Section 7 ngày tới: `var(--text-muted)` label
- DeadlineCard quá hạn border-left: `var(--error)` 3px
- DeadlineCard T-0: `var(--accent)` border-left 3px
- DeadlineCard T-1/T-3/T-7: `var(--brand)` border-left 1px
- CountdownChip "Còn X ngày": `var(--brand)` outline
- CountdownChip "Hôm nay": `var(--accent)` filled
- CountdownChip "Quá hạn": `var(--error)` filled

#### States

**Loading:** 3 skeleton card mỗi section

**Empty (không có deadline nào):**
```
Icon lucide "CheckCircle2" 48px, var(--success)
Text: "Không có deadline nào — tất cả ổn!"
Sub: "Deadline sẽ hiện ở đây khi bạn thêm hạn chót cho việc"
```

**Error:**
```
"Không tải được deadlines — thử lại"
Nút ghost "Thử lại"
```

#### Tương tác
- Tap `DeadlineCard` → S3 Chi tiết Task
- Quá hạn task tự ghim đầu danh sách section "Quá hạn"
- Task done → biến khỏi danh sách ngay (optimistic update)

#### Copy tiếng Việt
- Header: "Deadlines"
- Section label quá hạn: "QUÁ HẠN"
- Section label hôm nay: "HÔM NAY"
- Section label 7 ngày tới: "7 NGÀY TỚI"
- Countdown chip: "Còn 3 ngày" / "Còn 1 ngày" / "Hôm nay" / "Quá hạn 2 ngày"
- Empty: "Không có deadline nào — tất cả ổn!"
- Task done hiện in từ Deadlines: "Đã hoàn thành"

#### Đối chiếu AC
- AC-07-2: banner/badge cảnh báo đến mốc
- AC-07-3: badge đỏ + ghim đầu khi quá hạn
- AC-07-4: hiển thị task 7 ngày tới + quá hạn
- AC-07-5: task done biến khỏi list
- AC-07-6: deadline sửa → re-render CountdownChip
- AC-08-1: escalation_level=2 → DeadlineCard màu amber
- AC-08-2: escalation_level=3 → DeadlineCard màu đỏ, ghim

---

### S5 — Focus Mode

**Mục đích:** Tối giản, hiện 1 task duy nhất, loại bỏ mọi phân tâm. AC-04-2, AC-04-3.

**Pattern:** Full-screen overlay, ẩn BottomNav, ẩn FAB, không có sidebar.

#### Layout
```
┌─────────────────────────────────┐
│ [X Thoát]             Focus     │  ← icon lucide "X" left ≥44px, "Focus" centered
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  [TaskFocusCard]          │  │  ← card trung tâm
│  │                           │  │
│  │  "Viết báo cáo tuần"      │  │  ← Be Vietnam Pro Bold 22px
│  │                           │  │
│  │  Điểm ưu tiên: 87/100     │  │  ← Geist Mono 14px, var(--brand)
│  │  Hạn chót: 22/06 23:59   │  │  ← Inter 14px
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [Đánh dấu Xong]               │  ← primary button, var(--brand), ≥48px
│  [Bỏ qua → việc tiếp]          │  ← ghost button
│                                 │
└─────────────────────────────────┘
```

#### Component dùng
- **REUSE:** `PriorityScoreChip`
- **MỚI:** `FocusOverlay`, `TaskFocusCard`, `FocusActionBar`

#### Token màu
- Background: `var(--bg-page)` (không gradient, không tối đặc biệt — tuân no-gradient)
- TaskFocusCard border: `var(--brand)` 2px
- Đánh dấu Xong: `var(--brand)` filled
- Bỏ qua: ghost `var(--text-muted)` border

#### States

**Loading (lấy task tiếp theo):**
```
TaskFocusCard skeleton pulse
Text: "Đang tìm việc tiếp theo..."
```

**Empty (tất cả task done hoặc không có doing):**
```
Icon lucide "PartyPopper" 64px, var(--accent) amber
Text chính: "Không còn việc cần làm — nghỉ ngơi xứng đáng!"
Text phụ: "Bạn đã xử lý hết. Hẹn gặp lại sáng mai."
Nút "Về Trang Hôm Nay" var(--brand)
```

**Transition (sau khi done, tải task tiếp):**
```
Card slide-out lên trên, card mới slide-in từ dưới
Duration: 300ms (CSS transition, không JS animation nặng)
```

#### Tương tác
- Tap "Đánh dấu Xong" → task status → done, tải task tiếp theo tự động (AC-04-3)
- Tap "Bỏ qua → việc tiếp" → skip, tải task tiếp theo theo priority
- Tap "[X] Thoát" → thoát Focus mode, về màn hình trước (S1 hoặc S2)
- Swipe-right → thoát Focus mode (mobile gesture)

#### Copy tiếng Việt
- Header: "Focus"
- CTA done: "Đánh dấu Xong"
- CTA skip: "Bỏ qua → việc tiếp"
- Empty: "Không còn việc cần làm — nghỉ ngơi xứng đáng!"
- Empty sub: "Bạn đã xử lý hết. Hẹn gặp lại sáng mai."
- CTA về: "Về Trang Hôm Nay"
- Loading: "Đang tìm việc tiếp theo..."

#### Đối chiếu AC
- AC-04-2: 1 task, tối giản, không sidebar, không list
- AC-04-3: done → tự chuyển task tiếp theo theo ưu tiên

---

### S6 — Cài đặt (`/settings`)

S6 gom 2 sub-page: **S6a — Lịch cố định** (`/settings/schedule`) và **S6b — Giới hạn WIP** (`/settings/wip`).

---

#### S6a — Lịch cố định (`/settings/schedule`)

**Mục đích:** Quản lý khối lịch cố định (làm/dạy/học). AC-06-1 → AC-06-6.

##### Layout
```
┌─────────────────────────────────┐
│ [← Back]  Lịch cố định         │
├─────────────────────────────────┤
│ [PresetBanner] (lần đầu vào)   │
│ "Gợi ý 3 khối cố định phổ biến"│
│ [Áp dụng preset] [Bỏ qua]      │
├─────────────────────────────────┤
│ [FixedBlockList]                │
│  FixedBlockCard "Làm việc"      │
│   T2–T6 · 08:30 – 18:00        │
│   [icon Edit] [icon Trash]      │
│  FixedBlockCard "Dạy"           │
│   ...                           │
├─────────────────────────────────┤
│  [+ Thêm khối cố định]         │  ← text button var(--brand), ≥44px
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
```

**Form thêm/sửa khối** (Bottom Sheet):
```
┌─────────────────────────────────┐
│ Thêm khối cố định               │
│ (hoặc "Sửa khối cố định")       │
├─────────────────────────────────┤
│ Tên khối: [TextInput]           │
│ Giờ bắt đầu: [TimePicker]      │
│ Giờ kết thúc: [TimePicker]      │
│ [Lỗi: "Giờ kết thúc phải sau giờ bắt đầu"] (nếu có) │
│ Ngày lặp lại: [WeekdaySelector] │
│   T2 T3 T4 T5 T6 T7 CN         │
├─────────────────────────────────┤
│ [Lưu khối]    [Hủy]            │
└─────────────────────────────────┘
```

##### Component dùng
- **REUSE:** `PageHeader` (back variant), `BottomNav`
- **MỚI:** `FixedBlockCard`, `FixedBlockForm`, `WeekdaySelector`, `PresetBanner`, `TimePicker`

##### Token màu
- FixedBlockCard border-left: `var(--module-work)` cobalt 3px (kind=work/fixed)
- Lưu khối: `var(--brand)` filled
- Hủy: ghost
- PresetBanner background: `var(--surface-raised)`
- "Áp dụng preset": `var(--brand)` outline
- WeekdaySelector selected: `var(--brand)` filled chip
- Error time: `var(--error)` text + input border
- Edit icon: `var(--text-muted)`, lucide "Pencil" 20px
- Trash icon: `var(--error)`, lucide "Trash2" 20px

##### States

**Loading:** skeleton 2–3 FixedBlockCard

**Empty (chưa có khối nào, đã qua preset):**
```
Icon lucide "CalendarX2" 48px, var(--text-muted)
Text: "Chưa có khối cố định nào"
Sub: "Thêm các khung giờ bạn không thể thay đổi (làm việc, dạy, học...)"
Nút "Thêm khối đầu tiên" var(--brand)
```

**Lần đầu vào (PresetBanner active):**
```
Banner vàng nhạt (var(--surface-raised)) ở đầu:
"Gợi ý 3 khối cố định phổ biến: Làm việc T2–T6 08:30–18:00 · Dạy · Học cuối tuần"
2 nút: "Áp dụng preset" (outline cobalt) và "Bỏ qua" (ghost)
```

**Error (lưu thất bại):**
```
Toast: "Lưu không thành công — thử lại"
```

**Validation error (giờ sai):**
```
Dưới TimePicker kết thúc: "Giờ kết thúc phải sau giờ bắt đầu"
Màu var(--error), icon lucide "AlertCircle" 16px
Nút Lưu disabled
```

**Xóa khối (confirm dialog):**
```
Dialog: "Xóa khối [tên]?"
Sub: "Khung giờ này sẽ không còn hiển thị trên lịch."
Nút Xóa: var(--error) filled | Nút Hủy: ghost
```

##### Tương tác
- Tap "Thêm khối cố định" → mở FixedBlockForm (bottom sheet)
- Tap icon Edit trên FixedBlockCard → mở FixedBlockForm với dữ liệu cũ
- Tap icon Trash → Dialog xác nhận xóa
- Lưu khối → đóng form, cập nhật list ngay, lịch S1 cập nhật realtime (AC-06-4)
- WeekdaySelector: tap từng ngày để toggle (multi-select)
- TimePicker: native time picker trên mobile

##### Copy tiếng Việt
- Header: "Lịch cố định"
- PresetBanner: "Gợi ý 3 khối cố định phổ biến"
- Nút preset: "Áp dụng gợi ý" / "Bỏ qua"
- Form header thêm: "Thêm khối cố định"
- Form header sửa: "Sửa khối cố định"
- Label tên: "Tên khối"
- Placeholder tên: "Ví dụ: Làm việc, Dạy, Học cao học..."
- Label giờ bắt đầu: "Giờ bắt đầu"
- Label giờ kết thúc: "Giờ kết thúc"
- Label ngày: "Ngày lặp lại hằng tuần"
- Lỗi giờ: "Giờ kết thúc phải sau giờ bắt đầu"
- Thứ ngắn: "T2 T3 T4 T5 T6 T7 CN"
- Empty: "Chưa có khối cố định nào"
- Confirm delete: "Xóa khối [tên]?"
- Delete sub: "Khung giờ này sẽ không còn hiển thị trên lịch."
- Nút xóa: "Xóa"

##### Đối chiếu AC
- AC-06-1: FixedBlockList hiện danh sách khối
- AC-06-2: FixedBlockForm lưu label/giờ/ngày → bảng fixed_schedule rrule
- AC-06-3: khối lưu hiện trên lịch S1 đúng ngày
- AC-06-4: sửa/xóa cập nhật ngay không reload
- AC-06-5: validation giờ, lỗi tiếng Việt, không lưu
- AC-06-6: PresetBanner lần đầu vào

---

#### S6b — Giới hạn WIP (`/settings/wip`) — GAP-02

**Mục đích:** Cho phép user tự chỉnh WIP-limit (số việc "Đang làm" tối đa). AC-04-4, P1.

**Pattern:** Sub-page đơn giản (không bottom sheet), vào từ trang Settings tổng.

##### Layout
```
┌─────────────────────────────────┐
│ [← Cài đặt]  Giới hạn WIP      │  ← PageHeader back variant
├─────────────────────────────────┤
│ [ExplainCard]                   │
│  icon lucide "Info" 20px        │
│  "Giới hạn số việc đang làm     │
│   để tránh nhảy việc và mất    │
│   tập trung. Mặc định: 3."     │  ← Inter 14px, var(--text-muted)
├─────────────────────────────────┤
│ [WipLimitForm]                  │
│  Số việc tối đa:                │  ← label Inter SemiBold 14px
│  ┌─────────────────────────┐    │
│  │  [–]   3   [+]          │    │  ← Stepper: nút –/+ ≥44px, giá trị Geist Mono 24px
│  └─────────────────────────┘    │
│  (hoặc NumberInput min=1 max=10)│
│  "Từ 1 đến 10 việc"             │  ← helper text var(--text-muted)
│  [ErrorMsg nếu ngoài dải]       │  ← "Giá trị phải từ 1 đến 10"
├─────────────────────────────────┤
│  [Lưu giới hạn]                 │  ← var(--brand) filled, ≥44px, full-width mobile
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
```

##### Component dùng
- **REUSE:** `PageHeader` (back variant), `BottomNav`
- **MỚI:** `WipLimitStepper`, `ExplainCard`

##### Token màu
- Stepper nút –/+: `var(--brand)` border + icon, background trắng
- Stepper giá trị: Geist Mono 24px Bold, `var(--text-primary)`
- ExplainCard background: `var(--surface-raised)`
- Lưu: `var(--brand)` filled
- Error: `var(--error)` text
- Helper text: `var(--text-muted)`

##### States

**Loading (đang đọc giá trị hiện tại từ user_settings):**
```
Stepper skeleton: ô giá trị pulse
```

**Default (giá trị hiện tại):**
```
Stepper hiển thị giá trị đang lưu trong user_settings["wip_limit"]
Nếu chưa có → mặc định 3
```

**Validation error (ngoài dải 1–10):**
```
Text đỏ dưới stepper: "Giá trị phải từ 1 đến 10"
Nút Lưu disabled
```

**Success (lưu thành công):**
```
Toast: "Đã lưu giới hạn WIP: [X] việc"
icon lucide "Check", var(--success)
```

**Error (lưu thất bại):**
```
Toast: "Lưu thất bại — thử lại"
icon lucide "AlertCircle", var(--error)
```

##### Tương tác
- Tap [–]: giảm 1, min=1 (nút disabled khi đang ở 1)
- Tap [+]: tăng 1, max=10 (nút disabled khi đang ở 10)
- Nhập trực tiếp số (nếu dùng NumberInput): validate on-blur, nếu ngoài dải thì reset về giá trị cũ
- Tap "Lưu giới hạn" → gọi T07 `setSetting("wip_limit", value)`, hiện toast thành công
- Giá trị lưu áp dụng ngay ở phiên tiếp theo (AC-04-4); WIPIndicator ở S2 cũng reflect ngay

##### Copy tiếng Việt
- Header: "Giới hạn WIP"
- ExplainCard: "Giới hạn số việc đang làm để tránh nhảy việc và mất tập trung. Mặc định: 3."
- Label: "Số việc tối đa đang làm cùng lúc"
- Helper: "Từ 1 đến 10 việc"
- Error: "Giá trị phải từ 1 đến 10"
- Nút lưu: "Lưu giới hạn"
- Toast thành công: "Đã lưu giới hạn WIP: [X] việc"
- Toast lỗi: "Lưu thất bại — thử lại"

##### Đối chiếu AC
- AC-04-4: WIP-limit lưu qua T07 `setSetting`, áp dụng từ phiên kế

---

### S7 — Lịch Time-block (`/calendar`) — GAP-01, P0

**Mục đích:** Xem lịch ngày/tuần đầy đủ; tạo, sửa, xóa time-block; gán task vào block; cảnh báo trùng khối cố định. AC-05-1 → AC-05-6.

**Pattern:** Calendar view chiếm phần lớn màn hình. Hai chế độ: **Ngày** (mặc định mobile) và **Tuần** (mặc định desktop ≥768px). Múi giờ Asia/Ho_Chi_Minh — bắt buộc.

#### Layout tổng thể (mobile, chế độ Ngày)
```
┌─────────────────────────────────┐
│ [← Hôm nay]  T6, 20/06    [≡]  │  ← PageHeader; icon "AlignJustify" mở ChronoFilter
│  [◀ Ngày trước] [Ngày/Tuần ▼] [Ngày tiếp ▶] │  ← toolbar chuyển ngày/chế độ ≥44px
├─────────────────────────────────┤
│ [HourRuler] 00                  │  ← Geist Mono 11px, var(--text-muted)
│             01                  │
│  ...                            │
│  08  [FixedBlock "Làm việc"  ]  │  ← cobalt, is_fixed=true, không kéo
│  09  [FixedBlock            ]   │
│  ...                            │
│  18  [TimeBlock "Viết BC"   ]   │  ← màu theo trụ task, kéo/resize được
│  19  [slot trống             ]  │  ← tap để tạo block (mobile)
│  20  [TimeBlock "Học Python" ]  │
│  ...                            │
│  23                             │
├─────────────────────────────────┤
│ [BottomNav]                     │
└─────────────────────────────────┘
│                          [FAB +]│  ← mở BlockCreateSheet (mobile)
```

#### Layout desktop (≥768px, chế độ Tuần)
```
┌────────────────────────────────────────────────────┐
│ [← Hôm nay]  Tuần 25 · 16–22/06            [Ngày/Tuần ▼] │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────┤
│ T2   │ T3   │ T4   │ T5   │ T6   │ T7   │ CN       │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│ 08   │      │      │      │      │      │          │
│ [Fix]│ [Fix]│ [Fix]│ [Fix]│ [Fix]│      │          │
│ ...  │ ...  │ ...  │ ...  │ ...  │      │          │
│      │      │      │ [TB] │      │      │          │
│ 18   │      │      │      │      │      │          │
└──────┴──────┴──────┴──────┴──────┴──────┴──────────┘
```
Kéo-thả chuột trên desktop: kéo từ ô trống để vẽ block mới; kéo block đã có để di chuyển; kéo cạnh dưới block để thay đổi thời lượng.

#### Component dùng
- **REUSE:** `PageHeader`, `BottomNav`, `FAB`, `ConflictWarningModal` (T20)
- **MỚI:** `CalendarDayView` (T19 — tái dùng từ S1 nhưng interactive), `CalendarWeekView`, `HourRuler`, `TimeBlockChip`, `FixedBlockChip`, `BlockCreateSheet`, `BlockEditSheet`, `TaskPickerSheet`

#### Token màu
- `FixedBlockChip` (is_fixed=true): `var(--module-work)` cobalt, chữ trắng, cursor not-allowed
- `TimeBlockChip` task trụ work: `var(--module-work)` cobalt mờ (opacity 0.85)
- `TimeBlockChip` task trụ teach: `var(--module-teach)` teal mờ
- `TimeBlockChip` task trụ study: `var(--module-study)` violet mờ
- `TimeBlockChip` task trụ growth: `var(--module-growth)` amber mờ
- `TimeBlockChip` không gắn task: `var(--surface-raised)` border `var(--brand)` dashed
- Slot trống (hover/tap target): `var(--brand)` background 8% opacity khi hover/active
- HourRuler text: `var(--text-muted)`, Geist Mono 11px
- Đường kẻ ngang phân giờ: `var(--surface-raised)` 1px
- Thanh "giờ hiện tại": `var(--error)` 2px horizontal line + dot đầu
- FAB: `var(--brand)`, icon lucide "Plus" 24px

#### States

**Loading (tải lịch ngày/tuần):**
```
HourRuler hiện đủ 00–23
FixedBlockChip skeleton pulse ở các khung giờ cố định (đã biết từ settings)
2–3 TimeBlockChip skeleton pulse
Text nhỏ cuối màn: "Đang tải lịch..."  Geist Mono 12px var(--text-muted)
```

**Empty (không có time-block nào, khối cố định vẫn hiện):**
```
Ở giờ 19:00–20:00 (ngoài giờ cố định), hiện gợi ý nhạt:
Icon lucide "PlusCircle" 20px var(--brand) opacity 0.5
Text: "Chạm để thêm khoảng tập trung"   Inter 13px var(--text-muted)
(chỉ hiện khi không có block nào trong slot đó, không floating element riêng)
```

**Conflict (khi tạo/kéo block đè khối cố định hoặc block khác):**
```
Dùng ConflictWarningModal (T20):
  Icon lucide "AlertTriangle" amber
  Title: "Trùng khung giờ cố định"
  Body: "Khung giờ [giờ bắt đầu]–[giờ kết thúc] trùng với "[tên khối cố định]".
         Bạn có chắc muốn tiếp tục không?"
  — hoặc nếu trùng block khác:
  Body: "Khung giờ này đã có "[tên block hiện có]". Đặt chồng lên?"
  Nút "Vẫn tạo" (var(--accent) amber filled) | "Hủy" (ghost)
```

**Error (lưu thất bại):**
```
Toast: "Không lưu được block — thử lại"
icon lucide "AlertCircle" var(--error)
Block mới tạo biến mất (rollback optimistic); block đang sửa về vị trí cũ.
```

**Success (tạo/sửa block thành công):**
```
Toast: "Đã lưu block lịch"
icon lucide "Check" var(--success)  duration 1.5s
```

#### Tương tác — Desktop (kéo-thả chuột)

- **Tạo block mới:** giữ chuột trái trên slot trống, kéo xuống để chọn thời lượng → thả → mở `BlockCreateSheet` với giờ đã chọn
- **Di chuyển block:** kéo `TimeBlockChip` sang ô giờ khác; khi thả → kiểm tra conflict → nếu có: mở ConflictWarningModal; nếu không: lưu ngay (optimistic)
- **Thay đổi thời lượng:** kéo cạnh dưới `TimeBlockChip` lên/xuống (resize handle ≥8px tap area)
- **Xem/Sửa block:** click `TimeBlockChip` → mở `BlockEditSheet`
- **Khối cố định:** cursor `not-allowed`, không kéo được, click → tooltip "Khối cố định — không thể sửa"
- **Chuyển ngày:** click [◀] [▶] hoặc click ngày trên header Tuần; hoặc click "Hôm nay" để về hôm nay

#### Tương tác — Mobile (chạm-để-đặt + bottom-sheet)

> Kéo-thả ngón tay trên lịch giờ nhỏ rất dễ nhầm → mobile dùng luồng riêng: chạm để đặt, chọn giờ qua bottom-sheet.

- **Tạo block mới (mobile):**
  1. Tap FAB `+` hoặc tap nhẹ vào slot trống trên HourRuler → mở `BlockCreateSheet` (bottom sheet)
  2. `BlockCreateSheet` có: TimePicker giờ bắt đầu, TimePicker giờ kết thúc (native time picker), TaskPickerSheet (gắn task tùy chọn), Nút "Lưu block"
  3. Tap "Lưu block" → kiểm tra conflict → nếu có: ConflictWarningModal; nếu không: lưu, đóng sheet, block hiện trên lịch
- **Sửa block (mobile):**
  1. Tap `TimeBlockChip` → mở `BlockEditSheet` (bottom sheet)
  2. `BlockEditSheet` cho phép: đổi giờ bắt đầu/kết thúc (TimePicker), đổi task gắn, xóa block
  3. Tap "Lưu thay đổi" → conflict check → lưu hoặc mở ConflictWarningModal
- **Xóa block (mobile):** trong `BlockEditSheet`, nút "Xóa block" màu `var(--error)` → confirm dialog nhỏ "Xóa block này?" → xóa optimistic
- **Swipe sang trái/phải trên HourRuler area:** chuyển sang ngày trước/tiếp theo (giống calendar native)
- **Long-press trên TimeBlockChip (mobile):** mở context menu nhỏ: "Sửa" / "Xóa" (thay thế kéo desktop)
- **Khối cố định (mobile):** tap → bottom-sheet read-only "Khối cố định: [tên] · [giờ] · không thể sửa"

#### BlockCreateSheet — chi tiết (bottom sheet, mobile-first)
```
┌─────────────────────────────────┐
│ ─── [drag handle] ───           │
│  Thêm khoảng tập trung          │  ← Be Vietnam Pro SemiBold 16px
├─────────────────────────────────┤
│  Bắt đầu:   [TimePicker ▼]     │  ← native time picker, ≥44px
│  Kết thúc:  [TimePicker ▼]     │
│  [Lỗi nếu end ≤ start]         │  ← "Giờ kết thúc phải sau giờ bắt đầu"
├─────────────────────────────────┤
│  Gắn việc (tùy chọn):          │
│  [TaskPickerRow]                │  ← tap → mở TaskPickerSheet
│   "Chưa gắn việc"              │  ← placeholder var(--text-muted)
│   — hoặc [TaskCard mini]       │  ← khi đã chọn task
├─────────────────────────────────┤
│  [Lưu block]    [Hủy]          │  ← Lưu = var(--brand) filled ≥44px
└─────────────────────────────────┘
```

#### BlockEditSheet — chi tiết (bottom sheet, mobile-first)
```
┌─────────────────────────────────┐
│ ─── [drag handle] ───           │
│  Sửa khoảng tập trung           │  ← Be Vietnam Pro SemiBold 16px
├─────────────────────────────────┤
│  Bắt đầu:   [TimePicker ▼]     │
│  Kết thúc:  [TimePicker ▼]     │
│  [Lỗi nếu end ≤ start]         │
├─────────────────────────────────┤
│  Việc đang gắn:                 │
│  [TaskPickerRow / TaskCard mini]│
├─────────────────────────────────┤
│  [Lưu thay đổi]                 │  ← var(--brand) filled
│  [Xóa block]                    │  ← var(--error) ghost, lucide "Trash2"
└─────────────────────────────────┘
```

#### TaskPickerSheet — chi tiết (bottom sheet thứ 2, slide lên từ BlockCreateSheet/EditSheet)
```
┌─────────────────────────────────┐
│  Chọn việc để gắn               │  ← Be Vietnam Pro SemiBold 16px
│  [SearchBar "Tìm việc..."]     │
├─────────────────────────────────┤
│  [TaskRow] "Viết báo cáo tuần" │  ← swipe-to-select, tap để chọn
│  [TaskRow] "Học Python chương 3"│
│  ...                            │
│  [TaskRow] "Không gắn việc nào" │  ← option xóa liên kết
├─────────────────────────────────┤
│  [Xác nhận]    [Hủy]           │
└─────────────────────────────────┘
```

#### Copy tiếng Việt
- Header: "Lịch" (BottomNav label)
- Toolbar: "Hôm nay" / "Ngày" / "Tuần"
- Tooltip khối cố định: "Khối cố định — không thể sửa"
- Gợi ý slot trống: "Chạm để thêm khoảng tập trung"
- BlockCreateSheet header: "Thêm khoảng tập trung"
- BlockEditSheet header: "Sửa khoảng tập trung"
- Label giờ bắt đầu: "Bắt đầu"
- Label giờ kết thúc: "Kết thúc"
- Error giờ: "Giờ kết thúc phải sau giờ bắt đầu"
- Label task: "Gắn việc (tùy chọn)"
- Placeholder task: "Chưa gắn việc"
- TaskPickerSheet header: "Chọn việc để gắn"
- Placeholder search task: "Tìm việc..."
- Option bỏ gắn: "Không gắn việc nào"
- Nút lưu tạo: "Lưu block"
- Nút lưu sửa: "Lưu thay đổi"
- Nút xóa: "Xóa block"
- Confirm xóa: "Xóa block này?"
- Toast lưu thành công: "Đã lưu block lịch"
- Toast lỗi: "Không lưu được block — thử lại"
- Loading: "Đang tải lịch..."
- ConflictWarningModal title (trùng cố định): "Trùng khung giờ cố định"
- ConflictWarningModal body (trùng cố định): "Khung giờ [HH:mm]–[HH:mm] trùng với "[tên khối cố định]". Bạn có chắc muốn tiếp tục không?"
- ConflictWarningModal title (trùng block): "Trùng block đã có"
- ConflictWarningModal body (trùng block): "Khung giờ này đã có "[tên block]". Đặt chồng lên?"
- ConflictWarningModal CTA continue: "Vẫn tạo"
- ConflictWarningModal CTA cancel: "Hủy"
- Bottom-sheet khối cố định (mobile read-only): "Khối cố định: [tên] · [giờ bắt đầu]–[giờ kết thúc]"

#### Accessibility (S7)
- `FixedBlockChip`: `role="img"` + `aria-label="Khối cố định: [tên], [giờ]"` — không interactive
- `TimeBlockChip`: `role="button"` + `aria-label="Block: [giờ bắt đầu]–[giờ kết thúc], [tên task nếu có]"`, ≥44×44px tap
- Resize handle desktop: `role="slider"` + `aria-label="Kéo để đổi giờ kết thúc"`
- Các nút toolbar (◀ ▶): `aria-label="Ngày trước" / "Ngày tiếp theo"`, ≥44px
- Focus ring: outline `var(--brand)` 2px trên mọi interactive element
- Keyboard desktop: Enter/Space mở BlockEditSheet; Delete xóa block sau confirm; Arrow keys di chuyển focus qua các chip
- Màu block không là indicator duy nhất: label tên luôn hiển thị trong chip (kể cả khi chip nhỏ — truncate với ellipsis)

#### Đối chiếu AC
- AC-05-1: CalendarDayView/WeekView hiện khối cố định + time-block đúng ngày
- AC-05-2: ConflictWarningModal (T20) khi tạo/kéo block trùng khối cố định
- AC-05-3: BlockCreateSheet → lưu qua T06 → bảng time_block (start_at, end_at, task_id, kind, is_fixed=false)
- AC-05-4: BlockEditSheet → kiểm tra conflict trước khi lưu
- AC-05-5: FixedBlockChip cobalt, not-allowed cursor, không kéo/xóa được
- AC-05-6: Toàn bộ giờ render theo Asia/Ho_Chi_Minh; HourRuler label là giờ địa phương

---

### M1 — Modal Thêm Việc Nhanh (Overlay toàn app)

**Mục đích:** Capture nhanh không rời trang. AC-01-1 → AC-01-6.

**Pattern:** Bottom Sheet ưu tiên trên mobile — slide-up từ dưới lên. Trên desktop: modal center.

#### Layout
```
┌─────────────────────────────────┐
│ ─── [drag handle] ───           │
│  Thêm việc mới                  │  ← Be Vietnam Pro SemiBold 16px
├─────────────────────────────────┤
│  [TitleInput] (autofocus)       │  ← placeholder "Đặt tên việc..."
│  [CharCount]  0/500             │  ← Geist Mono 12px, var(--text-muted)
│  [ErrorMsg] (nếu validate fail) │  ← "Vui lòng nhập tiêu đề"
├─────────────────────────────────┤
│  [QuickOptionsRow]              │
│   [icon Calendar] Thêm hạn chót │  ← optional expand
│   (collapsed mặc định)         │
├─────────────────────────────────┤
│  [Lưu]          [Hủy]          │
└─────────────────────────────────┘
```

#### Component dùng
- **REUSE:** `TaskDetailSheet` (stripped-down), `TitleInput`
- **MỚI:** `QuickCaptureSheet`, `CharCount`

#### Token màu
- TitleInput focus ring: `var(--brand)` 2px
- CharCount: `var(--text-muted)`; khi >450: `var(--accent)` amber; khi 500: `var(--error)`
- Lưu: `var(--brand)` filled, ≥44×44px
- Hủy: ghost ≥44×44px

#### States

**Default (mở ra):**
```
TitleInput autofocus, con trỏ nhấp nháy
Bàn phím mobile tự xuất hiện
Sheet đẩy lên trên bàn phím (không bị che — viewport resize behavior)
```

**Validation error (title rỗng hoặc chỉ spaces):**
```
TitleInput border đỏ var(--error)
Text dưới input: "Vui lòng nhập tiêu đề việc"
Nút Lưu disabled hoặc shake animation nhẹ
```

**Loading (đang lưu):**
```
Nút Lưu: spinner icon lucide "Loader2" xoay, disabled
Text: "Đang lưu..."
```

**Success:**
```
Sheet đóng
Task xuất hiện đầu danh sách hiện tại (optimistic update)
Toast nhỏ: "Đã thêm: [tên task]" duration 2s
```

**Error (lưu thất bại):**
```
Toast: "Thêm việc thất bại — thử lại"
Sheet vẫn mở, giữ nguyên nội dung đã nhập
```

#### Tương tác
- Tap FAB bất kỳ trang → mở sheet
- Autofocus TitleInput ngay khi mở
- Enter / tap "Lưu" → validate → nếu pass: lưu, đóng sheet, task hiện đầu list
- Escape / tap outside / swipe-down drag handle → đóng sheet (nếu dirty: hỏi "Bỏ việc đang nhập?")
- Debounce nút Lưu 300ms (chặn spam Enter — AC edge case)
- Trim whitespace trước validate (chặn title toàn space)
- CharCount hiện để tránh vượt 500 ký tự (edge case)

#### Copy tiếng Việt
- Header: "Thêm việc mới"
- Placeholder: "Đặt tên việc..."
- Error rỗng: "Vui lòng nhập tiêu đề việc"
- CharCount: "0/500"
- Char warning: "còn [X] ký tự"
- Loading: "Đang lưu..."
- Success toast: "Đã thêm: [tên task]"
- Error toast: "Thêm việc thất bại — thử lại"
- Confirm discard: "Bỏ việc đang nhập?"
- Quick option: "Thêm hạn chót"

#### Đối chiếu AC
- AC-01-1: mở từ bất kỳ trang, không rời trang
- AC-01-2: lưu title → status inbox, timestamp đúng
- AC-01-3: task mới đầu danh sách (optimistic)
- AC-01-4: rỗng → không lưu, hiện lỗi tiếng Việt
- AC-01-5: dữ liệu vào bảng task personal.db (handled bởi API layer)
- AC-01-6: sheet không bị bàn phím che, Lưu ≥44px

---

### D1 — Dialog Xác nhận WIP (dùng chung)

**Mục đích:** Cảnh báo khi chuyển task thêm sang "Đang làm" trong khi đã đạt WIP limit. AC-04-1, AC-04-5.

**Pattern:** Alert Dialog, overlay full-screen mờ.

#### Layout
```
┌─────────────────────────────────┐
│ [icon AlertTriangle amber]      │
│  Đã đạt giới hạn WIP            │  ← Be Vietnam Pro SemiBold 16px
│                                 │
│  Bạn đang có 3/3 việc đang làm. │  ← Inter 14px
│  Thêm việc này sẽ vượt giới hạn │
│  bạn đã đặt.                    │
│                                 │
│  [Vẫn thêm]    [Hủy]           │  ← Vẫn thêm = var(--accent), Hủy = ghost
└─────────────────────────────────┘
```

#### Copy tiếng Việt
- Title: "Đã đạt giới hạn WIP"
- Body: "Bạn đang có [X]/[limit] việc đang làm. Thêm việc này sẽ vượt giới hạn bạn đã đặt."
- CTA continue: "Vẫn thêm"
- CTA cancel: "Hủy"

#### Đối chiếu AC
- AC-04-1: cảnh báo + option override với xác nhận
- AC-04-5: hiện rõ X/limit

---

## Navigation (BottomNav — dùng chung mobile)

```
[Hôm nay] [Inbox] [Deadlines] [Lịch] [Cài đặt]
icon Today  icon Inbox icon Clock icon Calendar icon Settings
  20px       20px        20px      20px       20px
  ≥44px tap target mỗi item
```

- Active item: `var(--brand)` icon + label
- Inactive: `var(--text-muted)`
- Label: Inter 11px tiếng Việt

**Copy BottomNav:**
- "Hôm nay" (lucide "Sun")
- "Inbox" (lucide "Inbox")
- "Deadlines" (lucide "Clock")
- "Lịch" (lucide "CalendarDays")
- "Cài đặt" (lucide "Settings")

> Lưu ý: BottomNav tăng từ 4 lên 5 item do thêm S7. Trên màn hình <360px, "Cài đặt" có thể rút vào menu overflow (icon "MoreHorizontal") — cân nhắc ở giai đoạn build.

---

## Accessibility

- **Tương phản:** tất cả text dùng token, không hardcode; token đảm bảo WCAG AA (≥4.5:1 body, ≥3:1 large text).
- **Target size:** mọi interactive element ≥44×44px (FAB, buttons, chips, nav items, card rows, resize handle desktop ≥8px tap area với invisible hit-target mở rộng).
- **Focus ring:** outline `var(--brand)` 2px offset 2px trên mọi focusable element. Không ẩn focus cho keyboard users.
- **Screen reader:** aria-label tiếng Việt đầy đủ trên icon-only buttons (lucide), status chips, badge, block chips trên lịch.
- **Motion:** transition <300ms; không animation liên tục; respects `prefers-reduced-motion`.
- **Color not sole indicator:** badge trạng thái dùng cả màu lẫn text label; block trên lịch dùng cả màu lẫn label truncated.
- **Bàn phím mobile:** màn hình không bị che khi keyboard xuất hiện (ViewportResize + `env(keyboard-inset-height)` nếu cần).
- **Drag & Drop (desktop):** cung cấp keyboard alternative — focus block → phím Arrow + Enter để mở BlockEditSheet thay thế kéo thả.

---

## Đối chiếu tổng AC → Màn

| AC | Màn | Component chính |
|---|---|---|
| AC-01-1 | M1 + S1 + S2 | FAB + QuickCaptureSheet |
| AC-01-2 | M1 | QuickCaptureSheet submit |
| AC-01-3 | S2 + S1 | TaskList optimistic prepend |
| AC-01-4 | M1 | TitleInput validation |
| AC-01-5 | M1 | API layer (ngoài UI) |
| AC-01-6 | M1 | Sheet không bị keyboard che, Lưu ≥44px |
| AC-02-1 | S2 | TaskList sort mới nhất |
| AC-02-2 | S2 | SearchBar client-filter |
| AC-02-3 | S3 | TaskDetailSheet fields |
| AC-02-4 | S3 | StatusChip instant update |
| AC-02-5 | S2 | Empty state InboxIcon |
| AC-02-6 | S2 | InfiniteScrollList |
| AC-03-1 | S3 | PrioritySection (Deadline/Effort/Impact) |
| AC-03-2 | S3 | PriorityScoreChip sau lưu |
| AC-03-3 | S2 | SortChip "Ưu tiên" |
| AC-03-4 | S2 + S3 | Badge "Chưa ưu tiên" |
| AC-03-5 | S3 | PriorityScoreChip realtime |
| AC-03-6 | Ngoài UI | lib/priority.ts |
| AC-04-1 | S3 + D1 | StatusChip → WIP Dialog |
| AC-04-2 | S5 | FocusOverlay (không nav, không list) |
| AC-04-3 | S5 | FocusActionBar "Đánh dấu Xong" → next task |
| AC-04-4 | **S6b** | WipLimitStepper → T07 setSetting |
| AC-04-5 | S2 + D1 | WIPIndicator + Dialog text X/limit |
| AC-05-1 | **S7** | CalendarDayView/WeekView — khối cố định + time-block |
| AC-05-2 | **S7** | ConflictWarningModal (T20) khi tạo/kéo block |
| AC-05-3 | **S7** | BlockCreateSheet → T06 → bảng time_block |
| AC-05-4 | **S7** | BlockEditSheet → conflict check trước lưu |
| AC-05-5 | **S7** | FixedBlockChip cobalt, not-allowed, không kéo/xóa |
| AC-05-6 | **S7** | HourRuler + block labels theo Asia/Ho_Chi_Minh |
| AC-06-1 | S6a | FixedBlockList |
| AC-06-2 | S6a | FixedBlockForm → API |
| AC-06-3 | S1 + S6a + **S7** | FixedBlockCard → TimelineBlock + FixedBlockChip reflect |
| AC-06-4 | S6a | Realtime list update sau sửa/xóa |
| AC-06-5 | S6a | TimePicker validation error |
| AC-06-6 | S6a | PresetBanner lần đầu |
| AC-07-1 | — | API layer |
| AC-07-2 | S1 + S4 | DeadlineBanner + DeadlineCard |
| AC-07-3 | S4 | DeadlineCard đỏ ghim |
| AC-07-4 | S4 | Deadlines page 7 ngày |
| AC-07-5 | S4 | Task done → biến khỏi list |
| AC-07-6 | S3 + S4 | DateTimePicker sửa → CountdownChip refresh |
| AC-08-1 | S3 + S4 + S2 | escalation=2 → amber màu |
| AC-08-2 | S4 + S1 | escalation=3 → đỏ, ghim |
| AC-08-3 | S1 | EscalationBadge trên TimelineBlock |
| AC-08-4 | S3 | EscalationRow snooze 1h |
| AC-08-5 | — | API + DB persist |
| AC-09-1 | S1 | 4 section Today |
| AC-09-2 | S1 | SuggestionCard khi doing rỗng |
| AC-09-3 | S1 | Skeleton + tối ưu fetch |
| AC-09-4 | S1 | Layout ≤2 scroll 390px |
| AC-09-5 | S1 | Empty state Today |

---

## Ghi chú triển khai

- **S7 (TimeBlock Calendar Editor)** là P0 trong MVP theo quyết định của chủ dự án (US-05 giữ P0). Đây là màn phức tạp nhất — khuyến nghị builder dùng `CalendarDayView` (T19) đã có trong tech spec làm skeleton, mở rộng thêm drag/resize handler cho desktop và BlockCreateSheet/BlockEditSheet cho mobile.
- **S6 tách thành S6a + S6b:** S6a (lịch cố định, P0) giữ nguyên; S6b (WIP limit, P1) thêm mới — builder có thể build song song nếu cần.
- **BottomNav 5 item:** thêm tab "Lịch" → S7. Màn ≤360px có thể cần overflow menu — kiến trúc nav tham khảo kỹ trước khi build.
- **ConflictWarningModal (T20)** được dùng chung ở S7 — đảm bảo component đủ general để nhận prop tên khối cố định / tên block trùng.
- **Timezone Asia/Ho_Chi_Minh:** mọi giờ render trên S7 phải qua `toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })` hoặc tương đương — không render UTC raw.
- Mọi màn cần `<title>` và `<meta description>` tiếng Việt phù hợp cho PWA.
- AC-05-2 và AC-05-3/4 nay đã có UIUX đầy đủ tại S7 — ghi chú cũ "P1+ chưa spec" đã được xóa.
