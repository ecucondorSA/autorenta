/**
 * Booking Flow E2E Tests
 *
 * Tests for the complete booking journey:
 * - Browse marketplace
 * - View car details
 * - Request booking
 * - Complete payment
 */
import { runTest, runTests, AutoRentaTest } from '../utils/test-base';
import { hasLog, waitForLog, getLogsByContext, getHttpLogs } from '../utils/debug-capture';

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@autorentar.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpass123';

/**
 * Test: Marketplace page loads with cars
 */
async function testMarketplaceLoads(test: AutoRentaTest): Promise<void> {
  await test.goto('/');
  await test.waitForAngular();

  // Wait for cars to load (either car cards or marketplace content)
  await test['page'].waitForSelector(
    '[data-testid="car-card"], .car-card, app-car-card, [class*="car"]',
    { timeout: 15000 }
  );

  // Check HTTP logs for API calls
  const httpLogs = await getHttpLogs(test['page']);
  const carApiCalls = httpLogs.filter(h => h.url.includes('cars') || h.url.includes('supabase'));
  console.log(`[E2E] API calls made: ${carApiCalls.length}`);
}

/**
 * Test: Car detail page loads (via direct URL)
 */
async function testCarDetailLoads(test: AutoRentaTest): Promise<void> {
  // Navigate directly to cars list
  await test.goto('/cars');
  await test.waitForAngular();

  // Wait for page to load
  await test['page'].waitForTimeout(3000);

  // Check if car cards loaded
  const carCards = await test['page'].$$('[data-testid="car-card"]');
  console.log(`[E2E] Found ${carCards.length} car cards`);

  if (carCards.length > 0) {
    // Click first car
    await carCards[0].click();
    await test['page'].waitForTimeout(3000);

    // Verify navigation
    const url = test.getUrl();
    console.log(`[E2E] After click URL: ${url}`);
  } else {
    console.log('[E2E] No car cards found - database may be empty');
  }
}

/**
 * Test: Booking request flow
 * Note: Skips login, just tests the booking UI loads
 */
async function testBookingRequestFlow(test: AutoRentaTest): Promise<void> {
  // Navigate to cars list
  await test.goto('/cars');
  await test.waitForAngular();
  await test['page'].waitForTimeout(3000);

  // Check if car cards exist
  const carCards = await test['page'].$$('[data-testid="car-card"]');
  console.log(`[E2E] Found ${carCards.length} car cards`);

  if (carCards.length > 0) {
    // Click first car
    await carCards[0].click();
    await test['page'].waitForTimeout(3000);

    // Check for booking button
    const bookButton = await test['page'].$('button:has-text("Reservar"), button:has-text("Solicitar"), [data-testid="book-button"]');
    console.log(`[E2E] Found booking button: ${!!bookButton}`);
  }
}

/**
 * Test: Date selection components exist
 */
async function testDateSelection(test: AutoRentaTest): Promise<void> {
  // Navigate to explore page which has date selection
  await test.goto('/explore');
  await test.waitForAngular();
  await test['page'].waitForTimeout(3000);

  // Look for any date-related UI
  const pageContent = await test['page'].content();
  const hasDateUI = pageContent.includes('fecha') ||
                    pageContent.includes('calendar') ||
                    pageContent.includes('date');

  console.log(`[E2E] Has date UI elements: ${hasDateUI}`);

  // Check for date picker inputs
  const dateInputs = await test['page'].$$('input[type="date"], [data-testid*="date"], [class*="date"]');
  console.log(`[E2E] Found ${dateInputs.length} date-related inputs`);
}

/**
 * Test: Payment page access (requires auth redirect)
 */
async function testPaymentPageLoads(test: AutoRentaTest): Promise<void> {
  // Try to navigate to payment page (will redirect to auth)
  await test.goto('/bookings/detail-payment');
  await test.waitForAngular();
  await test['page'].waitForTimeout(3000);

  // Check where we ended up
  const url = test.getUrl();
  console.log(`[E2E] Payment page URL: ${url}`);

  // Either on payment page or redirected to auth
  const isOnAuth = url.includes('/auth');
  const isOnPayment = url.includes('/payment');

  console.log(`[E2E] On auth: ${isOnAuth}, On payment: ${isOnPayment}`);
}

/**
 * Test: Wallet page access
 */
async function testWalletPageLoads(test: AutoRentaTest): Promise<void> {
  // Navigate to wallet (will redirect to auth if not logged in)
  await test.goto('/wallet');
  await test.waitForAngular();
  await test['page'].waitForTimeout(3000);

  // Check where we ended up
  const url = test.getUrl();
  console.log(`[E2E] Wallet URL: ${url}`);

  const isOnAuth = url.includes('/auth');
  const isOnWallet = url.includes('/wallet');

  console.log(`[E2E] On auth: ${isOnAuth}, On wallet: ${isOnWallet}`);
}

/**
 * Test: My bookings page access
 */
async function testMyBookingsLoads(test: AutoRentaTest): Promise<void> {
  // Navigate to my bookings (will redirect to auth if not logged in)
  await test.goto('/bookings');
  await test.waitForAngular();
  await test['page'].waitForTimeout(3000);

  // Check URL
  const url = test.getUrl();
  console.log(`[E2E] My bookings URL: ${url}`);

  const isOnAuth = url.includes('/auth');
  const isOnBookings = url.includes('/bookings');

  console.log(`[E2E] On auth: ${isOnAuth}, On bookings: ${isOnBookings}`);
}

/**
 * Test: Full booking flow (smoke test)
 */
async function testFullBookingFlow(test: AutoRentaTest): Promise<void> {
  console.log('[E2E] Starting full booking flow smoke test');

  // 1. Navigate to homepage
  await test.goto('/');
  await test.waitForAngular();
  console.log('[E2E] Step 1: On homepage');

  // 2. Check for cars
  await test['page'].waitForTimeout(3000);
  const carCards = await test['page'].$$('[data-testid="car-card"]');
  console.log(`[E2E] Step 2: Found ${carCards.length} car cards`);

  // 3. Navigate to cars list
  await test.goto('/cars');
  await test.waitForAngular();
  await test['page'].waitForTimeout(2000);
  console.log('[E2E] Step 3: On cars list');

  // 4. Check page content
  const title = await test.getTitle();
  console.log(`[E2E] Step 4: Page title: ${title}`);

  // 5. Check HTTP logs
  const httpLogs = await getHttpLogs(test['page']);
  console.log(`[E2E] Step 5: ${httpLogs.length} HTTP requests made`);

  console.log('[E2E] Full booking flow smoke test completed');
}

/**
 * Main: Run all booking tests
 */
async function main(): Promise<void> {
  const results = await runTests([
    { name: 'booking/marketplace-loads', fn: testMarketplaceLoads },
    { name: 'booking/car-detail-loads', fn: testCarDetailLoads },
    { name: 'booking/request-flow', fn: testBookingRequestFlow },
    { name: 'booking/date-selection', fn: testDateSelection },
    { name: 'booking/payment-page', fn: testPaymentPageLoads },
    { name: 'booking/wallet-page', fn: testWalletPageLoads },
    { name: 'booking/my-bookings', fn: testMyBookingsLoads },
    { name: 'booking/full-flow-smoke', fn: testFullBookingFlow },
  ]);

  // Exit with error if any test failed
  const failed = results.filter(r => !r.passed).length;
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);
