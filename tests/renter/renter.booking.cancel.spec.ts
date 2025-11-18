import { expect, test } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Renter booking cancellation flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show error when booking conflicts with existing reservation', async ({ page }) => {
    // Este test asume que existe una reserva previa creada por fixtures/seed
    await page.fill('#search-location', 'CABA');
    await page.fill('#search-start', '2025-12-02');
    await page.fill('#search-end', '2025-12-04');
    await page.click('button:has-text("Buscar")');

    // Intentar reservar y esperar error de conflicto
    await page.click('.car-card >> text=Ver detalles');
    await page.click('button:has-text("Reservar")');
    await expect(page.locator('text=Fechas no disponibles')).toBeVisible();
  });
});
