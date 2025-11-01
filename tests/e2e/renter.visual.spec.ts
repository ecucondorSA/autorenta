
import { test, expect } from '@playwright/test';

test('receipt view unchanged', async ({ page }) => {
  await page.goto('/bookings/7a6e1b15-2b78-4f8c-a78f-4d6f8a5f9e00/receipt'); // reemplazar
  await expect(page).toHaveScreenshot('receipt.png');
});
