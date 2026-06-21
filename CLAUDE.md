# CLAUDE.md — justlife

> Webapp quản lý cuộc sống cá nhân (single-user). Mục tiêu: ngừng quên việc, time-block tôn trọng lịch thật, habit (tiếng Anh + thể lực), nghỉ ngơi chủ động.
> File này là **bảng trỏ**. Chi tiết nằm trong `.agents/context/` và `.claude/`.

## 🔝 TOP CRITICAL RULES (đọc kỹ — chi tiết ở `.agents/rules/00-critical-rules.md`)

1. **R-JL-SHIP-SMALL-01** — Ship MVP nhỏ, dùng được ngay. Chia phase, không big-bang.
2. **R-JL-NO-BLOAT-01** — Mỗi feature phục vụ 1 trong 4 trụ (capture · time-block · habit · rest). Ngoài ra → parking lot.
3. **R-JL-PRIVACY-01** — Dữ liệu cá nhân nhạy cảm: tối thiểu hóa, không rò rỉ, local-first.
4. **R-JL-SPEC-FIRST-01** — Không code khi chưa có User Story + Spec.
5. **R-JL-NO-HARDCODE-01** — Không hardcode màu/font; dùng token từ `tokens.css`.
6. **R-JL-VN-COPY-01** — Copy UI 100% tiếng Việt.
7. **R-JL-QC-GATE-01** — qa-verifier pass → uat-worker pass → mới deploy.
8. **R-JL-DUAL-LANG-EXPLAIN-01** — Giải thích cho chủ dự án: kỹ thuật + bình dân.
9. **R-JL-ONE-SPAWN-01** — Chỉ orchestrator spawn worker.
10. **R-JL-RESPECT-SCHEDULE-01** — Time-block né khối cố định (làm/mentor/học).

## 🗺️ Bảng trỏ

| Cần gì | Đọc / dùng |
|---|---|
| Tại sao có sản phẩm, 4 trụ, 6 nguyên tắc | `.agents/context/product-vision.md` |
| Màu / font / icon đã chốt | `.agents/context/design-system.md` |
| Tech stack (TBD → architect chốt) | `.agents/context/tech-stack.md` |
| Chọn model cho agent | `.agents/context/model-effort-policy.md` |
| Luật bất biến R-JL-* | `.agents/rules/00-critical-rules.md` |
| Danh sách agent + wave + cách gọi | `.claude/agents/README.md` |
| Workflow theo phase (slash command) | `.claude/skills/` |
| Launcher điều phối nhanh | `.claude/commands/` |
| Workflow JS fan-out song song | `.claude/workflows/` |
| Spec đã viết (RD/US/Tech/UIUX/ADR) | `.agents/specs/` |
| Điểm + tự cải thiện | `.agents/scoreboard/` |

## 🚦 Bắt đầu từ đâu (greenfield)

justlife đang ở **điểm xuất phát** (chưa có code). Trình tự đề xuất:

```
1. /justlife-new-feature  → R&D trụ #1 (task capture + reminder)
2. /justlife-feature-spec → architect CHỐT STACK (ADR-001) + tech/uiux spec
3. /justlife-develop      → build + QC local
4. /justlife-ship         → deploy
```

> ⚠️ Feature đầu tiên: `architect` phải chốt stack và điền `.agents/context/tech-stack.md` trước khi builder code (R-JL-SPEC-FIRST-01).

## 🧠 Giao tiếp
- Trả lời chủ dự án bằng **tiếng Việt**.
- Mọi giải thích kỹ thuật kèm 1–2 câu bình dân (R-JL-DUAL-LANG-EXPLAIN-01).
