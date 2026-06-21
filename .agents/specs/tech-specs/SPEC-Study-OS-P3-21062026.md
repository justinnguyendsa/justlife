# Tech Spec — Study OS (học cao học) · Phase 3

**Date:** 21062026 · **Trụ:** #3 Study OS · **Status:** build · single-user, personal (personal.db, prefix `st_`).

## Phạm vi
Quản lý việc học Thạc sĩ Data Science của Minh: **Môn học** · **Bài tập/đồ án/quiz/thi** (deadline + trạng thái) · **Ghi chú/tài liệu** theo môn.
**Out of scope P3:** đồng bộ deadline học vào /deadlines & /today (fast-follow), lập lịch tự học tự động vào calendar (nút thủ công đủ), phân tích điểm yếu (P6).

## Data model (thêm personal.db)
| Bảng | Field |
|---|---|
| `st_course` | id, name, code?, term?, createdAt |
| `st_item` | id, courseId, title, kind(assignment/quiz/project/exam), dueAt?, status(todo/doing/done), createdAt, doneAt? |
| `st_note` | id, courseId, title, body?, url?(link tài liệu), createdAt |

Màu trụ học = `var(--module-study)` (violet).

## Server actions (`actions/study.ts`)
- `createCourse({name,code?,term?})` · `archiveCourse(id)` (xóa hẳn cho MVP: `deleteCourse`)
- `createItem({courseId,title,kind,dueAt?})` · `setItemStatus(id,courseId,status)` · `deleteItem(id,courseId)`
- `createNote({courseId,title,body?,url?})` · `deleteNote(id,courseId)`

## Queries (`db/study.ts`)
- `listCourses()` → course + itemCount + nextDueAt (bài gần hạn nhất chưa xong)
- `getCourseDetail(id)` → `{course, items, notes}`
- `getUpcomingStudy(now)` → các st_item chưa done, dueAt trong 14 ngày (cho summary trang /study)

## Màn hình (route `/study`, nav "Học tập")
1. **/study** — danh sách môn (card: tên, mã, kỳ, "N mục · bài gần nhất: …") + **Tạo môn**; khu "Sắp đến hạn" (item dueAt 14 ngày, chưa xong) gộp toàn bộ môn.
2. **/study/[id]** — chi tiết môn, 2 tab: **Bài tập/Đồ án** (list item: kind chip + deadline countdown + đổi trạng thái todo/doing/done + thêm/xóa) · **Ghi chú & tài liệu** (list note: tiêu đề + link + body; thêm/xóa).

## AC
- AC-S1 Tạo/xóa môn → danh sách cập nhật.
- AC-S2 Thêm item (chọn loại + deadline) → hiện countdown; đổi trạng thái; quá hạn → chip đỏ.
- AC-S3 "Sắp đến hạn" gộp item mọi môn theo deadline tăng dần.
- AC-S4 Ghi chú: thêm tiêu đề + link tài liệu + nội dung; mở link mới tab.
- AC-S5 Tiếng Việt, token-only, responsive, light/dark.

## Nav
Thêm mục **"Học tập"** vào personal nav (icon GraduationCap/BookOpen) → /study. (P4 sẽ gộp Học/Thói quen/Nghỉ thành hub "Phát triển".)
