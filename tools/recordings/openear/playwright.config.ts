import { defineConfig, devices } from '@playwright/test';

// Records the OpenEar offline web build (notes and progress on the device).
export default defineConfig({
  testDir: '.',
  timeout: 400_000,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4330',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: `npx --yes http-server@14.1.1 ${process.env['OPENEAR_WEB']} -p 4330 -a 127.0.0.1 -c-1 --silent`,
    url: 'http://127.0.0.1:4330',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
