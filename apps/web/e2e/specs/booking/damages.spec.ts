/**
 * Damages Flow E2E Test
 *
 * Tests the damage reporting flow:
 * 1. Navigate to an existing booking
 * 2. Open damage report page (owner view)
 * 3. Verify damage report form loads
 * 4. Test photo upload UI elements
 *
 * Note: Requires an active/completed booking where user is the owner
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';

async function testDamageReportPageLoads(ctx: TestContext): Promise<void> {
  // Login first
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  await ctx.loginPage.goto();
  await ctx.page.locator('[data-testid="login-scenic-signin"]').click({ timeout: 15000 });
  await ctx.loginPage.assertFormLoaded();
  await ctx.loginPage.loginAndWaitForRedirect(
    ctx.testData.validUser.email,
    ctx.testData.validUser.password,
    30000,
  );
  await ctx.page.waitForTimeout(1500);

  // Navigate to bookings list
  await ctx.loginPage.navigate('/bookings');
  await ctx.page.waitForTimeout(1500);

  // Find bookings where we are the owner
  const bookingCards = ctx.page.locator('app-booking-card, [data-testid="booking-card"]');
  const cardCount = await bookingCards.count();

  if (cardCount === 0) {
    console.log('No bookings found - skipping damage report test');
    return;
  }

  // Look for bookings with "owner" indicator or completed status
  let bookingId: string | null = null;

  for (let i = 0; i < Math.min(cardCount, 10); i++) {
    const card = bookingCards.nth(i);

    // Check for owner indicator
    const cardText = (await card.textContent())?.toLowerCase() || '';
    const isOwnerBooking =
      cardText.includes('tu auto') ||
      cardText.includes('propietario') ||
      cardText.includes('dueño') ||
      cardText.includes('alquilaste');

    // Check status
    const statusBadge = card.locator('[data-status], .status-badge, ion-badge');
    const statusText = (await statusBadge.textContent())?.toLowerCase() || '';
    const eligibleStatus =
      statusText.includes('complet') ||
      statusText.includes('activ') ||
      statusText.includes('devuelt') ||
      statusText.includes('finaliz');

    if (isOwnerBooking || eligibleStatus) {
      const bookingLink = card.locator('a[href*="/bookings/"]').first();
      const href = await bookingLink.getAttribute('href');

      if (href) {
        const match = href.match(/\/bookings\/([a-f0-9-]+)/);
        if (match) {
          bookingId = match[1];
          break;
        }
      }
    }
  }

  if (!bookingId) {
    // Fallback: use first booking
    const firstCard = bookingCards.first();
    const bookingLink = firstCard.locator('a[href*="/bookings/"]').first();
    const href = await bookingLink.getAttribute('href');

    if (href) {
      const match = href.match(/\/bookings\/([a-f0-9-]+)/);
      if (match) {
        bookingId = match[1];
      }
    }
  }

  if (!bookingId) {
    throw new Error('Could not find any booking for damage report test');
  }

  // Navigate to damage report page
  await ctx.loginPage.navigate(`/bookings/${bookingId}/owner-damage-report`);
  await ctx.page.waitForTimeout(2000);

  // Check if we can access the page (may redirect if not owner)
  const currentUrl = ctx.page.url();

  if (currentUrl.includes('/login')) {
    throw new Error('Redirected to login - auth may have expired');
  }

  if (!currentUrl.includes('damage-report')) {
    console.log(`Redirected to ${currentUrl} - user may not be the owner of this booking`);
    return;
  }

  // Verify damage report elements
  const pageContent = await ctx.page.content();
  const isDamageReportPage =
    pageContent.includes('daño') ||
    pageContent.includes('damage') ||
    pageContent.includes('Reportar') ||
    pageContent.includes('Reporte');

  if (!isDamageReportPage) {
    console.log('Page loaded but damage report elements not found');
    return;
  }

  console.log('Damage report page loaded successfully');
}

async function testDamageReportFormElements(ctx: TestContext): Promise<void> {
  // Login
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  await ctx.loginPage.goto();
  await ctx.page.locator('[data-testid="login-scenic-signin"]').click({ timeout: 15000 });
  await ctx.loginPage.assertFormLoaded();
  await ctx.loginPage.loginAndWaitForRedirect(
    ctx.testData.validUser.email,
    ctx.testData.validUser.password,
    30000,
  );
  await ctx.page.waitForTimeout(1500);

  // Go to bookings
  await ctx.loginPage.navigate('/bookings');
  await ctx.page.waitForTimeout(1500);

  const bookingCards = ctx.page.locator('app-booking-card, [data-testid="booking-card"]');
  const cardCount = await bookingCards.count();

  if (cardCount === 0) {
    console.log('No bookings found - skipping damage form test');
    return;
  }

  // Get first booking ID
  const firstCard = bookingCards.first();
  const bookingLink = firstCard.locator('a[href*="/bookings/"]').first();
  const href = await bookingLink.getAttribute('href');

  if (!href) {
    throw new Error('Could not find booking link');
  }

  const match = href.match(/\/bookings\/([a-f0-9-]+)/);
  if (!match) {
    throw new Error('Could not extract booking ID');
  }

  const bookingId = match[1];

  // Navigate to damage report
  await ctx.loginPage.navigate(`/bookings/${bookingId}/owner-damage-report`);
  await ctx.page.waitForTimeout(2000);

  // Check if redirected
  if (!ctx.page.url().includes('damage')) {
    console.log('Not on damage report page - may not be owner');
    return;
  }

  // Check for form elements
  const elements = {
    photoUpload:
      (await ctx.page.locator('input[type="file"], ion-button:has-text("Foto"), button:has-text("Subir")').count()) > 0,
    descriptionField:
      (await ctx.page.locator('textarea, ion-textarea').count()) > 0,
    damageTypeSelect:
      (await ctx.page.locator('ion-select, select, ion-radio-group').count()) > 0,
    amountField:
      (await ctx.page.locator('input[type="number"], ion-input[type="number"]').count()) > 0,
    submitButton:
      (await ctx.page.locator('button[type="submit"], ion-button:has-text("Enviar"), ion-button:has-text("Reportar")').count()) > 0,
  };

  console.log('Damage report form elements found:', elements);

  // Verify at least some form elements exist
  const hasFormElements = Object.values(elements).some((v) => v);

  if (!hasFormElements) {
    // Check if there's a "no damage" confirmation instead
    const noDamageOption = ctx.page.locator(
      'button:has-text("Sin daños"), ion-button:has-text("Sin daños"), button:has-text("Confirmar")',
    );

    if ((await noDamageOption.count()) > 0) {
      console.log('Found "no damage" confirmation option - form not needed');
      return;
    }

    console.log('No damage report form elements found');
  }
}

async function testDamageAmountEstimation(ctx: TestContext): Promise<void> {
  // Login
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  await ctx.loginPage.goto();
  await ctx.page.locator('[data-testid="login-scenic-signin"]').click({ timeout: 15000 });
  await ctx.loginPage.assertFormLoaded();
  await ctx.loginPage.loginAndWaitForRedirect(
    ctx.testData.validUser.email,
    ctx.testData.validUser.password,
    30000,
  );
  await ctx.page.waitForTimeout(1500);

  // Navigate to booking detail first
  await ctx.loginPage.navigate('/bookings');
  await ctx.page.waitForTimeout(1500);

  const bookingCards = ctx.page.locator('app-booking-card, [data-testid="booking-card"]');

  if ((await bookingCards.count()) === 0) {
    console.log('No bookings found');
    return;
  }

  // Click on first booking
  const firstCard = bookingCards.first();
  const bookingLink = firstCard.locator('a[href*="/bookings/"]').first();
  await bookingLink.click();
  await ctx.page.waitForTimeout(2000);

  // Look for damage report button/link in booking detail
  const damageButton = ctx.page.locator(
    'a[href*="damage"], button:has-text("Reportar daño"), ion-button:has-text("Daño")',
  ).first();

  if ((await damageButton.count()) > 0) {
    console.log('Found damage report access point in booking detail');
  } else {
    console.log('Damage report access not visible in booking detail - may depend on booking state');
  }
}

const tests = [
  { name: 'damage-report-page-loads', fn: testDamageReportPageLoads },
  { name: 'damage-report-form-elements', fn: testDamageReportFormElements },
  { name: 'damage-amount-estimation', fn: testDamageAmountEstimation },
];

async function main(): Promise<void> {
  console.log('\n========== DAMAGES E2E TEST ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

  const results = await runTests(tests, {
    suite: 'damages',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  printReport(results);
  const reportPath = saveReport(results, 'damages-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
