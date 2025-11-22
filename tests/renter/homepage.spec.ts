import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/AutoRenta/);
    await expect(page.locator('app-hero-search')).toBeVisible();
  });

  test('should have a search form', async ({ page }) => {
    await expect(page.locator('app-hero-search input[placeholder*="Ubicación"]')).toBeVisible();
    await expect(page.locator('app-hero-search button')).toContainText('Buscar');
  });

  test('should navigate to search results when searching', async ({ page }) => {
    // Fill in location
    const locationInput = page.locator('app-hero-search input[placeholder*="Ubicación"]');
    await locationInput.fill('Buenos Aires');

    // Select dates (assuming a simplified flow or just clicking search for now if dates are pre-filled or optional)
    // If dates are required, we might need to interact with the date picker.
    // For now, let's try to just click search and see if it redirects or shows validation error.

    const searchButton = page.locator('app-hero-search button.primary-button');
    await searchButton.click();

    // Expect to navigate to /explore
    await expect(page).toHaveURL(/\/explore/);
  });
});
