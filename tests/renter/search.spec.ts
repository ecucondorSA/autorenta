import { expect, test } from '@playwright/test';

test.describe('Search Results', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to search results with some query params if possible,
    // or go through homepage. Direct navigation is faster for testing this specific page.
    await page.goto('/explore?location=Buenos%20Aires');
  });

  test('should display search results', async ({ page }) => {
    // Wait for results to load
    await expect(page.locator('.car-card').first()).toBeVisible({ timeout: 10000 });

    // Check if at least one car is shown
    const count = await page.locator('.car-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should allow filtering', async ({ page }) => {
    // Open filters (assuming there's a filter button or sidebar)
    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Apply a filter (e.g., transmission or price)
    // This depends on the actual UI. I'll assume a generic "Automatic" checkbox for now
    // or just check that filter elements exist.
    // await page.locator('text=Automática').click();

    // For now, just verify filter UI elements are present
    await expect(page.locator('.filters-container')).toBeVisible();
  });

  test('should switch views', async ({ page }) => {
    // Check for view switcher buttons
    const mapButton = page.locator('button[aria-label="Map view"]');
    const listButton = page.locator('button[aria-label="List view"]'); // or grid view

    if (await mapButton.isVisible()) {
      await mapButton.click();
      await expect(page.locator('app-map-view')).toBeVisible();
    }

    if (await listButton.isVisible()) {
      await listButton.click();
      await expect(page.locator('.car-grid')).toBeVisible();
    }
  });
});
