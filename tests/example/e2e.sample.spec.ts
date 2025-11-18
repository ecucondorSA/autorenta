import { expect, test } from '@playwright/test';

test.describe('Example smoke test - AutoRenta', () => {
  test('home page loads and search basic flow', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'http://localhost:4200');

    // Esperar a que el header sea visible
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 10_000 });

    // Ejemplo de interacción: buscar por ubicación
    const searchInput = page.locator('[data-e2e="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Buenos Aires');

    const searchButton = page.locator('[data-e2e="search-button"]');
    await searchButton.click();

    // Comprobar que resultados aparecen
    const results = page.locator('[data-e2e="search-result"]');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
    // Verificar que hay al menos un resultado
    const count = await results.count();
    await expect(count).toBeGreaterThan(0);
  });
});
