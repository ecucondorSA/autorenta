import { test, expect } from '@playwright/test';

test.describe('Marketplace Page', () => {
  test('should display a list of cars', async ({ page }) => {
    await page.goto('/marketplace-test');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Explorá nuestra flota/);

    // Expect the main heading to be visible
    await expect(page.getByRole('heading', { name: 'Explorá nuestra flota' })).toBeVisible();

    // Expect at least one car card to be visible
    const carCards = page.locator('app-car-card');
    await expect(carCards.first()).toBeVisible();

    // Expect a specific car title from mock data to be visible
    await expect(page.getByText('Renault Kangoo 2022')).toBeVisible();
    await expect(page.getByText('Ford Ranger 2023')).toBeVisible();
    await expect(page.getByText('Peugeot 208 2021')).toBeVisible();

    // Optional: Check for price display
    await expect(page.getByText('85.000 / día')).toBeVisible();
  });

  test('should navigate to car detail page on card click', async ({ page }) => {
    await page.goto('/marketplace-test');

    // Click on the first car card
    await page.locator('app-car-card').first().click();

    // Expect to be on the car detail page (assuming the URL structure is /cars/:id)
    await expect(page).toHaveURL(/cars\/.+/);

    // Expect a heading from the car detail page to be visible (e.g., the car title)
    // This assumes the car detail page displays the car title prominently
    await expect(page.locator('h1')).toBeVisible();
  });
});
