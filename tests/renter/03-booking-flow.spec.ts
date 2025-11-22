import { expect, test } from '@playwright/test';

test.describe('Renter Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific car page directly (assuming auth setup handles login)
    // Using the ID from seeds.sql
    await page.goto('/cars/e2e-car-economy-000-000000000001');
  });

  test('should complete booking wizard flow', async ({ page }) => {
    // 1. Verify we are on the car detail page
    await expect(page.locator('h1')).toContainText('Toyota Corolla');

    // Click "Reservar" to open wizard
    await page.getByRole('button', { name: 'Reservar' }).click();

    // 2. Step 1: Dates
    await expect(page.locator('app-booking-dates-step')).toBeVisible();
    // Assuming dates are pre-selected or we need to select them
    // For now, let's try to proceed if "Siguiente" is enabled
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 3. Step 2: Insurance
    await expect(page.locator('app-booking-insurance-step')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 4. Step 3: Extras
    await expect(page.locator('app-booking-extras-step')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 5. Step 4: Driver
    await expect(page.locator('app-booking-driver-step')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 6. Step 5: Payment
    await expect(page.locator('app-booking-payment-step')).toBeVisible();
    // Select Wallet payment if available
    const walletOption = page.locator('ion-radio', { hasText: 'Wallet AutoRenta' });
    if (await walletOption.isVisible()) {
      await walletOption.click();
    }
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 7. Step 6: Review
    await expect(page.locator('app-booking-review-step')).toBeVisible();

    // Submit Booking
    await page.getByRole('button', { name: 'Confirmar Reserva' }).click();

    // 8. Verify Success
    // Expect redirection to booking confirmation or list
    await expect(page).toHaveURL(/.*\/bookings\/.*/, { timeout: 15000 });
    await expect(page.locator('text=Reserva confirmada')).toBeVisible();
  });
});
