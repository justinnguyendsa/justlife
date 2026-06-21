---
description: Direct single-specialist task for justlife (Pattern D) — invoke ONE worker without full orchestration, for simple one-skill jobs. Faster + cheaper than the orchestrator.
argument-hint: "<@agent-name> <task>  e.g. @privacy-auditor soát module reminder"
---

# /justlife-do $ARGUMENTS

> Gọi thẳng **một** worker cho việc đơn 1-chuyên-môn — không cần orchestrator (tiết kiệm overhead). Đây là Pattern D trong `.claude/agents/README.md`.

## Cách dùng
Cú pháp: `@<agent> <task>`. Ví dụ:
```
@user-story-writer viết US cho rest block buổi tối
@data-analyst định nghĩa metric streak tiếng Anh
@privacy-auditor soát rò rỉ ở module reminder
@design-system-worker audit hardcode màu toàn repo
@codebase-cartographer map component tái dùng cho habit
```

## Quy trình
1. Đọc context tối thiểu liên quan (`product-vision.md`, file context của vùng đó).
2. Spawn đúng 1 agent (model+effort theo `model-effort-policy.md`).
3. Truyền: mục tiêu, file được phép đụng, định dạng output.
4. Trả kết quả cho chủ dự án (song ngữ kỹ thuật + bình dân).

## Khi nào KHÔNG dùng (dùng orchestrator / skill thay thế)
- Việc cần ≥3 chuyên môn → `/justlife-develop` (orchestrator).
- Cả một feature từ đầu → `/justlife-new-feature`.
- Task có UI cần build + QC + UAT → `/justlife-develop`.

## Lưu ý
- Worker được gọi thẳng vẫn phải theo R-JL-* (reuse-before-code, no-hardcode, privacy, verify).
- Nếu phát hiện việc thực ra cần nhiều chuyên môn → báo chủ dự án chuyển sang orchestrator.
