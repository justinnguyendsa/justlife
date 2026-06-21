---
name: justlife-context
description: >
  Load or refresh the full justlife project context in one shot — vision, design system, tech
  stack, rules, agent roster, and outstanding specs. Use at the start of a work session, when
  onboarding, or when the user says "context", "nạp ngữ cảnh", "tình hình dự án", "đang ở đâu".
argument-hint: ""
---

# /justlife-context — Nạp ngữ cảnh dự án

> Đọc nhanh toàn bộ "bộ não" dự án để bắt đầu phiên làm việc đúng hướng.

## Đọc theo thứ tự
1. `.agents/context/product-vision.md` — tại sao, 4 trụ, P1–P6
2. `.agents/context/design-system.md` — màu/font/icon đã chốt
3. `.agents/context/tech-stack.md` — **stack đã chốt chưa?** (nếu TBD → việc đầu là cho architect chốt)
4. `.agents/rules/00-critical-rules.md` — R-JL-*
5. `.claude/agents/README.md` — roster + wave + cách gọi
6. `.agents/context/model-effort-policy.md` — chọn model

## Quét trạng thái
```bash
ls .agents/specs/rd .agents/specs/user-stories .agents/specs/tech-specs .agents/specs/uiux-specs .agents/specs/architecture 2>/dev/null
cat .agents/memory/log_activity.md 2>/dev/null | tail -20
cat .agents/scoreboard/index.md 2>/dev/null
```

## Tóm tắt cho chủ dự án (song ngữ kỹ thuật + bình dân)
- Dự án đang ở phase nào (greenfield? feature nào đang dở?)
- Stack đã chốt chưa
- Spec/feature đang chờ (RD chờ duyệt? spec chờ build?)
- Gợi ý 1 việc tiếp theo hợp lý nhất (theo roadmap + ship nhỏ)

## Tips
- Chạy lệnh này đầu mỗi phiên dài để Claude không "quên" ngữ cảnh.
