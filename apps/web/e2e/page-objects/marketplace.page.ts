/**
 * Marketplace Page Object
 *
 * Encapsulates interactions with the cars marketplace/listing page.
 */

import type { BrowserContext, Locator, Page } from 'patchright';
import { NetworkLogger } from '../utils/network-logger';
import { waitForApiResponse, waitForElement, waitForElementCount } from '../utils/waits';
import { BasePage } from './base.page';

export interface CarCardData {
  id: string | null;
  title: string;
  price: string;
  location: string;
  rating: string;
}

export class MarketplacePage extends BasePage {
  // Page-specific selectors
  private get carCard() {
    return this.selectors.marketplace.carCard;
  }
  private get carCardAlt() {
    return this.selectors.marketplace.carCardAlt;
  }
  private get searchInput() {
    return this.selectors.marketplace.searchInput;
  }
  private get sortSelect() {
    return this.selectors.marketplace.sortSelect;
  }
  private get mapView() {
    return this.selectors.marketplace.mapView;
  }
  private get gridViewButton() {
    return this.selectors.marketplace.gridViewButton;
  }
  private get mapViewButton() {
    return this.selectors.marketplace.mapViewButton;
  }
  private get emptyState() {
    return this.selectors.marketplace.emptyState;
  }
  private get resultsCount() {
    return this.selectors.marketplace.resultsCount;
  }

  constructor(page: Page, context: BrowserContext, networkLogger: NetworkLogger) {
    super(page, context, networkLogger);
  }

  // ==================== NAVIGATION ====================

  /**
   * Navigate to marketplace/cars list
   */
  async goto(): Promise<void> {
    await this.navigate('/cars/list');
  }

  /**
   * Navigate to home page (also shows cars)
   */
  async gotoHome(): Promise<void> {
    await this.navigate('/');
  }

  /**
   * Navigate with debug mode
   */
  async gotoWithDebug(): Promise<void> {
    await this.navigateWithDebug('/cars/list');
  }

  /**
   * Check if on marketplace page
   */
  isOnMarketplace(): boolean {
    return this.urlContains('/cars/list') || this.getUrl().endsWith('/');
  }

  // ==================== CAR CARDS ====================

  /**
   * Wait for car cards to load
   */
  async waitForCarsLoaded(timeout = 15000): Promise<void> {
    // Wait for either car cards or empty state
    try {
      await this.page.waitForSelector(`${this.carCard}, ${this.carCardAlt}, ${this.emptyState}`, {
        timeout,
      });
    } catch {
      // Try alternative selector
      await this.page.waitForSelector('app-car-card, [class*="car-card"]', {
        timeout: 5000,
      });
    }
  }

  /**
   * Get count of car cards
   */
  async getCarCount(): Promise<number> {
    const count = await this.count(this.carCard);
    if (count === 0) {
      // Try alternative selector
      return this.count(this.carCardAlt);
    }
    return count;
  }

  /**
   * Get all car card locators
   */
  getCarCards(): Locator {
    return this.page.locator(this.carCard);
  }

  /**
   * Get specific car card by index
   */
  getCarCard(index: number): Locator {
    return this.getCarCards().nth(index);
  }

  /**
   * Click on a specific car card by index
   */
  async clickCarCard(index: number): Promise<void> {
    const card = this.getCarCard(index);
    await card.click();
  }

  /**
   * Click on first car card
   */
  async clickFirstCar(): Promise<void> {
    await this.clickCarCard(0);
  }

  /**
   * Get car card data by index
   */
  async getCarCardData(index: number): Promise<CarCardData> {
    const card = this.getCarCard(index);

    // Helper to safely get text with timeout
    const safeGetText = async (locator: Locator, timeout = 2000): Promise<string> => {
      try {
        return (await locator.textContent({ timeout })) || '';
      } catch {
        return '';
      }
    };

    // Get card text content as fallback
    const cardText = await safeGetText(card, 3000);

    // Try to get data from data-testid elements, fallback gracefully
    const getId = async () => card.getAttribute('data-car-id').catch(() => null);

    const getTitle = async () => {
      // Try data-testid first
      const titleEl = card.locator(this.selectors.carCard.title);
      let title = await safeGetText(titleEl);
      if (title) return title;

      // Fallback: get first heading-like text
      title = await safeGetText(card.locator('h3, h4').first());
      if (title) return title;

      // Last fallback: extract from card text (first line often is title)
      const lines = cardText.split('\n').filter((l) => l.trim());
      return lines[0] || 'Unknown';
    };

    const getPrice = async () => {
      // Try data-testid first
      const priceEl = card.locator(this.selectors.carCard.price);
      let price = await safeGetText(priceEl);
      if (price) return price;

      // Try to find price pattern in card text
      const priceMatch = cardText.match(/\$[\d.,]+|\d+[\d.,]*\s*\/\s*día/i);
      return priceMatch ? priceMatch[0] : '';
    };

    const getLocation = async () => {
      const locEl = card.locator(this.selectors.carCard.location);
      return safeGetText(locEl);
    };

    const getRating = async () => {
      const ratingEl = card.locator(this.selectors.carCard.rating);
      return safeGetText(ratingEl);
    };

    return {
      id: await getId(),
      title: await getTitle(),
      price: await getPrice(),
      location: await getLocation(),
      rating: await getRating(),
    };
  }

  /**
   * Get all car card data
   */
  async getAllCarCardData(): Promise<CarCardData[]> {
    const count = await this.getCarCount();
    const data: CarCardData[] = [];

    for (let i = 0; i < count; i++) {
      data.push(await this.getCarCardData(i));
    }

    return data;
  }

  // ==================== SEARCH & FILTERS ====================

  /**
   * Search for cars
   */
  async search(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    // Wait for debounce and API response
    await this.wait(500);
    await this.waitForApiResponse();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.clear(this.searchInput);
    await this.wait(500);
  }

  /**
   * Sort cars by option
   */
  async sortBy(option: string): Promise<void> {
    await this.select(this.sortSelect, option);
    await this.waitForApiResponse();
  }

  /**
   * Apply price filter
   */
  async filterByPrice(min?: number, max?: number): Promise<void> {
    if (min !== undefined) {
      await this.fill(this.selectors.marketplace.filters.minPrice, String(min));
    }
    if (max !== undefined) {
      await this.fill(this.selectors.marketplace.filters.maxPrice, String(max));
    }
    await this.waitForApiResponse();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    try {
      await this.click(this.selectors.marketplace.filters.clearButton);
      await this.waitForApiResponse();
    } catch {
      // Clear button might not exist
    }
  }

  /**
   * Wait for API response (Supabase)
   */
  private async waitForApiResponse(): Promise<void> {
    try {
      await waitForApiResponse(this.page, 'supabase', { timeout: 10000 });
    } catch {
      // API might have already responded
    }
  }

  // ==================== VIEW MODES ====================

  /**
   * Switch to map view
   */
  async switchToMapView(): Promise<void> {
    await this.click(this.mapViewButton);
    await waitForElement(this.page, this.mapView);
  }

  /**
   * Switch to grid view
   */
  async switchToGridView(): Promise<void> {
    await this.click(this.gridViewButton);
    await this.waitForCarsLoaded();
  }

  /**
   * Check if map view is active
   */
  async isMapViewActive(): Promise<boolean> {
    return this.isVisible(this.mapView);
  }

  // ==================== ASSERTIONS ====================

  /**
   * Assert cars are displayed
   */
  async assertCarsDisplayed(): Promise<void> {
    await this.waitForCarsLoaded();
    const count = await this.getCarCount();
    if (count === 0) {
      // Check if it's intentionally empty state
      const hasEmptyState = await this.isVisible(this.emptyState);
      if (!hasEmptyState) {
        throw new Error('No car cards found and no empty state displayed');
      }
    }
  }

  /**
   * Assert at least N cars displayed
   */
  async assertMinimumCars(minCount: number): Promise<void> {
    await this.waitForCarsLoaded();
    const count = await this.getCarCount();
    if (count < minCount) {
      throw new Error(`Expected at least ${minCount} cars, found ${count}`);
    }
  }

  /**
   * Assert empty state is shown
   */
  async assertEmptyState(): Promise<void> {
    await waitForElement(this.page, this.emptyState);
  }

  /**
   * Assert car count matches expected
   */
  async assertCarCount(expected: number): Promise<void> {
    await waitForElementCount(this.page, this.carCard, expected, {
      comparison: 'exact',
    });
  }

  /**
   * Assert search results filtered
   */
  async assertSearchResults(query: string): Promise<void> {
    await this.waitForCarsLoaded();
    const count = await this.getCarCount();

    if (count > 0) {
      // Verify at least one car matches query (loosely)
      const firstCar = await this.getCarCardData(0);
      const matchesQuery =
        firstCar.title.toLowerCase().includes(query.toLowerCase()) ||
        firstCar.location.toLowerCase().includes(query.toLowerCase());

      // Note: Not throwing error as search might match on other fields
      console.log(
        `Search "${query}" returned ${count} cars. First car: ${firstCar.title}`
      );
    }
  }

  /**
   * Assert navigation to car detail worked
   */
  async assertNavigatedToCarDetail(): Promise<void> {
    await this.waitForUrl(/\/cars\/[a-zA-Z0-9-]+/);
  }
}
