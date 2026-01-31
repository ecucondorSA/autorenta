/**
 * Authentication Stress Tests
 *
 * High-load scenarios for login/logout, session handling, and authentication flows.
 * Tests rapid authentication cycles, concurrent logins, and token management.
 */

import {
  runTests,
  printReport,
  saveReport,
  createTestContext,
  destroyTestContext,
  type TestContext,
  type TestResult,
} from '../../fixtures/test-fixtures';
import { chromium, type BrowserContext, type Page } from 'patchright';
import { config } from '../../patchright.config';
import { NetworkLogger } from '../../utils/network-logger';
import { LoginPage } from '../../page-objects/login.page';
import { TestData } from '../../fixtures/test-data';

// ==================== CONFIGURATION ====================

const AUTH_STRESS_CONFIG = {
  // Concurrent login attempts
  concurrentLogins: parseInt(process.env.AUTH_STRESS_CONCURRENT || '5'),
  // Number of rapid login/logout cycles
  rapidAuthCycles: parseInt(process.env.AUTH_STRESS_CYCLES || '10'),
  // Delay between rapid actions (ms)
  rapidActionDelay: parseInt(process.env.AUTH_STRESS_DELAY || '500'),
  // Max failed login attempts before lockout warning
  maxFailedAttempts: parseInt(process.env.AUTH_STRESS_MAX_FAIL || '10'),
};

// ==================== STRESS TEST DEFINITIONS ====================

/**
 * Test: Concurrent login attempts
 * Simulates multiple users logging in simultaneously
 */
async function testConcurrentLogins(): Promise<void> {
  console.log(`\n🔄 Simulating ${AUTH_STRESS_CONFIG.concurrentLogins} concurrent login attempts...`);

  const userContexts: Array<{
    context: BrowserContext;
    page: Page;
    loginPage: LoginPage;
    networkLogger: NetworkLogger;
  }> = [];
  const results: Array<{
    userId: number;
    success: boolean;
    duration: number;
    authCalls: number;
    errors: string[];
  }> = [];

  try {
    // Launch multiple browser contexts
    for (let i = 0; i < AUTH_STRESS_CONFIG.concurrentLogins; i++) {
      const context = await chromium.launchPersistentContext(
        `${config.browserProfile}-auth-stress-${i}`,
        {
          headless: config.headless,
          viewport: { width: 1280, height: 720 },
          locale: 'es-AR',
        }
      );
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      const networkLogger = new NetworkLogger({ maxEntries: 100 });
      networkLogger.attach(page);
      const loginPage = new LoginPage(page, context, networkLogger);

      userContexts.push({ context, page, loginPage, networkLogger });
    }

    // All users attempt login simultaneously
    const startTime = Date.now();
    const testData = new TestData();

    const loginPromises = userContexts.map(async ({ loginPage, networkLogger }, index) => {
      const userStart = Date.now();
      const errors: string[] = [];

      try {
        await loginPage.goto();
        await loginPage.assertFormLoaded();

        // Attempt login
        await loginPage.login(testData.validUser.email, testData.validUser.password);
        await loginPage.wait(2000);

        // Check for auth API calls
        const authCalls = networkLogger.getApiCalls('auth');

        return {
          userId: index + 1,
          success: authCalls.length > 0,
          duration: Date.now() - userStart,
          authCalls: authCalls.length,
          errors,
        };
      } catch (error) {
        errors.push(`Login failed: ${error}`);
        return {
          userId: index + 1,
          success: false,
          duration: Date.now() - userStart,
          authCalls: 0,
          errors,
        };
      }
    });

    results.push(...(await Promise.all(loginPromises)));
    const totalDuration = Date.now() - startTime;

    // Report results
    const successful = results.filter((r) => r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`\n📊 Concurrent Login Results:`);
    console.log(`   Total time: ${totalDuration}ms`);
    console.log(`   Successful logins: ${successful}/${AUTH_STRESS_CONFIG.concurrentLogins}`);
    console.log(`   Average duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Errors: ${totalErrors}`);

    results.forEach((r) => {
      console.log(`   User ${r.userId}: ${r.success ? '✓' : '✗'}, ${r.duration}ms, ${r.authCalls} auth calls`);
    });

    if (successful < AUTH_STRESS_CONFIG.concurrentLogins * 0.8) {
      throw new Error(`Too many failed concurrent logins: ${AUTH_STRESS_CONFIG.concurrentLogins - successful}`);
    }

  } finally {
    // Cleanup all contexts
    await Promise.all(userContexts.map(({ context }) => context.close().catch(() => {})));
  }
}

/**
 * Test: Rapid login/logout cycles
 * Tests authentication system under rapid session changes
 */
async function testRapidAuthCycles(ctx: TestContext): Promise<void> {
  const { loginPage, page } = ctx;

  console.log(`\n⚡ Testing rapid login/logout cycles (${AUTH_STRESS_CONFIG.rapidAuthCycles} iterations)...`);

  const testData = new TestData();
  const results: Array<{ cycle: number; loginSuccess: boolean; logoutSuccess: boolean; duration: number }> = [];

  for (let i = 0; i < AUTH_STRESS_CONFIG.rapidAuthCycles; i++) {
    const cycleStart = Date.now();
    let loginSuccess = false;
    let logoutSuccess = false;

    try {
      // Login
      await loginPage.goto();
      await loginPage.assertFormLoaded();
      await loginPage.login(testData.validUser.email, testData.validUser.password);
      await loginPage.wait(1500);
      loginSuccess = !loginPage.isOnLoginPage();

      // Logout (clear session)
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await ctx.context.clearCookies();
      await loginPage.wait(500);
      logoutSuccess = true;

      results.push({
        cycle: i + 1,
        loginSuccess,
        logoutSuccess,
        duration: Date.now() - cycleStart,
      });

      if (i % 2 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        cycle: i + 1,
        loginSuccess,
        logoutSuccess,
        duration: Date.now() - cycleStart,
      });
      process.stdout.write('x');
    }

    await loginPage.wait(AUTH_STRESS_CONFIG.rapidActionDelay);
  }

  console.log('\n');

  const successfulCycles = results.filter((r) => r.loginSuccess && r.logoutSuccess).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`\n📊 Rapid Auth Cycle Results:`);
  console.log(`   Successful cycles: ${successfulCycles}/${AUTH_STRESS_CONFIG.rapidAuthCycles}`);
  console.log(`   Average cycle time: ${avgDuration.toFixed(0)}ms`);

  results.slice(0, 5).forEach((r) => {
    console.log(`   Cycle ${r.cycle}: ${r.loginSuccess ? '✓' : '✗'} login, ${r.logoutSuccess ? '✓' : '✗'} logout, ${r.duration}ms`);
  });

  if (successfulCycles < AUTH_STRESS_CONFIG.rapidAuthCycles * 0.9) {
    throw new Error(`Too many failed auth cycles: ${AUTH_STRESS_CONFIG.rapidAuthCycles - successfulCycles}`);
  }
}

/**
 * Test: Failed login stress
 * Tests system behavior under repeated failed login attempts
 */
async function testFailedLoginStress(ctx: TestContext): Promise<void> {
  const { loginPage, networkLogger } = ctx;

  console.log(`\n🔒 Testing failed login stress (${AUTH_STRESS_CONFIG.maxFailedAttempts} attempts)...`);

  const testData = new TestData();
  const results: Array<{ attempt: number; duration: number; errorMessage?: string }> = [];

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  for (let i = 0; i < AUTH_STRESS_CONFIG.maxFailedAttempts; i++) {
    const attemptStart = Date.now();

    try {
      // Attempt login with invalid credentials
      await loginPage.login(testData.invalidUser.email, testData.invalidUser.password);
      await loginPage.wait(1000);

      const stillOnLogin = loginPage.isOnLoginPage();
      const errorMessage = await loginPage.getErrorMessage();

      results.push({
        attempt: i + 1,
        duration: Date.now() - attemptStart,
        errorMessage: errorMessage || undefined,
      });

      if (i % 3 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        attempt: i + 1,
        duration: Date.now() - attemptStart,
        errorMessage: (error as Error).message,
      });
      process.stdout.write('x');
    }

    await loginPage.wait(200);
  }

  console.log('\n');

  // Check for rate limiting or unusual responses
  const authCalls = networkLogger.getApiCalls('auth');
  const failedRequests = networkLogger.getFailedRequests();

  console.log(`\n📊 Failed Login Stress Results:`);
  console.log(`   Total attempts: ${results.length}`);
  console.log(`   Auth API calls: ${authCalls.length}`);
  console.log(`   Failed requests: ${failedRequests.length}`);

  const avgResponse = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`   Average response time: ${avgResponse.toFixed(0)}ms`);

  // Check for consistent response times (rate limiting would show delays)
  const responseTimes = results.map((r) => r.duration);
  const maxTime = Math.max(...responseTimes);
  if (maxTime > 5000) {
    console.log(`   ⚠️  Max response time ${maxTime}ms suggests rate limiting may be active`);
  }
}

/**
 * Test: Session persistence under stress
 * Tests that sessions remain valid during rapid page navigation
 */
async function testSessionPersistenceUnderStress(ctx: TestContext): Promise<void> {
  const { loginPage, page, marketplacePage } = ctx;

  console.log(`\n🔄 Testing session persistence under stress...`);

  const testData = new TestData();

  // Login first
  await loginPage.goto();
  await loginPage.assertFormLoaded();
  await loginPage.login(testData.validUser.email, testData.validUser.password);
  await loginPage.wait(2000);

  // Check if login succeeded
  if (loginPage.isOnLoginPage()) {
    throw new Error('Failed to login before session persistence test');
  }

  // Store initial session data
  const initialSession = await page.evaluate(() => {
    return {
      localStorage: { ...localStorage },
      timestamp: Date.now(),
    };
  });

  console.log(`   Initial session stored (${Object.keys(initialSession.localStorage).length} keys)`);

  // Rapidly navigate through different pages
  const pages = [
    '/',
    '/cars/list',
    '/cars/car-1001',
    '/bookings',
    '/profile',
    '/wallet',
    '/marketplace',
  ];

  const navigationResults: Array<{ page: string; success: boolean; sessionValid: boolean }> = [];

  for (let i = 0; i < 30; i++) {
    const targetPage = pages[i % pages.length];

    try {
      await marketplacePage.navigate(targetPage);
      await page.waitForTimeout(300);

      // Check session still valid
      const currentSession = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return {
          hasAuth: keys.some((k) => k.includes('auth') || k.includes('supabase')),
          keyCount: keys.length,
        };
      });

      navigationResults.push({
        page: targetPage,
        success: true,
        sessionValid: currentSession.hasAuth,
      });

      if (i % 5 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      navigationResults.push({
        page: targetPage,
        success: false,
        sessionValid: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successfulNavs = navigationResults.filter((r) => r.success).length;
  const sessionValidCount = navigationResults.filter((r) => r.sessionValid).length;

  console.log(`\n📊 Session Persistence Results:`);
  console.log(`   Total navigations: ${navigationResults.length}`);
  console.log(`   Successful: ${successfulNavs}`);
  console.log(`   Session remained valid: ${sessionValidCount}/${navigationResults.length}`);

  if (sessionValidCount < navigationResults.length * 0.9) {
    throw new Error(`Session invalidated too often: ${navigationResults.length - sessionValidCount} times`);
  }
}

/**
 * Test: Token refresh stress
 * Tests behavior when tokens need frequent refreshing
 */
async function testTokenRefreshStress(ctx: TestContext): Promise<void> {
  const { loginPage, page, networkLogger } = ctx;

  console.log(`\n🔄 Testing token refresh behavior...`);

  const testData = new TestData();

  // Login
  await loginPage.goto();
  await loginPage.assertFormLoaded();
  await loginPage.login(testData.validUser.email, testData.validUser.password);
  await loginPage.wait(2000);

  // Clear and observe re-auth behavior
  const results: Array<{ iteration: number; action: string; success: boolean; duration: number }> = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();

    try {
      // Simulate token clearing and subsequent request
      await page.evaluate(() => {
        // Remove specific auth keys to force refresh
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('access_token') || key.includes('expires_at')) {
            localStorage.removeItem(key);
          }
        });
      });

      await page.waitForTimeout(100);

      // Make an authenticated request
      await page.evaluate(() => {
        // Trigger a fetch to trigger auth
        return fetch('/api/health').catch(() => {});
      });

      await page.waitForTimeout(500);

      results.push({
        iteration: i + 1,
        action: 'token-clear-and-request',
        success: true,
        duration: Date.now() - start,
      });

      process.stdout.write('.');
    } catch (error) {
      results.push({
        iteration: i + 1,
        action: 'token-clear-and-request',
        success: false,
        duration: Date.now() - start,
      });
      process.stdout.write('x');
    }

    await page.waitForTimeout(300);
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`\n📊 Token Refresh Results:`);
  console.log(`   Successful iterations: ${successful}/${results.length}`);
  console.log(`   Average duration: ${avgDuration.toFixed(0)}ms`);

  // Check for refresh token API calls
  const tokenCalls = networkLogger.getApiCalls(/token|refresh|auth/);
  console.log(`   Token-related API calls: ${tokenCalls.length}`);
}

/**
 * Test: Password input stress
 * Tests form behavior with rapid input changes
 */
async function testPasswordInputStress(ctx: TestContext): Promise<void> {
  const { loginPage, page } = ctx;

  console.log(`\n⌨️ Testing password input stress (50 rapid inputs)...`);

  await loginPage.goto();
  await loginPage.assertFormLoaded();

  const passwords = [
    'short',
    'a'.repeat(100),
    'Test123!@#',
    'invalid',
    'another-test-password-123',
    '',
    '123456',
  ];

  const results: Array<{ iteration: number; duration: number; submitEnabled: boolean }> = [];

  for (let i = 0; i < 50; i++) {
    const start = Date.now();

    try {
      const password = passwords[i % passwords.length];

      // Clear and fill password
      await loginPage.fillPassword(password);
      await page.waitForTimeout(50);

      // Check if submit button is enabled
      const submitEnabled = await loginPage.isSubmitEnabled();

      results.push({
        iteration: i + 1,
        duration: Date.now() - start,
        submitEnabled,
      });

      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        duration: Date.now() - start,
        submitEnabled: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.duration < 500).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`\n📊 Password Input Stress Results:`);
  console.log(`   Successful rapid inputs: ${successful}/${results.length}`);
  console.log(`   Average input time: ${avgDuration.toFixed(0)}ms`);
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'concurrent-logins', fn: testConcurrentLogins },
  { name: 'rapid-auth-cycles', fn: testRapidAuthCycles },
  { name: 'failed-login-stress', fn: testFailedLoginStress },
  { name: 'session-persistence-stress', fn: testSessionPersistenceUnderStress },
  { name: 'token-refresh-stress', fn: testTokenRefreshStress },
  { name: 'password-input-stress', fn: testPasswordInputStress },
];

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     AUTHENTICATION STRESS TESTS (Patchright)             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.headless}`);
  console.log(`\nStress Configuration:`);
  console.log(`  Concurrent Logins: ${AUTH_STRESS_CONFIG.concurrentLogins}`);
  console.log(`  Rapid Auth Cycles: ${AUTH_STRESS_CONFIG.rapidAuthCycles}`);
  console.log(`  Rapid Action Delay: ${AUTH_STRESS_CONFIG.rapidActionDelay}ms`);
  console.log(`  Max Failed Attempts: ${AUTH_STRESS_CONFIG.maxFailedAttempts}`);
  console.log('');

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`\n┌─────────────────────────────────────────────────────────┐`);
    console.log(`│ Running: ${test.name.padEnd(45)}│`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    const startTime = Date.now();
    let passed = false;
    let error: { message: string; stack?: string } | undefined;

    try {
      // Special handling for concurrent test which manages its own context
      if (test.name === 'concurrent-logins') {
        await test.fn();
      } else {
        const ctx = await createTestContext({ headless: config.headless });
        try {
          await test.fn(ctx);
        } finally {
          await destroyTestContext(ctx);
        }
      }
      passed = true;
      console.log(`  ✓ PASSED (${Date.now() - startTime}ms)`);
    } catch (err) {
      error = {
        message: (err as Error).message,
        stack: (err as Error).stack,
      };
      console.log(`  ✗ FAILED: ${error.message}`);
    }

    results.push({
      name: test.name,
      suite: 'auth-stress',
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'auth-stress-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} stress test(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All authentication stress tests passed!');
}

// Run if executed directly
main().catch((error) => {
  console.error('Auth stress test runner failed:', error);
  process.exit(1);
});

export { tests };
