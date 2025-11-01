
import { test, expect } from '@playwright/test';
import { version } from '../../package.json';

test.describe('Visual Regression Testing', () => {
  test('Wallet page should match the snapshot', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page).toHaveScreenshot(`wallet-page-v${version}.png`);
  });

  test('Checkout page should match the snapshot', async ({ page }) => {
    // This will likely require some setup to get to the checkout page
    // For example, adding an item to the cart first.
    // For this example, we will just navigate to the page directly.
    await page.goto('/checkout');
    await expect(page).toHaveScreenshot(`checkout-page-v${version}.png`);
  });
});
