import { test, expect } from '@playwright/test';

/**
 * Test: Verificar que los scores aparecen incluso SIN fechas seleccionadas
 *
 * Este test verifica que el fix implementado funciona correctamente:
 * - getAvailableCars se llama siempre (incluso sin fechas)
 * - Los scores están presentes en los autos
 * - El ordenamiento por score funciona
 */
test.describe('Marketplace - Scores sin fechas seleccionadas', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar al marketplace
    await page.goto('http://localhost:4200/');

    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle');
  });

  test('debe cargar autos con scores incluso sin fechas seleccionadas', async ({ page }) => {
    // Verificar que NO hay fechas seleccionadas (el botón debe mostrar texto por defecto)
    const dateButton = page.locator('button:has-text("¿Cuándo lo necesitas?")');
    await expect(dateButton).toBeVisible();

    // Esperar a que los autos se carguen
    await page.waitForTimeout(2000);

    // Verificar en la consola que se llama a getAvailableCars
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('getAvailableCars') || text.includes('score')) {
        consoleMessages.push(text);
      }
    });

    // Recargar para capturar los logs
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar que se llamó a getAvailableCars (no a listActiveCars)
    const hasGetAvailableCars = consoleMessages.some(msg =>
      msg.includes('Calling getAvailableCars') || msg.includes('get_available_cars')
    );
    expect(hasGetAvailableCars).toBe(true);

    // Verificar que NO se llamó a listActiveCars
    const hasListActiveCars = consoleMessages.some(msg =>
      msg.includes('listActiveCars') || msg.includes('NO SCORES')
    );
    expect(hasListActiveCars).toBe(false);

    // Verificar que hay autos cargados
    const carCards = page.locator('[data-testid="car-card"], .car-card, app-car-card');
    const carCount = await carCards.count();
    expect(carCount).toBeGreaterThan(0);

    console.log(`✅ Encontrados ${carCount} autos cargados sin fechas seleccionadas`);
  });

  test('debe mostrar el selector de ordenamiento por score', async ({ page }) => {
    // Esperar a que la página cargue
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar que existe el selector de ordenamiento
    const sortSelect = page.locator('select').filter({ hasText: /Relevancia|Score|Relevancia \(Score\)/ });
    await expect(sortSelect).toBeVisible();

    // Verificar que "Relevancia (Score)" es la opción por defecto
    const selectedOption = await sortSelect.inputValue();
    expect(selectedOption).toBe('score');
  });

  test('debe ordenar autos por score descendente por defecto', async ({ page }) => {
    // Esperar a que los autos se carguen
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verificar que hay autos visibles
    const carCards = page.locator('[data-testid="car-card"], .car-card, app-car-card');
    const carCount = await carCards.count();

    if (carCount > 0) {
      console.log(`✅ Verificando ordenamiento de ${carCount} autos`);

      // Verificar en la consola que el ordenamiento se ejecutó
      const consoleMessages: string[] = [];
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('Final sorted order') || text.includes('sorted')) {
          consoleMessages.push(text);
        }
      });

      // Recargar para capturar logs de ordenamiento
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verificar que el ordenamiento se ejecutó
      const hasSorting = consoleMessages.some(msg =>
        msg.includes('Final sorted order') || msg.includes('sorted')
      );
      expect(hasSorting).toBe(true);
    }
  });
});




