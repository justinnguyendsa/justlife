---
name: product-vision
description: What justlife is, who it's for, and the product principles every agent must respect. Expanded 2026-06-21 after full needs analysis; updated 2026-10-14 for the justlife/justudy split and the Cuộc sống area (incl. Tài chính F4).
type: context
updated: 2026-10-14
---

# 🎯 justlife — Product Vision

> File nền. **Mọi agent đọc file này đầu phiên.** Bản gốc 2026-06-21 (workflow `justlife-needs-analysis`). Cập nhật 2026-10-14 theo hai quyết định của chủ dự án: tách justudy (12/10) và khu Cuộc sống, gồm cả Tài chính theo phương án D (13/10).
> ⚠ **Bản cập nhật 14/10 đang chờ chủ dự án duyệt** (PR `docs/f4-vision-amend`). Duyệt xong thì xoá dòng này.

## Sản phẩm là gì

**justlife** — một **Personal Operating System** cho một người (Minh) đang sống đồng thời 3 vai. Mục tiêu:
- giảm tải tâm trí;
- ngừng trễ deadline;
- làm dứt điểm từng việc;
- hỗ trợ tự cải thiện: thể lực, ngoại ngữ, tài chính, nghỉ ngơi.

**Từ 12/10/2026, justlife chỉ quản lý cuộc sống.**
- Mọi thứ về dạy và học chuyển sang **justudy**, gồm ba phần:
  - Học viên: cổng học viên MindX.
  - Giảng viên: lớp, điểm danh, chấm bài, tài liệu lớp.
  - Tự học: các môn Thạc sĩ và tiếng Anh.
- justlife chỉ nhận đồng bộ từ justudy: tiêu đề, giờ và tiến độ.
  - Deadline và bài chờ chấm thành việc tự hoàn thành.
  - Buổi dạy và buổi học thành khối bận cố định.
  - Số phút học tự tick habit tiếng Anh.
  - **Điểm số và PII học viên không bao giờ chảy vào justlife.**

> Bình dân: justlife là "sổ tay cuộc sống" của riêng Minh. Chuyện lớp học, bài vở nằm ở app bạn justudy; justlife chỉ nhìn sang để biết hôm nay bận giờ nào.

## Người dùng

**Chủ dự án — Minh.**
- Sinh 2001, cao 1m83, nặng 57kg. Mục tiêu thể hình là **tăng cân và cơ một cách lành mạnh**.
- Thích xanh dương và vàng, tối giản.
- Hay **suy nghĩ nhiều nên nhảy việc**, không làm dứt điểm.

Ba vai:
1. **Data Analyst** (team data chỉ có một người).
   - Làm hết Data Management, Engineering, Analysis, Governance, và build tool nội bộ.
   - Nhận request từ nhiều bên nên **trễ deadline, tăng ca**.
2. **Trợ giảng DA ở MindX** (buổi tối, lịch linh hoạt). Vai này hiện quản lý ở justudy; trong justlife nó là một "việc làm" chiếm khối giờ cố định.
3. **Học viên Thạc sĩ Data Science** (4 buổi/tuần, linh hoạt). Phần học quản lý ở justudy; justlife chỉ thấy giờ học và deadline.

**Học viên MindX là người dùng của justudy, không phải của justlife.**

## Kiến trúc sản phẩm: "Hai ứng dụng"
- 🔵 **justlife (Personal OS)**
  - Chỉ Minh dùng, riêng tư tuyệt đối, single-user.
- 🟡 **justudy (LMS-lite)**
  - Có học viên đăng nhập: cloud, auth, phân quyền.
  - Tách hẳn với justlife về credential, DB và route (`/api/personal/*` vs `/api/lms/*`). Không có khoá ngoại chéo.
  - Tiến độ chỉ đồng bộ **một chiều** sang justlife.
- *Hiện trạng code:* phần LMS vẫn nằm chung repo, nhưng đã tách DB (`lms.db`) và route. Việc tách app justudy đang **tạm hoãn**, chờ chủ dự án review.

## 4 trụ tính năng của justlife
1. **Capture & Prioritize** — gom request vào một inbox; ưu tiên theo deadline × effort × impact; Focus và WIP-limit chống nhảy việc.
2. **Time-block & Deadline Guard** — xếp lịch né các khối cố định (làm, dạy, học); cảnh báo deadline nhiều mốc; escalation.
3. **Habit & Self-Improvement — khu "Cuộc sống"**
   - Tổng quan 6 lĩnh vực: Sức khỏe, Tài chính, Công việc, Học tập (đồng bộ từ justudy), Hằng ngày, Nghỉ ngơi.
   - Mỗi lĩnh vực có trang riêng, dùng chung các khối chỉ số, habit, mục tiêu, và một buổi review tuần.
   - Streak thể lực (tăng cân), tiếng Anh, ngủ.
4. **Rest & Anti-Burnout** — khối nghỉ chủ động.

> Study OS và Teaching (trụ 3 và 6 của bản 21/06) đã chuyển sang justudy.

Màu module: work=cobalt, teach=teal, study=violet, growth=amber (xem `design-system.md`).

### Tài chính (F4) — thuộc trụ 3, phạm vi đã chốt 13/10/2026 (phương án D)
| Bước | Nội dung |
|---|---|
| **F4a** — ngắn hạn + mục tiêu | Thu chi nhập tay; 5 hũ phân bổ (Thiết yếu, Tiết kiệm, Đầu tư, Học tập, Hưởng thụ); kế hoạch dòng tiền 30 ngày có cảnh báo số dư thấp; **mục tiêu theo cột mốc** |
| **F4b** — tài sản ròng | Ảnh chụp tài sản và nợ mỗi tháng, xem xu hướng |
| **F4c** — mô phỏng độc lập tài chính (FIRE) | Phép tính "nếu… thì…" dựa trên **giả định do Minh tự nhập** (thu nhập, chi tiêu, tỷ lệ tiết kiệm, lợi suất giả định) |

**Ranh giới bắt buộc của Tài chính** (vi phạm thì bị reject):
- **Chỉ theo dõi.**
  - Nhập tay.
  - Không kết nối ngân hàng hay ví.
  - Không lưu số tài khoản, số thẻ, mật khẩu hay mã OTP.
- **Không tư vấn.**
  - Không gợi ý mã chứng khoán, quỹ, coin hay sản phẩm đầu tư.
  - Không khuyên mua bán.
  - Mô phỏng F4c ghi rõ "minh hoạ theo giả định của bạn, không phải lời khuyên tài chính".
- **Riêng tư.** Dữ liệu tài chính chỉ nằm trong DB cá nhân (personal), không bao giờ sang `lms.db` hay justudy, và không log số tiền kèm định danh.

> Bình dân: phần tài chính giống cuốn sổ thu chi và bảng mục tiêu tiết kiệm Minh tự ghi. App giúp cộng trừ và nhắc khi sắp hụt tiền, chứ không phải người môi giới.

## 🗺️ Roadmap
- **Roadmap hiện hành:** master plan (artifact `4NcSnL1e9td7VtHhhjTr6J`), cập nhật theo từng mốc.
- Phase 0–6 của bản 21/06 đã hoàn thành phần lớn hoặc đã được thay bằng master plan.
- F4 làm **sau giai đoạn 3** (nâng nền tảng: Next 16, Base UI, nợ DB/đăng nhập), theo thứ tự F4a → F4b → F4c.

## 🧭 Nguyên tắc sản phẩm (RÀNG BUỘC — agent vi phạm = reject)
| # | Nguyên tắc | Khi build |
|---|---|---|
| P1 | **Ship nhỏ, dùng được ngay** | MVP từng phase trước, polish sau. |
| P2 | **Chống bloat** | Mỗi feature phục vụ 1 trong 4 trụ ở trên. Ngoài 4 trụ thì đưa vào parking lot. Đặc biệt: **không** biến LMS-lite thành full LMS; **không** biến Tài chính thành app ngân hàng hay app đầu tư. |
| P3 | **Giảm tải tâm trí, không tăng** | Không biến justlife thành "việc thứ tư". Nhập liệu tài chính phải nhanh (vài giây mỗi khoản), không bắt đối soát hằng ngày. |
| P4 | **Tôn trọng lịch thật** | Né khối cố định: làm 8h30–18h, dạy tối linh hoạt, học 4 buổi/tuần linh hoạt. |
| P5 | **Riêng tư mặc định** | Dữ liệu cá nhân (sức khỏe, lịch, cảm xúc, **tài chính**) và **PII học viên (có thể là trẻ vị thành niên)**: tối thiểu hoá, mã hoá, tách vùng, xin consent. |
| P6 | **Single-user core + multi-user là subsystem tách biệt** | justlife là single-user. Phần multi-user nằm ở LMS/justudy; xem rule đã amend. |

## Liên quan
- `design-system.md` · `tech-stack.md` · `model-effort-policy.md` · `.agents/rules/00-critical-rules.md`
- Phân tích gốc: `.claude/workflows/needs-analysis.js` (run 2026-06-21)
- Canvas thiết kế (Lam & Nắng, đề xuất P02 Tài chính): artifact `5P5T6BASXrTzcphDhkQUSJ`
