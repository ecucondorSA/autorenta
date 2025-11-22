import { test, expect, Page } from '@playwright/test';
import { SEED_USERS } from '../helpers/test-data';

const FALLBACK_RENTER = {
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!',
};

async function ensureAuth(page: Page): Promise<void> {
  const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]');
  if (await profileLink.first().isVisible({ timeout: 1500 }).catch(() => false)) return;

  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  await page
    .getByRole('textbox', { name: /email|correo/i })
    .fill(SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email);
  await page
    .getByRole('textbox', { name: /contraseña|password/i })
    .fill(SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password);

  await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
  await page.waitForURL(/(cars|wallet|profile|bookings)/, { timeout: 15000 });
}

test.describe('Booking smoke', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page);
  });

  test('renter can open a car detail and sees reserve CTA', async ({ page }) => {
    await page.goto('/cars');
    await page.waitForLoadState('domcontentloaded');

    const carCard = page.locator('[data-car-id], app-car-card, [data-testid="car-card"]').first();
    await expect(carCard).toBeVisible({ timeout: 20000 });

    await carCard.click();
    await page.waitForURL(/\/cars\/.+/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');

    const reserveButton = page.getByRole('button', { name: /reservar|solicitar|booking|confirmar/i }).first();
    await expect(reserveButton).toBeVisible({ timeout: 10000 });
  });
});
