import { expect, test } from '@playwright/test';

test.describe('Search Results', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to search results with some query params if possible,
    // or go through homepage. Direct navigation is faster for testing this specific page.
    await page.goto('/explore?location=Buenos%20Aires');
  });

  test('should display search results', async ({ page }) => {
    // Wait for results to load - check for grid items or list items
    // Using a more generic selector that matches the car cards in grid view
    await expect(page.locator('.grid > div.group').first()).toBeVisible({ timeout: 10000 });

    // Check if at least one car is shown
    const count = await page.locator('.grid > div.group').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should allow filtering', async ({ page }) => {
    // Verify search input exists
    const searchInput = page.getByPlaceholder('Buscar por marca, modelo o ciudad...');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('Toyota');

    // Verify URL or results update (depending on implementation)
    // For now just verifying the input works
    await expect(searchInput).toHaveValue('Toyota');
  });

  test('should switch views', async ({ page }) => {
    // Check for view switcher buttons
    const mapButton = page.getByTitle('Vista Mapa');
    const gridButton = page.getByTitle('Vista Cuadrícula');
    const listButton = page.getByTitle('Vista Lista');

    // Ensure buttons are visible
    await expect(mapButton).toBeVisible();
    await expect(gridButton).toBeVisible();
    await expect(listButton).toBeVisible();

    // Switch to Map View
    await mapButton.click();
    // Verify map container is visible
    // The map view container has a specific structure in explore.page.html
    // We check for the canvas because the custom element app-cars-map might report as hidden (0x0)
    await expect(page.locator('app-cars-map canvas, app-waze-live-map iframe').first()).toBeVisible({ timeout: 10000 });

    // Switch to List View
    await listButton.click();
    // Verify list view container - looking for the specific list structure
    // In HTML: <div *ngIf="viewMode() === 'list'" class="flex flex-col gap-4 ...">
    await expect(page.locator('.flex.flex-col.gap-4.max-w-5xl')).toBeVisible();

    // Switch back to Grid View
    await gridButton.click();
    // Verify grid view container
    // In HTML: <div *ngIf="viewMode() === 'grid'" class="grid grid-cols-1 ...">
    await expect(page.locator('.grid.grid-cols-1')).toBeVisible();
  });
});
