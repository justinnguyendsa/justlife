---
id: US-SEC-1.2
feature: Vá bảo mật cổng học viên (đăng nhập bằng mã, Gmail, tiến độ tài liệu)
date: 2026-10-13
source: khảo sát cổng học viên 13/10/2026 (chuẩn bị P2.6). Từng lỗi đã được xác minh trong code.
---

# US-SEC-1.2 — Mã cũ hết hiệu lực, Gmail phải đúng chủ, không ai khoá được cả lớp

**Là** Minh (giảng viên, giữ dữ liệu học viên, có học viên chưa thành niên), **tôi muốn** cổng học viên chặn được những lỗi sau:
- Cấp mã mới thì mã cũ không còn dùng được.
- Không ai gắn được Gmail của người khác vào tài khoản mình.
- Một người nhập sai mã không làm cả lớp bị khoá.
- Học viên chưa có đồng ý của phụ huynh không ghi được dữ liệu học tập.

**Để** dữ liệu học viên an toàn và lớp học không bị gián đoạn.

## Tiêu chí chấp nhận
**AC1 — Thu hồi mã.** Khi cấp mã mới cho một học viên, **mọi** mã trước đó của học viên ấy hết hiệu lực ngay, kể cả mã đã từng dùng để đăng nhập. Đăng nhập bằng mã cũ phải báo lỗi chung "Mã không hợp lệ hoặc đã hết hạn".

**AC2 — Chặn đoán mã theo từng nơi truy cập.**
- Nhập sai nhiều lần chỉ tạm khoá đúng nơi truy cập đó (theo địa chỉ IP).
- Học viên ở nơi khác vẫn đăng nhập bình thường.
- Vẫn còn một ngưỡng chung rất cao để chặn tấn công dồn dập.
- Thông báo lỗi vẫn là câu chung, không cho biết mã có tồn tại hay không.

**AC3 — Gmail phải được Google xác minh.**
- Không còn ô gõ địa chỉ Gmail.
- Bấm **Liên kết bằng Google** sẽ mở đăng nhập Google. Địa chỉ Gmail chỉ được gắn sau khi Google xác nhận học viên đang dùng đúng tài khoản đó.
- Gmail đã gắn với học viên khác thì báo lỗi, không gắn.
- Có nút **Gỡ liên kết**.

**AC4 — Quyền chủ sở hữu chỉ cho đúng email chủ.** Phiên đăng nhập chỉ có quyền chủ (vào Personal OS) khi email trùng `OWNER_EMAIL`. Mọi trường hợp khác không có quyền chủ, kể cả khi có lỗi ở bước trước.

**AC5 — Đánh dấu tài liệu đúng quyền.** Đánh dấu "đã học" một tài liệu chỉ được khi:
- học viên đã có đồng ý cần thiết (với học viên chưa thành niên), và
- tài liệu thuộc lớp của học viên và đang hiện cho lớp.

Sai một trong hai thì từ chối, kèm thông báo tiếng Việt.

## UAT
1. Cấp mã mới cho một học viên thử. Đăng nhập bằng mã cũ phải bị từ chối, mã mới thì vào được.
2. Từ máy A nhập sai mã 10 lần, máy A bị tạm khoá. Từ máy B (mạng khác) đăng nhập đúng mã thì vẫn vào được.
3. Học viên thử vào **Hồ sơ**, bấm **Liên kết bằng Google** và chọn tài khoản Google của mình. Quay lại thấy "Gmail đã liên kết · đã xác minh qua Google". Đăng xuất, rồi đăng nhập bằng Gmail thì vào đúng tài khoản học viên đó.
4. Bấm **Gỡ liên kết**: không đăng nhập bằng Gmail được nữa, mã truy cập vẫn dùng được.
5. Học viên đăng nhập bằng Gmail không vào được `/today` hay các trang của chủ.
