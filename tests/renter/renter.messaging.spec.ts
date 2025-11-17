import { expect, test } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Renter messaging with owner', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open conversation and send message to owner', async ({ page }) => {
    // Navegar a detalle de un vehículo (primer resultado)
    await page.fill('#search-location', 'CABA');
    await page.fill('#search-start', '2025-12-01');
    await page.fill('#search-end', '2025-12-05');
    await page.click('button:has-text("Buscar")');
    await page.click('.car-card >> text=Ver detalles');

    // Abrir chat desde detalle
    await page.click('button:has-text("Contactar al propietario")');
    await expect(page.locator('.chat-window')).toBeVisible();

    // Enviar mensaje y comprobar que aparece en la conversación
    const message = 'Hola, estoy interesado en este auto. ¿Está disponible?';
    await page.fill('.chat-input textarea', message);
    await page.click('.chat-send-button');
    await expect(page.locator('.chat-window >> text=' + message)).toBeVisible();
  });
});
