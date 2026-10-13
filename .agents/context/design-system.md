---
name: design-system
description: Locked visual design system for justlife + justudy — Lam & Nắng tokens on shadcn/ui (preset b0 look), fonts, icons, layout rules. Frontend and design agents MUST pull tokens from here, never hardcode.
type: context
updated: 2026-10-13
locked: 2026-10-12
supersedes: "shadcn slate mặc định (2026-09-18) · trước đó Cobalt & Amber (2026-04-28, bản lưu src/styles/tokens.cobalt-amber.bak.css)"
source: "canvas justlife · justudy — Thiết kế (https://claude.ai/artifact/5P5T6BASXrTzcphDhkQUSJ), file project/jl.css"
---

# 🎨 justlife · justudy — Design System (ĐÃ CHỐT 2026-10-12 — "Lam & Nắng")

> **RÀNG BUỘC tuyệt đối.** `frontend-builder`, `uiux-spec-writer`, `design-system-worker` phải đọc file này TRƯỚC khi làm UI. KHÔNG hardcode màu/font: luôn dùng CSS variable từ `src/styles/tokens.css`, hoặc utility Tailwind ánh xạ từ nó.

**Bản vẽ gốc:** canvas *justlife · justudy — Thiết kế*.
- **Design system:** token, chữ, thành phần.
- **justlife:** J01–J08 và L01–L06.
- **justudy:** S01–S11.
- **Đề xuất.**

Mỗi màn có 2 bản: web 1280 và điện thoại 390.

## 1. Nguyên tắc
1. **Tối giản.** Viền thay cho bóng. Bóng chỉ dùng cho lớp nổi (sheet, popover, nút nổi).
2. **Một điểm vàng mỗi màn** (justlife). Vàng nắng `--highlight` chỉ dành cho "việc cần làm ngay". Ở justudy, vàng là màu nhận diện (logo, mục đang chọn, nút chính).
3. **Chữ trên nền vàng luôn là mực tối** (`--highlight-foreground`).
4. **Không gradient**. Chỉ dùng màu đặc.
5. **Copy 100% tiếng Việt.** Con số dùng font mono.
6. **Vùng chạm ≥ 44px** trên điện thoại.

## 2. Token màu (`src/styles/tokens.css`, đủ sáng + tối)

| Nhóm | Token | Ghi chú |
|---|---|---|
| Nền / chữ | `--background` `--foreground` `--card` `--popover` (+`-foreground`) `--overlay` | |
| Lam (chính) | `--primary` `--primary-foreground` `--primary-soft` `--primary-soft-foreground` | soft = mục menu đang chọn, nút soft |
| Nắng (làm ngay) | `--highlight` `--highlight-foreground` `--highlight-soft` `--highlight-soft-foreground` | KHÔNG dùng `--accent` cho vàng |
| Hover nhạt (shadcn) | `--accent` `--accent-foreground` `--secondary` `--muted` (+`-foreground`) | giữ đúng ngữ nghĩa shadcn |
| Trạng thái | `--destructive` `--success` `--warning` (+`-foreground`, `-soft`, `-soft-foreground`) | ở chế độ tối, nền đặc dùng chữ TỐI |
| Mảng đời sống | `--area-{work,teach,study,growth}` + `-soft` + `-foreground` + `-on` | `-foreground` = chữ trên nền soft; `-on` = chữ trên nền đặc |
| Viền / input / focus | `--border` `--input` `--ring` | `--input` đạt 3:1 so với nền thẻ |
| Biểu đồ | `--chart-1..5` → work, teach, study, growth, highlight | |
| Sidebar | `--sidebar-*` | mục đang chọn = primary-soft |

**Tương phản đã kiểm (13/10/2026):** 24 cặp chữ/nền ở cả sáng lẫn tối.
- Chữ đều đạt ≥ 4.5:1.
- `--input` trên `--card` đạt ≥ 3:1.
- Cặp thấp nhất: `--area-work-on` trên `--area-work`, 4.74:1.

Utility Tailwind dùng được, ví dụ:
- `bg-primary-soft text-primary-soft-foreground`
- `bg-highlight text-highlight-foreground`
- `bg-area-teach-soft text-area-teach-foreground`
- `bg-success-soft text-success-soft-foreground`

### Mảng đời sống
| Mảng | Màu | Dùng cho |
|---|---|---|
| Việc / công việc | `--area-work` (lam) | chip, khối lịch |
| Dạy | `--area-teach` (xanh mòng két) | |
| Học | `--area-study` (tím) | |
| Bản thân | `--area-growth` (hổ phách) | |

## 3. Thành phần (`src/components/ui/*`, shadcn new-york)
- **Button:** `default` (lam), `highlight` (vàng), `soft`, `outline`, `ghost`, `destructive`, `destructive-ghost`, `secondary`, `link`. Cỡ: `default` cao 40px, `sm` 36px, `lg` 44px, `icon` 40px, `icon-sm` 36px. Nút không có bóng.
- **Badge / chip:** trạng thái `ok`, `warn`, `danger`, `primary`, `muted`, `outline`; mảng `work`, `teach`, `study`, `growth`. Bo 6px, chữ 12/16 đậm 600.
- **Bo góc** (theo b0): thẻ 10px (`--radius`), sheet 22px, chip 6px.

## 4. Font
| Vai trò | Font | Nguồn |
|---|---|---|
| Chữ | **Inter** | `next/font/google`, subset `latin` + `vietnamese`, biến `--font-inter` |
| Số (giờ, điểm, đếm, chuỗi ngày) | **Geist Mono** | `next/font/google`, biến `--font-geist-mono` |

Tailwind: `font-sans`, `font-mono`. Class `.mono` (cũ) vẫn chạy. Thang chữ:
- body 15/22
- tiêu đề trang 20/28 (web) và 24/30 (điện thoại)
- h2 17/24
- nhãn 12/16

## 5. Icon
**lucide-react**, nét 1.5–2px, cỡ 16 / 20 / 24. Không trộn bộ icon khác.

## 6. Khung & điều hướng (IA chốt 12/10/2026)
- **Web:** thanh bên 232px, gồm Hôm nay · Việc · Lịch · Cuộc sống. Bên dưới có **justudy ↗** và **Cài đặt**.
- **Điện thoại:** thanh dưới 62px gồm Hôm nay · Việc · Lịch · Cuộc sống · Khác. Trang Khác có justudy, Hạn, Tài liệu, Cài đặt.
- **Thanh tiêu đề** (`PageHeader`):
  - Web: dính ở đầu trang, cao 56px, tên trang và tóm tắt cùng một hàng, hành động ở bên phải.
  - Điện thoại: tiêu đề lớn, tóm tắt xuống dòng dưới.
- **Nội dung** rộng tối đa 1120px. Màn 2 cột dùng cột phải 300–340px.
- Không có nút gạt Cá nhân / Dạy học. Dạy và học thuộc **justudy**. justlife chỉ hiện tiến độ đồng bộ.
- Mọi màn đều có thanh tiêu đề, màn chờ (skeleton), trạng thái rỗng và trạng thái lỗi.

## 7. Lớp cầu nối (compat) — tạm thời
`globals.css` map tên token cũ (`--brand`, `--surface`, `--module-*`, `--*-weak`…) sang token mới, để các file chưa chuyển vẫn chạy. **Xoá dần, KHÔNG thêm mới.** Mỗi màn được thiết kế lại (P2.x) phải bỏ dùng tên cũ.

## 8. Khi cần đổi
Chủ dự án chốt màu ngày 12/10/2026. Các phương án B, C, D vẫn còn trên canvas ở trang "Màu brand". KHÔNG tự đổi màu khi chưa có chỉ đạo.

## Liên quan
- `product-vision.md`
- `.agents/rules/00-critical-rules.md` (R-JL-NO-HARDCODE, R-JL-VN-COPY)
- `.agents/specs/tech-specs/SPEC-UI-P2-0-Foundation-13102026.md`
