---
name: justlife-new-feature
description: >
  Start R&D for a new justlife feature — from idea to a CTO-style R&D document for approval, NO
  CODE yet. Use when beginning a new feature, writing a user story, assessing feasibility, or when
  the user says "feature mới", "tính năng mới", "R&D", "ý tưởng", "new feature".
argument-hint: "<feature idea or problem>"
---

# /justlife-new-feature — R&D (chưa code)

> Bước 1 trong chuỗi: **New Feature (R&D) → Feature Spec → Develop → Ship.** Output là tài liệu để chủ dự án duyệt — KHÔNG CODE.

## Bước 0 — Đọc context (BẮT BUỘC)
`.agents/context/product-vision.md` (4 trụ + P1–P6), `.agents/specs/rd/` (đã có RD liên quan chưa?), `tech-stack.md`.

## Bước 1 — Gác bloat trước (R-JL-NO-BLOAT-01)
Hỏi: ý tưởng này phục vụ trụ nào trong 4 (capture/time-block/habit/rest)? Nếu KHÔNG → đề xuất parking lot, dừng. Đừng R&D thứ không thuộc 4 trụ.

## Bước 2 — User Story
Gọi `user-story-writer` (hoặc tự viết) → US chuẩn 6 phần (Story / AC / **UAT steps** / Priority / Out-of-scope / Edge). Lưu `.agents/specs/user-stories/US-[Feature]-DDMMYYYY.md`.

## Bước 3 — Đánh giá khả thi (góc Tech Lead)
| Tiêu chí | Hỏi |
|---|---|
| Giá trị | Giảm tải tâm trí thật không? Phục vụ trụ nào? |
| Khả thi | Stack hiện tại làm được? (nếu TBD → architect sẽ chốt ở /feature-spec) |
| Privacy | Có đụng dữ liệu nhạy cảm? (P5) |
| Scope | MVP nhỏ nhất dùng được là gì? (R-JL-SHIP-SMALL-01) |
| Effort | XS/S/M/L |

## Bước 4 — Plan sơ bộ (gọi `pm-worker` nếu cần)
Chia phase: MVP → fast-follow. Ưu tiên MoSCoW.

## Bước 5 — R&D Document
Lưu `.agents/specs/rd/RD-[Feature]-DDMMYYYY.md`:
```markdown
# R&D — [Feature]
## 1. Bối cảnh & trụ phục vụ
## 2. User Story (link US-...)
## 3. Hướng tiếp cận (data model sơ bộ, privacy note)
## 4. Đánh giá khả thi
## 5. Plan phase (MVP trước)
## 6. Rủi ro & giảm thiểu
## 7. Quyết định: [ ] APPROVED → /justlife-feature-spec  [ ] REVISE  [ ] REJECT
```

## Sau khi xong
Báo chủ dự án (song ngữ kỹ thuật + bình dân): "RD [Feature] xong, chờ duyệt. File: ...". Nếu APPROVED → `/justlife-feature-spec`.

## Tips
- Một ý tưởng to → R&D **phase 1** thôi, đừng R&D cả vũ trụ.
- Edge case bắt buộc nghĩ tới: múi giờ, lịch cố định trùng, offline.
