import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // 🛡️ R-JL-TWO-FACES: chặn portal/LMS code import DB cá nhân (personal.db).
  // Bất biến: code trong portal/**, lib/lms/**, api/lms/** KHÔNG ĐƯỢC import @/db/client.
  // Vi phạm → build FAIL (không phải chỉ review thủ công). ADR-003 QĐ6.
  {
    files: [
      'src/app/portal/**/*.{ts,tsx}',
      'src/lib/lms/**/*.{ts,tsx}',
      'src/app/api/lms/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@/db/client',
            message: '❌ R-JL-TWO-FACES: Code LMS/portal KHÔNG được import DB cá nhân (@/db/client). Dùng @/db/lms/client.',
          },
          {
            name: '@/db/schema',
            message: '❌ R-JL-TWO-FACES: Code LMS/portal KHÔNG được import schema cá nhân (@/db/schema). Dùng @/db/lms/schema.',
          },
        ],
      }],
    },
  },
])
