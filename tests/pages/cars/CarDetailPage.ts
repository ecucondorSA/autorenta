import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CarDetailPage extends BasePage {
  readonly bookButton: Locator;
  readonly priceLabel: Locator;
  readonly datesButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bookButton = page.locator('#book-now');
    this.priceLabel = page.locator('.text-2xl.font-bold, .text-3xl.font-bold').first(); // Adjust based on HTML
    this.datesButton = page.locator('.date-input-wrapper');
  }

  async getPrice(): Promise<number> {
    const text = await this.priceLabel.textContent();
    if (!text) return 0;
    return parseFloat(text.replace(/[^0-9.]/g, ''));
  }

  async selectDates(): Promise<void> {
    await this.datesButton.click();
    // Wait for flatpickr to open
    const calendar = this.page.locator('.flatpickr-calendar.open');
    await expect(calendar).toBeVisible();

    // Select first available date (usually today or tomorrow)
    // We skip disabled dates
    const availableDays = calendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');

    // Click start date (e.g., 1st available)
    await availableDays.nth(0).click();

    // Click end date (e.g., 3rd available -> 2 days rental)
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
