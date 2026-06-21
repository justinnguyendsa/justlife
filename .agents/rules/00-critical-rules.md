---
name: critical-rules
description: The invariant rules (R-JL-*) every justlife agent must obey. Referenced by agent self-evaluation and the QC/conformance gates.
type: rules
updated: 2026-06-20
---

# 🛑 justlife — Critical Rules (R-JL-*)

> Luật bất biến. Agent vi phạm → output bị reject ở gate. Mỗi rule có ID để trích dẫn trong spec, QC report, scoreboard.

## Sản phẩm
| ID | Rule |
|---|---|
| **R-JL-SHIP-SMALL-01** | Ship MVP nhỏ, dùng được ngay. Chia phase; không gom "big bang". (P1) |
| **R-JL-NO-BLOAT-01** | Mỗi feature phải phục vụ 1 trong 4 trụ (capture/time-block/habit/rest). Ngoài 4 trụ → parking lot, không build. (P2) |
| **R-JL-LESS-MENTAL-LOAD-01** | Tính năng phải giảm tải tâm trí, không bắt người dùng bảo trì thêm. (P3) |
| **R-JL-RESPECT-SCHEDULE-01** | Gợi ý time-block phải né khối cố định (làm 8h30–18h, mentor 19h15–22h15, học T7/CN). (P4) |
| **R-JL-SINGLE-USER-01** *(amended 2026-06-21)* | **Personal core là single-user** — KHÔNG over-engineer multi-tenant/RBAC/team cho phần cá nhân. **LMS-lite (dạy học) là subsystem MULTI-USER tách biệt**, đã được chủ dự án yêu cầu → hợp lệ, chỉ bật ở Phase 5, tách credential/DB/route, qua privacy-auditor. (P6) |
| **R-JL-TWO-FACES-01** | "Một app hai mặt": Personal OS (chỉ Minh) vs LMS-lite (có học viên) TÁCH HOÀN TOÀN dữ liệu — không khóa ngoại chéo, route `/api/personal/*` vs `/api/lms/*`, tách env/credential. Chống rò rỉ chéo. |

## Quyền riêng tư & dữ liệu
| ID | Rule |
|---|---|
| **R-JL-PRIVACY-01** | Dữ liệu cá nhân nhạy cảm (sức khỏe/lịch/cảm xúc): tối thiểu hóa thu thập, không gửi ra dịch vụ ngoài khi không cần, không log PII. (P5) |
| **R-JL-LOCAL-FIRST-01** | Ưu tiên lưu cục bộ/self-host cho dữ liệu cá nhân. Tích hợp bên thứ ba phải được chủ dự án duyệt rõ ràng. |
| **R-JL-STUDENT-PII-01** | Dữ liệu học viên là PII, **có thể là trẻ vị thành niên** → nghĩa vụ pháp lý: thu tối thiểu (tên/email/điểm), consent log (+ guardian nếu minor), mã hóa at-rest, audit log truy cập, quyền xóa (cascade) + data-retention. `privacy-auditor` là GATE bắt buộc cho mọi feature LMS. |

## Code & UI
| ID | Rule |
|---|---|
| **R-JL-SPEC-FIRST-01** | KHÔNG code khi chưa có User Story + (Tech Spec hoặc UIUX Spec). Spec trước, code sau. |
| **R-JL-NO-HARDCODE-01** | KHÔNG hardcode màu/font/spacing. Dùng CSS variable từ `tokens.css` (xem `design-system.md`). |
| **R-JL-VN-COPY-01** | Copy UI 100% tiếng Việt. KHÔNG English UI. |
| **R-JL-REUSE-BEFORE-CODE-01** | Trước khi tạo component/hàm/hook mới: grep tìm cái có sẵn → REUSE/EXTEND/COMPOSE, chỉ CREATE-NEW khi có lý do. In quyết định ra chat. |
| **R-JL-FIX-ON-SIGHT-01** | Thấy bug nhỏ trong vùng đang sửa → fix luôn (Tier 1/2). Bug lớn ngoài scope → ghi lại, báo orchestrator. |
| **R-JL-VERIFY-BUILD-01** | Trước khi báo done: chạy typecheck + build (theo stack). Cả hai phải pass. |

## Quy trình & agent
| ID | Rule |
|---|---|
| **R-JL-ONE-SPAWN-01** | Chỉ `orchestrator` được spawn worker khác. Worker KHÔNG tự spawn agent. |
| **R-JL-SELF-UAT-01** | Task có UI → builder phải tự UAT (chụp màn hình / Preview MCP) trước khi giao QC. |
| **R-JL-QC-GATE-01** | `qa-verifier` PHẢI pass trước `uat-worker`; UAT pass trước `devops-worker` deploy. |
| **R-JL-DUAL-LANG-EXPLAIN-01** | Khi giải thích cho chủ dự án: nói cả ngôn ngữ kỹ thuật **và** bình dân (1–2 câu dễ hiểu). |
| **R-JL-MEMORY-SYNC-01** | Sau mỗi run lớn, `knowledge-keeper` cập nhật memory/context/rules + log_activity. |
| **R-JL-SCORE-01** | Sau mỗi run, `scoreboard-keeper` chấm điểm 5 chiều, đề xuất cải thiện. |

## Escalate chủ dự án ngay khi
- Phát hiện thao tác phá hủy (drop DB, xóa dữ liệu cá nhân, force-push).
- Rò rỉ dữ liệu nhạy cảm (PII gửi ra ngoài).
- Worker fail 2 lần liên tiếp sau retry.
- Quyết định kiến trúc/cost lớn (chọn stack, thêm dịch vụ trả phí).

## Liên quan
- `product-vision.md` (P1–P6) · `design-system.md` · `model-effort-policy.md`
