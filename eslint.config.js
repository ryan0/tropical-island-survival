import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Build 78's program, brought across as it was (docs/REFACTOR_PLAN.md, step 3). The standards
// apply to each part as it is cleaned and leaves this folder.
const LIFTED = 'src/lifted/**';

export default defineConfig(
  globalIgnores(['dist/', 'site/', 'legacy/', 'test-results/', 'playwright-report/']),
  {
    ignores: [LIFTED],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `${count} pixels` is clearer than `${String(count)} pixels`.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  { files: ['**/*.js'], ignores: [LIFTED], extends: [tseslint.configs.disableTypeChecked] },
  {
    // Until then one rule holds: every name a file uses is its own, imported, or the browser's.
    // In build 78 the files shared one scope and a script checked this; now a forgotten import
    // would only show when that line runs.
    files: [LIFTED],
    languageOptions: {
      globals: {
        clearTimeout: 'readonly',
        console: 'readonly',
        document: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: { 'no-undef': 'error' },
  },
);
