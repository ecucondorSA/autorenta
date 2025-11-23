import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface CancelPreauthRequest {
  intent_id: string;
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
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
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
    const body: CancelPreauthRequest = await req.json();
    const { intent_id } = body;

    console.log('Cancelling preauth for intent:', intent_id);

    // Validate required fields
    if (!intent_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: intent_id',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch payment intent from Supabase
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intent_id)
      .eq('status', 'authorized') // Only cancel authorized intents
      .single();

    if (intentError || !intent) {
      console.error('Intent not found or not authorized:', intentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment intent not found or not in authorized state',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!intent.mp_payment_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MercadoPago payment ID not found for this intent',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Call MercadoPago API to cancel the payment
    console.log('Calling Mercado Pago API to cancel payment:', intent.mp_payment_id);
    const mpResponse = await fetch(
      `${MP_API_BASE}/payments/${intent.mp_payment_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      }
    );

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Mercado Pago API cancellation error:', errorData);

      // Optionally update intent status to failed if cancellation fails
      await supabase
        .from('payment_intents')
        .update({
          status: 'failed',
          metadata: {
            ...intent.metadata,
            mp_cancel_error: errorData,
          },
        })
        .eq('id', intent_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment cancellation failed',
          details: errorData,
        }),
        {
          status: mpResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const mpData: MercadoPagoPaymentResponse = await mpResponse.json();
    console.log('Mercado Pago cancellation response:', mpData);

    // Update payment intent status in Supabase
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: mpData.status === 'cancelled' ? 'cancelled' : mpData.status,
        mp_status: mpData.status,
        mp_status_detail: mpData.status_detail,
        cancelled_at: new Date().toISOString(),
        metadata: {
          ...intent.metadata,
          mp_cancel_response: mpData,
        },
      })
      .eq('id', intent_id);

    if (updateError) {
      console.error('Error updating intent after cancellation:', updateError);
      // Even if update fails, MP cancellation might have succeeded. Log and proceed.
    }

    // Call Supabase RPC to release funds (if any were locked)
    const { error: rpcError } = await supabase.rpc('cancel_preauth', {
      p_intent_id: intent_id,
    });

    if (rpcError) {
      console.error('Error calling cancel_preauth RPC:', rpcError);
      // This is a critical error, as locked funds might not be released.
      // Consider alerting or further error handling.
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        mp_payment_id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        intent_id: intent_id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Fatal error in mp-cancel-preauth:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
