/**
 * Supabase Edge Function: create-subscription-preference
 *
 * Creates a MercadoPago preference for Autorentar Club subscription purchase.
 *
 * Flow:
 * 1. Frontend calls this function with tier selection
 * 2. Creates preference in MercadoPago
 * 3. Returns preference_id for Wallet Brick initialization
 * 4. User completes payment in MercadoPago
 * 5. Webhook confirms payment → creates subscription via RPC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';
import { getMercadoPagoAccessToken } from '../_shared/mercadopago-sdk.ts';

const log = createChildLogger('CreateSubscriptionPreference');

// Subscription tier configurations
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

interface CreateSubscriptionPreferenceRequest {
  tier: SubscriptionTier;
  amount_cents?: number;
  description?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = getMercadoPagoAccessToken('create-subscription-preference');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateSubscriptionPreferenceRequest = await req.json();
    const { tier, description } = body;

    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be club_standard or club_black' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Check if user already has active subscription
    const { data: existingSubscription } = await supabase.rpc('get_active_subscription');

    if (existingSubscription) {
      return new Response(
        JSON.stringify({
          error: 'User already has an active subscription',
          existing_tier: existingSubscription.tier,
          expires_at: existingSubscription.expires_at,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for payer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, gov_id_number, gov_id_type')
      .eq('id', user.id)
      .single();

    // Parse name
    const fullName = profile?.full_name || user.user_metadata?.full_name || 'Usuario AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // Format phone
    let phoneFormatted: { area_code: string; number: string } | undefined;
    if (profile?.phone) {
      const phoneCleaned = profile.phone.replace(/[^0-9]/g, '');
      const phoneWithoutCountry = phoneCleaned.startsWith('54')
        ? phoneCleaned.substring(2)
        : phoneCleaned;
      const areaCode = phoneWithoutCountry.substring(0, 2) || '11';
      const number = phoneWithoutCountry.substring(2) || '';
      if (number.length >= 8) {
        phoneFormatted = { area_code: areaCode, number: number };
      }
    }

    // Format identification
    const dniNumber = profile?.gov_id_number;
    const dniType = profile?.gov_id_type || 'DNI';
    let identification: { type: string; number: string } | undefined;
    if (dniNumber) {
      const dniCleaned = dniNumber.replace(/[^0-9]/g, '');
      if (dniCleaned.length >= 7) {
        identification = { type: dniType.toUpperCase(), number: dniCleaned };
      }
    }

    // Generate unique external reference
    const externalReference = `subscription_${user.id}_${tier}_${Date.now()}`;

    // Create MercadoPago preference
    const preferenceData = {
      purpose: 'wallet_purchase',
      items: [
        {
          id: `subscription_${tier}`,
          title: `Autorentar Club - ${tierConfig.name}`,
          description: description || `Membresía anual ${tierConfig.name} con cobertura de $${tierConfig.coverage_limit_usd} USD`,
          category_id: 'services',
          quantity: 1,
          unit_price: tierConfig.price_usd, // Price in USD
          currency_id: 'USD',
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/wallet/club/history?payment=success&tier=${tier}`,
        failure: `${APP_BASE_URL}/wallet/club/plans?payment=failure&tier=${tier}`,
        pending: `${APP_BASE_URL}/wallet/club/history?payment=pending&tier=${tier}`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      metadata: {
        type: 'subscription',
        tier: tier,
        user_id: user.id,
        coverage_limit_cents: tierConfig.coverage_limit_cents,
      },
      payer: {
        email: user.email || profile?.email || `${user.id}@autorenta.com`,
        first_name: firstName,
        last_name: lastName,
        ...(phoneFormatted && { phone: phoneFormatted }),
        ...(identification && { identification }),
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1,
      },
      statement_descriptor: 'AUTORENTAR CLUB',
      binary_mode: false,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    log.info('Creating subscription preference', { tier, userId: user.id });

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      log.error('MercadoPago API Error', errorData);
      throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`);
    }

    const mpData = await mpResponse.json();

    log.info('Subscription preference created', {
      preferenceId: mpData.id,
      tier,
      userId: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        tier: tier,
        amount_usd: tierConfig.price_usd,
        coverage_limit_usd: tierConfig.coverage_limit_usd,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error('Error creating subscription preference', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
