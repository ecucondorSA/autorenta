import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

/**
 * Playwright Configuration for E2E Tests Only
 * No web server dependency for faster testing
 */

export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests - assume app is already running
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',

    // Collect trace when retrying failed test
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers and viewports
  projects: [
    // E2E tests (assumes app is already running)
    {
      name: 'chromium:e2e',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/renter/journey/*.spec.ts',
    },

    // Mobile Safari - Renter (critical user flow)
    {
      name: 'mobile-safari:renter',
      use: {
        ...devices['iPhone 13 Pro'],
      },
      testMatch: '**/renter/journey/*.spec.ts',
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/artifacts',
});


