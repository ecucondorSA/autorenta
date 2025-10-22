import { Page, expect, Locator } from '@playwright/test';

/**
 * Login Page Object
 *
 * Handles login form interactions and validation
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.loginButton = page.getByTestId('login-submit');
    this.registerLink = page.getByTestId('register-link');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');
    this.errorMessage = page.getByTestId('login-error');
    this.successMessage = page.getByTestId('login-success');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.emailInput).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async assertLoginSuccess(): Promise<void> {
    // Should redirect to dashboard or cars page
    await this.page.waitForURL(/\/(cars|dashboard)/);
  }

  async assertLoginError(expectedError: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedError);
  }

  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL('/auth/register');
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('/auth/reset-password');
  }
}
