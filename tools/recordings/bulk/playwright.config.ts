import { defineConfig, devices } from '@playwright/test';

// Records the Bulk Buying preview build (sample data, mock sign-in, no backend).
export default defineConfig({
  testDir: '.',
  timeout: 240_000,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4310',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: `npx --yes http-server@14.1.1 ${process.env['BULK_WEB']} -p 4310 -a 127.0.0.1 -c-1 --silent`,
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
