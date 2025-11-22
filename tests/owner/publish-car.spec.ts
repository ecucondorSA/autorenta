import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { PublishCarPage } from '../pages/cars/PublishCarPage';

const OWNER_CREDENTIALS = {
  email: 'test-owner@autorenta.com',
  password: 'TestPassword123!',
};

async function ensureOwnerAuthenticated(page: Page) {
  const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]');
  if (await profileLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }

  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: /email|correo/i }).fill(OWNER_CREDENTIALS.email);
  await page.getByRole('textbox', { name: /contraseña|password/i }).fill(OWNER_CREDENTIALS.password);
  await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
  await page.waitForURL(/(cars|dashboard|profile)/, { timeout: 15000 });
}

test.describe('Car Publication Flow', () => {
  let publishPage: PublishCarPage;

  test.beforeEach(async ({ page }) => {
    await ensureOwnerAuthenticated(page);
    publishPage = new PublishCarPage(page);
  });

  test('Owner can publish a new car (happy path)', async ({ page }) => {
    await publishPage.goto();

    // Marca / modelo vía FIPE autocomplete
    await publishPage.selectBrand('Toyota');
    await publishPage.selectModel('Corolla');
    await publishPage.fillYear(new Date().getFullYear());

    await publishPage.fillVehicleDetails({
      mileage: 15000,
      color: 'Blanco',
      transmission: 'Automática',
      fuel: 'nafta',
    });

    await publishPage.configurePricing(150);

    await publishPage.fillLocation({
      street: 'Av. Corrientes',
      number: '1234',
      city: 'Buenos Aires',
      state: 'Buenos Aires',
      country: 'AR',
    });

    const photos = [
      path.join(__dirname, '../fixtures/images/porsche-front.jpg'),
      path.join(__dirname, '../fixtures/images/porsche-side.jpg'),
      path.join(__dirname, '../fixtures/images/porsche-interior.jpg'),
    ];
    await publishPage.uploadPhotos(photos);

    await publishPage.submit();
    await publishPage.assertRedirectedToMyCars();
  });
});
