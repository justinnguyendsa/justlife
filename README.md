# justlife — Personal OS (MVP / Phase 1)

Webapp quản lý cuộc sống cá nhân. MVP: **Quản lý việc + Deadline** — Capture → Prioritize/Focus → Time-block → Deadline Guard. Responsive **laptop + điện thoại**.

> Stack: Next.js 15 (App Router) · TypeScript · Drizzle + libSQL (local-first, sync-ready) · CSS variables (`src/styles/tokens.css`) · lucide-react. Thiết kế: Cobalt & Amber, tiếng Việt 100%.

## Chạy local

```bash
npm install
npm run db:setup     # tạo bảng + seed dữ liệu mẫu (file local.db)
npm run dev          # http://localhost:3000
```

Mở trên điện thoại cùng mạng: `http://<IP-máy>:3000`.

## Cấu trúc
```
src/
  app/(app)/{today,tasks,calendar,deadlines,settings}/   ← các màn (route group personal)
  app/actions/        ← server actions (mutations)
  components/          ← UI tái dùng
  db/                 ← schema · client · migrate · seed (personal.db)
  lib/                ← priority · scheduler · escalation · format (Asia/Ho_Chi_Minh)
  styles/tokens.css   ← design tokens (single source of truth — KHÔNG hardcode màu/font)
```

## Đồng bộ đa thiết bị (sync-ready)
DB dùng libSQL — local là `file:local.db`. Để đồng bộ máy↔điện thoại: tạo DB Turso, đổi `DATABASE_URL` + thêm `DATABASE_AUTH_TOKEN` trong `.env` (cùng engine, không phải viết lại — theo ADR-001).

## Lộ trình
MVP (Phase 1) hiện tại. Tiếp theo: Dạy học (P2) · Study OS (P3) · Habit/Rest (P4) · Cổng học viên (P5) · Thống kê (P6). Xem `.agents/specs/` + `.agents/context/product-vision.md`.
