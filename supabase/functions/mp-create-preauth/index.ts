import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface CreatePreauthRequest {
  intent_id: string;
  user_id: string;
  booking_id?: string;
  amount_ars: number;
  amount_usd: number;
  card_token: string;
  payer_email: string;
  description?: string;
  external_reference?: string;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  payment_method_id?: string;
  payment_type_id?: string;
  card?: {
    last_four_digits?: string;
    cardholder?: {
      name?: string;
    };
  };
  date_created?: string;
  date_approved?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: CreatePreauthRequest = await req.json();
    const {
      intent_id,
      user_id,
      booking_id,
      amount_ars,
      amount_usd,
      card_token,
      payer_email,
      description = 'Preautorización de garantía - AutoRenta',
      external_reference,
    } = body;

    console.log('Creating preauth for intent:', intent_id);

    // Validate required fields
    if (!intent_id || !user_id || !amount_ars || !card_token || !payer_email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Verificar que el intent existe y está pending
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intent_id)
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (intentError || !intent) {
      console.error('Intent not found or not pending:', intentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment intent not found or already processed',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Crear preautorización en Mercado Pago con capture=false
    const mpPayload = {
      transaction_amount: Number(amount_ars.toFixed(2)),
      token: card_token,
      description: description,
      installments: 1,
      payment_method_id: 'visa', // Will be determined by MP from token
      payer: {
        email: payer_email,
      },
      external_reference: external_reference || intent.external_reference,
      capture: false, // ⚠️ CRITICAL: false = preautorización (no cobra aún)
      metadata: {
        intent_id: intent_id,
        booking_id: booking_id || null,
        amount_usd: amount_usd,
        type: 'preauth',
      },
    };

    console.log('Calling Mercado Pago API with capture=false...');

    const mpResponse = await fetch(`${MP_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': intent_id, // Usar intent_id como idempotency key
      },
      body: JSON.stringify(mpPayload),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Mercado Pago API error:', errorData);

      // Actualizar intent a failed
      await supabase
        .from('payment_intents')
        .update({
          status: 'failed',
          metadata: {
            ...intent.metadata,
            mp_error: errorData,
          },
        })
        .eq('id', intent_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment authorization failed',
          details: errorData,
        }),
        {
          status: mpResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const mpData: MercadoPagoPaymentResponse = await mpResponse.json();
    console.log('Mercado Pago response:', mpData);

    // Actualizar payment intent con datos de MP
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        mp_payment_id: mpData.id.toString(),
        mp_status: mpData.status,
        mp_status_detail: mpData.status_detail,
        status: mpData.status === 'authorized' ? 'authorized' : 'pending',
        payment_method_id: mpData.payment_method_id,
        card_last4: mpData.card?.last_four_digits,
        card_holder_name: mpData.card?.cardholder?.name,
        authorized_at: mpData.status === 'authorized' ? new Date().toISOString() : null,
        preauth_expires_at:
          mpData.status === 'authorized'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        metadata: {
          ...intent.metadata,
          mp_response: mpData,
        },
      })
      .eq('id', intent_id);

    if (updateError) {
      console.error('Error updating intent:', updateError);
    }

    // Retornar respuesta
    return new Response(
      JSON.stringify({
        success: true,
        mp_payment_id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        intent_id: intent_id,
        expires_at:
          mpData.status === 'authorized'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Fatal error in mp-create-preauth:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
