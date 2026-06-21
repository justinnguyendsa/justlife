---
name: justlife-analytics
description: >
  Define metrics, instrument events, write queries, and build insight dashboards for justlife —
  the analytics workflow (owner's specialty). Use for habit streaks, completion rates, schedule
  adherence, rest balance, or when the user says "metric", "thống kê", "dashboard", "phân tích",
  "streak", "insight", "đo lường".
argument-hint: "<what to measure or analyze>"
---

# /justlife-analytics — Đo lường & Insight

> Workflow phân tích — biến hành vi đời sống thành số liệu *hành động được*. Chạy chính qua `data-analyst`.

## Bước 0 — Đọc context
`product-vision.md` (4 trụ → 4 nhóm metric), `tech-stack.md` (event store ở đâu), `.agents/rules` (R-JL-PRIVACY-01).

## Bước 1 — Câu hỏi cần trả lời
Chủ dự án muốn biết gì? (vd "tôi có giữ streak tiếng Anh không?", "tôi nghỉ đủ chưa?"). Mỗi metric phải dẫn tới hành động — không vanity.

## Bước 2 — Spawn `data-analyst`
- Định nghĩa metric theo trụ (capture/time-block/habit/rest) — leading vs lagging.
- Event cần track (tối thiểu PII) → schema event cho `backend-builder` implement.
- Query/metric layer (SQL/Python).
- Đặc tả dashboard view + diễn giải "số này nói gì, nên làm gì".
- Output `Analytics-[Feature]-*.md`.

## Bước 3 — Dựng view (nếu cần UI)
Phối `frontend-builder` + `design-system-worker` dựng dashboard theo design system (mono font cho số/streak).

## Bước 4 — Privacy gate
`privacy-auditor` soát: có track quá mức? PII trong event? gửi ra ngoài? → CLEAN mới dùng.

## Tips
- Streak/heatmap dùng Geist Mono cho số (design system).
- Đừng đo cái không đổi được hành vi. Mỗi biểu đồ kèm 1 "nên làm gì".
