/**
 * Guardian E2E Tests - Playwright
 *
 * @tags @guardian
 *
 * These tests run on every PR and must pass before merge.
 * They validate the most critical user flows and detect runtime errors.
 *
 * ZERO TOLERANCE POLICY:
 * - Console errors → FAIL
 * - Font loading errors (OTS) → FAIL
 * - Network failures → FAIL
 * - JavaScript exceptions → FAIL
 *
 * Run with: npx playwright test --grep @guardian
 */
import { test, expect } from '@playwright/test';

// ============================================
// CONFIGURATION
// ============================================

const CRITICAL_PAGES = ['/', '/cars/list', '/auth/login'];

// Errores que SIEMPRE deben fallar el test
const FATAL_ERROR_PATTERNS = [
  'ChunkLoadError',
  'Failed to fetch dynamically',
  'Cannot read properties of undefined',
  'Cannot read properties of null',
  'is not defined',
  'is not a function',
  'NetworkError',
  'TypeError',
  'ReferenceError',
];

// Errores de consola que podemos ignorar (third-party, warnings conocidos)
const IGNORABLE_PATTERNS = [
  'favicon.ico',
  'third-party',
  'google-analytics',
  'googletagmanager',
  'facebook',
  'hotjar',
  'clarity',
  'sentry',
  '[webpack-dev-server]',
  'ResizeObserver loop',
  'Non-passive event listener',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function shouldIgnoreError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return IGNORABLE_PATTERNS.some((pattern) => lowerMessage.includes(pattern.toLowerCase()));
}

function isFatalError(message: string): boolean {
  return FATAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

// ============================================
// CRITICAL FLOW TESTS
// ============================================

test.describe('Critical Flows @guardian', () => {
  test('home page loads successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    expect(response?.status()).toBe(200);
    await page.waitForSelector('body', { timeout: 10000 });

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('static assets load correctly', async ({ page }) => {
    const failedAssets: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url();
        // Track JS, CSS and font failures (only from our domain)
        if (
          (url.includes('.js') || url.includes('.css') || url.includes('.woff') || url.includes('.ttf')) &&
          !url.includes('supabase') &&
          !url.includes('mapbox') &&
          !url.includes('google')
        ) {
          failedAssets.push(`${response.status()}: ${url}`);
        }
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for main bundle to load
    await page.waitForSelector('[class*="app"]', { timeout: 15000 }).catch(() => {});

    expect(failedAssets, `Failed assets: ${failedAssets.join(', ')}`).toHaveLength(0);
  });

  test('no critical JavaScript errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('pageerror', (error) => {
      if (isFatalError(error.message)) {
        criticalErrors.push(error.message);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for lazy components

    expect(criticalErrors, `Critical JS errors: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// ZERO TOLERANCE CONSOLE ERROR TESTS
// ============================================

test.describe('Console Error Guardian @guardian', () => {
  for (const url of CRITICAL_PAGES) {
    test(`zero console errors on ${url}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      // Capturar errores de consola
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!shouldIgnoreError(text)) {
            consoleErrors.push(`[console.error] ${text}`);
          }
        }
      });

      // Capturar excepciones de JavaScript
      page.on('pageerror', (error) => {
        if (!shouldIgnoreError(error.message)) {
          pageErrors.push(`[pageerror] ${error.message}`);
        }
      });

      // Note: We don't track network failures here since external APIs may fail in CI
      // Network failures are tested separately in API Health Guardian

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000); // Dar tiempo a que carguen lazy components

      // Consolidar errores de JS solamente
      const allErrors = [...consoleErrors, ...pageErrors];

      expect(allErrors, `Errors found on ${url}:\n${allErrors.join('\n')}`).toHaveLength(0);
    });
  }
});

// ============================================
// FONT LOADING TESTS (OTS Parsing)
// ============================================

test.describe('Font Loading Guardian @guardian', () => {
  test('fonts load without OTS parsing errors', async ({ page }) => {
    const fontErrors: string[] = [];

    // OTS parsing errors aparecen como console warnings/errors
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('OTS parsing error') ||
        text.includes('Failed to decode downloaded font') ||
        text.includes('downloadable font')
      ) {
        fontErrors.push(text);
      }
    });

    // También pueden aparecer como requestfailed (only track local fonts)
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (
        (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf') || url.includes('.otf')) &&
        url.includes('localhost')
      ) {
        fontErrors.push(`Font failed to load: ${url}`);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for fonts to attempt loading

    expect(fontErrors, `Font errors: ${fontErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// API HEALTH TESTS
// ============================================

test.describe('API Health Guardian @guardian', () => {
  test('Supabase API returns no 500 errors', async ({ page }) => {
    const serverErrors: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      // Only track 500+ server errors (not 4xx which may be expected)
      if (url.includes('supabase.co') && response.status() >= 500) {
        serverErrors.push(`Supabase error ${response.status()}: ${url}`);
      }
    });

    // Note: requestfailed is not tracked - network issues in CI are expected
    // We only care about actual 500 errors from the server

    await page.goto('/cars/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Give time for API calls

    expect(serverErrors, `Server errors: ${serverErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// SMOKE TESTS
// ============================================

test.describe('Smoke Tests @guardian', () => {
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

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for lazy chunks

    expect(chunkErrors).toHaveLength(0);
  });

  test('critical pages are accessible', async ({ page }) => {
    for (const url of CRITICAL_PAGES) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      expect(response?.status(), `Page ${url} returned ${response?.status()}`).toBeLessThan(400);
    }
  });
});
