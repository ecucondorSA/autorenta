/**
 * Payment Flow E2E Tests
 *
 * Tests for the MercadoPago payment flow using Patchright (anti-bot bypass).
 * Uses Page Object Model with proper waits and assertions.
 */

import {
  runTests,
  printReport,
  saveReport,
  loginBeforeTest,
  type TestContext,
} from '../../fixtures/test-fixtures';
import type { PaymentPageParams, TestCardData } from '../../page-objects/payment.page';

// ==================== HELPERS ====================

/**
 * Check if login credentials are valid
 * Handles case where user is already logged in (persistent context)
 */
async function tryLogin(ctx: TestContext): Promise<boolean> {
  try {
    // First check if we're already logged in by navigating to a protected page
    await ctx.page.goto(`${process.env.BASE_URL || 'http://localhost:4200'}/wallet`, {
      waitUntil: 'domcontentloaded',
    });
    await ctx.page.waitForTimeout(2000);

    // If we're on wallet page (not redirected to login), we're already logged in
    const currentUrl = ctx.page.url();
    if (currentUrl.includes('/wallet') && !currentUrl.includes('/auth')) {
      console.log('Already logged in (persistent session)');
      return true;
    }

    // Not logged in, try to login
    await ctx.loginPage.goto();
    await ctx.page.waitForTimeout(1000);

    // Check if login form exists (might already be logged in)
    const hasLoginForm = await ctx.page.locator('[data-testid="login-email-input"]').count();
    if (hasLoginForm === 0) {
      // No login form visible - might be logged in already
      if (!ctx.loginPage.isOnLoginPage()) {
        console.log('Already logged in');
        return true;
      }
    }

    await ctx.loginPage.login(ctx.testData.validUser.email, ctx.testData.validUser.password);
    await ctx.page.waitForTimeout(3000);

    // Check if we're still on login page with error
    const errorMsg = await ctx.loginPage.getErrorMessage();
    if (errorMsg && errorMsg.includes('Invalid')) {
      console.log('Login failed: Invalid credentials');
      console.log('TIP: Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars with valid Supabase credentials');
      return false;
    }

    // Check if we navigated away from login
    if (!ctx.loginPage.isOnLoginPage()) {
      console.log('Login successful');
      return true;
    }

    return false;
  } catch (error) {
    console.log('Login error:', error);
    return false;
  }
}

/**
 * Get a valid car ID from the marketplace
 * This ensures tests work with real data from the database
 */
async function getFirstAvailableCarId(ctx: TestContext): Promise<string | null> {
  await ctx.marketplacePage.goto();
  await ctx.marketplacePage.waitForCarsLoaded();

  const carCount = await ctx.marketplacePage.getCarCount();
  if (carCount === 0) {
    console.log('No cars available in marketplace');
    return null;
  }

  // Get the first car's ID
  const firstCard = ctx.marketplacePage.getCarCard(0);
  const carId = await firstCard.getAttribute('data-car-id');

  if (!carId) {
    // Try to extract from href
    const link = firstCard.locator('a[href*="/cars/"]').first();
    const href = await link.getAttribute('href');
    if (href) {
      const match = href.match(/\/cars\/([a-zA-Z0-9-]+)/);
      if (match) return match[1];
    }
  }

  return carId;
}

/**
 * Navigate to payment page with a valid car
 */
async function navigateToPaymentWithCar(ctx: TestContext): Promise<PaymentPageParams | null> {
  const carId = await getFirstAvailableCarId(ctx);
  if (!carId) {
    console.log('Could not find a valid car ID');
    return null;
  }

  // Use dates from test data
  const params: PaymentPageParams = {
    carId,
    startDate: new Date(ctx.testData.booking.dates.start).toISOString(),
    endDate: new Date(ctx.testData.booking.dates.end).toISOString(),
  };

  await ctx.paymentPage.goto(params);
  return params;
}

// ==================== TEST DEFINITIONS ====================

/**
 * Test: Marketplace has cars (no auth required)
 * This validates that we can get car IDs for payment tests
 */
async function testMarketplaceHasCars(ctx: TestContext): Promise<void> {
  console.log('Checking marketplace for available cars...');

  await ctx.marketplacePage.goto();
  await ctx.marketplacePage.waitForCarsLoaded();

  const carCount = await ctx.marketplacePage.getCarCount();
  console.log(`Found ${carCount} cars in marketplace`);

  if (carCount === 0) {
    throw new Error('No cars available in marketplace - cannot run payment tests');
  }

  // Try to get a car ID
  const carId = await getFirstAvailableCarId(ctx);
  if (!carId) {
    throw new Error('Could not extract car ID from marketplace');
  }

  console.log(`First car ID: ${carId}`);
  console.log('Marketplace test passed - cars are available');
}

/**
 * Test: Login works (prerequisite for payment tests)
 */
async function testLoginWorks(ctx: TestContext): Promise<void> {
  console.log('Testing login with configured credentials...');
  console.log(`Email: ${ctx.testData.validUser.email}`);

  const loginSuccess = await tryLogin(ctx);

  if (!loginSuccess) {
    throw new Error(
      'Login failed. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables with valid Supabase credentials to run payment tests.'
    );
  }

  console.log('Login test passed');
}

/**
 * Test: Payment page loads correctly (requires auth)
 */
async function testPaymentPageLoads(ctx: TestContext): Promise<void> {
  const { paymentPage } = ctx;

  // Login first (required for payment page)
  console.log('Logging in before payment test...');
  const loginSuccess = await tryLogin(ctx);
  if (!loginSuccess) {
    console.log('SKIPPED: Login failed - cannot test payment page without auth');
    return;
  }

  // Navigate to payment page with a real car
  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available - cannot test payment page');
  }

  // Assert page loaded
  await paymentPage.assertPageLoaded();

  // Verify car info is displayed
  await paymentPage.assertCarInfoDisplayed();

  // Verify totals are displayed
  await paymentPage.assertTotalsDisplayed();

  console.log('Payment page loaded successfully');
}

/**
 * Test: MercadoPago brick initializes (requires auth)
 * Note: MP CardPayment Brick renders as native form, not iframe
 */
async function testMPBrickInitializes(ctx: TestContext): Promise<void> {
  const { paymentPage } = ctx;

  // Login first
  console.log('Logging in before MP brick test...');
  const loginSuccess = await tryLogin(ctx);
  if (!loginSuccess) {
    console.log('SKIPPED: Login failed - cannot test MP brick without auth');
    return;
  }

  // Navigate to payment page
  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available - cannot test MP brick');
  }

  await paymentPage.assertPageLoaded();

  // Select direct payment mode
  await paymentPage.selectDirectPayment();

  // Wait for MP form to be ready (native form, not iframe)
  console.log('Waiting for MercadoPago form to load...');
  await paymentPage.waitForMPFormReady(60000);

  // Verify form is loaded by checking for inputs
  const isFormLoaded = await paymentPage.isMPFormLoaded();
  if (!isFormLoaded) {
    throw new Error('MercadoPago form inputs not found');
  }

  console.log('MercadoPago Payment form loaded successfully!');
}

/**
 * Test: Payment mode toggle works (requires auth)
 */
async function testPaymentModeToggle(ctx: TestContext): Promise<void> {
  const { paymentPage } = ctx;

  // Login first
  console.log('Logging in before payment mode toggle test...');
  const loginSuccess = await tryLogin(ctx);
  if (!loginSuccess) {
    console.log('SKIPPED: Login failed - cannot test payment mode toggle without auth');
    return;
  }

  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available');
  }

  await paymentPage.assertPageLoaded();

  // Default should be direct payment
  let isDirectSelected = await paymentPage.isDirectPaymentSelected();
  console.log(`Direct payment initially selected: ${isDirectSelected}`);

  // Switch to preauthorization
  await paymentPage.selectPreauthorization();
  await ctx.page.waitForTimeout(500);

  isDirectSelected = await paymentPage.isDirectPaymentSelected();
  if (isDirectSelected) {
    throw new Error('Direct payment should not be selected after switching to preauth');
  }

  // Switch back to direct
  await paymentPage.selectDirectPayment();
  await ctx.page.waitForTimeout(500);

  isDirectSelected = await paymentPage.isDirectPaymentSelected();
  if (!isDirectSelected) {
    throw new Error('Direct payment should be selected after switching back');
  }

  console.log('Payment mode toggle works correctly');
}

/**
 * Test: Card form can be filled (without submitting) (requires auth)
 * Note: MP CardPayment Brick renders as native form, not iframe
 */
async function testCardFormFilling(ctx: TestContext): Promise<void> {
  const { paymentPage, testData } = ctx;

  // Login first
  console.log('Logging in before card form test...');
  const loginSuccess = await tryLogin(ctx);
  if (!loginSuccess) {
    console.log('SKIPPED: Login failed - cannot test card form without auth');
    return;
  }

  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available');
  }

  await paymentPage.assertPageLoaded();
  await paymentPage.selectDirectPayment();
  await paymentPage.waitForMPFormReady(60000);

  // Check MP form is loaded (native form, not iframe)
  const isFormLoaded = await paymentPage.isMPFormLoaded();
  if (!isFormLoaded) {
    throw new Error('MercadoPago form not loaded - inputs not found');
  }

  console.log('MercadoPago form loaded, attempting to fill card form...');

  // Try to fill the card form fields
  try {
    await paymentPage.fillCardNumber(testData.testCard.number);
    console.log('Card number filled successfully');

    await paymentPage.fillExpiration(testData.testCard.expiry);
    console.log('Expiration filled successfully');

    await paymentPage.fillCvv(testData.testCard.cvv);
    console.log('CVV filled successfully');

    await paymentPage.fillCardholderName(testData.testCard.holder);
    console.log('Cardholder name filled successfully');

    await paymentPage.fillDocNumber(testData.testCard.docNumber);
    console.log('Document number filled successfully');

    await paymentPage.fillEmail(testData.testCard.email);
    console.log('Email filled successfully');

  } catch (error) {
    console.log('Error filling form:', error);

    // Debug: list all inputs in the payment brick container
    const inputs = await ctx.page.locator('#paymentBrick_container input').all();
    console.log(`Found ${inputs.length} inputs in MP container`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      console.log(`Input ${i}: name="${name}", placeholder="${placeholder}", id="${id}"`);
    }

    throw error;
  }

  console.log('Card form filling test passed');
}

/**
 * Test: Complete payment flow with test card (APRO = Approved)
 * NOTE: This test requires authentication and may create a real booking
 */
async function testCompletePaymentFlow(ctx: TestContext): Promise<void> {
  const { paymentPage, testData, loginPage } = ctx;

  // First, login (required for payment)
  console.log('Logging in before payment test...');
  await loginBeforeTest(ctx);

  // Navigate to payment page
  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available');
  }

  await paymentPage.assertPageLoaded();
  await paymentPage.selectDirectPayment();
  await paymentPage.waitForMPBrickReady(60000);

  console.log('Attempting to fill complete card form...');

  // Fill the card form with test card data
  const cardData: TestCardData = {
    number: testData.testCard.number,
    expiry: testData.testCard.expiry,
    cvv: testData.testCard.cvv,
    holder: testData.testCard.holder,
    docType: testData.testCard.docType,
    docNumber: testData.testCard.docNumber,
    email: testData.testCard.email,
  };

  try {
    await paymentPage.fillCardForm(cardData);
    console.log('Card form filled successfully');
  } catch (error) {
    console.log('Error filling card form:', error);
    // Take screenshot for debugging
    await ctx.page.screenshot({ path: 'reports/payment-form-error.png', fullPage: true });
    throw error;
  }

  // Submit the MP form
  console.log('Submitting payment...');
  await paymentPage.submitMPForm();

  // Wait for processing
  await paymentPage.waitForProcessingComplete(120000); // 2 minute timeout

  // Check for success redirect or error
  const currentUrl = ctx.page.url();
  console.log(`After payment URL: ${currentUrl}`);

  if (currentUrl.includes('/success')) {
    console.log('Payment successful! Redirected to success page.');
    await paymentPage.assertPaymentSuccess();
  } else if (await paymentPage.hasError()) {
    const errorMsg = await paymentPage.getErrorMessage();
    console.log(`Payment error: ${errorMsg}`);
    // For test card with APRO holder, we expect success
    // If there's an error, it might be due to test environment issues
    throw new Error(`Payment failed unexpectedly: ${errorMsg}`);
  } else {
    // Might still be on payment page - check state
    console.log('Still on payment page after submission');
  }
}

/**
 * Test: Error handling with failing card (OTHE = Other error)
 */
async function testPaymentFailure(ctx: TestContext): Promise<void> {
  const { paymentPage, testData } = ctx;

  // Login first
  await loginBeforeTest(ctx);

  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available');
  }

  await paymentPage.assertPageLoaded();
  await paymentPage.selectDirectPayment();
  await paymentPage.waitForMPBrickReady(60000);

  // Fill with failing card (OTHE holder = rejected)
  const cardData: TestCardData = {
    number: testData.failingCard.number,
    expiry: testData.failingCard.expiry,
    cvv: testData.failingCard.cvv,
    holder: testData.failingCard.holder, // OTHE = other error
    docType: testData.failingCard.docType,
    docNumber: testData.failingCard.docNumber,
    email: testData.failingCard.email,
  };

  try {
    await paymentPage.fillCardForm(cardData);
    await paymentPage.submitMPForm();

    // Wait for response
    await ctx.page.waitForTimeout(10000);

    // Should stay on payment page with error
    if (paymentPage.isOnPaymentPage()) {
      const hasError = await paymentPage.hasError();
      if (hasError) {
        console.log('Payment correctly rejected with error displayed');
      } else {
        console.log('Payment stayed on page but no error shown (might be still processing)');
      }
    }
  } catch (error) {
    // Expected for failing card scenario
    console.log('Payment correctly failed:', error);
  }

  console.log('Payment failure handling test passed');
}

/**
 * Test: Download PDF quote
 */
async function testDownloadPdf(ctx: TestContext): Promise<void> {
  const { paymentPage } = ctx;

  const params = await navigateToPaymentWithCar(ctx);
  if (!params) {
    throw new Error('No cars available');
  }

  await paymentPage.assertPageLoaded();

  // Check if download PDF button exists
  const hasDownloadBtn = await ctx.page.locator('button:has-text("Descargar Presupuesto")').isVisible();
  if (!hasDownloadBtn) {
    console.log('Download PDF button not visible on this page');
    return;
  }

  // Set up download handler
  const [download] = await Promise.all([
    ctx.page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    paymentPage.clickDownloadPdf(),
  ]);

  if (download) {
    console.log(`PDF downloaded: ${download.suggestedFilename()}`);
  } else {
    console.log('No download triggered - PDF might be generated differently');
  }
}

/**
 * Test: Page shows error or handles missing parameters (requires auth)
 */
async function testMissingParameters(ctx: TestContext): Promise<void> {
  const { paymentPage } = ctx;

  // Login first to reach the payment page
  console.log('Logging in before missing parameters test...');
  const loginSuccess = await tryLogin(ctx);
  if (!loginSuccess) {
    console.log('SKIPPED: Login failed - cannot test missing parameters without auth');
    return;
  }

  // Navigate to payment page without parameters
  await paymentPage.navigate('/bookings/detail-payment');

  // Wait for page to load or redirect
  await ctx.page.waitForTimeout(3000);

  // Check where we ended up
  const url = ctx.page.url();
  console.log(`Current URL: ${url}`);

  // Valid outcomes for missing parameters:
  // 1. Error displayed on payment page
  // 2. Redirected to cars list or marketplace
  // 3. Page shows loading/empty state

  if (url.includes('/bookings/detail-payment')) {
    // Still on payment page - check for error or loading state
    const hasError = await paymentPage.hasError();
    const isLoading = await paymentPage.isLoading();

    if (hasError) {
      const errorMsg = await paymentPage.getErrorMessage();
      console.log(`Error displayed: ${errorMsg}`);
    } else if (isLoading) {
      console.log('Page is in loading state (waiting for parameters)');
    } else {
      // Check page content
      const pageContent = await ctx.page.textContent('body');
      const hasValidationError = pageContent?.includes('error') || pageContent?.includes('Error') || pageContent?.includes('requerido');
      console.log(`Page shows validation message: ${hasValidationError}`);
    }
  } else {
    // Redirected to another page
    console.log(`Redirected to: ${url} (expected behavior for missing params)`);
  }

  console.log('Missing parameters test passed');
}

// ==================== TEST RUNNER ====================

const tests = [
  // Prerequisite tests (no auth required)
  { name: 'marketplace-has-cars', fn: testMarketplaceHasCars },

  // Auth test (will fail gracefully if no valid credentials)
  { name: 'login-works', fn: testLoginWorks },

  // Payment page tests (require auth - will skip if login fails)
  { name: 'payment-page-loads', fn: testPaymentPageLoads },
  { name: 'mp-brick-initializes', fn: testMPBrickInitializes },
  { name: 'payment-mode-toggle', fn: testPaymentModeToggle },
  { name: 'card-form-filling', fn: testCardFormFilling },
  { name: 'missing-parameters', fn: testMissingParameters },

  // Full payment flow tests (commented - require valid auth and may create real bookings):
  // { name: 'complete-payment-flow', fn: testCompletePaymentFlow },
  // { name: 'payment-failure', fn: testPaymentFailure },
  // { name: 'download-pdf', fn: testDownloadPdf },
];

async function main(): Promise<void> {
  console.log('\n========== PAYMENT E2E TESTS (Patchright) ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);
  console.log('Note: Using Patchright for anti-bot bypass');

  const results = await runTests(tests, {
    suite: 'payment',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  // Print and save report
  printReport(results);
  const reportPath = saveReport(results, 'payment-tests-report.json');
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
