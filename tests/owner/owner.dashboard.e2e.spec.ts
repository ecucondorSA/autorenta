import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { runOwnerSeed } from '../helpers/seed';

// Auth persistente via storageState SI existe (generado por tests/global-setup.ts)
// Si no existe, el test hace login manual en beforeEach
const ownerAuthFile = 'tests/.auth/owner.json';
const hasOwnerAuth = existsSync(ownerAuthFile);

if (hasOwnerAuth) {
  test.use({ storageState: ownerAuthFile });
}

test.describe('Owner dashboard (smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Seed datos del owner (idempotente)
    await runOwnerSeed();

    // Si no hay storageState, hacer login manual
    if (!hasOwnerAuth) {
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', 'owner.dashboard@example.com');
      await page.fill('input[type="password"]', 'TestOwnerDashboard123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\//, { timeout: 15000 });
    }
  });

  test('shows statistics and payouts widgets', async ({ page }) => {
    await page.goto('/dashboard');

    // Basic smoke assertions on placeholder content
    await expect(page.locator('h1')).toHaveText(/Dashboard/i);
    await expect(page.locator('text=Estadísticas')).toBeVisible();
    await expect(page.locator('text=Ganancias y Payouts')).toBeVisible();
  });
});
