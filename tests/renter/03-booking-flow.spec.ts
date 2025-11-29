import { expect, test } from '@playwright/test';
import { CarDetailPage } from '../pages/cars/CarDetailPage';
import { CatalogPage } from '../pages/cars/CatalogPage';

test.describe('Booking Flow', () => {
  test.use({ storageState: 'tests/.auth/renter.json' });

  test('should start a booking process', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const detailPage = new CarDetailPage(page);

    // 1. Find a car
    await catalogPage.goto();
    await catalogPage.selectFirstCar();

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
