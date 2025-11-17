import { expect, test } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Renter booking happy path', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should search, book and complete booking flow', async ({ page }) => {
    // Buscar vehículo
    await page.fill('#search-location', 'CABA');
    await page.fill('#search-start', '2025-12-01');
    await page.fill('#search-end', '2025-12-05');
    await page.click('button:has-text("Buscar")');

    // Abrir primero resultado
    await expect(page.locator('.car-card').first()).toBeVisible();
    await page.click('.car-card >> text=Ver detalles');

    // Seleccionar fechas y reservar
    await page.click('button:has-text("Reservar")');

    // Seleccionar método de pago (wallet o tarjeta)
    const walletBtn = page.locator('button:has-text("Pagar con Wallet")');
    if (await walletBtn.count() && await walletBtn.isVisible()) {
      await walletBtn.click();
    } else {
      await page.click('button:has-text("Pagar con tarjeta")');
      // Rellenar datos mock (si existe el formulario)
      if (await page.locator('#card-number').count()) {
        await page.fill('#card-number', '4111 1111 1111 1111');
        await page.fill('#card-exp', '12/30');
        await page.fill('#card-cvc', '123');
        await page.click('button:has-text("Pagar")');
      }
    }

    // Confirmación
    await expect(page.locator('text=Reserva confirmada')).toBeVisible();
    const confirmation = await page.textContent('.booking-id');
    expect(confirmation).toMatch(/BK-\d+/);

    // Check-in
    await page.click('a:has-text("Mis reservas")');
    await page.click(`.booking-row:has-text("${confirmation}") >> button:has-text("Check-in")`);
    await expect(page.locator('.status')).toHaveText(/En progreso|en progreso/i);

    // Check-out
    await page.click(`.booking-row:has-text("${confirmation}") >> button:has-text("Check-out")`);
    await expect(page.locator('.status')).toHaveText(/Completad|Completado|completado/i);

    // Crear reseña
    await page.click(`.booking-row:has-text("${confirmation}") >> button:has-text("Reseña")`);
    await page.fill('#review-text', 'Buen auto, todo OK');
    await page.click('button:has-text("Enviar reseña")');
    await expect(page.locator('text=Gracias por tu reseña')).toBeVisible();
  });
});
