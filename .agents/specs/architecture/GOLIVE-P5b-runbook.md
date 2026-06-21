# 🚀 Go-Live Runbook — P5b (đưa cổng học viên lên internet)

> Mục tiêu: học viên thật đăng nhập dùng cổng `/portal`. Vì là một codebase, deploy = mọi route public → phải bảo vệ Personal OS + khu Dạy học bằng đăng nhập chủ sở hữu. Dữ liệu học viên (PII, có thể minor) → nghĩa vụ pháp lý.

## Bước 0 — Quyết định nền (chốt trước)

**Chiến lược deploy (khuyến nghị: A):**
- **A. Deploy cả app + owner-auth (khuyến nghị):** Minh đăng nhập Google (chủ sở hữu) → Personal OS + Dạy học; học viên đăng nhập → chỉ `/portal`. Mọi thứ sau đăng nhập. Bonus: Minh dùng được app của mình từ mọi thiết bị. (Khớp quyết định "Turso sync" đã chọn từ P1.)
- B. Personal giữ local, chỉ portal lên cloud → phức tạp vận hành (1 codebase deploy 2 kiểu).

→ Runbook này theo **A**.

**Cần code thêm cho P5b (tôi làm — đánh dấu 🔧):**
- 🔧 Owner-auth: bảo vệ `(app)/*` + `/teaching/*` + `/api/teaching/*` + `/api/library/*` bằng đăng nhập chủ sở hữu (Google của Minh). Personal data + share-link không còn public.
- 🔧 Object storage adapter: file bài nộp (LMS) + file thư viện (Personal) hiện lưu đĩa → Vercel serverless KHÔNG giữ đĩa → chuyển Vercel Blob / R2 / S3.
- 🔧 Mã hóa field định danh cũ (`tc_student.name/email`) khi đẩy lên Turso (hiện plaintext local).
- 🔧 Google ↔ học viên: liên kết email Google với `tc_student` (chỉ email Minh cấp mới vào được lớp, chống người lạ tự tạo).
- 🔧 Rate-limit access-code → store bền (Turso) thay vì in-memory; consent notice versioned.

---

## Bước 1 — Turso (2 database cloud)
1. Tạo tài khoản https://turso.tech (free tier đủ cho lớp nhỏ).
2. Cài CLI: `curl -sSfL https://get.tur.so/install.sh | bash` (hoặc bản Windows/scoop).
3. `turso auth login`
4. Tạo 2 DB tách (R-JL-TWO-FACES):
   ```
   turso db create justlife-personal
   turso db create justlife-lms
   ```
5. Lấy URL + token cho TỪNG db (lưu lại):
   ```
   turso db show justlife-personal --url      # libsql://...
   turso db tokens create justlife-personal
   turso db show justlife-lms --url
   turso db tokens create justlife-lms
   ```
6. Tạo bảng trên cloud (chạy local trỏ vào Turso 1 lần):
   ```
   # tạm set env rồi chạy migrate (KHÔNG seed dữ liệu thật ngẫu nhiên)
   DATABASE_URL=<personal-url> DATABASE_AUTH_TOKEN=<personal-token> npm run db:migrate
   LMS_DATABASE_URL=<lms-url> LMS_DATABASE_AUTH_TOKEN=<lms-token> npm run db:lms:migrate
   ```
   (Dữ liệu local có thể import sau bằng `turso db shell ... < dump.sql` nếu muốn giữ.)

## Bước 2 — Google OAuth (đăng nhập)
1. https://console.cloud.google.com → tạo Project "justlife".
2. **APIs & Services → OAuth consent screen**: User type **External**; điền tên app, email hỗ trợ; scopes mặc định (email, profile); thêm email test nếu để Testing.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://<domain>` (+ `http://localhost:3000` để test).
   - Authorized redirect URIs: `https://<domain>/api/auth/callback/google` (+ `http://localhost:3000/api/auth/callback/google`).
4. Lưu **Client ID** + **Client Secret**.

## Bước 3 — Object storage (file bài nộp/tài liệu)
- Đơn giản nhất nếu deploy Vercel: **Vercel Blob** (Storage → Create → Blob → lấy `BLOB_READ_WRITE_TOKEN`).
- Hoặc **Cloudflare R2** / **AWS S3** (lấy access key/secret/bucket/endpoint).
- 🔧 Tôi viết adapter để storage đọc cấu hình này thay đĩa local.

## Bước 4 — Khóa bí mật production (KHÔNG dùng key dev trong .env)
Sinh khóa mới:
```
openssl rand -hex 32   # AUTH_SECRET
openssl rand -hex 32   # LMS_ENCRYPTION_KEY (32 byte = 64 hex)
openssl rand -hex 32   # LMS_INDEX_KEY
```
> Mất `LMS_ENCRYPTION_KEY` = mất dữ liệu định danh đã mã hóa. Lưu an toàn (password manager).

## Bước 5 — Đẩy code lên GitHub (Vercel cần repo)
```
cd "D:\My project\justlife"
git init && git add -A && git commit -m "justlife app"
# tạo repo PRIVATE trên GitHub rồi:
git remote add origin <repo-url> && git push -u origin main
```
> `.gitignore` đã loại `.env`, `local.db`, `lms.db`, `/data` — bí mật + dữ liệu KHÔNG lên git. ✅

## Bước 6 — Deploy Vercel + Env vars
1. https://vercel.com → New Project → import repo GitHub.
2. **Environment Variables** (Production) — set đủ:
   ```
   DATABASE_URL=<turso personal url>
   DATABASE_AUTH_TOKEN=<turso personal token>
   LMS_DATABASE_URL=<turso lms url>
   LMS_DATABASE_AUTH_TOKEN=<turso lms token>
   AUTH_SECRET=<hex>
   AUTH_URL=https://<domain>
   LMS_ENCRYPTION_KEY=<hex>
   LMS_INDEX_KEY=<hex>
   AUTH_GOOGLE_ID=<google client id>
   AUTH_GOOGLE_SECRET=<google client secret>
   OWNER_EMAIL=<email Google của Minh>      # để nhận diện chủ sở hữu
   BLOB_READ_WRITE_TOKEN=<nếu dùng Vercel Blob>
   ```
3. Deploy. Lấy domain → cập nhật lại redirect URI Google (Bước 2) cho đúng domain thật.

## Bước 7 — Trước khi nhận học viên THẬT (privacy gate)
- [ ] 🔧 Owner-auth đã chặn Personal + /teaching (test: ẩn danh không vào được).
- [ ] 🔧 File bài nộp/thư viện lên object storage (không mất khi redeploy).
- [ ] 🔧 Field định danh đã mã hóa trên Turso.
- [ ] Google login chỉ cho email đã được cấp vào lớp.
- [ ] **Consent phụ huynh** cho HV chưa thành niên (đã có cơ chế) + privacy notice tiếng Việt hiển thị.
- [ ] **Retention**: chốt số tháng giữ dữ liệu sau khi lớp xong.
- [ ] Duyệt rõ từng third-party giữ PII: Turso · Google · Vercel/Blob.
- [ ] **privacy-auditor chạy lại** trên cấu hình cloud → pass 6 blocker.
- [ ] Smoke test: Minh login (owner) thấy Personal+Dạy học; HV login thấy đúng portal của mình; HV khác không thấy chéo.

## Thứ tự đề xuất
B0 quyết → (tôi code 🔧 song song) → B1 Turso → B2 Google → B3 storage → B4 keys → B5 GitHub → B6 Vercel → B7 gate → bật cho 1 lớp thử trước.
