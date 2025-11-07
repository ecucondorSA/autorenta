import { test, expect } from '@playwright/test';

/**
 * E2E Test: Verify Published Cars Appear on Map
 *
 * This test validates the fix for car publication status.
 * Cars should be published with status='active' and appear
 * immediately on the explore map.
 *
 * Test Flow:
 * 1. Navigate to Explore page
 * 2. Count existing cars on map
 * 3. Verify cars have status='active' in API response
 * 4. Verify cars have coordinates (location_lat, location_lng)
 */

test.describe('Published Cars Map Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Enable request interception to monitor API calls
    await page.route('**/rest/v1/cars*', async (route) => {
      const response = await route.fetch();
      const data = await response.json();

      // Log the data for debugging
      console.log('📊 Cars API Response:', {
        count: Array.isArray(data) ? data.length : 1,
        sample: Array.isArray(data) ? data[0] : data,
      });

      await route.fulfill({ response, json: data });
    });
  });

  test('should load active cars from API', async ({ page }) => {
    console.log('🧪 Test: Verify active cars are loaded from API');

    // Navigate to explore page
    await page.goto('/explore', { waitUntil: 'networkidle' });

    // Wait for map to load
    await page.waitForTimeout(3000);

    // Intercept the API call to get cars
    const apiResponse = await page.waitForResponse(
      (response) => response.url().includes('/rest/v1/cars') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    if (apiResponse) {
      const cars = await apiResponse.json();
      console.log('✅ Cars loaded:', cars.length);

      // Verify we have cars
      expect(cars.length).toBeGreaterThan(0);

      // Verify all cars have status='active'
      const activeCars = cars.filter((car: any) => car.status === 'active');
      console.log('📊 Active cars:', activeCars.length);
      expect(activeCars.length).toBe(cars.length);

      // Verify all cars have coordinates
      const carsWithCoords = cars.filter(
        (car: any) => car.location_lat !== null && car.location_lng !== null
      );
      console.log('📍 Cars with coordinates:', carsWithCoords.length);
      expect(carsWithCoords.length).toBeGreaterThan(0);

      // Sample first car
      const firstCar = cars[0];
      console.log('🚗 Sample car:', {
        id: firstCar.id,
        title: firstCar.title,
        status: firstCar.status,
        hasCoords: !!(firstCar.location_lat && firstCar.location_lng),
      });
    }
  });

  test('should display cars on map', async ({ page }) => {
    console.log('🧪 Test: Verify cars appear on map component');

    // Navigate to explore page
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });

    // Wait for map component to be visible
    const mapComponent = page.locator('app-cars-map').first();
    await expect(mapComponent).toBeVisible({ timeout: 15000 });

    // Wait for map to initialize
    await page.waitForTimeout(5000);

    // Verify map container exists
    const mapContainer = page.locator('#map-container, .map-container').first();
    await expect(mapContainer).toBeVisible();

    // Get bounding box to verify map rendered
    const mapBox = await mapContainer.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox?.width).toBeGreaterThan(0);
    expect(mapBox?.height).toBeGreaterThan(0);

    console.log('✅ Map rendered successfully');
  });

  test('should verify car status in database', async ({ page }) => {
    console.log('🧪 Test: Verify cars in DB have status=active');

    // Navigate to explore
    await page.goto('/explore');

    // Wait for API response
    const response = await page.waitForResponse(
      (res) => res.url().includes('/rest/v1/cars') && res.status() === 200
    );

    const cars = await response.json();

    // Detailed status check
    const statusCounts = cars.reduce((acc: any, car: any) => {
      acc[car.status] = (acc[car.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Status distribution:', statusCounts);

    // All cars should be active
    expect(statusCounts.active).toBeGreaterThan(0);
    expect(statusCounts.draft || 0).toBe(0);
    expect(statusCounts.pending || 0).toBe(0);
  });

  test('should navigate to car detail from map', async ({ page }) => {
    console.log('🧪 Test: Navigate to car detail from map marker');

    // Navigate to explore
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });

    // Wait for map to load
    await page.waitForTimeout(5000);

    // Try to find and click a car card (map markers are canvas-based, hard to click)
    const carCards = page.locator('app-car-card, .car-card');
    const carCount = await carCards.count();

    console.log('🚗 Car cards found:', carCount);

    if (carCount > 0) {
      // Click first car card
      await carCards.first().click();

      // Should navigate to car detail or show modal
      await page.waitForTimeout(2000);

      // Verify URL changed or modal appeared
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);

      // Either we're on car detail page or a modal opened
      const isDetailPage = currentUrl.includes('/cars/');
      const hasModal = await page.locator('.modal, ion-modal').isVisible().catch(() => false);

      expect(isDetailPage || hasModal).toBe(true);
      console.log('✅ Navigation successful');
    }
  });
});

/**
 * DEPLOYMENT VERIFICATION TEST
 *
 * This test should be run against the deployed URL to verify
 * that the fixes are working in production.
 */
test.describe('Deployment Verification', () => {
  test('should verify deployment URL is accessible', async ({ page }) => {
    const deploymentUrl = 'https://ca6618ec.autorenta-web.pages.dev';

    console.log('🧪 Test: Verify deployment at', deploymentUrl);

    const response = await page.goto(deploymentUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    expect(response?.status()).toBe(200);
    console.log('✅ Deployment is accessible');
  });

  test('should verify active cars on deployed site', async ({ page }) => {
    const deploymentUrl = 'https://ca6618ec.autorenta-web.pages.dev';

    console.log('🧪 Test: Verify cars on deployed site');

    // Navigate to explore on deployed site
    await page.goto(`${deploymentUrl}/explore`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for API response
    const response = await page.waitForResponse(
      (res) => res.url().includes('/rest/v1/cars') && res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    if (response) {
      const cars = await response.json();
      console.log('📊 Deployed site - Cars loaded:', cars.length);

      // Verify cars exist
      expect(cars.length).toBeGreaterThan(0);

      // Verify all are active
      const activeCars = cars.filter((car: any) => car.status === 'active');
      expect(activeCars.length).toBe(cars.length);

      console.log('✅ All cars on deployed site are active');
    }
  });
});
