import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

/**
 * Playwright Configuration for Live Development with Chrome CDP
 *
 * This config connects to an already-running Chrome instance via CDP
 * for real-time test execution and debugging.
 *
 * Usage:
 * 1. Start Chrome: ./scripts/chrome-dev.sh
 * 2. Start dev server: npm run dev:web
 * 3. Run tests: npx playwright test --config=playwright.config.cdp.ts
 * 4. Or with UI: npx playwright test --config=playwright.config.cdp.ts --ui
 */

export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run sequentially for easier debugging
  forbidOnly: false,
  retries: 0, // No retries for live debugging
  workers: 1, // One worker for live debugging

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',

    // Collect trace always for debugging
    trace: 'on',

    // Screenshot always for debugging
    screenshot: 'on',

    // Video always for debugging
    video: 'on',

    // Action timeout
    actionTimeout: 15 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,

    // Connect to existing Chrome via CDP
    connectOptions: {
      wsEndpoint: process.env.CHROME_CDP_WS_ENDPOINT,
    },
  },

  // Configure single project for live debugging
  projects: [
    {
      name: 'chrome-cdp',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome CDP connection is configured in use.connectOptions above
      },
    },
  ],

  // Don't start webServer - assume dev server is already running
  // webServer: undefined,

  // Output folder for test artifacts
  outputDir: 'test-results/artifacts',
});
