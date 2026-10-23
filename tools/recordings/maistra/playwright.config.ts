import { defineConfig, devices } from '@playwright/test';

// Captures the portfolio's mAIstra screens with the e2e fake backend.
export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4200',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Manila',
  },
  webServer: {
    command: 'npx ng serve --port 4200',
    cwd: '/Users/johncalen.nombrado/Desktop/mAIstra/maistra_web',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
