/**
 * Supabase Edge Function: mercadopago-create-preference
 *
 * Crea una preferencia de pago en Mercado Pago para depósitos al wallet.
 * MIGRADO A SDK OFICIAL DE MERCADOPAGO
 *
 * Flujo:
 * 1. Frontend inicia depósito → llama a wallet_initiate_deposit() en Supabase
 * 2. wallet_initiate_deposit() crea transaction en DB con status 'pending'
 * 3. Frontend llama a esta Edge Function con transaction_id
 * 4. Edge Function crea preference en Mercado Pago usando SDK oficial
 * 5. Retorna init_point (URL de checkout) al frontend
 * 6. Usuario completa pago en Mercado Pago
 * 7. Webhook de MP confirma pago → llama a wallet_confirm_deposit()
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 * - APP_BASE_URL: URL base de la app (para success/failure URLs)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface CreatePreferenceRequest {
  transaction_id: string;
  amount: number;
  description?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno - PRODUCTION TOKEN (NO FALLBACK)
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!MP_ACCESS_TOKEN_RAW) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
    }

    // Limpiar token: remover espacios, saltos de línea, tabs
    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';

    // Debug: Log token info
    console.log('MP_ACCESS_TOKEN from env:', !!Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'));
    console.log('MP_ACCESS_TOKEN after cleaning:', !!MP_ACCESS_TOKEN);
    console.log('MP_ACCESS_TOKEN length:', MP_ACCESS_TOKEN?.length);
    console.log('MP_ACCESS_TOKEN prefix:', MP_ACCESS_TOKEN?.substring(0, 15) + '...');
    console.log('MP_ACCESS_TOKEN suffix:', '...' + MP_ACCESS_TOKEN?.substring(MP_ACCESS_TOKEN.length - 10));

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener datos del request
    const body: CreatePreferenceRequest = await req.json();
    const { transaction_id, amount, description } = body;

    if (!transaction_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transaction_id, amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar autorización del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar que la transacción existe y pertenece al usuario
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found or invalid' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener información del usuario (email desde auth.users, nombre desde profiles)
    const { data: authUser } = await supabase.auth.admin.getUserById(transaction.user_id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', transaction.user_id)
      .single();

    // ========================================
    // LLAMADA DIRECTA A MERCADOPAGO REST API
    // ========================================

    console.log('Creating preference with MercadoPago REST API...');

    const preferenceData = {
      items: [
        {
          title: description || 'Depósito a Wallet - AutoRenta',
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS', // MercadoPago Argentina requiere ARS
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/wallet?payment=success&transaction_id=${transaction_id}`,
        failure: `${APP_BASE_URL}/wallet?payment=failure&transaction_id=${transaction_id}`,
        pending: `${APP_BASE_URL}/wallet?payment=pending&transaction_id=${transaction_id}`,
      },
      external_reference: transaction_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    };

    // Agregar info del pagador si está disponible
    if (authUser?.user?.email || profile?.full_name) {
      preferenceData.payer = {
        email: authUser?.user?.email,
        name: profile?.full_name || undefined,
      };
    }

    console.log('Preference data:', JSON.stringify(preferenceData, null, 2));

    // Llamar a MercadoPago REST API directamente
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
      console.error('MercadoPago API Error:', errorData);
      throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`);
    }

    const mpData = await mpResponse.json();

    const mobileDeepLink =
      mpData.mobile_deep_link ||
      mpData.point_of_interaction?.transaction_data?.ticket_url ||
      (typeof mpData.init_point === 'string'
        ? mpData.init_point.replace('https://www.mercadopago.com', 'mercadopago://')
        : undefined);

    console.log('MercadoPago API Response:', JSON.stringify(mpData, null, 2));

    // Actualizar transacción con preference_id
    await supabase
      .from('wallet_transactions')
      .update({
        provider_metadata: {
          ...(transaction.provider_metadata || {}),
          preference_id: mpData.id,
          init_point: mpData.init_point,
          sandbox_init_point: mpData.sandbox_init_point,
          mobile_deep_link: mobileDeepLink,
          created_at: new Date().toISOString(),
        },
      })
      .eq('id', transaction_id);

    // Retornar URL de checkout
    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        mobile_deep_link: mobileDeepLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
