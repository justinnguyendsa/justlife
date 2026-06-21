---
name: design-system
description: Locked visual design system for justlife — colors, fonts, icons, layout rules. Frontend and design agents MUST pull tokens from here, never hardcode.
type: context
updated: 2026-06-20
locked: 2026-04-28
---

# 🎨 justlife — Design System (ĐÃ CHỐT 2026-04-28)

> **RÀNG BUỘC tuyệt đối.** `frontend-builder`, `uiux-spec-writer`, `design-system-worker` đọc file này TRƯỚC khi làm UI. KHÔNG hardcode màu/font — luôn dùng CSS variable từ `tokens.css`.

## 1. Màu — "Cobalt & Amber" (Option B)

| Vai trò | Token | Hex |
|---|---|---|
| Primary (cobalt) | `--brand` | `#1578E8` |
| Accent (amber) | `--accent` | `#FFA800` |
| Module · Work | `--module-work` | `#1578E8` (cobalt) |
| Module · Teach | `--module-teach` | `#1A9A78` (teal) |
| Module · Study | `--module-study` | `#7B4FD6` (violet) |
| Module · Growth | `--module-growth` | `#FFA800` (amber) |

Palette nền tảng: **xanh dương · vàng · trắng · đen**. Full HSL tokens (light/dark) sống trong `src/styles/tokens.css` — single source of truth.

### ❌ KHÔNG
- **KHÔNG gradient** — chỉ solid fill (ràng buộc của chủ dự án).
- **KHÔNG hardcode** `#1578E8`, `orange`, `rgb(...)` trong component — dùng `var(--brand)`.
- **KHÔNG** thêm màu ngoài palette mà chưa hỏi chủ dự án.

## 2. Font (T1)

| Vai trò | Font | Nguồn |
|---|---|---|
| Heading | **Be Vietnam Pro** | Google (render dấu tiếng Việt sạch ở size lớn) |
| Body | **Inter** | Google |
| Số/streak/mono | **Geist Mono** | local |

Cơ chế nạp font tùy stack architect chốt (`next/font` nếu Next.js; `@font-face` nếu khác). Token: `--font-heading`, `--font-body`, `--font-mono`.

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
