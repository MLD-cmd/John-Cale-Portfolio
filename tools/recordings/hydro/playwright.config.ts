import { defineConfig, devices } from '@playwright/test';

// Records the Hydro-Tracker offline web build (device storage, no account service).
export default defineConfig({
  testDir: '.',
  timeout: 400_000,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4320',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    // Headless Chromium draws with a software renderer by default, and the
    // app's animations drop frames there; this uses the Mac's GPU instead.
    headless: true,
    channel: 'chromium',
    launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: `npx --yes http-server@14.1.1 ${process.env['HYDRO_WEB']} -p 4320 -a 127.0.0.1 -c-1 --silent`,
    url: 'http://127.0.0.1:4320',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
