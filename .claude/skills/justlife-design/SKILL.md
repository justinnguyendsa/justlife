---
name: justlife-design
description: >
  Design or refine justlife UI from a brief, strictly applying the locked design system (Cobalt &
  Amber, Be Vietnam Pro, lucide, no gradient, Vietnamese copy). Use for UI mockups, design tokens,
  component design, or when the user says "thiết kế UI", "giao diện", "design", "màn hình".
argument-hint: "<screen or component to design>"
---

# /justlife-design — Thiết kế UI (theo design system đã chốt)

## Bước 0 — Đọc design system (BẮT BUỘC)
`.agents/context/design-system.md` — màu/font/icon/layout đã chốt. KHÔNG đi chệch.

## Bước 1 — Hiểu yêu cầu
Màn/component nào? Thuộc trụ nào (→ màu module: work=cobalt, teach=teal, study=violet, growth=amber)? Mobile-first.

## Bước 2 — Reuse trước
Gọi `codebase-cartographer` / xem `Component-Catalog.md` → có component tái dùng không.

## Bước 3 — Thiết kế
Hai hướng (chọn theo nhu cầu):
- **Spec hóa:** gọi `uiux-spec-writer` → UIUX spec (screen flow + states + copy).
- **Token/system:** gọi `design-system-worker` → cập nhật `tokens.css` + catalog.
- **Mockup nhanh:** dùng `mcp__visualize__show_widget` hoặc Figma MCP (nếu cần hình) để chủ dự án xem trước — vẫn dùng đúng màu/font đã chốt.

## Bước 4 — Checklist tuân thủ
- [ ] Chỉ token từ tokens.css (R-JL-NO-HARDCODE-01) — không gradient
- [ ] Copy 100% tiếng Việt (R-JL-VN-COPY-01)
- [ ] lucide icon, stroke 1.5–2
- [ ] Có loading / empty / error state
- [ ] Tương phản đủ, target ≥44px (a11y)

## Tips
- Đổi màu/font ngoài hệ đã chốt → PHẢI hỏi chủ dự án (2 option màu + T2 font lưu ở docs/04-design-uiux.md).
