
import { test, expect } from '@playwright/test';

test.describe('Renter Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
  });

  test('should allow a user to search for a car and view its details', async ({ page }) => {
    // 1. Search for a car
    await page.fill('input[name="location"]', 'Buenos Aires');
    await page.fill('input[name="startDate"]', '2025-12-01');
    await page.fill('input[name="endDate"]', '2025-12-05');
    await page.click('button[type="submit"]');

    // 2. Verify that a list of cars is displayed
    await expect(page.locator('.car-card')).toHaveCountGreaterThan(0);

    // 3. Click on the first car
    await page.locator('.car-card').first().click();

    // 4. Verify that the car detail page is displayed
    await expect(page).toHaveURL(/.+\/cars\/.+/);
  });

  test('should allow a user to book a car', async ({ page }) => {
    // This test depends on the previous one. For a real-world scenario,
    // it would be better to combine them or to have a setup step that
    // navigates to a specific car page.

    // 1. Navigate to a car page
    await page.goto('/cars/some-car-id'); // Replace with a valid car ID

    // 2. Select dates
    await page.fill('input[name="startDate"]', '2025-12-01');
    await page.fill('input[name="endDate"]', '2025-12-05');

    // 3. Click the book button
    await page.click('button:has-text("Book")');

    // 4. Verify that the user is redirected to the checkout page
    await expect(page).toHaveURL(/.+\/checkout/);
  });

  test('should allow a user to make a payment', async ({ page }) => {
    // This test depends on the previous one.

    // 1. Navigate to the checkout page
    await page.goto('/checkout'); // This should be the result of the previous test

    // 2. Fill in payment details
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiryDate"]', '12/25');
    await page.fill('input[name="cvc"]', '123');

    // 3. Click the pay button
    await page.click('button:has-text("Pay")');

    // 4. Verify that the booking is confirmed
    await expect(page).toHaveURL(/.+\/booking-success/);
  });

  test('should allow a user to view their bookings', async ({ page }) => {
    // 1. Navigate to the my-bookings page
    await page.goto('/my-bookings');

    // 2. Verify that at least one booking is displayed
    await expect(page.locator('.booking-card')).toHaveCountGreaterThan(0);

    // 3. Click on the first booking
    await page.locator('.booking-card').first().click();

    // 4. Verify that the booking detail page is displayed
    await expect(page).toHaveURL(/.+\/bookings\/.+/);
  });
});
