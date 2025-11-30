import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CarDetailPage extends BasePage {
  readonly bookButton: Locator;
  readonly datesButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bookButton = page.locator('#book-now');
    this.datesButton = page.locator('.date-input-wrapper');
  }

  async getPrice(): Promise<number> {
    // Wait for any price label to appear
    await this.page.waitForSelector('.text-2xl.font-bold, .text-3xl.font-bold, .text-3xl.font-black, .text-4xl.font-black', { timeout: 10000 }).catch(() => console.log('Price selector timeout'));

    // Try daily price first, then hourly (express mode)
    const dailyPrice = this.page.locator('aside .text-2xl.font-bold, aside .text-3xl.font-bold').first();
    const hourlyPrice = this.page.locator('aside .text-3xl.font-black, aside .text-4xl.font-black').first();

    let priceText = '';
    if (await dailyPrice.isVisible()) {
      priceText = await dailyPrice.innerText();
      console.log(`CarDetailPage: Found daily price: ${priceText}`);
    } else if (await hourlyPrice.isVisible()) {
      priceText = await hourlyPrice.innerText();
      console.log(`CarDetailPage: Found hourly price: ${priceText}`);
    } else {
      console.log('CarDetailPage: No price found, dumping page text...');
      console.log(await this.page.innerText('body'));
      throw new Error('Price label not found');
    }

    return parseFloat(priceText.replace(/[^0-9.]/g, ''));
  }

  async selectDates(): Promise<void> {
    console.log('📅 Opening date picker...');
    await this.datesButton.click();
    // Wait for flatpickr to open
    const calendar = this.page.locator('.flatpickr-calendar.open');
    await expect(calendar).toBeVisible();
    console.log('📅 Calendar visible');

    // Select first available date (usually today or tomorrow)
    // We skip disabled dates
    const availableDays = calendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');

    const count = await availableDays.count();
    console.log(`📅 Available days found: ${count}`);

    if (count < 3) {
      console.log('📅 Calendar HTML:', await calendar.innerHTML());
      throw new Error(`Not enough available days to select a range. Found: ${count}`);
    }

    // Click start date (e.g., 1st available)
    console.log('📅 Clicking start date...');
    await availableDays.nth(0).click();

    // Click end date (e.g., 3rd available -> 2 days rental)
    console.log('📅 Clicking end date...');
    await availableDays.nth(2).click();
  }

  async clickBook(): Promise<void> {
    await this.bookButton.click();
  }

  async assertBookingModalVisible(): Promise<void> {
    // Check for location form modal
    await expect(this.page.locator('app-booking-location-form')).toBeVisible();
  }
}
