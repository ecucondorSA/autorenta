/**
 * Critical E2E Tests - Playwright
 *
 * @tags @critical
 *
 * These tests run on every PR and must pass before merge.
 * They validate the most critical user flows and detect runtime errors.
 *
 * ZERO TOLERANCE POLICY:
 * - Console errors → FAIL
 * - Font loading errors (OTS) → FAIL
 * - Network failures → FAIL
 * - JavaScript exceptions → FAIL
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

test.describe('Critical Flows @critical', () => {
  test('home page loads successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

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
        // Track JS, CSS and font failures
        if (url.includes('.js') || url.includes('.css') || url.includes('.woff') || url.includes('.ttf')) {
          failedAssets.push(`${response.status()}: ${url}`);
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    expect(failedAssets, `Failed assets: ${failedAssets.join(', ')}`).toHaveLength(0);
  });

  test('no critical JavaScript errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('pageerror', (error) => {
      if (isFatalError(error.message)) {
        criticalErrors.push(error.message);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(criticalErrors, `Critical JS errors: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// ZERO TOLERANCE CONSOLE ERROR TESTS
// ============================================

test.describe('Console Error Guardian @critical', () => {
  for (const url of CRITICAL_PAGES) {
    test(`zero console errors on ${url}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const networkFailures: string[] = [];

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

      // Capturar fallos de red (incluye fuentes, APIs)
      page.on('requestfailed', (request) => {
        const url = request.url();
        // Solo trackear recursos propios, no third-party
        if (!shouldIgnoreError(url)) {
          networkFailures.push(`[network] ${url} - ${request.failure()?.errorText}`);
        }
      });

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Dar tiempo a que carguen lazy components

      // Consolidar todos los errores
      const allErrors = [...consoleErrors, ...pageErrors, ...networkFailures];

      expect(allErrors, `Errors found on ${url}:\n${allErrors.join('\n')}`).toHaveLength(0);
    });
  }
});

// ============================================
// FONT LOADING TESTS (OTS Parsing)
// ============================================

test.describe('Font Loading Guardian @critical', () => {
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

    // También pueden aparecer como requestfailed
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf') || url.includes('.otf')) {
        fontErrors.push(`Font failed to load: ${url}`);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    expect(fontErrors, `Font errors: ${fontErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// API HEALTH TESTS
// ============================================

test.describe('API Health Guardian @critical', () => {
  test('Supabase API is reachable', async ({ page }) => {
    const apiErrors: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      // Detectar errores de Supabase
      if (url.includes('supabase.co') && response.status() >= 500) {
        apiErrors.push(`Supabase error ${response.status()}: ${url}`);
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('supabase.co')) {
        apiErrors.push(`Supabase request failed: ${url}`);
      }
    });

    await page.goto('/cars/list', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Dar tiempo a que cargue la lista

    expect(apiErrors, `API errors: ${apiErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================
// SMOKE TESTS
// ============================================

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

  test('critical pages are accessible', async ({ page }) => {
    for (const url of CRITICAL_PAGES) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Page ${url} returned ${response?.status()}`).toBeLessThan(400);
    }
  });
});
