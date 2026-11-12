import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  fullyParallel: true,
  // A scene test draws build 78 in the software renderer: seconds a picture here, and several
  // times that on a small shared machine.
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
