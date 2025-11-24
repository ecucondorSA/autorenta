-- ============================================================================
-- MIGRATION 5: Fix Function Search Path (Batch 2 - Payment/Authorization/Validation)
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: CRITICAL
-- Functions: 15 (Payment Authorization, Validation, Verification)
-- ============================================================================

-- ============================================================================
-- PAYMENT INTENT & BOOKING FUNCTIONS (6 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_booking(p_car_id UUID, p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  INSERT INTO bookings (car_id, user_id, start_date, end_date, status)
  VALUES (p_car_id, p_user_id, p_start_date, p_end_date, 'pending')
  RETURNING id INTO v_booking_id;
  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE bookings SET status = 'approved', approved_at = NOW() WHERE id = p_booking_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_car_availability(p_car_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
    AND status NOT IN ('cancelled', 'completed')
    AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_availability(p_car_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN check_car_availability(p_car_id, p_start_date, p_end_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_distance(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_distance NUMERIC;
BEGIN
  SELECT distance INTO v_distance FROM bookings WHERE id = p_booking_id;
  RETURN COALESCE(v_distance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_price_for_booking(p_booking_id UUID, p_price NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE bookings SET locked_price = p_price WHERE id = p_booking_id;
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- CREDIT & PROTECTION FUNCTIONS (9 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.issue_autorentar_credit(p_user_id UUID, p_amount NUMERIC, p_expires_in_days INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  INSERT INTO autorentar_credits (user_id, balance, expires_at)
  VALUES (p_user_id, p_amount, NOW() + (p_expires_in_days || ' days')::INTERVAL)
  RETURNING id INTO v_credit_id;
  RETURN v_credit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_autorentar_credit_expiry(p_user_id UUID)
RETURNS TABLE(credit_id UUID, balance NUMERIC, expires_at TIMESTAMPTZ, expired BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.id, ac.balance, ac.expires_at, ac.expires_at < NOW()
  FROM autorentar_credits ac
  WHERE ac.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_autorentar_credit_for_claim(p_credit_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE autorentar_credits SET balance = balance - p_amount WHERE id = p_credit_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_bonus_protector(p_user_id UUID, p_booking_id UUID, p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  INSERT INTO bonus_protector_purchases (user_id, booking_id, amount, purchased_at)
  VALUES (p_user_id, p_booking_id, p_amount, NOW())
  RETURNING id INTO v_purchase_id;
  RETURN v_purchase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_protection_credit(p_user_id UUID, p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  INSERT INTO protection_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  RETURNING id INTO v_credit_id;
  RETURN v_credit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_protection_credit_for_claim(p_credit_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE protection_credits SET balance = balance - p_amount WHERE id = p_credit_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_protection_credit_for_good_history(p_user_id UUID, p_additional_days INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE protection_credits 
  SET expires_at = expires_at + (p_additional_days || ' days')::INTERVAL
  WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.recognize_protection_credit_breakage(p_credit_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO credit_breakage_log (credit_id, amount, reason)
  VALUES (p_credit_id, p_amount, 'protection_breakage');
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.recognize_autorentar_credit_breakage(p_credit_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO credit_breakage_log (credit_id, amount, reason)
  VALUES (p_credit_id, p_amount, 'autorentar_breakage');
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- LOCATION & DISTANCE FUNCTIONS (3 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_distance_km(p_lat1 NUMERIC, p_lon1 NUMERIC, p_lat2 NUMERIC, p_lon2 NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Haversine formula
  RETURN ROUND((
    6371 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS((p_lat2 - p_lat1) / 2)), 2) +
      COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2)) * POWER(SIN(RADIANS((p_lon2 - p_lon1) / 2)), 2)
    ))
  )::NUMERIC, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_location(p_tracking_id UUID, p_latitude NUMERIC, p_longitude NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE location_tracking SET latitude = p_latitude, longitude = p_longitude, updated_at = NOW() WHERE id = p_tracking_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_location_tracking_timestamp(p_tracking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE location_tracking SET updated_at = NOW() WHERE id = p_tracking_id;
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- BATCH 2 SUMMARY
-- ============================================================================
-- Total Functions Fixed: 15
-- - Payment/Booking: 6
-- - Credit/Protection: 9
-- - Location/Distance: 3
-- 
-- All functions now include SET search_path = 'public'
-- Ready for execution and verification
-- ============================================================================

