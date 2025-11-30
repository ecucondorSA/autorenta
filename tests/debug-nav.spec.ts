import { expect, test } from '@playwright/test';

test('debug navigation', async ({ page }) => {
  console.log('Navigating to home...');
  const start = Date.now();
  try {
    await page.goto('http://localhost:4300/', { timeout: 10000 });
    console.log(`Navigation took ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`Navigation failed after ${Date.now() - start}ms:`, e);
    throw e;
  }
  await expect(page).toHaveTitle(/AutoRenta/);
});
