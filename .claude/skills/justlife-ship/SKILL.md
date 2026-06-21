---
name: justlife-ship
description: >
  Ship a justlife feature to production — run the deploy checklist and gates, deploy, smoke test.
  Use when a feature passed QC/UAT and is ready to go live, or when the user says "ship", "deploy",
  "lên production", "phát hành".
argument-hint: "<feature/phase to deploy>"
---

# /justlife-ship — Deploy

> Bước 4 trong chuỗi. Chỉ chạy khi mọi cổng xanh + chủ dự án bật đèn (R-JL-QC-GATE-01).

## Bước 0 — Kiểm cổng
QC PASS? UAT PASS? Privacy không LEAK? Nếu chưa → DỪNG, quay lại `/justlife-develop`.

## Bước 1 — Đèn xanh
Hỏi chủ dự án xác nhận deploy (đây là hành động đối ngoại — luôn xác nhận).

## Bước 2 — Spawn `devops-worker`
Chạy checklist: env/secrets đủ · build prod · **backup dữ liệu cá nhân trước migration phá hủy** · migration đúng thứ tự · deploy · **smoke test** · rollback plan sẵn sàng.

## Bước 3 — Sau deploy
- Smoke test pass? Không → rollback, báo chủ dự án.
- `knowledge-keeper` ghi log deploy + bài học.
- `scoreboard-keeper` chấm điểm run.

## Sau khi xong
Báo chủ dự án (song ngữ): URL, kết quả smoke test, có gì cần theo dõi.

## Tips
- Dự án cá nhân → ưu tiên deploy đơn giản, ít hạ tầng (theo tech-stack.md).
- Luôn có đường lùi (rollback) trước khi đụng dữ liệu thật.
