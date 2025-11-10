import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * TEMPLATE: Basic Page Test
 *
 * Use este template para tests simples que verifican:
 * - Que una página carga correctamente
 * - Que elementos básicos están presentes
 * - Navegación simple
 *
 * INSTRUCCIONES:
 * 1. Copiar este archivo a tu carpeta de tests
 * 2. Renombrar el archivo (ej: homepage.spec.ts)
 * 3. Reemplazar [PLACEHOLDERS] con valores reales
 * 4. Eliminar comentarios de ejemplo
 */

test.describe('[FEATURE_NAME] - Basic Tests', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Navegar a la página bajo test
    await page.goto('[YOUR_ROUTE]'); // Ej: '/cars', '/profile', etc.

    // Esperar a que la página cargue
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load page successfully', async ({ page }: { page: Page }) => {
    // Verificar que estamos en la URL correcta
    await expect(page).toHaveURL(/[URL_PATTERN]/); // Ej: /\/cars/, /\/profile/

    // Verificar que el elemento principal está visible
    const mainElement: Locator = page.locator('[MAIN_ELEMENT_SELECTOR]'); // Ej: '#main-content', '.page-container'
    await expect(mainElement).toBeVisible({ timeout: 5000 });
  });

  test('should display required elements', async ({ page }: { page: Page }) => {
    // Verificar elemento 1
    const element1: Locator = page.locator('[ELEMENT_1_SELECTOR]');
    await expect(element1).toBeVisible({ timeout: 5000 });

    // Verificar elemento 2
    const element2: Locator = page.getByRole('button', { name: /[BUTTON_TEXT]/i });
    await expect(element2).toBeVisible({ timeout: 5000 });

    // Verificar texto específico
    const heading: Locator = page.getByRole('heading', { name: /[HEADING_TEXT]/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to [TARGET_PAGE]', async ({ page }: { page: Page }) => {
    // Encontrar el link/botón de navegación con múltiples estrategias
    const navLink: Locator = page.getByRole('link', { name: /[LINK_TEXT]/i })
      .or(page.locator('[LINK_SELECTOR]'))
      .first();

    // Verificar que está visible
    await expect(navLink).toBeVisible({ timeout: 5000 });

    // Click y esperar navegación
    await navLink.click();
    await page.waitForURL(/[TARGET_URL_PATTERN]/, { timeout: 10000 });

    // Verificar que llegamos a la página correcta
    expect(page.url()).toContain('[TARGET_URL_SUBSTRING]');
  });

  test('should be responsive on mobile', async ({ page }: { page: Page }) => {
    // Cambiar a viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Re-navegar para que tome efecto
    await page.goto('[YOUR_ROUTE]');

    // Verificar que elementos críticos siguen visibles
    const criticalElement: Locator = page.locator('[CRITICAL_ELEMENT_SELECTOR]');
    await expect(criticalElement).toBeVisible({ timeout: 5000 });
  });
});
