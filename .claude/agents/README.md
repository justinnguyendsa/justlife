# 🤖 justlife — Multi-Agent System

> **Mục đích:** điều phối tự động việc build justlife, phủ **mọi vai trò** trong vòng đời sản phẩm — từ ý tưởng → spec → code → kiểm thử → ship → học lại.
> **Phỏng theo** quy trình G-Agentic, **tinh chỉnh cho app đời sống cá nhân solo** (thêm `data-analyst` + `privacy-auditor`, bỏ gánh nặng enterprise).
> **Authority:** chỉ `orchestrator` được spawn worker (R-JL-ONE-SPAWN-01).

---

## 🧭 Đọc trước (mọi agent, đầu phiên)
1. `.agents/context/product-vision.md` — tại sao có sản phẩm, 6 nguyên tắc P1–P6
2. `.agents/context/design-system.md` — màu/font/icon đã chốt
3. `.agents/context/tech-stack.md` — stack (TBD đến khi architect chốt)
4. `.agents/rules/00-critical-rules.md` — luật R-JL-*

---

## 📋 Agent Roster (21 agent)

### Tier 0 — Orchestration
| Agent | Model | Effort | Vai trò |
|---|---|---|---|
| **orchestrator** | Opus 4.8 | high | Nhạc trưởng: lập kế hoạch wave, spawn worker, giữ gate, chấm điểm. |

### Tier 1 — Discovery & Spec (Wave 0–2)
| Agent | Model | Effort | Vai trò |
|---|---|---|---|
| **codebase-cartographer** | Haiku 4.5 | low | Map code + tài sản tái dùng (reuse-before-code). |
| **pm-worker** | Sonnet 4.6 | medium | Chiến lược sản phẩm, roadmap, ưu tiên MoSCoW, plan tuần/sprint theo lịch thật. |
| **user-story-writer** | Sonnet 4.6 | medium | User Story Given/When/Then + UAT steps. |
| **architect** | Opus 4.8 | extra | **Chốt tech stack (feature đầu)**, system design, ADR, data model. |
| **tech-spec-writer** | Sonnet 4.6 | medium | Tech Spec + bảng task + API/schema. |
| **uiux-spec-writer** | Sonnet 4.6 | medium | UIUX Spec từ User Story, áp design system đã chốt. |

### Tier 2 — Implementation (Wave 3, song song khi khác file)
| Agent | Model | Effort | Vai trò |
|---|---|---|---|
| **frontend-builder** | Opus 4.8 | medium | UI: page, component, state. Enforce tokens + tiếng Việt. |
| **backend-builder** | Opus 4.8 | extra | API, data layer, business logic. Lõi → zero-tolerance. |
| **data-analyst** | Opus 4.8 | high | Event tracking, định nghĩa metric, logic streak, insight, dashboard. ⭐ thế mạnh chủ dự án. |
| **design-system-worker** | Opus 4.8 | medium | tokens.css, catalog component, audit design token. |

### Tier 3 — Verification (Wave 4)
| Agent | Model | Effort | Vai trò |
|---|---|---|---|
| **qa-verifier** | Sonnet 4.6 | medium | QC theo Tech Spec (typecheck/build/lint/edge/error). Gate trước UAT. |
| **uat-worker** | Sonnet 4.6 | medium | UAT theo User Story end-to-end + screenshot (Preview/Chrome MCP). |
| **spec-conformance-verifier** | Sonnet 4.6 | medium | Truy vết US/AC → spec → code, bắt thiếu sót. |
| **privacy-auditor** | Opus 4.8 | extra | ⭐ Audit rò rỉ dữ liệu cá nhân, PII, tối thiểu hóa, security cơ bản. |
| **code-hygiene-auditor** | Haiku 4.5 | low | Dead code + tính năng trùng. |
| **regression-detector** | Haiku 4.5 | low | Quét tĩnh pre-merge (pattern hồi quy). |

### Tier 4 — Ops & Meta (Wave 5 + post-run)
| Agent | Model | Effort | Vai trò |
|---|---|---|---|
| **devops-worker** | Sonnet 4.6 | medium | Deploy checklist, env, build, smoke test. |
| **knowledge-keeper** | Sonnet 4.6 | low | Cập nhật memory/context/rules + log_activity. |
| **scoreboard-keeper** | Haiku 4.5 | minimal | Chấm điểm 5 chiều/run, vòng tự cải thiện. |
| **agent-evolver** | Opus 4.8 | high | Đọc scoreboard → đề xuất sửa prompt agent (định kỳ). |

---

## 🌊 Wave-Based Execution

```
Chủ dự án request
   ↓
orchestrator (Opus / high)
   ↓
[Wave 0 — Discovery 🟢 PAR]  codebase-cartographer (+ đọc context)
   ↓
[Wave 1 — Product 🟢 PAR]    pm-worker · user-story-writer
   ↓
[Wave 2 — Spec 🟢 PAR]       architect (nếu cần) · uiux-spec-writer · tech-spec-writer
   ↓
[Wave 3 — Build 🟢 PAR*]     frontend-builder · backend-builder · data-analyst · design-system-worker
   ↓        (*song song chỉ khi file disjoint; schema migration đi trước)
[Wave 4a — QC 🔵 SEQ]        qa-verifier · code-hygiene-auditor · regression-detector · privacy-auditor
   ↓        (qa-verifier MUST PASS)
[Wave 4b — UAT 🔵 SEQ]       uat-worker · spec-conformance-verifier
   ↓
[Wave 5 — Ship 🔵 SEQ, gated bởi chủ dự án]  devops-worker
   ↓
[Post-run]                   scoreboard-keeper · knowledge-keeper · (agent-evolver định kỳ)
```

## 🛡️ Cổng & chống xung đột
| Cổng | Luật |
|---|---|
| File lock | 2 worker KHÔNG sửa cùng file đồng thời → chạy tuần tự. |
| Schema barrier | Migration DB (backend/data) đi TRƯỚC frontend đọc nó. |
| Spec gate | Wave 2 spec xong mới Wave 3 code (R-JL-SPEC-FIRST-01). |
| QC gate | qa-verifier pass trước uat-worker; UAT pass trước deploy (R-JL-QC-GATE-01). |
| Privacy gate | privacy-auditor review mọi thay đổi đụng dữ liệu cá nhân trước ship. |
| Reuse gate | builder chạy reuse-before-code trước khi tạo mới (R-JL-REUSE-BEFORE-CODE-01). |

---

## 🚀 Cách dùng — 4 pattern

**A. Slash command (mặc định):**
```
/justlife-new-feature   Habit streak tiếng Anh
/justlife-feature-spec  Time-block tôn trọng lịch cố định
/justlife-develop       Phase 1 — task capture + reminder
/justlife-ship          deploy phase 1
/justlife-bug-fix       nhắc nhở bắn sai múi giờ
```

**B. Plan Mode (Shift+Tab)** cho task dài → orchestrator dựng Task Table theo wave.

**C. Ngôn ngữ tự nhiên phức tạp:** "Triển khai habit tracking end-to-end" → main Claude phát hiện ≥3 chuyên môn → đề xuất gọi orchestrator.

**D. Gọi thẳng 1 worker (đơn giản, KHÔNG cần orchestrator):**
```
"@privacy-auditor soát rò rỉ dữ liệu ở module reminder"
"@user-story-writer viết US cho rest block"
"@data-analyst định nghĩa metric streak"
```

### Decision tree
```
Request → khớp slash command? → orchestrator (theo template)
        → ≥3 chuyên môn / Plan Mode phức tạp? → orchestrator
        → 2 chuyên môn? → 2 worker song song (main điều phối)
        → 1 chuyên môn? → 1 worker thẳng
```

---

## 📊 Scoreboard (tự cải thiện)
Path: `.agents/scoreboard/` — 5 chiều/run (Correctness 30 · Quality 25 · Speed 15 · Cost 15 · Adherence 15) → A/B/C/D/F.
Sau ≥10 run: `agent-evolver` tổng hợp xu hướng → đề xuất sửa prompt agent hay lặp lỗi.

## 📚 Liên quan
- `.claude/skills/` — workflow theo phase (slash command)
- `.claude/commands/` — launcher điều phối nhanh
- `.claude/workflows/` — Workflow JS (fan-out song song)
- root `CLAUDE.md` — luật top + bảng trỏ
