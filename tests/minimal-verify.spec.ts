import { test, expect } from '@playwright/test';

test.describe('Verificación Mínima de CarCard', () => {
  test('Debería encontrar el componente app-car-card en la página /cars', async ({ page }) => {
    // 1. Navegar a la lista de autos
    await page.goto('http://localhost:4200/cars', {
      waitUntil: 'networkidle',
    });

    // 2. Esperar que el componente app-car-card aparezca
    const carCardLocator = page.locator('app-car-card').first();
    
    // 3. Assert que el componente es visible
    await expect(carCardLocator).toBeVisible({ timeout: 30000 });
  });
});
