---
name: design-system
description: Locked visual design system for justlife — shadcn/ui tokens, fonts, icons, layout rules. Frontend and design agents MUST pull tokens from here, never hardcode.
type: context
updated: 2026-09-18
locked: 2026-09-18
supersedes: "Cobalt & Amber (chốt 2026-04-28) — bản cũ lưu ở src/styles/tokens.cobalt-amber.bak.css"
---

# 🎨 justlife · justudy — Design System (ĐÃ CHỐT 2026-09-18 — shadcn/ui)

> **RÀNG BUỘC tuyệt đối.** `frontend-builder`, `uiux-spec-writer`, `design-system-worker` đọc file này TRƯỚC khi làm UI. KHÔNG hardcode màu/font — luôn dùng CSS variable từ `tokens.css` hoặc utility Tailwind ánh xạ từ nó.

> ⚠️ **Thay hệ 2026-09-18.** Bảng màu "Cobalt & Amber" (chốt 2026-04-28) ĐÃ BỊ THAY bằng bộ biến chuẩn **shadcn/ui** theo yêu cầu chủ dự án. Áp dụng cho CẢ justlife (Personal OS) và justudy (cổng học viên `/portal`).

## 1. Màu — bộ biến shadcn/ui (oklch)

Single source of truth: `src/styles/tokens.css`. Đổi theme = sửa DUY NHẤT file đó.

| Nhóm | Token |
|---|---|
| Nền / chữ | `--background` · `--foreground` |
| Bề mặt | `--card` · `--card-foreground` · `--popover` · `--popover-foreground` |
| Nhấn | `--primary` · `--secondary` · `--accent` (+ `-foreground`) |
| Chữ mờ | `--muted` · `--muted-foreground` |
| Trạng thái | `--destructive` · `--success` · `--warning` (+ `-foreground`) |
| Viền / input / focus | `--border` · `--input` · `--ring` |
| Phân loại | `--chart-1..5` |
| Sidebar | `--sidebar*` |

### Mảng đời sống (riêng của justlife)

Ánh xạ lên bảng `--chart-*`, kèm token chữ riêng để đạt tương phản:

| Mảng | Nền | Chữ trên nền tint |
|---|---|---|
| Công việc | `--area-work` | `--area-work-foreground` |
| Dạy học | `--area-teach` | `--area-teach-foreground` |
| Học tập | `--area-study` | `--area-study-foreground` |
| Phát triển | `--area-growth` | `--area-growth-foreground` |

> Vì sao cần `*-foreground` riêng: màu `--chart-*` gốc quá sáng, dùng làm chữ 12px trên nền tint thì chỉ đạt ~3.0:1 — trượt WCAG AA. Bản đậm hơn đưa lên >4.5:1.
> 🗣️ Bình dân: màu biểu đồ đẹp nhưng làm chữ thì mờ, nên chữ dùng bản đậm hơn của cùng màu.

### Dark mode

Bật bằng `.dark` (chuẩn shadcn) **hoặc** `[data-theme="dark"]` (toggle sẵn có). `tokens.css` khai báo cả hai selector; `globals.css` có `@custom-variant dark` khớp cả hai.

`--destructive` và `--success` ở dark mode cố tình SÁNG (đọc tốt khi làm chữ trên nền tối) → khi dùng làm **nền đặc** thì `*-foreground` đảo thành màu TỐI.

### ❌ KHÔNG
- **KHÔNG gradient** — chỉ solid fill (ràng buộc của chủ dự án).
- **KHÔNG hardcode** hex / `orange` / `rgb(...)` trong component — dùng token hoặc utility.
- **KHÔNG** thêm màu ngoài bộ token mà chưa hỏi chủ dự án.

## 1b. Tầng kỹ thuật

| Thứ | Chốt |
|---|---|
| CSS engine | **Tailwind v4** (`@tailwindcss/postcss`) |
| Component | **shadcn/ui** style `new-york`, base `slate` — `src/components/ui/*` |
| Gộp class | `cn()` = clsx + tailwind-merge (`src/lib/utils.ts`) |
| Cấu hình CLI | `components.json` |
| Trang tham chiếu | `/ui-kit` (chỉ dev, production tự 404) |

### Lớp cầu nối (compat) — tạm thời
`globals.css` map token cũ (`--brand`, `--surface`, `--module-*`…) sang biến shadcn để các file chưa migrate vẫn chạy và tự nhận design system mới. **Xoá dần, KHÔNG thêm mới.**

## 2. Font (T1)

| Vai trò | Font | Nguồn |
|---|---|---|
| Heading | **Inter** | `next/font/google`, subset `latin` + `vietnamese` |
| Body | **Inter** | như trên (shadcn dùng 1 họ chữ cho cả hai) |
| Số/streak/mono | stack `ui-monospace` | không cần tải thêm font |

Nạp bằng `next/font/google` trong `src/app/layout.tsx`. Token: `--font-sans`, `--font-mono` (`--font-heading`/`--font-body` giữ làm alias cho code cũ).

## 3. Icon

- **lucide** (lucide-react nếu React), stroke **1.5–2px**, size **16 / 20 / 24** theo scale.
- KHÔNG trộn bộ icon khác.

## 4. Quy tắc layout & copy

- **Copy UI 100% tiếng Việt** (persona là người Việt). KHÔNG English UI.
- Mọi page có header nhất quán, loading skeleton, empty state, error state.
- Spacing/radius qua token (`--space-*`, `--radius-*`) — không số magic.
- Dark mode: token-driven (light/dark trong tokens.css).
- Mobile-first: chủ dự án bắt việc trên điện thoại giữa các khối lịch.

## 5. Khi cần đổi
Nếu chủ dự án muốn đổi màu/font: 2 option màu còn lại + option font T2 được lưu trong `docs/04-design-uiux.md` (tham chiếu lịch sử). KHÔNG tự đổi — phải có chỉ đạo.

## Liên quan
- `product-vision.md` · `.agents/rules/00-critical-rules.md` (R-JL-NO-HARDCODE, R-JL-VN-COPY)
