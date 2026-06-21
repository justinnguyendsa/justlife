---
description: Fix a bug in justlife — reproduce, root-cause, fix, verify, guard against regression. Respects the QC gate before any deploy.
argument-hint: "<bug description, with where it happens>"
---

# /justlife-bug-fix $ARGUMENTS

> Quy trình sửa bug có kỷ luật — không "vá mù". Đọc context trước: `tech-stack.md`, `design-system.md`, rules.

## 1. Tái hiện
Xác định bước tái hiện + môi trường (local/prod). Không tái hiện được → hỏi chủ dự án thêm chi tiết. Đặc biệt chú ý **múi giờ / lịch cố định** (lỗi hay gặp của app này).

## 2. Root-cause
Spawn worker theo vùng:
- UI/giao diện → `frontend-builder`
- API/dữ liệu → `backend-builder`
- Sai số liệu/metric → `data-analyst`
Tìm nguyên nhân gốc, không chỉ triệu chứng. Giải thích song ngữ (R-JL-DUAL-LANG-EXPLAIN-01).

## 3. Fix
Sửa tối thiểu, đúng chỗ. Tiện tay fix bug nhỏ kế bên (R-JL-FIX-ON-SIGHT-01) nhưng KHÔNG mở rộng scope.

## 4. Verify + chống hồi quy
- typecheck + build pass (R-JL-VERIFY-BUILD-01)
- `regression-detector` quét diff (đặc biệt date/timezone)
- Nếu prod: `qa-verifier` + `uat-worker` lại đường đi của bug trước khi `/justlife-ship`.

## 5. Ghi lại
`knowledge-keeper`: nếu là lỗi dễ lặp → thêm rule/lesson. Append log_activity.

## Output cho chủ dự án
Nguyên nhân (bình dân + kỹ thuật) · file đã sửa · cách đã verify · rủi ro còn lại.
