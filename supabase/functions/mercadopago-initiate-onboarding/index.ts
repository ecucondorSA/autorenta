// ============================================
// EDGE FUNCTION: mercadopago-initiate-onboarding
// Propósito: Inicia el proceso de OAuth de MercadoPago Marketplace
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const MERCADOPAGO_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID') || '';
const MERCADOPAGO_REDIRECT_URI = Deno.env.get('MERCADOPAGO_REDIRECT_URI') || 'https://autorentar.com/oauth/mercadopago/callback';

serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from request
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random state token for security
    const stateToken = crypto.randomUUID();

    // Store state token in database for validation on callback
    const { error: insertError } = await supabase
      .from('mp_onboarding_states')
      .insert({
        user_id,
        state_token: stateToken,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (insertError) {
      console.error('Error storing state token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate onboarding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build MercadoPago OAuth URL
    const authUrl = new URL('https://auth.mercadopago.com.ar/authorization');
    authUrl.searchParams.set('client_id', MERCADOPAGO_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('redirect_uri', MERCADOPAGO_REDIRECT_URI);

    return new Response(
      JSON.stringify({
        success: true,
        onboarding_url: authUrl.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in mercadopago-initiate-onboarding:', error);
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
