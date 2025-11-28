import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadCarsFixture } from '../support/fixtures';
import { installSupabaseMocks } from '../support/network-mocks';
import { createStepLogger } from '../support/step-logger';

const artifactsRoot = resolve(__dirname, '..', 'artifacts');
const SPEC_ID = '01-browse-and-filter';

test.describe('Browse and filter catalog', () => {
  test(`${SPEC_ID}: filters by transmission and preserves state`, async ({ page }) => {
    const logStep = createStepLogger(SPEC_ID);
    const cars = loadCarsFixture();

    logStep('install-supabase-mocks');
    await installSupabaseMocks(page);

    logStep('navigate-to-cars-list');
    await page.goto('/cars', { waitUntil: 'networkidle' }).catch((error) => {
      logStep('navigation-error', { message: error.message });
      throw error;
    });

    const carCards = page.locator('[data-car-id]');
    await expect(carCards.first()).toBeVisible({ timeout: 15000 });

    const initialCount = await carCards.count();
    logStep('initial-catalog-loaded', { count: initialCount });
    expect(initialCount).toBeGreaterThanOrEqual(cars.length);

    logStep('open-filters');
    await page.getByRole('button', { name: /Filtros/i }).click();

    logStep('apply-automatic-transmission');
    await page.getByRole('button', { name: /Automática/i }).click();

    await page.waitForTimeout(500);
    const automaticCars = cars.filter((car) => car.transmission === 'automatic');
    const filteredCount = await carCards.count();
    logStep('after-transmission-filter', { filteredCount, expected: automaticCars.length });
    expect(filteredCount).toBeGreaterThan(0);

    logStep('sort-by-price-desc');
    await page.locator('#sort-by').selectOption('price_desc');

    const sortedAutomatic = [...automaticCars].sort(
      (a, b) => b.price_per_day - a.price_per_day,
    );
    const expectedTop = sortedAutomatic[0];
    if (expectedTop) {
      await expect(page.locator('h3', { hasText: expectedTop.title })).toBeVisible();
    }

    logStep('open-first-car');
    await carCards.first().click();
    await expect(page).toHaveURL(/\/cars\//);

    logStep('go-back-to-list');
    await page.goBack();
    await expect(page.locator('#sort-by')).toHaveValue('price_desc');

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
