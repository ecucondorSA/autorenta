/**
 * Base Test Class for AutoRenta E2E Tests
 *
 * Provides common functionality for all e2e tests:
 * - Browser/page management with Patchright
 * - Debug logging integration
 * - Screenshot on failure
 * - Test reporting
 */
import { chromium, type BrowserContext, type Page } from 'patchright';
import { config, navigateTo, screenshotOnFail } from '../patchright.config';
import {
  enableDebugCapture,
  assertNoErrors,
  saveLogsToFile,
  generateTestReport,
  clearLogs,
  LogCollector,
} from './debug-capture';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
  screenshotPath?: string;
  logsPath?: string;
  reportPath?: string;
}

/**
 * Base class for AutoRenta e2e tests
 */
export class AutoRentaTest {
  protected context!: BrowserContext;
  protected page!: Page;
  protected testName: string;
  private startTime: number = 0;
  private logCollector: LogCollector | null = null;

  constructor(testName: string) {
    this.testName = testName;
  }

  /**
   * Setup - run before each test
   */
  async setup(): Promise<void> {
    this.startTime = Date.now();
    console.log(`\n[E2E] Starting: ${this.testName}`);

    // Launch browser with persistent context
    this.context = await chromium.launchPersistentContext(config.browserProfile, {
      headless: config.headless,
      slowMo: config.slowMo,
      viewport: { width: 1280, height: 720 },
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
    });

    // Get or create page
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    // Attach log collector BEFORE navigation to capture all events
    this.logCollector = new LogCollector();
    this.logCollector.attach(this.page);
  }

  /**
   * Teardown - run after each test
   */
  async teardown(passed: boolean, error?: Error): Promise<TestResult> {
    const duration = Date.now() - this.startTime;
    let screenshotPath: string | undefined;
    let logsPath: string | undefined;
    let reportPath: string | undefined;

    try {
      // Only try to save logs if we're on a real page
      const url = this.page.url();
      if (url && !url.startsWith('about:')) {
        // Save logs
        logsPath = await saveLogsToFile(this.page, this.testName);

        // Screenshot on failure
        if (!passed) {
          const screenshotResult = await screenshotOnFail(this.page, this.testName);
          if (screenshotResult) screenshotPath = screenshotResult;
        }

        // Generate report
        reportPath = await generateTestReport(this.page, this.testName, passed, error);
      }
    } catch (e) {
      // Silently ignore teardown errors - test result is more important
    }

    // Close context
    await this.context.close();

    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`[E2E] ${status}: ${this.testName} (${duration}ms)`);

    return {
      name: this.testName,
      passed,
      duration,
      error,
      screenshotPath,
      logsPath,
      reportPath,
    };
  }

  /**
   * Navigate to a path with debug enabled
   */
  async goto(path: string): Promise<void> {
    await navigateTo(this.page, path);
    // Enable debug after navigation (localStorage requires a real page)
    try {
      await enableDebugCapture(this.page);
    } catch {
      // Ignore if page doesn't support localStorage yet
    }
  }

  /**
   * Wait for page to be ready (Angular loaded)
   */
  async waitForAngular(): Promise<void> {
    await this.page.waitForFunction(() => {
      const appRoot = document.querySelector('app-root');
      return appRoot && appRoot.children.length > 0;
    }, { timeout: config.timeout });
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<void> {
    await this.goto('/auth/login');
    await this.waitForAngular();

    // Fill login form
    await this.page.fill('input[type="email"], input[name="email"], [data-testid="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"], [data-testid="password"]', password);

    // Submit
    await this.page.click('button[type="submit"], [data-testid="login-button"]');

    // Wait for navigation away from login page
    await this.page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: config.timeout });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Navigate to valid page first if on about:blank
    const currentUrl = this.page.url();
    if (currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
      await this.goto('/');
    }

    // Clear session storage safely
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      // Ignore if localStorage not accessible
    }
    await this.goto('/');
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const session = localStorage.getItem('sb-aceacpaockyxgogxsfyc-auth-token');
        return !!session;
      });
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout = config.timeout): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout = config.timeout): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Click and wait for navigation
   */
  async clickAndWaitForNavigation(selector: string): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      this.page.click(selector),
    ]);
  }

  /**
   * Assert no errors in debug logs
   */
  async assertNoErrors(): Promise<void> {
    await assertNoErrors(this.page);
  }

  /**
   * Clear debug logs
   */
  async clearLogs(): Promise<void> {
    await clearLogs(this.page);
  }

  /**
   * Take screenshot
   */
  async screenshot(name?: string): Promise<string> {
    const filename = name || `${this.testName}-${Date.now()}`;
    const path = `${config.reportsDir}/${filename}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }
}

/**
 * Run a single test
 */
export async function runTest(
  testName: string,
  testFn: (test: AutoRentaTest) => Promise<void>
): Promise<TestResult> {
  const test = new AutoRentaTest(testName);
  let passed = true;
  let error: Error | undefined;

  try {
    await test.setup();
    await testFn(test);
    await test.assertNoErrors();
  } catch (e) {
    passed = false;
    error = e instanceof Error ? e : new Error(String(e));
    console.error(`[E2E] Error in ${testName}:`, error.message);
  }

  return test.teardown(passed, error);
}

/**
 * Run multiple tests sequentially
 */
export async function runTests(
  tests: Array<{ name: string; fn: (test: AutoRentaTest) => Promise<void> }>
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const { name, fn } of tests) {
    const result = await runTest(name, fn);
    results.push(result);
  }

  // Print summary
  console.log('\n========== E2E Test Results ==========');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`  ${status} ${r.name} (${r.duration}ms)`);
    if (r.error) {
      console.log(`     Error: ${r.error.message}`);
    }
  });

  return results;
}
