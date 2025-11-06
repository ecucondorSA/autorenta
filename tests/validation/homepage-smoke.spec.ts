/**
 * Homepage Smoke Test
 *
 * Este test valida que la homepage de AutorentA carga correctamente.
 *
 * NOTA: Este es el tipo de test que TestSprite MCP generaría automáticamente
 * desde el PRD en docs/prd/homepage-validation-test.md
 *
 * Generated from PRD: docs/prd/homepage-validation-test.md
 * Priority: P0 (Smoke Test)
 * Date: 2025-11-04
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:4200/');
  });

  test('T1: Homepage loads successfully', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify HTTP 200 status
    const response = await page.goto('http://localhost:4200/');
    expect(response?.status()).toBe(200);

    // Verify URL
    expect(page.url()).toBe('http://localhost:4200/');
  });

  test('T2: Page title contains AutoRenta', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/AutoRenta/i);
  });

  test('T3: Navigation bar is visible', async ({ page }) => {
    // Wait for Angular to bootstrap
    await page.waitForSelector('nav', { timeout: 5000 });

    // Verify navigation is visible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Note: Logo check is optional as structure may vary
    // This is a minimal smoke test
  });

  test('T4: Main content area is rendered', async ({ page }) => {
    // Wait for main content
    await page.waitForSelector('main, ion-content', { timeout: 5000 });

    // Verify main content exists
    const main = page.locator('main, ion-content').first();
    await expect(main).toBeVisible();
  });

  test('T5: Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    // Navigate and wait for load
    await page.goto('http://localhost:4200/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Verify load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('T6: No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to page
    await page.goto('http://localhost:4200/');
    await page.waitForLoadState('networkidle');

    // Allow minor warnings but no critical errors
    // Note: Some framework warnings are acceptable
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('Extension') &&
      !err.includes('Download')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
