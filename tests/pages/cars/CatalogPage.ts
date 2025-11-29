
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
    await super.goto('/cars/list');
    await this.waitForVisible(this.filtersPanel);
    // Wait for at least one car or empty state
    // We prefer waiting for cars
    try {
      await this.carCards.first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.warn('No cars found after timeout. Check DB or API.');
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
    await this.carCards.first().click();
    await this.page.waitForURL(/\/cars\/[a-zA-Z0-9-]+/);
  }
}
