# US — Phase 1 MVP: Quản lý Việc + Deadline
> Gắn Phase 1 roadmap (ADR-001). Persona duy nhất: **Minh** — DA + trợ giảng + học viên Thạc sĩ, dùng cả desktop lẫn điện thoại, hay suy nghĩ nhiều → nhảy việc, trễ deadline.
> Màu module: work = `--module-work` (cobalt). Stack: Next.js 15 + TS + libSQL/SQLite + Drizzle.

---

## US-01 — Capture: Thêm việc vào Inbox

### Story
As a Minh (chủ dự án),
I want thêm nhanh một việc mới vào inbox chỉ bằng tiêu đề (tối thiểu),
So that tôi không bao giờ quên việc giữa ngày — giảm tải tâm trí tức thì (trụ 1: Capture & Prioritize).

### Acceptance Criteria (đo được)
- [ ] AC-01-1: Given tôi ở bất kỳ trang nào, When tôi nhấn nút "Thêm việc" (hoặc phím tắt), Then một ô nhập tiêu đề hiện lên mà không cần rời trang.
- [ ] AC-01-2: Given ô nhập đang mở, When tôi gõ tiêu đề và nhấn Lưu/Enter, Then việc xuất hiện trong danh sách Inbox với trạng thái `inbox`, timestamp tạo chính xác.
- [ ] AC-01-3: Given tôi lưu việc thành công, When tôi xem danh sách Inbox, Then việc mới hiển thị ở đầu danh sách (sắp xếp mới nhất trước).
- [ ] AC-01-4: Given tôi cố lưu khi tiêu đề rỗng, Then hệ thống không tạo việc và hiển thị thông báo lỗi rõ ràng bằng tiếng Việt.
- [ ] AC-01-5: Given việc được tạo, Then dữ liệu lưu vào bảng `task` (cột: id, title, status='inbox', created_at) trong `personal.db`.
- [ ] AC-01-6: Given tôi dùng điện thoại, Then nút "Thêm việc" dễ bấm (kích thước tối thiểu 44×44px theo mobile-first), ô nhập không bị bàn phím che mất.

### UAT Test Steps (người thường test được)
1. Mở trang `/inbox` trên trình duyệt.
2. Bấm nút **"+ Thêm việc"** (hoặc nhấn phím tắt nếu có hiển thị gợi ý).
3. Expected: một ô nhập hiện ra, con trỏ tự vào ô.
4. Gõ "Viết báo cáo tuần" rồi nhấn **Enter** hoặc bấm **Lưu**.
5. Expected: ô nhập đóng lại; "Viết báo cáo tuần" xuất hiện ở đầu danh sách Inbox với trạng thái "Inbox".
6. Bấm **"+ Thêm việc"** lần nữa, để trống tiêu đề, bấm Lưu.
7. Expected: thông báo lỗi tiếng Việt hiện lên ("Vui lòng nhập tiêu đề"), KHÔNG tạo việc mới.
8. Kiểm tra trên điện thoại (hoặc Chrome DevTools chế độ mobile): nút "Thêm việc" bấm được dễ dàng, ô nhập không bị bàn phím che.

### Priority: P0

### Out of Scope
- Thêm nhiều trường ngay khi capture (note, deadline, effort, impact — sẽ làm ở US-02 Prioritize).
- Capture bằng giọng nói hoặc chia sẻ từ app khác.
- Capture offline (sẽ xử lý sau khi bật Turso sync).
- Phím tắt bàn phím toàn cục (global shortcut ngoài trình duyệt).

### Edge Cases
- **Tiêu đề quá dài** (>500 ký tự): cắt bớt hoặc hiện cảnh báo giới hạn — không treo app.
- **Mất kết nối khi lưu** (P1 = SQLite local nên hiếm, nhưng nếu Turso sync bật): hiển thị lỗi rõ, không mất dữ liệu đã nhập.
- **Nhập nhanh liên tiếp** (spam Enter): mỗi lần nhấn chỉ tạo 1 việc; debounce hoặc disable nút sau khi submit.
- **Tiêu đề chỉ toàn khoảng trắng**: xử lý như rỗng, không tạo việc.
- **Timezone**: `created_at` lưu theo UTC, hiển thị theo múi giờ hệ thống của Minh (Asia/Ho_Chi_Minh).

---

## US-02 — Capture: Xem và quản lý Inbox

### Story
As a Minh,
I want xem toàn bộ việc trong Inbox, lọc/tìm kiếm nhanh, và đánh dấu đã xử lý,
So that tôi biết mình đang có bao nhiêu việc cần phân loại và không bỏ sót (trụ 1: Capture & Prioritize).

### Acceptance Criteria (đo được)
- [ ] AC-02-1: Given tôi vào trang Inbox, Then tôi thấy danh sách tất cả task có status `inbox` hoặc `todo`, sắp xếp mặc định theo `created_at` mới nhất trước.
- [ ] AC-02-2: Given danh sách Inbox, When tôi tìm kiếm theo từ khóa, Then chỉ hiện task có tiêu đề chứa từ khóa đó (tìm kiếm phía client, không cần gọi API riêng).
- [ ] AC-02-3: Given một task trong Inbox, When tôi bấm vào task, Then tôi thấy chi tiết: tiêu đề, ghi chú (nếu có), deadline (nếu có), priority score (nếu đã set), trạng thái.
- [ ] AC-02-4: Given tôi xem chi tiết task, When tôi thay đổi trạng thái (inbox → todo → doing → done), Then trạng thái cập nhật ngay trên danh sách mà không cần reload trang.
- [ ] AC-02-5: Given Inbox rỗng (chưa có task nào), Then hiển thị empty state bằng tiếng Việt ("Inbox trống — thêm việc mới để bắt đầu"), không hiển thị màn hình trắng.
- [ ] AC-02-6: Given Inbox có >20 task, Then danh sách có phân trang hoặc infinite scroll — không render tất cả cùng lúc gây chậm.

### UAT Test Steps
1. Mở trang `/inbox`.
2. Expected: danh sách hiện tất cả task chưa done, sắp xếp mới nhất trước; nếu rỗng thì hiện thông báo tiếng Việt.
3. Nhập từ khóa vào ô tìm kiếm (ví dụ "báo cáo").
4. Expected: danh sách lọc ngay, chỉ hiện task có chứa "báo cáo" trong tiêu đề.
5. Bấm vào một task bất kỳ.
6. Expected: chi tiết task hiện ra (tiêu đề, ghi chú nếu có, deadline nếu có).
7. Thay đổi trạng thái task từ "Inbox" sang "Đang làm".
8. Expected: trạng thái cập nhật ngay, task có thể bị ẩn khỏi view inbox-only hoặc hiện label mới — không cần reload.
9. Xóa hết tất cả task (hoặc test trên DB trống).
10. Expected: thông báo empty state tiếng Việt, không lỗi, không màn hình trắng.

### Priority: P0

### Out of Scope
- Sắp xếp theo priority score (sẽ có sau US-03).
- Kéo thả để sắp xếp.
- Gắn nhãn/tag tùy chỉnh (parking lot).
- Xóa cứng task (chỉ archive — để bảo toàn event log cho P6).

### Edge Cases
- **Tìm kiếm unicode tiếng Việt**: "báo cáo" ≠ "bao cao" — tìm kiếm phân biệt dấu (default) hoặc không phân biệt (cần quyết định UX).
- **Rất nhiều task** (500+): phân trang/virtual scroll, không treo tab.
- **Task bị người dùng khác sửa đồng thời** (P1 single-user — không áp dụng, nhưng ghi chú cho P5).
- **Offline** (khi đã bật Turso sync): danh sách vẫn đọc từ bản local replica — ghi chú status "đang offline" nếu phát hiện.

---

## US-03 — Prioritize: Chấm điểm và sắp xếp độ ưu tiên

### Story
As a Minh,
I want chấm 3 trục (deadline/effort/impact) cho từng task và xem danh sách đã sắp xếp theo điểm ưu tiên tự động,
So that tôi biết việc nào cần làm trước mà không cần suy nghĩ lại mỗi sáng — giảm "nhảy việc" (trụ 1: Capture & Prioritize).

### Acceptance Criteria (đo được)
- [ ] AC-03-1: Given tôi mở chi tiết task, Then tôi thấy 3 trường có thể chỉnh: **Deadline** (ngày giờ), **Effort** (thang 1–5), **Impact** (thang 1–5).
- [ ] AC-03-2: Given tôi điền đủ 3 trường, When tôi lưu, Then `priority_score` được tính tự động theo công thức đã định nghĩa (deadline urgency × impact / effort) và lưu vào DB.
- [ ] AC-03-3: Given danh sách Inbox/Todo có nhiều task đã có priority_score, Then tôi có thể bấm "Sắp xếp theo ưu tiên" để xem task điểm cao nhất ở đầu.
- [ ] AC-03-4: Given task chưa có đủ 3 trục, Then `priority_score` = null, task vẫn hiển thị (không bị ẩn), và có badge "Chưa ưu tiên".
- [ ] AC-03-5: Given tôi thay đổi Effort hoặc Impact, Then `priority_score` tự cập nhật ngay không cần reload.
- [ ] AC-03-6: Given công thức tính điểm, Then kết quả nhất quán: cùng input → cùng output (deterministic); logic nằm trong `lib/priority.ts`.

### UAT Test Steps
1. Mở chi tiết một task (bấm vào task từ Inbox).
2. Expected: thấy 3 trường: "Hạn chót" (date-time picker), "Công sức" (1–5), "Tác động" (1–5).
3. Chọn Hạn chót = ngày mai, Công sức = 2, Tác động = 5. Bấm Lưu.
4. Expected: điểm ưu tiên tự động hiện (ví dụ "87/100" hoặc bất kỳ hiển thị có ý nghĩa) mà không cần tính tay.
5. Quay lại Inbox, bấm "Sắp xếp theo ưu tiên".
6. Expected: task vừa chấm điểm cao hiện lên trước so với task chưa chấm hoặc điểm thấp.
7. Mở một task khác, để trống Công sức. Bấm Lưu.
8. Expected: task đó hiện badge "Chưa ưu tiên", vẫn xuất hiện trong danh sách.

### Priority: P0

### Out of Scope
- Điểm ưu tiên do AI tự động đề xuất (parking lot, cần Python analytics P6).
- Kéo thả để đổi thứ tự thủ công.
- Gán nhãn khẩn cấp tùy chỉnh ngoài 3 trục.

### Edge Cases
- **Effort = 0 hoặc null**: tránh chia cho 0 trong công thức — xử lý gracefully (score = null hoặc max).
- **Deadline trong quá khứ**: task vẫn hiển thị, cộng thêm badge "Quá hạn" màu đỏ.
- **Deadline = hôm nay** vs **ngày mai**: công thức phải phân biệt rõ urgency (không để 2 giá trị bằng nhau).
- **Nhiều task cùng điểm tuyệt đối**: tie-break bằng `created_at` (task tạo trước hiện trước).
- **Múi giờ deadline**: lưu UTC, tính urgency theo múi giờ Asia/Ho_Chi_Minh để không bị lệch 7 tiếng.

---

## US-04 — Prioritize: WIP-limit và Focus mode

### Story
As a Minh,
I want giới hạn số việc "Đang làm" (WIP-limit) và có chế độ Focus hiển thị 1 việc duy nhất,
So that tôi không nhảy nhiều việc cùng lúc và làm dứt điểm từng cái (trụ 1: Capture & Prioritize).

### Acceptance Criteria (đo được)
- [ ] AC-04-1: Given tôi cấu hình WIP-limit (mặc định = 3), When số task ở trạng thái `doing` đã bằng hoặc vượt limit, Then hệ thống hiển thị cảnh báo và ngăn chuyển task mới sang `doing` (với option override có xác nhận).
- [ ] AC-04-2: Given tôi vào Focus mode, Then chỉ hiển thị 1 task ưu tiên cao nhất hiện tại (hoặc task tôi tự chọn); màn hình tối giản — không hiện sidebar, không hiện danh sách.
- [ ] AC-04-3: Given tôi đang ở Focus mode, When task done, Then hệ thống tự hiện task tiếp theo theo thứ tự ưu tiên.
- [ ] AC-04-4: Given tôi thay đổi WIP-limit (1–10), Then giá trị được lưu và áp dụng ngay ở phiên tiếp theo.
- [ ] AC-04-5: Given WIP-limit bị vượt (do dữ liệu cũ), Then hiển thị số lượng hiện tại vs limit rõ ràng (ví dụ "4/3 đang làm — quá giới hạn").

### UAT Test Steps
1. Chuyển 3 task sang trạng thái "Đang làm".
2. Thử chuyển task thứ 4 sang "Đang làm".
3. Expected: cảnh báo tiếng Việt hiện ra ("Bạn đang có 3 việc — đã đạt giới hạn WIP. Tiếp tục?") với nút Hủy và Vẫn thêm.
4. Bấm Hủy. Expected: task thứ 4 vẫn ở trạng thái cũ.
5. Vào trang cài đặt, đổi WIP-limit thành 5. Lưu.
6. Thử lại bước 2. Expected: không còn cảnh báo vì giới hạn mới là 5.
7. Bấm nút **"Focus"** từ danh sách task.
8. Expected: màn hình chỉ hiện 1 task ưu tiên cao nhất, không có sidebar, không có list.
9. Đánh dấu task đó Done trong Focus mode.
10. Expected: tự động chuyển sang task tiếp theo theo điểm ưu tiên.

### Priority: P1

### Out of Scope
- Pomodoro timer trong Focus mode (parking lot).
- WIP-limit theo loại task (work/teach/study).
- Thông báo push khi vượt WIP.

### Edge Cases
- **Tất cả task đã done** khi vào Focus mode: hiển thị empty state "Không còn việc cần làm — nghỉ ngơi xứng đáng!".
- **WIP-limit = 1** (cực đoan): vẫn hoạt động — chỉ cho phép 1 task `doing` tại một thời điểm.
- **Offline trong Focus mode**: task đang focus vẫn đọc/ghi từ local replica — không mất trạng thái.

---

## US-05 — Time-block: Xếp lịch làm việc né khối cố định

### Story
As a Minh,
I want kéo task vào lịch ngày/tuần và hệ thống tự cảnh báo khi xếp vào khối giờ cố định (làm/dạy/học),
So that lịch của tôi tôn trọng thực tế — không tự hứa làm việc lúc đang họp hay đang dạy (trụ 2: Time-block & Deadline Guard).

### Acceptance Criteria (đo được)
- [ ] AC-05-1: Given tôi vào trang Today/lịch tuần, Then tôi thấy các khối cố định đã cấu hình (màu phân biệt, label rõ ràng bằng tiếng Việt) và các time-block đã tạo.
- [ ] AC-05-2: Given tôi kéo/thả hoặc bấm để tạo time-block trùng khối cố định, Then hệ thống hiển thị cảnh báo rõ ràng ("Khung giờ này trùng [Làm việc 8:30–18:00] — bạn có chắc không?") và yêu cầu xác nhận.
- [ ] AC-05-3: Given tôi tạo time-block hợp lệ (không trùng cố định), Then block được lưu vào bảng `time_block` với start_at, end_at, task_id (nếu gắn task), kind, is_fixed=false.
- [ ] AC-05-4: Given một time-block đã tạo, When tôi sửa giờ, Then kiểm tra lại xung đột cố định trước khi lưu.
- [ ] AC-05-5: Given tôi xem lịch hôm nay, Then khối cố định hiển thị màu `--module-work` (cobalt) và không thể kéo/xóa.
- [ ] AC-05-6: Given lịch hiển thị, Then múi giờ luôn là Asia/Ho_Chi_Minh — không hiển thị giờ UTC.

### UAT Test Steps
1. Mở trang `/today` (lịch hôm nay).
2. Expected: thấy ít nhất 1 khối cố định màu cobalt (ví dụ "Làm việc 8:30–18:00").
3. Thử tạo time-block bằng cách bấm vào ô giờ **9:00–10:00** (trong giờ làm).
4. Expected: cảnh báo tiếng Việt hiện ra về xung đột khối cố định; có nút Hủy và Vẫn tạo.
5. Bấm Hủy. Expected: không có time-block nào được tạo tại 9:00.
6. Tạo time-block tại **19:00–20:00** (ngoài giờ cố định).
7. Expected: time-block được tạo và hiển thị trên lịch, không có cảnh báo.
8. Thử kéo time-block vừa tạo vào **9:00–10:00**.
9. Expected: cảnh báo xung đột hiện lại; nếu xác nhận thì block di chuyển, nếu hủy thì giữ nguyên 19:00.

### Priority: P0

### Out of Scope
- Đồng bộ với Google Calendar / Outlook.
- Tạo time-block lặp lại (recurrence) cho task cá nhân — khối cố định đã dùng rrule, nhưng task time-block lặp thì để sau.
- Gợi ý tự động slot trống (parking lot — cần thuật toán riêng).

### Edge Cases
- **Khối cố định lịch dạy linh hoạt** (không cố định ngày): cần handle rrule linh hoạt hoặc cho phép nhập tay từng buổi.
- **Time-block kéo qua nửa đêm** (23:00–01:00): hiển thị đúng trên 2 ngày, không bị lệch timeline.
- **Múi giờ thiết bị khác múi giờ server** (ví dụ Minh dùng máy thiết lập UTC): luôn hiển thị và lưu theo Asia/Ho_Chi_Minh.
- **Offline**: time-block đọc từ local replica — lịch hôm nay vẫn hiển thị đúng.
- **Hai time-block cùng giờ** (không liên quan cố định): cảnh báo xung đột giữa các block người dùng tạo.
- **Ngày nghỉ lễ**: không xử lý P1 (parking lot), nhưng không được crash.

---

## US-06 — Time-block: Cấu hình khối lịch cố định

### Story
As a Minh,
I want nhập và chỉnh sửa các khối lịch cố định (giờ làm, dạy, học cao học) một lần,
So that hệ thống biết những lúc nào tôi không thể nhận thêm việc — không phải nhắc lại mỗi ngày (trụ 2: Time-block & Deadline Guard).

### Acceptance Criteria (đo được)
- [ ] AC-06-1: Given tôi vào trang Cài đặt > Lịch cố định, Then tôi thấy danh sách khối cố định hiện có (có thể rỗng nếu lần đầu dùng).
- [ ] AC-06-2: Given tôi thêm khối mới, When điền label, giờ bắt đầu, giờ kết thúc, các ngày trong tuần lặp lại, Then khối được lưu vào bảng `fixed_schedule` với rrule đúng.
- [ ] AC-06-3: Given khối đã lưu, Then nó hiển thị trên lịch ngày/tuần ở tất cả ngày tương ứng theo rrule.
- [ ] AC-06-4: Given tôi sửa hoặc xóa khối cố định, Then thay đổi phản ánh ngay trên lịch (không cần reload).
- [ ] AC-06-5: Given tôi thêm khối với giờ bắt đầu ≥ giờ kết thúc, Then hệ thống báo lỗi tiếng Việt ("Giờ kết thúc phải sau giờ bắt đầu"), không lưu.
- [ ] AC-06-6: Given 3 khối mặc định (làm 8:30–18:00 T2–T6; dạy tối linh hoạt; học cuối tuần), Then khi khởi tạo lần đầu hệ thống gợi ý preset này để Minh chỉnh sửa cho phù hợp.

### UAT Test Steps
1. Mở trang **Cài đặt** > **Lịch cố định**.
2. Expected: lần đầu mở, hiển thị 3 preset gợi ý (làm / dạy / học) để chỉnh sửa; hoặc danh sách rỗng với nút Thêm.
3. Bấm Thêm khối mới. Điền: Label = "Làm việc", Giờ bắt đầu = 8:30, Giờ kết thúc = 18:00, Các ngày = T2–T6.
4. Bấm Lưu.
5. Expected: khối "Làm việc" hiện trong danh sách và xuất hiện trên lịch hôm nay (nếu hôm nay là T2–T6).
6. Sửa giờ kết thúc thành 17:30. Lưu.
7. Expected: lịch cập nhật ngay — khối màu cobalt kết thúc lúc 17:30 thay vì 18:00.
8. Thử nhập giờ bắt đầu = 18:00, giờ kết thúc = 8:30.
9. Expected: thông báo lỗi tiếng Việt, không lưu được.
10. Xóa khối. Expected: khối biến mất khỏi danh sách và khỏi lịch ngay.

### Priority: P0

### Out of Scope
- Import lịch từ file iCal/.ics.
- Đồng bộ lịch 2 chiều với Google Calendar.
- Khối cố định theo tháng hoặc năm (chỉ hàng tuần lặp lại trong P1).

### Edge Cases
- **Rrule qua nửa đêm** (shift đêm 22:00–06:00): hiển thị đúng trên 2 ngày.
- **Hai khối cố định trùng nhau**: cảnh báo khi tạo/sửa — không block cứng nhưng phải warn.
- **Ngày đặc biệt không lặp** (ví dụ dạy đột xuất 1 ngày): P1 chưa hỗ trợ exception ngày — ghi rõ Out of Scope; không crash khi gặp.
- **Múi giờ**: tất cả giờ cố định lưu và hiển thị theo Asia/Ho_Chi_Minh.
- **Xóa khối cố định đã có time-block gắn vào**: time-block cá nhân không bị xóa theo — chỉ mất cảnh báo xung đột.

---

## US-07 — Deadline Guard: Cảnh báo deadline đa mốc

### Story
As a Minh,
I want nhận cảnh báo deadline theo nhiều mốc trước hạn (7 ngày / 3 ngày / 1 ngày / hôm nay),
So that tôi không bao giờ bị bất ngờ bởi deadline vào phút chót — tránh tăng ca (trụ 2: Time-block & Deadline Guard).

### Acceptance Criteria (đo được)
- [ ] AC-07-1: Given task có deadline, Then hệ thống tự tính và lưu 4 mốc cảnh báo: T-7, T-3, T-1, T-0 vào bảng `deadline`.
- [ ] AC-07-2: Given đến đúng mốc cảnh báo (hoặc mở app sau mốc), Then banner/badge cảnh báo hiện rõ trên trang Inbox và trang Deadlines.
- [ ] AC-07-3: Given task quá hạn (deadline < now), Then badge "Quá hạn" màu đỏ hiển thị, và task được ghim đầu danh sách Deadlines.
- [ ] AC-07-4: Given tôi xem trang `/deadlines`, Then tôi thấy tất cả task có deadline sắp tới (7 ngày tới) và quá hạn, sắp xếp theo deadline gần nhất trước.
- [ ] AC-07-5: Given task đã done, Then cảnh báo deadline của task đó tắt (không hiện nữa).
- [ ] AC-07-6: Given tôi sửa deadline của task, Then các mốc cảnh báo được tính lại tự động.

### UAT Test Steps
1. Tạo task "Nộp báo cáo tháng" với deadline = 3 ngày nữa (ví dụ 24/06/2026).
2. Mở trang `/deadlines`.
3. Expected: task "Nộp báo cáo tháng" hiện trong danh sách với badge "Còn 3 ngày" (hoặc tương tự).
4. Sửa deadline thành **ngày hôm nay** (21/06/2026).
5. Expected: badge chuyển thành "Hôm nay" và task được ưu tiên hiển thị nổi bật (màu khác hoặc to hơn).
6. Sửa deadline thành **ngày hôm qua** (20/06/2026).
7. Expected: badge "Quá hạn" màu đỏ, task ghim đầu danh sách.
8. Đánh dấu task đó Done.
9. Expected: task biến mất khỏi danh sách cảnh báo (hoặc hiện trong mục "Đã xong").

### Priority: P0

### Out of Scope
- Thông báo push/notification ra ngoài app (cần service worker / server push — để P2).
- Deadline cho habit (trụ 4, Phase 4).
- Deadline lặp lại (recurring deadline).
- Email/Slack alert.

### Edge Cases
- **Deadline đúng 00:00 đêm**: tính là hôm đó hay hôm trước? Quy ước rõ: deadline = ngày thì mặc định 23:59:59 ngày đó (Asia/Ho_Chi_Minh).
- **Múi giờ**: tính mốc T-7/T-3/T-1 theo Asia/Ho_Chi_Minh, không phải UTC — nếu không Minh có thể nhận cảnh báo lúc 7 giờ sáng thay vì đêm hôm trước.
- **Sửa deadline liên tục**: mỗi lần sửa rebuild lại bảng `deadline` — không duplicate mốc cũ.
- **Task không có deadline**: không hiện trong trang Deadlines, không gây lỗi.
- **Offline khi qua mốc deadline**: lần mở app tiếp theo (online hoặc offline với local replica) vẫn tính đúng mốc và hiển thị cảnh báo.

---

## US-08 — Deadline Guard: Escalation khi deadline cận

### Story
As a Minh,
I want task deadline cực gần (T-0 hoặc quá hạn) tự leo thang lên đầu danh sách và hiện màu khẩn,
So that tôi không thể bỏ qua deadline quan trọng dù đang bận nhiều việc (trụ 2: Time-block & Deadline Guard).

### Acceptance Criteria (đo được)
- [ ] AC-08-1: Given task có `deadline` trong vòng 24 giờ (T-0), Then `escalation_level` = 2 và task hiện màu cảnh báo (dùng `--accent` amber) trên mọi danh sách.
- [ ] AC-08-2: Given task quá hạn, Then `escalation_level` = 3 và task hiện màu đỏ (error token), ghim cố định đầu trang Inbox và Deadlines.
- [ ] AC-08-3: Given task escalation level 2 hoặc 3, When tôi vào trang Today/lịch, Then task đó hiện badge rõ ràng ngay trên lịch (không chỉ ở danh sách riêng).
- [ ] AC-08-4: Given tôi đã xác nhận "đã biết" (snooze) một escalation, Then badge không biến mất hoàn toàn mà chuyển sang trạng thái mờ hơn trong 1 tiếng — sau đó hiện lại.
- [ ] AC-08-5: Given `escalation_level` thay đổi, Then thay đổi lưu vào DB và phản ánh ngay ở lần mở app tiếp theo.

### UAT Test Steps
1. Tạo task với deadline = **2 tiếng nữa**.
2. Mở trang Inbox.
3. Expected: task đó có badge màu vàng/amber ("Còn 2 tiếng") và hiển thị ở vị trí nổi bật.
4. Kiểm tra trang `/today` (lịch hôm nay).
5. Expected: task cũng có badge cảnh báo trên view lịch.
6. Bấm "Snooze 1 tiếng" (nếu nút tồn tại) hoặc bấm "Đã biết".
7. Expected: badge mờ đi trong 1 tiếng; task không biến mất.
8. Chỉnh deadline task thành **1 tiếng trước** (quá hạn).
9. Expected: badge chuyển màu đỏ, task ghim đầu danh sách Inbox.

### Priority: P1

### Out of Scope
- Escalation tự động gửi email / Slack / SMS.
- Escalation cho task chưa có deadline.
- Snooze tùy chỉnh thời gian (P1 chỉ fix 1 tiếng).

### Edge Cases
- **Snooze rồi app bị đóng, mở lại**: kiểm tra thời điểm snooze hết hạn theo `snooze_until` lưu trong DB — không bị reset snooze.
- **Nhiều task escalation cùng lúc** (>5): hiển thị tất cả, không collapse ẩn — Minh cần thấy hết.
- **Timezone**: T-0 = 24 giờ tính từ thời điểm hiện tại theo Asia/Ho_Chi_Minh.

---

## US-09 — Foundation: Màn hình chính (Today view)

### Story
As a Minh,
I want một trang "Hôm nay" hiện tổng quan: việc đang làm, deadline cận, lịch hôm nay,
So that mỗi sáng tôi mở app 1 lần và biết ngay mình cần làm gì — không phải mở 3 tab khác nhau (trụ 1 + 2: Capture & Prioritize + Time-block).

### Acceptance Criteria (đo được)
- [ ] AC-09-1: Given tôi mở trang `/today`, Then tôi thấy: (a) task `doing` hiện tại, (b) task ưu tiên cao nhất chưa bắt đầu, (c) deadline trong 24 giờ, (d) time-block hôm nay theo giờ.
- [ ] AC-09-2: Given trang Today, When không có task `doing`, Then hiện gợi ý "Task tiếp theo cần làm" từ danh sách ưu tiên.
- [ ] AC-09-3: Given trang Today, Then load trong < 2 giây trên kết nối 4G thông thường (hoặc local replica).
- [ ] AC-09-4: Given trang Today trên điện thoại (màn hình < 430px), Then tất cả thông tin quan trọng hiển thị không cần cuộn quá 2 màn hình.
- [ ] AC-09-5: Given Today rỗng hoàn toàn (ngày nghỉ, không có gì), Then hiện thông báo tiếng Việt tích cực, không hiện màn hình trắng/lỗi.

### UAT Test Steps
1. Mở `/today` sau khi đã tạo sẵn: 1 task đang làm, 2 task ưu tiên cao, 1 deadline hôm nay, 2 time-block.
2. Expected: tất cả 4 phần trên đều hiển thị rõ, phân biệt bằng section header tiếng Việt.
3. Kiểm tra trên điện thoại (hoặc Chrome DevTools viewport 390px).
4. Expected: thông tin quan trọng hiển thị không cần cuộn quá 2 màn hình.
5. Xóa hết tất cả task và time-block.
6. Mở lại `/today`.
7. Expected: thông báo tiếng Việt khích lệ, không lỗi, không màn trắng.

### Priority: P0

### Out of Scope
- Widget/shortcut ngoài trình duyệt (native app — parking lot).
- Customization layout của Today view.
- Tích hợp thời tiết hoặc tin tức.

### Edge Cases
- **Không có task nào, không có time-block**: empty state có nội dung, không crash.
- **Nhiều deadline quá hạn cùng lúc** (>5): hiện tất cả hoặc rút gọn có expand — không mất thông tin.
- **Múi giờ**: "hôm nay" tính theo Asia/Ho_Chi_Minh; không hiện task/deadline của ngày khác.
- **Offline** (khi đã bật sync): Today view đọc từ local replica — hiện banner "Đang offline" nhỏ, nội dung vẫn đúng.

---

## Bảng tổng hợp AC

| ID | Story | AC | Mô tả 1 dòng | Trụ |
|---|---|---|---|---|
| AC-01-1 | US-01 | 1 | Nút "Thêm việc" mở ô nhập inline không rời trang | capture |
| AC-01-2 | US-01 | 2 | Lưu task với tiêu đề → vào Inbox ngay | capture |
| AC-01-3 | US-01 | 3 | Task mới xuất hiện đầu danh sách | capture |
| AC-01-4 | US-01 | 4 | Tiêu đề rỗng → không lưu, hiện lỗi tiếng Việt | capture |
| AC-01-5 | US-01 | 5 | Dữ liệu lưu đúng bảng `task` personal.db | capture |
| AC-01-6 | US-01 | 6 | Nút ≥44px, ô nhập không bị bàn phím mobile che | capture |
| AC-02-1 | US-02 | 1 | Inbox hiển thị đúng task inbox+todo, mới nhất trước | capture |
| AC-02-2 | US-02 | 2 | Tìm kiếm phía client lọc theo tiêu đề | capture |
| AC-02-3 | US-02 | 3 | Chi tiết task hiện đủ fields | capture |
| AC-02-4 | US-02 | 4 | Đổi trạng thái cập nhật ngay không reload | capture |
| AC-02-5 | US-02 | 5 | Empty state tiếng Việt khi Inbox rỗng | capture |
| AC-02-6 | US-02 | 6 | Phân trang/scroll khi >20 task | capture |
| AC-03-1 | US-03 | 1 | Chi tiết task hiện 3 trường: Deadline, Effort, Impact | capture |
| AC-03-2 | US-03 | 2 | Lưu 3 trục → tính priority_score tự động | capture |
| AC-03-3 | US-03 | 3 | Sắp xếp theo ưu tiên hoạt động | capture |
| AC-03-4 | US-03 | 4 | Task thiếu trục → badge "Chưa ưu tiên", vẫn hiện | capture |
| AC-03-5 | US-03 | 5 | Đổi Effort/Impact → score cập nhật ngay | capture |
| AC-03-6 | US-03 | 6 | Công thức deterministic, logic trong priority.ts | capture |
| AC-04-1 | US-04 | 1 | WIP-limit chặn thêm task doing khi đạt giới hạn | capture |
| AC-04-2 | US-04 | 2 | Focus mode hiện 1 task, tối giản | capture |
| AC-04-3 | US-04 | 3 | Done trong Focus → tự chuyển task tiếp theo | capture |
| AC-04-4 | US-04 | 4 | WIP-limit lưu và áp dụng qua session | capture |
| AC-04-5 | US-04 | 5 | Hiện rõ X/limit khi vượt giới hạn | capture |
| AC-05-1 | US-05 | 1 | Khối cố định hiển thị đúng trên lịch ngày/tuần | time-block |
| AC-05-2 | US-05 | 2 | Cảnh báo khi tạo time-block trùng cố định | time-block |
| AC-05-3 | US-05 | 3 | Time-block hợp lệ lưu đúng bảng time_block | time-block |
| AC-05-4 | US-05 | 4 | Sửa time-block → kiểm tra lại xung đột | time-block |
| AC-05-5 | US-05 | 5 | Khối cố định màu cobalt, không kéo/xóa được | time-block |
| AC-05-6 | US-05 | 6 | Lịch hiển thị đúng Asia/Ho_Chi_Minh, không UTC | time-block |
| AC-06-1 | US-06 | 1 | Trang cài đặt hiện danh sách khối cố định | time-block |
| AC-06-2 | US-06 | 2 | Thêm khối → lưu đúng bảng fixed_schedule với rrule | time-block |
| AC-06-3 | US-06 | 3 | Khối lưu hiển thị đúng ngày theo rrule trên lịch | time-block |
| AC-06-4 | US-06 | 4 | Sửa/xóa khối → lịch cập nhật ngay | time-block |
| AC-06-5 | US-06 | 5 | Giờ kết thúc ≤ giờ bắt đầu → lỗi tiếng Việt, không lưu | time-block |
| AC-06-6 | US-06 | 6 | Lần đầu dùng → gợi ý 3 preset khối cố định | time-block |
| AC-07-1 | US-07 | 1 | Tạo task có deadline → sinh 4 mốc T-7/T-3/T-1/T-0 | time-block |
| AC-07-2 | US-07 | 2 | Đến mốc → banner/badge cảnh báo hiện trên Inbox và Deadlines | time-block |
| AC-07-3 | US-07 | 3 | Quá hạn → badge đỏ + ghim đầu danh sách | time-block |
| AC-07-4 | US-07 | 4 | Trang /deadlines hiện task 7 ngày tới + quá hạn | time-block |
| AC-07-5 | US-07 | 5 | Task done → cảnh báo tắt | time-block |
| AC-07-6 | US-07 | 6 | Sửa deadline → mốc cảnh báo tính lại | time-block |
| AC-08-1 | US-08 | 1 | T-0 (24h) → escalation_level=2, màu amber | time-block |
| AC-08-2 | US-08 | 2 | Quá hạn → escalation_level=3, màu đỏ, ghim đầu | time-block |
| AC-08-3 | US-08 | 3 | Badge escalation hiện trên lịch Today view | time-block |
| AC-08-4 | US-08 | 4 | Snooze "đã biết" → badge mờ 1 tiếng rồi hiện lại | time-block |
| AC-08-5 | US-08 | 5 | escalation_level lưu DB, phản ánh khi mở lại app | time-block |
| AC-09-1 | US-09 | 1 | Today hiện đủ 4 section: doing / ưu tiên / deadline 24h / lịch | capture + time-block |
| AC-09-2 | US-09 | 2 | Không có doing → gợi ý task tiếp theo | capture |
| AC-09-3 | US-09 | 3 | Today load < 2 giây | capture |
| AC-09-4 | US-09 | 4 | Mobile 430px → đủ thông tin trong ≤2 màn hình cuộn | capture |
| AC-09-5 | US-09 | 5 | Today rỗng → empty state tiếng Việt, không lỗi | capture |
