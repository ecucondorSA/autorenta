/**
 * Base Page Object
 *
 * Abstract base class for all page objects.
 * Provides common methods for navigation, interactions, and assertions.
 */

import type { Page, BrowserContext, Locator } from 'patchright';
import { config } from '../patchright.config';
import { Selectors } from '../utils/selectors';
import { NetworkLogger } from '../utils/network-logger';
import {
  waitForAngularReady,
  waitForElement,
  waitForHidden,
  waitForNavigation,
  waitForNetworkIdle,
  waitForText,
  sleep,
} from '../utils/waits';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly context: BrowserContext;
  protected readonly networkLogger: NetworkLogger;
  protected readonly selectors = Selectors;

  constructor(page: Page, context: BrowserContext, networkLogger: NetworkLogger) {
    this.page = page;
    this.context = context;
    this.networkLogger = networkLogger;
  }

  // ==================== NAVIGATION ====================

  /**
   * Navigate to a path within the app
   */
  async navigate(path: string): Promise<void> {
    const url = `${config.baseUrl}${path}`;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });
    await this.waitForReady();
  }

  /**
   * Navigate with debug mode enabled
   */
  async navigateWithDebug(path: string): Promise<void> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${config.baseUrl}${path}${separator}debug=1`;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });
    await this.waitForReady();
  }

  /**
   * Wait for Angular app to be ready
   */
  async waitForReady(): Promise<void> {
    await waitForAngularReady(this.page, config.timeout);
  }

  /**
   * Wait for network to be idle
   */
  async waitForIdle(): Promise<void> {
    await waitForNetworkIdle(this.page);
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // ==================== ELEMENT INTERACTIONS ====================

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.click();
  }

  /**
   * Double click an element
   */
  async doubleClick(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.dblclick();
  }

  /**
   * Fill an input field (clears first)
   */
  async fill(selector: string, value: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.fill(value);
  }

  /**
   * Type text character by character (for special inputs)
   */
  async type(selector: string, value: string, delay = 50): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.click();
    await this.page.keyboard.type(value, { delay });
  }

  /**
   * Clear an input field
   */
  async clear(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.clear();
  }

  /**
   * Select option from dropdown
   */
  async select(selector: string, value: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.selectOption(value);
  }

  /**
   * Check a checkbox
   */
  async check(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.check();
  }

  /**
   * Uncheck a checkbox
   */
  async uncheck(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.uncheck();
  }

  /**
   * Hover over an element
   */
  async hover(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.hover();
  }

  /**
   * Focus an element
   */
  async focus(selector: string): Promise<void> {
    const locator = await waitForElement(this.page, selector);
    await locator.focus();
  }

  /**
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  // ==================== ELEMENT QUERIES ====================

  /**
   * Get element locator
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Get text content of element
   */
  async getText(selector: string): Promise<string> {
    const locator = await waitForElement(this.page, selector);
    return (await locator.textContent()) || '';
  }

  /**
   * Get input value
   */
  async getValue(selector: string): Promise<string> {
    const locator = await waitForElement(this.page, selector);
    return locator.inputValue();
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    const locator = await waitForElement(this.page, selector);
    return locator.getAttribute(attribute);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check if checkbox is checked
   */
  async isChecked(selector: string): Promise<boolean> {
    return this.page.locator(selector).isChecked();
  }

  /**
   * Count elements matching selector
   */
  async count(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  // ==================== WAITS ====================

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout?: number): Promise<Locator> {
    return waitForElement(this.page, selector, {
      timeout: timeout || config.timeout,
      state: 'visible',
    });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout?: number): Promise<void> {
    await waitForHidden(this.page, selector, timeout || config.timeout);
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string, timeout?: number): Promise<Locator> {
    return waitForText(this.page, text, { timeout: timeout || config.timeout });
  }

  /**
   * Wait for navigation to URL pattern
   */
  async waitForUrl(pattern: string | RegExp, timeout?: number): Promise<void> {
    await waitForNavigation(this.page, pattern, timeout || config.timeout);
  }

  /**
   * Simple wait (use sparingly - prefer smart waits)
   */
  async wait(ms: number): Promise<void> {
    await sleep(ms);
  }

  // ==================== URL & TITLE ====================

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Get current path (without base URL)
   */
  getPath(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Check if current URL contains string
   */
  urlContains(substring: string): boolean {
    return this.page.url().includes(substring);
  }

  // ==================== STORAGE ====================

  /**
   * Clear all storage (localStorage, sessionStorage, cookies)
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.context.clearCookies();
  }

  /**
   * Set localStorage item
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ([k, v]) => localStorage.setItem(k, v),
      [key, value]
    );
  }

  /**
   * Get localStorage item
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Remove localStorage item
   */
  async removeLocalStorage(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }

  /**
   * Set sessionStorage item
   */
  async setSessionStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ([k, v]) => sessionStorage.setItem(k, v),
      [key, value]
    );
  }

  /**
   * Get sessionStorage item
   */
  async getSessionStorage(key: string): Promise<string | null> {
    return this.page.evaluate((k) => sessionStorage.getItem(k), key);
  }

  // ==================== SCREENSHOTS ====================

  /**
   * Take screenshot
   */
  async screenshot(name?: string): Promise<string> {
    const filename = name || `screenshot-${Date.now()}`;
    const path = `${config.reportsDir}/${filename}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Take element screenshot
   */
  async screenshotElement(selector: string, name?: string): Promise<string> {
    const locator = await waitForElement(this.page, selector);
    const filename = name || `element-${Date.now()}`;
    const path = `${config.reportsDir}/${filename}.png`;
    await locator.screenshot({ path });
    return path;
  }

  // ==================== EXECUTE SCRIPT ====================

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(script: string | (() => T)): Promise<T> {
    return this.page.evaluate(script as () => T);
  }

  /**
   * Execute JavaScript with argument
   */
  async evaluateWithArg<T, A>(fn: (arg: A) => T, arg: A): Promise<T> {
    return this.page.evaluate(fn, arg);
  }

  // ==================== NETWORK LOGGING ====================

  /**
   * Get network logger instance
   */
  getNetworkLogger(): NetworkLogger {
    return this.networkLogger;
  }

  /**
   * Check if API was called
   */
  wasApiCalled(pattern: string | RegExp): boolean {
    return this.networkLogger.wasApiCalled(pattern);
  }

  /**
   * Get API calls matching pattern
   */
  getApiCalls(pattern?: string | RegExp) {
    return this.networkLogger.getApiCalls(pattern);
  }

  /**
   * Check for page errors
   */
  hasErrors(): boolean {
    return this.networkLogger.hasErrors();
  }

  /**
   * Get page errors
   */
  getErrors() {
    return this.networkLogger.getPageErrors();
  }
}
