import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MercadoPagoPreferenceRequest {
  transaction_id: string;
  amount: number;
  description: string;
}

interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

interface CreatePreferencePayload {
  items: Array<{
    id: string;
    title: string;
    description: string;
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { transaction_id, amount, description }: MercadoPagoPreferenceRequest = await req.json();

    // Validate required fields
    if (!transaction_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          message: 'transaction_id and amount are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get MercadoPago access token
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Clean and validate access token
    const cleanToken = accessToken.trim();
    if (!cleanToken.startsWith('APP_USR-') && !cleanToken.startsWith('TEST-')) {
      throw new Error('Invalid MercadoPago access token format');
    }

    // Create preference payload
    const preferencePayload: CreatePreferencePayload = {
      items: [
        {
          id: transaction_id,
          title: 'Depósito a Wallet - AutoRenta',
          description: description || 'Depósito de fondos a tu wallet',
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS', // Argentina uses ARS
        },
      ],
      back_urls: {
        success: `${req.headers.get('origin') || 'https://autorenta.com'}/wallet?status=success`,
        failure: `${req.headers.get('origin') || 'https://autorenta.com'}/wallet?status=failure`,
        pending: `${req.headers.get('origin') || 'https://autorenta.com'}/wallet?status=pending`,
      },
      auto_return: 'approved',
      external_reference: transaction_id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    // Create preference in MercadoPago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction_id, // Prevent duplicate preferences
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({}));
      console.error('MercadoPago API Error:', errorData);
      throw new Error(`MercadoPago API error: ${mpResponse.status} - ${errorData.message || mpResponse.statusText}`);
    }

    const preferenceData: MercadoPagoPreferenceResponse = await mpResponse.json();

    // Log successful preference creation
    console.log(`Preference created for transaction ${transaction_id}:`, {
      preference_id: preferenceData.id,
      amount,
      external_reference: transaction_id,
    });

    // Return the init_point for redirect
    return new Response(
      JSON.stringify({
        success: true,
        preference_id: preferenceData.id,
        init_point: preferenceData.init_point,
        sandbox_init_point: preferenceData.sandbox_init_point,
        external_reference: transaction_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});