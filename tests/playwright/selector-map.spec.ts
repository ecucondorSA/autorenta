import { expect, test } from '@playwright/test';
// Import the selector helper (JS) produced by the extractor pipeline
import { s } from './selectors.js';

test('selector-map: header is visible using mapped selector', async ({ page, baseURL }) => {
  const url = baseURL ?? 'http://localhost:4200';
  await page.goto(url);

  // Use the helper: pass the key from tests/selector-map.json (e.g. 'main-header')
  const headerSelector = s('main-header');
  const header = page.locator(headerSelector);

  await expect(header).toBeVisible({ timeout: 5000 });
});
