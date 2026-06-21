---
description: Plan the coming week of justlife building — pick what to build next around the owner's real fixed schedule (work / mentoring / Master's), ship-small first.
argument-hint: "[week or focus, optional]"
---

# /justlife-plan-week $ARGUMENTS

> Nghi thức PM hằng tuần cho chủ dự án bận. Mục tiêu: chọn việc build vừa sức, né lịch cố định, ship nhỏ.

## 1. Đọc trạng thái
`product-vision.md` (4 trụ), roadmap + log gần nhất (`.agents/specs/rd/`, `.agents/memory/log_activity.md`), scoreboard.

## 2. Spawn `pm-worker`
- Ưu tiên MoSCoW theo 4 trụ; chọn feature/phase tiếp theo (ship nhỏ — R-JL-SHIP-SMALL-01).
- Map vào **khối thời gian trống thực tế** (né: làm 8h30–18h T2–T6, mentor 19h15–22h15, học T7+CN) — R-JL-RESPECT-SCHEDULE-01.
- Gác bloat: việc ngoài 4 trụ → parking lot.

## 3. Output
`.agents/specs/rd/Plan-Week-DDMMYYYY.md`:
```markdown
## Tuần [ngày]
| Khối trống | Việc build | Trụ | Phase | Effort |
## Mục tiêu tuần (1–3 việc thôi, ship được)
## Parking lot
```

## 4. Báo chủ dự án (song ngữ)
"Tuần này nên làm X, Y (vừa sức, ship được). Để dành Z." + lý do ngắn gọn.

## Tips
- Người bận → 1–3 mục tiêu/tuần là đủ. Đừng nhồi.
- Chèn cả khối nghỉ vào plan (app này tôn trọng rest — đừng để chính việc build gây burnout).
