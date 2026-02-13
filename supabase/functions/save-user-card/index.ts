/**
 * Save User Card Edge Function
 *
 * Guarda una tarjeta en MercadoPago Customers API para permitir
 * renovación automática de pre-autorizaciones.
 *
 * Solo se guarda si el usuario da consentimiento explícito.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createOrGetCustomer } from '../_shared/mercadopago-customer-helper.ts';
import { saveCardToCustomer, getCardInfo } from '../_shared/mercadopago-card-saver.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

interface SaveCardRequest {
  user_id: string;
  card_token: string;
  set_as_default?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AUTH: Verify the caller's identity via JWT (OWASP A01 — prevent IDOR)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SaveCardRequest = await req.json();
    const { card_token, set_as_default = true } = body;
    // Use authenticated user ID, ignore any user_id from body
    const user_id = authUser.id;

    if (!card_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'card_token es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[save-card] Saving card for user ${user_id}...`);

    // 1. Obtener o crear customer en MercadoPago
    const customerId = await createOrGetCustomer(supabase, user_id, MERCADOPAGO_ACCESS_TOKEN);

    if (!customerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo crear el customer en MercadoPago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[save-card] Customer ID: ${customerId}`);

    // 2. Guardar la tarjeta
    const saveResult = await saveCardToCustomer(customerId, card_token, MERCADOPAGO_ACCESS_TOKEN);

    if (!saveResult.success || !saveResult.card_id) {
      return new Response(
        JSON.stringify({ success: false, error: saveResult.error || 'Error guardando tarjeta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[save-card] Card saved: ${saveResult.card_id}`);

    // 3. Obtener info de la tarjeta para guardar en BD
    const cardInfo = await getCardInfo(customerId, saveResult.card_id, MERCADOPAGO_ACCESS_TOKEN);

    // 4. Guardar en nuestra BD usando el RPC
    const { data: savedCardId, error: dbError } = await supabase.rpc('save_user_card', {
      p_user_id: user_id,
      p_mp_customer_id: customerId,
      p_mp_card_id: saveResult.card_id,
      p_card_last4: cardInfo?.last_four_digits || '****',
      p_card_brand: cardInfo?.payment_method?.id || null,
      p_expiration_month: cardInfo?.expiration_month || null,
      p_expiration_year: cardInfo?.expiration_year || null,
      p_cardholder_name: cardInfo?.cardholder?.name || null,
      p_set_default: set_as_default,
    });

    if (dbError) {
      console.error('[save-card] Error saving to database:', dbError);
      // No fallar, la tarjeta ya está en MP
    }

    console.log(`[save-card] Card saved successfully for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        card_id: savedCardId || saveResult.card_id,
        last4: cardInfo?.last_four_digits,
        brand: cardInfo?.payment_method?.id,
        message: 'Tarjeta guardada correctamente',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[save-card] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to save card' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
