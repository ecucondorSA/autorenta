import { expect, Locator, Page } from '@playwright/test';

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
    this.pageHeading = page.getByRole('heading', { name: 'Mi Wallet', level: 1 });

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
   * Robustly handles "USD 1,234.56", "$1,234.56", "1234.56 USD" etc.
   */
  async getBalance(): Promise<number> {
    // Try specific locator first, then fallback to generic text search
    const balanceElement = this.page.locator('.balance-amount, [data-testid="wallet-balance"]').first();
    let balanceText = '';

    if (await balanceElement.isVisible()) {
      balanceText = await balanceElement.textContent() || '';
    } else {
      // Fallback: Look for currency patterns
      const potentialElements = await this.page.getByText(/USD|\$|ARS/).all();
      for (const el of potentialElements) {
        const text = await el.textContent();
        if (text && /\d/.test(text) && (text.includes('USD') || text.includes('$'))) {
          balanceText = text;
          break;
        }
      }
    }

    if (!balanceText) return 0;

    // Remove non-numeric chars except dot and comma
    // Handle "1.000,00" vs "1,000.00" logic if needed, defaulting to US format for now
    // Assuming 1,234.56 format
    const cleanText = balanceText.replace(/[^0-9.]/g, '');
    return parseFloat(cleanText) || 0;
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
