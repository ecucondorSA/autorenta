/**
 * Financial Assertions Helper
 *
 * Provides utility functions for validating financial data in E2E tests.
 * Used for settlement, payout, and wallet balance verification.
 */

import type { Page } from 'patchright';

// ==================== TYPES ====================

export interface SettlementData {
  bookingId: string;
  status: string;
  ownerAmount: number;
  platformFee: number;
  renterDepositReleased: boolean;
  damageDeduction?: number;
  totalAmount: number;
}

export interface WalletData {
  userId: string;
  availableBalance: number;
  blockedBalance: number;
  totalBalance: number;
}

export interface PayoutData {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccountId: string;
}

// ==================== CONSTANTS ====================

export const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform commission
export const OWNER_PERCENTAGE = 0.85; // 85% goes to owner
export const SETTLEMENT_TIMEOUT = 30000; // 30 seconds

// ==================== SETTLEMENT HELPERS ====================

/**
 * Fetches settlement data from the API via page context
 */
export async function getSettlementByBookingId(
  page: Page,
  bookingId: string,
): Promise<SettlementData | null> {
  return page.evaluate(async (bId: string) => {
    const supabase = (window as unknown as { supabase?: { from: (table: string) => unknown } }).supabase;
    if (!supabase) return null;

    const { data } = await (supabase.from('settlements') as {
      select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown }> } }
    })
      .select('*')
      .eq('booking_id', bId)
      .single();

    if (!data) return null;

    const settlement = data as Record<string, unknown>;
    return {
      bookingId: settlement.booking_id as string,
      status: settlement.status as string,
      ownerAmount: settlement.owner_amount as number,
      platformFee: settlement.platform_fee as number,
      renterDepositReleased: settlement.renter_deposit_released as boolean,
      damageDeduction: settlement.damage_deduction as number | undefined,
      totalAmount: settlement.total_amount as number,
    };
  }, bookingId);
}

/**
 * Fetches wallet data for a user
 */
export async function getWalletByUserId(
  page: Page,
  userId: string,
): Promise<WalletData | null> {
  return page.evaluate(async (uId: string) => {
    const supabase = (window as unknown as { supabase?: { from: (table: string) => unknown } }).supabase;
    if (!supabase) return null;

    const { data } = await (supabase.from('user_wallets') as {
      select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown }> } }
    })
      .select('*')
      .eq('user_id', uId)
      .single();

    if (!data) return null;

    const wallet = data as Record<string, unknown>;
    return {
      userId: wallet.user_id as string,
      availableBalance: wallet.available_balance as number,
      blockedBalance: wallet.blocked_balance as number,
      totalBalance: (wallet.available_balance as number) + (wallet.blocked_balance as number),
    };
  }, userId);
}

/**
 * Fetches payout data by ID
 */
export async function getPayoutById(
  page: Page,
  payoutId: string,
): Promise<PayoutData | null> {
  return page.evaluate(async (pId: string) => {
    const supabase = (window as unknown as { supabase?: { from: (table: string) => unknown } }).supabase;
    if (!supabase) return null;

    const { data } = await (supabase.from('payouts') as {
      select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown }> } }
    })
      .select('*')
      .eq('id', pId)
      .single();

    if (!data) return null;

    const payout = data as Record<string, unknown>;
    return {
      id: payout.id as string,
      userId: payout.user_id as string,
      amount: payout.amount as number,
      status: payout.status as PayoutData['status'],
      bankAccountId: payout.bank_account_id as string,
    };
  }, payoutId);
}

/**
 * Gets the latest payout for a user
 */
export async function getLatestPayoutForUser(
  page: Page,
  userId: string,
): Promise<PayoutData | null> {
  return page.evaluate(async (uId: string) => {
    const supabase = (window as unknown as { supabase?: { from: (table: string) => unknown } }).supabase;
    if (!supabase) return null;

    const { data } = await (supabase.from('payouts') as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => {
              single: () => Promise<{ data: unknown }>
            }
          }
        }
      }
    })
      .select('*')
      .eq('user_id', uId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const payout = data as Record<string, unknown>;
    return {
      id: payout.id as string,
      userId: payout.user_id as string,
      amount: payout.amount as number,
      status: payout.status as PayoutData['status'],
      bankAccountId: payout.bank_account_id as string,
    };
  }, userId);
}

// ==================== CALCULATION HELPERS ====================

/**
 * Calculates expected owner amount from booking total
 */
export function calculateOwnerAmount(bookingTotal: number): number {
  return Math.round(bookingTotal * OWNER_PERCENTAGE);
}

/**
 * Calculates expected platform fee from booking total
 */
export function calculatePlatformFee(bookingTotal: number): number {
  return Math.round(bookingTotal * PLATFORM_FEE_PERCENTAGE);
}

/**
 * Validates settlement calculations
 */
export function validateSettlementCalculations(
  settlement: SettlementData,
  expectedTotal: number,
  tolerance: number = 1, // Allow 1 unit tolerance for rounding
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const expectedOwnerAmount = calculateOwnerAmount(expectedTotal);
  const expectedPlatformFee = calculatePlatformFee(expectedTotal);

  if (Math.abs(settlement.ownerAmount - expectedOwnerAmount) > tolerance) {
    errors.push(
      `Owner amount mismatch: expected ~${expectedOwnerAmount}, got ${settlement.ownerAmount}`,
    );
  }

  if (Math.abs(settlement.platformFee - expectedPlatformFee) > tolerance) {
    errors.push(
      `Platform fee mismatch: expected ~${expectedPlatformFee}, got ${settlement.platformFee}`,
    );
  }

  const actualTotal = settlement.ownerAmount + settlement.platformFee + (settlement.damageDeduction || 0);
  if (Math.abs(actualTotal - expectedTotal) > tolerance) {
    errors.push(
      `Total mismatch: expected ~${expectedTotal}, got ${actualTotal}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== ASSERTION HELPERS ====================

/**
 * Asserts that a settlement was created correctly
 */
export function assertSettlementCreated(
  settlement: SettlementData | null,
  bookingId: string,
): void {
  if (!settlement) {
    throw new Error(`Settlement not found for booking ${bookingId}`);
  }

  if (settlement.bookingId !== bookingId) {
    throw new Error(
      `Settlement booking ID mismatch: expected ${bookingId}, got ${settlement.bookingId}`,
    );
  }

  if (!['completed', 'pending', 'processing'].includes(settlement.status)) {
    throw new Error(`Unexpected settlement status: ${settlement.status}`);
  }
}

/**
 * Asserts that wallet balance increased
 */
export function assertWalletIncreased(
  beforeBalance: number,
  afterBalance: number,
  expectedIncrease: number,
  tolerance: number = 1,
): void {
  const actualIncrease = afterBalance - beforeBalance;

  if (Math.abs(actualIncrease - expectedIncrease) > tolerance) {
    throw new Error(
      `Wallet balance increase mismatch: expected ~${expectedIncrease}, got ${actualIncrease}`,
    );
  }
}

/**
 * Asserts that deposit was released (blocked balance decreased to 0)
 */
export function assertDepositReleased(wallet: WalletData): void {
  if (wallet.blockedBalance !== 0) {
    throw new Error(
      `Deposit not fully released: blocked balance is ${wallet.blockedBalance}`,
    );
  }
}

/**
 * Asserts payout was created with correct status
 */
export function assertPayoutCreated(
  payout: PayoutData | null,
  expectedUserId: string,
  expectedAmount: number,
  tolerance: number = 1,
): void {
  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.userId !== expectedUserId) {
    throw new Error(
      `Payout user ID mismatch: expected ${expectedUserId}, got ${payout.userId}`,
    );
  }

  if (Math.abs(payout.amount - expectedAmount) > tolerance) {
    throw new Error(
      `Payout amount mismatch: expected ~${expectedAmount}, got ${payout.amount}`,
    );
  }

  if (!['pending', 'processing'].includes(payout.status)) {
    throw new Error(`Unexpected initial payout status: ${payout.status}`);
  }
}

// ==================== WAIT HELPERS ====================

/**
 * Waits for settlement to be created (polls until found or timeout)
 */
export async function waitForSettlement(
  page: Page,
  bookingId: string,
  timeout: number = SETTLEMENT_TIMEOUT,
): Promise<SettlementData> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const settlement = await getSettlementByBookingId(page, bookingId);
    if (settlement) {
      return settlement;
    }
    await page.waitForTimeout(1000);
  }

  throw new Error(`Settlement not created within ${timeout}ms for booking ${bookingId}`);
}

/**
 * Waits for payout to reach a terminal status
 */
export async function waitForPayoutCompletion(
  page: Page,
  payoutId: string,
  timeout: number = 60000,
): Promise<PayoutData> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const payout = await getPayoutById(page, payoutId);
    if (payout && ['completed', 'failed'].includes(payout.status)) {
      return payout;
    }
    await page.waitForTimeout(2000);
  }

  throw new Error(`Payout ${payoutId} did not complete within ${timeout}ms`);
}
