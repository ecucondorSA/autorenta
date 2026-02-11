/**
 * @fileoverview Edge Function: create-fragment-preference
 *
 * Creates a MercadoPago Checkout Pro preference for fragment purchases.
 * Investors buy BYD-001 vehicle fragments ($12.50 USD each, charged in ARS).
 *
 * Flow:
 * 1. Authenticated user requests fragment purchase from pitch page
 * 2. This function validates quantity, anti-whale limits, availability
 * 3. Fetches USD→ARS exchange rate from remote_config
 * 4. Calls initiate_fragment_purchase() RPC → creates pending purchase
 * 5. Creates MP preference via REST API (no SDK — Deno incompatible)
 * 6. Returns init_point (checkout URL) to redirect user
 *
 * Environment Variables:
 * - MERCADOPAGO_ACCESS_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - FRAGMENT_PITCH_URL (optional, defaults to autorentar.com pitch page)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';
import { getMercadoPagoAccessToken } from '../_shared/mercadopago-token.ts';

const log = createChildLogger('CreateFragmentPreference');

// Deno globals
declare const Deno: any;

interface CreateFragmentRequest {
  vehicle_asset_code: string;
  quantity: number;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================
    // ENV & AUTH
    // ========================================
    const MP_ACCESS_TOKEN = getMercadoPagoAccessToken('create-fragment-preference', true);
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const PITCH_URL = Deno.env.get('FRAGMENT_PITCH_URL') || 'https://autorentar.com/pitch-byd-inversores.html';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // AUTHENTICATE USER
    // ========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // PARSE & VALIDATE INPUT
    // ========================================
    const body: CreateFragmentRequest = await req.json();
    const { vehicle_asset_code, quantity } = body;

    if (!vehicle_asset_code || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: vehicle_asset_code, quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be an integer between 1 and 200' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // FETCH EXCHANGE RATE
    // ========================================
    // app_config.value is JSONB — stored as a number or string
    const { data: rateConfig, error: rateError } = await supabase
      .from('app_config')
      .select('value, updated_at')
      .eq('key', 'USD_ARS_RATE')
      .eq('environment', 'production')
      .single();

    if (rateError || !rateConfig) {
      log.error('Exchange rate not found in app_config', rateError);
      return new Response(
        JSON.stringify({ error: 'Exchange rate not configured. Contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JSONB value can be a number directly or a string
    const rawVal = typeof rateConfig.value === 'object' ? rateConfig.value : rateConfig.value;
    const usdArsRate = parseFloat(String(rawVal));
    if (isNaN(usdArsRate) || usdArsRate <= 0) {
      log.error('Invalid exchange rate value', { value: rateConfig.value });
      return new Response(
        JSON.stringify({ error: 'Invalid exchange rate configuration' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Staleness check: reject if rate is older than 48h
    const rateAge = Date.now() - new Date(rateConfig.updated_at).getTime();
    const MAX_RATE_AGE_MS = 48 * 60 * 60 * 1000;
    if (rateAge > MAX_RATE_AGE_MS) {
      log.error('Exchange rate is stale', {
        updated_at: rateConfig.updated_at,
        age_hours: Math.round(rateAge / 3600000),
      });
      return new Response(
        JSON.stringify({ error: 'Exchange rate is outdated. Contact admin to update.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Exchange rate fetched', { usdArsRate, updated_at: rateConfig.updated_at });

    // ========================================
    // INITIATE PURCHASE (DB RPC — atomic validation)
    // ========================================
    const { data: purchaseId, error: purchaseError } = await supabase.rpc(
      'initiate_fragment_purchase',
      {
        p_user_id: user.id,
        p_asset_code: vehicle_asset_code,
        p_quantity: quantity,
        p_usd_ars_rate: usdArsRate,
      }
    );

    if (purchaseError) {
      log.error('initiate_fragment_purchase failed', purchaseError);
      const msg = purchaseError.message || '';

      // Map DB errors to user-friendly responses
      if (msg.includes('not accepting investments')) {
        return new Response(
          JSON.stringify({ error: 'Este vehiculo ya no acepta inversiones', code: 'NOT_FUNDRAISING' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (msg.includes('exceed max fragments')) {
        return new Response(
          JSON.stringify({ error: 'Excedes el maximo de fragmentos por wallet (200)', code: 'ANTI_WHALE' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (msg.includes('Insufficient fragments')) {
        return new Response(
          JSON.stringify({ error: 'No hay suficientes fragmentos disponibles', code: 'SOLD_OUT' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (msg.includes('not found')) {
        return new Response(
          JSON.stringify({ error: 'Vehiculo no encontrado', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Error al iniciar compra', details: msg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Purchase initiated', { purchaseId, quantity, vehicle_asset_code });

    // ========================================
    // CALCULATE ARS AMOUNT
    // ========================================
    // Get fragment price from vehicle_assets
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicle_assets')
      .select('fragment_price_cents')
      .eq('asset_code', vehicle_asset_code)
      .single();

    if (vehicleError || !vehicle) {
      throw new Error('Could not fetch vehicle price after purchase initiation');
    }

    // fragment_price_cents is in USD cents (e.g. 1250 = $12.50)
    const totalUsdCents = vehicle.fragment_price_cents * quantity;
    // Convert to ARS (full units, not cents) for MercadoPago
    const totalArs = Math.round((totalUsdCents / 100) * usdArsRate);

    log.info('Amount calculated', {
      totalUsdCents,
      usdArsRate,
      totalArs,
    });

    // MercadoPago Argentina limits
    if (totalArs < 100) {
      return new Response(
        JSON.stringify({ error: 'Monto minimo ARS $100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // GET USER INFO FOR PAYER
    // ========================================
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single();

    const fullName = profile?.full_name || user.user_metadata?.full_name || 'Inversor AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Inversor';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // ========================================
    // CREATE MERCADOPAGO PREFERENCE
    // ========================================
    const preferenceData: Record<string, any> = {
      items: [
        {
          id: purchaseId,
          title: `${quantity} Fragmento${quantity > 1 ? 's' : ''} BYD Dolphin Mini — ${vehicle_asset_code}`,
          description: `Inversion fraccionada: ${quantity} fragmento${quantity > 1 ? 's' : ''} a USD $${(vehicle.fragment_price_cents / 100).toFixed(2)} c/u. Total: USD $${(totalUsdCents / 100).toFixed(2)}`,
          category_id: 'services',
          quantity: 1,
          unit_price: totalArs,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: user.email || profile?.email || `${user.id}@autorenta.com`,
        first_name: firstName,
        last_name: lastName,
      },
      back_urls: {
        success: `${PITCH_URL}?payment=success&purchase_id=${purchaseId}`,
        failure: `${PITCH_URL}?payment=failure&purchase_id=${purchaseId}`,
        pending: `${PITCH_URL}?payment=pending&purchase_id=${purchaseId}`,
      },
      auto_return: 'approved',
      external_reference: `fragment_${purchaseId}`,
      notification_url: `${SUPABASE_URL}/functions/v1/fragment-purchase-webhook`,
      statement_descriptor: 'AUTORENTAR INV',
      binary_mode: false,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1,
      },
    };

    log.info('Creating MP preference...', { external_reference: preferenceData.external_reference });

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
      log.error('MercadoPago API error', errorData);
      throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`);
    }

    const mpData = await mpResponse.json();

    log.info('Preference created', {
      preference_id: mpData.id,
      init_point: mpData.init_point,
    });

    // ========================================
    // UPDATE PURCHASE WITH PREFERENCE ID
    // ========================================
    await supabase
      .from('fragment_purchases')
      .update({ mp_preference_id: mpData.id })
      .eq('id', purchaseId);

    // ========================================
    // RETURN
    // ========================================
    return new Response(
      JSON.stringify({
        success: true,
        purchase_id: purchaseId,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        amount_ars: totalArs,
        amount_usd_cents: totalUsdCents,
        quantity,
        usd_ars_rate: usdArsRate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error('Error creating fragment preference', error);

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
