---
id: SPEC-UI-P2.5
user_story: US-UI-P2-5-Settings-13102026.md
date: 2026-10-13
depends_on: SPEC-UI-P2.4 (nhánh ui/p2-4-focus)
---

# SPEC-UI-P2.5 — Màn Cài đặt

## Backend (làm trước)
Không đổi schema.

| ID | Việc | File |
|---|---|---|
| B01 | Hàm thuần `parseWipLimit(raw)`: số nguyên 0–10, `0` = không giới hạn; sai hoặc thiếu thì dùng 3. `isWipExceeded(current, limit)` = `limit > 0 && current >= limit`. Có test. | `src/lib/wip.ts`, `tests/unit/wip.test.ts` |
| B02 | `getWipLimit` dùng `parseWipLimit`. Hai chỗ kiểm WIP (`updateTask`, `setTaskStatus`) dùng `isWipExceeded`. | `src/app/actions/tasks.ts` |
| B03 | Action mới `setWipLimit(n)`: `requireOwner()`, chỉ nhận số nguyên 0–10, lưu `wip_limit`, revalidate `/settings`. Màn Cài đặt không dùng `setSetting` cho khoá này nữa. | `src/app/actions/settings.ts` |
| B04 | Hàm thuần `validateFixed(input)` cho khung giờ bận: tên đã trim, 1–80 ký tự; mảng thuộc `AREAS`; `startMin` / `endMin` là số nguyên 0–1440; kết thúc phải sau bắt đầu; `weekdayMask` 1–127. Trả `{ ok: true, value }` hoặc `{ ok: false, error }` (tiếng Việt). Có test. | `src/lib/fixed-schedule.ts`, `tests/unit/fixed-schedule.test.ts` |
| B05 | `addFixedSchedule` validate bằng `validateFixed`. `updateFixedSchedule` gộp input với bản ghi hiện có rồi mới validate, để sửa riêng giờ bắt đầu hay kết thúc vẫn được kiểm. | `src/app/actions/schedule.ts` |
| B06 | Hàm thuần `maskEmail(email)`: giữ 4 ký tự đầu của phần trước `@`, thay phần còn lại bằng `•••••`, giữ nguyên tên miền. Phần trước `@` từ 4 ký tự trở xuống thì chỉ giữ 1 ký tự. Có test. | `src/lib/format.ts`, `tests/unit/format.test.ts` |

## Frontend
| ID | Việc | File |
|---|---|---|
| F01 | Trang server đọc trong `Promise.all`: `fixedSchedule` (theo `startMin`), `getSettings()`, `getOwnerSession()`, `isOwnerAuthEnabled()`. Truyền `email` đã che xuống client, không truyền email gốc. `PageHeader`: "Cài đặt" · "Giờ bận · giới hạn · giao diện · tài khoản". | `src/app/(app)/settings/page.tsx` |
| F02 | Bố cục `max-w-[1000px]`. Web: lưới `md:grid-cols-[minmax(0,1fr)_320px]`, cột trái là Giờ bận, cột phải là Giới hạn, Giao diện, Tài khoản. Điện thoại: một cột theo cùng thứ tự. Thẻ dùng `bg-card rounded-lg border p-5`. | `SettingsClient.tsx` |
| F03 | Thẻ Giờ bận. Mỗi hàng gồm: vạch `areaBarClass`, tên, giờ mono, 7 ô ngày, nút Sửa (ghost). Ô ngày bật dùng `bg-primary-soft text-primary-soft-foreground`. Canvas dùng màu success, nhưng success để chỉ "đã xong" nên không dùng ở đây. Có trạng thái rỗng. | `FixedList.tsx` |
| F04 | Hộp thoại `FixedEditor` (Dialog shadcn) cho thêm và sửa: Tên (Input), Mảng (Segmented), Bắt đầu / Kết thúc (`type=time`, mono), Lặp lại (7 nút `aria-pressed`). Lỗi hiện dưới form bằng `role="alert"`, trước khi gọi server dùng cùng `validateFixed`. Khi sửa có nút Xoá khung. Chặn bấm đôi bằng `pending`. | `FixedEditor.tsx` |
| F05 | Thẻ Giới hạn đang làm: Segmented 1 / 2 / 3 / Không giới hạn (`0`). Giá trị cũ ngoài tập này (4–10) thì thêm đúng một lựa chọn cho giá trị đó, để không mất. Gọi `setWipLimit`, lỗi thì trả về giá trị cũ. Copy giải thích đúng hành vi: app nhắc tạm dừng một việc trước. | `SettingsClient.tsx` |
| F06 | Giao diện có 3 lựa chọn. `src/lib/theme.ts` gồm: kiểu `ThemePref`, `resolveTheme(pref, systemDark)`, `applyThemePref(pref)` (đặt `data-theme` và `.dark`, ghi `localStorage jl-theme`, phát sự kiện `jl-theme`), và `THEME_SCRIPT` cho layout. `THEME_SCRIPT` đọc lựa chọn, gặp `system` thì dùng `matchMedia`, và gắn listener để khi hệ điều hành đổi thì áp lại, nếu lựa chọn vẫn là `system`. Component `ThemeSetting` dùng `useSyncExternalStore` (server snapshot `light`) và Segmented. Xoá `ThemeToggle.tsx`. Có test cho `resolveTheme`. | `src/lib/theme.ts`, `src/components/ThemeSetting.tsx`, `src/app/layout.tsx`, `tests/unit/theme.test.ts` |
| F07 | Thẻ Tài khoản. Bật đăng nhập chủ: hiện "Đăng nhập bằng Google · {email đã che}" và nút Đăng xuất. `OwnerSignOutButton` đổi sang `Button variant="outline"`, bỏ class compat. Tắt đăng nhập: "Đăng nhập chủ sở hữu đang tắt trên máy này", không có nút. Bỏ `OwnerMenu` khỏi thanh bên và xoá `OwnerMenu.tsx`. | `SettingsClient.tsx`, `OwnerSignOutButton.tsx`, `(app)/layout.tsx` |
| F08 | Trang Khác: thêm phần Giao diện (`ThemeSetting`) và phần Giờ bận gọn, chỉ đọc. Mỗi hàng gồm vạch màu, tên, "T2–T6 · 08:30–18:00". Cả khối là link sang `/settings`. Server đọc `fixedSchedule`. | `src/app/(app)/more/page.tsx` |
| F09 | `/settings/fixed-schedules` (màn cũ trùng chức năng, không còn link nào trỏ tới) đổi thành `redirect("/settings")`. Xoá `FixedSchedulesClient.tsx`. | `src/app/(app)/settings/fixed-schedules/page.tsx` |
| F10 | Hàm thuần `weekdayRange(mask)`: liền nhau thì gộp ("T2–T6"), không liền thì liệt kê ("T3, T5"), đủ tuần thì "Hằng ngày". Dùng cho F08. Có test. | `src/lib/fixed-schedule.ts` |
| F11 | Trang `/ui-kit` có thêm khối xem trước Cài đặt (dữ liệu mẫu, bọc `inert`). | `src/app/ui-kit/page.tsx` |

## Quy tắc
- Phần Đồng bộ với justudy **không** hiện cho tới F6.
- Mỗi thao tác ghi đều có toast tiếng Việt cho cả khi thành công và khi lỗi.
- Không có điểm vàng (`--highlight`) trên màn này.
- Đọc `localStorage` bọc try/catch. Bộ nhớ bị chặn thì chọn giao diện vẫn đổi được màu, chỉ không nhớ.
- Không ghi email gốc vào HTML hay props của client.

## QC
- `tsc`, `vitest` (test mới cho wip, fixed-schedule, theme, maskEmail), `next build` đều qua. Lint không thêm lỗi.
- Các action ghi đều gọi `requireOwner()`. `setWipLimit` và `validateFixed` chặn đầu vào sai.
- Đúng design system: không emoji, không hardcode màu, không class compat trong file đã đổi. Vùng chạm ≥ 44px trên điện thoại.
- Không lệch hydrate với `ThemeSetting`.
