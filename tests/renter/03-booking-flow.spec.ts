import { expect, test } from '@playwright/test';
import { CarDetailPage } from '../pages/cars/CarDetailPage';
import { CatalogPage } from '../pages/cars/CatalogPage';

test.describe('Booking Flow', () => {
  test.use({ storageState: 'tests/.auth/renter.json' });

  test('should start a booking process', async ({ page, baseURL }) => {
    console.log('DEBUG: baseURL is:', baseURL);
    const catalogPage = new CatalogPage(page);
    const detailPage = new CarDetailPage(page);

    // Debug: Log browser console
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    // 1. Find a car
    console.log('TEST: Setting up API mock...');

    // Mock Car Data
    await page.route('**/rest/v1/cars*', async route => {
      console.log('TEST: Intercepted cars request:', route.request().url());
      const carData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        price_per_day: 5000,
        currency: 'ARS',
        location_city: 'Buenos Aires',
        status: 'active',
        location_lat: -34.6037,
        location_lng: -58.3816,
        car_photos: [{ url: 'https://placehold.co/600x400' }],
        owner: { full_name: 'Test Owner', rating_avg: 5.0 }
      };

      // If request is for specific ID (detail page), return object
      if (route.request().url().includes('id=eq.123e4567-e89b-12d3-a456-426614174000')) {
        await route.fulfill({
          json: carData,
          headers: {
            'content-range': '0-0/1'
          }
        });
      } else {
        // Otherwise (list page), return array
        await route.fulfill({
          json: [carData],
          headers: {
            'content-range': '0-0/1'
          }
        });
      }
    });

    // Mock Reviews
    await page.route('**/rest/v1/reviews*', async route => {
      await route.fulfill({ json: [], headers: { 'content-range': '0-0/0' } });
    });

    // Mock Blocked Dates RPC
    await page.route('**/rest/v1/rpc/get_car_blocked_dates', async route => {
      console.log('TEST: Intercepted blocked dates RPC');
      await route.fulfill({
        json: [], // No blocked dates
        status: 200
      });
    });

    // Mock Stats
    await page.route('**/rest/v1/rpc/get_car_stats*', async route => {
      await route.fulfill({ json: { rating_avg: 5.0, reviews_count: 0 } });
    });

    console.log('TEST: Navigating to catalog...');
    await catalogPage.goto();
    console.log('TEST: Selecting first car...');
    await catalogPage.selectFirstCar();
    console.log('TEST: Car selected');

    // 2. View Detail
    const price = await detailPage.getPrice();
    console.log(`Car price per day: ${price}`);
    expect(price).toBeGreaterThan(0);

    // 3. Start Booking
    await detailPage.selectDates();
    await detailPage.clickBook();

    // 4. Verify Checkout/Booking Page
    await detailPage.assertBookingModalVisible();
  });
});
