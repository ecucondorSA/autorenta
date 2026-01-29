/**
 * Playwright E2E Test Configuration
 *
 * Standard Playwright config for CI/CD testing.
 * For MercadoPago payment tests, use patchright.config.ts instead.
 */
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'artifacts/html', open: 'never' }],
    ['json', { outputFile: 'artifacts/results.json' }],
    isCI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env.E2E_WEB_URL || process.env.BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    // Increase navigation timeout for CI stability
    navigationTimeout: isCI ? 60000 : 30000,
    actionTimeout: isCI ? 30000 : 15000,
  },

  // Increase timeouts for CI environment stability
  timeout: isCI ? 60000 : 30000,
  expect: {
    timeout: isCI ? 15000 : 10000,
  },

  outputDir: 'artifacts/test-results',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport for responsive testing
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      testMatch: /.*mobile.*\.spec\.ts/,
    },
  ],

  // Web server config - start dev server if needed
  webServer: isCI
    ? undefined // In CI, server is started separately
    : {
        command: 'pnpm dev:web',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
