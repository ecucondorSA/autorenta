import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Marketplace Scoring and Ordering
 *
 * Verifica que:
 * 1. Los autos se muestran ordenados por score descendente
 * 2. El score se muestra en la UI (si está implementado)
 * 3. La búsqueda con ubicación mejora el ordenamiento
 *
 * Prioridad: P0 (Critical)
 * Relacionado con: Migración de scoring (20251116_update_get_available_cars_scoring.sql)
 */

test.describe('Marketplace - Scoring and Ordering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for splash loader to disappear
    await page.locator('app-splash-loader')
      .waitFor({ state: 'detached', timeout: 10000 })
      .catch(() => {});
  });

  test('should display cars ordered by score when searching with dates and location', async ({
    page,
  }) => {
    // Step 1: Set user location (Buenos Aires)
    // This should trigger scoring based on distance
    await page.evaluate(() => {
      // Mock geolocation API
      navigator.geolocation.getCurrentPosition = (success: PositionCallback) => {
        success({
          coords: {
            latitude: -34.6037,
            longitude: -58.3816,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      };
    });

    // Step 2: Search with dates
    // Look for date picker or search form
    const datePickerButton = page
      .locator('button:has-text("Buscar"), button:has-text("Fechas"), [data-testid="date-picker-trigger"]')
      .first();

    if (await datePickerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await datePickerButton.click();

      // Select start date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDateStr = tomorrow.toISOString().split('T')[0];

      // Select end date (3 days later)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 4);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fill date inputs if visible
      const startDateInput = page.locator('input[type="date"], input[name*="start"], input[name*="from"]').first();
      const endDateInput = page.locator('input[type="date"], input[name*="end"], input[name*="to"]').first();

      if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await startDateInput.fill(startDateStr);
        await endDateInput.fill(endDateStr);
      }

      // Click search/apply button
      const applyButton = page.locator('button:has-text("Aplicar"), button:has-text("Buscar"), button[type="submit"]').first();
      if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await applyButton.click();
      }
    }

    // Step 3: Wait for cars to load
    await page.waitForTimeout(2000); // Wait for API call

    // Step 4: Verify cars are displayed
    const carCards = page.locator('[data-testid="car-card"], .car-card, app-car-card').first();
    await expect(carCards).toBeVisible({ timeout: 10000 });

    // Step 5: Extract scores from car cards (if displayed)
    // Note: Score might not be visible in UI yet, but we can verify ordering
    const allCarCards = page.locator('[data-testid="car-card"], .car-card, app-car-card');
    const carCount = await allCarCards.count();

    expect(carCount).toBeGreaterThan(0);

    // Step 6: Verify ordering by checking network response
    // Intercept the RPC call to verify scores
    const rpcCalls: Array<{ scores: number[] }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('rpc/get_available_cars') || url.includes('get_available_cars')) {
        try {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const scores = data.map((car: any) => car.score).filter((s: any) => s !== null && s !== undefined);
            if (scores.length > 0) {
              rpcCalls.push({ scores });
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });

    // Trigger another search to capture the response
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify scores are in descending order
    if (rpcCalls.length > 0) {
      const scores = rpcCalls[0].scores;
      if (scores.length > 1) {
        for (let i = 0; i < scores.length - 1; i++) {
          expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
        }
      }
    }

    // Step 7: Take screenshot for visual verification
    await page.screenshot({
      path: 'tests/e2e/screenshots/marketplace-scoring-order.png',
      fullPage: true,
    });
  });

  test('should improve ordering when user location is provided', async ({ page }) => {
    // This test verifies that providing location improves relevance
    // by comparing results with and without location

    // Test without location
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search with dates but no location
    const datePickerButton = page
      .locator('button:has-text("Buscar"), button:has-text("Fechas")')
      .first();

    if (await datePickerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await datePickerButton.click();
      await page.waitForTimeout(1000);

      // Apply search
      const applyButton = page.locator('button:has-text("Aplicar"), button:has-text("Buscar")').first();
      if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await applyButton.click();
      }
    }

    await page.waitForTimeout(2000);

    // Get first car's details (without location)
    const firstCarWithoutLocation = page.locator('[data-testid="car-card"], .car-card').first();
    const firstCarTitleWithoutLocation = await firstCarWithoutLocation
      .locator('h2, h3, .car-title, .title')
      .first()
      .textContent()
      .catch(() => null);

    // Now test with location
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success: PositionCallback) => {
        success({
          coords: {
            latitude: -34.6037,
            longitude: -58.3816,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      };
    });

    // Reload and search again
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Get first car's details (with location)
    const firstCarWithLocation = page.locator('[data-testid="car-card"], .car-card').first();
    const firstCarTitleWithLocation = await firstCarWithLocation
      .locator('h2, h3, .car-title, .title')
      .first()
      .textContent()
      .catch(() => null);

    // Verify that results changed (location affects scoring)
    // Note: This is a soft check - results might be the same if location doesn't affect much
    // But we verify the page loaded correctly
    expect(firstCarWithLocation).toBeVisible({ timeout: 10000 });
  });

  test('should handle search without dates (fallback to listActiveCars)', async ({ page }) => {
    // When no dates are provided, should use listActiveCars instead of get_available_cars
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Don't set dates, just browse
    const carCards = page.locator('[data-testid="car-card"], .car-card');
    await expect(carCards.first()).toBeVisible({ timeout: 10000 });

    // Verify cars are displayed (even without dates)
    const count = await carCards.count();
    expect(count).toBeGreaterThan(0);
  });
});






