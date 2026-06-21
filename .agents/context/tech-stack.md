---
name: tech-stack
description: The chosen tech stack for justlife. DECIDED 2026-06-21 via ADR-001 (+ ADR-002 for LMS auth/DB). All engineering agents read this before coding.
type: context
updated: 2026-06-21
status: DECIDED
adr: .agents/specs/architecture/ADR-001-tech-stack-21062026.md
adr_lms: .agents/specs/architecture/ADR-002-multiuser-lms-21062026.md
---

# 🛠️ justlife — Tech Stack

> ✅ **ĐÃ CHỐT 2026-06-21** (ADR-001 nền tảng + ADR-002 cho Auth/LMS-DB của P5). Mọi engineering agent đọc file này đầu phiên. Chi tiết + lý do song ngữ trong ADR.

## Bảng stack

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **Next.js 15 (App Router)** full-stack | FE + BE chung 1 codebase, 1 deploy |
| Ngôn ngữ | **TypeScript** end-to-end | |
| Styling | **CSS variables** trong `src/styles/tokens.css` | đã chốt design-system; no Tailwind-hardcode, no gradient |
| Font | Be Vietnam Pro · Inter · Geist Mono | nạp qua `next/font` |
| Icon | lucide-react | stroke 1.5–2 |
| API / BE | Next.js Route Handlers / Server Actions | tách `/api/personal/*` vs `/api/lms/*` |
| ORM | **Drizzle** | |
| DB engine | **SQLite / libSQL** (local-first) | cùng engine xuyên P1→P5 (không rewrite) |
| Đồng bộ đa thiết bị | **Turso embedded replica** — BẬT TỪ P1 | đọc/ghi local + offline; Turso làm điểm sync máy↔điện thoại |
| Data model | **2 DB tách hoàn toàn** (no FK chéo): `personal.db` vs `lms.db` | R-JL-TWO-FACES-01 |
| **LMS DB** | **`lms.db` RIÊNG** (libSQL file local ở **P5a** → **Turso** ở P5b), client riêng `src/db/lms/client.ts`, credential `.env.lms` | `tc_*` migrate sang `lms.db`; portal CHỈ kết nối client LMS; no FK/import chéo với Personal. ADR-002 Q1 |
| **Auth (LMS)** | **Auth.js (NextAuth v5)** — bật cho `(lms)` + `/api/lms/*` ở **P5** | **Google OAuth = CHÍNH** (production, bật P5b) + **access-code (Credentials) = PHỤ** (dùng từ P5a build/test + HV chưa thành niên không email); session **httpOnly+Secure+SameSite**, **KHÔNG tự cuộn crypto**. Personal core vẫn single-user (no auth nặng). ADR-002 Q3 |
| Analytics / insight | **Python read-only consumer** đọc bảng `event` — thêm ở **P6** | tận dụng thế mạnh DS, lắp sau cùng |
| Hosting | **Vercel (free)** cho P1 | self-host VPS để ngỏ sau |
| **Mã hóa** | Personal: app-level field nhạy cảm (sức khỏe/cảm xúc/ghi chú). **LMS (P5a): AES-256-GCM cho field ĐỊNH DANH** (tên/email/note/guardian/feedback), key trong env, blind-index cho login-lookup; **GIỮ điểm số dạng số** (cho P6 thống kê) | R-JL-PRIVACY-01 / R-JL-STUDENT-PII-01 · `src/lib/lms/crypto.ts`. ADR-002 Q6 |

## Data model (2 vùng tách — chi tiết trong ADR-001 + ADR-002)
- 🔵 **personal.db** (`src/db/client.ts`): `task`, `fixed_schedule`, `time_block`, `deadline`, `event`, `user_settings`, `st_*` (Study OS), `lib_*` (Library cá nhân), `hb_*`/`rest_block` (Habit/Rest). **Sau P5a KHÔNG còn `tc_*`.**
- 🟡 **lms.db** (`src/db/lms/client.ts`, P5): `tc_class`, `tc_student`, `tc_session`, `tc_attendance`, `tc_assignment`, `tc_grade` (migrate từ personal) **+** `lms_user`, `access_code`, `consent_log`, `access_audit`, `tc_submission`, `tc_material`.
- **Quy tắc:** KHÔNG khóa ngoại giữa 2 vùng; tách `.env.personal`(mặc định) / `.env.lms`; code trong `app/(lms)/**`, `app/api/lms/**`, `lib/lms/**` **KHÔNG import `@/db/client`**.

## Cây thư mục (xem ADR-001 + ADR-002 cho bản đầy đủ)
```
src/
  app/
    (personal)/      ← Personal OS (P1–4)
    (lms)/           ← LMS-lite Student Portal (P5) — auth bắt buộc
    api/personal/    api/lms/   ← /api/lms/{submission,file/[ref]}
  db/client.ts (personal)   db/lms/{client,schema,migrate}.ts (LMS riêng)
  lib/lms/{crypto,access-code,portal-queries,audit,storage,consent}.ts
  middleware.ts  auth.config.ts  auth.ts   ← Auth.js v5 bảo vệ (lms)+/api/lms/*
  styles/tokens.css  ← single source of truth màu/font/spacing
.env.lms   ← LMS_DATABASE_URL, LMS_ENCRYPTION_KEY, LMS_INDEX_KEY, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET (P5b)
```

## Phụ thuộc thêm ở P5 (ADR-002)
- `next-auth@^5` + `@auth/core` (Auth.js v5). Crypto dùng Node `crypto` built-in (không lib ngoài).

## Lộ trình mở rộng không-rewrite (P1 → P5)
Cùng engine SQLite/libSQL xuyên suốt · hai mặt tách sẵn từ đầu (route group + 2 DB client) · auth là add-on bật ở P5 · analytics là consumer độc lập (P6). → bắt đầu nhẹ, lớn dần. **P5a build an toàn LOCAL trước** (access-code + đĩa local), **P5b go-live** (Turso + Google OAuth + object storage) — không rewrite, chỉ đổi config/adapter.

## Liên quan
- `ADR-001-tech-stack-21062026.md` (nền + lý do) · `ADR-002-multiuser-lms-21062026.md` (LMS auth/DB/cách ly) · `SPEC-P5a-StudentPortal-21062026.md` · `design-system.md` · `product-vision.md` · `.agents/specs/architecture/Privacy-Audit-P5-21062026.md`
