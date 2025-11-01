
import { test, expect } from '@playwright/test';

test('queue on 400 and resend when back online', async ({ page }) => {
  await page.route('**/rest/v1/messages', route => {
    // primera vez: 400 simulando columna desconocida
    if (!route.request().headers()['x-once']) {
      return route.fulfill({ status: 400, body: JSON.stringify({ code: '42703', message: 'column "full_name" does not exist' }) });
    }
    return route.continue();
  });

  await page.goto('/chat/conv/123');
  await page.getByPlaceholder('Escribe un mensaje').fill('hola');
  await page.getByRole('button', { name: 'Enviar' }).click();

  // UI marca "pendiente/offline"
  await expect(page.getByText(/pendiente/i)).toBeVisible();

  // ahora “vuelve online” (quitamos el fallo y marcamos header x-once)
  await page.route('**/rest/v1/messages', route => {
    const headers = { ...route.request().headers(), 'x-once': '1' };
    route.continue({ headers });
  });

  // dispara reintento (tu app: al reconectar o botón “reenviar”)
  await page.getByRole('button', { name: /reenviar/i }).click();

  // UI muestra enviado
  await expect(page.getByText(/enviado/i)).toBeVisible();
});
