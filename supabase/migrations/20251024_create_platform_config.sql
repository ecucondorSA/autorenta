-- ============================================================================
-- PLATFORM CONFIGURATION TABLE
-- Created: 2025-10-24
-- Purpose: Centralize platform constants (service fees, deposits, etc.)
--          to avoid hardcoded values in SQL functions
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Create platform_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('number', 'string', 'boolean', 'json')),
  description TEXT,
  category TEXT, -- 'pricing', 'payment', 'booking', 'notification', 'limits'
  is_public BOOLEAN DEFAULT false, -- If true, exposed to frontend via RPC
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_platform_config_category
ON public.platform_config(category);

-- ============================================================================
-- SECTION 2: Insert default configuration values
-- ============================================================================

INSERT INTO public.platform_config (key, value, data_type, description, category, is_public)
VALUES
  -- PRICING
  ('pricing.service_fee_percent', '23', 'number', 'Platform service fee percentage (23%)', 'pricing', true),
  ('pricing.min_rental_hours', '4', 'number', 'Minimum rental duration in hours', 'pricing', true),
  ('pricing.max_rental_days', '90', 'number', 'Maximum rental duration in days', 'pricing', true),

  -- DEPOSITS
  ('deposit.wallet.usd', '300', 'number', 'Security deposit for wallet payments (USD)', 'payment', true),
  ('deposit.partial_wallet.usd', '500', 'number', 'Security deposit for partial wallet payments (USD)', 'payment', true),
  ('deposit.credit_card.usd', '500', 'number', 'Security deposit for credit card payments (USD)', 'payment', true),
  ('deposit.default.usd', '500', 'number', 'Default security deposit (USD)', 'payment', true),

  -- BOOKING
  ('booking.pending_expiration_minutes', '30', 'number', 'Minutes until pending booking expires', 'booking', true),
  ('booking.cancellation_fee_percent', '10', 'number', 'Cancellation fee percentage if cancelled within 24h', 'booking', true),
  ('booking.auto_confirm_hours', '2', 'number', 'Hours to wait before auto-confirming booking if owner does not respond', 'booking', false),

  -- FGO (Fund Guarantee Operations)
  ('fgo.contribution_percent', '15', 'number', 'Percentage of deposit contributed to FGO fund', 'fgo', false),
  ('fgo.min_risk_score_for_waiver', '0.85', 'number', 'Minimum risk score to waive FGO contribution', 'fgo', false),

  -- WALLET
  ('wallet.min_deposit.usd', '10', 'number', 'Minimum wallet deposit amount (USD)', 'wallet', true),
  ('wallet.max_deposit.usd', '5000', 'number', 'Maximum wallet deposit amount per transaction (USD)', 'wallet', true),
  ('wallet.withdrawal_fee_percent', '2.5', 'number', 'Withdrawal fee percentage', 'wallet', true),
  ('wallet.min_withdrawal.usd', '50', 'number', 'Minimum withdrawal amount (USD)', 'wallet', true),

  -- MERCADOPAGO
  ('mercadopago.hold_reauth_days', '7', 'number', 'Days before credit card hold needs reauthorization', 'payment', false),
  ('mercadopago.webhook_timeout_seconds', '30', 'number', 'Timeout for webhook processing (seconds)', 'payment', false),

  -- NOTIFICATIONS
  ('notification.reminder_hours_before', '24', 'number', 'Hours before booking to send reminder', 'notification', false),
  ('notification.review_request_hours_after', '24', 'number', 'Hours after booking completion to request review', 'notification', false),

  -- RATE LIMITS
  ('limits.max_active_bookings_per_user', '5', 'number', 'Maximum concurrent active bookings per user', 'limits', true),
  ('limits.max_bookings_per_car_per_month', '20', 'number', 'Maximum bookings per car per month', 'limits', false),
  ('limits.max_api_calls_per_minute', '100', 'number', 'Rate limit for API calls', 'limits', false),

  -- FEATURES
  ('features.dynamic_pricing_enabled', 'true', 'boolean', 'Enable dynamic pricing system', 'features', false),
  ('features.wallet_enabled', 'true', 'boolean', 'Enable wallet payments', 'features', true),
  ('features.instant_booking_enabled', 'true', 'boolean', 'Enable instant booking without owner approval', 'features', true),

  -- CURRENCIES
  ('currency.default', '"USD"', 'string', 'Default platform currency', 'currency', true),
  ('currency.supported', '["USD", "ARS"]', 'json', 'Supported currencies', 'currency', true),
  ('currency.exchange_rate_margin_percent', '10', 'number', 'Margin added to exchange rates for platform profit', 'currency', false)

ON CONFLICT (key) DO NOTHING; -- Don't overwrite existing config

-- ============================================================================
-- SECTION 3: Helper functions
-- ============================================================================

-- Get config value as NUMBER
CREATE OR REPLACE FUNCTION public.config_get_number(p_key TEXT)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value DECIMAL;
BEGIN
  SELECT (value::text)::DECIMAL
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'number';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a number', p_key;
  END IF;

  RETURN v_value;
END;
$$;

-- Get config value as STRING
CREATE OR REPLACE FUNCTION public.config_get_string(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value::text
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'string';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a string', p_key;
  END IF;

  -- Remove JSON quotes
  v_value := TRIM(BOTH '"' FROM v_value);

  RETURN v_value;
END;
$$;

-- Get config value as BOOLEAN
CREATE OR REPLACE FUNCTION public.config_get_boolean(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value BOOLEAN;
BEGIN
  SELECT (value::text)::BOOLEAN
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'boolean';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a boolean', p_key;
  END IF;

  RETURN v_value;
END;
$$;

-- Get config value as JSON
CREATE OR REPLACE FUNCTION public.config_get_json(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'json';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not JSON', p_key;
  END IF;

  RETURN v_value;
END;
$$;

-- Get all public config (for frontend)
CREATE OR REPLACE FUNCTION public.config_get_public()
RETURNS TABLE(key TEXT, value JSONB, data_type TEXT, description TEXT, category TEXT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.key,
    c.value,
    c.data_type,
    c.description,
    c.category
  FROM public.platform_config c
  WHERE c.is_public = true
  ORDER BY c.category, c.key;
END;
$$;

-- Update config value (admin only)
CREATE OR REPLACE FUNCTION public.config_update(
  p_key TEXT,
  p_value JSONB
)
RETURNS public.platform_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.platform_config;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can update platform config';
  END IF;

  UPDATE public.platform_config
  SET
    value = p_value,
    updated_at = NOW()
  WHERE key = p_key
  RETURNING * INTO v_config;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config key "%" not found', p_key;
  END IF;

  RETURN v_config;
END;
$$;

-- ============================================================================
-- SECTION 4: Grant permissions
-- ============================================================================

-- Read-only access for authenticated users (only public configs)
GRANT SELECT ON public.platform_config TO authenticated;

-- Execute permissions for helper functions
GRANT EXECUTE ON FUNCTION public.config_get_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.config_get_string(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.config_get_boolean(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.config_get_json(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.config_get_public() TO authenticated;

-- Admin-only for updates
GRANT EXECUTE ON FUNCTION public.config_update(TEXT, JSONB) TO authenticated;

-- Service role has full access
GRANT ALL ON public.platform_config TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- SECTION 5: Comments
-- ============================================================================

COMMENT ON TABLE public.platform_config IS 'Centralized platform configuration to avoid hardcoded values in code';
COMMENT ON FUNCTION public.config_get_number IS 'Get config value as number (throws error if not found)';
COMMENT ON FUNCTION public.config_get_string IS 'Get config value as string (throws error if not found)';
COMMENT ON FUNCTION public.config_get_boolean IS 'Get config value as boolean (throws error if not found)';
COMMENT ON FUNCTION public.config_get_json IS 'Get config value as JSON (throws error if not found)';
COMMENT ON FUNCTION public.config_get_public IS 'Get all public config values (safe for frontend)';
COMMENT ON FUNCTION public.config_update IS 'Update config value (admin only)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;
