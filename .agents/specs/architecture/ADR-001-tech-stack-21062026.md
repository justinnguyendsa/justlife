# ADR-001: Tech Stack + Chiến lược lưu dữ liệu cá nhân

**Status:** Accepted *(Minh chốt 21/06/2026 — `tech-stack.md` đã finalize)*
**Date:** 21062026
**Quyết định cuối:** Q1 = **Option C** (Next.js 15 + TS full-stack; Python = analytics read-only ở P6) · Q2 = **Option iv** (local-first SQLite/libSQL + đồng bộ Turso) · **Đồng bộ bật từ P1** · Hosting P1 = **Vercel free** · Zero-knowledge: hoãn tới P5; tạm thời mã hóa app-level cho field nhạy cảm (sức khỏe/cảm xúc/ghi chú).
**Author:** architect (justlife)
**Quyết định:** 2 câu hỏi — (Q1) Tech stack · (Q2) Nơi lưu dữ liệu vùng Personal

> Đây là feature đầu tiên → ADR này chốt **nền tảng**. Sai = ripple toàn hệ, chi phí sửa `extra`.
> Mọi khuyến nghị có **giải thích song ngữ**: 🛠️ *kỹ thuật* + 🗣️ *bình dân* (R-JL-DUAL-LANG-EXPLAIN-01).

---

## Context

### Ràng buộc sản phẩm (từ `product-vision.md` + roadmap chốt 2026-06-21)
- **MVP = Phase 1**: Quản lý việc + Deadline (Capture/Prioritize/Time-block/Deadline). Single-user, ship nhanh, đơn giản.
- **Roadmap**: P0 foundation → P1 việc+deadline → P2 dạy-học phía giảng viên (single-user) → P3 Study OS → P4 Habit+Rest → **P5 cổng học viên (multi-user, cloud, PII)** → P6 insights.
- **"Một app hai mặt"** (R-JL-TWO-FACES-01): 🔵 Personal OS (chỉ Minh, riêng tư tuyệt đối) vs 🟡 LMS-lite (có học viên, cloud, auth). **Tách hoàn toàn dữ liệu — không khóa ngoại chéo**, route `/api/personal/*` vs `/api/lms/*`.
- **Ràng buộc thiết kế quan trọng**: P1–4 KHÔNG bắt buộc cloud → kiến trúc phải **bắt đầu nhẹ** rồi **mở rộng lên cloud/multi-user ở P5 mà KHÔNG phải viết lại**.

### Ràng buộc người dùng (Minh)
- Mạnh **Python/SQL/DS**, hay vibe-coding tool nội bộ.
- Dùng app trên **cả desktop lẫn điện thoại** → responsive + **cần đồng bộ 2 thiết bị**.
- Solo, ít thời gian → 1 ngôn ngữ / 1 deploy / ít hạ tầng (`tech-stack.md`).

### Ràng buộc đã chốt (không debate lại trong ADR này)
- **Styling**: CSS variables trong `src/styles/tokens.css` (design-system.md, locked 2026-04-28). No Tailwind-hardcode, no gradient.
- **Font**: Be Vietnam Pro (heading) · Inter (body) · Geist Mono (số) — nạp qua `next/font` nếu Next.js.
- **Icon**: lucide. **Copy UI**: 100% tiếng Việt (R-JL-VN-COPY-01).

### Ràng buộc tuân thủ
- R-JL-SINGLE-USER-01 (amended): Personal core single-user, KHÔNG over-engineer; LMS multi-user là subsystem tách, chỉ bật P5.
- R-JL-PRIVACY-01 / R-JL-LOCAL-FIRST-01 / R-JL-STUDENT-PII-01.
- R-JL-SHIP-SMALL-01: ship nhỏ trước.

---

# Q1 — TECH STACK

## Options Considered

### Option A — Next.js + TypeScript full-stack (1 codebase, 1 deploy)
Next.js App Router làm cả FE + BE (Route Handlers / Server Actions). TypeScript end-to-end. Drizzle ORM. DB SQLite→Postgres. Deploy 1 nơi (Vercel hoặc 1 VPS).

| Trục | Điểm | Ghi chú |
|---|---|---|
| Solo-fit (1 người vận hành) | ★★★★★ | 1 ngôn ngữ, 1 repo, 1 deploy, 1 mental model |
| Tốc độ ra MVP | ★★★★★ | File-based routing, Server Actions, ít boilerplate |
| Chi phí | ★★★★★ | Free tier (Vercel) hoặc VPS ~5$/th; 1 dịch vụ |
| Hỗ trợ "hai mặt" + mở rộng P5 | ★★★★☆ | Tách bằng route group `(personal)`/`(lms)` + 2 DB client; middleware auth chỉ bật cho `/lms` |
| Responsive desktop+mobile | ★★★★★ | React + CSS responsive; PWA-ready khi cần |
| Tận dụng Python/DS | ★★☆☆☆ | Không dùng trực tiếp; analytics phải viết TS hoặc tách job riêng sau |
| Đường cong học | ★★★☆☆ | Minh mạnh Python, **không mạnh TS/React** → có học, nhưng ecosystem dồi dào |
| Privacy / local-first | ★★★★☆ | Self-host được; SQLite local-first khả thi |

**Pros:** Đơn giản nhất để vận hành; 1 deploy; "hai mặt" tách bằng route group rất sạch; cộng đồng/AI-assist khổng lồ (hợp vibe-coding); PWA cho mobile dễ.
**Cons:** Minh phải lên tay TypeScript + React; không tận dụng Python ngay; analytics nặng (P6) hơi gượng nếu nhét trong TS.

---

### Option B — Next.js (FE) + Python/FastAPI (BE)
React/Next làm FE; FastAPI (Python) làm toàn bộ API + business logic; SQLAlchemy + Alembic; DB Postgres/SQLite.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Solo-fit | ★★☆☆☆ | **2 ngôn ngữ, 2 runtime, 2 deploy, 2 lần CI** — gánh nặng vận hành cho 1 người |
| Tốc độ ra MVP | ★★★☆☆ | Phải tự ráp auth/CORS/contract FE↔BE; chậm hơn full-stack |
| Chi phí | ★★★☆☆ | 2 dịch vụ (FE host + BE host + DB) |
| Hỗ trợ "hai mặt" + mở rộng P5 | ★★★★☆ | FastAPI router `/personal` `/lms` tách tốt; multi-user về sau ổn |
| Responsive | ★★★★★ | FE vẫn React |
| **Tận dụng Python/DS** | ★★★★★ | **Đúng sở trường Minh**; pandas/sklearn cho P6 insights tự nhiên |
| Đường cong học | ★★★★☆ (BE) / ★★★☆☆ (FE) | BE quen tay; FE vẫn phải học React |
| Privacy / local-first | ★★★☆☆ | Self-host được nhưng local-first khó hơn (BE tách khỏi client) |

**Pros:** Tận dụng tối đa thế mạnh Python/SQL/DS; analytics/insight (P6) là sân nhà; ranh giới FE/BE rõ.
**Cons:** **Gánh nặng vận hành gấp đôi** cho solo — đi ngược R-JL-SHIP-SMALL + ràng buộc "1 deploy". Local-first khó. MVP chậm hơn vì phải tự dựng contract + auth giữa 2 tầng. Over-engineer cho Phase 1 (chỉ là CRUD việc/deadline).

---

### Option C — Next.js + TypeScript full-stack, **Python tách thành job analytics riêng khi cần (P6)** *(KHUYẾN NGHỊ)*
Lõi giống Option A (1 codebase TS, 1 deploy). **Khác biệt then chốt:** không ép chọn giữa "TS thuần" vs "Python BE" — mà **mặc định 100% TS cho app**, rồi **tách 1 service Python ĐỘC LẬP, chạy theo lịch (cron/notebook), CHỈ ĐỌC** từ cùng database để làm insights ở P6. Service này không nằm trong critical path của app.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Solo-fit | ★★★★★ | App = 1 codebase/1 deploy; Python là **optional add-on**, không phải bật ngày 1 |
| Tốc độ ra MVP | ★★★★★ | P1 chỉ là Next.js + DB; không đụng Python |
| Chi phí | ★★★★★ | P1–5: 1 dịch vụ. Python job thêm sau, chạy được cả local notebook |
| Hỗ trợ "hai mặt" + P5 | ★★★★★ | Route group + 2 DB client; auth-on-demand cho `/lms` |
| Responsive | ★★★★★ | React + PWA |
| **Tận dụng Python/DS** | ★★★★☆ | **Để dành đúng chỗ**: P6 insights = Python đọc DB (sân nhà Minh), KHÔNG bắt Python gánh CRUD |
| Đường cong học | ★★★☆☆ | Vẫn phải học TS/React cho app (không tránh được nếu muốn 1 web responsive hiện đại) |
| Privacy / local-first | ★★★★★ | SQLite local-first; Python job đọc cùng file/DB, không mở thêm bề mặt rò rỉ |

**Pros:** Giữ trọn ưu điểm Option A (đơn giản vận hành) **mà không vứt bỏ thế mạnh Python** — chỉ là **đặt Python đúng chỗ đúng lúc** (analytics read-only ở P6, không phải BE của CRUD ở P1). Đây là kiến trúc "đường nào cũng tới": nếu sau này Minh muốn API Python nặng hơn, vẫn thêm được vì DB là ranh giới chung.
**Cons:** Minh vẫn phải học TS/React cho phần app (giống A). Nhưng đây là chi phí 1 lần và có AI-assist.

> **Vì sao C > B:** Câu hỏi thật không phải "TS hay Python" mà là **"khi nào cần Python"**. Phase 1–5 hầu hết là CRUD + UI + auth → TS full-stack thắng tuyệt đối về solo-fit. Phần Python thực sự tỏa sáng (DS/insights) chỉ tới ở **P6** → tách ra như job riêng, đọc DB, là cách dùng Python **không phải trả giá vận hành gấp đôi suốt P1–5**.
> **Vì sao C > A:** A "bỏ quên" Python; C **chừa cửa rõ ràng** (DB là contract) để Python vào đúng lúc mà không cần rewrite.

## Decision (Q1)

> **Khuyến nghị: Option C — Next.js (App Router) + TypeScript full-stack; Python tách thành analytics job read-only, chỉ thêm ở P6.**

**Stack đề xuất (draft, chờ duyệt):**

| Lớp | Lựa chọn đề xuất | Lý do |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | FE+BE 1 codebase; route group tách 2 mặt; PWA cho mobile |
| Ngôn ngữ | **TypeScript** | Type-safe end-to-end; ít bug runtime cho solo |
| Styling | **CSS variables (`tokens.css`)** + CSS Modules | *(đã chốt design-system)* — no Tailwind-hardcode |
| Backend / API | **Next.js Route Handlers + Server Actions** | Không cần BE riêng cho P1–5 |
| Database | **SQLite (libSQL) → Turso ở P5** *(xem Q2)* | Bắt đầu file local; cùng phương ngữ SQL khi lên cloud |
| ORM / data layer | **Drizzle ORM** | TS-native; **đổi dialect SQLite↔Postgres ít sửa** (xem rủi ro); migration rõ |
| Analytics / event store | **Bảng `event` trong DB** *(append-only)* → **Python notebook/job đọc ở P6** | DS-friendly; Minh truy vấn bằng SQL/pandas |
| Auth | **P1–4: passcode/session local (1 user)**; **P5: thêm Auth.js (NextAuth) chỉ cho `/lms`** | Single-user không cần auth nặng; bật multi-user đúng lúc |
| Hosting / deploy | **P1–4: Vercel free *hoặc* 1 VPS self-host**; **P5: + Turso (DB cloud)** | 1 dịch vụ lúc đầu; mở rộng dọc |
| Testing | **Vitest** (unit) + **Playwright** (E2E, hỗ trợ UAT screenshot) | Đủ cho solo; Playwright phục vụ R-JL-SELF-UAT-01 |

🛠️ **Kỹ thuật:** Next.js App Router cho phép tách "hai mặt" bằng *route groups* `(personal)` và `(lms)` cùng 2 DB client riêng; auth middleware chỉ gắn vào `/lms`. Drizzle giữ schema TS, đổi `drizzle-orm/sqlite-core` → `pg-core` khi lên Postgres/Turso với độ sửa giới hạn. Python vào P6 như consumer read-only của bảng `event`.
🗣️ **Bình dân:** Mình xây **một website duy nhất** bằng một thứ tiếng (TypeScript) — dễ trông coi cho một người. Phần "máy phân tích số liệu" (sở trường Python của Minh) **để dành lắp sau cùng**, cắm vào kho dữ liệu chung, không phải xây hai cái nhà song song ngay từ đầu.

## Consequences (Q1)
- ✅ **Dễ hơn:** vận hành 1 codebase/1 deploy; ship P1 nhanh; AI-assist mạnh cho Next.js (hợp vibe-coding).
- ✅ **Dễ hơn:** "hai mặt" + multi-user P5 là **thêm vào**, không phải đập đi.
- ⚠️ **Khó hơn:** Minh phải lên tay TypeScript/React (chi phí học 1 lần).
- ⚠️ **Khó hơn:** analytics nặng phải đợi P6 (chấp nhận được — đúng roadmap).
- 🔁 **Phải xem lại nếu:** P6 cho thấy nhu cầu Python real-time (không chỉ batch) → khi đó cân nhắc thêm 1 FastAPI service đọc cùng DB (vẫn không rewrite app).

---

# Q2 — NƠI LƯU DỮ LIỆU CÁ NHÂN (vùng Personal, P1–4)

> Minh ủy quyền architect debate & đề xuất. Trade-off cốt lõi: **riêng tư tối đa (local) ⇄ tiện đồng bộ 2 thiết bị (cloud)**. Minh **CẦN dùng cả desktop + điện thoại** → đồng bộ là nhu cầu thật, không phải "nice-to-have".

## Options Considered

### Option i — DB cloud riêng cho cá nhân + mã hóa at-rest
Một Postgres/Turso cloud riêng cho vùng Personal (tách hẳn instance/credential với LMS). Mã hóa at-rest.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Đồng bộ desktop↔mobile | ★★★★★ | Cloud là single source — mở máy nào cũng thấy ngay |
| Mức riêng tư | ★★★☆☆ | Dữ liệu rời máy Minh, nằm ở provider; mã hóa at-rest giảm rủi ro nhưng provider vẫn giữ key (trừ khi tự quản) |
| Phức tạp vận hành (solo) | ★★★☆☆ | Phải quản 1 DB cloud, backup, credential ngay từ P1 |
| Chi phí | ★★★★☆ | Free tier đủ cho 1 user (Turso/Neon), nhưng là 1 dịch vụ phải coi sóc |
| Lộ trình P5 | ★★★★★ | Đã ở cloud sẵn → P5 chỉ thêm DB LMS riêng |

**Pros:** Đồng bộ "miễn phí" về mặt logic; sẵn sàng cho cloud. **Cons:** Đẩy dữ liệu cá nhân nhạy cảm lên cloud **ngay P1** khi chưa cần — đi hơi ngược R-JL-LOCAL-FIRST-01; thêm vận hành sớm.

---

### Option ii — Thuần local/offline-first (PWA + IndexedDB)
App là PWA; dữ liệu sống trong IndexedDB trên từng thiết bị. Không server DB.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Đồng bộ desktop↔mobile | ★☆☆☆☆ | **KHÔNG đồng bộ** giữa 2 máy nếu không tự dựng sync engine (rất tốn công, dễ conflict) |
| Mức riêng tư | ★★★★★ | Tối đa — dữ liệu không bao giờ rời thiết bị |
| Phức tạp vận hành | ★★★★★ (nếu 1 máy) / ★☆☆☆☆ (nếu cần sync) | Sync đa thiết bị là bài toán khó (CRDT/merge) |
| Chi phí | ★★★★★ | 0đ hạ tầng |
| Lộ trình P5 | ★★☆☆☆ | LMS P5 BẮT BUỘC cloud (học viên đăng nhập từ máy họ) → IndexedDB không phục vụ được → phải dựng cloud song song |

**Pros:** Riêng tư tuyệt đối; rẻ nhất. **Cons:** **Phá vỡ nhu cầu cốt lõi của Minh là dùng 2 thiết bị** — đây là dealbreaker. Tự viết sync = dự án phụ tốn công, dễ mất dữ liệu (conflict). P5 vẫn phải dựng cloud.

---

### Option iii — Dùng chung 1 Postgres với LMS, tách schema `personal`/`lms` + mã hóa
Một Postgres duy nhất; 2 schema/namespace; mã hóa field nhạy cảm.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Đồng bộ desktop↔mobile | ★★★★★ | Cloud single source |
| Mức riêng tư | ★★☆☆☆ | **Personal & PII học viên ở CHUNG 1 instance** → tăng bề mặt rò rỉ chéo; vi phạm tinh thần R-JL-TWO-FACES-01 ("tách credential/DB") |
| Phức tạp vận hành | ★★★☆☆ | 1 DB nhưng phải kỷ luật phân quyền schema; 1 lỗi cấu hình = lộ chéo |
| Chi phí | ★★★★★ | Rẻ (1 DB) |
| Lộ trình P5 | ★★★☆☆ | Tiện về hạ tầng nhưng **đi ngược nguyên tắc tách 2 mặt** |

**Pros:** Rẻ, 1 chỗ quản. **Cons:** **Vi phạm R-JL-TWO-FACES-01** (yêu cầu tách credential/DB giữa Personal và LMS). Trộn dữ liệu cá nhân của Minh với PII học viên (có thể trẻ vị thành niên) trong 1 instance là **rủi ro privacy không đáng đánh đổi** để tiết kiệm vài đô.

---

### Option iv — **Local-first SQLite (libSQL) + đồng bộ qua Turso embedded replica** *(KHUYẾN NGHỊ)*
Dùng **libSQL** (fork SQLite của Turso): **P1–4 chạy như SQLite file local** (local-first, riêng tư). Khi cần đồng bộ 2 thiết bị → bật **embedded replica**: mỗi thiết bị giữ bản sao SQLite local (đọc/ghi nhanh, offline-capable), Turso cloud làm điểm đồng bộ. **Cùng một engine/SQL** xuyên suốt → P5 chỉ là "bật sync + thêm DB LMS riêng", không đổi tầng dữ liệu.

| Trục | Điểm | Ghi chú |
|---|---|---|
| Đồng bộ desktop↔mobile | ★★★★★ | Embedded replica đồng bộ qua Turso; vẫn đọc/ghi local nhanh + offline |
| Mức riêng tư | ★★★★☆ | Mặc định local-first; **chỉ bật sync khi Minh muốn**; vùng Personal có DB/credential **riêng hẳn** với LMS (tuân R-JL-TWO-FACES-01) |
| Phức tạp vận hành | ★★★★☆ | P1–4 chỉ 1 file SQLite (cực nhẹ); bật cloud sync là đổi connection string, không rewrite |
| Chi phí | ★★★★★ | P1–4 = 0đ (file local). Turso free tier dư cho 1 user khi cần sync |
| Lộ trình P5 | ★★★★★ | **Cùng engine** từ đầu → P5 = thêm **DB Turso thứ 2 riêng cho LMS** + Auth.js. Hai DB, hai credential, no FK chéo — đúng R-JL-TWO-FACES-01 |

**Pros:**
- **Bắt đầu local-first** (riêng tư + rẻ, đúng R-JL-LOCAL-FIRST-01) **mà vẫn có đường đồng bộ chính chủ** (không phải tự viết sync engine như Option ii).
- **Một engine xuyên P1→P5** → lời hứa "mở rộng không rewrite" là thật, không phải hy vọng.
- Tách 2 mặt sạch: **2 database libSQL/Turso riêng** (personal vs lms), 2 credential, no FK chéo.
- Drizzle hỗ trợ libSQL trực tiếp → DX tốt.

**Cons:**
- Embedded replica vẫn cần bật Turso (1 dịch vụ) khi muốn sync 2 máy — không "0 hạ tầng tuyệt đối" như IndexedDB, nhưng đổi lại được đồng bộ thật.
- Nếu Minh muốn **zero-knowledge** (provider không đọc được gì) thì cần thêm mã hóa field phía app (có thể thêm sau, không chặn P1).

## Decision (Q2)

> **Khuyến nghị: Option iv — Local-first SQLite (libSQL), đồng bộ desktop↔mobile qua Turso embedded replica khi cần. Vùng Personal và vùng LMS dùng 2 database RIÊNG (no FK chéo).**

**Lộ trình lưu trữ theo phase:**
- **P1 (MVP)**: 1 file SQLite local (`personal.db`). Riêng tư, 0đ, ship nhanh. *(Nếu Minh muốn đồng bộ ngay từ P1 → bật Turso embedded replica cho vùng Personal — chỉ đổi config.)*
- **P2–4**: vẫn vùng Personal; bật Turso sync khi nhu cầu 2 thiết bị rõ ràng.
- **P5**: thêm **database Turso THỨ HAI riêng cho LMS** (credential riêng) + Auth.js cho `/lms`. PII học viên mã hóa at-rest, audit log, consent — qua `privacy-auditor` (R-JL-STUDENT-PII-01).
- **P6**: Python notebook/job đọc bảng `event` (read-only) → insights.

🛠️ **Kỹ thuật:** libSQL cho phép cùng một file SQLite chạy *standalone* (P1) rồi nâng lên *embedded replica* (đọc/ghi local, sync về Turso) chỉ bằng đổi `createClient({ url, syncUrl, authToken })`. Tầng dữ liệu (Drizzle schema + queries) **không đổi**. Hai mặt = hai client trỏ hai DB khác nhau → cô lập credential, no cross-schema, no FK chéo (R-JL-TWO-FACES-01).
🗣️ **Bình dân:** Lúc đầu dữ liệu của Minh nằm **ngay trong máy** (như một cuốn sổ riêng — kín đáo, không tốn tiền). Khi nào muốn "mở sổ trên cả điện thoại lẫn laptop", mình bật chế độ đồng bộ — vẫn là cuốn sổ đó, chỉ thêm bản sao tự cập nhật giữa 2 máy. Quan trọng: **sổ cá nhân và sổ lớp học là hai cuốn tách hẳn**, không dính nhau, để PII của học viên không bao giờ trộn với việc riêng của Minh.

### Trade-off "riêng tư tối đa vs tiện đồng bộ" — nói thẳng
- **Riêng tư tuyệt đối (Option ii thuần local)** → mất đồng bộ → **phá nhu cầu 2 thiết bị của Minh**. ❌
- **Tiện đồng bộ tối đa (Option i cloud ngay)** → đẩy dữ liệu nhạy cảm lên cloud sớm khi chưa cần. ⚠️
- **Option iv** = **đường giữa có kiểm soát**: mặc định local-first (riêng tư + rẻ), **Minh tự quyết thời điểm bật sync**, và khi bật vẫn giữ bản local trên mỗi máy (offline + nhanh). Đây là điểm cân bằng tốt nhất cho một người dùng 2 thiết bị, dữ liệu nhạy cảm.

## Consequences (Q2)
- ✅ **Dễ hơn:** P1 cực nhẹ (1 file), riêng tư mặc định, không hạ tầng.
- ✅ **Dễ hơn:** mở rộng P5 = thêm DB thứ 2, không rewrite tầng dữ liệu.
- ✅ **An toàn:** 2 mặt tách credential/DB → giảm rủi ro rò rỉ chéo (PII học viên).
- ⚠️ **Khó hơn:** muốn đồng bộ thì phải bật Turso (1 dịch vụ) — chấp nhận được vì đổi lấy sync thật.
- 🔁 **Phải xem lại nếu:** Minh yêu cầu zero-knowledge nghiêm ngặt → thêm app-level encryption cho field nhạy cảm; hoặc nếu muốn self-host hoàn toàn → libSQL server tự dựng trên VPS thay Turso.

---

## Data Model cấp cao — TÁCH 2 VÙNG (no FK chéo)

> Nguyên tắc: **hai vùng là hai database riêng**. KHÔNG khóa ngoại chéo. Nếu cần liên hệ (hiếm), dùng ID mềm (string) + tra cứu ở tầng app, KHÔNG ràng buộc DB.

### 🔵 Vùng PERSONAL (P1–4) — database `personal`
```
task            id, title, note, status(inbox|todo|doing|done|archived),
                priority_score, effort, impact, deadline_at,
                created_at, updated_at, done_at
                # Capture & Prioritize (trụ 1) — MVP P1

time_block      id, task_id?(soft), title, start_at, end_at,
                kind(work|teach|study|growth|rest|fixed), is_fixed,
                created_at
                # Time-block & Deadline Guard (trụ 2) — né khối cố định (R-JL-RESPECT-SCHEDULE-01)

fixed_schedule  id, label, rrule(recurrence), start_time, end_time, weekday_mask
                # 3 khối cố định: làm 8h30–18h, dạy tối, học cuối tuần

deadline        id, task_id(soft), due_at, milestone_label,
                escalation_level
                # đa mốc + escalation (trụ 2)

# --- P3+ (chưa build P1, phác để kiến trúc không bí về sau) ---
course_self     id, name, ...                 # Study OS (trụ 3) — môn cao học của Minh (KHÁC course bên LMS)
assignment_self id, course_self_id, due_at...  # bài tập/đồ án Minh phải nộp
habit           id, name, kind(fitness|english|sleep|finance), cadence
habit_log       id, habit_id, date, value, streak_count   # Geist Mono hiển thị số/streak
rest_block      id, start_at, end_at, type     # Rest & Anti-Burnout (trụ 5)

event           id, ts, type, payload(json)    # append-only — nguồn cho Python insights (P6)
```

### 🟡 Vùng LMS-lite (P2 single-user giảng viên · P5 multi-user học viên) — database `lms`
```
# P2 — phía giảng viên (single-user, chưa cần auth học viên)
class           id, name, schedule, ...
student         id, name, email, is_minor(bool), guardian_contact?   # PII — tối thiểu hóa (R-JL-STUDENT-PII-01)
attendance      id, class_id, student_id, date, status
submission      id, class_id, student_id, assignment_ref, score, feedback, graded_at
material        id, title, type, tags, reusable(bool)                  # thư viện tái dùng

# P5 — bật multi-user (học viên đăng nhập)
lms_user        id, student_id(soft), email, role(student), pwd_hash
consent_log     id, student_id, type, granted_at, guardian_granted_at? # consent (+ guardian nếu minor)
access_audit    id, actor, action, target, ts                          # audit log truy cập PII
```

> ⛔ **No FK chéo**: `task` (personal) KHÔNG tham chiếu `class`/`student` (lms) và ngược lại. `course_self`/`assignment_self` (Minh học cao học) là **khác hẳn** `class`/`assignment_ref` (Minh dạy) — tránh nhầm 2 mặt.
> Nếu sau này muốn "việc dạy hiện trong inbox cá nhân" → tạo `task` mirror ở vùng personal với `source_ref` là **string ID mềm**, app tự đồng bộ, KHÔNG FK DB.

---

## Cây thư mục dự kiến (khớp design-system + tách 2 mặt)

```
justlife/
├─ src/
│  ├─ app/
│  │  ├─ (personal)/                 # 🔵 route group Personal OS — không auth
│  │  │  ├─ inbox/                    # Capture (P1)
│  │  │  ├─ today/                    # Time-block hôm nay (P1)
│  │  │  ├─ deadlines/                # Deadline Guard (P1)
│  │  │  ├─ study/  habits/  rest/    # P3 / P4 (chưa build P1)
│  │  │  └─ layout.tsx
│  │  ├─ (lms)/                       # 🟡 route group LMS-lite — auth bật ở P5
│  │  │  ├─ classes/ grading/ library/   # P2 phía giảng viên
│  │  │  ├─ portal/                       # P5 cổng học viên (multi-user)
│  │  │  └─ layout.tsx
│  │  ├─ api/
│  │  │  ├─ personal/                 # /api/personal/* (R-JL-TWO-FACES-01)
│  │  │  └─ lms/                      # /api/lms/*
│  │  └─ layout.tsx                   # root: nạp font (next/font), tokens.css
│  ├─ components/                     # UI tái dùng (R-JL-REUSE-BEFORE-CODE-01)
│  │  └─ ui/                          # button, input, card... (lucide icons)
│  ├─ lib/
│  │  ├─ db/
│  │  │  ├─ personal/                 # client libSQL + Drizzle schema PERSONAL
│  │  │  │  ├─ schema.ts
│  │  │  │  └─ client.ts              # createClient (file → embedded replica)
│  │  │  └─ lms/                      # client + schema LMS (DB RIÊNG, credential riêng)
│  │  │     ├─ schema.ts
│  │  │     └─ client.ts
│  │  ├─ priority.ts                  # deadline×effort×impact (trụ 1)
│  │  ├─ scheduler.ts                 # né khối cố định (trụ 2)
│  │  └─ auth/                        # P5: Auth.js chỉ cho (lms)
│  ├─ styles/
│  │  ├─ tokens.css                   # ⭐ single source màu/font/spacing (ĐÃ CHỐT)
│  │  └─ globals.css
│  └─ types/
├─ drizzle/                          # migrations (personal + lms tách)
│  ├─ personal/
│  └─ lms/
├─ analytics/                        # 🐍 P6 — Python job/notebook READ-ONLY đọc bảng event
│  └─ insights.ipynb
├─ tests/
│  ├─ unit/   (Vitest)
│  └─ e2e/    (Playwright — phục vụ R-JL-SELF-UAT-01)
├─ public/                           # PWA manifest/icons (mobile)
├─ .env.personal   .env.lms          # credential TÁCH (R-JL-TWO-FACES-01)
└─ drizzle.config.ts
```

---

## Rủi ro kiến trúc + cách mở rộng P1→P5 không rewrite

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | **Drizzle đổi dialect SQLite→Postgres** không hoàn toàn 1-1 (kiểu dữ liệu, default, một số hàm) | Trung bình | Chọn **libSQL + Turso (vẫn SQLite)** → **không cần đổi dialect** lên P5; nếu sau muốn Postgres thì giới hạn dùng kiểu/hàm "chung mẫu số". Có integration test ở ranh giới DB |
| R2 | **Đường cong học TS/React** với Minh (mạnh Python) | Trung bình | AI-assist (vibe-coding) + Next.js convention rõ; bắt đầu P1 nhỏ (CRUD việc) để lên tay dần |
| R3 | **Rò rỉ chéo 2 mặt** (PII học viên lẫn dữ liệu cá nhân) | **Cao (privacy)** | 2 DB riêng + 2 credential + route tách + no FK chéo; `privacy-auditor` là GATE ở mọi feature LMS (R-JL-STUDENT-PII-01) |
| R4 | **Bật sync sớm đẩy dữ liệu nhạy cảm lên cloud** | Trung bình | Mặc định local-first; Minh tự quyết thời điểm bật Turso; cân nhắc app-level encryption nếu cần zero-knowledge |
| R5 | **Scope creep LMS → full LMS** | Trung bình | R-JL-NO-BLOAT-01: LMS-lite chỉ điểm danh/chấm/nộp/xem điểm; ngoài ra → parking lot |
| R6 | **Vendor lock-in Turso** | Thấp | libSQL là **open-source**; có thể **self-host libSQL server** trên VPS thay Turso → không khóa cứng |
| R7 | **PWA/mobile offline conflict khi sync** | Thấp–TB | Embedded replica của libSQL xử lý sync ở tầng engine; tránh tự viết merge logic |

**Vì sao không phải rewrite khi lên P5 (tóm tắt):**
1. **Cùng engine dữ liệu** (libSQL) từ P1 → P5 chỉ *thêm DB thứ 2* + bật sync (đổi config, không đổi schema/queries).
2. **"Hai mặt" đã tách sẵn từ ngày 1** (route group + 2 db client + 2 .env) → P5 chỉ *bật auth* cho `(lms)`, không tái cấu trúc.
3. **Auth là add-on** (Auth.js gắn vào `(lms)` route group) → không đụng Personal.
4. **Analytics là consumer độc lập** (Python đọc `event`) → thêm ở P6 không sửa app.

---

## Những điểm CẦN MINH CHỐT
1. **Q1 — Đồng ý Option C** (Next.js + TS full-stack, Python để dành cho analytics P6)? Hay muốn Python BE ngay từ đầu (Option B, chấp nhận vận hành gấp đôi)?
2. **Q2 — Đồng ý Option iv** (local-first libSQL, bật Turso sync khi cần)? Hay ưu tiên (i) cloud ngay từ P1 để có đồng bộ tức thì, hoặc (ii) thuần local chấp nhận mất đồng bộ?
3. **Thời điểm bật đồng bộ**: muốn đồng bộ desktop↔mobile **ngay từ P1**, hay để local thuần rồi bật sau khi thấy cần?
4. **Mức riêng tư cloud**: cần **zero-knowledge** (mã hóa để provider không đọc được) không? Nếu có → thêm app-level encryption (hoãn được, không chặn P1).
5. **Hosting P1**: ưu tiên **Vercel free** (tiện) hay **self-host VPS** (kiểm soát dữ liệu tối đa)?

> Sau khi Minh chốt → architect finalize `tech-stack.md` (điền bảng stack + cây thư mục), đổi Status ADR này thành **Accepted**.

## Liên quan
- `product-vision.md` (roadmap P0–P6, "hai mặt") · `design-system.md` (tokens.css, font, lucide) · `tech-stack.md` (chờ finalize) · `.agents/rules/00-critical-rules.md` (R-JL-TWO-FACES / SINGLE-USER / PRIVACY / STUDENT-PII / SHIP-SMALL)
