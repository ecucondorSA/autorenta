/**
 * Supabase Edge Function: upgrade-subscription-wallet
 *
 * Upgrades user's subscription to a higher tier by paying the price difference
 * with wallet balance.
 *
 * Flow:
 * 1. Validate user has active subscription
 * 2. Validate new tier is higher than current
 * 3. Calculate price difference
 * 4. Charge wallet for difference
 * 5. Mark old subscription as 'upgraded'
 * 6. Create new subscription with higher tier
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('UpgradeSubscriptionWallet');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Subscription tier configurations
const SUBSCRIPTION_TIERS = {
  club_standard: {
    name: 'Club Access',
    price_cents: 30000,
    price_usd: 300,
    coverage_limit_cents: 80000,
    coverage_limit_usd: 800,
    level: 1,
  },
  club_black: {
    name: 'Silver Access',
    price_cents: 60000,
    price_usd: 600,
    coverage_limit_cents: 120000,
    coverage_limit_usd: 1200,
    level: 2,
  },
  club_luxury: {
    name: 'Black Access',
    price_cents: 120000,
    price_usd: 1200,
    coverage_limit_cents: 200000,
    coverage_limit_usd: 2000,
    level: 3,
  },
} as const;

type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface UpgradeSubscriptionRequest {
  new_tier: SubscriptionTier;
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

    const body: UpgradeSubscriptionRequest = await req.json();
    const { new_tier } = body;

    if (!new_tier || !SUBSCRIPTION_TIERS[new_tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be club_standard, club_black, or club_luxury' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const newTierConfig = SUBSCRIPTION_TIERS[new_tier];

    // Generate idempotency key
    const idempotencyKey =
      req.headers.get('Idempotency-Key') || `upgrade-wallet-${user.id}-${new_tier}-${Date.now()}`;

    log.info('Upgrading subscription with wallet', {
      userId: user.id,
      newTier: new_tier,
      ref: idempotencyKey,
    });

    // Call the RPC function that handles all the upgrade logic
    const { data: result, error: upgradeError } = await supabase.rpc('upgrade_subscription_with_wallet', {
      p_user_id: user.id,
      p_new_tier: new_tier,
      p_ref: idempotencyKey,
      p_description: `Upgrade a ${newTierConfig.name} (Autorentar Club)`,
      p_meta: {
        type: 'subscription_upgrade',
        new_tier: new_tier,
        initiated_at: new Date().toISOString(),
      },
    });

    if (upgradeError) {
      const msg = upgradeError.message || 'Upgrade failed';
      const isInsufficient = msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('saldo');
      const isNotUpgrade = msg.toLowerCase().includes('solo puedes') || msg.toLowerCase().includes('not_upgrade');
      const isNoSubscription = msg.toLowerCase().includes('no tienes') || msg.toLowerCase().includes('no_active');

      let status = 500;
      let errorType = 'upgrade_failed';

      if (isInsufficient) {
        status = 400;
        errorType = 'insufficient_balance';
      } else if (isNotUpgrade) {
        status = 400;
        errorType = 'not_upgrade';
      } else if (isNoSubscription) {
        status = 400;
        errorType = 'no_active_subscription';
      }

      return new Response(
        JSON.stringify({
          error: errorType,
          message: msg,
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const subscriptionId = result?.subscription_id ?? null;
    const transactionId = result?.transaction_id ?? null;
    const pricePaidUsd = result?.price_paid_usd ?? 0;

    log.info('Subscription upgraded successfully', {
      userId: user.id,
      newTier: new_tier,
      subscriptionId,
      pricePaidUsd,
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscriptionId,
        new_tier: new_tier,
        price_paid_usd: pricePaidUsd,
        new_coverage_usd: newTierConfig.coverage_limit_usd,
        transaction_id: transactionId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Error upgrading subscription with wallet', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
