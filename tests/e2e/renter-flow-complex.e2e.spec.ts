
import { test, expect } from '@playwright/test';

// This test requires a test user to be present in the database.
// You should create a test user before running this test.
const testUser = {
  email: 'test-renter@example.com',
  password: 'password123',
};

test.describe('Complex Renter Flow', () => {
  let page;
  let carId;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // Log in as the test user
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should allow a user to search, book, pay, and review a car', async () => {
    // 1. Search for a car
    await page.goto('/');
    await page.fill('input[name="location"]', 'Buenos Aires');
    await page.fill('input[name="startDate"]', '2025-12-01');
    await page.fill('input[name="endDate"]', '2025-12-05');
    await page.click('button[type="submit"]');
    await expect(page.locator('.car-card')).toHaveCountGreaterThan(0);

    // 2. Select a car and store its ID
    const firstCar = page.locator('.car-card').first();
    carId = await firstCar.getAttribute('data-car-id');
    await firstCar.click();
    await expect(page).toHaveURL(new RegExp(`/cars/${carId}`));

    // 3. Book the car
    await page.click('button:has-text("Book")');
    await expect(page).toHaveURL(/\/checkout/);

    // 4. Make a payment (mocked)
    // You should mock the payment gateway API call to avoid making real payments.
    await page.route('**/api/v1/payments', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiryDate"]', '12/25');
    await page.fill('input[name="cvc"]', '123');
    await page.click('button:has-text("Pay")');
    await expect(page).toHaveURL(/\/booking-success/);

    // 5. View the booking
    await page.goto('/my-bookings');
    await expect(page.locator(`.booking-card[data-car-id="${carId}"]`)).toBeVisible();
    await page.locator(`.booking-card[data-car-id="${carId}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/bookings/.+`));

    // 6. Leave a review
    await page.fill('textarea[name="comment"]', 'Great car!');
    await page.click('button:has-text("Submit Review")');
    await expect(page.locator('.review-success-message')).toBeVisible();
  });
});
