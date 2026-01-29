/**
 * Test Fixtures
 *
 * Provides test context setup/teardown and common test helpers.
 * Uses Patchright for anti-bot bypass capabilities.
 */

import { chromium, type BrowserContext, type Page } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { config } from '../patchright.config';
import { NetworkLogger, assertNoPageErrors } from '../utils/network-logger';
import { LoginPage } from '../page-objects/login.page';
import { MarketplacePage } from '../page-objects/marketplace.page';
import { PaymentPage } from '../page-objects/payment.page';
import { TestData } from './test-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== TYPES ====================

export interface TestContext {
  context: BrowserContext;
  page: Page;
  networkLogger: NetworkLogger;
  testData: TestData;
  // Page Objects
  loginPage: LoginPage;
  marketplacePage: MarketplacePage;
  paymentPage: PaymentPage;
}

export interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  screenshotPath?: string;
  logsPath?: string;
}

export interface TestOptions {
  headless?: boolean;
  persistentProfile?: string;
  screenshotOnFailure?: boolean;
  saveLogsOnFailure?: boolean;
  testName?: string;
  suite?: string;
}

// ==================== TEST CONTEXT ====================

/**
 * Create a fresh test context with browser, page, and page objects
 */
export async function createTestContext(
  options: TestOptions = {}
): Promise<TestContext> {
  const {
    headless = config.headless,
    persistentProfile = config.browserProfile,
  } = options;

  // Launch persistent browser context
  const context = await chromium.launchPersistentContext(persistentProfile, {
    headless,
    slowMo: config.slowMo,
    viewport: { width: 1280, height: 720 },
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    // Patchright-specific: no custom userAgent for stealth
  });

  // Get or create page
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  // Enable debug mode via localStorage
  await page.addInitScript(() => {
    localStorage.setItem('autorentar_debug', 'true');
  });

  // Create network logger and attach to page
  const networkLogger = new NetworkLogger({
    maxEntries: 500,
    captureHeaders: false,
    filterUrls: ['google-analytics', 'facebook', 'hotjar'], // Skip analytics
  });
  networkLogger.attach(page);

  // Create test data instance
  const testData = new TestData();

  // Create page objects
  const loginPage = new LoginPage(page, context, networkLogger);
  const marketplacePage = new MarketplacePage(page, context, networkLogger);
  const paymentPage = new PaymentPage(page, context, networkLogger);

  return {
    context,
    page,
    networkLogger,
    testData,
    loginPage,
    marketplacePage,
    paymentPage,
  };
}

/**
 * Cleanup test context
 */
export async function destroyTestContext(ctx: TestContext): Promise<void> {
  try {
    await ctx.context.close();
  } catch (error) {
    console.error('Error closing browser context:', error);
  }
}

// ==================== TEST RUNNER ====================

/**
 * Run a single test with automatic setup/teardown
 */
export async function runTest<T>(
  name: string,
  testFn: (ctx: TestContext) => Promise<T>,
  options: TestOptions = {}
): Promise<TestResult> {
  const startTime = Date.now();
  const ctx = await createTestContext(options);
  let result: TestResult = {
    name,
    suite: options.suite || 'default',
    passed: false,
    duration: 0,
  };

  try {
    await testFn(ctx);
    result.passed = true;
  } catch (error) {
    const err = error as Error;
    result.error = {
      message: err.message,
      stack: err.stack,
    };

    // Take screenshot on failure
    if (options.screenshotOnFailure !== false) {
      try {
        const screenshotPath = path.join(
          config.reportsDir,
          `${options.suite || 'test'}-${name}-failure-${Date.now()}.png`
        );
        await ctx.page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshotPath = screenshotPath;
      } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError);
      }
    }

    // Save network logs on failure
    if (options.saveLogsOnFailure !== false) {
      try {
        const logsPath = path.join(
          config.reportsDir,
          `${options.suite || 'test'}-${name}-logs-${Date.now()}.json`
        );
        fs.writeFileSync(logsPath, ctx.networkLogger.export());
        result.logsPath = logsPath;
      } catch (logsError) {
        console.error('Failed to save logs:', logsError);
      }
    }
  } finally {
    result.duration = Date.now() - startTime;
    await destroyTestContext(ctx);
  }

  return result;
}

/**
 * Run multiple tests sequentially
 */
export async function runTests(
  tests: Array<{ name: string; fn: (ctx: TestContext) => Promise<void> }>,
  options: TestOptions = {}
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`\nRunning: ${test.name}`);
    const result = await runTest(test.name, test.fn, options);

    if (result.passed) {
      console.log(`  ✓ PASSED (${result.duration}ms)`);
    } else {
      console.log(`  ✗ FAILED: ${result.error?.message}`);
      if (result.screenshotPath) {
        console.log(`    Screenshot: ${result.screenshotPath}`);
      }
      if (result.logsPath) {
        console.log(`    Logs: ${result.logsPath}`);
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Run test with existing context (for test chains)
 */
export async function withTestContext<T>(
  testFn: (ctx: TestContext) => Promise<T>,
  options: TestOptions = {}
): Promise<T> {
  const ctx = await createTestContext(options);

  try {
    return await testFn(ctx);
  } finally {
    await destroyTestContext(ctx);
  }
}

// ==================== TEST HELPERS ====================

/**
 * Login before test (helper for authenticated tests)
 */
export async function loginBeforeTest(
  ctx: TestContext,
  credentials?: { email: string; password: string }
): Promise<void> {
  const creds = credentials || ctx.testData.validUser;
  await ctx.loginPage.goto();
  await ctx.loginPage.login(creds.email, creds.password);
  // Wait for navigation away from login
  await ctx.page.waitForTimeout(2000);
}

/**
 * Clear session (logout)
 */
export async function clearSession(ctx: TestContext): Promise<void> {
  // Navigate to a valid page first if we're on about:blank
  // This is required because localStorage is not accessible on about:blank
  const currentUrl = ctx.page.url();
  if (currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    await ctx.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  }

  // Now safely clear storage
  try {
    await ctx.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // Ignore if localStorage is still not accessible
  }
  await ctx.context.clearCookies();
}

/**
 * Assert no errors occurred during test
 */
export async function assertNoErrors(ctx: TestContext): Promise<void> {
  assertNoPageErrors(ctx.networkLogger);
}

// ==================== REPORT GENERATION ====================

/**
 * Generate test report summary
 */
export function generateReport(results: TestResult[]): string {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const lines: string[] = [
    '',
    '═'.repeat(60),
    'E2E TEST REPORT',
    '═'.repeat(60),
    `Total:    ${results.length}`,
    `Passed:   ${passed}`,
    `Failed:   ${failed}`,
    `Duration: ${totalDuration}ms`,
    '─'.repeat(60),
  ];

  if (failed > 0) {
    lines.push('', 'Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        lines.push(`  ✗ ${r.suite}/${r.name}`);
        if (r.error) {
          lines.push(`    Error: ${r.error.message}`);
        }
        if (r.screenshotPath) {
          lines.push(`    Screenshot: ${r.screenshotPath}`);
        }
      });
  }

  lines.push('═'.repeat(60));

  return lines.join('\n');
}

/**
 * Save report to file
 */
export function saveReport(results: TestResult[], filename?: string): string {
  const reportPath = path.join(
    config.reportsDir,
    filename || `e2e-report-${Date.now()}.json`
  );

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    },
    environment: {
      baseUrl: config.baseUrl,
      headless: config.headless,
      nodeVersion: process.version,
    },
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

/**
 * Print report to console
 */
export function printReport(results: TestResult[]): void {
  console.log(generateReport(results));
}
