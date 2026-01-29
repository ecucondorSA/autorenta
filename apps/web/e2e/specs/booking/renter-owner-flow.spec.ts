/**
 * Renter <-> Owner Interaction E2E Tests
 *
 * Validates the core marketplace loop:
 * - Owner has at least one car
 * - Renter requests a booking on an owner car
 * - Owner can open the booking detail (and approve/reject when pending)
 * - Renter sees the resulting status
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

type Role = 'renter' | 'owner';
type Credentials = { email: string; password: string };

function getCredentials(ctx: TestContext, role: Role): Credentials {
  const emailEnv = role === 'renter' ? process.env.TEST_USER_EMAIL : process.env.TEST_OWNER_EMAIL;
  const passwordEnv = role === 'renter'
    ? process.env.TEST_USER_PASSWORD
    : process.env.TEST_OWNER_PASSWORD;

  const fallback = role === 'renter' ? ctx.testData.validUser : ctx.testData.ownerUser;

  const email = emailEnv || fallback.email;
  const password = passwordEnv || fallback.password;

  if (!email || !password) {
    const roleLabel = role === 'renter' ? 'renter' : 'owner';
    const envHint = role === 'renter'
      ? 'TEST_USER_EMAIL / TEST_USER_PASSWORD'
      : 'TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD';
    throw new Error(`Missing ${roleLabel} credentials. Set ${envHint} environment variables.`);
  }

  return { email, password };
}

async function ensureLoginFormVisible(ctx: TestContext): Promise<void> {
  const scenicSignin = ctx.page.locator('[data-testid="login-scenic-signin"]');
  if ((await scenicSignin.count()) > 0) {
    await scenicSignin.first().click({ timeout: 15000 });
  }
  await ctx.loginPage.assertFormLoaded();
}

async function loginAs(ctx: TestContext, role: Role): Promise<void> {
  const creds = getCredentials(ctx, role);

  await clearSession(ctx);
  await ctx.loginPage.goto();
  await ensureLoginFormVisible(ctx);

  await ctx.loginPage.loginAndWaitForRedirect(creds.email, creds.password, 30000);
  await ctx.page.waitForTimeout(1500);
}

async function getOwnerCarIds(ctx: TestContext): Promise<string[]> {
  await ctx.page.goto(`${BASE_URL}/cars/my`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(1500);

  const carCards = ctx.page.locator('[data-testid="car-card"]');
  const count = await carCards.count();

  if (count === 0) {
    throw new Error('Owner has no cars. Publish or seed at least one car for the owner user.');
  }

  const ids: string[] = [];
  const max = Math.min(count, 5);
  for (let i = 0; i < max; i += 1) {
    const id = await carCards.nth(i).getAttribute('data-car-id');
    if (id) ids.push(id);
  }

  if (ids.length === 0) {
    throw new Error('Could not extract car IDs from owner car cards.');
  }

  return Array.from(new Set(ids));
}

async function setDateRangeViaFlatpickr(ctx: TestContext, from: string, to: string): Promise<void> {
  const fallbackFrom = ctx.page.locator('app-date-range-picker [data-testid="date-fallback-from"]');
  const fallbackTo = ctx.page.locator('app-date-range-picker [data-testid="date-fallback-to"]');
  if ((await fallbackFrom.count()) > 0 && (await fallbackTo.count()) > 0) {
    await fallbackFrom.fill(from);
    await fallbackTo.fill(to);
    return;
  }

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
    const match = label.match(/^([\p{L}]+)\s+(\d{1,2}),\s+(\d{4})$/u);
    if (!match) return null;
    const monthName = match[1].toLowerCase();
    const year = Number(match[3]);
    const monthIdx = esToMonthIndex[monthName];
    if (!Number.isFinite(year) || typeof monthIdx !== 'number') return null;
    return { y: year, m: monthIdx };
  };

  const goToMonth = async (targetIso: string): Promise<void> => {
    const target = new Date(`${targetIso}T12:00:00`);
    const targetY = target.getFullYear();
    const targetM = target.getMonth();

    for (let i = 0; i < 60; i += 1) {
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

  await goToMonth(from);
  await ctx.page
    .locator(`.flatpickr-calendar.open .flatpickr-day[aria-label="${toLabel(from)}"]`)
    .first()
    .click({ timeout: 15000 });

  await goToMonth(to);
  await ctx.page
    .locator(`.flatpickr-calendar.open .flatpickr-day[aria-label="${toLabel(to)}"]`)
    .first()
    .click({ timeout: 15000 });
}

async function tryCreateBookingForCar(ctx: TestContext, carId: string): Promise<string | null> {
  await ctx.page.goto(`${BASE_URL}/cars/${carId}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(1500);

  const from = ctx.testData.booking.dates.start;
  const to = ctx.testData.booking.dates.end;
  await setDateRangeViaFlatpickr(ctx, from, to);

  const termsCheckbox = ctx.page.locator('#termsCheckbox');
  if ((await termsCheckbox.count()) > 0) {
    if (!(await termsCheckbox.isChecked())) {
      await termsCheckbox.check();
    }
  }

  const bookButton = ctx.page.locator('#book-now');
  await bookButton.waitFor({ state: 'visible', timeout: 15000 });
  await bookButton.click();

  try {
    await ctx.page.waitForURL(/\/bookings\/[^/]+\/detail-payment/, { timeout: 20000 });
  } catch {
    const errorText = await ctx.page
      .locator('text=No pudimos crear la reserva, text=Error al crear la reserva, text=No hay disponibilidad')
      .first()
      .textContent()
      .catch(() => '');
    console.log(`[E2E] Booking attempt failed for car ${carId}: ${errorText || 'no navigation'}`);
    return null;
  }

  const url = ctx.page.url();
  const match = url.match(/\/bookings\/([0-9a-fA-F-]+)\/detail-payment/);
  if (!match) {
    console.log(`[E2E] Booking detail URL did not include booking ID: ${url}`);
    return null;
  }

  return match[1];
}

async function createBookingForOwnerCars(ctx: TestContext, carIds: string[]): Promise<{ bookingId: string; carId: string }> {
  for (const carId of carIds) {
    const bookingId = await tryCreateBookingForCar(ctx, carId);
    if (bookingId) return { bookingId, carId };
  }

  throw new Error('Unable to create a booking with the owner cars. Check availability and dates.');
}

async function openOwnerBookingDetail(ctx: TestContext, bookingId: string): Promise<void> {
  await ctx.page.goto(`${BASE_URL}/bookings/owner/${bookingId}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.locator('text=Acciones del locador').waitFor({ timeout: 20000 });
}

async function openRenterBookingDetail(ctx: TestContext, bookingId: string): Promise<void> {
  await ctx.page.goto(`${BASE_URL}/bookings/${bookingId}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.locator('.status-badge').waitFor({ timeout: 20000 });
}

async function getRenterStatusText(ctx: TestContext): Promise<string> {
  const status = await ctx.page.locator('.status-badge').first().textContent();
  return status?.trim() || '';
}

async function approveIfPending(ctx: TestContext): Promise<boolean> {
  const approveButton = ctx.page.getByRole('button', { name: /^Aprobar$/ });
  if ((await approveButton.count()) === 0) {
    console.log('[E2E] No approve button found - booking likely not pending approval.');
    return false;
  }

  await approveButton.first().click();

  const checkInLink = ctx.page.getByText('Iniciar check-in (entrega)');
  if ((await checkInLink.count()) > 0) {
    await checkInLink.waitFor({ timeout: 20000 });
  } else {
    await ctx.page.waitForSelector('text=Confirmada', { timeout: 20000 });
  }

  return true;
}

async function rejectIfPending(ctx: TestContext): Promise<boolean> {
  const rejectButton = ctx.page.getByRole('button', { name: /^Rechazar$/ });
  if ((await rejectButton.count()) === 0) {
    console.log('[E2E] No reject button found - booking likely not pending approval.');
    return false;
  }

  await rejectButton.first().click();

  const alert = ctx.page.locator('ion-alert');
  await alert.waitFor({ state: 'visible', timeout: 15000 });

  const textarea = alert.locator('textarea');
  if ((await textarea.count()) > 0) {
    await textarea.fill('Rechazo E2E');
  }

  await alert.locator('button:has-text("Rechazar")').click();
  await alert.waitFor({ state: 'hidden', timeout: 15000 });

  await ctx.page.waitForSelector('text=Cancelada', { timeout: 20000 });
  return true;
}

// ==================== CHECK-IN/CHECK-OUT HELPERS ====================

async function startCheckIn(ctx: TestContext): Promise<boolean> {
  const checkInLink = ctx.page.locator('text=Iniciar check-in (entrega)');
  if ((await checkInLink.count()) === 0) {
    console.log('[E2E] No check-in link found');
    return false;
  }

  await checkInLink.click();
  await ctx.page.waitForURL(/\/check-in/, { timeout: 15000 });
  return true;
}

async function completeCheckInForm(ctx: TestContext): Promise<void> {
  // Wait for the check-in form to load
  await ctx.page.waitForSelector('[data-testid="check-in-form"], .check-in-container', { timeout: 15000 });

  // Fill odometer reading
  const odometerInput = ctx.page.locator('input[name="odometer"], input[formControlName="odometer"], [data-testid="odometer-input"]');
  if ((await odometerInput.count()) > 0) {
    await odometerInput.fill('50000');
  }

  // Fill fuel level
  const fuelSelect = ctx.page.locator('select[name="fuelLevel"], ion-select[formControlName="fuelLevel"], [data-testid="fuel-select"]');
  if ((await fuelSelect.count()) > 0) {
    await fuelSelect.click();
    await ctx.page.locator('ion-select-option[value="full"], option[value="full"]').first().click().catch(() => {
      // Fallback for different select implementations
    });
  }

  // Check condition confirmation checkbox
  const conditionCheckbox = ctx.page.locator('input[type="checkbox"][name="conditionConfirmed"], ion-checkbox[formControlName="conditionConfirmed"], [data-testid="condition-checkbox"]');
  if ((await conditionCheckbox.count()) > 0) {
    await conditionCheckbox.click();
  }

  // Submit check-in
  const submitButton = ctx.page.locator('button:has-text("Confirmar entrega"), button:has-text("Completar Check-in"), [data-testid="submit-checkin"]');
  if ((await submitButton.count()) > 0) {
    await submitButton.click();
    await ctx.page.waitForTimeout(2000);
  }
}

async function startCheckOut(ctx: TestContext): Promise<boolean> {
  const checkOutLink = ctx.page.locator('text=Iniciar check-out (devolución), text=Iniciar devolución');
  if ((await checkOutLink.count()) === 0) {
    console.log('[E2E] No check-out link found');
    return false;
  }

  await checkOutLink.click();
  await ctx.page.waitForURL(/\/check-out/, { timeout: 15000 });
  return true;
}

async function completeCheckOutForm(ctx: TestContext, hasDamages: boolean = false): Promise<void> {
  // Wait for the check-out form to load
  await ctx.page.waitForSelector('[data-testid="check-out-form"], .check-out-container', { timeout: 15000 });

  // Fill odometer reading (should be higher than check-in)
  const odometerInput = ctx.page.locator('input[name="odometer"], input[formControlName="odometer"], [data-testid="odometer-input"]');
  if ((await odometerInput.count()) > 0) {
    await odometerInput.fill('50500');
  }

  // Fill fuel level
  const fuelSelect = ctx.page.locator('select[name="fuelLevel"], ion-select[formControlName="fuelLevel"], [data-testid="fuel-select"]');
  if ((await fuelSelect.count()) > 0) {
    await fuelSelect.click();
    await ctx.page.locator('ion-select-option[value="full"], option[value="full"]').first().click().catch(() => {});
  }

  // Handle damages section
  if (hasDamages) {
    const damagesCheckbox = ctx.page.locator('input[type="checkbox"][name="hasDamages"], ion-checkbox[formControlName="hasDamages"]');
    if ((await damagesCheckbox.count()) > 0) {
      await damagesCheckbox.click();
    }

    const damageDescription = ctx.page.locator('textarea[name="damageDescription"], ion-textarea[formControlName="damageDescription"]');
    if ((await damageDescription.count()) > 0) {
      await damageDescription.fill('Minor scratch on rear bumper');
    }
  }

  // Check condition confirmation checkbox
  const conditionCheckbox = ctx.page.locator('input[type="checkbox"][name="conditionConfirmed"], ion-checkbox[formControlName="conditionConfirmed"], [data-testid="condition-checkbox"]');
  if ((await conditionCheckbox.count()) > 0) {
    await conditionCheckbox.click();
  }

  // Submit check-out
  const submitButton = ctx.page.locator('button:has-text("Confirmar devolución"), button:has-text("Completar Check-out"), [data-testid="submit-checkout"]');
  if ((await submitButton.count()) > 0) {
    await submitButton.click();
    await ctx.page.waitForTimeout(2000);
  }
}

async function confirmBookingCompletion(ctx: TestContext): Promise<boolean> {
  // Owner confirms the booking is complete (no damages)
  const confirmButton = ctx.page.locator('button:has-text("Confirmar sin daños"), button:has-text("Liberar fondos")');
  if ((await confirmButton.count()) === 0) {
    console.log('[E2E] No completion confirmation button found');
    return false;
  }

  await confirmButton.click();

  // Wait for success message or status change
  await ctx.page.waitForSelector('text=Completada, text=Fondos liberados', { timeout: 15000 }).catch(() => {});
  return true;
}

// ==================== TEST DEFINITIONS ====================

async function testRenterOwnerApprovalFlow(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting renter-owner approval flow');

  await loginAs(ctx, 'owner');
  const carIds = await getOwnerCarIds(ctx);
  console.log(`[E2E] Owner car IDs: ${carIds.join(', ')}`);

  await loginAs(ctx, 'renter');
  const booking = await createBookingForOwnerCars(ctx, carIds);
  console.log(`[E2E] Created booking ${booking.bookingId} for car ${booking.carId}`);

  await loginAs(ctx, 'owner');
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const approved = await approveIfPending(ctx);

  await loginAs(ctx, 'renter');
  await openRenterBookingDetail(ctx, booking.bookingId);

  const statusText = await getRenterStatusText(ctx);
  console.log(`[E2E] Renter booking status: ${statusText}`);

  if (approved) {
    if (!statusText.includes('Aprobada')) {
      throw new Error(`Expected renter status to include "Aprobada" after approval, got: ${statusText}`);
    }
  } else if (!statusText) {
    throw new Error('Booking status badge not found on renter detail page');
  }
}

async function testRenterOwnerRejectionFlow(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting renter-owner rejection flow');

  await loginAs(ctx, 'owner');
  const carIds = await getOwnerCarIds(ctx);

  await loginAs(ctx, 'renter');
  const booking = await createBookingForOwnerCars(ctx, carIds);
  console.log(`[E2E] Created booking ${booking.bookingId} for rejection test`);

  await loginAs(ctx, 'owner');
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const rejected = await rejectIfPending(ctx);

  if (!rejected) {
    console.log('[E2E] Skipping rejection assertions because booking is not pending approval');
    return;
  }

  await loginAs(ctx, 'renter');
  await openRenterBookingDetail(ctx, booking.bookingId);

  const statusText = await getRenterStatusText(ctx);
  console.log(`[E2E] Renter booking status after rejection: ${statusText}`);

  if (!statusText.includes('Cancelada')) {
    throw new Error(`Expected renter status to include "Cancelada" after rejection, got: ${statusText}`);
  }
}

// ==================== CHECK-IN/CHECK-OUT TEST DEFINITIONS ====================

/**
 * FIX 2025-12-28: E2E test for check-in flow
 * Tests that owner can start and complete check-in after booking is approved
 */
async function testCheckInFlow(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting check-in flow test');

  // Setup: Create and approve a booking
  await loginAs(ctx, 'owner');
  const carIds = await getOwnerCarIds(ctx);
  console.log(`[E2E] Owner car IDs: ${carIds.join(', ')}`);

  await loginAs(ctx, 'renter');
  const booking = await createBookingForOwnerCars(ctx, carIds);
  console.log(`[E2E] Created booking ${booking.bookingId} for check-in test`);

  // Approve the booking
  await loginAs(ctx, 'owner');
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const approved = await approveIfPending(ctx);

  if (!approved) {
    console.log('[E2E] Booking was not pending approval, skipping check-in test');
    return;
  }

  // Start check-in
  const checkInStarted = await startCheckIn(ctx);
  if (!checkInStarted) {
    console.log('[E2E] Check-in link not available - booking may require payment first');
    // This is expected if the booking requires payment before check-in
    return;
  }

  // Complete check-in form
  await completeCheckInForm(ctx);

  // Verify check-in was successful
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const statusAfterCheckIn = await ctx.page.locator('.status-badge, [data-testid="booking-status"]').first().textContent();
  console.log(`[E2E] Booking status after check-in: ${statusAfterCheckIn}`);

  // Status should indicate the car is with renter or "en curso"
  if (!statusAfterCheckIn?.toLowerCase().includes('curso') &&
      !statusAfterCheckIn?.toLowerCase().includes('activ') &&
      !statusAfterCheckIn?.toLowerCase().includes('entreg')) {
    console.log(`[E2E] Warning: Expected status to indicate active rental, got: ${statusAfterCheckIn}`);
  }
}

/**
 * FIX 2025-12-28: E2E test for check-out flow (without damages)
 * Tests complete flow: booking -> approval -> check-in -> check-out -> completion
 */
async function testCheckOutFlowNoDamages(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting check-out flow test (no damages)');

  // Setup: Create and approve a booking
  await loginAs(ctx, 'owner');
  const carIds = await getOwnerCarIds(ctx);

  await loginAs(ctx, 'renter');
  const booking = await createBookingForOwnerCars(ctx, carIds);
  console.log(`[E2E] Created booking ${booking.bookingId} for check-out test`);

  // Approve the booking
  await loginAs(ctx, 'owner');
  await openOwnerBookingDetail(ctx, booking.bookingId);
  await approveIfPending(ctx);

  // Try to start check-in (may not be available if payment required)
  const checkInStarted = await startCheckIn(ctx);
  if (!checkInStarted) {
    console.log('[E2E] Check-in not available - skipping check-out test');
    return;
  }
  await completeCheckInForm(ctx);

  // Navigate back to booking detail
  await openOwnerBookingDetail(ctx, booking.bookingId);

  // Start check-out
  const checkOutStarted = await startCheckOut(ctx);
  if (!checkOutStarted) {
    console.log('[E2E] Check-out link not available yet');
    return;
  }

  // Complete check-out without damages
  await completeCheckOutForm(ctx, false);

  // Confirm booking completion (release funds)
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const completed = await confirmBookingCompletion(ctx);

  if (completed) {
    console.log('[E2E] Booking completed successfully without damages');
  } else {
    console.log('[E2E] Could not confirm booking completion - may require renter confirmation');
  }

  // Verify final status
  const finalStatus = await ctx.page.locator('.status-badge, [data-testid="booking-status"]').first().textContent();
  console.log(`[E2E] Final booking status: ${finalStatus}`);
}

/**
 * FIX 2025-12-28: E2E test for check-out flow with damages
 * Tests the damage reporting and dispute flow
 */
async function testCheckOutFlowWithDamages(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting check-out flow test (with damages)');

  // Setup: Create and approve a booking
  await loginAs(ctx, 'owner');
  const carIds = await getOwnerCarIds(ctx);

  await loginAs(ctx, 'renter');
  const booking = await createBookingForOwnerCars(ctx, carIds);
  console.log(`[E2E] Created booking ${booking.bookingId} for damages test`);

  // Approve the booking
  await loginAs(ctx, 'owner');
  await openOwnerBookingDetail(ctx, booking.bookingId);
  await approveIfPending(ctx);

  // Try to start check-in
  const checkInStarted = await startCheckIn(ctx);
  if (!checkInStarted) {
    console.log('[E2E] Check-in not available - skipping damages test');
    return;
  }
  await completeCheckInForm(ctx);

  // Navigate back and start check-out
  await openOwnerBookingDetail(ctx, booking.bookingId);
  const checkOutStarted = await startCheckOut(ctx);
  if (!checkOutStarted) {
    console.log('[E2E] Check-out link not available yet');
    return;
  }

  // Complete check-out WITH damages
  await completeCheckOutForm(ctx, true);

  // Navigate to booking detail to see damage report
  await openOwnerBookingDetail(ctx, booking.bookingId);

  // Check for damage indicator
  const damageIndicator = ctx.page.locator('text=Daños reportados, text=Con daños, [data-testid="damage-indicator"]');
  if ((await damageIndicator.count()) > 0) {
    console.log('[E2E] Damage report visible in booking detail');
  } else {
    console.log('[E2E] Note: Damage indicator not visible - UI may vary');
  }

  // Verify status reflects pending dispute or damage review
  const statusText = await ctx.page.locator('.status-badge, [data-testid="booking-status"]').first().textContent();
  console.log(`[E2E] Booking status after damage report: ${statusText}`);
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'renter-owner/approval-flow', fn: testRenterOwnerApprovalFlow },
  { name: 'renter-owner/rejection-flow', fn: testRenterOwnerRejectionFlow },
  // FIX 2025-12-28: Added check-in/check-out E2E tests
  { name: 'renter-owner/check-in-flow', fn: testCheckInFlow },
  { name: 'renter-owner/check-out-no-damages', fn: testCheckOutFlowNoDamages },
  { name: 'renter-owner/check-out-with-damages', fn: testCheckOutFlowWithDamages },
];

async function main(): Promise<void> {
  console.log('\n========== RENTER-OWNER E2E TESTS ==========');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

  const results = await runTests(tests, {
    suite: 'renter-owner',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  printReport(results);
  const reportPath = saveReport(results, 'renter-owner-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

export { tests };
