import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  transaction_id: string;
  amount: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { transaction_id, amount, description }: TestRequest = await req.json();

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

    // Get environment variables
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Simulate successful response (without calling MercadoPago API)
    const mockPreference = {
      id: `test-preference-${Date.now()}`,
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=test-preference-${Date.now()}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test-preference-${Date.now()}`,
    };

    console.log('Test function called with:', {
      transaction_id,
      amount,
      description,
      accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT_SET',
      supabaseUrl: supabaseUrl ? 'SET' : 'NOT_SET',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'NOT_SET',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function working correctly',
        preference_id: mockPreference.id,
        init_point: mockPreference.init_point,
        sandbox_init_point: mockPreference.sandbox_init_point,
        external_reference: transaction_id,
        environment_check: {
          accessToken: !!accessToken,
          supabaseUrl: !!supabaseUrl,
          supabaseServiceKey: !!supabaseServiceKey,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in test function:', error);
    
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