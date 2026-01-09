/**
 * Critical E2E Tests - Playwright
 *
 * @tags @critical
 *
 * These tests run on every PR and must pass before merge.
 * They validate the most critical user flows.
 */
import { test, expect } from '@playwright/test';

test.describe('Critical Flows @critical', () => {
  test('home page loads successfully', async ({ page }) => {
    // Navigate to home
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Page should return 200
    expect(response?.status()).toBe(200);

    // Wait for body to have content
    await page.waitForSelector('body', { timeout: 10000 });

    // Check title exists
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('static assets load correctly', async ({ page }) => {
    const failedAssets: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        // Only track JS and CSS failures, ignore fonts
        if ((url.includes('.js') || url.includes('.css')) && !url.includes('font')) {
          failedAssets.push(`${response.status()}: ${url}`);
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    expect(failedAssets).toHaveLength(0);
  });

  test('no critical JavaScript errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('pageerror', (error) => {
      // Track critical errors that would break the app
      if (
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Failed to fetch dynamically') ||
        error.message.includes('Cannot read properties of undefined')
      ) {
        criticalErrors.push(error.message);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Smoke Tests @critical', () => {
  test('app bundle loads without chunk errors', async ({ page }) => {
    const chunkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('ChunkLoadError')) {
        chunkErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      if (error.message.includes('ChunkLoadError')) {
        chunkErrors.push(error.message);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    expect(chunkErrors).toHaveLength(0);
  });
});
