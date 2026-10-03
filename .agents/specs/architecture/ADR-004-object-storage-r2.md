# ADR-004: Object storage cho file — Cloudflare R2

**Status:** Accepted *(chủ dự án chốt trong phiên P0, 18092026)*
**Date:** 18092026
**Author:** architect (justlife)
**Kế thừa:** ADR-001 (one-app-two-faces, Next.js 15 trên Vercel) · ADR-002 (`lms.db` tách riêng, crypto AES-256-GCM + blind-index)
**Liên quan:** P0-T04 · `LMS-PLATFORM-PLAN.md` mục 5.4 (object storage adapter, đánh dấu 🔴 blocker)
**Gate:** `privacy-auditor` — bên thứ ba giữ dữ liệu cá nhân, bắt buộc chủ dự án duyệt theo R-JL-PRIVACY-01 / R-JL-LOCAL-FIRST-01.

> Giải thích song ngữ (R-JL-DUAL-LANG-EXPLAIN-01): 🛠️ *kỹ thuật* · 🗣️ *bình dân*.

---

## Bối cảnh — vì sao buộc phải quyết bây giờ

🛠️ Toàn bộ file trong app được ghi thẳng ra đĩa bằng `fs` vào thư mục `data/`:
`src/lib/storage.ts` (thư viện cá nhân) và `src/lib/lms/storage.ts` (bài nộp + tài liệu lớp).

Vercel chạy serverless: **đĩa chỉ-đọc**, và phần ghi được (`/tmp`) không tồn tại giữa các
lần gọi. Nghĩa là trên production:

- Nộp bài / tải tài liệu lên → lỗi ghi đĩa, hoặc ghi vào `/tmp` rồi **mất ngay**.
- File đã có → mất sau mỗi lần deploy.

Chính comment trong `src/lib/lms/storage.ts` bản cũ đã ghi nhận điều này
(*"⚠ go-live: Vercel serverless KHÔNG giữ đĩa → cần object storage adapter"*) nhưng
hạng mục vẫn được đánh dấu **xong** trong `LMS-PLATFORM-PLAN.md`. Audit P0 phát hiện
khoảng cách này.

🗣️ App đang cất file vào ngăn kéo của máy chủ, mà máy chủ trên mạng thì không có ngăn kéo
— cất xong là mất. Với hàng trăm học viên MindX sắp dùng, đây là chặn cứng.

---

## Quyết định

Dùng **Cloudflare R2** làm object storage cho cả hai mặt, qua một adapter chung
`src/lib/object-store.ts`.

### Vì sao R2, không phải Vercel Blob

| | Vercel Blob | **Cloudflare R2** |
|---|---|---|
| Tích hợp | Cùng nhà, nhanh hơn ~2 giờ | SDK S3-compatible |
| Phí egress | Có | **Không có** |
| Chi phí ở quy mô hàng trăm HV | Đắt hơn rõ rệt | Rẻ hơn |
| Khoá nhà cung cấp | Gắn với Vercel | S3-compatible → đổi sang S3/MinIO không phải viết lại |

Chủ dự án chốt R2 vì quy mô dự kiến là **hàng trăm học viên MindX**, nơi phí egress và
khả năng đổi nhà cung cấp quan trọng hơn 2 giờ tích hợp.

### Ràng buộc kỹ thuật kèm theo

1. **Fail-fast, không im lặng rơi về đĩa.** `storeKind()` ném lỗi khi:
   - production mà thiếu toàn bộ biến `R2_*`, hoặc
   - khai nửa vời (có biến này thiếu biến kia — gần như chắc chắn gõ sót).

   🗣️ Quên khai địa chỉ kho thì app báo lỗi ngay, chứ không cất tạm rồi làm mất đồ học viên.

2. **Giữ nguyên hai mặt (R-JL-TWO-FACES-01).** Tiền tố key tách bạch:
   `library/…` (cá nhân) vs `lms/submissions/…`, `lms/materials/…`.
   Hỗ trợ **bucket riêng** cho LMS qua `R2_LMS_BUCKET` nếu muốn tách triệt để hơn.

3. **Giữ nguyên mọi guard cũ:** `fileRef` 128-bit ngẫu nhiên, chỉ chấp nhận ref hex,
   chặn `../`, tên gốc vẫn mã hoá ở DB chứ không nằm trên tên object.

4. **Chữ ký hàm không đổi** → 9 nơi gọi không phải sửa, giảm rủi ro hồi quy.

---

## Đánh giá quyền riêng tư

**Dữ liệu rời khỏi máy:** bài nộp của học viên, tài liệu lớp, file thư viện cá nhân.
Có thể chứa PII, kể cả của **học viên vị thành niên**.

| Khía cạnh | Trạng thái |
|---|---|
| Bên thứ ba giữ dữ liệu | Cloudflare (R2) |
| Chủ dự án duyệt | ✅ Có — chốt trong phiên P0 ngày 18092026 |
| Credential | Chỉ từ `process.env`, không hardcode, không commit |
| Mã hoá at-rest | R2 mã hoá mặc định phía nhà cung cấp |
| Tên file gốc | Không nằm trên object key — vẫn 🔒 mã hoá trong DB |
| Object key đoán được? | Không — 128-bit ngẫu nhiên |

### Việc CHƯA làm, phải làm trước khi nhận học viên thật

- [ ] Bật **mã hoá phía ứng dụng** cho nội dung file trước khi đẩy lên R2
      (hiện chỉ dựa vào mã hoá phía Cloudflare). Nội dung bài nộp có thể chứa PII.
- [ ] Bucket đặt **private**, không bật public access, không gắn custom domain công khai.
- [ ] Đặt **lifecycle rule** xoá theo chính sách lưu trữ đã công bố với học viên.
- [ ] Bổ sung R2 vào thông báo quyền riêng tư gửi học viên/phụ huynh.
- [ ] Nối `deleteStudentCascade` với việc xoá object trên R2 (hiện cascade còn sót bảng,
      xem audit P0 mục H1).

---

## Hệ quả

**Tích cực:** nộp bài và tài liệu lớp chạy được trên production; đổi nhà cung cấp về sau
không phải viết lại (S3-compatible); máy local vẫn dùng đĩa nên DX không đổi.

**Tiêu cực:** thêm một bên thứ ba giữ dữ liệu cá nhân; thêm 4 biến môi trường phải quản;
thêm phụ thuộc `@aws-sdk/client-s3` (~25 package).

**Rủi ro còn lại:** nếu quên khai biến R2 trên production thì app **ném lỗi khi dùng
storage** thay vì chạy sai âm thầm — đây là đánh đổi có chủ đích, thà lỗi ồn còn hơn mất
dữ liệu im lặng.

---

## Biến môi trường

```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_LMS_BUCKET      # tuỳ chọn — bucket riêng cho LMS, không khai thì dùng chung R2_BUCKET
```

⚠️ Khi dán lên Vercel, **không** kèm ghi chú phía sau giá trị. Sự cố đăng nhập ở P0 một
phần đến từ file mẫu có comment cùng dòng với giá trị `OWNER_EMAIL`.
