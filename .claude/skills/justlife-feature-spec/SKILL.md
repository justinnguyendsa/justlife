---
name: justlife-feature-spec
description: >
  Turn an approved justlife R&D into a detailed, implementable spec — architecture/stack decision
  (if needed), tech spec with task table, and UIUX spec. Use after R&D approval, or when the user
  says "feature spec", "đặc tả", "spec chi tiết", "thiết kế kỹ thuật".
argument-hint: "<feature (must have approved R&D)>"
---

# /justlife-feature-spec — Đặc tả chi tiết

> Bước 2 trong chuỗi. Input: RD đã APPROVED. Output: spec đủ để builder code mà không hỏi lại. **CHƯA CODE.**

## Bước 0 — Đọc context + RD + US
`product-vision.md`, `design-system.md`, `tech-stack.md`, RD + US của feature.

## Bước 1 — Reuse map (Wave 0)
Gọi `codebase-cartographer` → `Reusable-Assets-[Feature].md` (trừ greenfield).

## Bước 2 — Kiến trúc / Stack (gọi `architect`)
- **Nếu `tech-stack.md` = TBD (feature đầu):** architect CHỐT STACK → `ADR-001-tech-stack-*.md` + điền `tech-stack.md`. **Đây là cổng chặn — không spec/code tiếp khi chưa chốt** (R-JL-SPEC-FIRST-01).
- Data model + API boundary + privacy-by-design (cờ field nhạy cảm).

## Bước 3 — Spec song song (Wave 2)
- `tech-spec-writer` → `SPEC-[Feature]-*.md` (task table T01.., schema, API, test plan, privacy flags).
- `uiux-spec-writer` → `UIUX-[Feature]-*.md` (screen flow, states, copy tiếng Việt, token theo trụ).
- (nếu feature data-nặng) `data-analyst` → `Analytics-[Feature]-*.md` (event + metric + dashboard).

## Bước 4 — Cổng truy vết (gọi `spec-conformance-verifier`, mode SPEC)
Ma trận US-AC → UIUX/Tech-Spec phủ đủ chưa. GAPS/CRITICAL → quay lại bổ sung spec TRƯỚC khi code.

## Sau khi xong
Báo chủ dự án: spec sẵn sàng, gồm các file [...]. Nếu duyệt → `/justlife-develop`.

## Tips
- Task trong Tech Spec nên disjoint file để Wave 3 build song song.
- Migration DB là task riêng, đứng trước task đọc nó.
