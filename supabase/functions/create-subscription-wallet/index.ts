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

const SUBSCRIPTION_TIERS = {
  club_standard: {
    name: 'Club Estándar',
    price_cents: 30000,
    price_usd: 300,
    coverage_limit_cents: 50000,
    coverage_limit_usd: 500,
  },
  club_black: {
    name: 'Club Black',
    price_cents: 60000,
    price_usd: 600,
    coverage_limit_cents: 100000,
    coverage_limit_usd: 1000,
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
      return new Response(JSON.stringify({ error: 'Invalid tier. Must be club_standard or club_black' }), {
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

    const { data: result, error: chargeError } = await supabase.rpc('create_subscription_with_wallet', {
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

    if (chargeError) {
      const msg = chargeError.message || 'Charge failed';
      const isInsufficient = msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('saldo');
      return new Response(
        JSON.stringify({
          error: isInsufficient ? 'Insufficient balance' : 'Charge failed',
          message: msg,
        }),
        {
          status: isInsufficient ? 400 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const subscriptionId = result?.subscription_id ?? null;
    const transactionId = result?.transaction_id ?? null;

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscriptionId,
        tier,
        amount_usd: tierConfig.price_usd,
        coverage_limit_usd: tierConfig.coverage_limit_usd,
        transaction_id: transactionId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Error creating subscription with wallet', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
