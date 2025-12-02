-- ============================================================================
-- MIGRATION: Update lock_price_for_booking() to use vehicle-aware pricing
-- Date: 2025-11-11
-- Purpose: Pass car_id to calculate_dynamic_price() for vehicle-specific pricing
-- Impact: Price locks now consider vehicle type, value, and depreciation
-- ============================================================================

BEGIN;

-- ============================================================================
-- Update lock_price_for_booking() to pass car_id
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

  -- Calculate dynamic price using VEHICLE-AWARE pricing
  v_dynamic_price := public.calculate_dynamic_price(
    v_car_record.region_id,
    p_user_id,
    p_rental_start,
    p_rental_hours,
    p_car_id  -- NEW: Pass car_id for vehicle-specific base price
  );

  -- Generate lock token and expiry
  v_lock_token := gen_random_uuid();
  v_lock_expires := NOW() + INTERVAL '15 minutes';

  -- Return complete price lock data
  RETURN jsonb_build_object(
    'uses_dynamic_pricing', true,
    'vehicle_aware_pricing', true,  -- NEW: Flag to indicate vehicle-specific pricing
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

COMMENT ON FUNCTION public.lock_price_for_booking IS
'Locks a dynamic price for 15 minutes before booking.
Updated to use vehicle-aware pricing that considers vehicle type, value, and depreciation.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test price lock for a specific car
-- SELECT lock_price_for_booking(
--   'your-car-id'::UUID,
--   'your-user-id'::UUID,
--   NOW() + INTERVAL '2 days',
--   24
-- );

-- Compare locked prices for different vehicles
-- SELECT
--   c.brand_text_backup || ' ' || c.model_text_backup AS vehicle,
--   vc.name AS category,
--   COALESCE(c.value_usd, c.estimated_value_usd) AS vehicle_value,
--   (
--     lock_price_for_booking(
--       c.id,
--       (SELECT id FROM profiles LIMIT 1),
--       NOW() + INTERVAL '2 days',
--       24
--     )->'price'->>'total_price'
--   )::DECIMAL AS locked_total_price_24h
-- FROM cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- WHERE c.uses_dynamic_pricing = true
--   AND c.region_id IS NOT NULL
-- ORDER BY vehicle_value DESC
-- LIMIT 10;
