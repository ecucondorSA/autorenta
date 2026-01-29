// ============================================
// EDGE FUNCTION: mercadopago-refresh-token
// Propósito: Refrescar tokens de OAuth de MercadoPago
// Llamado por: Cron job o before token expiry
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface RefreshRequest {
  user_id?: string; // Specific user, or all expiring if not provided
  force?: boolean; // Force refresh even if not expiring
}

interface MercadoPagoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

interface RefreshResult {
  user_id: string;
  success: boolean;
  error?: string;
  new_expires_at?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Refresh Token] Starting token refresh process');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_APPLICATION_ID')!;
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET')!;

    if (!MP_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'MERCADOPAGO_CLIENT_SECRET not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    let body: RefreshRequest = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // Empty body is ok
      }
    }

    // Find tokens that need refresh (expiring in < 6 hours)
    const expiryThreshold = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('mercadopago_accounts')
      .select('user_id, access_token, refresh_token, expires_at')
      .not('refresh_token', 'is', null);

    if (body.user_id) {
      query = query.eq('user_id', body.user_id);
    } else if (!body.force) {
      query = query.lt('expires_at', expiryThreshold);
    }

    const { data: accounts, error: queryError } = await query;

    if (queryError) {
      console.error('[Refresh Token] Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log('[Refresh Token] No tokens need refresh');
      return new Response(
        JSON.stringify({ success: true, message: 'No tokens need refresh', refreshed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Refresh Token] Found ${accounts.length} tokens to refresh`);

    const results: RefreshResult[] = [];

    for (const account of accounts) {
      try {
        console.log(`[Refresh Token] Refreshing token for user ${account.user_id}`);

        const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: MP_CLIENT_ID,
            client_secret: MP_CLIENT_SECRET,
            refresh_token: account.refresh_token,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          console.error(`[Refresh Token] MP error for ${account.user_id}:`, errorData);

          results.push({
            user_id: account.user_id,
            success: false,
            error: errorData.message || `HTTP ${tokenResponse.status}`,
          });

          // Mark account as disconnected if refresh failed permanently
          if (tokenResponse.status === 401 || tokenResponse.status === 400) {
            await supabase
              .from('mercadopago_accounts')
              .update({
                status: 'disconnected',
                disconnected_at: new Date().toISOString(),
                disconnection_reason: 'refresh_token_invalid',
              })
              .eq('user_id', account.user_id);

            // Update profile
            await supabase
              .from('profiles')
              .update({ mercadopago_connected: false })
              .eq('id', account.user_id);
          }
          continue;
        }

        const tokenData: MercadoPagoTokenResponse = await tokenResponse.json();
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Update tokens in database
        const { error: updateError } = await supabase
          .from('mercadopago_accounts')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            public_key: tokenData.public_key,
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', account.user_id);

        if (updateError) {
          console.error(`[Refresh Token] DB update error for ${account.user_id}:`, updateError);
          results.push({
            user_id: account.user_id,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        console.log(`[Refresh Token] Successfully refreshed token for ${account.user_id}`);
        results.push({
          user_id: account.user_id,
          success: true,
          new_expires_at: newExpiresAt.toISOString(),
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Refresh Token] Error for ${account.user_id}:`, errorMessage);
        results.push({
          user_id: account.user_id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[Refresh Token] Complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed: successCount,
        failed: failCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Refresh Token] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACIÓN
 * ============================================
 *
 * ## Uso
 *
 * POST /functions/v1/mercadopago-refresh-token
 * Body (opcional):
 * {
 *   "user_id": "uuid",  // Refrescar solo este usuario
 *   "force": true       // Forzar refresh aunque no expire pronto
 * }
 *
 * ## Cron Job (pg_cron)
 *
 * SELECT cron.schedule(
 *   'refresh-mercadopago-tokens',
 *   '0 * * * *', -- Cada hora
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/mercadopago-refresh-token',
 *     headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
 *   )
 *   $$
 * );
 *
 * ## Variables de Entorno
 *
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - MERCADOPAGO_APPLICATION_ID
 * - MERCADOPAGO_CLIENT_SECRET
 *
 * ============================================ */
