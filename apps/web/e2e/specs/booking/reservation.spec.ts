/**
 * Reservation Flow E2E Test
 *
 * Creates a reservation from a car detail page and validates we reach the
 * checkout page (without completing payment).
 */

import { runTests, printReport, saveReport, clearSession, type TestContext } from '../../fixtures/test-fixtures';

async function setDateRangeViaFlatpickr(ctx: TestContext, from: string, to: string): Promise<void> {
  // If fallback inputs are present, use them (no flatpickr needed)
  const fallbackFrom = ctx.page.locator('app-date-range-picker [data-testid="date-fallback-from"]');
  const fallbackTo = ctx.page.locator('app-date-range-picker [data-testid="date-fallback-to"]');
  if ((await fallbackFrom.count()) > 0 && (await fallbackTo.count()) > 0) {
    await fallbackFrom.fill(from);
    await fallbackTo.fill(to);
    return;
  }

  // Open date picker (flatpickr)
  await ctx.page.locator('app-date-range-picker .date-input-wrapper').click({ timeout: 15000 });
  await ctx.page.locator('.flatpickr-calendar.open').waitFor({ state: 'visible', timeout: 15000 });

  const monthIndexToEs = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ] as const;

  const esToMonthIndex: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  const toLabel = (iso: string): string => {
    const d = new Date(`${iso}T12:00:00`);
    return `${monthIndexToEs[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const parseLabel = (label: string): { y: number; m: number } | null => {
    const m = label.match(/^([\\p{L}]+)\\s+(\\d{1,2}),\\s+(\\d{4})$/u);
    if (!m) return null;
    const monthName = m[1].toLowerCase();
    const year = Number(m[3]);
    const monthIdx = esToMonthIndex[monthName];
    if (!Number.isFinite(year) || typeof monthIdx !== 'number') return null;
    return { y: year, m: monthIdx };
  };

  const goToMonth = async (targetIso: string): Promise<void> => {
    const target = new Date(`${targetIso}T12:00:00`);
    const targetY = target.getFullYear();
    const targetM = target.getMonth();

    for (let i = 0; i < 60; i++) {
      const anyCurrentDay = ctx.page
        .locator('.flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)[aria-label]')
        .first();
      const currentLabel = (await anyCurrentDay.getAttribute('aria-label')) || '';
      const current = parseLabel(currentLabel);
      if (!current) break;

      if (current.y === targetY && current.m === targetM) return;

      const diffMonths = (targetY - current.y) * 12 + (targetM - current.m);
      if (diffMonths > 0) {
        await ctx.page.locator('.flatpickr-calendar.open .flatpickr-next-month').click();
      } else {
        await ctx.page.locator('.flatpickr-calendar.open .flatpickr-prev-month').click();
      }
      await ctx.page.waitForTimeout(120);
    }
  };

  // Pick FROM date
  await goToMonth(from);
  await ctx.page
    .locator(`.flatpickr-calendar.open .flatpickr-day[aria-label="${toLabel(from)}"]`)
    .first()
    .click({ timeout: 15000 });

  // Pick TO date
  await goToMonth(to);
  await ctx.page
    .locator(`.flatpickr-calendar.open .flatpickr-day[aria-label="${toLabel(to)}"]`)
    .first()
    .click({ timeout: 15000 });
}

async function testReservationCreatesAndNavigatesToCheckout(ctx: TestContext): Promise<void> {
  // Ensure clean session (GuestGuard behavior)
  await ctx.loginPage.navigate('/');
  await clearSession(ctx);

  // Login
  await ctx.loginPage.goto();
  // Scenic mode: open form first
  await ctx.page.locator('[data-testid="login-scenic-signin"]').click({ timeout: 15000 });
  await ctx.loginPage.assertFormLoaded();
  await ctx.loginPage.loginAndWaitForRedirect(ctx.testData.validUser.email, ctx.testData.validUser.password, 30000);
  await ctx.page.waitForTimeout(1500);

  // Go to cars list (more consistent than /cars landing)
  await ctx.loginPage.navigate('/cars/list');
  await ctx.page.waitForTimeout(1500);

  const cardSelectors = ['[data-testid=\"car-card\"]', 'app-car-card'];
  const cards = ctx.page.locator(cardSelectors.join(','));
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });

  const maxAttempts = 6;
  let lastError: string | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    // Open car detail
    const card = cards.nth(i);
    const href =
      (await card.getAttribute('href').catch(() => null)) ||
      (await card.locator('a[href*=\"/cars/\"]').first().getAttribute('href').catch(() => null));
    if (!href) {
      lastError = 'Could not determine car detail href';
      continue;
    }
    await ctx.page.goto(`${process.env.BASE_URL || 'http://localhost:4200'}${href}`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for booking widget (desktop)
    await ctx.page.locator('#book-now').waitFor({ state: 'visible', timeout: 20000 });

    // Set dates (env overridable)
    const from = ctx.testData.booking.dates.start;
    const to = ctx.testData.booking.dates.end;
    await setDateRangeViaFlatpickr(ctx, from, to);

    // Wait for availability computation to settle
    await ctx.page.waitForTimeout(1200);

    // Try to reserve
    await ctx.page.locator('#book-now').click();

    // Either we navigate to checkout, or we show an inline error
    try {
      await ctx.page.waitForURL((url) => {
        const u = url.toString();
        return u.includes('/bookings/') && u.includes('/payment');
      }, { timeout: 20000 });

      // Validate both payment methods render (stop at pay screen; do NOT confirm payment)
      await ctx.page.getByRole('heading', { name: 'Completar Pago' }).first().waitFor({ timeout: 20000 });
      await ctx.page.getByText('Elegí tu método de pago').waitFor({ timeout: 20000 });

      // Default: card
      await ctx.page.getByText('Pagar con Tarjeta de Crédito/Débito').waitFor({ timeout: 20000 });
      await ctx.page.locator('app-mercadopago-card-form').first().waitFor({ timeout: 20000 });

      // Switch to wallet
      await ctx.page
        .locator('app-payment-mode-toggle')
        .getByRole('button', { name: /Pagar con wallet/i })
        .click({ timeout: 20000 });
      await ctx.page.getByText('Pagar con Wallet AutoRenta').waitFor({ timeout: 20000 });
      await ctx.page.getByRole('button', { name: 'Confirmar Pago y Bloqueo de Garantía' }).waitFor({ timeout: 20000 });

      // Switch back to card (ensure both modes are reachable)
      await ctx.page
        .locator('app-payment-mode-toggle')
        .getByRole('button', { name: /Pagar con tarjeta/i })
        .click({ timeout: 20000 });
      await ctx.page.getByText('Pagar con Tarjeta de Crédito/Débito').waitFor({ timeout: 20000 });

      return;
    } catch {
      const errorBox = ctx.page.locator('div:has-text(\"Error al crear la reserva\"), div:has-text(\"No pudimos crear la reserva\"), div:has-text(\"pendiente de pago\"), div:has-text(\"no está disponible\")').first();
      const errorText = (await errorBox.textContent().catch(() => ''))?.trim() || '';
      lastError = errorText || 'Booking did not navigate to checkout';
      // Go back to list and try next car
      await ctx.page.goto(`${process.env.BASE_URL || 'http://localhost:4200'}/cars/list`, { waitUntil: 'domcontentloaded' });
      await ctx.page.waitForTimeout(1200);
    }
  }

  throw new Error(`Could not create a reservation after ${maxAttempts} cars. Last error: ${lastError || 'unknown'}`);
}

const tests = [{ name: 'reservation-creates-and-navigates-to-checkout', fn: testReservationCreatesAndNavigatesToCheckout }];

async function main(): Promise<void> {
  console.log('\n========== RESERVATION E2E TEST ==========\n');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);
  console.log(`Booking dates: ${process.env.TEST_BOOKING_START || '(default)'} → ${process.env.TEST_BOOKING_END || '(default)'}`);

  const results = await runTests(tests, {
    suite: 'booking',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  printReport(results);
  const reportPath = saveReport(results, 'reservation-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
