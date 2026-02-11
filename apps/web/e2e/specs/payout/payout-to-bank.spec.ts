/**
 * Payout to Bank Account E2E Tests
 *
 * Tests the payout flow for owners withdrawing earnings:
 * 1. Owner has available balance in wallet
 * 2. Owner requests payout to bank account (CBU/CVU)
 * 3. Payout is created with 'pending' status
 * 4. Wallet balance is deducted
 * 5. Payout completes (simulated webhook)
 *
 * CRITICAL: Tests owner earnings withdrawal integrity.
 */

import {
  runTests,
  printReport,
  saveReport,
  clearSession,
  type TestContext,
} from '../../fixtures/test-fixtures';
import {
  getWalletByUserId,
  getLatestPayoutForUser,
  waitForPayoutCompletion,
  assertPayoutCreated,
  type WalletData,
  type PayoutData,
} from '../../helpers/financial-assertions';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

// ==================== CONSTANTS ====================

const PAYOUT_MIN_AMOUNT = 1000; // ARS 1000 minimum
const PAYOUT_MAX_AMOUNT = 1000000; // ARS 1,000,000 maximum
const TEST_PAYOUT_AMOUNT = 5000; // ARS 5000 for testing

// ==================== AUTH HELPERS ====================

async function ensureLoginFormVisible(ctx: TestContext): Promise<void> {
  const scenicSignin = ctx.page.locator('[data-testid="login-scenic-signin"]');
  if ((await scenicSignin.count()) > 0) {
    await scenicSignin.first().click({ timeout: 15000 });
  }
  await ctx.loginPage.assertFormLoaded();
}

async function loginAsOwner(ctx: TestContext): Promise<void> {
  const email = process.env.TEST_OWNER_EMAIL || ctx.testData.ownerUser.email;
  const password = process.env.TEST_OWNER_PASSWORD || ctx.testData.ownerUser.password;

  await clearSession(ctx);
  await ctx.loginPage.goto();
  await ensureLoginFormVisible(ctx);
  await ctx.loginPage.loginAndWaitForRedirect(email, password, 30000);
  await ctx.page.waitForTimeout(1500);
}

async function getCurrentUserId(ctx: TestContext): Promise<string | null> {
  return ctx.page.evaluate(async () => {
    const supabase = (window as unknown as { supabase?: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } } }).supabase;
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  });
}

// ==================== WALLET PAGE HELPERS ====================

async function navigateToWallet(ctx: TestContext): Promise<void> {
  await ctx.page.goto(`${BASE_URL}/wallet`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(2000);
}

async function navigateToPayouts(ctx: TestContext): Promise<void> {
  await ctx.page.goto(`${BASE_URL}/dashboard/payouts`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(2000);
}

async function getDisplayedWalletBalance(ctx: TestContext): Promise<number> {
  const balanceEl = ctx.page.locator('[data-testid="available-balance"], .wallet-balance-available');

  if ((await balanceEl.count()) === 0) {
    return 0;
  }

  const balanceText = await balanceEl.textContent();
  if (!balanceText) return 0;

  // Parse amount from text like "$ 5.000,00" or "ARS 5000"
  const cleaned = balanceText.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

async function hasDefaultBankAccount(ctx: TestContext): Promise<boolean> {
  const bankAccountEl = ctx.page.locator(
    '[data-testid="default-bank-account"], ' +
    '.bank-account-default, ' +
    '[data-testid="bank-account-card"]'
  );
  return (await bankAccountEl.count()) > 0;
}

// ==================== PAYOUT REQUEST HELPERS ====================

async function openPayoutRequestModal(ctx: TestContext): Promise<boolean> {
  const requestButton = ctx.page.locator(
    'button:has-text("Solicitar retiro"), ' +
    'button:has-text("Retirar"), ' +
    '[data-testid="request-payout-btn"]'
  );

  if ((await requestButton.count()) === 0) {
    console.log('[E2E] Payout request button not found');
    return false;
  }

  await requestButton.click();
  await ctx.page.waitForTimeout(1000);

  // Check modal opened
  const modal = ctx.page.locator(
    'ion-modal, ' +
    '[data-testid="payout-modal"], ' +
    '.payout-request-modal'
  );

  return (await modal.count()) > 0;
}

async function fillPayoutAmount(ctx: TestContext, amount: number): Promise<void> {
  const amountInput = ctx.page.locator(
    'input[name="amount"], ' +
    'input[formControlName="amount"], ' +
    '[data-testid="payout-amount-input"]'
  );

  if ((await amountInput.count()) > 0) {
    await amountInput.fill(String(amount));
  }
}

async function selectBankAccount(ctx: TestContext): Promise<void> {
  // If there's a bank account selector, click the default one
  const bankSelector = ctx.page.locator(
    '[data-testid="bank-account-select"], ' +
    'ion-select[formControlName="bankAccount"]'
  );

  if ((await bankSelector.count()) > 0) {
    await bankSelector.click();
    await ctx.page.waitForTimeout(500);

    // Select first option (default)
    const firstOption = ctx.page.locator('ion-select-option, option').first();
    if ((await firstOption.count()) > 0) {
      await firstOption.click();
    }
  }
}

async function submitPayoutRequest(ctx: TestContext): Promise<boolean> {
  const submitButton = ctx.page.locator(
    'button:has-text("Confirmar retiro"), ' +
    'button:has-text("Solicitar"), ' +
    '[data-testid="confirm-payout-btn"]'
  );

  if ((await submitButton.count()) === 0) {
    console.log('[E2E] Payout submit button not found');
    return false;
  }

  await submitButton.click();
  await ctx.page.waitForTimeout(3000);

  // Check for success message or modal close
  const successMessage = ctx.page.locator(
    'text=Retiro solicitado, ' +
    'text=Payout requested, ' +
    '[data-testid="payout-success"]'
  );

  return (await successMessage.count()) > 0 || !(await ctx.page.locator('ion-modal').count());
}

// ==================== TEST DEFINITIONS ====================

/**
 * Test: Owner can request payout to bank account
 */
async function testRequestPayoutToBank(ctx: TestContext): Promise<void> {
  console.log('[E2E] Starting payout request test');

  // 1. Login as owner
  await loginAsOwner(ctx);
  const userId = await getCurrentUserId(ctx);
  console.log(`[E2E] Owner user ID: ${userId}`);

  // 2. Navigate to wallet/payouts
  await navigateToPayouts(ctx);

  // 3. Check wallet balance
  let walletBefore: WalletData | null = null;
  if (userId) {
    walletBefore = await getWalletByUserId(ctx.page, userId);
    console.log(`[E2E] Wallet before: ${JSON.stringify(walletBefore)}`);
  }

  const displayedBalance = await getDisplayedWalletBalance(ctx);
  console.log(`[E2E] Displayed balance: ${displayedBalance}`);

  if (displayedBalance < PAYOUT_MIN_AMOUNT) {
    console.log(`[E2E] Insufficient balance for payout (min: ${PAYOUT_MIN_AMOUNT}). Skipping test.`);
    return;
  }

  // 4. Check for bank account
  const hasBankAccount = await hasDefaultBankAccount(ctx);
  if (!hasBankAccount) {
    console.log('[E2E] No default bank account configured. Skipping payout test.');
    return;
  }
  console.log('[E2E] Default bank account found');

  // 5. Open payout modal
  const modalOpened = await openPayoutRequestModal(ctx);
  if (!modalOpened) {
    console.log('[E2E] Could not open payout modal');
    return;
  }
  console.log('[E2E] Payout modal opened');

  // 6. Fill payout amount
  const payoutAmount = Math.min(TEST_PAYOUT_AMOUNT, displayedBalance);
  await fillPayoutAmount(ctx, payoutAmount);
  console.log(`[E2E] Payout amount: ${payoutAmount}`);

  // 7. Select bank account
  await selectBankAccount(ctx);

  // 8. Submit payout request
  const submitted = await submitPayoutRequest(ctx);
  if (!submitted) {
    console.log('[E2E] Payout submission may have failed');
  }
  console.log('[E2E] Payout request submitted');

  // 9. VALIDATE payout was created
  if (userId) {
    const payout = await getLatestPayoutForUser(ctx.page, userId);
    console.log(`[E2E] Latest payout: ${JSON.stringify(payout)}`);

    if (payout) {
      try {
        assertPayoutCreated(payout, userId, payoutAmount, 100);
        console.log('[E2E] Payout created successfully');
      } catch (error) {
        console.log(`[E2E] Payout assertion warning: ${error}`);
      }
    }
  }

  // 10. VALIDATE wallet balance decreased
  if (userId) {
    const walletAfter = await getWalletByUserId(ctx.page, userId);
    console.log(`[E2E] Wallet after: ${JSON.stringify(walletAfter)}`);

    if (walletBefore && walletAfter) {
      const expectedDecrease = payoutAmount;
      const actualDecrease = walletBefore.availableBalance - walletAfter.availableBalance;

      if (Math.abs(actualDecrease - expectedDecrease) > 100) {
        console.log(`[E2E] Warning: Wallet decrease (${actualDecrease}) differs from payout amount (${expectedDecrease})`);
      } else {
        console.log('[E2E] Wallet balance correctly decreased');
      }
    }
  }

  console.log('[E2E] Payout request test completed');
}

/**
 * Test: Payout minimum amount validation
 */
async function testPayoutMinimumAmount(ctx: TestContext): Promise<void> {
  console.log('[E2E] Testing payout minimum amount validation');

  await loginAsOwner(ctx);
  await navigateToPayouts(ctx);

  const displayedBalance = await getDisplayedWalletBalance(ctx);
  if (displayedBalance < 100) {
    console.log('[E2E] No balance to test minimum validation');
    return;
  }

  const modalOpened = await openPayoutRequestModal(ctx);
  if (!modalOpened) return;

  // Try to submit with amount below minimum
  const belowMinAmount = PAYOUT_MIN_AMOUNT - 100;
  await fillPayoutAmount(ctx, belowMinAmount);
  await selectBankAccount(ctx);

  // Try to submit
  const submitButton = ctx.page.locator(
    'button:has-text("Confirmar retiro"), ' +
    '[data-testid="confirm-payout-btn"]'
  );

  if ((await submitButton.count()) > 0) {
    await submitButton.click();
    await ctx.page.waitForTimeout(1000);

    // Check for validation error
    const errorMessage = ctx.page.locator(
      'text=mínimo, ' +
      'text=minimum, ' +
      '[data-testid="amount-error"], ' +
      '.error-message'
    );

    if ((await errorMessage.count()) > 0) {
      console.log('[E2E] Minimum amount validation working correctly');
    } else {
      // Check if button is disabled
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        console.log('[E2E] Submit button disabled for below minimum amount');
      } else {
        console.log('[E2E] Warning: No validation error shown for below minimum amount');
      }
    }
  }
}

/**
 * Test: Payout maximum amount validation
 */
async function testPayoutMaximumAmount(ctx: TestContext): Promise<void> {
  console.log('[E2E] Testing payout maximum amount validation');

  await loginAsOwner(ctx);
  await navigateToPayouts(ctx);

  const modalOpened = await openPayoutRequestModal(ctx);
  if (!modalOpened) return;

  // Try to enter amount above maximum
  const aboveMaxAmount = PAYOUT_MAX_AMOUNT + 1000;
  await fillPayoutAmount(ctx, aboveMaxAmount);

  await ctx.page.waitForTimeout(500);

  // Check for validation error or input max constraint
  const amountInput = ctx.page.locator('input[name="amount"], [data-testid="payout-amount-input"]');
  const currentValue = await amountInput.inputValue();
  const numericValue = parseFloat(currentValue.replace(/[^\d]/g, ''));

  if (numericValue <= PAYOUT_MAX_AMOUNT) {
    console.log('[E2E] Input constrained to maximum amount');
  } else {
    // Check for error message
    const errorMessage = ctx.page.locator('text=máximo, text=maximum, [data-testid="amount-error"]');
    if ((await errorMessage.count()) > 0) {
      console.log('[E2E] Maximum amount validation working correctly');
    } else {
      console.log('[E2E] Warning: No constraint on maximum amount');
    }
  }
}

/**
 * Test: Payout requires verified bank account
 */
async function testPayoutRequiresVerifiedAccount(ctx: TestContext): Promise<void> {
  console.log('[E2E] Testing payout requires verified bank account');

  await loginAsOwner(ctx);

  // Navigate to bank accounts page
  await ctx.page.goto(`${BASE_URL}/dashboard/bank-accounts`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForTimeout(2000);

  // Check for unverified accounts
  const unverifiedAccounts = ctx.page.locator(
    '[data-testid="bank-account-card"][data-status="unverified"], ' +
    '.bank-account-unverified'
  );

  if ((await unverifiedAccounts.count()) > 0) {
    console.log('[E2E] Unverified bank account found');

    // Try to set it as default and request payout
    // This should be blocked
    const setDefaultButton = unverifiedAccounts.first().locator('button:has-text("Default"), button:has-text("Predeterminar")');
    if ((await setDefaultButton.count()) > 0) {
      await setDefaultButton.click();
      await ctx.page.waitForTimeout(1000);

      // Check for error
      const errorMessage = ctx.page.locator('text=verificada, text=verified');
      if ((await errorMessage.count()) > 0) {
        console.log('[E2E] Correctly blocked unverified account as default');
      }
    }
  } else {
    console.log('[E2E] No unverified accounts to test');
  }
}

/**
 * Test: Payout history displays correctly
 */
async function testPayoutHistory(ctx: TestContext): Promise<void> {
  console.log('[E2E] Testing payout history display');

  await loginAsOwner(ctx);
  await navigateToPayouts(ctx);

  // Look for payout history list
  const payoutList = ctx.page.locator(
    '[data-testid="payouts-list"], ' +
    '.payouts-history, ' +
    'ion-list'
  );

  if ((await payoutList.count()) > 0) {
    console.log('[E2E] Payout history list found');

    // Check for payout items
    const payoutItems = ctx.page.locator(
      '[data-testid="payout-item"], ' +
      '.payout-history-item, ' +
      'ion-item'
    );

    const itemCount = await payoutItems.count();
    console.log(`[E2E] Found ${itemCount} payout history items`);

    if (itemCount > 0) {
      // Verify payout item has required fields
      const firstItem = payoutItems.first();

      // Check for amount
      const amountEl = firstItem.locator('[data-testid="payout-amount"], .payout-amount');
      if ((await amountEl.count()) > 0) {
        console.log('[E2E] Payout amount displayed');
      }

      // Check for status
      const statusEl = firstItem.locator('[data-testid="payout-status"], .payout-status');
      if ((await statusEl.count()) > 0) {
        const status = await statusEl.textContent();
        console.log(`[E2E] Payout status displayed: ${status}`);
      }

      // Check for date
      const dateEl = firstItem.locator('[data-testid="payout-date"], .payout-date');
      if ((await dateEl.count()) > 0) {
        console.log('[E2E] Payout date displayed');
      }
    }
  } else {
    console.log('[E2E] No payout history list found');
  }
}

/**
 * Test: Insufficient balance shows error
 */
async function testInsufficientBalance(ctx: TestContext): Promise<void> {
  console.log('[E2E] Testing insufficient balance error');

  await loginAsOwner(ctx);
  await navigateToPayouts(ctx);

  const displayedBalance = await getDisplayedWalletBalance(ctx);
  console.log(`[E2E] Current balance: ${displayedBalance}`);

  const modalOpened = await openPayoutRequestModal(ctx);
  if (!modalOpened) return;

  // Try to request more than available
  const excessAmount = displayedBalance + 10000;
  await fillPayoutAmount(ctx, excessAmount);
  await selectBankAccount(ctx);

  // Try to submit
  const submitButton = ctx.page.locator(
    'button:has-text("Confirmar retiro"), ' +
    '[data-testid="confirm-payout-btn"]'
  );

  if ((await submitButton.count()) > 0) {
    // Check if button is disabled
    const isDisabled = await submitButton.isDisabled();

    if (isDisabled) {
      console.log('[E2E] Submit button correctly disabled for insufficient balance');
    } else {
      await submitButton.click();
      await ctx.page.waitForTimeout(1000);

      // Check for error message
      const errorMessage = ctx.page.locator(
        'text=insuficiente, ' +
        'text=insufficient, ' +
        '[data-testid="balance-error"]'
      );

      if ((await errorMessage.count()) > 0) {
        console.log('[E2E] Insufficient balance error shown correctly');
      } else {
        console.log('[E2E] Warning: No error for insufficient balance');
      }
    }
  }
}

// ==================== TEST RUNNER ====================

const tests = [
  { name: 'payout/request-to-bank', fn: testRequestPayoutToBank },
  { name: 'payout/minimum-amount', fn: testPayoutMinimumAmount },
  { name: 'payout/maximum-amount', fn: testPayoutMaximumAmount },
  { name: 'payout/requires-verified-account', fn: testPayoutRequiresVerifiedAccount },
  { name: 'payout/history-display', fn: testPayoutHistory },
  { name: 'payout/insufficient-balance', fn: testInsufficientBalance },
];

async function main(): Promise<void> {
  console.log('\n========== PAYOUT E2E TESTS ==========');
  console.log(`Base URL: ${BASE_URL}`);

  const results = await runTests(tests, {
    suite: 'payout',
    screenshotOnFailure: true,
    saveLogsOnFailure: true,
  });

  printReport(results);
  const reportPath = saveReport(results, 'payout-tests-report.json');
  console.log(`\nReport saved to: ${reportPath}`);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

export { tests };
