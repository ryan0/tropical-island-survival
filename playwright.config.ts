import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  forbidOnly: Boolean(process.env.CI),
  // Finds the reference build before the tests; turns what they recorded into the review page after.
  globalSetup: './tests/prepare-run.ts',
  // (On GitHub a failed test is written onto the run's own page too, where it can be read
  // without opening the log.)
  reporter: process.env.CI
    ? [['list'], ['github'], ['./tests/review-reporter.ts']]
    : [['list'], ['./tests/review-reporter.ts']],
  fullyParallel: true,
  // A scene test draws in the software renderer: seconds a picture here, and several times that
  // on a small shared machine.
  timeout: 300_000,
  use: {
    browserName: 'chromium',
    viewport: { width: 420, height: 420 },
    // The scene needs WebGL, and a machine without a graphics card must still be able to draw it.
    launchOptions: {
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
});
