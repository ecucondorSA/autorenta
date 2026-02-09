import { test, expect } from '@playwright/test';

/**
 * E2E Test: Booking Contract Acceptance Flow
 *
 * Tests the complete legal contract acceptance flow:
 * 1. User must see contract PDF before payment
 * 2. User must accept all 4 priority clauses
 * 3. Payment form only visible after contract acceptance
 * 4. Backend validates contract acceptance
 *
 * Legal Compliance:
 * - Ley 25.506 (Digital Signature)
 * - Ley 20.091 (SSN Insurance Regulation)
 * - Art. 173 CP (Illegal Retention)
 * - Art. 886 CCyC (Automatic Default)
 */

test.describe('Booking Contract Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user (renter)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test-renter@autorenta.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/cars/list', { timeout: 10000 });
  });

  test('should require contract acceptance before payment', async ({ page }) => {
    // 1. Navigate to a car detail page
    await page.goto('/cars/list');
    await page.waitForSelector('app-car-card', { timeout: 10000 });

    // Click first available car
    const firstCar = page.locator('app-car-card').first();
    await firstCar.click();

    // 2. Select dates and proceed to booking
    await page.waitForSelector('input[placeholder*="Inicio"]', { timeout: 5000 });

    // Set dates (2 days from now to 5 days from now)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 5);

    await page.fill('input[placeholder*="Inicio"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[placeholder*="Fin"]', endDate.toISOString().split('T')[0]);

    // Click "Reservar" button
    await page.click('button:has-text("Reservar")');

    // 3. Should redirect to payment page with contract
    await page.waitForURL(/booking-detail-payment/, { timeout: 15000 });

    // 4. Wait for contract to be prepared
    await page.waitForSelector('iframe[title="Contrato de Alquiler"]', { timeout: 15000 });

    // 5. Verify contract PDF is visible
    const iframe = page.locator('iframe[title="Contrato de Alquiler"]');
    await expect(iframe).toBeVisible();

    // 6. Verify payment form is NOT visible yet
    const paymentForm = page.locator('app-mercadopago-card-form');
    await expect(paymentForm).not.toBeVisible();

    // 7. Verify download link is visible
    const downloadLink = page.locator('a:has-text("Descargar PDF del contrato")');
    await expect(downloadLink).toBeVisible();

    // 8. Verify all 4 clause checkboxes are visible and unchecked
    const culpaGraveCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':text("Culpa Grave")')
    });
    const indemnidadCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':text("Indemnidad Total")')
    });
    const retencionCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':text("Retención Indebida")')
    });
    const moraCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':text("Mora Automática")')
    });

    await expect(culpaGraveCheckbox).toBeVisible();
    await expect(indemnidadCheckbox).toBeVisible();
    await expect(retencionCheckbox).toBeVisible();
    await expect(moraCheckbox).toBeVisible();

    // 9. Verify final acceptance checkbox is disabled
    const finalCheckbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':text("He leído y acepto TODAS las cláusulas")')
    });
    await expect(finalCheckbox).toBeDisabled();

    // 10. Accept all 4 clauses
    await culpaGraveCheckbox.check();
    await indemnidadCheckbox.check();
    await retencionCheckbox.check();
    await moraCheckbox.check();

    // 11. Verify final checkbox is now enabled
    await expect(finalCheckbox).toBeEnabled();

    // 12. Check final acceptance checkbox
    await finalCheckbox.check();

    // 13. Click "Aceptar Contrato" button
    const acceptButton = page.locator('button:has-text("Aceptar Contrato y Continuar al Pago")');
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();

    // 14. Wait for contract acceptance to complete
    await page.waitForTimeout(2000);

    // 15. Verify payment form is now visible
    await expect(paymentForm).toBeVisible({ timeout: 10000 });

    // 16. Verify contract section is hidden
    await expect(iframe).not.toBeVisible();
  });

  test('should prevent payment if contract not accepted', async ({ page, request }) => {
    // This test verifies backend validation

    // 1. Create a booking manually (without going through UI)
    const response = await request.post('/api/bookings/create', {
      data: {
        car_id: 'test-car-id',
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const booking = await response.json();

    // 2. Attempt to process payment WITHOUT accepting contract
    const paymentResponse = await request.post('/api/payments/process', {
      data: {
        booking_id: booking.id,
        card_token: 'test-token-123',
      },
    });

    // 3. Verify payment is rejected with CONTRACT_NOT_ACCEPTED error
    expect(paymentResponse.status()).toBe(400);
    const errorData = await paymentResponse.json();
    expect(errorData.error).toBe('CONTRACT_NOT_ACCEPTED');
    expect(errorData.message).toContain('Debes aceptar el contrato');
  });

  test('should validate all 4 clauses on backend', async ({ page, request }) => {
    // This test verifies backend clause validation

    // 1. Create booking
    const bookingResponse = await request.post('/api/bookings/create', {
      data: {
        car_id: 'test-car-id',
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const booking = await bookingResponse.json();

    // 2. Accept contract with ONLY 3 clauses (missing 'mora')
    await request.post('/api/contracts/accept', {
      data: {
        booking_id: booking.id,
        clauses_accepted: {
          culpaGrave: true,
          indemnidad: true,
          retencion: true,
          mora: false, // Missing!
        },
        ip_address: '127.0.0.1',
        user_agent: 'Playwright Test',
        device_fingerprint: 'test-fingerprint',
      },
    });

    // 3. Attempt to process payment
    const paymentResponse = await request.post('/api/payments/process', {
      data: {
        booking_id: booking.id,
        card_token: 'test-token-123',
      },
    });

    // 4. Verify payment is rejected with INCOMPLETE_CLAUSE_ACCEPTANCE error
    expect(paymentResponse.status()).toBe(400);
    const errorData = await paymentResponse.json();
    expect(errorData.error).toBe('INCOMPLETE_CLAUSE_ACCEPTANCE');
    expect(errorData.missing_clauses).toContain('mora');
  });

  test('should validate 24-hour expiry on backend', async ({ page, request }) => {
    // This test verifies the 24-hour acceptance expiry

    // 1. Create booking
    const bookingResponse = await request.post('/api/bookings/create', {
      data: {
        car_id: 'test-car-id',
        start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const booking = await bookingResponse.json();

    // 2. Manually update contract acceptance timestamp to 25 hours ago (expired)
    const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    await request.post('/api/test/update-contract-timestamp', {
      data: {
        booking_id: booking.id,
        accepted_at: expiredTimestamp,
      },
    });

    // 3. Attempt to process payment
    const paymentResponse = await request.post('/api/payments/process', {
      data: {
        booking_id: booking.id,
        card_token: 'test-token-123',
      },
    });

    // 4. Verify payment is rejected with CONTRACT_ACCEPTANCE_EXPIRED error
    expect(paymentResponse.status()).toBe(400);
    const errorData = await paymentResponse.json();
    expect(errorData.error).toBe('CONTRACT_ACCEPTANCE_EXPIRED');
    expect(errorData.hours_elapsed).toBeGreaterThan(24);
  });

  test('should store complete audit trail', async ({ page }) => {
    // This test verifies legal compliance metadata is stored

    // 1. Navigate to payment page (same as first test)
    await page.goto('/cars/list');
    await page.waitForSelector('app-car-card', { timeout: 10000 });
    const firstCar = page.locator('app-car-card').first();
    await firstCar.click();

    // 2. Set dates and proceed
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 5);

    await page.fill('input[placeholder*="Inicio"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[placeholder*="Fin"]', endDate.toISOString().split('T')[0]);
    await page.click('button:has-text("Reservar")');

    await page.waitForURL(/booking-detail-payment/, { timeout: 15000 });
    await page.waitForSelector('iframe[title="Contrato de Alquiler"]', { timeout: 15000 });

    // 3. Accept all clauses
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await checkboxes.nth(3).check();
    await checkboxes.nth(4).check();

    // 4. Intercept the contract acceptance API call
    const acceptancePromise = page.waitForResponse(
      (response) => response.url().includes('/booking_contracts') && response.request().method() === 'PATCH'
    );

    await page.click('button:has-text("Aceptar Contrato")');

    const acceptanceResponse = await acceptancePromise;
    const acceptanceData = await acceptanceResponse.json();

    // 5. Verify audit trail fields are present
    expect(acceptanceData.renter_ip_address).toBeDefined();
    expect(acceptanceData.renter_user_agent).toBeDefined();
    expect(acceptanceData.renter_device_fingerprint).toBeDefined();
    expect(acceptanceData.accepted_at).toBeDefined();
    expect(acceptanceData.clauses_accepted).toBeDefined();

    // 6. Verify all 4 clauses are true
    expect(acceptanceData.clauses_accepted.culpaGrave).toBe(true);
    expect(acceptanceData.clauses_accepted.indemnidad).toBe(true);
    expect(acceptanceData.clauses_accepted.retencion).toBe(true);
    expect(acceptanceData.clauses_accepted.mora).toBe(true);
  });
});
