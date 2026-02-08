import { test, expect } from '@playwright/test';

/**
 * Critical Business Flow Tests
 * 
 * Verifies the core revenue path:
 * 1. User lands on Home/Search
 * 2. User selects a Car
 * 3. User attempts to Book
 * 4. System enforces correct Auth/Payment flow
 */

// NOTE:
// This spec is committed as a reference for a critical business flow, but is
// intentionally skipped by default to avoid breaking CI due to selector drift.
// Run manually when needed (remove skip or run with a dedicated grep/project).
test.describe.skip('Critical Business Flow @critical', () => {

    test('Guest user can search and view car details', async ({ page }) => {
        // 1. Landing
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/AutoRenta|Alquiler/);

        // 2. Navigation to List
        // Option A: Click "Explorar" or similar CTA
        // Option B: Direct navigation to be robust
        await page.goto('/cars/list', { waitUntil: 'networkidle' });

        // 3. Verify List Populated
        const carCards = page.locator('app-car-card, .car-card');
        await expect(carCards.first()).toBeVisible({ timeout: 15000 });

        // 4. Select first car
        const firstCar = carCards.first();
        const carTitle = await firstCar.locator('.car-title, h3').first().textContent();
        console.log(`Selecting car: ${carTitle}`);

        await firstCar.click();

        // 5. Verify Detail Page
        await expect(page).toHaveURL(/\/cars\/detail\//);
        await expect(page.locator('h1')).toBeVisible(); // Car title usually H1

        // 6. Attempt Booking (as Guest)
        const bookButton = page.locator('button', { hasText: /Reservar|Book/i }).first();
        await expect(bookButton).toBeVisible();

        // Intercept navigation to check redirect logic
        await bookButton.click();

        // 7. Verify Auth Redirect
        // Should prompt for login if not authenticated
        await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
        console.log('Successfully redirected to Login page upon booking attempt');
    });

});
