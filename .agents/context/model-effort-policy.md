---
name: model-effort-policy
description: Which model + reasoning effort each agent should use. The orchestrator applies this when spawning workers. Tuned for a solo project — cost-aware.
type: context
updated: 2026-06-20
---

# 🎚️ justlife — Model + Effort Policy

> Phỏng theo policy 4-tier của G-Agentic, **rút gọn cho dự án cá nhân** (chi phí là tiền túi → tiết kiệm hơn). Orchestrator áp bảng này khi spawn worker qua `Agent({ model, effort })`.

## Nguyên tắc 4 tầng

| Workload | Model | Khi nào | Cost |
|---|---|---|---|
| **Đọc** (grep, map code, audit tĩnh, đếm, screenshot diff) | **Haiku 4.5** (`claude-haiku-4-5`) | Nhanh + rẻ, không cần "thông minh" | 1x |
| **Viết** (spec, user story, docs, report, plan) | **Sonnet 4.6** (`claude-sonnet-4-6`) | Diễn đạt tốt, format chuẩn | ~3x |
| **Code thường + điều phối + suy luận** (frontend, design-system, orchestrator, PM, QC) | **Opus 4.8** (`claude-opus-4-8`), effort medium–high | Chất lượng cao | ~10x |
| **Code lõi + quyết định kiến trúc** (backend/data layer, data-platform, architect, privacy/security) | **Opus 4.8**, effort high–extra | Sai = mất/lộ dữ liệu cá nhân, khó undo | ~10x×effort |

> **Khác G-Agentic:** dự án solo nên mình đẩy nhiều việc "đọc" về Haiku và chỉ dùng `extra` cho thật ít agent (architect, backend lõi, privacy). Tiết kiệm token.

## Gán cho từng agent

### Opus 4.8 — extra effort (lõi, ít agent)
| Agent | Lý do |
|---|---|
| `architect` | Quyết stack + kiến trúc, ripple toàn hệ |
| `backend-builder` | API + data integrity (dữ liệu cá nhân) |
| `privacy-auditor` | Zero-tolerance rò rỉ dữ liệu nhạy cảm |

### Opus 4.8 — high effort
`orchestrator`, `data-analyst`, `agent-evolver`

### Opus 4.8 — medium effort
`frontend-builder`, `design-system-worker`

### Sonnet 4.6 — medium (viết)
`pm-worker`, `user-story-writer`, `tech-spec-writer`, `uiux-spec-writer`, `qa-verifier`, `uat-worker`, `spec-conformance-verifier`, `devops-worker`, `knowledge-keeper`

### Haiku 4.5 — low (đọc/máy móc)
`codebase-cartographer`, `code-hygiene-auditor`, `regression-detector`, `scoreboard-keeper`

## Effort hint
| Effort | Dùng khi |
|---|---|
| `minimal` | 1 lệnh, không suy luận (đếm file, grep) |
| `low` | Vài bước (audit 1 chiều, viết 1 mục) |
| `medium` | Multi-step (full spec, code 1 component) |
| `high` | Kiến trúc / debate / code phức tạp |
| `extra` | Code lõi zero-tolerance (data/privacy/architecture) |

## Lưu ý kỹ thuật
- **Subagent** (`.claude/agents/*.md`): `model:` frontmatter có hiệu lực; effort truyền qua `Agent({ effort })`.
- **Skill** (`.claude/skills/*`): chạy trong main context; đổi model bằng `/model X` trước khi gọi nếu cần.
- Per-task có thể override: task đơn giản hạ effort xuống tiết kiệm; task khó bump lên.

## Liên quan
- `.claude/agents/README.md` (roster) · `product-vision.md` (P1 ship nhỏ → đừng phung phí token)
