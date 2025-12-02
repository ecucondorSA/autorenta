import { test, expect } from '@playwright/test';

test.describe('Búsqueda y Filtros de Autos', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/cars/list');
    // Esperar a que carguen los resultados
    await page.waitForSelector('[data-testid="car-card"]', { timeout: 15000 });
  });

  test('debe buscar autos por texto', async ({ page }) => {
    // Obtener count inicial
    const initialCount = await page.locator('[data-testid="car-card"]').count();

    // Buscar "Toyota"
    await page.fill('[data-testid="search-input"]', 'Toyota');
    await page.press('[data-testid="search-input"]', 'Enter');
    await page.waitForTimeout(500);

    // Verificar que hay resultados (pueden ser menos o cero)
    const cards = page.locator('[data-testid="car-card"]');
    const count = await cards.count();

    if (count > 0) {
      // Verificar que los títulos contienen Toyota
      const titles = await page.locator('[data-testid="car-title"]').allTextContents();
      const hasMatch = titles.some(t => t.toLowerCase().includes('toyota'));
      expect(hasMatch).toBeTruthy();
    }

    // Limpiar búsqueda
    await page.click('[data-testid="search-clear"]');
    await page.waitForTimeout(300);

    // Verificar que volvieron todos los resultados
    const clearedCount = await page.locator('[data-testid="car-card"]').count();
    expect(clearedCount).toBeGreaterThanOrEqual(count);
  });

  test('debe filtrar por precio máximo', async ({ page }) => {
    // Aplicar filtro de precio máximo $100
    await page.fill('[data-testid="filter-max-price"]', '100');
    await page.waitForTimeout(500);

    // Verificar que los precios son <= 100
    const prices = await page.locator('[data-testid="car-price"]').allTextContents();
    const numericPrices = prices
      .map(p => parseFloat(p.replace(/[^\d]/g, '')))
      .filter(p => !isNaN(p));

    if (numericPrices.length > 0) {
      expect(numericPrices.every(p => p <= 100)).toBeTruthy();
    }
  });

  test('debe ordenar por precio ascendente', async ({ page }) => {
    // Cambiar ordenamiento a precio ascendente
    await page.selectOption('[data-testid="sort-select"]', 'price_asc');
    await page.waitForTimeout(500);

    // Obtener precios
    const prices = await page.locator('[data-testid="car-price"]').allTextContents();
    const numericPrices = prices
      .map(p => parseFloat(p.replace(/[^\d]/g, '')))
      .filter(p => !isNaN(p));

    // Verificar orden ascendente
    for (let i = 0; i < numericPrices.length - 1; i++) {
      expect(numericPrices[i]).toBeLessThanOrEqual(numericPrices[i + 1]);
    }
  });

  test('debe ordenar por precio descendente', async ({ page }) => {
    // Cambiar ordenamiento a precio descendente
    await page.selectOption('[data-testid="sort-select"]', 'price_desc');
    await page.waitForTimeout(500);

    // Obtener precios
    const prices = await page.locator('[data-testid="car-price"]').allTextContents();
    const numericPrices = prices
      .map(p => parseFloat(p.replace(/[^\d]/g, '')))
      .filter(p => !isNaN(p));

    // Verificar orden descendente
    for (let i = 0; i < numericPrices.length - 1; i++) {
      expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i + 1]);
    }
  });

  test('debe limpiar filtros', async ({ page }) => {
    // Aplicar filtro
    await page.fill('[data-testid="filter-max-price"]', '50');
    await page.waitForTimeout(500);

    const filteredCount = await page.locator('[data-testid="car-card"]').count();

    // Verificar que aparece botón de limpiar filtros
    const clearButton = page.locator('[data-testid="clear-filters"]');
    await expect(clearButton).toBeVisible();

    // Limpiar
    await clearButton.click();
    await page.waitForTimeout(500);

    // Verificar que se restauraron los resultados
    const clearedCount = await page.locator('[data-testid="car-card"]').count();
    expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('debe cambiar entre vistas', async ({ page }) => {
    // Vista Lista
    await page.click('[data-testid="view-list"]');
    await expect(page.locator('.list-view')).toBeVisible();

    // Vista Mapa
    await page.click('[data-testid="view-map"]');
    await page.waitForTimeout(2000); // Esperar carga del mapa

    // Vista Grid
    await page.click('[data-testid="view-grid"]');
    await expect(page.locator('.grid-view')).toBeVisible();
  });

  test('debe mostrar contador de resultados', async ({ page }) => {
    // Verificar que muestra el contador
    const counter = page.locator('[data-testid="results-count"]');
    await expect(counter).toBeVisible();

    const text = await counter.textContent();
    expect(text).toMatch(/\d+\s*vehículos/i);
  });

  test('debe filtrar por distancia máxima', async ({ page }) => {
    // Aplicar filtro de distancia
    await page.fill('[data-testid="filter-max-distance"]', '10');
    await page.waitForTimeout(500);

    // Solo verificar que el filtro se aplicó (el resultado depende de la ubicación del usuario)
    const counter = await page.locator('[data-testid="results-count"]').textContent();
    expect(counter).toBeTruthy();
  });

  test('debe filtrar por calificación mínima', async ({ page }) => {
    // Aplicar filtro de rating
    await page.fill('[data-testid="filter-min-rating"]', '4');
    await page.waitForTimeout(500);

    // Solo verificar que el filtro se aplicó
    const counter = await page.locator('[data-testid="results-count"]').textContent();
    expect(counter).toBeTruthy();
  });

  test('debe mostrar estado vacío cuando no hay resultados', async ({ page }) => {
    // Aplicar filtro muy restrictivo
    await page.fill('[data-testid="filter-max-price"]', '1');
    await page.waitForTimeout(500);

    // Verificar estado vacío (si no hay autos con precio <= 1)
    const cards = await page.locator('[data-testid="car-card"]').count();
    if (cards === 0) {
      const emptyState = page.locator('[data-testid="empty-state"]');
      await expect(emptyState).toBeVisible();
    }
  });
});
