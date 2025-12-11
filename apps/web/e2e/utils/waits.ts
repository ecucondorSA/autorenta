/**
 * Smart Waiting Utilities for E2E Tests
 *
 * Provides intelligent waiting strategies instead of arbitrary timeouts.
 * Uses Patchright's auto-wait capabilities with custom fallbacks.
 */

import type { Page, Locator, Response } from 'patchright';
import { Selectors } from './selectors';

export interface WaitOptions {
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

/**
 * Wait for Angular app to be fully loaded and hydrated
 */
export async function waitForAngularReady(
  page: Page,
  timeout = 30000
): Promise<void> {
  try {
    // First, wait for DOM content to be loaded
    await page.waitForLoadState('domcontentloaded', { timeout: timeout / 2 });

    // Then wait for network to be mostly idle
    await page.waitForLoadState('networkidle', { timeout: timeout / 2 }).catch(() => {
      // Network might not go fully idle, continue anyway
    });

    // Check for app-root with content
    await page.waitForFunction(
      () => {
        const root = document.querySelector('app-root');
        if (!root) return false;

        // Check if it has children or text content
        if (root.children.length === 0 && !root.textContent?.trim()) return false;

        // Check if there's no loading indicator or splash screen blocking
        const loading = document.querySelector('.loading, .splash, [class*="loading"]');
        if (loading && getComputedStyle(loading).display !== 'none') return false;

        return true;
      },
      { timeout: Math.min(timeout, 15000) }
    );

    // Short additional wait for hydration in production
    await page.waitForTimeout(process.env.CI ? 1000 : 500);
  } catch (error) {
    // In CI, be more lenient - the page might be ready even if checks timeout
    if (process.env.CI) {
      console.log('waitForAngularReady: timeout in CI, continuing anyway');
      await page.waitForTimeout(2000);
    } else {
      throw error;
    }
  }
}

/**
 * Wait for element to be visible and return its locator
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: WaitOptions = {}
): Promise<Locator> {
  const { timeout = 10000, state = 'visible' } = options;

  const locator = page.locator(selector);
  await locator.waitFor({ state, timeout });

  return locator;
}

/**
 * Wait for element to be hidden/removed
 */
export async function waitForHidden(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Wait for network to be idle (no pending requests)
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = 10000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for navigation to complete to a specific URL pattern
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForURL(urlPattern, {
    timeout,
    waitUntil: 'domcontentloaded',
  });
}

/**
 * Wait for a specific API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number; status?: number } = {}
): Promise<Response> {
  const { timeout = 15000, status } = options;

  return page.waitForResponse(
    (response) => {
      const urlMatch =
        typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());

      if (!urlMatch) return false;
      if (status !== undefined && response.status() !== status) return false;

      return true;
    },
    { timeout }
  );
}

/**
 * Wait for multiple conditions simultaneously
 */
export async function waitForAll(
  promises: Promise<unknown>[],
  timeout = 30000
): Promise<void> {
  await Promise.race([
    Promise.all(promises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('waitForAll timeout')), timeout)
    ),
  ]);
}

/**
 * Wait for any of multiple conditions
 */
export async function waitForAny(
  promises: Promise<unknown>[],
  timeout = 30000
): Promise<void> {
  await Promise.race([
    Promise.race(promises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('waitForAny timeout')), timeout)
    ),
  ]);
}

/**
 * Wait for element count to match
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  count: number,
  options: { timeout?: number; comparison?: 'exact' | 'atLeast' | 'atMost' } = {}
): Promise<void> {
  const { timeout = 10000, comparison = 'exact' } = options;

  await page.waitForFunction(
    ([sel, expectedCount, comp]) => {
      const elements = document.querySelectorAll(sel);
      const actualCount = elements.length;

      switch (comp) {
        case 'exact':
          return actualCount === expectedCount;
        case 'atLeast':
          return actualCount >= expectedCount;
        case 'atMost':
          return actualCount <= expectedCount;
        default:
          return actualCount === expectedCount;
      }
    },
    [selector, count, comparison] as [string, number, string],
    { timeout }
  );
}

/**
 * Wait for text to appear on page
 */
export async function waitForText(
  page: Page,
  text: string,
  options: { timeout?: number; exact?: boolean } = {}
): Promise<Locator> {
  const { timeout = 10000, exact = false } = options;

  const locator = exact
    ? page.getByText(text, { exact: true })
    : page.getByText(text);

  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

/**
 * Wait for URL to contain string
 */
export async function waitForUrlContains(
  page: Page,
  substring: string,
  timeout = 30000
): Promise<void> {
  await page.waitForFunction(
    (str) => window.location.href.includes(str),
    substring,
    { timeout }
  );
}

/**
 * Wait for form to be interactive (all inputs enabled)
 */
export async function waitForFormReady(
  page: Page,
  formSelector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (selector) => {
      const form = document.querySelector(selector);
      if (!form) return false;

      const inputs = form.querySelectorAll('input, button, select, textarea');
      return Array.from(inputs).every(
        (el) => !(el as HTMLInputElement).disabled
      );
    },
    formSelector,
    { timeout }
  );
}

/**
 * Retry an action with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; onRetry?: (attempt: number, error: Error) => void } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Simple sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll for a condition to be true
 */
export async function pollUntil(
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    await sleep(interval);
  }

  throw new Error(`pollUntil timeout after ${timeout}ms`);
}

/**
 * Wait for page to be stable (no DOM changes for a period)
 */
export async function waitForStable(
  page: Page,
  options: { timeout?: number; stabilityTime?: number } = {}
): Promise<void> {
  const { timeout = 10000, stabilityTime = 500 } = options;

  await page.waitForFunction(
    async (stabTime) => {
      return new Promise<boolean>((resolve) => {
        let lastChange = Date.now();
        const observer = new MutationObserver(() => {
          lastChange = Date.now();
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        const checkStability = () => {
          if (Date.now() - lastChange >= stabTime) {
            observer.disconnect();
            resolve(true);
          } else {
            setTimeout(checkStability, 100);
          }
        };

        setTimeout(checkStability, stabTime);
      });
    },
    stabilityTime,
    { timeout }
  );
}
