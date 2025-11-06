import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Payment Flows (PayPal + MercadoPago)
 *
 * Prerequisites:
 * - Test user account configured in Supabase Auth
 * - Test booking created in database
 * - PayPal Sandbox account configured
 * - MercadoPago Test account configured
 */

// Test Configuration
const TEST_USER_EMAIL = 'test@autorentar.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_BOOKING_ID = 'test-booking-123'; // Replace with actual test booking ID

// Helper Functions
async function loginUser(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', TEST_USER_EMAIL);
  await page.fill('input[name="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to home or dashboard
  await page.waitForURL(/\/(home|dashboard|cars)/);
}

async function navigateToCheckout(page: Page, bookingId: string) {
  await page.goto(`/bookings/${bookingId}/checkout`);

  // Wait for page to load
  await expect(page.locator('h1')).toContainText('Completar Pago');
}

// Test Suite
test.describe('Payment Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
  });

  test.describe('PayPal Payment Flow', () => {
    test('should complete payment with PayPal successfully', async ({ page, context }) => {
      // Navigate to checkout
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Verify provider selector is visible
      await expect(page.locator('app-payment-provider-selector')).toBeVisible();

      // Select PayPal as provider
      await page.click('input[value="paypal"]');

      // Verify PayPal button appears
      await expect(page.locator('#paypal-button-container')).toBeVisible();

      // Wait for PayPal SDK to load
      await page.waitForFunction(() => (window as any).paypal !== undefined);

      // Click PayPal button (this will open popup)
      const [paypalPopup] = await Promise.all([
        context.waitForEvent('page'), // Wait for popup
        page.locator('#paypal-button-container iframe').click({ force: true }),
      ]);

      // Handle PayPal Sandbox Login
      await paypalPopup.waitForLoadState();

      // If login page appears
      if (await paypalPopup.locator('#email').isVisible()) {
        await paypalPopup.fill('#email', 'sb-buyer@autorentar.com'); // PayPal Sandbox buyer email
        await paypalPopup.click('#btnNext');
        await paypalPopup.waitForTimeout(1000);
        await paypalPopup.fill('#password', 'SandboxPassword123!');
        await paypalPopup.click('#btnLogin');
      }

      // Wait for payment review page
      await paypalPopup.waitForURL(/.*paypal.*checkoutnow.*/);

      // Click "Complete Purchase" or "Pay Now"
      await paypalPopup.click('button[data-testid="submit-button"]');

      // Wait for payment to complete
      await paypalPopup.waitForURL(/.*paypal.*approved.*/);

      // Close popup (PayPal will redirect parent window)
      await paypalPopup.close();

      // Wait for redirect to confirmation page
      await page.waitForURL(/\/bookings\/.*\/confirmation/);

      // Verify success state
      await expect(page.locator('.checkmark-circle')).toBeVisible();
      await expect(page.locator('.status-title.success')).toContainText('confirmado');

      // Verify payment details
      await expect(page.locator('.details-card')).toContainText('PayPal');
      await expect(page.locator('.status-badge.confirmed')).toBeVisible();

      // Verify payment reference ID is displayed
      await expect(page.locator('.detail-value.code')).not.toBeEmpty();
    });

    test('should handle PayPal payment cancellation', async ({ page, context }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Select PayPal
      await page.click('input[value="paypal"]');

      // Click PayPal button
      const [paypalPopup] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('#paypal-button-container iframe').click({ force: true }),
      ]);

      // Wait for PayPal page to load
      await paypalPopup.waitForLoadState();

      // Click cancel link
      await paypalPopup.click('a:has-text("Cancel")');

      // Should stay on checkout page
      await expect(page.locator('h1')).toContainText('Completar Pago');

      // No error should be displayed (just cancellation)
      await expect(page.locator('.error-container')).not.toBeVisible();
    });

    test('should handle PayPal payment error', async ({ page }) => {
      // Mock PayPal SDK to return error
      await page.addInitScript(() => {
        (window as any).paypal = {
          Buttons: (config: any) => ({
            render: async (selector: string) => {
              // Simulate error
              config.onError(new Error('PayPal payment failed'));
            },
          }),
        };
      });

      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Select PayPal
      await page.click('input[value="paypal"]');

      // Wait for error to appear
      await expect(page.locator('.error-container')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('PayPal');
    });
  });

  test.describe('MercadoPago Payment Flow', () => {
    test('should redirect to MercadoPago checkout', async ({ page, context }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Verify MercadoPago is selected by default
      await expect(page.locator('input[value="mercadopago"]')).toBeChecked();

      // Click "Pagar con MercadoPago" button
      const [mercadopagoPage] = await Promise.all([
        context.waitForEvent('page'), // Wait for new tab
        page.click('button.mercadopago-btn'),
      ]);

      // Verify redirected to MercadoPago
      await mercadopagoPage.waitForURL(/.*mercadopago\.com.*/);
      await expect(mercadopagoPage.url()).toContain('mercadopago.com');
    });

    test('should handle MercadoPago preference creation error', async ({ page }) => {
      // Mock API to return error
      await page.route('**/functions/v1/mercadopago-create-booking-preference', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Failed to create preference' }),
        });
      });

      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Click MercadoPago button
      await page.click('button.mercadopago-btn');

      // Wait for error
      await expect(page.locator('.error-container')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('MercadoPago');
    });
  });

  test.describe('Provider Selector', () => {
    test('should switch between providers correctly', async ({ page }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Verify initial state (MercadoPago)
      await expect(page.locator('input[value="mercadopago"]')).toBeChecked();
      await expect(page.locator('.mercadopago-btn')).toBeVisible();
      await expect(page.locator('#paypal-button-container')).not.toBeVisible();

      // Switch to PayPal
      await page.click('input[value="paypal"]');

      // Verify PayPal state
      await expect(page.locator('input[value="paypal"]')).toBeChecked();
      await expect(page.locator('#paypal-button-container')).toBeVisible();
      await expect(page.locator('.mercadopago-btn')).not.toBeVisible();

      // Verify currency conversion is shown
      await expect(page.locator('.amount-value')).toContainText('USD');

      // Switch back to MercadoPago
      await page.click('input[value="mercadopago"]');

      // Verify MercadoPago state
      await expect(page.locator('input[value="mercadopago"]')).toBeChecked();
      await expect(page.locator('.mercadopago-btn')).toBeVisible();
      await expect(page.locator('#paypal-button-container')).not.toBeVisible();
      await expect(page.locator('.amount-value')).toContainText('ARS');
    });

    test('should display correct currency for each provider', async ({ page }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // MercadoPago: ARS
      await page.click('input[value="mercadopago"]');
      await expect(page.locator('.amount-display')).toContainText('ARS');

      // PayPal: USD
      await page.click('input[value="paypal"]');
      await expect(page.locator('.amount-display')).toContainText('USD');
    });

    test('should show exchange rate information', async ({ page }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Verify exchange rate is displayed
      await expect(page.locator('.info-banner')).toContainText('Tipo de cambio');

      // Verify rate is numeric
      const rateText = await page.locator('.info-banner').textContent();
      expect(rateText).toMatch(/1 USD = [\d,.]+ ARS/);
    });
  });

  test.describe('Confirmation Page', () => {
    test('should display success confirmation for PayPal payment', async ({ page }) => {
      // Navigate directly to confirmation (after payment)
      await page.goto(`/bookings/${TEST_BOOKING_ID}/confirmation?provider=paypal&orderId=ORDER123&captureId=CAPTURE456`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Verify success state
      await expect(page.locator('.status-title.success')).toBeVisible();
      await expect(page.locator('.checkmark-circle')).toBeVisible();

      // Verify booking details
      await expect(page.locator('.details-card')).toContainText('PayPal');
      await expect(page.locator('.details-card')).toContainText('ORDER123');

      // Verify action buttons
      await expect(page.locator('button:has-text("Ver Detalles")')).toBeVisible();
      await expect(page.locator('button:has-text("Descargar Recibo")')).toBeVisible();
    });

    test('should display pending confirmation correctly', async ({ page }) => {
      await page.goto(`/bookings/${TEST_BOOKING_ID}/confirmation?provider=paypal&orderId=ORDER123`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Verify pending state
      await expect(page.locator('.status-title.pending')).toBeVisible();
      await expect(page.locator('.pending-icon')).toBeVisible();

      // Verify "Actualizar Estado" button
      await expect(page.locator('button:has-text("Actualizar Estado")')).toBeVisible();
    });

    test('should poll for booking status update', async ({ page }) => {
      // Mock API to return pending initially, then confirmed
      let callCount = 0;
      await page.route('**/bookings/*/details', (route) => {
        callCount++;
        if (callCount === 1) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ status: 'pending', id: TEST_BOOKING_ID }),
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ status: 'confirmed', id: TEST_BOOKING_ID }),
          });
        }
      });

      await page.goto(`/bookings/${TEST_BOOKING_ID}/confirmation?provider=paypal&orderId=ORDER123`);

      // Initially pending
      await expect(page.locator('.status-title.pending')).toBeVisible();

      // Wait for polling to update status (max 30 seconds)
      await expect(page.locator('.status-title.success')).toBeVisible({ timeout: 35000 });
    });

    test('should download receipt successfully', async ({ page }) => {
      await page.goto(`/bookings/${TEST_BOOKING_ID}/confirmation?provider=paypal&orderId=ORDER123&captureId=CAPTURE456`);

      // Wait for success state
      await expect(page.locator('.status-title.success')).toBeVisible();

      // Start download listening
      const downloadPromise = page.waitForEvent('download');

      // Click download button
      await page.click('button:has-text("Descargar Recibo")');

      // Wait for download
      const download = await downloadPromise;

      // Verify filename
      expect(download.suggestedFilename()).toContain('recibo-');
      expect(download.suggestedFilename()).toContain('.html');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle booking not found', async ({ page }) => {
      await page.goto('/bookings/nonexistent-booking/checkout');

      // Should show error
      await expect(page.locator('.error-container')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('no encontrado');
    });

    test('should handle booking in wrong status', async ({ page }) => {
      // Assuming there's a booking with status 'confirmed' already
      const confirmedBookingId = 'confirmed-booking-123';
      await page.goto(`/bookings/${confirmedBookingId}/checkout`);

      // Should show error
      await expect(page.locator('.error-container')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('confirmed');
    });

    test('should disable payment button when loading', async ({ page }) => {
      await navigateToCheckout(page, TEST_BOOKING_ID);

      // Mock slow API
      await page.route('**/functions/v1/mercadopago-create-booking-preference', async (route) => {
        await page.waitForTimeout(2000);
        route.continue();
      });

      // Click payment button
      await page.click('button.mercadopago-btn');

      // Verify button is disabled during loading
      await expect(page.locator('button.mercadopago-btn')).toBeDisabled();

      // Verify loading text
      await expect(page.locator('button.mercadopago-btn')).toContainText('Procesando');
    });
  });
});
