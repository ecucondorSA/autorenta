-- ============================================================================
-- MIGRATION: Create lock_price_for_booking RPC
-- Date: 2025-11-11
-- Purpose: Lock a dynamic price for 15 minutes before booking
-- Impact: Prevents price changes during checkout process
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create RPC function to lock price
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lock_price_for_booking(
  p_car_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region_id UUID;
  v_car_record RECORD;
  v_dynamic_price JSONB;
  v_lock_token UUID;
  v_lock_expires TIMESTAMPTZ;
BEGIN
  -- Validate car exists and get details
  SELECT id, region_id, price_per_day, uses_dynamic_pricing
  INTO v_car_record
  FROM public.cars
  WHERE id = p_car_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or deleted';
  END IF;

  -- Check if car uses dynamic pricing
  IF v_car_record.uses_dynamic_pricing = false OR v_car_record.region_id IS NULL THEN
    -- Return fixed price (no lock needed)
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'message', 'This car uses fixed pricing'
    );
  END IF;

  -- Calculate dynamic price using existing function
  v_dynamic_price := public.calculate_dynamic_price(
    v_car_record.region_id,
    p_user_id,
    p_rental_start,
    p_rental_hours
  );

  -- Generate lock token and expiry
  v_lock_token := gen_random_uuid();
  v_lock_expires := NOW() + INTERVAL '15 minutes';

  -- Return complete price lock data
  RETURN jsonb_build_object(
    'uses_dynamic_pricing', true,
    'price', v_dynamic_price,
    'locked_until', v_lock_expires,
    'lock_token', v_lock_token,
    'car_id', p_car_id,
    'user_id', p_user_id,
    'rental_start', p_rental_start,
    'rental_hours', p_rental_hours,
    'created_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return fallback to fixed price
    RAISE WARNING 'Error calculating dynamic price for car %: %', p_car_id, SQLERRM;
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'error', SQLERRM,
      'fallback', true,
      'message', 'Fell back to fixed pricing due to calculation error'
    );
END;
$$;

-- ============================================================================
-- 2. Add function comment
-- ============================================================================

COMMENT ON FUNCTION public.lock_price_for_booking(UUID, UUID, TIMESTAMPTZ, INT) IS
  'Calculates and locks a dynamic price for 15 minutes. Returns price lock data including token, expiry, and price breakdown. Falls back to fixed price if dynamic pricing is not available or calculation fails.';

-- ============================================================================
-- 3. Grant execute permissions
-- ============================================================================

-- Allow authenticated users to lock prices
GRANT EXECUTE ON FUNCTION public.lock_price_for_booking(UUID, UUID, TIMESTAMPTZ, INT)
TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Test with a real car (replace UUIDs with actual values)
-- SELECT public.lock_price_for_booking(
--   'your-car-id'::UUID,
--   'your-user-id'::UUID,
--   NOW() + INTERVAL '1 day',
--   24
-- );

-- Expected response (dynamic pricing):
-- {
--   "uses_dynamic_pricing": true,
--   "price": {
--     "price_per_hour": 12.50,
--     "total_price": 300.00,
--     "breakdown": {
--       "base_price": 10.00,
--       "day_factor": 0.10,
--       "hour_factor": 0.20,
--       ...
--     },
--     "surge_active": true,
--     "surge_message": "⚡ Alta demanda (+25%)"
--   },
--   "locked_until": "2025-11-11T15:30:00Z",
--   "lock_token": "a1b2c3d4-...",
--   ...
-- }

-- Expected response (fixed pricing):
-- {
--   "uses_dynamic_pricing": false,
--   "fixed_price": 50.00,
--   "message": "This car uses fixed pricing"
-- }
