import { defineConfig } from '@playwright/test';

const reuseExistingServer = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === '1';
const playwrightPort = Number(process.env.PLAYWRIGHT_PORT || 4417);
const baseURL = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: reuseExistingServer ? undefined : {
    command: `bunx --bun vite --host 127.0.0.1 --port ${playwrightPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  workers: process.env.CI ? 1 : undefined,
});
