
import { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CatalogPage extends BasePage {
  readonly carCards: Locator;
  readonly filtersPanel: Locator;

  // Filters
  readonly transmissionSelect: Locator;

  constructor(page: Page) {
    super(page);

    // Search input/button do not exist on /cars/list
    // We use filters instead

    this.carCards = page.locator('a[data-car-id]'); // Updated selector based on cars-list.page.html
    this.filtersPanel = page.locator('app-map-filters');

    // Filters
    this.transmissionSelect = this.filtersPanel.locator('button', { hasText: 'Transmisión' });
  }

  async goto(): Promise<void> {
    console.log('CatalogPage: Navigating to /cars/list');
    try {
      await this.page.goto('/cars/list', { waitUntil: 'domcontentloaded' });
      console.log('CatalogPage: Page loaded (domcontentloaded), waiting for car cards...');
      // Wait for at least one car card to be visible to ensure list is loaded
      await this.carCards.first().waitFor({ state: 'visible', timeout: 30000 });
      console.log('CatalogPage: Car cards visible');
    } catch (error) {
      console.error('CatalogPage: Error in goto:', error);
      throw error;
    }
  }

  async search(term: string): Promise<void> {
    // No text search on list page.
    // We could implement location search if needed, but for now we skip or log warning
    console.warn('Text search not available on CatalogPage (CarsList). Use filters.');
  }

  async filterByType(typeLabel: string): Promise<void> {
    // 1. Open Type panel
    const typeButton = this.filtersPanel.locator('button', { hasText: 'Tipo' });
    await typeButton.click();

    // 2. Check the option
    const option = this.page.locator('label', { hasText: typeLabel }).locator('input[type="checkbox"]');
    await option.check();

    // 3. Close panel (click outside or toggle)
    await typeButton.click();

    await this.waitForLoadingComplete();
  }

  async getCarCount(): Promise<number> {
    return await this.carCards.count();
  }

  async selectFirstCar(): Promise<void> {
    console.log('🚗 Selecting first car...');
    const firstCard = this.carCards.first();
    const href = await firstCard.getAttribute('href');
    console.log(`🚗 First car href: ${href}`);
    await firstCard.click();
    console.log('🚗 Clicked first car, waiting for navigation...');
    try {
      await this.page.waitForURL(/\/cars\/[a-zA-Z0-9-]+/, { timeout: 10000 });
      console.log('🚗 Navigated to car detail');
    } catch (e) {
      console.log(`🚗 Navigation timeout. Current URL: ${this.page.url()}`);
      throw e;
    }
  }
}
