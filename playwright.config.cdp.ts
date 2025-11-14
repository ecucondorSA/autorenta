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
 * Features:
 * - Live debugging with breakpoints
 * - Real-time DOM inspection
 * - Network monitoring
 * - Console logging
 * - Performance profiling
 *
 * Usage:
 * 1. Start Chrome: ./scripts/chrome-dev.sh
 * 2. Start dev server: npm run dev:web
 * 3. Get WebSocket endpoint: ./scripts/get-chrome-ws.sh
 * 4. Run tests: ./scripts/test-with-cdp.sh
 * 5. Or with UI: ./scripts/test-with-cdp.sh --ui
 * 6. Or directly: npx playwright test --config=playwright.config.cdp.ts
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

    // Action timeout (longer for debugging)
    actionTimeout: 30 * 1000,

    // Navigation timeout (longer for debugging)
    navigationTimeout: 60 * 1000,

    // Connect to existing Chrome via CDP
    connectOptions: {
      wsEndpoint: process.env.CHROME_CDP_WS_ENDPOINT || 'ws://localhost:9222/devtools/browser',
    },

    // Enable DevTools features
    launchOptions: {
      devtools: true,
      slowMo: 500, // Slow down actions for debugging
      headless: false, // Always visible for debugging
    },

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },

    // Ignore HTTPS errors for dev
    ignoreHTTPSErrors: true,

    // Locale and timezone for consistent testing
    locale: 'es-ES',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },

  // Configure projects for live debugging
  projects: [
    {
      name: 'chrome-cdp-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Chrome CDP connection is configured in use.connectOptions above
      },
    },
    {
      name: 'chrome-cdp-mobile',
      use: {
        ...devices['iPhone 13 Pro'],
        // Chrome CDP connection is configured in use.connectOptions above
      },
    },
    {
      name: 'chrome-cdp-tablet',
      use: {
        ...devices['iPad Pro'],
        // Chrome CDP connection is configured in use.connectOptions above
      },
    },
  ],

  // Don't start webServer - assume dev server is already running
  // webServer: undefined,

  // Output folder for test artifacts
  outputDir: 'test-results/artifacts',
});
