---
name: justlife-audit
description: >
  Run a retrospective health audit of the justlife codebase across multiple dimensions (design-system
  compliance, privacy/data, dead code, reuse/duplication, schedule-respect logic, a11y). Use
  periodically or when the user says "audit", "soát toàn hệ", "kiểm tra sức khỏe dự án", "rà soát".
argument-hint: "[focus dimension, optional]"
---

# /justlife-audit — Audit sức khỏe toàn hệ

> Định kỳ (vd cuối mỗi sprint). Chạy fan-out song song qua các checker. Read-only — không sửa code.

## Bước 0 — Đọc context
`product-vision.md`, `design-system.md`, `tech-stack.md`, rules.

## Bước 1 — Spawn checker song song (Wave audit)
| Chiều | Agent |
|---|---|
| Design system (hardcode màu/font, gradient) | `design-system-worker` |
| Privacy/Data (rò rỉ, PII, egress, secrets) | `privacy-auditor` |
| Dead code + tính năng trùng | `code-hygiene-auditor` |
| Reuse/duplication | `codebase-cartographer` |
| Hồi quy / date-timezone | `regression-detector` |
| Phủ spec (US/AC → code) | `spec-conformance-verifier` |

> Có thể dùng Workflow `.claude/workflows/product-audit.js` để chạy fan-out + tổng hợp tự động.

## Bước 2 — Tổng hợp
Gộp findings theo mức (Critical/High/Med/Low). Verdict tổng: ✅ CLEAN / ⚠️ NEEDS-FIX / 🚫 CRITICAL.

## Bước 3 — Output
`.agents/specs/architecture/Audit-[Date].md` — bảng findings + fix list ưu tiên.

## Bước 4 — Sau audit
`knowledge-keeper` rút bài học → rule mới nếu cần. `scoreboard-keeper` ghi nhận.

## Tips
- Ưu tiên xử lý Critical privacy + date/timezone trước (rủi ro cao nhất cho app này).
- Audit định kỳ ngắn còn hơn một lần cuối dự án.
