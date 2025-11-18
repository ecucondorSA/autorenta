import { expect, test } from '@playwright/test';
import { runOwnerSeed } from '../helpers/seed';

test.describe('Owner dashboard (smoke)', () => {
  test.beforeEach(async () => {
    // Attempt to seed test data (if endpoint configured)
    await runOwnerSeed();
  });

  test('shows statistics and payouts widgets', async ({ page }) => {
    // Adjust baseURL or run dev server as documented before running tests
    await page.goto('/dashboard');

    // Basic smoke assertions on placeholder content
    await expect(page.locator('h1')).toHaveText(/Dashboard/i);
    await expect(page.locator('text=Estadísticas')).toBeVisible();
    await expect(page.locator('text=Ganancias y Payouts')).toBeVisible();
  });
});
