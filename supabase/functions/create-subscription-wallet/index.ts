/**
 * Supabase Edge Function: create-subscription-wallet
 *
 * Charges the user's wallet balance and creates an Autorentar Club subscription.
 * Uses wallet_transfer to move funds to the platform account and then calls
 * create_subscription via RPC.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('CreateSubscriptionWallet');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Subscription tier configurations - MONTHLY billing
// Source of truth: apps/web/src/app/core/models/subscription.model.ts
const SUBSCRIPTION_TIERS = {
  club_standard: {
    name: 'Club Access',
    price_cents: 1999,       // USD 19.99/mes
    price_usd: 19.99,
    coverage_limit_cents: 300000,  // USD 3,000
    coverage_limit_usd: 3000,
  },
  club_black: {
    name: 'Silver Access',
    price_cents: 3499,       // USD 34.99/mes
    price_usd: 34.99,
    coverage_limit_cents: 600000,  // USD 6,000
    coverage_limit_usd: 6000,
  },
  club_luxury: {
    name: 'Black Access',
    price_cents: 6999,       // USD 69.99/mes
    price_usd: 69.99,
    coverage_limit_cents: 1500000, // USD 15,000
    coverage_limit_usd: 15000,
  },
} as const;

type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface CreateSubscriptionWalletRequest {
  tier: SubscriptionTier;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreateSubscriptionWalletRequest = await req.json();
    const { tier } = body;

    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      return new Response(JSON.stringify({ error: 'Invalid tier. Must be club_standard, club_black, or club_luxury' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier];

    const idempotencyKey =
      req.headers.get('Idempotency-Key') || `subscription-wallet-${user.id}-${tier}-${Date.now()}`;

    log.info('Charging wallet for subscription', {
      userId: user.id,
      tier,
      amount_cents: tierConfig.price_cents,
      ref: idempotencyKey,
    });

    // Call RPC function with error handling for the RPC call itself
    let result, chargeError;
    try {
      const response = await supabase.rpc('create_subscription_with_wallet', {
        p_user_id: user.id,
        p_tier: tier,
        p_ref: idempotencyKey,
        p_description: `Membresía ${tierConfig.name} (Autorentar Club)`,
        p_meta: {
          type: 'subscription',
          tier,
          initiated_at: new Date().toISOString(),
        },
      });
      result = response.data;
      chargeError = response.error;
    } catch (rpcErr) {
      log.error('RPC execution exception', rpcErr);
      return new Response(
        JSON.stringify({
          error: 'RPC execution failed',
          message: rpcErr instanceof Error ? rpcErr.message : 'Unknown RPC error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (chargeError) {
      const msg = chargeError.message || 'Charge failed';
      const msgLower = msg.toLowerCase();
      
      let status = 500;
      let errorType = 'Charge failed';

      if (msgLower.includes('insufficient') || msgLower.includes('saldo')) {
        status = 400;
        errorType = 'Insufficient balance';
      } else if (msgLower.includes('active subscription') || msgLower.includes('ya tiene una suscripci')) {
        status = 409; // Conflict
        errorType = 'Already subscribed';
      } else if (msgLower.includes('wallet not found') || msgLower.includes('wallet no encontrada')) {
        status = 404;
        errorType = 'Wallet not found';
      }

      log.error('RPC Business Error', { msg, status, errorType });

      return new Response(
        JSON.stringify({
          error: errorType,
          message: msg,
          details: {
            tier,
            userId: user.id,
            amount_cents: tierConfig.price_cents,
          }
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const subscriptionId = result?.subscription_id ?? null;
    const transactionId = result?.transaction_id ?? null;
    const lockTransactionId = result?.lock_transaction_id ?? null;
    const activationLockUsd = result?.activation_lock_usd ?? 150;

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscriptionId,
        tier,
        amount_usd: tierConfig.price_usd,
        activation_lock_usd: activationLockUsd,
        total_required_usd: tierConfig.price_usd + activationLockUsd,
        coverage_limit_usd: tierConfig.coverage_limit_usd,
        transaction_id: transactionId,
        lock_transaction_id: lockTransactionId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Error creating subscription with wallet', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
