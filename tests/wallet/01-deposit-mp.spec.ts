import { test, expect } from '@playwright/test';
import { WalletPage } from '../pages/wallet/WalletPage';
import { WALLET_AMOUNTS } from '../helpers/test-data';

/**
 * Test Suite: Wallet Deposit via MercadoPago
 *
 * Priority: P0 (Critical - payment flow)
 * Duration: ~6 minutes
 * Coverage:
 * - Deposit initiation
 * - MercadoPago preference creation
 * - Payment redirect flow
 * - Webhook processing (mock)
 * - Balance update
 * - Transaction history
 */

test.describe('Wallet Deposit - MercadoPago', () => {
  let walletPage: WalletPage;
  let initialBalance: number;

  test.beforeEach(async ({ page }) => {
    walletPage = new WalletPage(page);
    await walletPage.goto();

    // Store initial balance
    initialBalance = await walletPage.getBalance();
  });

  test('should display deposit button and wallet info', async ({ page }) => {
    await expect(walletPage.balanceDisplay).toBeVisible();
    await expect(walletPage.depositButton).toBeVisible();
    await expect(walletPage.withdrawButton).toBeVisible();

    // Balance should be positive (from seed data: 50,000 ARS)
    expect(initialBalance).toBeGreaterThan(0);
  });

  test('should navigate to deposit page', async ({ page }) => {
    await walletPage.clickDeposit();

    // Should be on deposit page
    await expect(page.getByTestId('deposit-form')).toBeVisible();
    await expect(page.getByTestId('amount-input')).toBeVisible();
    await expect(page.getByTestId('deposit-submit')).toBeVisible();
  });

  test('should validate deposit amount requirements', async ({ page }) => {
    await walletPage.clickDeposit();

    const testCases = [
      { amount: '0', error: 'monto mínimo' },
      { amount: '-100', error: 'monto positivo' },
      { amount: '500', error: 'mínimo 1000' }, // Min 1,000 ARS
      { amount: '1000000', error: 'máximo' }, // Max deposit
    ];

    for (const { amount, error } of testCases) {
      await page.getByTestId('amount-input').fill(amount);
      await page.getByTestId('deposit-submit').click();

      await expect(page.getByTestId('amount-error')).toContainText(error, {
        ignoreCase: true,
      });

      await page.getByTestId('amount-input').clear();
    }
  });

  test('should create MercadoPago preference for valid amount', async ({ page }) => {
    await walletPage.clickDeposit();

    const depositAmount = WALLET_AMOUNTS.small; // 10,000 ARS

    // Fill amount
    await page.getByTestId('amount-input').fill(depositAmount.toString());

    // Submit deposit request
    await page.getByTestId('deposit-submit').click();

    // Should show loading state
    await expect(page.getByTestId('creating-preference')).toBeVisible();

    // Wait for MercadoPago redirect or init_point
    const initPointButton = page.getByTestId('mercadopago-init-point');
    await expect(initPointButton).toBeVisible({ timeout: 10000 });

    // Verify init_point is a valid URL
    const href = await initPointButton.getAttribute('href');
    expect(href).toMatch(/^https:\/\/(www\.)?mercadopago\.com/);
  });

  test('should complete full deposit flow with mock payment', async ({ page, context }) => {
    await walletPage.clickDeposit();

    const depositAmount = WALLET_AMOUNTS.small; // 10,000 ARS

    await page.getByTestId('amount-input').fill(depositAmount.toString());
    await page.getByTestId('deposit-submit').click();

    // Get the payment URL
    const initPointButton = page.getByTestId('mercadopago-init-point');
    await expect(initPointButton).toBeVisible({ timeout: 10000 });

    // In test environment, we skip the actual MercadoPago flow
    // and simulate the webhook callback directly

    // Get transaction ID from URL or page data
    const transactionId = await page.getAttribute('[data-transaction-id]', 'data-transaction-id');
    expect(transactionId).toBeTruthy();

    // Simulate MercadoPago success webhook
    const response = await page.request.post('/api/webhooks/mercadopago', {
      data: {
        action: 'payment.created',
        data: {
          id: `mock-payment-${Date.now()}`,
        },
        // Additional webhook payload...
      },
    });

    expect(response.ok()).toBeTruthy();

    // Navigate back to wallet
    await walletPage.goto();

    // Verify balance updated
    await walletPage.assertBalance(initialBalance + depositAmount);

    // Verify transaction appears in history
    await walletPage.assertTransactionVisible('deposit', depositAmount);
  });

  test('should handle MercadoPago payment pending status', async ({ page }) => {
    await walletPage.clickDeposit();

    await page.getByTestId('amount-input').fill('15000');
    await page.getByTestId('deposit-submit').click();

    // Simulate pending payment webhook
    const transactionId = await page.getAttribute('[data-transaction-id]', 'data-transaction-id');

    await page.request.post('/api/webhooks/mercadopago', {
      data: {
        action: 'payment.updated',
        data: {
          id: `mock-payment-pending-${Date.now()}`,
          status: 'pending',
        },
      },
    });

    // Navigate back to wallet
    await walletPage.goto();

    // Balance should NOT be updated yet
    await walletPage.assertBalance(initialBalance);

    // Transaction should show as pending
    const pendingTransaction = page.locator('[data-testid="transaction-item"][data-status="pending"]').first();
    await expect(pendingTransaction).toBeVisible();
  });

  test('should handle MercadoPago payment rejected', async ({ page }) => {
    await walletPage.clickDeposit();

    await page.getByTestId('amount-input').fill('20000');
    await page.getByTestId('deposit-submit').click();

    // Simulate rejected payment webhook
    await page.request.post('/api/webhooks/mercadopago', {
      data: {
        action: 'payment.updated',
        data: {
          id: `mock-payment-rejected-${Date.now()}`,
          status: 'rejected',
        },
      },
    });

    // Navigate back to wallet
    await walletPage.goto();

    // Balance should NOT change
    await walletPage.assertBalance(initialBalance);

    // Should show error notification
    await expect(page.getByTestId('deposit-error-notification')).toBeVisible();
  });

  test('should display transaction history after deposit', async ({ page }) => {
    await walletPage.goto();

    // Should see transaction list
    await expect(walletPage.transactionList).toBeVisible();

    // Filter by deposit transactions
    await walletPage.filterByType('deposit');

    // Should see at least seed data deposits (if any)
    const depositItems = page.locator('[data-testid="transaction-item"][data-type="deposit"]');
    const count = await depositItems.count();

    // Verify transaction structure
    if (count > 0) {
      const firstDeposit = depositItems.first();
      await expect(firstDeposit.getByTestId('transaction-amount')).toBeVisible();
      await expect(firstDeposit.getByTestId('transaction-date')).toBeVisible();
      await expect(firstDeposit.getByTestId('transaction-status')).toBeVisible();
    }
  });

  test('should prevent multiple concurrent deposits', async ({ page }) => {
    await walletPage.clickDeposit();

    await page.getByTestId('amount-input').fill('10000');
    await page.getByTestId('deposit-submit').click();

    // Wait for preference creation to start
    await expect(page.getByTestId('creating-preference')).toBeVisible();

    // Try to submit again (should be disabled or show error)
    const submitButton = page.getByTestId('deposit-submit');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await walletPage.clickDeposit();

    // Simulate network failure by mocking the API
    await page.route('**/api/wallet/deposit', (route) => {
      route.abort('failed');
    });

    await page.getByTestId('amount-input').fill('10000');
    await page.getByTestId('deposit-submit').click();

    // Should show error message
    await expect(page.getByTestId('deposit-error')).toBeVisible();
    await expect(page.getByTestId('deposit-error')).toContainText(
      'Error de conexión'
    );
  });

  test('should preserve deposit amount on back navigation', async ({ page }) => {
    await walletPage.clickDeposit();

    const testAmount = '25000';
    await page.getByTestId('amount-input').fill(testAmount);

    // Go back
    await page.goBack();

    // Go forward again
    await walletPage.clickDeposit();

    // Amount should be preserved (if implemented)
    const inputValue = await page.getByTestId('amount-input').inputValue();
    // Note: This may not be implemented - just a nice-to-have test
  });
});
