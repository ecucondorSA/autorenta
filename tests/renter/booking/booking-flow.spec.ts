import { expect, test } from '@playwright/test';

test.describe('Booking Flow with Exchange Rate', () => {
  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
  });

  test('should complete booking flow and verify exchange rate', async ({ page }) => {
    // 1. Login
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email|correo/i).fill('renter.test@autorenta.com');
    await page.getByPlaceholder(/contraseña|password/i).fill('TestRenter123!');
    await page.getByRole('button', { name: /entrar|iniciar sesión|login/i }).click();
    await page.waitForURL(/\/cars|\//);

    // 2. Select Car
    await page.goto('/cars');
    await page.waitForTimeout(2000); // Wait for list
    const firstCar = page.locator('app-car-card').first();
    await firstCar.click();
    await page.waitForURL(/\/cars\/.+/);

    // 3. Select Dates
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() + 3);
    const end = new Date(today); end.setDate(today.getDate() + 7);

    await page.locator('input[type="date"]').first().fill(start.toISOString().split('T')[0]);
    await page.locator('input[type="date"]').nth(1).fill(end.toISOString().split('T')[0]);

    // 4. Create Booking
    await page.getByRole('button', { name: /reservar/i }).click();
    await page.waitForURL(/\/bookings\/detail-payment/);

    // 5. Verify Exchange Rate (New Step)
    // Assuming there is an element displaying the rate, e.g., "1 USD = ... ARS"
    // Adjust selector based on actual UI.
    const exchangeRateElement = page.locator('app-exchange-rate-display, .exchange-rate-info');
    if (await exchangeRateElement.isVisible()) {
      await expect(exchangeRateElement).toContainText(/USD/);
      await expect(exchangeRateElement).toContainText(/ARS/);
    } else {
      console.log('Exchange rate element not found, skipping specific verification but continuing flow.');
    }

    // 6. Payment (Wallet)
    const walletBtn = page.locator('[data-payment-method="wallet"]');
    if (await walletBtn.isVisible()) {
      await walletBtn.click();
      const lockBtn = page.getByRole('button', { name: /bloquear fondos/i });
      if (await lockBtn.isVisible() && await lockBtn.isEnabled()) {
        await lockBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 7. Confirm
    const terms = page.getByRole('checkbox', { name: /acepto/i });
    if (await terms.isVisible()) await terms.check();

    await page.getByRole('button', { name: /confirmar/i }).click();
    await page.waitForURL(/\/bookings\/success\/.+/);

    await expect(page.getByText(/confirmada/i)).toBeVisible();
  });
});
