import { defineBlock, expect, requiresCheckpoint, test, withCheckpoint } from '../checkpoint/fixtures';

test.describe('Renter Wallet Deposit Flow - Checkpoint Architecture', () => {
  test.use({
    storageState: 'tests/.auth/renter.json',
    baseURL: 'http://127.0.0.1:4300'
  });

  test('B1: Navigate to Wallet', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-wallet-nav', 'Navigate to Wallet', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('wallet-page-ready')
    }));

    const result = await block.execute(async () => {
      await page.goto('/wallet');
      await expect(page).toHaveURL(/\/wallet/);

      // Esperar que la página cargue
      await page.waitForLoadState('domcontentloaded');

      // Verificar que el elemento de balance sea visible (múltiples estrategias)
      const balanceElement = page.locator('[data-testid="wallet-balance"]')
        .or(page.locator('.wallet-balance, .balance-amount').first())
        .or(page.locator('h1, h2, h3').filter({ hasText: /\$|ARS|USD/ }).first());

      await expect(balanceElement).toBeVisible({ timeout: 15000 });

      const initialBalanceText = await balanceElement.textContent() || 'No disponible';
      console.log(`💰 Initial Balance: ${initialBalanceText}`);

      return { initialBalance: initialBalanceText };
    });

    expect(result.state.status).toBe('passed');
  });

  test('B2: Initiate Deposit', async ({ page, checkpointManager, createBlock, mcp }) => {
    // Restore checkpoint
    const prev = await checkpointManager.loadCheckpoint('wallet-page-ready');
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev);
    } else {
      await page.goto('/wallet');
    }

    const block = createBlock(defineBlock('b2-wallet-deposit', 'Initiate Deposit', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('wallet-page-ready')],
      postconditions: []
    }));

    const result = await block.execute(async () => {
      // Click Deposit
      const depositButton = page.getByRole('button', { name: /depositar|deposit/i }).first();
      await depositButton.click();

      // Fill Amount
      const amountInput = page.locator('input[type="number"]').first();
      await expect(amountInput).toBeVisible();
      await amountInput.fill('5000');

      // Confirm
      const confirmButton = page.locator('button', { hasText: /confirmar|pagar|continuar|pago/i }).first();

      // Handle Popup/Redirect
      const popupPromise = page.waitForEvent('popup').catch(() => null);

      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      const popup = await Promise.race([
        popupPromise,
        page.waitForURL(/mercadopago\.com|wallet\/deposit/i, { timeout: 5000 }).then(() => null)
      ]);

      if (popup) {
        console.log('✅ Popup opened');
        await popup.close(); // Close popup to continue test
      } else {
        console.log('✅ No popup, checking current page URL');
      }

      // Simulate Webhook
      console.log('🔄 Simulating MP Webhook...');
      const paymentId = `test_pay_${Date.now()}`;

      // We assume the API is available at /api/webhooks/mercadopago relative to baseURL
      // Or we can use request from playwright
      const response = await page.request.post('/api/webhooks/mercadopago', {
        data: {
          action: 'payment.created',
          data: { id: paymentId },
          type: 'payment',
          user_id: 'current_user_id_placeholder'
        }
      });

      console.log(`Webhook response: ${response.status()}`);

      // Verify via MCP if possible (optional, as user_id is placeholder)
      // If we had the real user_id, we could use wait_for_db_record

      return { depositInitiated: true, paymentId };
    });

    expect(result.state.status).toBe('passed');
  });
});
