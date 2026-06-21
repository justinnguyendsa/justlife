# Conformance — MVP-Task-Deadline (mode: SPEC)

**Date:** 21062026 · **Verifier:** spec-conformance-verifier · **Verdict: ✅ FULL** (re-verified sau vá)

> Lần 1 = 🚫 CRITICAL (4 vấn đề). Sau vá UIUX + Tech Spec → lần 2 = ✅ FULL. Sẵn sàng `/justlife-develop`.

## Nguồn (đã cập nhật)
- US: `user-stories/US-MVP-Task-Deadline-21062026.md` (9 US, 45 AC)
- Tech: `tech-specs/SPEC-MVP-Task-Deadline-21062026.md` (6 bảng, **27 task**)
- UIUX: `uiux-specs/UIUX-MVP-Task-Deadline-21062026.md` (**7 màn**)

## Kết quả
| Loại | Số AC |
|---|---|
| ✅ COVERED | 45 / 45 |
| ⚠️ PARTIAL | 0 |
| 🚫 GAP | 0 |

## 4 vấn đề lần trước — đã đóng
| Mã | Vấn đề | Đóng bằng |
|---|---|---|
| GAP-01 (CRITICAL) | Tạo/sửa time-block thiếu UIUX (AC-05-2/3/4, P0) | UIUX **S7 Calendar kéo-thả** (desktop drag + mobile tap/long-press) + Tech **T26/T27**; US-05 giữ P0, hết mâu thuẫn |
| GAP-02 | Thiếu màn chỉnh WIP-limit (AC-04-4) | UIUX **S6b** `/settings/wip` (WipLimitStepper → T07) |
| GAP-03 | Logic escalation chưa rõ (AC-08) | Tech: init 4 mốc (T-7/3/1→1, T-0→2) + `effectiveEscalation()` tính overdue **read-time** + snooze read-time, không cron |
| DATA-MODEL | `wip_limit` thừa ở bảng `task` | Đã xóa; chỉ còn ở `user_settings` |

## Kết luận
**Sẵn sàng `/justlife-develop`.** Builder bắt đầu Wave A (T02 priority.ts · T03 scheduler.ts · T07 settings) song song sau khi T01 migration xong. Edge case (timezone Asia/HCM, lịch trùng, offline-defer, empty) đã phủ.
