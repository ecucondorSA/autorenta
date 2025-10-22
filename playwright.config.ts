import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for AutoRenta E2E Tests
 *
 * Configured for:
 * - Multi-role testing (visitor, renter, owner, admin)
 * - Mobile and desktop viewports
 * - Dark mode testing
 * - Visual regression
 * - API testing integration
 */

export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
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
    // Setup projects for authentication states
    {
      name: 'setup:visitor',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup:renter',
      testMatch: /fixtures\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/renter.json',
      },
    },
    {
      name: 'setup:owner',
      testMatch: /fixtures\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/owner.json',
      },
    },
    {
      name: 'setup:admin',
      testMatch: /fixtures\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
    },

    // Auth tests (no auth required - they test registration/login)
    {
      name: 'chromium:auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/auth/**/*.spec.ts',
    },

    // Wallet UI tests (no auth required - basic UI validation)
    {
      name: 'chromium:wallet-ui',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/wallet/*-ui.spec.ts',
    },

    // Wallet functional tests (requires renter auth)
    {
      name: 'chromium:wallet',
      dependencies: ['setup:renter'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/renter.json',
      },
      testMatch: '**/wallet/*-deposit*.spec.ts',
    },

    // Desktop browsers - Visitor (no auth)
    {
      name: 'chromium:visitor',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/visitor/**/*.spec.ts',
    },

    // Desktop browsers - Renter
    {
      name: 'chromium:renter',
      dependencies: ['setup:renter'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/renter.json',
      },
      testMatch: '**/renter/**/*.spec.ts',
    },

    // Desktop browsers - Owner
    {
      name: 'chromium:owner',
      dependencies: ['setup:owner'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/owner.json',
      },
      testMatch: '**/owner/**/*.spec.ts',
    },

    // Desktop browsers - Admin
    {
      name: 'chromium:admin',
      dependencies: ['setup:admin'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
      testMatch: '**/admin/**/*.spec.ts',
    },

    // Mobile Safari - Renter (critical user flow)
    {
      name: 'mobile-safari:renter',
      dependencies: ['setup:renter'],
      use: {
        ...devices['iPhone 13 Pro'],
        storageState: 'tests/.auth/renter.json',
      },
      testMatch: '**/renter/{search,booking,wallet}/*.spec.ts',
    },

    // Mobile Chrome - Owner (car publication flow)
    {
      name: 'mobile-chrome:owner',
      dependencies: ['setup:owner'],
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/.auth/owner.json',
      },
      testMatch: '**/owner/publication/*.spec.ts',
    },

    // Dark mode testing (Desktop Chrome only for speed)
    {
      name: 'chromium:dark-mode',
      dependencies: ['setup:renter'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/renter.json',
        colorScheme: 'dark',
      },
      testMatch: '**/visual/dark-mode.spec.ts',
    },

    // Visual regression (WebKit for consistency)
    {
      name: 'webkit:visual',
      dependencies: ['setup:renter'],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/.auth/renter.json',
      },
      testMatch: '**/visual/*.spec.ts',
    },
  ],

  // Run dev server before starting tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: './apps/web',
  },

  // Output folder for test artifacts
  outputDir: 'test-results/artifacts',
});
