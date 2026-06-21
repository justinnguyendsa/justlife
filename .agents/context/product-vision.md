---
name: product-vision
description: What justlife is, who it's for, and the product principles every agent must respect. Expanded 2026-06-21 after full needs analysis (3 roles + multi-user teaching).
type: context
updated: 2026-06-21
---

# 🎯 justlife — Product Vision

> File nền. **Mọi agent đọc file này đầu phiên.** Cập nhật 2026-06-21 sau khi phân tích nhu cầu đầy đủ (workflow `justlife-needs-analysis`).

## Sản phẩm là gì

**justlife** — một **Personal Operating System** cho một người (Minh) sống đồng thời 3 vai, cộng một cổng dạy học cho học viên. Mục tiêu: giảm tải tâm trí, ngừng trễ deadline, làm dứt điểm từng việc, và hỗ trợ tự cải thiện (thể lực · ngoại ngữ · tài chính · nghỉ ngơi).

## Người dùng

**Chủ dự án — Minh** (sinh 2001, 1m83/57kg → mục tiêu thể hình là **tăng cân/cơ lành mạnh**; thích xanh dương + vàng, tối giản; hay **suy nghĩ nhiều → nhảy việc**, không làm dứt điểm). Ba vai:
1. **Data Analyst** (team data 1 mình): làm hết Data Management/Engineering/Analysis/Governance + build tool nội bộ. Nhận request nhiều bên → **trễ deadline, tăng ca**.
2. **Trợ giảng DA @ MindX** (tối, lịch linh hoạt): điểm danh, chấm bài, nhận xét. Đang dùng Notion, thiếu nhiều; hay trễ chấm.
3. **Học viên Thạc sĩ Data Science** (4 buổi/tuần, linh hoạt): nhiều bài tập/đồ án, chưa phân bổ được thời gian tự học.

**Học viên** (chỉ trong module dạy học, Phase sau): đăng nhập nộp bài/xem điểm. Đây là nhóm user thứ hai → kích hoạt phần multi-user.

## Kiến trúc sản phẩm: "Một ứng dụng, hai mặt"
- 🔵 **Personal OS** — chỉ Minh, riêng tư tuyệt đối, tách dữ liệu hoàn toàn.
- 🟡 **LMS-lite** — có học viên đăng nhập, cloud, auth + phân quyền. Tách credential/DB/route (`/api/personal/*` vs `/api/lms/*`), không khóa ngoại chéo.

## 6 trụ tính năng
1. **Capture & Prioritize** — gom request vào 1 inbox + ưu tiên (deadline×effort×impact) + Focus/WIP-limit chống nhảy việc.
2. **Time-block & Deadline Guard** — xếp lịch né 3 khối cố định + cảnh báo deadline đa mốc + escalation.
3. **Study OS** — quản lý học cao học (môn/bài tập/đồ án/tự học/tài liệu).
4. **Habit & Self-Improvement** — streak thể lực (tăng cân), tiếng Anh, ngủ, (sau) tài chính.
5. **Rest & Anti-Burnout** — khối nghỉ chủ động.
6. **Teaching** — *(a) phía giảng viên (single-user): điểm danh/chấm/nhận xét/thư viện tái dùng (sớm); (b) cổng học viên (multi-user, cloud): đăng nhập/nộp bài/xem điểm (Phase sau).*

Màu module: work=cobalt, teach=teal, study=violet, growth=amber (xem `design-system.md`).

## 🗺️ Roadmap (đã chốt với chủ dự án 2026-06-21)
| Phase | Nội dung | Ghi chú |
|---|---|---|
| 0 | Foundation — architect ADR-001 (stack + nơi lưu dữ liệu) | trước mọi code |
| 1 | **MVP: Quản lý việc + Deadline** (Capture/Prioritize/Time-block/Deadline) | đánh pain lớn nhất |
| 2 | Teaching — phía giảng viên (single-user) | ưu tiên #3 của Minh, không cần cloud |
| 3 | Study OS (cao học) | |
| 4 | Habit + Rest | bật streak so le |
| 5 | Teaching — cổng học viên (multi-user, cloud, privacy) | nặng + nhạy cảm, qua privacy-auditor |
| 6 | Insights & polish | thế mạnh DS |

## 🧭 Nguyên tắc sản phẩm (RÀNG BUỘC — agent vi phạm = reject)
| # | Nguyên tắc | Khi build |
|---|---|---|
| P1 | **Ship nhỏ, dùng được ngay** | MVP từng phase trước, polish sau. |
| P2 | **Chống bloat** | Mỗi feature phục vụ 1 trụ. Ngoài ra → parking lot (đặc biệt: KHÔNG biến LMS-lite thành full LMS). |
| P3 | **Giảm tải tâm trí, không tăng** | Không thành "việc thứ tư". |
| P4 | **Tôn trọng lịch thật** | Né khối cố định (làm 8h30–18h · dạy tối linh hoạt · học 4 buổi/tuần linh hoạt). |
| P5 | **Riêng tư mặc định** | Dữ liệu cá nhân + **PII học viên (có thể trẻ vị thành niên)** → tối thiểu hóa, mã hóa, tách vùng, consent. |
| P6 | **Single-user core + multi-user là subsystem tách biệt** | Personal OS single-user; LMS multi-user chỉ bật ở Phase 5 (đã được chủ dự án yêu cầu) — xem rule amend. |

## Liên quan
- `design-system.md` · `tech-stack.md` (architect chốt ADR-001) · `model-effort-policy.md` · `.agents/rules/00-critical-rules.md`
- Phân tích gốc: `.claude/workflows/needs-analysis.js` (run 2026-06-21)
