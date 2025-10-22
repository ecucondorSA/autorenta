import { Page, expect, Locator } from '@playwright/test';

/**
 * Wallet Page Object
 *
 * Handles wallet balance, deposits, withdrawals, and transaction history
 *
 * Note: Adapted to use actual HTML structure (buttons, headings, text)
 * instead of data-testid attributes.
 */
export class WalletPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly depositButton: Locator;
  readonly withdrawButton: Locator;
  readonly transactionsTab: Locator;
  readonly withdrawalsTab: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main heading
    this.pageHeading = page.getByRole('heading', { name: 'Mi Wallet' });

    // Action buttons - use text content since no IDs
    this.depositButton = page.getByRole('button', { name: /depositar|configurar crédito/i });
    this.withdrawButton = page.getByRole('button', { name: /retirar/i });

    // Tab navigation
    this.transactionsTab = page.getByRole('button', { name: 'Transacciones' });
    this.withdrawalsTab = page.getByRole('button', { name: 'Retiros' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/wallet');
    // Wait for page to load by checking heading
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get balance from wallet balance card component
   * Note: Balance is shown in multiple places, we'll look for "USD" text
   */
  async getBalance(): Promise<number> {
    // Look for balance display - try to find USD amount
    const balanceText = await this.page.locator('text=/USD\\s+[\\d,\\.]+/').first().textContent();
    if (!balanceText) return 0;

    const match = balanceText.match(/[\d,\.]+/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  /**
   * Get protected credit balance
   */
  async getProtectedCredit(): Promise<number> {
    const protectedText = await this.page.getByText(/crédito protegido/i).first().textContent();
    if (!protectedText) return 0;

    const match = protectedText.match(/[\d,\.]+/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  /**
   * Get withdrawable balance
   */
  async getWithdrawableBalance(): Promise<number> {
    const withdrawableText = await this.page.getByText(/fondos retirables/i).first().textContent();
    if (!withdrawableText) return 0;

    const match = withdrawableText.match(/[\d,\.]+/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  /**
   * Click deposit button to open deposit modal
   */
  async clickDeposit(): Promise<void> {
    await this.depositButton.first().click();
    // Wait for modal to appear or URL change
    await this.page.waitForTimeout(1000); // Give modal time to appear
  }

  /**
   * Click withdraw button/tab
   */
  async clickWithdraw(): Promise<void> {
    await this.withdrawalsTab.click();
    // Verify we're on withdrawals tab
    await expect(this.page.getByRole('heading', { name: /gestión de retiros/i })).toBeVisible();
  }

  /**
   * Switch to transactions tab
   */
  async switchToTransactions(): Promise<void> {
    await this.transactionsTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Assert balance is approximately equal to expected
   */
  async assertBalance(expectedBalance: number, tolerance: number = 10): Promise<void> {
    const actualBalance = await this.getBalance();
    expect(actualBalance).toBeGreaterThanOrEqual(expectedBalance - tolerance);
    expect(actualBalance).toBeLessThanOrEqual(expectedBalance + tolerance);
  }

  /**
   * Check if deposit button is visible
   */
  async isDepositButtonVisible(): Promise<boolean> {
    return await this.depositButton.first().isVisible();
  }

  /**
   * Check if page loaded successfully
   */
  async isPageLoaded(): Promise<boolean> {
    return await this.pageHeading.isVisible();
  }
}
