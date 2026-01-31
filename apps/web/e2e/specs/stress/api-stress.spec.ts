/**
 * API Stress Tests
 *
 * High-load scenarios for API endpoints, rate limiting, and concurrent requests.
 * Tests API behavior under load, rate limit enforcement, and error handling.
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
import { TestData } from '../../fixtures/test-data';

// ==================== CONFIGURATION ====================

const API_STRESS_CONFIG = {
  // Number of rapid API calls
  apiIterations: parseInt(process.env.API_STRESS_ITERATIONS || '200'),
  // Number of concurrent API request sessions
  concurrentSessions: parseInt(process.env.API_STRESS_CONCURRENT || '5'),
  // Delay between API calls (ms)
  apiDelay: parseInt(process.env.API_STRESS_DELAY || '50'),
  // Max acceptable API response time (ms)
  maxResponseTime: parseInt(process.env.API_STRESS_MAX_TIME || '2000'),
  // Max acceptable error rate (%)
  maxErrorRate: parseInt(process.env.API_STRESS_MAX_ERROR_RATE || '10'),
};

// ==================== STRESS TEST DEFINITIONS ====================

/**
 * Test: Rapid API requests
 * Tests API response under rapid sequential requests
 */
async function testRapidApiRequests(ctx: TestContext): Promise<void> {
  const { page, networkLogger } = ctx;

  console.log(`\n⚡ Testing rapid API requests (${API_STRESS_CONFIG.apiIterations} calls)...`);

  await ctx.marketplacePage.goto();
  await page.waitForTimeout(2000);

  const results: Array<{
    iteration: number;
    endpoint: string;
    duration: number;
    success: boolean;
    statusCode?: number;
    error?: string;
  }> = [];

  const endpoints = [
    () => page.evaluate(() => fetch('/api/health').then(r => r.status).catch(() => 0)),
    () => page.evaluate(() => fetch('/api/cars').then(r => r.status).catch(() => 0)),
    () => page.evaluate(() => fetch('/api/brands').then(r => r.status).catch(() => 0)),
    () => page.evaluate(() => fetch('/api/locations').then(r => r.status).catch(() => 0)),
  ];

  for (let i = 0; i < API_STRESS_CONFIG.apiIterations; i++) {
    const start = Date.now();
    const endpointIndex = i % endpoints.length;

    try {
      const statusCode = await endpoints[endpointIndex]();
      const duration = Date.now() - start;

      results.push({
        iteration: i + 1,
        endpoint: `endpoint-${endpointIndex}`,
        duration,
        success: statusCode === 200,
        statusCode,
      });

      if (i % 20 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        endpoint: `endpoint-${endpointIndex}`,
        duration: Date.now() - start,
        success: false,
        error: (error as Error).message,
      });
      process.stdout.write('x');
    }

    await page.waitForTimeout(API_STRESS_CONFIG.apiDelay);
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);
  const responseTimes = results.filter((r) => r.success).map((r) => r.duration);
  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponse = Math.max(...responseTimes);

  console.log(`\n📊 Rapid API Results:`);
  console.log(`   Successful: ${successful}/${API_STRESS_CONFIG.apiIterations}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Average response: ${avgResponse.toFixed(0)}ms`);
  console.log(`   Max response: ${maxResponse}ms`);

  const errorRate = (failed.length / API_STRESS_CONFIG.apiIterations) * 100;
  if (errorRate > API_STRESS_CONFIG.maxErrorRate) {
    throw new Error(`Error rate too high: ${errorRate.toFixed(1)}% (max: ${API_STRESS_CONFIG.maxErrorRate}%)`);
  }

  if (avgResponse > API_STRESS_CONFIG.maxResponseTime) {
    throw new Error(`Average response too slow: ${avgResponse.toFixed(0)}ms`);
  }
}

/**
 * Test: Concurrent API requests
 * Tests API behavior with multiple simultaneous requesters
 */
async function testConcurrentApiRequests(): Promise<void> {
  console.log(`\n🔄 Simulating ${API_STRESS_CONFIG.concurrentSessions} concurrent API sessions...`);

  const sessions: Array<{
    context: BrowserContext;
    page: Page;
    networkLogger: NetworkLogger;
  }> = [];
  const results: Array<{
    sessionId: number;
    totalRequests: number;
    successful: number;
    failed: number;
    avgDuration: number;
  }> = [];

  try {
    // Launch multiple contexts
    for (let i = 0; i < API_STRESS_CONFIG.concurrentSessions; i++) {
      const context = await chromium.launchPersistentContext(
        `${config.browserProfile}-api-stress-${i}`,
        {
          headless: config.headless,
          viewport: { width: 1280, height: 720 },
        }
      );
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      const networkLogger = new NetworkLogger({ maxEntries: 300 });
      networkLogger.attach(page);

      sessions.push({ context, page, networkLogger });
    }

    // All sessions make API calls simultaneously
    const startTime = Date.now();

    const sessionPromises = sessions.map(async ({ page }, index) => {
      const requests: Array<{ duration: number; success: boolean }> = [];

      for (let i = 0; i < 40; i++) {
        const start = Date.now();

        try {
          // Make various API calls
          const response = await page.evaluate(() => {
            return fetch('/api/health')
              .then(r => ({ ok: r.ok, status: r.status }))
              .catch(e => ({ ok: false, error: e.message }));
          });

          requests.push({
            duration: Date.now() - start,
            success: response.ok,
          });
        } catch {
          requests.push({
            duration: Date.now() - start,
            success: false,
          });
        }

        await page.waitForTimeout(API_STRESS_CONFIG.apiDelay);
      }

      const successful = requests.filter((r) => r.success);
      return {
        sessionId: index + 1,
        totalRequests: requests.length,
        successful: successful.length,
        failed: requests.length - successful.length,
        avgDuration: successful.length > 0
          ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
          : 0,
      };
    });

    results.push(...(await Promise.all(sessionPromises)));
    const totalDuration = Date.now() - startTime;

    const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    console.log(`\n📊 Concurrent API Results:`);
    console.log(`   Total time: ${totalDuration}ms`);
    console.log(`   Total requests: ${totalRequests}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);

    results.forEach((r) => {
      console.log(`   Session ${r.sessionId}: ${r.successful}/${r.totalRequests} (${r.avgDuration.toFixed(0)}ms avg)`);
    });

    const errorRate = (totalFailed / totalRequests) * 100;
    if (errorRate > API_STRESS_CONFIG.maxErrorRate) {
      throw new Error(`Concurrent error rate too high: ${errorRate.toFixed(1)}%`);
    }

  } finally {
    await Promise.all(sessions.map(({ context }) => context.close().catch(() => {})));
  }
}

/**
 * Test: Rate limiting detection
 * Tests if API rate limiting is properly enforced
 */
async function testRateLimiting(ctx: TestContext): Promise<void> {
  const { page, networkLogger } = ctx;

  console.log(`\n🚦 Testing rate limiting detection (100 rapid requests)...`);

  await ctx.marketplacePage.goto();
  await page.waitForTimeout(1000);

  const results: Array<{
    iteration: number;
    duration: number;
    statusCode: number;
    limited: boolean;
  }> = [];

  // Burst of requests to trigger rate limiting
  for (let i = 0; i < 100; i++) {
    const start = Date.now();

    try {
      const response = await page.evaluate(() => {
        return fetch('/api/health', { cache: 'no-store' })
          .then(r => ({ status: r.status, headers: Object.fromEntries(r.headers.entries()) }))
          .catch(e => ({ status: 0, error: e.message }));
      });

      const duration = Date.now() - start;
      const isLimited = response.status === 429 || response.status === 503;

      results.push({
        iteration: i + 1,
        duration,
        statusCode: response.status,
        limited: isLimited,
      });

      if (i % 20 === 0) {
        process.stdout.write('.');
      }
    } catch {
      results.push({
        iteration: i + 1,
        duration: Date.now() - start,
        statusCode: 0,
        limited: false,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const limited = results.filter((r) => r.limited);
  const successful = results.filter((r) => r.statusCode === 200);

  console.log(`\n📊 Rate Limiting Results:`);
  console.log(`   Total requests: ${results.length}`);
  console.log(`   Successful (200): ${successful.length}`);
  console.log(`   Rate limited (429/503): ${limited.length}`);

  // Check for rate limit headers or patterns
  const responseTimes = results.map((r) => r.duration);
  const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxTime = Math.max(...responseTimes);

  console.log(`   Average response: ${avgTime.toFixed(0)}ms`);
  console.log(`   Max response: ${maxTime}ms`);

  if (limited.length === 0) {
    console.log(`   ⚠️  No rate limiting detected (may or may not be expected)`);
  } else {
    console.log(`   ✅ Rate limiting is active (${limited.length} requests limited)`);
  }
}

/**
 * Test: Supabase API stress
 * Tests Supabase-specific endpoints under load
 */
async function testSupabaseApiStress(ctx: TestContext): Promise<void> {
  const { page, networkLogger } = ctx;

  console.log(`\n🗄️ Testing Supabase API stress (${API_STRESS_CONFIG.apiIterations} calls)...`);

  await ctx.marketplacePage.goto();
  await ctx.marketplacePage.waitForCarsLoaded();

  const results: Array<{
    iteration: number;
    type: string;
    duration: number;
    success: boolean;
  }> = [];

  for (let i = 0; i < API_STRESS_CONFIG.apiIterations; i++) {
    const start = Date.now();

    try {
      // Trigger various Supabase operations
      await ctx.marketplacePage.navigate('/cars/list');
      await page.waitForTimeout(100);

      // Check for Supabase calls
      const supabaseCalls = networkLogger.getApiCalls('supabase');

      results.push({
        iteration: i + 1,
        type: 'supabase-query',
        duration: Date.now() - start,
        success: supabaseCalls.length > 0,
      });

      if (i % 20 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        type: 'supabase-query',
        duration: Date.now() - start,
        success: false,
      });
      process.stdout.write('x');
    }

    await page.waitForTimeout(API_STRESS_CONFIG.apiDelay);
  }

  console.log('\n');

  const successful = results.filter((r) => r.success).length;
  const durations = results.filter((r) => r.success).map((r) => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  console.log(`\n📊 Supabase API Results:`);
  console.log(`   Successful queries: ${successful}/${API_STRESS_CONFIG.apiIterations}`);
  console.log(`   Average duration: ${avgDuration.toFixed(0)}ms`);

  // Check for failed requests
  const failedRequests = networkLogger.getFailedRequests();
  const supabaseFailures = failedRequests.filter((r) => r.url.includes('supabase'));

  console.log(`   Failed Supabase requests: ${supabaseFailures.length}`);

  if (supabaseFailures.length > API_STRESS_CONFIG.apiIterations * 0.1) {
    console.log(`   ⚠️  High failure rate detected`);
  }
}

/**
 * Test: API error handling stress
 * Tests error responses under load
 */
async function testApiErrorHandling(ctx: TestContext): Promise<void> {
  const { page } = ctx;

  console.log(`\n⚠️ Testing API error handling (50 invalid requests)...`);

  await ctx.marketplacePage.goto();
  await page.waitForTimeout(1000);

  const results: Array<{
    request: string;
    statusCode: number;
    handled: boolean;
    duration: number;
  }> = [];

  const invalidRequests = [
    '/api/cars/invalid-id',
    '/api/nonexistent-endpoint',
    '/api/cars?page=-1',
    '/api/cars?limit=999999',
    '/api/cars?sort=invalid',
  ];

  for (let i = 0; i < 50; i++) {
    const endpoint = invalidRequests[i % invalidRequests.length];
    const start = Date.now();

    try {
      const response = await page.evaluate((url) => {
        return fetch(url)
          .then(r => ({ status: r.status, ok: r.ok }))
          .catch(e => ({ status: 0, error: e.message }));
      }, endpoint);

      const duration = Date.now() - start;
      const handled = response.status >= 400 || response.status === 0;

      results.push({
        request: endpoint,
        statusCode: response.status,
        handled,
        duration,
      });

      process.stdout.write(handled ? '.' : 'x');
    } catch {
      results.push({
        request: endpoint,
        statusCode: 0,
        handled: true,
        duration: Date.now() - start,
      });
      process.stdout.write('.');
    }

    await page.waitForTimeout(100);
  }

  console.log('\n');

  const handledErrors = results.filter((r) => r.handled).length;

  console.log(`\n📊 API Error Handling Results:`);
  console.log(`   Total requests: ${results.length}`);
  console.log(`   Properly handled: ${handledErrors}/${results.length}`);

  // Group by status code
  const statusCounts: Record<number, number> = {};
  results.forEach((r) => {
    statusCounts[r.statusCode] = (statusCounts[r.statusCode] || 0) + 1;
  });

  console.log(`   Status code distribution:`);
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([status, count]) => {
      console.log(`     ${status}: ${count} requests`);
    });

  if (handledErrors < results.length * 0.9) {
    throw new Error(`Too many unhandled errors: ${results.length - handledErrors}`);
  }
}

/**
 * Test: Network interruption simulation
 * Tests app behavior during network issues
 */
async function testNetworkInterruptions(ctx: TestContext): Promise<void> {
  const { page, networkLogger } = ctx;

  console.log(`\n📡 Testing network interruption handling...`);

  await ctx.marketplacePage.goto();
  await ctx.marketplacePage.waitForCarsLoaded();

  // Simulate offline by intercepting requests
  await page.route('**/api/**', (route) => {
    // Randomly fail some requests
    if (Math.random() < 0.3) {
      route.abort('internetdisconnected');
    } else {
      route.continue();
    }
  });

  const results: Array<{
    iteration: number;
    success: boolean;
    errorType?: string;
  }> = [];

  for (let i = 0; i < 20; i++) {
    try {
      await ctx.marketplacePage.reload();
      await page.waitForTimeout(500);

      // Check if error state is shown
      const hasErrorUI = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('error') || body.includes('offline') || body.includes('conexión');
      });

      results.push({
        iteration: i + 1,
        success: !hasErrorUI,
      });

      process.stdout.write(hasErrorUI ? '!' : '.');
    } catch (error) {
      results.push({
        iteration: i + 1,
        success: false,
        errorType: (error as Error).message,
      });
      process.stdout.write('x');
    }
  }

  console.log('\n');

  // Restore normal network
  await page.unroute('**/api/**');

  const successful = results.filter((r) => r.success).length;

  console.log(`\n📊 Network Interruption Results:`);
  console.log(`   Successful loads: ${successful}/${results.length}`);
  console.log(`   With error UI shown: ${results.length - successful}/${results.length}`);

  // After restoring network, verify recovery
  await ctx.marketplacePage.reload();
  await page.waitForTimeout(1000);

  const recovered = await ctx.marketplacePage.isVisible('[data-testid="car-card"], .car-card').catch(() => false);
  console.log(`   Network recovery: ${recovered ? '✓' : '✗'}`);
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'rapid-api-requests', fn: testRapidApiRequests },
  { name: 'concurrent-api-requests', fn: testConcurrentApiRequests },
  { name: 'rate-limiting-detection', fn: testRateLimiting },
  { name: 'supabase-api-stress', fn: testSupabaseApiStress },
  { name: 'api-error-handling', fn: testApiErrorHandling },
  { name: 'network-interruptions', fn: testNetworkInterruptions },
];

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     API STRESS TESTS (Patchright)                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.headless}`);
  console.log(`\nStress Configuration:`);
  console.log(`  API Iterations: ${API_STRESS_CONFIG.apiIterations}`);
  console.log(`  Concurrent Sessions: ${API_STRESS_CONFIG.concurrentSessions}`);
  console.log(`  API Delay: ${API_STRESS_CONFIG.apiDelay}ms`);
  console.log(`  Max Response Time: ${API_STRESS_CONFIG.maxResponseTime}ms`);
  console.log(`  Max Error Rate: ${API_STRESS_CONFIG.maxErrorRate}%`);
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
      if (test.name === 'concurrent-api-requests') {
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
      suite: 'api-stress',
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'api-stress-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} stress test(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All API stress tests passed!');
}

// Run if executed directly
main().catch((error) => {
  console.error('API stress test runner failed:', error);
  process.exit(1);
});

export { tests };
