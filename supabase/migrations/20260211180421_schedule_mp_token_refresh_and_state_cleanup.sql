-- ============================================================================
-- Migration: Schedule MercadoPago token refresh cron + stale state cleanup
-- Date: 2026-02-11
-- Issue: mercadopago-refresh-token was reading from phantom table
--        (mercadopago_accounts — always empty). Now fixed to read from profiles.
--        But no cron job existed to call it. Tokens expire in ~6h silently.
--
-- Fix:
--   1. Cron job every 4h to refresh tokens (2h safety margin before 6h expiry)
--   2. Daily cleanup of abandoned OAuth states in profiles
--
-- Pattern: vault.decrypted_secrets auth (same as 20260211103000)
-- ============================================================================

-- ============================================================================
-- 1. MercadoPago token refresh (every 4 hours)
-- ============================================================================
SELECT cron.unschedule('refresh-mercadopago-tokens')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-mercadopago-tokens'
);

SELECT cron.schedule(
    'refresh-mercadopago-tokens',
    '0 */4 * * *',
    $$
    select
      net.http_post(
          url:='https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/mercadopago-refresh-token',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================================================
-- 2. Cleanup stale OAuth states (daily at 5 AM UTC)
--    States older than 2 hours are certainly abandoned (max flow time = 60 min)
-- ============================================================================
SELECT cron.unschedule('cleanup-stale-mp-oauth-states')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-mp-oauth-states'
);

SELECT cron.schedule(
    'cleanup-stale-mp-oauth-states',
    '0 5 * * *',
    $$
    UPDATE public.profiles
    SET mercadopago_oauth_state = NULL,
        updated_at = NOW()
    WHERE mercadopago_oauth_state IS NOT NULL
      AND updated_at < NOW() - INTERVAL '2 hours';
    $$
);
