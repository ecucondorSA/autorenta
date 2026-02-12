-- ============================================================================
-- FIX: trigger_fragment_distribution reads from non-existent 'remote_config'
--
-- Problems:
--   1. Table is 'app_config', not 'remote_config'
--   2. Column 'value' is JSONB, needs cast via ->>
--   3. REWARD_POOL_RATE row was never inserted
--
-- This migration:
--   a) Inserts REWARD_POOL_RATE into app_config (idempotent)
--   b) Replaces the trigger function with corrected table/column reference
-- ============================================================================

BEGIN;

-- 1. Insert REWARD_POOL_RATE if not exists
INSERT INTO public.app_config (id, key, value, description, environment, category)
VALUES (
  gen_random_uuid(),
  'REWARD_POOL_RATE',
  '0.70'::jsonb,
  'Fraction of booking revenue distributed to fragment holders (0.70 = 70%)',
  'production',
  'fragments'
)
ON CONFLICT (key, environment) DO NOTHING;

-- 2. Replace trigger function with corrected table reference
CREATE OR REPLACE FUNCTION public.trigger_fragment_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_reward_rate NUMERIC;
  v_reward_pool_cents BIGINT;
  v_result JSONB;
BEGIN
  -- Only fire on transition TO 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Quick check: does this car have a linked vehicle_asset?
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_assets va
    WHERE va.car_id = NEW.car_id
      AND va.status IN ('operational', 'funded')
  ) THEN
    RETURN NEW;  -- Normal booking, not a fragment vehicle
  END IF;

  -- Read reward pool rate from app_config (FIXED: was 'remote_config')
  -- app_config.value is JSONB, extract as text then cast
  SELECT COALESCE(
    (SELECT (value #>> '{}')::NUMERIC FROM public.app_config
     WHERE key = 'REWARD_POOL_RATE'
       AND environment = 'production'
     LIMIT 1),
    0.70
  ) INTO v_reward_rate;

  -- Calculate reward pool in ARS cents
  -- bookings.total_price is ARS full units (e.g., 15000.00)
  v_reward_pool_cents := ROUND(COALESCE(NEW.total_price, 0) * v_reward_rate * 100)::BIGINT;

  IF v_reward_pool_cents <= 0 THEN
    RETURN NEW;
  END IF;

  -- Distribute to fragment holders
  v_result := public.distribute_booking_to_fragments(
    NEW.id,
    v_reward_pool_cents,
    COALESCE(NEW.currency, 'ARS')
  );

  RETURN NEW;
END;
$$;

COMMIT;
