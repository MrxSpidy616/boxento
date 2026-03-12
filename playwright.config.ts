import { defineConfig } from '@playwright/test';

const reuseExistingServer = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4417',
    trace: 'on-first-retry',
  },
  webServer: reuseExistingServer ? undefined : {
    command: 'bunx --bun vite --host 127.0.0.1 --port 4417 --strictPort',
    url: 'http://127.0.0.1:4417',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  workers: process.env.CI ? 1 : undefined,
});
