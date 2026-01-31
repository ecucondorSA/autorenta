/**
 * Marketplace Stress Tests
 *
 * High-load scenarios for car browsing, filtering, and navigation.
 * Tests concurrent user simulation, rapid interactions, and performance under load.
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
import { Selectors } from '../../utils/selectors';

// ==================== CONFIGURATION ====================

const STRESS_CONFIG = {
  // Concurrent users simulation
  concurrentUsers: parseInt(process.env.STRESS_CONCURRENT_USERS || '5'),
  // Number of rapid actions per test
  rapidActionIterations: parseInt(process.env.STRESS_RAPID_ITERATIONS || '20'),
  // Delay between rapid actions (ms)
  rapidActionDelay: parseInt(process.env.STRESS_RAPID_DELAY || '100'),
  // Max memory increase threshold (MB)
  memoryThreshold: parseInt(process.env.STRESS_MEMORY_THRESHOLD || '50'),
};

// ==================== STRESS TEST DEFINITIONS ====================

/**
 * Test: Concurrent users browsing marketplace
 * Simulates multiple users browsing simultaneously
 */
async function testConcurrentUsersBrowsing(): Promise<void> {
  console.log(`\n🔄 Simulating ${STRESS_CONFIG.concurrentUsers} concurrent users browsing...`);

  const userContexts: Array<{ context: BrowserContext; page: Page; marketplacePage: MarketplacePage }> = [];
  const results: Array<{ userId: number; carsLoaded: number; duration: number; errors: string[] }> = [];

  try {
    // Launch multiple browser contexts
    for (let i = 0; i < STRESS_CONFIG.concurrentUsers; i++) {
      const context = await chromium.launchPersistentContext(
        `${config.browserProfile}-stress-${i}`,
        {
          headless: config.headless,
          viewport: { width: 1280, height: 720 },
          locale: 'es-AR',
        }
      );
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      const networkLogger = new NetworkLogger({ maxEntries: 200 });
      networkLogger.attach(page);
      const marketplacePage = new MarketplacePage(page, context, networkLogger);

      userContexts.push({ context, page, marketplacePage });
    }

    // All users browse simultaneously
    const startTime = Date.now();
    const browsePromises = userContexts.map(async ({ marketplacePage, page }, index) => {
      const userStart = Date.now();
      const errors: string[] = [];

      try {
        await marketplacePage.goto();
        await marketplacePage.waitForCarsLoaded();
        const count = await marketplacePage.getCarCount();

        // Navigate through different pages if pagination exists
        const pageNumbers = [1, 2, 3];
        for (const pageNum of pageNumbers) {
          try {
            await page.evaluate((num) => {
              window.history.pushState({}, '', `/cars/list?page=${num}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }, pageNum);
            await page.waitForTimeout(2000);
          } catch (e) {
            errors.push(`Page ${pageNum} navigation failed: ${e}`);
          }
        }

        return {
          userId: index + 1,
          carsLoaded: count,
          duration: Date.now() - userStart,
          errors,
        };
      } catch (error) {
        errors.push(`Failed to load: ${error}`);
        return {
          userId: index + 1,
          carsLoaded: 0,
          duration: Date.now() - userStart,
          errors,
        };
      }
    });

    results.push(...(await Promise.all(browsePromises)));
    const totalDuration = Date.now() - startTime;

    // Report results
    const totalCars = results.reduce((sum, r) => sum + r.carsLoaded, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`\n📊 Concurrent Browsing Results:`);
    console.log(`   Total time: ${totalDuration}ms`);
    console.log(`   Average per user: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Total cars loaded: ${totalCars}`);
    console.log(`   Errors: ${totalErrors}`);

    results.forEach((r) => {
      console.log(`   User ${r.userId}: ${r.carsLoaded} cars, ${r.duration}ms, ${r.errors.length} errors`);
    });

    if (totalErrors > STRESS_CONFIG.concurrentUsers * 2) {
      throw new Error(`Too many errors (${totalErrors}) during concurrent browsing`);
    }

    if (avgDuration > 30000) {
      throw new Error(`Average load time too slow: ${avgDuration.toFixed(0)}ms`);
    }

  } finally {
    // Cleanup all contexts
    await Promise.all(userContexts.map(({ context }) => context.close().catch(() => {})));
  }
}

/**
 * Test: Rapid filter changes
 * Tests marketplace responsiveness under rapid filtering
 */
async function testRapidFilterChanges(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n⚡ Testing rapid filter changes (${STRESS_CONFIG.rapidActionIterations} iterations)...`);

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const brands = ['Toyota', 'Ford', 'Chevrolet', 'Volkswagen', 'Fiat'];
  const errors: string[] = [];
  const responseTimes: number[] = [];

  for (let i = 0; i < STRESS_CONFIG.rapidActionIterations; i++) {
    const start = Date.now();
    const brand = brands[i % brands.length];

    try {
      // Apply brand filter via URL manipulation
      await page.evaluate((b) => {
        const url = new URL(window.location.href);
        url.searchParams.set('brand', b);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, brand);

      // Wait briefly for update
      await page.waitForTimeout(STRESS_CONFIG.rapidActionDelay);

      // Check if results updated
      await page.waitForSelector(Selectors.marketplace.resultsCount, { timeout: 5000 });

      responseTimes.push(Date.now() - start);

      if (i % 5 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      errors.push(`Iteration ${i}: ${error}`);
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponse = Math.max(...responseTimes);

  console.log(`\n📊 Rapid Filter Results:`);
  console.log(`   Successful updates: ${responseTimes.length}/${STRESS_CONFIG.rapidActionIterations}`);
  console.log(`   Average response: ${avgResponse.toFixed(0)}ms`);
  console.log(`   Max response: ${maxResponse}ms`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > STRESS_CONFIG.rapidActionIterations * 0.2) {
    throw new Error(`Too many errors during rapid filtering: ${errors.length}`);
  }

  if (avgResponse > 2000) {
    throw new Error(`Filter response too slow: ${avgResponse.toFixed(0)}ms average`);
  }
}

/**
 * Test: Rapid car card navigation
 * Tests rapid clicking through multiple car cards
 */
async function testRapidCarNavigation(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🖱️ Testing rapid car navigation (${STRESS_CONFIG.rapidActionIterations} iterations)...`);

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const errors: string[] = [];
  const navigationTimes: number[] = [];

  for (let i = 0; i < STRESS_CONFIG.rapidActionIterations; i++) {
    const start = Date.now();

    try {
      // Navigate to a random car detail page
      const carId = `car-${1000 + (i % 100)}`;
      await marketplacePage.navigate(`/cars/${carId}`);
      await page.waitForTimeout(500);

      // Go back
      await marketplacePage.navigate('/cars/list');
      await page.waitForTimeout(STRESS_CONFIG.rapidActionDelay);

      navigationTimes.push(Date.now() - start);

      if (i % 5 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      errors.push(`Iteration ${i}: ${error}`);
      process.stdout.write('x');
    }
  }

  console.log('\n');

  const avgNav = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;

  console.log(`\n📊 Rapid Navigation Results:`);
  console.log(`   Successful navigations: ${navigationTimes.length}/${STRESS_CONFIG.rapidActionIterations}`);
  console.log(`   Average time: ${avgNav.toFixed(0)}ms`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > STRESS_CONFIG.rapidActionIterations * 0.3) {
    throw new Error(`Too many navigation errors: ${errors.length}`);
  }
}

/**
 * Test: Map/List view toggle stress
 * Tests rapid switching between map and list views
 */
async function testMapListToggleStress(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🗺️ Testing map/list toggle stress (${STRESS_CONFIG.rapidActionIterations} iterations)...`);

  await marketplacePage.goto();
  await page.waitForSelector(Selectors.marketplace.resultsCount, { timeout: 15000 });

  const errors: string[] = [];
  const toggleTimes: number[] = [];

  for (let i = 0; i < STRESS_CONFIG.rapidActionIterations; i++) {
    const start = Date.now();

    try {
      if (i % 2 === 0) {
        await marketplacePage.switchToMapView();
        await page.waitForSelector(Selectors.marketplace.mapView, { timeout: 5000 });
      } else {
        // Switch back to list
        const listButton = page.locator('button:has-text("Lista"), [data-testid="list-view-btn"]').first();
        if (await listButton.isVisible().catch(() => false)) {
          await listButton.click();
        }
      }

      toggleTimes.push(Date.now() - start);

      if (i % 5 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      errors.push(`Iteration ${i}: ${error}`);
      process.stdout.write('x');
    }

    await page.waitForTimeout(STRESS_CONFIG.rapidActionDelay / 2);
  }

  console.log('\n');

  console.log(`\n📊 Map/List Toggle Results:`);
  console.log(`   Successful toggles: ${toggleTimes.length}/${STRESS_CONFIG.rapidActionIterations}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > STRESS_CONFIG.rapidActionIterations * 0.2) {
    throw new Error(`Too many toggle errors: ${errors.length}`);
  }
}

/**
 * Test: Search input stress
 * Tests rapid search queries
 */
async function testSearchInputStress(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  console.log(`\n🔍 Testing search input stress (${STRESS_CONFIG.rapidActionIterations} iterations)...`);

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const searchQueries = [
    'Toyota', 'Ford', 'BMW', 'Mercedes', 'Audi',
    'Honda', 'Nissan', 'Chevrolet', 'Volkswagen', 'Fiat',
  ];
  const errors: string[] = [];
  const searchTimes: number[] = [];

  for (let i = 0; i < STRESS_CONFIG.rapidActionIterations; i++) {
    const start = Date.now();
    const query = searchQueries[i % searchQueries.length];

    try {
      // Type search query character by character
      const searchInput = page.locator('input[type="search"], input[placeholder*="buscar" i]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.click();
        await searchInput.clear();
        await page.keyboard.type(query, { delay: 10 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800);

        searchTimes.push(Date.now() - start);
      }

      if (i % 5 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      errors.push(`Iteration ${i}: ${error}`);
      process.stdout.write('x');
    }

    await page.waitForTimeout(STRESS_CONFIG.rapidActionDelay);
  }

  console.log('\n');

  const avgSearch = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;

  console.log(`\n📊 Search Stress Results:`);
  console.log(`   Successful searches: ${searchTimes.length}/${STRESS_CONFIG.rapidActionIterations}`);
  console.log(`   Average time: ${avgSearch.toFixed(0)}ms`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > STRESS_CONFIG.rapidActionIterations * 0.3) {
    throw new Error(`Too many search errors: ${errors.length}`);
  }
}

/**
 * Test: Memory usage under load
 * Monitors memory while performing intensive operations
 */
async function testMemoryUsageUnderLoad(ctx: TestContext): Promise<void> {
  const { page } = ctx;

  console.log(`\n🧠 Testing memory usage under load...`);

  // Get initial memory
  const initialMemory = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });

  console.log(`   Initial memory: ${initialMemory.toFixed(2)} MB`);

  // Perform intensive operations
  await ctx.marketplacePage.goto();
  await ctx.marketplacePage.waitForCarsLoaded();

  // Navigate through many pages
  for (let i = 0; i < 50; i++) {
    await ctx.marketplacePage.navigate(`/cars/list?page=${(i % 5) + 1}`);
    await page.waitForTimeout(200);

    if (i % 10 === 0) {
      process.stdout.write('.');
    }
  }

  // Click on multiple cars
  for (let i = 0; i < 20; i++) {
    await ctx.marketplacePage.navigate(`/cars/car-${1000 + i}`);
    await page.waitForTimeout(200);

    if (i % 5 === 0) {
      process.stdout.write('.');
    }
  }

  console.log('\n');

  // Force garbage collection if available
  await page.evaluate(() => {
    if ('gc' in window) {
      (window as any).gc();
    }
  });

  await page.waitForTimeout(1000);

  // Get final memory
  const finalMemory = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  });

  const memoryIncrease = finalMemory - initialMemory;

  console.log(`\n📊 Memory Usage Results:`);
  console.log(`   Initial: ${initialMemory.toFixed(2)} MB`);
  console.log(`   Final: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Increase: ${memoryIncrease.toFixed(2)} MB`);

  if (memoryIncrease > STRESS_CONFIG.memoryThreshold) {
    throw new Error(`Memory increase too high: ${memoryIncrease.toFixed(2)} MB (threshold: ${STRESS_CONFIG.memoryThreshold} MB)`);
  }
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'concurrent-users-browsing', fn: testConcurrentUsersBrowsing },
  { name: 'rapid-filter-changes', fn: testRapidFilterChanges },
  { name: 'rapid-car-navigation', fn: testRapidCarNavigation },
  { name: 'map-list-toggle-stress', fn: testMapListToggleStress },
  { name: 'search-input-stress', fn: testSearchInputStress },
  { name: 'memory-usage-under-load', fn: testMemoryUsageUnderLoad },
];

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     MARKETPLACE STRESS TESTS (Patchright)                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${config.headless}`);
  console.log(`\nStress Configuration:`);
  console.log(`  Concurrent Users: ${STRESS_CONFIG.concurrentUsers}`);
  console.log(`  Rapid Iterations: ${STRESS_CONFIG.rapidActionIterations}`);
  console.log(`  Rapid Action Delay: ${STRESS_CONFIG.rapidActionDelay}ms`);
  console.log(`  Memory Threshold: ${STRESS_CONFIG.memoryThreshold}MB`);
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
      if (test.name === 'concurrent-users-browsing') {
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
      suite: 'marketplace-stress',
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'marketplace-stress-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} stress test(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All marketplace stress tests passed!');
}

// Run if executed directly
main().catch((error) => {
  console.error('Stress test runner failed:', error);
  process.exit(1);
});

export { tests };
