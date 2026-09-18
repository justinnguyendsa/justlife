# RUNBOOK P0 — 3 việc cần làm trước khi deploy

**Date:** 18092026 · **Cho:** chủ dự án (Minh) · **Nhánh:** `feat/p0-hardening`

> Làm theo đúng thứ tự A → B → C. Mỗi bước có phần **Kiểm chứng** — làm xong phải thấy
> đúng kết quả đó rồi mới sang bước sau. Nếu lệch, dừng lại chứ đừng đi tiếp.

---

## A. Tạo bucket Cloudflare R2 + khai biến trên Vercel

### A1. Tạo bucket

1. Vào <https://dash.cloudflare.com> → menu trái chọn **R2 Object Storage**.
2. Lần đầu dùng R2 sẽ phải thêm thẻ thanh toán (có hạn mức miễn phí 10 GB lưu trữ/tháng).
3. Bấm **Create bucket**.
   - **Bucket name:** `justlife-files`
   - **Location:** `Automatic` (hoặc `APAC` nếu có)
   - Bấm **Create bucket**.
4. Mở bucket vừa tạo → tab **Settings** → kiểm mục **Public access** phải là
   **Not allowed** (mặc định). ⚠️ Tuyệt đối **không** bật public access và **không** gắn
   custom domain — bucket này chứa bài nộp của học viên.

### A2. Lấy `R2_ACCOUNT_ID`

Ở trang R2, cột phải có mục **Account ID** — chuỗi 32 ký tự hex. Copy lại.

Cách khác: nhìn URL trên thanh địa chỉ
`https://dash.cloudflare.com/<ACCOUNT_ID>/r2/overview` — phần `<ACCOUNT_ID>` chính là nó.

### A3. Tạo API token

1. Trang R2 → bấm **Manage R2 API Tokens** (góc phải) → **Create API token**.
2. Điền:
   - **Token name:** `justlife-vercel`
   - **Permissions:** chọn **Object Read & Write** *(không chọn Admin)*
   - **Specify bucket:** chọn riêng `justlife-files` *(không để "All buckets")*
   - **TTL:** để mặc định hoặc đặt hạn tuỳ ý
3. Bấm **Create API Token**.
4. Màn hình kết quả hiện **một lần duy nhất** hai giá trị — copy ngay:
   - **Access Key ID** → dùng cho `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → dùng cho `R2_SECRET_ACCESS_KEY`

   Bỏ qua phần "S3 endpoint" — code tự dựng endpoint từ Account ID.

### A4. Khai 4 biến trên Vercel

Vào <https://vercel.com> → project **justlife** → **Settings** → **Environment Variables**.

Thêm lần lượt 4 biến:

| Name | Value | Environments |
|---|---|---|
| `R2_ACCOUNT_ID` | Account ID ở A2 | Production, Preview |
| `R2_ACCESS_KEY_ID` | Access Key ID ở A3 | Production, Preview |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key ở A3 | Production, Preview |
| `R2_BUCKET` | `justlife-files` | Production, Preview |

> ⚠️ **Bẫy quan trọng — chính là nguyên nhân sự cố đăng nhập vừa rồi.**
> Ô **Value** chỉ được chứa **đúng giá trị**, tuyệt đối không kèm ghi chú, dấu `#`,
> dấu nháy, hay khoảng trắng thừa ở cuối. Vercel lưu nguyên văn cả cụm.

### Kiểm chứng A

Sau khi lưu, ở danh sách Environment Variables bấm biểu tượng **con mắt** của từng biến,
đối chiếu độ dài:

- `R2_ACCOUNT_ID` — 32 ký tự, chỉ gồm `0-9a-f`
- `R2_BUCKET` — đúng `justlife-files`, 14 ký tự, không có khoảng trắng

---

## B. Kiểm `OWNER_EMAIL` trên Vercel

Đây là biến đã gây ra sự cố. Giá trị đúng phải **đúng 20 ký tự**: `minhnn2511@gmail.com`

1. Vẫn ở **Settings → Environment Variables**, tìm dòng `OWNER_EMAIL`.
2. Bấm **con mắt** để hiện giá trị.
3. Nhìn kỹ phần **sau** chữ `.com`. Nếu thấy bất kỳ thứ gì — dấu cách, `#`, chữ tiếng Việt
   như *"email Google bạn đăng nhập..."* — thì **đó là lỗi**.
4. Nếu sai: bấm **Edit**, xoá sạch ô Value, gõ lại đúng `minhnn2511@gmail.com`, **Save**.

### Kiểm chứng B

Sau khi deploy (bước D), nếu vẫn không đăng nhập được thì mở
**Vercel → project justlife → Logs**, lọc chữ `owner-signin`. Sẽ thấy dòng:

```
[owner-signin] REJECT { match: false, attemptEmailLen: 20, ownerEmailLen: 99, verified: true }
```

- `ownerEmailLen: 20` → biến đã đúng, lỗi nằm chỗ khác.
- `ownerEmailLen: 99` (hoặc bất kỳ số nào ≠ 20) → biến vẫn dính ghi chú, quay lại B3.

> Log này **không in email**, chỉ in độ dài — nên mở log cho người khác xem vẫn an toàn.

---

## C. Chạy migration LMS trên Turso

Turso đang thiếu 3 bảng: `tc_thread`, `tc_post`, `class_enrol_code`. Thiếu là mọi thao
tác forum và mã tự ghi danh sẽ lỗi lúc chạy.

> ⚠️ Script **không tự đọc file `.env`**. Chạy `npm run db:lms:migrate` trần là nó sửa
> file `lms.db` trên máy bạn chứ **không** phải Turso. Vì vậy phải truyền biến vào lệnh.
> Script giờ in rõ đích đến ở dòng đầu — **luôn đọc dòng đó trước khi tin kết quả**.

### C1. Lấy thông tin Turso

Giá trị đã có sẵn trong file `.env.turso.local` ở thư mục dự án (file này không lên git):

- `LMS_DATABASE_URL` — dạng `libsql://<tên-db>.turso.io`
- `LMS_DATABASE_AUTH_TOKEN` — chuỗi dài

### C2. Chạy migration (PowerShell — shell mặc định trên máy bạn)

Mở PowerShell tại thư mục dự án, chạy **từng khối một**:

```powershell
$env:LMS_DATABASE_URL = "libsql://<dien-ten-db>.turso.io"
$env:LMS_DATABASE_AUTH_TOKEN = "<dien-token>"
npm run db:lms:migrate
```

**Dòng đầu output phải là:**

```
Dich den: libsql://<ten-db>.turso.io   <<< REMOTE (Turso) >>>
```

Nếu thấy `<<< FILE LOCAL tren may ban >>>` thì biến chưa được nhận — dừng lại, kiểm tra
lại hai lệnh `$env:` phía trên.

### C3. Kiểm chứng C

```powershell
npm run db:lms:check
```

Kết quả đúng:

```
Dang kiem: libsql://<ten-db>.turso.io   <<< REMOTE (Turso) >>>

Bảng khai trong schema.ts : 32
Bảng có thật trong DB     : 32

✓ Không lệch: mọi bảng khai trong schema đều có trong DB.
```

Nếu báo `❌ LỆCH SCHEMA` kèm danh sách bảng thiếu → chạy lại C2.

### C4. Dọn biến khỏi phiên PowerShell

Làm xong nhớ xoá, tránh các lệnh sau vô tình chạy vào Turso:

```powershell
Remove-Item Env:LMS_DATABASE_URL, Env:LMS_DATABASE_AUTH_TOKEN
```

---

## D. Sau khi xong A, B, C

1. **Deploy lại.** Đổi biến môi trường **không** tự động deploy. Vào
   **Vercel → Deployments** → deployment mới nhất → menu `···` → **Redeploy**.
2. Chờ build xong, rồi chạy smoke test dưới đây.

### Smoke test sau deploy

| Việc | Kỳ vọng |
|---|---|
| Mở `https://justlife.vercel.app/login` → bấm **Đăng nhập với Google** → chọn `minhnn2511@gmail.com` | Vào thẳng `/today` |
| Thử lại bằng tài khoản `minhnn@ghn.vn` (cửa sổ ẩn danh) | Bị từ chối, hiện thông báo lỗi tiếng Việt |
| Vào `/teaching/classes` → mở một lớp → **Tài liệu** → tải một file lên | Tải lên xong, bấm tải về được |
| Mở Cloudflare R2 → bucket `justlife-files` | Thấy object mới nằm dưới `lms/materials/` |
| Mở `https://justlife.vercel.app/ui-kit` | Bị chặn (không phải trang tham chiếu) |

Nếu bước tải file báo lỗi 500 → mở Vercel Logs tìm chữ `object-store`. Thông báo sẽ nêu
đích danh biến nào còn thiếu.

---

## Còn lại — chưa làm, ghi để không quên

Danh sách đầy đủ ở `ADR-004-object-storage-r2.md`. Cần xong **trước khi nhận học viên thật**:

- [ ] Mã hoá nội dung file phía ứng dụng trước khi đẩy lên R2 (hiện chỉ dựa vào mã hoá
      phía Cloudflare)
- [ ] Đặt lifecycle rule cho bucket theo chính sách lưu trữ đã công bố
- [ ] Bổ sung R2 vào thông báo quyền riêng tư gửi học viên/phụ huynh
- [ ] Nối `deleteStudentCascade` với việc xoá object trên R2
