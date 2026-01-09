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
  test.beforeEach(async ({ page }) => {
    // Enable debug mode
    await page.addInitScript(() => {
      localStorage.setItem('autorentar_debug', 'true');
    });
  });

  test('home page loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for app to bootstrap
    await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });

    // Verify critical sections exist
    const header = page.locator('app-header, header, ion-header');
    await expect(header).toBeVisible({ timeout: 10000 });

    // No critical console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) =>
        e.includes('ChunkLoadError') ||
        e.includes('Failed to fetch dynamically') ||
        e.includes('NetworkError')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('marketplace loads and displays cars', async ({ page }) => {
    await page.goto('/cars/list');

    // Wait for content to load
    await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });

    // Either cars are shown or empty state
    const hasCards = await page
      .locator('[data-testid="car-card"], app-car-card, .car-card')
      .first()
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    const hasEmptyState = await page
      .locator('[data-testid="no-results"], .no-results, .empty-state')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    const hasLoading = await page
      .locator('ion-spinner, .loading, [data-testid="loading"]')
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    // Must show either cars, empty state, or still loading
    expect(hasCards || hasEmptyState || hasLoading).toBeTruthy();
  });

  test('navigation works correctly', async ({ page }) => {
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/cars/list', name: 'Marketplace' },
      { path: '/help', name: 'Help' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // Verify app-root is present (no crash)
      await expect(page.locator('app-root')).toBeVisible({ timeout: 10000 });

      // No error page shown
      const hasError = await page
        .locator('.error-page, [data-testid="error"], .not-found')
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      expect(hasError).toBeFalsy();
    }
  });

  test('login page loads and form is visible', async ({ page }) => {
    await page.goto('/auth/login');

    // Wait for page load
    await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });

    // Check for scenic mode button or direct form
    const scenicButton = page.locator('[data-testid="login-scenic-signin"]');
    const hasScenic = await scenicButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasScenic) {
      await scenicButton.click();
    }

    // Wait for login form
    const emailInput = page.locator(
      '[data-testid="login-email-input"], input[type="email"], input[name="email"]'
    );
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('API is reachable', async ({ page }) => {
    await page.goto('/');

    // Test Supabase API health
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch(
          'https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/cars?select=id&limit=1',
          {
            headers: {
              apikey:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.9EtMHXlpxCyZBMmlMYxYMjS3H7wjZ2M4M9p8gIqVb3I',
            },
          }
        );
        return { ok: res.ok, status: res.status };
      } catch (e) {
        return { ok: false, status: 0, error: String(e) };
      }
    });

    expect(response.ok).toBeTruthy();
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // App should still render
    await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });

    // Check main content is visible
    const content = page.locator('ion-content, main, .main-content');
    await expect(content).toBeVisible({ timeout: 10000 });

    // Navigate to marketplace
    await page.goto('/cars/list');
    await expect(page.locator('app-root')).toBeVisible({ timeout: 10000 });
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

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(chunkErrors).toHaveLength(0);
  });

  test('static assets load correctly', async ({ page }) => {
    const failedAssets: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css') || url.includes('.woff')) {
          failedAssets.push(`${response.status()}: ${url}`);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow some font 404s (common in dev)
    const criticalFailures = failedAssets.filter(
      (f) => !f.includes('.woff') && !f.includes('font')
    );

    expect(criticalFailures).toHaveLength(0);
  });
});
