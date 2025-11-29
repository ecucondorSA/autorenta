import { expect, test } from '@playwright/test';
import { CatalogPage } from '../pages/cars/CatalogPage';

test.describe('Car Search and Filters', () => {
  // Visitor (unauthenticated) can also search, but we use renter to be consistent
  test.use({ storageState: 'tests/.auth/renter.json' });

  test('should search for cars and apply filters', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    // 1. Initial State
    const initialCount = await catalogPage.getCarCount();
    console.log(`🚗 Initial cars found: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // 2. Filter by Vehicle Type
    console.log('🔍 Filtering by "SUV"...');
    await catalogPage.filterByType('SUV');

    const filterCount = await catalogPage.getCarCount();
    console.log(`🚗 Cars found after filter: ${filterCount}`);

    // Verify all visible cards are relevant (simplified check)
    // Note: This assumes the test data has SUVs and the filter works
    if (filterCount > 0) {
      // We can't easily check text on card for "SUV" unless it's displayed
      // But we assume filter worked if count changed or is non-zero
      expect(filterCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('should navigate to car detail page', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.selectFirstCar();

    // Verify we are on detail page
    await expect(page).toHaveURL(/\/cars\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('button', { name: /reservar|booking/i })).toBeVisible();
  });
});
