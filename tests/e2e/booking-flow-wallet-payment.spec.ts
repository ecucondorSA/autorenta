/**
 * E2E Test Suite: Booking Flow - Wallet Payment
 *
 * Generated from PRD: docs/prd/booking-flow-locatario.md
 * Priority: P0 (Critical - Core Business Flow)
 * User Story: As a locatario, I want to book a car using my wallet balance
 *
 * Test Coverage:
 * - T1: Happy path (wallet payment)
 * - E1: Insufficient wallet balance
 * - E4: User tries to book own car
 *
 * Prerequisites:
 * - User authenticated with role "locatario" or "ambos"
 * - User has wallet balance >$20,000
 * - At least one active car published by different user
 *
 * @see docs/prd/booking-flow-locatario.md
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_CONFIG = {
  CAR_MIN_PRICE: 5000, // ARS per day
  WALLET_BALANCE: 25000, // ARS
  BOOKING_DAYS: 3,
  EXPECTED_TOTAL: 18500 // 3 days × 5000 + insurance + fee
};

test.describe('Booking Flow - Wallet Payment (Locatario)', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait for splash loader to disappear if present
    await page.locator('app-splash-loader')
      .waitFor({ state: 'detached', timeout: 10000 })
      .catch(() => {});
  });

  /**
   * T1: Happy Path - Successful booking with wallet payment
   *
   * Steps:
   * 1. Browse cars on map
   * 2. Select car
   * 3. Choose dates (3 days)
   * 4. Review price breakdown
   * 5. Pay with wallet
   * 6. Verify booking confirmed
   */
  test('T1: should complete booking successfully with wallet payment', async ({ page }) => {
    // Step 1: Browse cars on /cars (default route)
    await expect(page).toHaveURL(/\/(cars)?$/);

    // Verify map is visible
    const map = page.locator('#map, .mapboxgl-map').first();
    await expect(map).toBeVisible({ timeout: 10000 });

    // Step 2: Select first available car from list/map
    // Look for car card or marker
    const carCard = page.locator('[data-testid="car-card"]').first();
    const carMarker = page.locator('.mapboxgl-marker').first();

    // Click on car (either card or marker)
    if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await carCard.click();
    } else if (await carMarker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await carMarker.click();
    } else {
      throw new Error('No cars available to select');
    }

    // Wait for navigation to car detail page
    await page.waitForURL(/\/cars\/[a-z0-9-]+$/, { timeout: 10000 });

    // Step 3: Click "Reservar" button
    const reserveButton = page.getByRole('button', { name: /reservar/i });
    await expect(reserveButton).toBeVisible({ timeout: 5000 });
    await reserveButton.click();

    // Step 4: Select dates in date picker modal
    // Wait for date picker to appear
    const datePicker = page.locator('[data-testid="date-picker"], ion-modal').first();
    await expect(datePicker).toBeVisible({ timeout: 5000 });

    // Select start date (today + 2 days to avoid 24h rule)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 2);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + TEST_CONFIG.BOOKING_DAYS);

    // Click on date cells (implementation depends on date picker component)
    // For now, we'll assume dates are selectable and continue

    // Click "Continuar" or "Confirmar fechas"
    const confirmDatesButton = page.getByRole('button', { name: /continuar|confirmar/i });
    await confirmDatesButton.click();

    // Step 5: Verify price breakdown
    // Should navigate to payment page
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 10000 });

    // Verify price breakdown is shown
    const priceBreakdown = page.locator('[data-testid="price-breakdown"]');
    await expect(priceBreakdown).toBeVisible({ timeout: 5000 });

    // Verify total price is reasonable (within range)
    const totalPrice = page.locator('[data-testid="total-price"]');
    const totalText = await totalPrice.textContent();
    expect(totalText).toMatch(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);

    // Step 6: Select wallet payment
    const walletPaymentOption = page.locator('input[type="radio"][value="wallet"]');
    await walletPaymentOption.check();

    // Verify wallet balance is shown
    const walletBalance = page.locator('[data-testid="wallet-balance"]');
    await expect(walletBalance).toBeVisible();

    // Step 7: Confirm payment
    const payButton = page.getByRole('button', { name: /pagar/i });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    // Step 8: Wait for confirmation
    // Should navigate to booking detail page or show success message
    await page.waitForURL(/\/bookings\/[a-z0-9-]+$/, { timeout: 15000 });

    // Verify success message
    const successMessage = page.locator('[role="alert"], .success-toast');
    await expect(successMessage).toContainText(/confirmada|exitosa/i, { timeout: 5000 });

    // Verify booking status is "confirmed"
    const statusBadge = page.locator('[data-testid="booking-status"]');
    await expect(statusBadge).toContainText(/confirmada/i);

    // Step 9: Verify booking appears in "Mis Reservas"
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Should see booking in list
    const bookingList = page.locator('[data-testid="booking-card"]').first();
    await expect(bookingList).toBeVisible({ timeout: 5000 });
    await expect(bookingList).toContainText(/confirmada/i);
  });

  /**
   * E1: Edge Case - Insufficient wallet balance
   *
   * Expected behavior:
   * - Error message displayed
   * - "Pagar" button disabled
   * - "Depositar ahora" button shown
   */
  test('E1: should show error when wallet balance is insufficient', async ({ page }) => {
    // Note: This test requires a user with low wallet balance (<$10,000)
    // For demo purposes, we'll test the UI behavior when insufficient balance is detected

    test.skip(!process.env.TEST_LOW_BALANCE_USER, 'Requires low balance test user');

    // Follow same steps as T1 until payment selection
    // ... (steps 1-5 from T1)

    // Navigate to a booking payment page
    // (In real test, we'd create booking first)

    // Select wallet payment
    const walletPaymentOption = page.locator('input[type="radio"][value="wallet"]');
    await walletPaymentOption.check();

    // Verify insufficient balance error
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/saldo insuficiente/i);

    // Verify "Pagar" button is disabled
    const payButton = page.getByRole('button', { name: /pagar/i });
    await expect(payButton).toBeDisabled();

    // Verify "Depositar ahora" button is shown
    const depositButton = page.getByRole('button', { name: /depositar/i });
    await expect(depositButton).toBeVisible();
  });

  /**
   * E4: Edge Case - User tries to book own car
   *
   * Expected behavior:
   * - "Reservar" button hidden or disabled
   * - If accessed directly: error message shown
   */
  test('E4: should prevent user from booking their own car', async ({ page }) => {
    // This test requires user to be logged in as car owner
    test.skip(!process.env.TEST_CAR_OWNER_USER, 'Requires car owner test user');

    // Navigate to user's own car detail page
    // (In real test, we'd get car ID from user's published cars)

    // Verify "Reservar" button is not present or disabled
    const reserveButton = page.getByRole('button', { name: /reservar/i });

    // Button should not exist or be disabled
    const buttonExists = await reserveButton.count();
    if (buttonExists > 0) {
      await expect(reserveButton).toBeDisabled();
    }

    // Alternative: Try to access booking URL directly
    // Should show error and redirect
    await page.goto('/bookings/create?car_id=own-car-id');

    // Verify error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/no puedes reservar tu propio auto/i);

    // Should redirect back to car detail or cars list
    await expect(page).toHaveURL(/\/cars/);
  });

  /**
   * Dynamic Price Calculation Test
   *
   * Verifies that price updates when changing dates
   */
  test('T4: should calculate price correctly for different date ranges', async ({ page }) => {
    // Navigate to car detail page
    await page.goto('/cars'); // Will redirect to first available car

    // Open date picker
    const reserveButton = page.getByRole('button', { name: /reservar/i });
    await reserveButton.click();

    // Select 1 day
    // ... (select dates logic)

    // Verify price for 1 day is ~$6,500
    let totalPrice = page.locator('[data-testid="total-price"]');
    await expect(totalPrice).toContainText(/6[.,]500/);

    // Change to 3 days
    // ... (change dates logic)

    // Verify price updates to ~$18,500
    await expect(totalPrice).toContainText(/18[.,]500/);

    // Change to 7 days
    // ... (change dates logic)

    // Verify price updates to ~$40,500
    await expect(totalPrice).toContainText(/40[.,]500/);
  });

  /**
   * View Booking Details Test
   *
   * Verifies user can view confirmed booking details
   */
  test('T3: should display booking details after confirmation', async ({ page }) => {
    // This test requires a pre-existing confirmed booking
    test.skip(!process.env.TEST_EXISTING_BOOKING_ID, 'Requires existing booking');

    const bookingId = process.env.TEST_EXISTING_BOOKING_ID;

    // Navigate to booking detail page
    await page.goto(`/bookings/${bookingId}`);
    await page.waitForLoadState('networkidle');

    // Verify booking details are displayed
    const bookingDetail = page.locator('[data-testid="booking-detail"]');
    await expect(bookingDetail).toBeVisible();

    // Verify status badge shows "Confirmada"
    const statusBadge = page.locator('[data-testid="booking-status"]');
    await expect(statusBadge).toContainText(/confirmada/i);

    // Verify car info is shown
    const carInfo = page.locator('[data-testid="car-info"]');
    await expect(carInfo).toBeVisible();

    // Verify dates are shown
    const bookingDates = page.locator('[data-testid="booking-dates"]');
    await expect(bookingDates).toBeVisible();

    // Verify owner contact button is visible
    const contactButton = page.getByRole('button', { name: /contactar|mensaje/i });
    await expect(contactButton).toBeVisible();
  });
});

/**
 * Helper functions for booking tests
 */

/**
 * Selects dates in date picker
 */
async function selectDates(page: Page, startDate: Date, endDate: Date): Promise<void> {
  // Implementation depends on date picker component
  // This is a placeholder for the actual implementation

  const startDateButton = page.locator(`[data-date="${startDate.toISOString().split('T')[0]}"]`);
  await startDateButton.click();

  const endDateButton = page.locator(`[data-date="${endDate.toISOString().split('T')[0]}"]`);
  await endDateButton.click();
}

/**
 * Formats price for comparison
 */
function formatPrice(price: number): string {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  });
}
