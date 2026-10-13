# QC Report — Perf P1 (13/10/2026)
Branch perf/p1-quick-wins (512e63d) vs main. Đối chiếu SPEC-Perf-P1 + US-Perf-P1.

## Verdict tổng: PASS có ghi chú

| Chiều | Verdict | Chi tiết |
|---|---|---|
| Typecheck | PASS | `npx tsc --noEmit` 0 lỗi |
| Test | PASS | vitest 4 file / 41 test qua |
| Lint | PASS | Chỉ lỗi cũ trên dòng không đổi (today:15, calendar:36 `Date.now()` có từ main; study/page.tsx:13, ClassDetailClient.tsx:345/519, db/lms/migrate*.ts). Không lỗi mới |
| Design token | PASS | loading.tsx không có màu; CSS `app-skel-*` chỉ kích thước, dùng `.skel`/`.card` sẵn có |
| Copy VN | PASS | "Đang tải…" |
| vercel.json | PASS | JSON hợp lệ, chỉ `regions: ["hnd1"]` |

| Task | Verdict | Ghi chú |
|---|---|---|
| T01 | PASS | getTodayData (4) và getCalendarData (3) dùng Promise.all, kết quả giữ nguyên |
| T02 | PASS | getUnifiedDeadlines Promise.all 3 truy vấn |
| T03 | PASS | today/page.tsx song song |
| T04 | PASS | calendar gom khoảng `day0..rangeEnd` rồi 1 đợt, điều kiện giống cũ; settings, study/[id] OK |
| T05 | PASS | listCourses 2 truy vấn + nhóm Map; getCourseDetail/getUpcomingStudy song song |
| T06 | PASS | listHabits có guard mảng rỗng; getRest lọc 7 ngày bằng inArray (tương đương lọc cũ) |
| T07 | PASS | listClasses groupBy count; lớp không có dòng -> 0 |
| T08 | PASS | Xem phân tích dưới |
| T09 | PASS | tests/unit/teaching-stats.test.ts, qua |
| T10 | PASS | loading.tsx + CSS; có thêm `prefers-reduced-motion` cho `.skel` (ngoài spec, vô hại) |
| T11 | PASS | |

## T08 — đối chiếu ngữ nghĩa với hàm cũ
- summary: % nộp lọc theo HV trong lớp và bài tập lớp (teaching-stats.ts:27-34); avgScore lấy mọi điểm của bài tập lớp, kể cả studentId null, giống getClassSummary. Mảng rỗng trả `{0}`/null đúng cũ.
- submissionStats: lọc HV trong lớp cả bài nộp lẫn điểm, đếm theo Set (nộp trùng chỉ tính 1) — khớp.
- studentProgress: `{}` khi 0 bài tập hoặc 0 HV; điểm null bỏ khỏi TB; làm tròn 1 chữ số — khớp.
- groupBy: mọi buổi/bài tập có khoá, mảng rỗng; tên file giải mã bằng cùng decName. Guard `length ? ... : []` tránh inArray rỗng.
- Thứ tự: getAttendance/getGrades/getSubmissions cũ không ORDER BY, nên không lệch.

## Promise.all phụ thuộc thứ tự?
Không có lỗi. Các chỗ "kiểm tra tồn tại rồi truy vấn" (getCourseDetail, getClassDetail, study/[id] với getFilesForCourse, classes/[id] với getFilesForClass + getClassMaterials) nay chạy truy vấn con trước khi biết lớp/môn tồn tại. Chỉ là đọc, lọc theo id, kết quả bị bỏ nếu null -> notFound(); không rò dữ liệu (app single-user, không có phân quyền theo tenant).

## Phát hiện
- Info: không có lỗi chặn. Với id không tồn tại, vài truy vấn đọc thừa (không đáng kể).
- Info: không chạy build/dev server theo yêu cầu.

## Fix list
Không có.
