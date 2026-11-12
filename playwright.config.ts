import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: { browserName: 'chromium' },
});
