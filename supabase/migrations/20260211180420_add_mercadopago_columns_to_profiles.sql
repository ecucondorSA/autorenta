-- ============================================================================
-- Migration: Add MercadoPago OAuth columns to profiles table
-- Date: 2026-02-11
-- Issue: These columns were defined in the archive migration (20251201000003)
--        but never applied to production. Without them, the entire OAuth flow
--        fails on first step (saving state to profiles.mercadopago_oauth_state).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mercadopago_collector_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mercadopago_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mercadopago_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_access_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mercadopago_public_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mercadopago_account_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mercadopago_country VARCHAR(10) DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS mercadopago_site_id VARCHAR(10) DEFAULT 'MLA',
  ADD COLUMN IF NOT EXISTS mercadopago_oauth_state TEXT;

-- Index for collector_id uniqueness check (callback validates no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_mp_collector_id
  ON public.profiles (mercadopago_collector_id)
  WHERE mercadopago_collector_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.mercadopago_collector_id IS 'MercadoPago seller account ID for split payments';
COMMENT ON COLUMN public.profiles.mercadopago_connected IS 'Whether user has active MP OAuth connection';
COMMENT ON COLUMN public.profiles.mercadopago_oauth_state IS 'Temporary CSRF state for OAuth flow (cleaned up after use)';
