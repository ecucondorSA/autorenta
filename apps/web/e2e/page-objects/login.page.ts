/**
 * Login Page Object
 *
 * Encapsulates all interactions with the login page.
 * Uses correct data-testid selectors discovered from the actual DOM.
 */

import type { Page, BrowserContext } from 'patchright';
import { BasePage } from './base.page';
import { NetworkLogger } from '../utils/network-logger';
import { waitForElement, waitForNavigation, retryAction } from '../utils/waits';

export class LoginPage extends BasePage {
  // Page-specific selectors (from centralized registry)
  private get emailInput() {
    return this.selectors.login.emailInput;
  }
  private get passwordInput() {
    return this.selectors.login.passwordInput;
  }
  private get submitButton() {
    return this.selectors.login.submitButton;
  }
  private get googleButton() {
    return this.selectors.login.googleButton;
  }
  private get errorMessage() {
    return this.selectors.login.errorMessage;
  }
  private get forgotPasswordLink() {
    return this.selectors.login.forgotPasswordLink;
  }
  private get registerLink() {
    return this.selectors.login.registerLink;
  }

  constructor(page: Page, context: BrowserContext, networkLogger: NetworkLogger) {
    super(page, context, networkLogger);
  }

  // ==================== NAVIGATION ====================

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.navigate('/auth/login');
  }

  /**
   * Navigate to login page with debug mode
   */
  async gotoWithDebug(): Promise<void> {
    await this.navigateWithDebug('/auth/login');
  }

  /**
   * Check if currently on login page
   */
  isOnLoginPage(): boolean {
    return this.urlContains('/auth/login');
  }

  // ==================== FORM INTERACTIONS ====================

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password);
  }

  /**
   * Click submit/login button
   */
  async clickSubmit(): Promise<void> {
    await this.click(this.submitButton);
  }

  /**
   * Click Google sign-in button
   */
  async clickGoogleSignIn(): Promise<void> {
    await this.click(this.googleButton);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
  }

  /**
   * Click register link
   */
  async clickRegister(): Promise<void> {
    await this.click(this.registerLink);
  }

  // ==================== LOGIN FLOWS ====================

  /**
   * Complete login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Login and wait for successful navigation away from login page
   */
  async loginAndWaitForRedirect(
    email: string,
    password: string,
    timeout = 30000
  ): Promise<void> {
    await this.login(email, password);

    // Wait for navigation away from login page
    await waitForNavigation(
      this.page,
      (url) => !url.includes('/auth/login'),
      timeout
    );
  }

  /**
   * Login with retry on failure
   */
  async loginWithRetry(
    email: string,
    password: string,
    maxRetries = 3
  ): Promise<boolean> {
    return retryAction(
      async () => {
        await this.login(email, password);
        await this.wait(2000);

        // Check if still on login (means failed)
        if (this.isOnLoginPage()) {
          const error = await this.getErrorMessage();
          if (error) {
            throw new Error(`Login failed: ${error}`);
          }
        }

        return !this.isOnLoginPage();
      },
      { maxRetries }
    );
  }

  // ==================== FORM STATE ====================

  /**
   * Get error message if displayed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const locator = this.page.locator(this.errorMessage);
      const isVisible = await locator.isVisible({ timeout: 2000 });
      if (isVisible) {
        return (await locator.textContent())?.trim() || null;
      }
    } catch {
      // No error visible
    }
    return null;
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    const error = await this.getErrorMessage();
    return error !== null;
  }

  /**
   * Check if form fields are visible
   */
  async isFormVisible(): Promise<boolean> {
    const emailVisible = await this.isVisible(this.emailInput);
    const passwordVisible = await this.isVisible(this.passwordInput);
    const submitVisible = await this.isVisible(this.submitButton);

    return emailVisible && passwordVisible && submitVisible;
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return this.isEnabled(this.submitButton);
  }

  /**
   * Get email input value
   */
  async getEmailValue(): Promise<string> {
    return this.getValue(this.emailInput);
  }

  /**
   * Get password input value (returns asterisks for security)
   */
  async getPasswordLength(): Promise<number> {
    const value = await this.getValue(this.passwordInput);
    return value.length;
  }

  // ==================== ASSERTIONS ====================

  /**
   * Assert login form is loaded and visible
   */
  async assertFormLoaded(): Promise<void> {
    await waitForElement(this.page, this.emailInput, { timeout: 15000 });
    await waitForElement(this.page, this.passwordInput, { timeout: 5000 });
    await waitForElement(this.page, this.submitButton, { timeout: 5000 });
  }

  /**
   * Assert login was successful (navigated away from login page)
   */
  async assertLoginSuccess(timeout = 10000): Promise<void> {
    await waitForNavigation(
      this.page,
      (url) => !url.includes('/auth/login'),
      timeout
    );
  }

  /**
   * Assert login failed with error message
   */
  async assertLoginFailed(): Promise<void> {
    // Should still be on login page
    if (!this.isOnLoginPage()) {
      throw new Error('Expected to stay on login page after failed login');
    }

    // Wait a bit for error to appear
    await this.wait(1000);

    // Should have error message (optional - some failures don't show message)
    const error = await this.getErrorMessage();
    if (error) {
      console.log(`Login error: ${error}`);
    }
  }

  /**
   * Assert Google button is visible
   */
  async assertGoogleButtonVisible(): Promise<void> {
    await waitForElement(this.page, this.googleButton);
  }

  /**
   * Assert page title contains expected text
   */
  async assertTitle(expectedSubstring: string): Promise<void> {
    const title = await this.getTitle();
    if (!title.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      throw new Error(
        `Expected title to contain "${expectedSubstring}", got: "${title}"`
      );
    }
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Trigger email validation by focusing and blurring
   */
  async triggerEmailValidation(): Promise<void> {
    await this.focus(this.emailInput);
    await this.pressKey('Tab');
  }

  /**
   * Trigger password validation by focusing and blurring
   */
  async triggerPasswordValidation(): Promise<void> {
    await this.focus(this.passwordInput);
    await this.pressKey('Tab');
  }

  /**
   * Check if email has validation error class
   */
  async hasEmailError(): Promise<boolean> {
    const classes = await this.getAttribute(this.emailInput, 'class');
    return classes?.includes('border-error') || false;
  }

  /**
   * Check if password has validation error class
   */
  async hasPasswordError(): Promise<boolean> {
    const classes = await this.getAttribute(this.passwordInput, 'class');
    return classes?.includes('border-error') || false;
  }
}
