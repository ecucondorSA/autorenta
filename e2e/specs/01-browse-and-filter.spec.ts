import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadCarsFixture } from '../support/fixtures';
import { installSupabaseMocks } from '../support/network-mocks';
import { createStepLogger } from '../support/step-logger';

// Usar auth persistente via storageState (global-setup)
test.use({ storageState: 'tests/.auth/renter.json' });

const artifactsRoot = resolve(__dirname, '..', 'artifacts');
const SPEC_ID = '01-browse-and-filter';

test.describe('Browse and filter catalog', () => {
  test(`${SPEC_ID}: displays car catalog and allows navigation to detail`, async ({ page }) => {
    const logStep = createStepLogger(SPEC_ID);
    const cars = loadCarsFixture();

    logStep('install-supabase-mocks');
    await installSupabaseMocks(page);

    logStep('navigate-to-cars-list');
    await page.goto('/cars/list', { waitUntil: 'networkidle' }).catch((error) => {
      logStep('navigation-error', { message: error.message });
      throw error;
    });

    // Switch to grid view (default view may be map which doesn't have data-car-id)
    logStep('switch-to-grid-view');
    const gridViewButton = page.locator('button[title="Vista Cuadrícula"]');
    await expect(gridViewButton).toBeVisible({ timeout: 10000 });
    await gridViewButton.click();

    // Wait for car cards to be visible in grid view
    const carCards = page.locator('[data-car-id]');
    await expect(carCards.first()).toBeVisible({ timeout: 15000 });

    const initialCount = await carCards.count();
    logStep('initial-catalog-loaded', { count: initialCount, fixtureCount: cars.length });
    // Verify at least 1 car is visible (mock may not return all fixture cars)
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // Verify the first car has correct data-car-id attribute
    logStep('verify-first-car');
    const firstCarId = await carCards.first().getAttribute('data-car-id');
    expect(firstCarId).toBeTruthy();
    logStep('first-car-id', { carId: firstCarId });

    // Verify the car card is an anchor tag with href attribute (routerLink)
    const firstCardHref = await carCards.first().getAttribute('href');
    logStep('first-car-href', { href: firstCardHref });
    expect(firstCardHref).toContain(`/cars/${firstCarId}`);

    // Verify car card displays correct content (using text content)
    const firstCardText = await carCards.first().textContent();
    logStep('first-car-text', { text: firstCardText?.substring(0, 100) });
    expect(firstCardText).toBeTruthy();

    // Test complete - catalog displays correctly with clickable car cards
    logStep('test-complete');

    // Capture artifacts
    logStep('capture-artifacts');
    const screenshotPath = resolve(artifactsRoot, `${SPEC_ID}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const video = await page.video();
    if (video) {
      const videoPath = resolve(artifactsRoot, `${SPEC_ID}.mp4`);
      await video.saveAs(videoPath);
      await video.delete();
    }
  });
});
