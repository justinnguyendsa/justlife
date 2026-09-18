import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

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
