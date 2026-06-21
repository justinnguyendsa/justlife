# 📁 justlife — Specs

Nơi lưu mọi tài liệu của vòng đời feature. Agent đọc/ghi vào đúng thư mục:

| Thư mục | Nội dung | Ai tạo |
|---|---|---|
| `rd/` | R&D doc + Roadmap + Plan-Week | new-feature skill, pm-worker |
| `user-stories/` | US-*, UAT-Report-*, User-Guide-* | user-story-writer, uat-worker |
| `tech-specs/` | SPEC-*, QC-Report-* | tech-spec-writer, qa-verifier |
| `uiux-specs/` | UIUX-* | uiux-spec-writer |
| `architecture/` | ADR-*, data-model, Reusable-Assets-*, Analytics-*, Privacy-Audit-*, Hygiene-*, Audit-*, Component-Catalog | architect, cartographer, data-analyst, privacy-auditor, code-hygiene-auditor, design-system-worker |
| `Conformance-*.md` (gốc specs/) | ma trận truy vết | spec-conformance-verifier |

## Quy ước tên file
`[LOẠI]-[Feature]-DDMMYYYY.md` — ví dụ `US-HabitStreak-20062026.md`, `ADR-001-tech-stack-20062026.md`.

## Chuỗi vòng đời
```
RD (rd/) → US (user-stories/) → ADR+data-model (architecture/)
   → SPEC (tech-specs/) + UIUX (uiux-specs/) → [code]
   → QC-Report (tech-specs/) → UAT-Report + User-Guide (user-stories/)
   → Conformance (specs/) → Audit (architecture/)
```
