# 📝 justlife — Activity Log

> `knowledge-keeper` append vào đây sau mỗi run lớn: ngày · task · kết quả · bài học. Giúp lần sau không lặp lỗi (R-JL-MEMORY-SYNC-01).

## Format
```
## DDMMYYYY — [Task]
- Làm: ...
- Kết quả: ...
- Gate: QC/UAT/Privacy ...
- Bài học → rule mới (nếu có): R-JL-...
```

---

## 20062026 — Khởi tạo hệ multi-agent
- Làm: dựng bộ skills + agents + workflows cho justlife (21 agent, 8 skill, 3 command, 2 workflow) — phỏng theo G-Agentic, tinh chỉnh cho app đời sống solo.
- Bài học: stack đang TBD → feature đầu tiên `architect` phải chốt stack (ADR-001) trước khi code.
- Việc tiếp theo đề xuất: `/justlife-new-feature` cho trụ #1 (task capture + reminder).

## 21062026 — Phân tích nhu cầu + Phase 0 + Phase 1 spec
- Phân tích nhu cầu đầy đủ (workflow needs-analysis, 7 agent): vision mở rộng → 6 trụ + "một app hai mặt" (Personal OS + LMS-lite). Cập nhật product-vision + rules (amend single-user, thêm two-faces & PII học viên).
- Phase 0: ADR-001 Accepted — stack Next.js 15 + TS full-stack (Option C) · lưu local-first SQLite/libSQL + Turso sync (Option iv) · Vercel · sync từ P1. tech-stack.md DECIDED.
- Phase 1 spec (MVP-Task-Deadline): US 45 AC · Tech 27 task · UIUX 7 màn. Conformance lần 1 CRITICAL (time-block thiếu UIUX) → Minh chốt **calendar kéo-thả đầy đủ** → vá → lần 2 ✅ FULL. Sẵn sàng build.
- **Bài học:** (1) Workflow `args` không truyền qua khi dùng scriptPath ở lần feature-spec-wave → file bị đặt tên "Feature"; phải rename. Lần sau verify tên file sau workflow. (2) Sub-agent auditor/verifier KHÔNG ghi được file report (harness chặn) → orchestrator persist hộ.
- **Việc tiếp theo:** scaffold repo Next.js + tokens.css (Phase 0 skeleton chưa làm) rồi `/justlife-develop` build MVP theo wave.

## 21062026 — Phase 1 BUILD MVP xong (chạy được)
- Scaffold Next.js 15 + TS + Drizzle/libSQL + tokens.css (Cobalt&Amber) + app shell responsive (sidebar desktop / bottom-nav mobile). Orchestrator (main) viết nền móng; 2 frontend-builder agent dựng song song màn Việc/Inbox + Calendar kéo-thả.
- 6 route: /today /tasks /calendar /deadlines /settings (+ redirect /). DB 6 bảng personal.db, seed dữ liệu mẫu 3 vai. Capture (FAB toàn cục) có Effort/Impact/Deadline → điểm ưu tiên tự tính. Calendar kéo-thả Pointer Events + conflict realtime. Focus mode. WIP soft-warn.
- **Verify thật:** `npx tsc --noEmit` 0 lỗi · `next build` Compiled successfully · chạy dev + screenshot Preview MCP **desktop (sidebar, light) + mobile (bottom-nav) + dark mode** — responsive 2 thiết bị OK.
- **Bài học:** (1) `tsx` không đọc alias `@/` → script db dùng import tương đối. (2) libSQL cần `serverExternalPackages` trong next.config. (3) Preview MCP quản server riêng qua `.claude/launch.json` — kill dev-server Bash trước để khỏi trùng cổng.
- **Chưa làm (follow-up):** wire next/font (Be Vietnam Pro/Inter) — hiện dùng system fallback; bật Turso để đồng bộ thật; QC/UAT đầy đủ theo gate; các phase P2–P6.

## 21062026 — UI consistency + Light/Dark theme
- Đồng bộ UI: thêm token ngữ nghĩa (--on-color/--ink-deep/--on-amber/--focus-bg/--focus-sub/--hairline-on), thay hết màu hardcode → token; Focus overlay → class `.focus-overlay`; tách `Section` dùng chung (today+deadlines). 0 màu hardcode trong component.
- Theme: `[data-theme]` trên <html>, **mặc định light** (bỏ prefers-color-scheme làm driver mặc định); ThemeToggle (sidebar desktop + Cài đặt mobile) + script no-flash + suppressHydrationWarning + localStorage. Verify screenshot light(default kể cả system dark)/dark/mobile.

## 21062026 — Phase 2 BUILD: Dạy học (instructor-side, single-user)
- Spec gọn SPEC-Teaching-Instructor-P2. Data: 6 bảng tc_* trong personal.db (P5 sẽ lên cloud có auth). queries `db/teaching.ts` + actions `actions/teaching.ts` (class/clone/archive/student/session/attendance/assignment/grade). Seed lớp DA01 (5 HV, điểm danh, 1 bài tập + điểm).
- Mode-switch Cá nhân↔Dạy học (route-derived /teaching/*). 1 frontend-builder agent dựng 4 file: classes list (+tạo/clone) + class detail 3 tab (Học viên/Điểm danh bulk/Chấm bài rubric+mẫu nhận xét).
- Verify: tsc 0 + next build OK (route /teaching/classes + /[id]) + screenshot desktop/mobile (list, học viên, điểm danh) đúng seed.
- **Follow-up P2:** Thư viện tài liệu tái dùng (chưa làm); P3 Study OS tiếp theo.

## 21062026 — Phase 3 BUILD: Study OS (học cao học, single-user)
- Spec SPEC-Study-OS-P3. Data: 3 bảng st_* (st_course/st_item/st_note) trong personal.db. queries `db/study.ts` + actions `actions/study.ts`. Seed 2 môn (Machine Learning, Big Data Systems) + 5 mục (assignment/quiz/project/exam) + ghi chú.
- Nav thêm "Học tập" (BookOpen) → 6 mục bottom-nav (vừa khít mobile). 1 frontend-builder agent dựng 4 file: /study (Sắp đến hạn gộp mọi môn + danh sách môn + tạo môn) + /study/[id] (2 tab: Bài tập&Đồ án status seg + Ghi chú&tài liệu).
- Fix nhất quán: `.tabs button.on` đổi từ hardcode teal → var(--brand) (cobalt) cho đồng bộ mọi trụ.
- Verify: tsc 0 + build OK (/study + /[id]) + screenshot desktop/mobile đúng seed (ML 1/3 xong, countdown đúng).
- **Follow-up:** đồng bộ deadline học vào /today + /deadlines (hiện tách riêng); P4 Habit+Rest (gộp Học/Thói quen/Nghỉ thành hub "Phát triển").

## 21062026 — Thư viện tài liệu (files/folders/share, dùng chung Học+Dạy)
- Spec SPEC-Library. Data: lib_folder + lib_file (personal.db). Hạ tầng FILE THẬT: lib/storage.ts (ghi/đọc/xóa đĩa data/library, guard path-traversal), route POST /api/library/upload (≤25MB) + GET /api/library/file/[id] (stream). queries db/library.ts (getFolder + breadcrumb, resolveShare) + actions/library.ts (folder/file CRUD, toggleShare, assignFile). Trang /share/[shareId] (ngoài shell). Seed 2 folder + 3 link.
- Nav refactor: bottom-nav mobile = 4 chính + "Khác" (→/more liệt kê Học/Tài liệu/Cài đặt); sidebar desktop đầy đủ. Tránh quá tải khi nhiều mục.
- 1 frontend-builder agent dựng /library + /library/[folderId] + LibraryClient (breadcrumb, tạo folder, upload, thêm link, share copy-link, gắn lớp/môn, xóa).
- Verify: tsc 0 + build OK; **upload+download test thật qua Preview** (POST upload→ok, GET file→200 đúng nội dung); screenshot desktop+mobile (folder + file upload hiện); /share/[unknown]→404.
- **Honest scope:** share link chạy local/LAN; chia sẻ ra ngoài cho học viên = P5 (host+auth). Upload lưu đĩa local (không sync Turso) → P5 object storage.

## 21062026 — P4 Habit/Rest + tích hợp Library & Deadline (3 việc 1 lượt)
- **#1 P4:** schema hb_habit/hb_log/rest_block; queries db/habits.ts (streak + last7 + getRest); actions/habits.ts (createHabit/deleteHabit/toggleHabitToday/addRest/deleteRest); helper format.dateKey (Asia/HCM). Nav restructure: gom self-improvement vào hub **"Phát triển"** (/develop → /habits, /rest, /study); bottom-nav giữ 5 + Khác (MORE_PATHS mở rộng). 1 agent dựng /develop + /habits (streak + ô tuần + toggle) + /rest (khối nghỉ + tổng tuần). Lưu ý: thể lực hướng TĂNG cân, không ăn kiêng.
- **#2 Library-in-context:** query getFilesForCourse/Class; component LinkedFiles; gắn vào study/[id] + teaching/[id] (server, dưới client). File gắn linkCourseId/linkClassId hiện trong chi tiết môn/lớp + "Mở thư viện".
- **#3 Unified deadline:** db/deadlines.ts getUnifiedDeadlines (gộp task + st_item, sort, next24h); component DeadlineRow; viết lại /deadlines + sửa mục Deadline-24h ở /today dùng unified. Study item hiện chip "học" + tên môn.
- Verify: tsc 0 + build OK (10+ routes); screenshot desktop+mobile — develop hub, habits streak (5/12/2), deadline gộp việc+học, course detail có LinkedFiles, nav Khác.
- **Còn lại:** P5 cổng học viên (multi-user + cloud + privacy gate); P6 Thống kê/Monitor; (tùy) đồng bộ Turso, wire next/font.

## 21062026 — P5 khởi động: privacy gate + ADR-002 + Stage 1 (tách DB)
- **privacy-auditor (cổng bắt buộc):** verdict NEEDS-FIX — bê kiến trúc P2 lên multi-user/cloud sẽ rò rỉ PII minor (1 DB chung, query không scope, file route no-auth IDOR, share public, thiếu consent/encrypt/audit/cascade). 6 blocker + go-live checklist → `Privacy-Audit-P5-21062026.md`.
- **Quyết định Minh:** P5a build an toàn local trước; auth = Google OAuth chính (Auth.js) + access-code phụ (build/test local + HV chưa thành niên); mã hóa chỉ field định danh, giữ điểm số dạng số.
- **architect ADR-002 + SPEC-P5a:** tách lms.db (libSQL local→Turso go-live, client riêng), Auth.js v5 (Google + Credentials access-code), data model + lms_user/consent/audit/submission, scoping wrapper portal-queries, crypto định danh AES-256-GCM + blind-index, cascade, kế hoạch 5 stage. tech-stack.md cập nhật.
- **Stage 1 DONE (backend-builder, verified):** tách lms.db + migrate tc_* + 6 bảng LMS mới + refactor teaching→lmsDb. personal.db sạch tc_* (0 bảng), lms.db có 5 HV. /teaching vẫn chạy. tsc+build xanh, grep @/db/client trong teaching=0.
- **Còn lại P5a:** S2 Auth.js+access-code+crypto+middleware · S3 portal pages scoped · S4 submission+upload an toàn · S5 consent/audit/cascade. **P5b go-live** cần Minh chốt: host, Google OAuth app, email, duyệt third-party giữ PII, retention.

## 21062026 — P5a HOÀN TẤT (S2–S5, build an toàn local)
- **S2 (backend):** Auth.js v5 (pin 5.0.0-beta.31) Credentials access-code + Google chờ go-live; crypto AES-256-GCM + blind-index (fail-fast); middleware chặn /portal+/api/lms; portal-queries scoped (studentId từ session). Mã dev: DEV1-2345.
- **S3 (frontend):** /portal/* (login + dashboard + grades + materials), shell riêng (không Personal). Agent bù phần Auth.js wiring + verify E2E curl: login→scoped data only.
- **S4 (backend):** nộp bài + /api/lms/submission + /api/lms/file/[ref] (ownership) + /api/teaching/submission/[id] (instructor). E2E 12/12+edge: IDOR 403, no-auth 401, whitelist 415, traversal 403, attachment+nosniff, originalName mã hóa.
- **S5 (backend):** audit log (append-only, no PII), deleteStudentCascade (transaction + file), consent + minor gate (DEV2-MINR chưa consent → chặn, không rò dữ liệu — bắt+sửa RSC flight leak). UI cấp mã + consent trong teaching.
- **Verify cuối:** tsc+build xanh (route /portal/*, /api/lms/*, /api/auth/*); preview UAT thật: login DEV1-2345 → dashboard đúng dữ liệu HV A (lớp DA01, điểm 9/10).
- **P5b go-live (Minh chốt):** Turso cloud + object storage + Google OAuth thật + key mã hóa prod (+ migrate mã hóa định danh cũ) + consent versioned + retention + bảo vệ instructor area + rà share public + rate-limit bền + privacy-auditor pass lại cloud.

## 21062026 — P5b go-live: runbook + owner-auth
- Quyết định Minh: deploy CẢ app + owner-auth (Google cho Minh; HV access-code/portal); object storage = Cloudflare R2 (egress free → an toàn cost khi scale).
- Runbook: `.agents/specs/architecture/GOLIVE-P5b-runbook.md` (7 bước: Turso 2 DB · Google OAuth · R2 · keys prod · GitHub · Vercel env · privacy gate).
- **Owner-auth DONE (backend-builder, verified 2 mode):** local (không Google env) → Personal/Dạy học mở như cũ (DX giữ); prod-sim (Google env) → mọi route Personal+teaching+/api/teaching+/api/library redirect /login (page) / 401 (api); /portal student-auth nguyên; người lạ Google bị từ chối signIn. Trang /login owner + nút đăng xuất sidebar. tsc+build xanh.
- **Còn lại code 🔧 trước go-live:** (1) R2 storage adapter (file submission+library lên cloud, hiện đĩa local); (2) mã hóa at-rest field định danh LMS + field nhạy cảm Personal (sức khỏe/cảm xúc) khi lên Turso; (3) linking Google↔học viên (nếu cho HV login Google; access-code đã đủ). + Minh setup tài khoản theo runbook.
