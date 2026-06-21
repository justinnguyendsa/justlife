---
name: justlife-develop
description: >
  Build a spec'd justlife feature end-to-end with QC — runs the implementation waves (frontend,
  backend, data) then the QC/UAT/privacy gates. Use after a feature spec exists, or when the user
  says "develop", "build", "code", "triển khai", "làm tính năng".
argument-hint: "<feature (must have spec) or phase>"
---

# /justlife-develop — Build + QC (local)

> Bước 3 trong chuỗi. Input: spec đã có. Chạy qua orchestrator để điều phối wave.

## Bước 0 — Tiền điều kiện (BẮT BUỘC)
- Có US + Tech Spec + UIUX Spec? Không → quay lại `/justlife-feature-spec` (R-JL-SPEC-FIRST-01).
- `tech-stack.md` đã chốt? Không → architect chốt trước.

## Bước 1 — Spawn orchestrator → Wave 3 Build (song song, file disjoint)
- `backend-builder` (API/data; migration trước) — model Opus/extra
- `frontend-builder` (UI; reuse gate + token + tiếng Việt) — Opus/medium
- `data-analyst` (event/metric nếu cần) — Opus/high
- `design-system-worker` (nếu thêm token/component) — Opus/medium
> Mỗi builder: reuse-before-code (R-JL-REUSE-BEFORE-CODE-01) + fix-on-sight + tự verify (typecheck/build) + self-UAT nếu có UI.

## Bước 2 — Wave 4a QC (SEQ)
- `qa-verifier` (8 chiều theo Tech Spec) — **PHẢI PASS** mới đi tiếp (R-JL-QC-GATE-01)
- `code-hygiene-auditor` + `regression-detector` (song song, đọc) 
- `privacy-auditor` (cổng rò rỉ dữ liệu) — LEAK = block

## Bước 3 — Wave 4b UAT (SEQ, sau QC pass)
- `uat-worker` (chạy app thật theo UAT steps + screenshot) → UAT Report + User Guide
- `spec-conformance-verifier` (mode BUILD) → ma trận AC → code

## Bước 4 — Post-run
- `scoreboard-keeper` (chấm điểm) + `knowledge-keeper` (sync memory/log)

## Sau khi xong
Báo chủ dự án (song ngữ): đã build gì, gate pass/fail, file đổi, còn lại gì. Sẵn sàng → `/justlife-ship`.

## Tips
- Bug builder thấy ngoài scope → ghi lại, KHÔNG tự ý mở rộng (chống bloat).
- Nếu QC fail 2 vòng → escalate chủ dự án thay vì cố sửa mãi.
