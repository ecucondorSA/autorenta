/**
 * Supabase Edge Function: mercadopago-create-preference
 *
 * Crea una preferencia de pago en Mercado Pago para depósitos al wallet.
 *
 * Flujo:
 * 1. Frontend inicia depósito → llama a wallet_initiate_deposit() en Supabase
 * 2. wallet_initiate_deposit() crea transaction en DB con status 'pending'
 * 3. Frontend llama a esta Edge Function con transaction_id
 * 4. Edge Function crea preference en Mercado Pago
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

interface MercadoPagoPreference {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  external_reference: string;
  notification_url?: string;
  payer?: {
    email?: string;
    name?: string;
  };
}

interface MercadoPagoResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
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
    // Verificar variables de entorno
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';

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

    // Obtener información del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', transaction.user_id)
      .single();

    // Crear preferencia en Mercado Pago
    const preference: MercadoPagoPreference = {
      items: [
        {
          title: description || 'Depósito a Wallet - AutoRenta',
          quantity: 1,
          unit_price: amount,
          currency_id: 'USD',
        },
      ],
      back_urls: {
        success: `${APP_BASE_URL}/wallet?payment=success&transaction_id=${transaction_id}`,
        failure: `${APP_BASE_URL}/wallet?payment=failure&transaction_id=${transaction_id}`,
        pending: `${APP_BASE_URL}/wallet?payment=pending&transaction_id=${transaction_id}`,
      },
      auto_return: 'approved',
      external_reference: transaction_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    };

    // Agregar info del pagador si está disponible
    if (profile) {
      preference.payer = {
        email: profile.email,
        name: profile.full_name || undefined,
      };
    }

    // Llamar a API de Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('MercadoPago API Error:', errorData);
      throw new Error(`MercadoPago API error: ${mpResponse.status}`);
    }

    const mpData: MercadoPagoResponse = await mpResponse.json();

    // Actualizar transacción con preference_id
    await supabase
      .from('wallet_transactions')
      .update({
        provider_metadata: {
          ...(transaction.provider_metadata || {}),
          preference_id: mpData.id,
          init_point: mpData.init_point,
          sandbox_init_point: mpData.sandbox_init_point,
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
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
