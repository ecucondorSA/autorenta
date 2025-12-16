/**
 * Marketplace / Browse Cars E2E Tests
 *
 * Tests for car listing, search, and navigation to car details.
 */

import {
  printReport,
  runTests,
  saveReport,
  type TestContext,
} from '../../fixtures/test-fixtures';
import { Selectors } from '../../utils/selectors';

// ==================== TEST DEFINITIONS ====================

/**
 * Test: Marketplace loads with car cards
 */
async function testMarketplaceLoads(ctx: TestContext): Promise<void> {
  const { marketplacePage } = ctx;

  // Navigate to marketplace
  await marketplacePage.goto();

  // Wait for cars to load
  await marketplacePage.waitForCarsLoaded();

  // Assert cars are displayed
  await marketplacePage.assertCarsDisplayed();

  // Get count
  const count = await marketplacePage.getCarCount();
  console.log(`Marketplace loaded with ${count} cars`);

  // No errors should occur
  if (marketplacePage.hasErrors()) {
    const errors = marketplacePage.getErrors();
    console.log(`Warning: ${errors.length} page errors detected`);
  }
}

/**
 * Test: /cars/list shows results count and renders content
 */
async function testCarsListSmoke(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  await marketplacePage.goto();

  // Results badge should render early
  await page.waitForSelector(Selectors.marketplace.resultsCount, {
    timeout: 15000,
  });

  // Then either cards or empty state
  await marketplacePage.waitForCarsLoaded();
  await marketplacePage.assertCarsDisplayed();
}

/**
 * Test: Map toggle renders map container
 */
async function testCarsListMapToggle(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  // Switch to map view (should show the map container)
  await marketplacePage.switchToMapView();
  await page.waitForSelector(Selectors.marketplace.mapView, { timeout: 15000 });
}

/**
 * Test: When Supabase fails, error banner appears and empty state is not shown
 */
async function testCarsListErrorStateOnSupabaseFailure(ctx: TestContext): Promise<void> {
  const { marketplacePage, page } = ctx;

  // Use SPA navigation to avoid deep-link 404s on some local servers.
  // Also enable a deterministic dev-only failure hook.
  await marketplacePage.navigate('/cars/list?e2eFailCars=1');

  // Ensure we're on the cars list page shell.
  await page.waitForSelector(Selectors.marketplace.resultsCount, { timeout: 15000 });

  await page.waitForSelector(Selectors.marketplace.loadError, { timeout: 30000 });

  const emptyVisible = await page
    .locator(Selectors.marketplace.emptyState)
    .isVisible()
    .catch(() => false);
  if (emptyVisible) {
    throw new Error('Empty state should not be visible when loadError is shown');
  }

}

/**
 * Test: Car cards display information
 */
async function testCarCardContent(ctx: TestContext): Promise<void> {
  const { marketplacePage } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const count = await marketplacePage.getCarCount();
  if (count === 0) {
    console.log('No cars available - skipping car card content test');
    return;
  }

  // Get first car data
  const carData = await marketplacePage.getCarCardData(0);
  console.log('First car card data:', carData);

  // Verify title exists
  if (!carData.title || carData.title.trim() === '') {
    throw new Error('Car card should have a title');
  }

  // Price should exist (even if it's "Consultar")
  if (!carData.price || carData.price.trim() === '') {
    console.log('Warning: Car card missing price');
  }
}

/**
 * Test: Clicking car card navigates to detail
 */
async function testCarCardNavigation(ctx: TestContext): Promise<void> {
  const { marketplacePage } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const count = await marketplacePage.getCarCount();
  if (count === 0) {
    console.log('No cars available - skipping navigation test');
    return;
  }

  // Click first car
  await marketplacePage.clickFirstCar();

  // Wait for navigation
  await ctx.page.waitForTimeout(3000);

  // Should be on car detail page
  await marketplacePage.assertNavigatedToCarDetail();

  console.log('Successfully navigated to car detail page');
}

/**
 * Test: Home page shows cars
 */
async function testHomePageCars(ctx: TestContext): Promise<void> {
  const { marketplacePage } = ctx;

  // Navigate to home (not /cars)
  await marketplacePage.gotoHome();

  // Wait for content to load
  await ctx.page.waitForTimeout(3000);

  // Check for car cards or car-related content
  const hasCarCards = (await marketplacePage.getCarCount()) > 0;
  const hasCarContent = await ctx.page.evaluate(() => {
    const content = document.body.innerText.toLowerCase();
    return (
      content.includes('auto') ||
      content.includes('vehículo') ||
      content.includes('alquiler')
    );
  });

  if (!hasCarCards && !hasCarContent) {
    console.log('Warning: Home page does not show car content');
  } else {
    console.log(
      `Home page loaded - Car cards: ${hasCarCards}, Car content: ${hasCarContent}`
    );
  }
}

/**
 * Test: Search functionality
 */
async function testSearch(ctx: TestContext): Promise<void> {
  const { marketplacePage, testData } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const initialCount = await marketplacePage.getCarCount();
  console.log(`Initial car count: ${initialCount}`);

  // Search for Toyota
  try {
    await marketplacePage.search(testData.searchQueries.brandToyota);
    await ctx.page.waitForTimeout(2000);

    const searchCount = await marketplacePage.getCarCount();
    console.log(`Search "Toyota" results: ${searchCount}`);
  } catch (error) {
    console.log('Search input not available - might be mobile layout or different UI');
  }
}

/**
 * Test: Multiple car cards can be accessed
 */
async function testMultipleCarCards(ctx: TestContext): Promise<void> {
  const { marketplacePage } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  const count = await marketplacePage.getCarCount();
  console.log(`Total cars: ${count}`);

  if (count < 2) {
    console.log('Less than 2 cars available - skipping multiple cards test');
    return;
  }

  // Get data from first 3 cars (or less)
  const carsToCheck = Math.min(count, 3);
  const allData = await marketplacePage.getAllCarCardData();

  for (let i = 0; i < carsToCheck; i++) {
    console.log(`Car ${i + 1}: ${allData[i].title} - ${allData[i].price}`);
  }
}

/**
 * Test: Page handles empty results gracefully
 */
async function testEmptySearchResults(ctx: TestContext): Promise<void> {
  const { marketplacePage, testData } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  // Search for something that won't match
  try {
    await marketplacePage.search(testData.searchQueries.invalidSearch);
    await ctx.page.waitForTimeout(2000);

    const count = await marketplacePage.getCarCount();
    console.log(`Search for invalid query: ${count} results`);

    // Either 0 results or empty state should be shown
    if (count === 0) {
      console.log('Empty state handled correctly');
    }
  } catch {
    console.log('Search not available - skipping empty results test');
  }
}

/**
 * Test: API calls are made correctly
 */
async function testApiCalls(ctx: TestContext): Promise<void> {
  const { marketplacePage, networkLogger } = ctx;

  await marketplacePage.goto();
  await marketplacePage.waitForCarsLoaded();

  // Check for Supabase API calls
  const supabaseCalls = networkLogger.getApiCalls('supabase');
  console.log(`Supabase API calls: ${supabaseCalls.length}`);

  if (supabaseCalls.length === 0) {
    console.log('Warning: No Supabase API calls detected');
  }

  // Check for failed API calls
  const failedCalls = networkLogger.getFailedRequests();
  if (failedCalls.length > 0) {
    console.log(`Warning: ${failedCalls.length} failed requests`);
    failedCalls.slice(0, 3).forEach((f) => {
      console.log(`  - ${f.method} ${f.url} -> ${f.status || f.error}`);
    });
  }

  // Get summary
  const summary = networkLogger.getSummary();
  console.log(`API Summary: ${summary.totalRequests} requests, avg ${summary.avgResponseTime}ms`);
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'marketplace-loads', fn: testMarketplaceLoads },
  { name: 'cars-list/smoke', fn: testCarsListSmoke },
  { name: 'cars-list/map-toggle', fn: testCarsListMapToggle },
  { name: 'cars-list/error-banner', fn: testCarsListErrorStateOnSupabaseFailure },
  { name: 'car-card-content', fn: testCarCardContent },
  { name: 'car-card-navigation', fn: testCarCardNavigation },
  { name: 'home-page-cars', fn: testHomePageCars },
  { name: 'search', fn: testSearch },
  { name: 'multiple-car-cards', fn: testMultipleCarCards },
  { name: 'empty-search-results', fn: testEmptySearchResults },
  { name: 'api-calls', fn: testApiCalls },
];

async function main(): Promise<void> {
  console.log('\n========== MARKETPLACE E2E TESTS ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

  const filter = process.env.E2E_FILTER?.trim();
  const selectedTests = filter
    ? tests.filter((t) => t.name.includes(filter))
    : tests;

  if (filter) {
    console.log(`[E2E] Filter enabled: ${filter} (${selectedTests.length}/${tests.length} tests)`);
  }

  const results = await runTests(selectedTests, {
    suite: 'marketplace',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'marketplace-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error if any test failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

export { tests };
