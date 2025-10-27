import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results/artifacts',
});
