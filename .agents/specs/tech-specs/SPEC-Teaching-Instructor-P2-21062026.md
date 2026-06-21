# Tech Spec — Teaching (Instructor-side) · Phase 2

**Date:** 21062026 · **Trụ:** #6 Teaching (mặt giảng viên) · **Status:** build
**Liên kết:** product-vision (P2) · needs-analysis domain `teaching-lms` · ADR-001 (two-faces)

## Phạm vi (single-user, local — KHÔNG học viên đăng nhập)
Chỉ Minh dùng, dữ liệu local `personal.db` (bảng prefix `tc_`). Multi-user/cloud/cổng học viên = **Phase 5** (sẽ migrate `tc_*` sang DB cloud có auth — không viết lại).

**Có trong P2:** Lớp học (tạo + clone từ lớp cũ chống copy-paste) · Học viên (roster) · Buổi học + Điểm danh · Bài tập + Chấm điểm (rubric tự cộng + mẫu nhận xét placeholder).
**Out of scope P2:** học viên login/nộp bài (P5), thư viện tài liệu lớn (fast-follow), file upload, audit log cloud.

## Data model (thêm vào personal.db)
| Bảng | Field chính |
|---|---|
| `tc_class` | id, name, term, status(active/archived), createdAt |
| `tc_student` | id, classId, name, email?(PII), note?, createdAt |
| `tc_session` | id, classId, dateAt, topic?, createdAt |
| `tc_attendance` | id, sessionId, studentId, status(present/absent/late), markedAt |
| `tc_assignment` | id, classId, title, dueAt?, maxScore(=10), createdAt |
| `tc_grade` | id, assignmentId, studentId, score?, feedback?, gradedAt |

> ⚠ Privacy (R-JL-STUDENT-PII): `tc_student.email/name` là PII (có thể minor). P2 local nên rủi ro thấp; P5 lên cloud BẮT BUỘC qua privacy-auditor (consent, mã hóa, audit).

## Server actions
- class: `createClass({name,term})` · `cloneClass(fromId,{name,term})` (copy assignments + students rỗng điểm) · `archiveClass(id)`
- student: `addStudent({classId,name,email?})` · `removeStudent(id)`
- session+attendance: `createSession({classId,dateAt,topic})` · `setAttendance(sessionId,[{studentId,status}])` (bulk)
- assignment+grade: `createAssignment({classId,title,dueAt?,maxScore})` · `setGrade({assignmentId,studentId,score,feedback})`

## Màn hình (route group `(teach)`, mode-switch)
1. **/teaching/classes** — danh sách lớp + tạo/clone. (Lớp card: tên, kỳ, #HV, #buổi)
2. **/teaching/classes/[id]** — chi tiết lớp: tab Học viên · Buổi/Điểm danh · Bài tập/Chấm.
3. (gộp trong detail) **Điểm danh**: chọn buổi → bulk mark present/absent/late + "tất cả có mặt".
4. (gộp trong detail) **Chấm bài**: chọn assignment → bảng HV × điểm + nút mở sheet nhập điểm/nhận xét (mẫu placeholder `{{tên}} {{điểm}} {{điểm mạnh}} {{cần cải thiện}}`).

## Điều hướng — Mode switch
Công tắc **Cá nhân ↔ Dạy học** (đầu sidebar desktop / đầu nội dung mobile). Mode "Dạy học" → nav: Lớp học · (chi tiết lớp). Mode "Cá nhân" → nav 5 mục hiện có. Lưu mode vào localStorage.

## AC chính
- AC-T1 Tạo lớp → vào danh sách; clone lớp → copy assignment + roster trống điểm.
- AC-T2 Thêm/xóa học viên trong lớp.
- AC-T3 Tạo buổi → điểm danh bulk (mặc định tất cả có mặt) → lưu; tóm tắt "x/y có mặt".
- AC-T4 Tạo bài tập (maxScore) → nhập điểm + nhận xét từng HV (rubric = điểm/maxScore); mẫu nhận xét điền nhanh.
- AC-T5 Mode switch Cá nhân↔Dạy học mượt, nhớ lựa chọn; tiếng Việt; responsive; theme light/dark; token-only.

## Test plan (qa)
typecheck + build · điểm danh bulk lưu đúng · điểm/nhận xét lưu đúng · clone không dính điểm cũ · responsive mobile/desktop · dark mode.
