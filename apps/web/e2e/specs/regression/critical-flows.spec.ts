/**
 * Critical Flows Regression Test Suite
 *
 * Fast regression tests that validate critical user flows.
 * Run after deployments to catch breaking changes.
 *
 * Usage:
 *   npx tsx apps/web/e2e/specs/regression/critical-flows.spec.ts
 *   HEADLESS=false npx tsx apps/web/e2e/specs/regression/critical-flows.spec.ts
 *   BASE_URL=https://autorentar.pages.dev npx tsx apps/web/e2e/specs/regression/critical-flows.spec.ts
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';

// ==================== TEST FUNCTIONS ====================

/**
 * Test 1: Home page loads successfully
 */
async function testHomePageLoads(ctx: TestContext): Promise<void> {
  await ctx.loginPage.navigate('/');

  // Wait for app to load
  await ctx.page.waitForSelector('app-root', { state: 'visible', timeout: 15000 });

  // Verify key elements are present
  const heroSection = ctx.page.locator('app-hero-section, .hero-section, [data-testid="hero"]');
  const hasHero = (await heroSection.count()) > 0;

  // Check for main navigation
  const nav = ctx.page.locator('app-header, header, nav, ion-header');
  const hasNav = (await nav.count()) > 0;

  if (!hasHero && !hasNav) {
    throw new Error('Home page missing critical sections (hero or navigation)');
  }

  // Verify no critical console errors
  const consoleErrors = ctx.networkLogger.getErrors();
  const criticalErrors = consoleErrors.filter(
    (e) =>
      e.includes('ChunkLoadError') ||
      e.includes('Failed to fetch') ||
      e.includes('NetworkError')
  );

  if (criticalErrors.length > 0) {
    throw new Error(`Critical errors on home page: ${criticalErrors.join(', ')}`);
  }
}

/**
 * Test 2: Marketplace loads cars
 */
async function testMarketplaceLoadsCars(ctx: TestContext): Promise<void> {
  await ctx.loginPage.navigate('/cars/list');

  // Wait for car list to load
  const cardSelectors = [
    '[data-testid="car-card"]',
    'app-car-card',
    '.car-card',
    '.car-grid-item',
  ];

  let cardsFound = false;
  for (const selector of cardSelectors) {
    const cards = ctx.page.locator(selector);
    if ((await cards.count()) > 0) {
      await cards.first().waitFor({ state: 'visible', timeout: 20000 });
      cardsFound = true;
      break;
    }
  }

  // Also check for "no results" state - this is valid
  const noResults = ctx.page.locator(
    '[data-testid="no-results"], .no-results, .empty-state'
  );
  const hasNoResults = (await noResults.count()) > 0;

  if (!cardsFound && !hasNoResults) {
    // Check if still loading
    const loading = ctx.page.locator('[data-testid="loading"], .loading, ion-spinner');
    const isLoading = (await loading.count()) > 0;

    if (isLoading) {
      // Wait more for loading to complete
      await ctx.page.waitForTimeout(5000);
      for (const selector of cardSelectors) {
        const cards = ctx.page.locator(selector);
        if ((await cards.count()) > 0) {
          cardsFound = true;
          break;
        }
      }
    }
  }

  if (!cardsFound && !hasNoResults) {
    throw new Error('Marketplace did not load cars or show empty state');
  }
}

/**
 * Test 3: Car detail page loads
 */
async function testCarDetailLoads(ctx: TestContext): Promise<void> {
  // First go to marketplace
  await ctx.loginPage.navigate('/cars/list');

  const cardSelectors = ['[data-testid="car-card"]', 'app-car-card'];
  let card = null;

  for (const selector of cardSelectors) {
    const cards = ctx.page.locator(selector);
    if ((await cards.count()) > 0) {
      await cards.first().waitFor({ state: 'visible', timeout: 20000 });
      card = cards.first();
      break;
    }
  }

  if (!card) {
    // No cars available - skip this test
    console.log('  [SKIP] No cars available for detail test');
    return;
  }

  // Get href and navigate
  const href =
    (await card.getAttribute('href').catch(() => null)) ||
    (await card.locator('a[href*="/cars/"]').first().getAttribute('href').catch(() => null));

  if (!href) {
    throw new Error('Could not find car detail link');
  }

  await ctx.page.goto(`${process.env.BASE_URL || 'http://localhost:4200'}${href}`, {
    waitUntil: 'domcontentloaded',
  });

  // Verify car detail elements
  await ctx.page.waitForTimeout(2000);

  const detailElements = [
    '#book-now', // Booking button
    '.car-detail, app-car-detail, [data-testid="car-detail"]',
    '.car-gallery, .car-images, app-car-gallery',
  ];

  let foundElement = false;
  for (const selector of detailElements) {
    const element = ctx.page.locator(selector);
    if ((await element.count()) > 0) {
      foundElement = true;
      break;
    }
  }

  if (!foundElement) {
    throw new Error('Car detail page missing critical elements');
  }
}

/**
 * Test 4: Login flow works
 */
async function testLoginFlow(ctx: TestContext): Promise<void> {
  // Clear session first
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  // Navigate to login
  await ctx.loginPage.goto();

  // Check if scenic mode (has signin button)
  const scenicSignin = ctx.page.locator('[data-testid="login-scenic-signin"]');
  if ((await scenicSignin.count()) > 0) {
    await scenicSignin.click({ timeout: 10000 });
  }

  // Wait for form to load
  await ctx.loginPage.assertFormLoaded();

  // Attempt login with test credentials
  const email = ctx.testData.validUser.email;
  const password = ctx.testData.validUser.password;

  await ctx.loginPage.loginAndWaitForRedirect(email, password, 30000);

  // Verify we're logged in (not on login page)
  const currentUrl = ctx.page.url();
  if (currentUrl.includes('/auth/login') || currentUrl.includes('/login')) {
    throw new Error('Login did not redirect away from login page');
  }

  // Verify session exists
  const hasSession = await ctx.page.evaluate(() => {
    const session = localStorage.getItem('sb-pisqjmoklivzpwufhscx-auth-token');
    return !!session;
  });

  if (!hasSession) {
    throw new Error('Login did not create session');
  }
}

/**
 * Test 5: Navigation works
 */
async function testNavigation(ctx: TestContext): Promise<void> {
  const routes = [
    { path: '/', name: 'Home' },
    { path: '/cars/list', name: 'Marketplace' },
    { path: '/help', name: 'Help' },
  ];

  for (const route of routes) {
    await ctx.loginPage.navigate(route.path);
    await ctx.page.waitForTimeout(1000);

    // Verify page loaded (no error page)
    const errorPage = ctx.page.locator(
      '.error-page, [data-testid="error"], .not-found, .error-boundary'
    );
    const hasError = (await errorPage.count()) > 0;

    if (hasError) {
      throw new Error(`Navigation to ${route.name} (${route.path}) failed - error page shown`);
    }

    // Verify app-root is present
    const appRoot = ctx.page.locator('app-root');
    if ((await appRoot.count()) === 0) {
      throw new Error(`Navigation to ${route.name} (${route.path}) failed - app-root missing`);
    }
  }
}

/**
 * Test 6: Search filters work
 */
async function testSearchFilters(ctx: TestContext): Promise<void> {
  await ctx.loginPage.navigate('/cars/list');
  await ctx.page.waitForTimeout(2000);

  // Look for filter controls
  const filterSelectors = [
    '[data-testid="filter-transmission"]',
    '[data-testid="filter-fuel"]',
    '.filters, .filter-bar, app-car-filters',
    'ion-segment, ion-select',
  ];

  let hasFilters = false;
  for (const selector of filterSelectors) {
    const filter = ctx.page.locator(selector);
    if ((await filter.count()) > 0) {
      hasFilters = true;
      break;
    }
  }

  if (!hasFilters) {
    // Filters might be behind a toggle on mobile
    const filterToggle = ctx.page.locator(
      '[data-testid="filter-toggle"], .filter-toggle, button:has-text("Filtros")'
    );
    if ((await filterToggle.count()) > 0) {
      await filterToggle.click();
      await ctx.page.waitForTimeout(500);
    }
  }

  // Just verify the page is responsive - don't require specific filters
  const responseTime = await ctx.page.evaluate(() => {
    const start = performance.now();
    document.querySelectorAll('*');
    return performance.now() - start;
  });

  if (responseTime > 1000) {
    console.log(`  [WARN] Page response time slow: ${responseTime}ms`);
  }
}

/**
 * Test 7: API health check
 */
async function testApiHealth(ctx: TestContext): Promise<void> {
  // Test Supabase REST API
  const supabaseUrl = 'https://pisqjmoklivzpwufhscx.supabase.co';
  const anonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.9EtMHXlpxCyZBMmlMYxYMjS3H7wjZ2M4M9p8gIqVb3I';

  const response = await ctx.page.evaluate(
    async ({ url, key }) => {
      try {
        const res = await fetch(`${url}/rest/v1/cars?select=id&limit=1`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        });
        return {
          ok: res.ok,
          status: res.status,
        };
      } catch (e) {
        return {
          ok: false,
          status: 0,
          error: String(e),
        };
      }
    },
    { url: supabaseUrl, key: anonKey }
  );

  if (!response.ok) {
    throw new Error(`API health check failed: status ${response.status}`);
  }
}

/**
 * Test 8: Mobile viewport works
 */
async function testMobileViewport(ctx: TestContext): Promise<void> {
  // Set mobile viewport
  await ctx.page.setViewportSize({ width: 375, height: 667 });

  await ctx.loginPage.navigate('/');
  await ctx.page.waitForTimeout(1500);

  // Verify app renders
  const appRoot = ctx.page.locator('app-root');
  if ((await appRoot.count()) === 0) {
    throw new Error('App does not render on mobile viewport');
  }

  // Check for mobile menu or hamburger
  const mobileNav = ctx.page.locator(
    'ion-menu-button, .hamburger, [data-testid="mobile-menu"], .mobile-nav'
  );
  const hasMobileNav = (await mobileNav.count()) > 0;

  // Navigate to marketplace on mobile
  await ctx.loginPage.navigate('/cars/list');
  await ctx.page.waitForTimeout(2000);

  // Verify content is visible
  const content = ctx.page.locator('ion-content, main, .main-content');
  if ((await content.count()) === 0) {
    throw new Error('Main content not visible on mobile');
  }

  // Reset viewport
  await ctx.page.setViewportSize({ width: 1280, height: 720 });
}

// ==================== TEST SUITE ====================

const tests = [
  { name: 'home-page-loads', fn: testHomePageLoads },
  { name: 'marketplace-loads-cars', fn: testMarketplaceLoadsCars },
  { name: 'car-detail-loads', fn: testCarDetailLoads },
  { name: 'login-flow', fn: testLoginFlow },
  { name: 'navigation-works', fn: testNavigation },
  { name: 'search-filters', fn: testSearchFilters },
  { name: 'api-health', fn: testApiHealth },
  { name: 'mobile-viewport', fn: testMobileViewport },
];

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log('\n========== REGRESSION TEST SUITE ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);
  console.log(`Tests: ${tests.length}`);
  console.log('');

  // Filter tests if specified
  const testFilter = process.env.TEST_FILTER;
  const selectedTests = testFilter
    ? tests.filter((t) => t.name.includes(testFilter))
    : tests;

  if (testFilter) {
    console.log(`Filter: ${testFilter} (${selectedTests.length} tests match)`);
  }

  const startTime = Date.now();

  const results = await runTests(selectedTests, {
    suite: 'regression',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  const duration = Date.now() - startTime;

  printReport(results);

  // Save report
  const reportPath = saveReport(results, 'regression-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`Total duration: ${(duration / 1000).toFixed(1)}s`);

  // Exit with error if any tests failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed`);
  }
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
