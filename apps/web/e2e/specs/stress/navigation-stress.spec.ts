/**
 * Navigation Stress Tests
 *
 * High-load scenarios for page navigation, routing, and browser history.
 * Tests rapid page changes, back/forward navigation, and deep linking.
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
import { MarketplacePage } from '../../page-objects/marketplace.page';

// ==================== CONFIGURATION ====================

const NAV_STRESS_CONFIG = {
  // Number of rapid navigation iterations
  navIterations: parseInt(process.env.NAV_STRESS_ITERATIONS || '100'),
  // Number of concurrent navigation sessions
  concurrentSessions: parseInt(process.env.NAV_STRESS_CONCURRENT || '3'),
  // Delay between navigations (ms)
  navDelay: parseInt(process.env.NAV_STRESS_DELAY || '50'),
  // Max acceptable navigation time (ms)
  maxNavTime: parseInt(process.env.NAV_STRESS_MAX_TIME || '3000'),
};

// Routes to navigate between
const ROUTES = [
  '/',
  '/cars/list',
  '/auth/login',
  '/auth/register',
  '/marketplace',
  '/cars/car-1001',
  '/cars/car-1002',
  '/cars/car-1003',
  '/about',
  '/contact',
  '/faq',
];

// ==================== STRESS TEST DEFINITIONS ====================

/**
 * Test: Rapid page navigation
 * Tests navigation performance under rapid route changes
 */
async function testRapidPageNavigation(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🚀 Testing rapid page navigation (${NAV_STRESS_CONFIG.navIterations} iterations)...`);

  const results: Array<{
    iteration: number;
    route: string;
    duration: number;
    success: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < NAV_STRESS_CONFIG.navIterations; i++) {
    const route = ROUTES[i % ROUTES.length];
    const start = Date.now();

    try {
      await marketplacePage.navigate(route);
      await page.waitForTimeout(NAV_STRESS_CONFIG.navDelay);

      const duration = Date.now() - start;

      results.push({
        iteration: i + 1,
        route,
        duration,
        success: true,
      });

      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        route,
        duration: Date.now() - start,
        success: false,
        error: (error as Error).message,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);
  const avgDuration = results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) / successful;
  const maxDuration = Math.max(...results.filter((r) => r.success).map((r) => r.duration));

  console.log(`\n📊 Rapid Navigation Results:`);
  console.log(`   Successful: ${successful}/${NAV_STRESS_CONFIG.navIterations}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Average time: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Max time: ${maxDuration}ms`);

  if (failed.length > NAV_STRESS_CONFIG.navIterations * 0.1) {
    throw new Error(`Too many navigation failures: ${failed.length}`);
  }

  if (avgDuration > NAV_STRESS_CONFIG.maxNavTime) {
    throw new Error(`Average navigation too slow: ${avgDuration.toFixed(0)}ms`);
  }
}

/**
 * Test: Back/Forward navigation stress
 * Tests browser history under rapid back/forward navigation
 */
async function testBackForwardNavigation(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n↔️ Testing back/forward navigation stress (${NAV_STRESS_CONFIG.navIterations} cycles)...`);

  // First, build history
  console.log('   Building navigation history...');
  for (let i = 0; i < 10; i++) {
    await marketplacePage.navigate(ROUTES[i % ROUTES.length]);
    await page.waitForTimeout(100);
  }

  const results: Array<{
    iteration: number;
    direction: 'back' | 'forward';
    duration: number;
    success: boolean;
  }> = [];

  for (let i = 0; i < NAV_STRESS_CONFIG.navIterations; i++) {
    const direction = i % 2 === 0 ? 'back' : 'forward';
    const start = Date.now();

    try {
      if (direction === 'back') {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 });
      } else {
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: 5000 });
      }

      await page.waitForTimeout(NAV_STRESS_CONFIG.navDelay / 2);

      results.push({
        iteration: i + 1,
        direction,
        duration: Date.now() - start,
        success: true,
      });

      if (i % 10 === 0) {
        process.stdout.write(direction === 'back' ? '<' : '>');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        direction,
        duration: Date.now() - start,
        success: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const avgDuration = results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) / successful;

  console.log(`\n📊 Back/Forward Navigation Results:`);
  console.log(`   Successful: ${successful}/${NAV_STRESS_CONFIG.navIterations}`);
  console.log(`   Average time: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Back navigations: ${results.filter((r) => r.direction === 'back' && r.success).length}`);
  console.log(`   Forward navigations: ${results.filter((r) => r.direction === 'forward' && r.success).length}`);

  if (successful < NAV_STRESS_CONFIG.navIterations * 0.9) {
    throw new Error(`Too many navigation failures: ${NAV_STRESS_CONFIG.navIterations - successful}`);
  }
}

/**
 * Test: Concurrent navigation sessions
 * Simulates multiple users navigating simultaneously
 */
async function testConcurrentNavigation(): Promise<void> {
  console.log(`\n🔄 Simulating ${NAV_STRESS_CONFIG.concurrentSessions} concurrent navigation sessions...`);

  const sessions: Array<{
    context: BrowserContext;
    page: Page;
    marketplacePage: MarketplacePage;
  }> = [];
  const results: Array<{
    sessionId: number;
    navigations: number;
    errors: number;
    avgDuration: number;
  }> = [];

  try {
    // Launch multiple contexts
    for (let i = 0; i < NAV_STRESS_CONFIG.concurrentSessions; i++) {
      const context = await chromium.launchPersistentContext(
        `${config.browserProfile}-nav-stress-${i}`,
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
      const marketplacePage = new MarketplacePage(page, context, networkLogger);

      sessions.push({ context, page, marketplacePage });
    }

    // Each session navigates independently
    const startTime = Date.now();

    const sessionPromises = sessions.map(async ({ marketplacePage, page }, index) => {
      const navigations: Array<{ route: string; duration: number; success: boolean }> = [];

      for (let i = 0; i < 20; i++) {
        const route = ROUTES[(i + index) % ROUTES.length];
        const start = Date.now();

        try {
          await marketplacePage.navigate(route);
          await page.waitForTimeout(300);

          navigations.push({
            route,
            duration: Date.now() - start,
            success: true,
          });
        } catch {
          navigations.push({
            route,
            duration: Date.now() - start,
            success: false,
          });
        }
      }

      const successful = navigations.filter((n) => n.success);
      return {
        sessionId: index + 1,
        navigations: navigations.length,
        errors: navigations.length - successful.length,
        avgDuration: successful.length > 0
          ? successful.reduce((sum, n) => sum + n.duration, 0) / successful.length
          : 0,
      };
    });

    results.push(...(await Promise.all(sessionPromises)));
    const totalDuration = Date.now() - startTime;

    console.log(`\n📊 Concurrent Navigation Results:`);
    console.log(`   Total time: ${totalDuration}ms`);
    console.log(`   Total navigations: ${results.reduce((sum, r) => sum + r.navigations, 0)}`);
    console.log(`   Total errors: ${results.reduce((sum, r) => sum + r.errors, 0)}`);

    results.forEach((r) => {
      console.log(`   Session ${r.sessionId}: ${r.navigations} navs, ${r.errors} errors, ${r.avgDuration.toFixed(0)}ms avg`);
    });

  } finally {
    await Promise.all(sessions.map(({ context }) => context.close().catch(() => {})));
  }
}

/**
 * Test: Deep link navigation stress
 * Tests direct URL access to various routes
 */
async function testDeepLinkNavigation(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🔗 Testing deep link navigation stress...`);

  const deepLinks = [
    ...ROUTES,
    '/cars/list?brand=Toyota',
    '/cars/list?minPrice=1000&maxPrice=5000',
    '/cars/list?location=Buenos+Aires',
    '/cars/list?page=2',
    '/cars/car-1001?dateFrom=2024-01-01&dateTo=2024-01-07',
  ];

  const results: Array<{
    link: string;
    duration: number;
    success: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < deepLinks.length; i++) {
    const link = deepLinks[i];
    const start = Date.now();

    try {
      // Navigate directly to the deep link
      await page.goto(`${config.baseUrl}${link}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      await page.waitForTimeout(500);

      results.push({
        link,
        duration: Date.now() - start,
        success: true,
      });

      process.stdout.write('.');
    } catch (error) {
      results.push({
        link,
        duration: Date.now() - start,
        success: false,
        error: (error as Error).message,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const avgDuration = results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) / successful;

  console.log(`\n📊 Deep Link Navigation Results:`);
  console.log(`   Successful: ${successful}/${deepLinks.length}`);
  console.log(`   Average time: ${avgDuration.toFixed(0)}ms`);

  results.slice(0, 5).forEach((r) => {
    console.log(`   ${r.link}: ${r.success ? '✓' : '✗'} (${r.duration}ms)`);
  });

  if (successful < deepLinks.length * 0.9) {
    throw new Error(`Too many deep link failures: ${deepLinks.length - successful}`);
  }
}

/**
 * Test: Page reload stress
 * Tests stability under frequent page reloads
 */
async function testPageReloadStress(ctx: TestContext): Promise<void> {
  const { page } = ctx;

  console.log(`\n🔄 Testing page reload stress (${NAV_STRESS_CONFIG.navIterations} reloads)...`);

  // Navigate to marketplace first
  await page.goto(`${config.baseUrl}/cars/list`, {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  await page.waitForTimeout(2000);

  const results: Array<{
    iteration: number;
    duration: number;
    success: boolean;
  }> = [];

  for (let i = 0; i < NAV_STRESS_CONFIG.navIterations; i++) {
    const start = Date.now();

    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(100);

      results.push({
        iteration: i + 1,
        duration: Date.now() - start,
        success: true,
      });

      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        duration: Date.now() - start,
        success: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const avgDuration = results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) / successful;

  console.log(`\n📊 Page Reload Results:`);
  console.log(`   Successful: ${successful}/${NAV_STRESS_CONFIG.navIterations}`);
  console.log(`   Average time: ${avgDuration.toFixed(0)}ms`);

  if (successful < NAV_STRESS_CONFIG.navIterations * 0.95) {
    throw new Error(`Too many reload failures: ${NAV_STRESS_CONFIG.navIterations - successful}`);
  }
}

/**
 * Test: Route parameter stress
 * Tests navigation with various route parameters
 */
async function testRouteParameterStress(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🔢 Testing route parameter stress...`);

  const paramVariations = [
    { path: '/cars/list', params: { brand: 'Toyota' } },
    { path: '/cars/list', params: { brand: 'Ford', page: '1' } },
    { path: '/cars/list', params: { minPrice: '1000', maxPrice: '10000' } },
    { path: '/cars/list', params: { sort: 'price_asc' } },
    { path: '/cars/list', params: { sort: 'price_desc' } },
    { path: '/cars/list', params: { location: 'Buenos Aires', radius: '50' } },
    { path: '/cars/list', params: { fuel: 'gasoline', transmission: 'automatic' } },
    { path: '/cars/list', params: { year: '2020', seats: '5' } },
    { path: '/cars/list', params: { availableFrom: '2024-01-01', availableTo: '2024-01-07' } },
    { path: '/cars/list', params: { brand: 'Toyota', minPrice: '1000', sort: 'price_asc', page: '1' } },
  ];

  const results: Array<{
    params: string;
    duration: number;
    success: boolean;
  }> = [];

  for (let i = 0; i < paramVariations.length * 3; i++) {
    const variation = paramVariations[i % paramVariations.length];
    const start = Date.now();

    try {
      // Build query string
      const queryString = Object.entries(variation.params)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');

      await marketplacePage.navigate(`${variation.path}?${queryString}`);
      await page.waitForTimeout(500);

      results.push({
        params: queryString,
        duration: Date.now() - start,
        success: true,
      });

      process.stdout.write('.');
    } catch (error) {
      results.push({
        params: Object.entries(variation.params).map(([k, v]) => `${k}=${v}`).join('&'),
        duration: Date.now() - start,
        success: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;

  console.log(`\n📊 Route Parameter Results:`);
  console.log(`   Successful: ${successful}/${results.length}`);

  if (successful < results.length * 0.9) {
    throw new Error(`Too many parameter navigation failures: ${results.length - successful}`);
  }
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'rapid-page-navigation', fn: testRapidPageNavigation },
  { name: 'back-forward-navigation', fn: testBackForwardNavigation },
  { name: 'concurrent-navigation', fn: testConcurrentNavigation },
  { name: 'deep-link-navigation', fn: testDeepLinkNavigation },
  { name: 'page-reload-stress', fn: testPageReloadStress },
  { name: 'route-parameter-stress', fn: testRouteParameterStress },
];

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     NAVIGATION STRESS TESTS (Patchright)                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.headless}`);
  console.log(`\nStress Configuration:`);
  console.log(`  Navigation Iterations: ${NAV_STRESS_CONFIG.navIterations}`);
  console.log(`  Concurrent Sessions: ${NAV_STRESS_CONFIG.concurrentSessions}`);
  console.log(`  Navigation Delay: ${NAV_STRESS_CONFIG.navDelay}ms`);
  console.log(`  Max Acceptable Time: ${NAV_STRESS_CONFIG.maxNavTime}ms`);
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
      if (test.name === 'concurrent-navigation') {
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
      suite: 'navigation-stress',
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'navigation-stress-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} stress test(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All navigation stress tests passed!');
}

// Run if executed directly
main().catch((error) => {
  console.error('Navigation stress test runner failed:', error);
  process.exit(1);
});

export { tests };
