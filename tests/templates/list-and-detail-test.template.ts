import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * TEMPLATE: List and Detail Test
 *
 * Use este template para tests de páginas con lista + detalle:
 * - Lista de items (cars, bookings, users, etc.)
 * - Click en item para ver detalle
 * - Navegación entre lista y detalle
 *
 * INSTRUCCIONES:
 * 1. Reemplazar [PLACEHOLDERS] con valores específicos
 * 2. Definir ItemData interface con campos relevantes
 */

// Definir estructura de datos del item
interface ItemData {
  id: string;
  // TODO: Agregar campos relevantes
  // Ejemplo para cars:
  // title: string;
  // price: number;
  // Ejemplo para bookings:
  // status: string;
  // startDate: string;
}

test.describe('[FEATURE_NAME] - List and Detail', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('[LIST_PAGE_URL]'); // Ej: '/cars', '/my-bookings'
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display list of items', async ({ page }: { page: Page }) => {
    // Esperar a que los items carguen
    await page.waitForTimeout(2000);

    // Buscar items con múltiples estrategias
    const items: Locator = page.locator('[data-[ITEM_TYPE]-id]') // Ej: [data-car-id], [data-booking-id]
      .or(page.locator('app-[ITEM_COMPONENT]')) // Ej: app-car-card, app-booking-card
      .or(page.locator('[ITEM_CLASS_SELECTOR]')); // Ej: .car-card, .booking-item

    // Verificar que hay al menos un item
    const itemCount: number = await items.count();

    if (itemCount === 0) {
      // Verificar si hay mensaje de "sin items"
      const emptyMessage: Locator = page.locator('text=/no hay|sin resultados|no se encontraron/i');
      const hasEmptyMessage: boolean = await emptyMessage.isVisible().catch(() => false);

      if (hasEmptyMessage) {
        // Es válido no tener items, skip el resto del test
        test.skip();
      } else {
        throw new Error('No items found and no empty message displayed');
      }
    }

    expect(itemCount).toBeGreaterThan(0);

    // Verificar que el primer item es visible
    const firstItem: Locator = items.first();
    await expect(firstItem).toBeVisible({ timeout: 5000 });
  });

  test('should display item information in list', async ({ page }: { page: Page }) => {
    await page.waitForTimeout(2000);

    const firstItem: Locator = page.locator('[data-[ITEM_TYPE]-id]').first();
    const itemVisible: boolean = await firstItem.isVisible().catch(() => false);

    if (!itemVisible) {
      test.skip('No items available');
    }

    // Verificar campos visibles en el item
    // TODO: Ajustar según campos específicos del item

    // Ejemplo para car:
    // const title: Locator = firstItem.locator('[TITLE_SELECTOR]');
    // await expect(title).toBeVisible();

    // const price: Locator = firstItem.locator('[PRICE_SELECTOR]');
    // await expect(price).toBeVisible();

    // Ejemplo para booking:
    // const status: Locator = firstItem.locator('[STATUS_SELECTOR]');
    // await expect(status).toBeVisible();
  });

  test('should navigate to item detail on click', async ({ page }: { page: Page }) => {
    await page.waitForTimeout(2000);

    // Obtener primer item
    const firstItem: Locator = page.locator('[data-[ITEM_TYPE]-id]').first();
    const itemVisible: boolean = await firstItem.isVisible().catch(() => false);

    if (!itemVisible) {
      test.skip('No items available');
    }

    // Obtener ID del item
    let itemId: string | null = await firstItem.getAttribute('data-[ITEM_TYPE]-id');

    if (!itemId) {
      // Intentar obtener ID del href
      const link: Locator = firstItem.locator('a').first();
      const href: string | null = await link.getAttribute('href');

      if (href) {
        const match: RegExpMatchArray | null = href.match(/\/[ITEM_TYPE]\/([a-f0-9-]+)/);
        itemId = match ? match[1] : null;
      }
    }

    expect(itemId).toBeTruthy();

    // Click en el item
    await firstItem.click({ timeout: 5000 });

    // Verificar navegación a detalle
    await page.waitForURL(new RegExp(`/[ITEM_TYPE]/${itemId}`), { timeout: 10000 });

    // Verificar que estamos en la página de detalle
    const detailPage: Locator = page.locator('[DETAIL_PAGE_SELECTOR]');
    await expect(detailPage).toBeVisible({ timeout: 5000 });
  });

  test('should display full item details on detail page', async ({ page }: { page: Page }) => {
    // Primero navegar a un item
    await page.waitForTimeout(2000);
    const firstItem: Locator = page.locator('[data-[ITEM_TYPE]-id]').first();

    const itemVisible: boolean = await firstItem.isVisible().catch(() => false);
    if (!itemVisible) {
      test.skip('No items available');
    }

    await firstItem.click();
    await page.waitForURL(/\/[ITEM_TYPE]\/[a-f0-9-]+/, { timeout: 10000 });

    // Verificar elementos de detalle
    // TODO: Ajustar según campos específicos

    // Ejemplo para car:
    // const description: Locator = page.locator('[DESCRIPTION_SELECTOR]');
    // await expect(description).toBeVisible();

    // const features: Locator = page.locator('[FEATURES_SELECTOR]');
    // await expect(features).toBeVisible();

    // const photos: Locator = page.locator('[PHOTOS_SELECTOR]');
    // await expect(photos).toBeVisible();

    // Verificar botones de acción
    const actionButton: Locator = page.getByRole('button', { name: /[ACTION_TEXT]/i });
    await expect(actionButton).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to list from detail', async ({ page }: { page: Page }) => {
    // Navegar a detalle
    await page.waitForTimeout(2000);
    const firstItem: Locator = page.locator('[data-[ITEM_TYPE]-id]').first();

    const itemVisible: boolean = await firstItem.isVisible().catch(() => false);
    if (!itemVisible) {
      test.skip('No items available');
    }

    await firstItem.click();
    await page.waitForURL(/\/[ITEM_TYPE]\/[a-f0-9-]+/, { timeout: 10000 });

    // Encontrar botón "volver" o usar browser back
    const backButton: Locator = page.getByRole('button', { name: /volver|atrás|back/i })
      .or(page.locator('[BACK_BUTTON_SELECTOR]'));

    const backButtonVisible: boolean = await backButton.isVisible().catch(() => false);

    if (backButtonVisible) {
      await backButton.click();
    } else {
      // Usar browser back como fallback
      await page.goBack();
    }

    // Verificar que volvimos a la lista
    await page.waitForURL(/\/[LIST_URL_PATTERN]/, { timeout: 10000 });

    // Verificar que la lista está visible
    const items: Locator = page.locator('[data-[ITEM_TYPE]-id]');
    const itemCount: number = await items.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should filter list by [FILTER_CRITERIA]', async ({ page }: { page: Page }) => {
    // Este test es opcional si hay filtros

    await page.waitForTimeout(2000);

    // Aplicar filtro
    const filterInput: Locator = page.locator('[FILTER_INPUT_SELECTOR]');
    const filterExists: boolean = await filterInput.count() > 0;

    if (!filterExists) {
      test.skip('No filter available');
    }

    await filterInput.fill('[FILTER_VALUE]');
    await page.waitForTimeout(1000); // Esperar a que se aplique el filtro

    // Verificar que la lista se actualiza
    const items: Locator = page.locator('[data-[ITEM_TYPE]-id]');
    const itemCount: number = await items.count();

    // Verificar que todos los items visibles cumplen el filtro
    for (let i = 0; i < Math.min(itemCount, 5); i++) {
      const item: Locator = items.nth(i);
      const itemText: string | null = await item.textContent();

      expect(itemText?.toLowerCase()).toContain('[FILTER_VALUE]'.toLowerCase());
    }
  });

  test('should paginate through list', async ({ page }: { page: Page }) => {
    // Este test es opcional si hay paginación

    await page.waitForTimeout(2000);

    // Verificar si hay paginación
    const nextButton: Locator = page.getByRole('button', { name: /siguiente|next/i })
      .or(page.locator('[NEXT_PAGE_SELECTOR]'));

    const hasNextButton: boolean = await nextButton.isVisible().catch(() => false);

    if (!hasNextButton) {
      test.skip('No pagination available or only one page');
    }

    // Obtener items de la primera página
    const firstPageItems: Locator = page.locator('[data-[ITEM_TYPE]-id]');
    const firstPageCount: number = await firstPageItems.count();

    // Ir a la segunda página
    await nextButton.click();
    await page.waitForTimeout(2000);

    // Verificar que los items cambiaron
    const secondPageItems: Locator = page.locator('[data-[ITEM_TYPE]-id]');
    const secondPageCount: number = await secondPageItems.count();

    expect(secondPageCount).toBeGreaterThan(0);

    // Opcionalmente, verificar que los items son diferentes
    // (esto depende de cómo esté implementada la paginación)
  });

  test('should handle empty list gracefully', async ({ page }: { page: Page }) => {
    // Aplicar un filtro que no devuelva resultados
    const filterInput: Locator = page.locator('[FILTER_INPUT_SELECTOR]');
    const filterExists: boolean = await filterInput.count() > 0;

    if (!filterExists) {
      test.skip('Cannot test empty list without filter');
    }

    await filterInput.fill('[IMPOSSIBLE_FILTER_VALUE]'); // Un valor que no existe
    await page.waitForTimeout(2000);

    // Verificar mensaje de "sin resultados"
    const emptyMessage: Locator = page.locator('text=/no hay|sin resultados|no se encontraron/i');
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });

    // Verificar que no hay items
    const items: Locator = page.locator('[data-[ITEM_TYPE]-id]');
    const itemCount: number = await items.count();
    expect(itemCount).toBe(0);
  });
});
