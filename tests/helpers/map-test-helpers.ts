import { Page, Locator, expect } from '@playwright/test';

/**
 * Map Test Helpers
 * 
 * Utility functions for testing the Cars Map Component in E2E tests
 */

export class MapTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for map to load completely
   */
  async waitForMapLoad(timeout = 10000): Promise<void> {
    // Wait for map container
    await this.page.waitForSelector('.cars-map-container, [class*="map-container"]', {
      timeout,
    });

    // Wait for map canvas
    await this.page.waitForSelector('.map-canvas, #map-container', {
      timeout,
    });

    // Wait a bit more for Mapbox to fully initialize
    await this.page.waitForTimeout(3000);
  }

  /**
   * Get map canvas locator
   */
  getMapCanvas(): Locator {
    return this.page.locator('.map-canvas, #map-container, [class*="map-canvas"]').first();
  }

  /**
   * Verify map is visible and loaded
   */
  async verifyMapLoaded(): Promise<void> {
    const mapCanvas = this.getMapCanvas();
    await expect(mapCanvas).toBeVisible({ timeout: 10000 });

    // Verify map has size
    const mapBox = await mapCanvas.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox?.width).toBeGreaterThan(0);
    expect(mapBox?.height).toBeGreaterThan(0);
  }

  /**
   * Verify no error overlay is shown
   */
  async verifyNoMapErrors(): Promise<void> {
    const errorOverlay = this.page.locator('.error-overlay, [class*="error-overlay"]');
    const isVisible = await errorOverlay.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  }

  /**
   * Get map container locator
   */
  getMapContainer(): Locator {
    return this.page.locator('.cars-map-container, [class*="map-container"]').first();
  }

  /**
   * Click on map at specific position
   */
  async clickOnMap(x: number, y: number): Promise<void> {
    const mapCanvas = this.getMapCanvas();
    const mapBox = await mapCanvas.boundingBox();

    if (!mapBox) {
      throw new Error('Map canvas not found or not visible');
    }

    // Calculate absolute position
    const absoluteX = mapBox.x + x;
    const absoluteY = mapBox.y + y;

    await this.page.mouse.click(absoluteX, absoluteY);
  }

  /**
   * Pan map by dragging
   */
  async panMap(deltaX: number, deltaY: number): Promise<void> {
    const mapCanvas = this.getMapCanvas();
    const mapBox = await mapCanvas.boundingBox();

    if (!mapBox) {
      throw new Error('Map canvas not found or not visible');
    }

    const centerX = mapBox.x + mapBox.width / 2;
    const centerY = mapBox.y + mapBox.height / 2;

    await this.page.mouse.move(centerX, centerY);
    await this.page.mouse.down();
    await this.page.mouse.move(centerX + deltaX, centerY + deltaY);
    await this.page.mouse.up();
  }

  /**
   * Get carousel locator
   */
  getCarousel(): Locator {
    return this.page.locator('.unified-carousel, [class*="carousel"], [class*="recommended-cars"]').first();
  }

  /**
   * Click on car card in carousel
   */
  async clickCarCard(carIdOrIndex: string | number): Promise<void> {
    const carousel = this.getCarousel();
    
    let card: Locator;
    if (typeof carIdOrIndex === 'string') {
      card = carousel.locator(`[data-car-id="${carIdOrIndex}"]`).first();
    } else {
      card = carousel.locator('[data-car-id]').nth(carIdOrIndex);
    }

    await card.click();
    await this.page.waitForTimeout(2000); // Wait for map to respond
  }

  /**
   * Get map filters locator
   */
  getMapFilters(): Locator {
    return this.page.locator('app-map-filters, [class*="map-filters"]').first();
  }

  /**
   * Apply price filter
   */
  async applyPriceFilter(minPrice?: number, maxPrice?: number): Promise<void> {
    const filters = this.getMapFilters();
    const filtersVisible = await filters.isVisible().catch(() => false);

    if (!filtersVisible) {
      throw new Error('Map filters not visible');
    }

    if (minPrice !== undefined) {
      const minPriceInput = filters.locator('input[name*="min"], input[aria-label*="mínimo"]').first();
      await minPriceInput.fill(minPrice.toString());
    }

    if (maxPrice !== undefined) {
      const maxPriceInput = filters.locator('input[name*="max"], input[aria-label*="máximo"]').first();
      await maxPriceInput.fill(maxPrice.toString());
    }

    await this.page.waitForTimeout(2000); // Wait for map to update
  }

  /**
   * Request user location
   */
  async requestUserLocation(): Promise<void> {
    // Grant geolocation permission
    await this.page.context().grantPermissions(['geolocation'], {
      origin: this.page.url(),
    });

    // Look for location button
    const locationButton = this.page.locator(
      '[aria-label*="ubicación"], [aria-label*="location"], button[class*="location"]'
    ).first();

    const buttonVisible = await locationButton.isVisible().catch(() => false);

    if (buttonVisible) {
      await locationButton.click();
      await this.page.waitForTimeout(3000); // Wait for geolocation
    }
  }

  /**
   * Verify map zoom controls exist
   */
  async verifyZoomControls(): Promise<boolean> {
    const zoomControls = this.page.locator(
      '.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out, [class*="zoom"]'
    );

    const count = await zoomControls.count();
    return count > 0;
  }

  /**
   * Get map center coordinates (if accessible via JS)
   */
  async getMapCenter(): Promise<{ lat: number; lng: number } | null> {
    return await this.page.evaluate(() => {
      // Access Mapbox map instance if available
      const mapElement = document.querySelector('.map-canvas');
      if (!mapElement) return null;

      // Try to get map instance from Angular component
      // This requires the map instance to be exposed (not typical)
      // For now, return null as we can't easily access Mapbox internals
      return null;
    });
  }

  /**
   * Wait for markers to load
   */
  async waitForMarkers(timeout = 10000): Promise<void> {
    // Markers are rendered on canvas, so we wait for map to be interactive
    await this.verifyMapLoaded();
    
    // Additional wait for markers to render
    await this.page.waitForTimeout(2000);
  }

  /**
   * Take screenshot of map for visual regression
   */
  async takeMapScreenshot(name: string): Promise<void> {
    const mapContainer = this.getMapContainer();
    await mapContainer.screenshot({ path: `test-results/map-screenshots/${name}.png` });
  }
}

/**
 * Helper function to create MapTestHelpers instance
 */
export function getMapHelpers(page: Page): MapTestHelpers {
  return new MapTestHelpers(page);
}









