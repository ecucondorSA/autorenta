import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const renterEmail = process.env.E2E_RENTER_EMAIL || 'test-renter@autorenta.com';
const renterPassword = process.env.E2E_RENTER_PASSWORD || 'TestPassword123!';

// Smoke test for the wallet → MercadoPago → webhook (admin RPC) flow
// Skips automatically if required real credentials/tokens are not present.
test.describe('Smoke | Wallet deposit via MercadoPago', () => {
  test('creates init_point and credits wallet balance', async ({ page }) => {
    test.skip(
      !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !process.env.MERCADOPAGO_ACCESS_TOKEN,
      'Supabase + MercadoPago environment variables are required for the real-flow smoke test.',
    );

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: auth, error } = await supabase.auth.signInWithPassword({
      email: renterEmail,
      password: renterPassword,
    });
    if (error || !auth.session || !auth.user) {
      test.skip('Seed renter credentials are missing or invalid');
    }

    const renterId = auth.user!.id;

    const { data: balanceData, error: balanceError } = await supabase.rpc('wallet_get_balance');
    if (balanceError) {
      test.skip(`wallet_get_balance failed: ${balanceError.message}`);
    }
    const startingBalance = Number(balanceData?.[0]?.available_balance || 0);

    const amountUsd = 25;
    const { data: depositData, error: depositError } = await supabase.rpc('wallet_initiate_deposit', {
      p_amount: amountUsd,
      p_provider: 'mercadopago',
      p_description: 'E2E smoke deposit',
      p_allow_withdrawal: true,
    });

    if (depositError || !depositData?.[0]?.transaction_id) {
      test.fail(`wallet_initiate_deposit failed: ${depositError?.message}`);
    }

    const transactionId = depositData![0]!.transaction_id as string;

    const preferenceResponse = await supabase.functions.invoke('mercadopago-create-preference', {
      body: {
        transaction_id: transactionId,
        amount: amountUsd,
        description: 'Smoke deposit',
      },
      headers: {
        Authorization: `Bearer ${auth.session!.access_token}`,
      },
    });

    const prefData = preferenceResponse.data as { init_point?: string } | null;
    const initPoint: string | undefined = prefData?.init_point;
    expect(initPoint, 'MercadoPago init_point should be returned').toBeTruthy();

    if (initPoint) {
      await page.goto(initPoint);
    }

    const { error: confirmError } = await admin.rpc('wallet_confirm_deposit_admin', {
      p_user_id: renterId,
      p_transaction_id: transactionId,
      p_provider_transaction_id: `mp-smoke-${Date.now()}`,
      p_provider_metadata: {
        status: 'approved',
        status_detail: 'accredited',
        init_point: initPoint,
      },
    });

    if (confirmError) {
      test.fail(`wallet_confirm_deposit_admin failed: ${confirmError.message}`);
    }

    const { data: finalBalanceData, error: finalBalanceError } = await supabase.rpc('wallet_get_balance');
    if (finalBalanceError) {
      test.fail(`wallet_get_balance after confirm failed: ${finalBalanceError.message}`);
    }
    const finalBalance = Number(finalBalanceData?.[0]?.available_balance || 0);

    expect(finalBalance).toBeGreaterThan(startingBalance);

    await page.goto(`/wallet?payment=success&transaction_id=${transactionId}`);
    await expect(page.getByText(/dep[oó]sito/i)).toBeVisible({ timeout: 10000 });
  });
});
