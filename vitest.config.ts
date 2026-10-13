import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Chạy test với giờ UTC như server Vercel: lỗi tính ngày theo giờ máy sẽ lộ ra ngay ở máy dev
// (máy đặt giờ Việt Nam che mất lỗi). Đặt trước khi worker khởi động nên mọi Date đều theo UTC.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // 🛡️ P0-T08: KHÔNG quét worktree tạm của agent.
    // Trước đây vitest gom cả .claude/worktrees/** nên báo "6 test file / 69 test"
    // trong khi thật ra chỉ có 2 file / 23 test — cùng bộ test chạy lặp 3 lần trên
    // CODE CŨ. Gate "test pass" vì thế cho kết quả sai.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/**'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
});
