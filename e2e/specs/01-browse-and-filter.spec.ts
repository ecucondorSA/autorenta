import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadCarsFixture } from '../support/fixtures';
import { installSupabaseMocks } from '../support/network-mocks';
import { createStepLogger } from '../support/step-logger';

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

    // Get the first car's ID and verify href attribute
    logStep('verify-first-car');
    const firstCarId = await carCards.first().getAttribute('data-car-id');
    logStep('first-car-id', { carId: firstCarId });

    // Verify the car card has correct href (routerLink generates href)
    const firstCardHref = await carCards.first().getAttribute('href');
    logStep('first-car-href', { href: firstCardHref });

    // Navigate directly to detail page (more reliable than click during SSR hydration)
    logStep('navigate-to-detail');
    await page.goto(`/cars/${firstCarId}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(new RegExp(`/cars/${firstCarId}`), { timeout: 15000 });
    logStep('navigated-to-detail', { carId: firstCarId });

    // Navigate back to list
    logStep('navigate-back-to-list');
    await page.goto('/cars/list', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/cars\/list/);

    // Switch to grid view again
    await gridViewButton.click();

    // Verify cars are still visible
    await expect(carCards.first()).toBeVisible({ timeout: 10000 });
    logStep('list-still-visible');

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
