import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Smoke HTTP trên `next start` (ADR-005 3a §7.9). Tách khỏi `npm test` thường ngày — chạy bằng
// `npm run test:smoke` trước khi merge các bước nâng cấp (3b, 3c) và trước deploy lớn.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/smoke/**/*.smoke.ts"],
    globalSetup: ["tests/smoke/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
