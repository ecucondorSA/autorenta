// ============================================
// EDGE FUNCTION: mercadopago-refresh-token
// Propósito: Refrescar tokens de OAuth de MercadoPago
// Llamado por: Cron job (cada 4 horas) o manualmente
// Source of truth: profiles table (tokens guardados por mercadopago-oauth-callback)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';
import { safeErrorResponse } from '../_shared/safe-error.ts';

const log = createChildLogger('RefreshToken');

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
    log.info('Starting token refresh process');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_APPLICATION_ID')!;
    const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET')!;

    if (!MP_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Configuration incomplete' }),
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
      .from('profiles')
      .select('id, mercadopago_access_token, mercadopago_refresh_token, mercadopago_access_token_expires_at')
      .eq('mercadopago_connected', true)
      .not('mercadopago_refresh_token', 'is', null);

    if (body.user_id) {
      query = query.eq('id', body.user_id);
    } else if (!body.force) {
      query = query.lt('mercadopago_access_token_expires_at', expiryThreshold);
    }

    const { data: accounts, error: queryError } = await query;

    if (queryError) {
      log.error('Query error', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accounts || accounts.length === 0) {
      log.info('No tokens need refresh');
      return new Response(
        JSON.stringify({ success: true, message: 'No tokens need refresh', refreshed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info(`Found ${accounts.length} tokens to refresh`);

    const results: RefreshResult[] = [];

    for (const account of accounts) {
      try {
        log.info(`Refreshing token for user ${account.id}`);

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
            refresh_token: account.mercadopago_refresh_token,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          log.error(`MP error for ${account.id}: HTTP ${tokenResponse.status}`, errorData);

          results.push({
            user_id: account.id,
            success: false,
            error: `Token refresh failed (HTTP ${tokenResponse.status})`,
          });

          // TODO(human): Define retry/disconnect strategy for permanent refresh failures
          // Currently: immediately disconnect on 401/400
          // Consider: retry count, grace period, or user notification before disconnect
          if (tokenResponse.status === 401 || tokenResponse.status === 400) {
            await supabase
              .from('profiles')
              .update({
                mercadopago_connected: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', account.id);

            log.warn(`Marked user ${account.id} as disconnected (refresh token invalid)`);
          }
          continue;
        }

        const tokenData: MercadoPagoTokenResponse = await tokenResponse.json();
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Update tokens in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            mercadopago_access_token: tokenData.access_token,
            mercadopago_refresh_token: tokenData.refresh_token,
            mercadopago_public_key: tokenData.public_key,
            mercadopago_access_token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        if (updateError) {
          log.error(`DB update error for ${account.id}`, updateError);
          results.push({
            user_id: account.id,
            success: false,
            error: 'Database update failed',
          });
          continue;
        }

        log.info(`Successfully refreshed token for ${account.id}`);
        results.push({
          user_id: account.id,
          success: true,
          new_expires_at: newExpiresAt.toISOString(),
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        log.error(`Unexpected error for ${account.id}: ${errorMessage}`, err);
        results.push({
          user_id: account.id,
          success: false,
          error: 'Unexpected error during token refresh',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    log.info(`Complete: ${successCount} success, ${failCount} failed`);

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
    return safeErrorResponse(error, corsHeaders, 'mercadopago-refresh-token');
  }
});
