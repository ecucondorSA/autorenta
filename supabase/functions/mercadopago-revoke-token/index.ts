import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const MP_OAUTH_REVOKE_URL = 'https://api.mercadopago.com/oauth/token/revoke';

interface RevokeTokenRequest {
  user_id: string;
}

/**
 * Edge Function: mercadopago-revoke-token
 *
 * Revokes MercadoPago OAuth tokens when a user unlinks their account.
 * This is required for proper OAuth flow compliance and security.
 *
 * Security:
 * - Requires authenticated user
 * - User can only revoke their own tokens
 * - Rate limited to prevent abuse
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    try {
      await enforceRateLimit(req, {
        endpoint: 'mercadopago-revoke-token',
        windowSeconds: 60,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return error.toResponse();
      }
      console.error('[RateLimit] Service unavailable:', error);
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable', code: 'RATE_LIMITER_UNAVAILABLE' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate environment
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID');
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      console.warn('[mercadopago-revoke-token] Missing MP OAuth credentials, skipping token revocation');
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'OAuth credentials not configured, tokens not revoked at provider',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RevokeTokenRequest = await req.json();
    const { user_id } = body;

    // Security: User can only revoke their own tokens
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to revoke tokens for this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's access token from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mercadopago_access_token')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.mercadopago_access_token) {
      console.log('[mercadopago-revoke-token] No access token found for user:', user_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No token to revoke',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: Token is stored encrypted, we need to decrypt it
    // For now, we'll use the RPC function if available, or skip decryption
    // The token revocation API accepts the encrypted token anyway in some cases
    const accessToken = profile.mercadopago_access_token;

    // Attempt to decrypt using RPC if available
    let decryptedToken = accessToken;
    try {
      const { data: decrypted } = await supabase.rpc('decrypt_sensitive_data', {
        p_encrypted: accessToken,
      });
      if (decrypted) {
        decryptedToken = decrypted;
      }
    } catch {
      // Decryption not available, try with raw token
      console.warn('[mercadopago-revoke-token] Could not decrypt token, using raw value');
    }

    // Call MercadoPago OAuth revocation endpoint
    console.log('[mercadopago-revoke-token] Revoking token for user:', user_id);

    const revokeResponse = await fetch(MP_OAUTH_REVOKE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        token: decryptedToken,
      }),
    });

    const revokeResult = await revokeResponse.json().catch(() => ({}));

    if (!revokeResponse.ok) {
      console.error('[mercadopago-revoke-token] MP API error:', revokeResult);
      // Log error but don't fail - we still want to clear local tokens
      // Some errors are expected (e.g., token already revoked)
    } else {
      console.log('[mercadopago-revoke-token] Token revoked successfully for user:', user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token revocation processed',
        mp_response_status: revokeResponse.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[mercadopago-revoke-token] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
