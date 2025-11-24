-- ============================================================================
-- MIGRATION 7: Fix Function Search Path (Batch 4-5 - Review/Referral/User/Misc)
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: CRITICAL
-- Functions: 28 (Review, Referral, User Stats, Miscellaneous)
-- ============================================================================

-- ============================================================================
-- REVIEW & CLAIM FUNCTIONS (6 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_review(p_booking_id UUID, p_reviewer_id UUID, p_rating INTEGER, p_comment TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_review_id UUID;
BEGIN
  INSERT INTO reviews (booking_id, reviewer_id, rating, comment, created_at)
  VALUES (p_booking_id, p_reviewer_id, p_rating, p_comment, NOW())
  RETURNING id INTO v_review_id;
  RETURN v_review_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_claims_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_completed_transaction_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify completed transaction';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_message_content_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.content <> NEW.content THEN
    RAISE EXCEPTION 'Cannot modify message content';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_stats_v2_for_booking(p_user_id UUID, p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE user_stats SET total_bookings = total_bookings + 1 WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_trip_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_score FROM bookings WHERE user_id = p_user_id AND status = 'completed';
  RETURN v_score * 10;
END;
$$;

-- ============================================================================
-- REFERRAL & MILESTONE FUNCTIONS (7 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code VARCHAR;
BEGIN
  v_code := SUBSTR(MD5(p_user_id::TEXT), 1, 8);
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id UUID, p_code VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = p_code;
  IF FOUND THEN
    INSERT INTO referral_uses (referrer_id, user_id, code, created_at)
    VALUES (v_referrer_id, p_user_id, p_code, NOW());
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_referral_milestone(p_user_id UUID, p_milestone_type VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO referral_milestones (user_id, milestone_type, completed_at)
  VALUES (p_user_id, p_milestone_type, NOW());
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_referral_code_on_first_car()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code VARCHAR;
BEGIN
  v_code := generate_referral_code(NEW.owner_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_first_booking_milestone(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN complete_referral_milestone(p_user_id, 'first_booking');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM waitlist WHERE status = 'pending';
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payout_stats(p_user_id UUID)
RETURNS TABLE(total_earned NUMERIC, total_paid NUMERIC, pending NUMERIC, status VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END), 0),
    'active'::VARCHAR
  FROM payouts
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================================================
-- USER STATS & UTILITY FUNCTIONS (9 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_public_stats(p_user_id UUID)
RETURNS TABLE(total_bookings INTEGER, avg_rating NUMERIC, response_rate NUMERIC, total_earned NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT b.id)::INTEGER,
    ROUND(AVG(r.rating)::NUMERIC, 2),
    0::NUMERIC,
    COALESCE(SUM(p.amount), 0)
  FROM bookings b
  LEFT JOIN reviews r ON b.id = r.booking_id
  LEFT JOIN payouts p ON b.owner_id = p.user_id
  WHERE b.owner_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_at_least_18(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_dob DATE;
BEGIN
  SELECT birth_date INTO v_dob FROM profiles WHERE id = p_user_id;
  RETURN (CURRENT_DATE - v_dob) >= 18 * INTERVAL '1 year';
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_age(p_birth_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(p_birth_date))::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_publish_car(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN is_at_least_18(p_user_id) AND user_can_receive_payments(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.estimate_vehicle_value_usd(p_car_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_value NUMERIC;
BEGIN
  SELECT estimated_value INTO v_value FROM cars WHERE id = p_car_id;
  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_vehicle_value(p_car_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN estimate_vehicle_value_usd(p_car_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_daily_rate_pct(p_car_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT daily_rate / estimated_value INTO v_rate FROM cars WHERE id = p_car_id;
  RETURN ROUND(v_rate * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_suggested_daily_rate(p_car_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_value NUMERIC;
  v_suggested_rate NUMERIC;
BEGIN
  SELECT estimated_value INTO v_value FROM cars WHERE id = p_car_id;
  v_suggested_rate := v_value * 0.001; -- 0.1% daily
  RETURN ROUND(v_suggested_rate, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.populate_car_estimates(p_car_id UUID, p_year INTEGER, p_model VARCHAR, p_mileage INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base_value NUMERIC := 10000;
BEGIN
  UPDATE cars 
  SET estimated_value = v_base_value * (1 - (EXTRACT(YEAR FROM CURRENT_DATE) - p_year) * 0.08)
  WHERE id = p_car_id;
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- MARKETPLACE & CAR SEARCH FUNCTIONS (6 functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_cars()
RETURNS TABLE(id UUID, owner_id UUID, daily_rate NUMERIC, location GEOGRAPHY)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.owner_id, c.daily_rate, c.location
  FROM cars c
  WHERE c.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.car_id = c.id
    AND b.status NOT IN ('cancelled', 'completed')
    AND (b.end_date - b.start_date) > INTERVAL '0 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cars_within_radius(p_latitude NUMERIC, p_longitude NUMERIC, p_radius_km NUMERIC)
RETURNS TABLE(id UUID, owner_id UUID, daily_rate NUMERIC, distance_km NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.owner_id, c.daily_rate,
    ST_Distance(c.location, ST_GeogFromText('SRID=4326;POINT(' || p_longitude || ' ' || p_latitude || ')')) / 1000
  FROM cars c
  WHERE ST_DWithin(c.location, ST_GeogFromText('SRID=4326;POINT(' || p_longitude || ' ' || p_latitude || ')'), p_radius_km * 1000)
  ORDER BY ST_Distance(c.location, ST_GeogFromText('SRID=4326;POINT(' || p_longitude || ' ' || p_latitude || ')'));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_marketplace_approved_owners()
RETURNS TABLE(id UUID, name VARCHAR, avg_rating NUMERIC, total_cars INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, ROUND(AVG(r.rating)::NUMERIC, 2), COUNT(DISTINCT c.id)::INTEGER
  FROM profiles p
  LEFT JOIN cars c ON p.id = c.owner_id
  LEFT JOIN reviews r ON EXISTS (SELECT 1 FROM bookings b WHERE b.car_id = c.id AND b.id = r.booking_id)
  WHERE p.status = 'verified'
  GROUP BY p.id, p.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_brazil_model_equivalent(p_model_name VARCHAR)
RETURNS TABLE(equivalent_model VARCHAR, source_country VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT bme.equivalent_model, bme.source_country
  FROM brazil_model_equivalents bme
  WHERE bme.imported_model ILIKE p_model_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_demand_snapshots()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO demand_snapshots (car_id, demand_level, multiplier, created_at)
  SELECT c.id, 'medium', 1.0, NOW() FROM cars c
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_demand_snapshot(p_car_id UUID, p_multiplier NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO demand_snapshots (car_id, multiplier, created_at)
  VALUES (p_car_id, p_multiplier, NOW());
  RETURN TRUE;
END;
$$;

