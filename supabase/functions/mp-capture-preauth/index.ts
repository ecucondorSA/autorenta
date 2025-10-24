import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface CapturePreauthRequest {
  intent_id: string;
  amount_ars: number;
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
  transaction_amount: number;
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
    const body: CapturePreauthRequest = await req.json();
    const { intent_id, amount_ars } = body;

    console.log('Capturing preauth for intent:', intent_id, 'with amount:', amount_ars);

    // Validate required fields
    if (!intent_id || !amount_ars) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: intent_id and amount_ars',
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
      .eq('status', 'authorized') // Only capture authorized intents
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

    // Call MercadoPago API to capture the payment
    console.log('Calling Mercado Pago API to capture payment:', intent.mp_payment_id);
    const mpResponse = await fetch(
      `${MP_API_BASE}/payments/${intent.mp_payment_id}?capture=true`,
      {
        method: 'PUT', // Changed to PUT for capture, as per MP docs for partial capture
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_amount: Number(amount_ars.toFixed(2)), // Send amount for full or partial capture
        }),
      }
    );

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Mercado Pago API capture error:', errorData);

      // Optionally update intent status to failed if capture fails
      await supabase
        .from('payment_intents')
        .update({
          status: 'failed',
          metadata: {
            ...intent.metadata,
            mp_capture_error: errorData,
          },
        })
        .eq('id', intent_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment capture failed',
          details: errorData,
        }),
        {
          status: mpResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const mpData: MercadoPagoPaymentResponse = await mpResponse.json();
    console.log('Mercado Pago capture response:', mpData);

    // Update payment intent status in Supabase
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: mpData.status === 'approved' ? 'captured' : mpData.status, // MP returns 'approved' on successful capture
        mp_status: mpData.status,
        mp_status_detail: mpData.status_detail,
        captured_at: new Date().toISOString(),
        metadata: {
          ...intent.metadata,
          mp_capture_response: mpData,
        },
      })
      .eq('id', intent_id);

    if (updateError) {
      console.error('Error updating intent after capture:', updateError);
      // Even if update fails, MP capture might have succeeded. Log and proceed.
    }

    // Call Supabase RPC to create wallet_ledger entries
    // This RPC will handle the debit from the preauth and credit to the appropriate account
    const { error: rpcError } = await supabase.rpc('capture_preauth', {
      p_intent_id: intent_id,
      p_amount: amount_ars,
    });

    if (rpcError) {
      console.error('Error calling capture_preauth RPC:', rpcError);
      // This is a critical error, as ledger might be inconsistent.
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
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Fatal error in mp-capture-preauth:', error);
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
