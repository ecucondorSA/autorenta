import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object
 *
 * All page objects should extend this class for common functionality.
 * Provides utility methods for waiting, navigation, and assertions.
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout = 10000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(locator: Locator, timeout = 10000): Promise<void> {
    await expect(locator).toBeHidden({ timeout });
  }

  /**
   * Fill input with value and wait for input event
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await this.page.waitForTimeout(100); // Wait for any debounced validations
  }

  /**
   * Click and wait for navigation
   */
  async clickAndNavigate(locator: Locator): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      locator.click()
    ]);
  }

  /**
   * Upload file to input
   */
  async uploadFile(locator: Locator, filePath: string): Promise<void> {
    await locator.setInputFiles(filePath);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Assert current URL contains path
   */
  async assertUrlContains(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * Assert page title
   */
  async assertTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string): Promise<void> {
    const toast = this.page.locator('[data-testid="toast"], .toast, ion-toast');
    await this.waitForVisible(toast);

    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    const spinner = this.page.locator('[data-testid="loading"], .spinner, ion-spinner');
    const isVisible = await spinner.isVisible().catch(() => false);

    if (isVisible) {
      await this.waitForHidden(spinner, 30000);
    }
  }

  /**
   * Take screenshot with name
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}
