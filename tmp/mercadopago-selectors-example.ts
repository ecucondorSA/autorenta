// Ejemplo de uso de selectores en Playwright
import { test, expect } from '@playwright/test';

test('MercadoPago CardForm selectors', async ({ page }) => {
  // Navegar a checkout
  await page.goto('/bookings/:bookingId/checkout');

  // Esperar a que aparezca el CardForm
  await page.locator('app-mercadopago-card-form').waitFor();

  // Verificar que el formulario esté visible
  await expect(page.locator('form#form-checkout')).toBeVisible();

  // Los campos de tarjeta son iframes, usar locator directamente
  const cardNumber = page.locator('#form-checkout__cardNumber');
  const expirationDate = page.locator('#form-checkout__expirationDate');
  const securityCode = page.locator('#form-checkout__securityCode');

  // Campos de texto normales
  await page.fill('#form-checkout__cardholderName', 'NOMBRE APELLIDO');
  await page.selectOption('#form-checkout__identificationType', 'DNI');
  await page.fill('#form-checkout__identificationNumber', '12345678');

  // Botón de envío
  await page.click('form#form-checkout button[type="submit"]');
});