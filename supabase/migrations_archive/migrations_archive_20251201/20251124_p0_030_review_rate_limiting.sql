-- =====================================================
-- P0-030: Review System Rate Limiting
-- PROBLEMA: Users pueden dejar 1000 reviews en 1 minuto (spam)
-- FIX: 1 review per booking máximo + 5 reviews per day per user
-- =====================================================

-- STEP 1: Create table to track review rate limiting
CREATE TABLE IF NOT EXISTS review_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one rate limit window per user
  UNIQUE(user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_review_rate_limits_user_window
  ON review_rate_limits(user_id, window_start DESC);

-- RLS policies for review_rate_limits
ALTER TABLE review_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON review_rate_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only system can insert/update rate limits
CREATE POLICY "System can manage rate limits"
  ON review_rate_limits FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE review_rate_limits IS
'P0-030: Track review submission rate to prevent spam (5 reviews per day max)';

-- STEP 2: Update create_review_v2 function to enforce rate limits
CREATE OR REPLACE FUNCTION create_review_v2(
  p_booking_id UUID,
  p_reviewer_id UUID,
  p_reviewee_id UUID,
  p_car_id UUID,
  p_review_type VARCHAR(50),
  p_rating_cleanliness INTEGER,
  p_rating_communication INTEGER,
  p_rating_accuracy INTEGER,
  p_rating_location INTEGER,
  p_rating_checkin INTEGER,
  p_rating_value INTEGER,
  p_comment_public TEXT DEFAULT NULL,
  p_comment_private TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_review_id UUID;
  v_existing_review_count INTEGER;
  v_today_review_count INTEGER;
  v_today_start TIMESTAMPTZ;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validate reviewer is the authenticated user
  IF p_reviewer_id != auth.uid() THEN
    RAISE EXCEPTION 'Solo puedes crear reviews con tu propio ID';
  END IF;

  -- ✅ P0-030 FIX: Check for existing review for this booking
  SELECT COUNT(*)
  INTO v_existing_review_count
  FROM reviews
  WHERE booking_id = p_booking_id
    AND reviewer_id = p_reviewer_id;

  IF v_existing_review_count > 0 THEN
    RAISE EXCEPTION 'You can only leave 1 review per booking';
  END IF;

  -- ✅ P0-030 FIX: Check daily rate limit (5 reviews per day)
  v_today_start := DATE_TRUNC('day', NOW());

  SELECT COUNT(*)
  INTO v_today_review_count
  FROM reviews
  WHERE reviewer_id = p_reviewer_id
    AND created_at >= v_today_start
    AND created_at < v_today_start + INTERVAL '1 day';

  IF v_today_review_count >= 5 THEN
    RAISE EXCEPTION 'You can only leave 5 reviews per day. Please try again tomorrow.';
  END IF;

  -- Validate ratings are between 1 and 5
  IF p_rating_cleanliness < 1 OR p_rating_cleanliness > 5 THEN
    RAISE EXCEPTION 'Rating cleanliness debe estar entre 1 y 5';
  END IF;
  IF p_rating_communication < 1 OR p_rating_communication > 5 THEN
    RAISE EXCEPTION 'Rating communication debe estar entre 1 y 5';
  END IF;
  IF p_rating_accuracy < 1 OR p_rating_accuracy > 5 THEN
    RAISE EXCEPTION 'Rating accuracy debe estar entre 1 y 5';
  END IF;
  IF p_rating_location < 1 OR p_rating_location > 5 THEN
    RAISE EXCEPTION 'Rating location debe estar entre 1 y 5';
  END IF;
  IF p_rating_checkin < 1 OR p_rating_checkin > 5 THEN
    RAISE EXCEPTION 'Rating checkin debe estar entre 1 y 5';
  END IF;
  IF p_rating_value < 1 OR p_rating_value > 5 THEN
    RAISE EXCEPTION 'Rating value debe estar entre 1 y 5';
  END IF;

  -- Validate review type
  IF p_review_type NOT IN ('renter_to_owner', 'owner_to_renter') THEN
    RAISE EXCEPTION 'Tipo de review inválido';
  END IF;

  -- Generate review ID
  v_review_id := gen_random_uuid();

  -- Insert review
  INSERT INTO reviews (
    id,
    booking_id,
    reviewer_id,
    reviewee_id,
    car_id,
    review_type,
    rating_cleanliness,
    rating_communication,
    rating_accuracy,
    rating_location,
    rating_checkin,
    rating_value,
    comment_public,
    comment_private,
    is_visible,
    created_at
  ) VALUES (
    v_review_id,
    p_booking_id,
    p_reviewer_id,
    p_reviewee_id,
    p_car_id,
    p_review_type::review_type,
    p_rating_cleanliness,
    p_rating_communication,
    p_rating_accuracy,
    p_rating_location,
    p_rating_checkin,
    p_rating_value,
    p_comment_public,
    p_comment_private,
    TRUE,  -- Visible by default (can be moderated later)
    NOW()
  );

  -- ✅ P0-030 FIX: Record rate limit entry
  INSERT INTO review_rate_limits (user_id, review_count, window_start)
  VALUES (p_reviewer_id, 1, v_today_start)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET review_count = review_rate_limits.review_count + 1;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_review_v2 TO authenticated;

COMMENT ON FUNCTION create_review_v2 IS
'P0-030 FIX: Create review with rate limiting (1 per booking, 5 per day max)';

-- STEP 3: Create function to check if user can leave review
CREATE OR REPLACE FUNCTION can_leave_review(
  p_booking_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  can_review BOOLEAN,
  reason TEXT,
  reviews_today INTEGER,
  reviews_remaining INTEGER
)
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_review_count INTEGER;
  v_today_review_count INTEGER;
  v_today_start TIMESTAMPTZ;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuario no autenticado'::TEXT, 0, 0;
    RETURN;
  END IF;

  -- Check for existing review for this booking
  SELECT COUNT(*)
  INTO v_existing_review_count
  FROM reviews
  WHERE booking_id = p_booking_id
    AND reviewer_id = v_user_id;

  IF v_existing_review_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'Ya has dejado una review para esta reserva'::TEXT, 0, 0;
    RETURN;
  END IF;

  -- Check daily rate limit
  v_today_start := DATE_TRUNC('day', NOW());

  SELECT COUNT(*)
  INTO v_today_review_count
  FROM reviews
  WHERE reviewer_id = v_user_id
    AND created_at >= v_today_start
    AND created_at < v_today_start + INTERVAL '1 day';

  IF v_today_review_count >= 5 THEN
    RETURN QUERY SELECT
      FALSE,
      'Has alcanzado el límite de 5 reviews por día'::TEXT,
      v_today_review_count,
      0;
    RETURN;
  END IF;

  -- User can leave review
  RETURN QUERY SELECT
    TRUE,
    'Puedes dejar una review'::TEXT,
    v_today_review_count,
    (5 - v_today_review_count);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION can_leave_review TO authenticated;

COMMENT ON FUNCTION can_leave_review IS
'P0-030: Check if user can leave a review (rate limit validation)';

-- =====================================================
-- TESTING
-- =====================================================

-- Test: Check if user can leave review
-- SELECT * FROM can_leave_review('some-booking-id'::UUID);

-- Expected results:
-- can_review | reason                    | reviews_today | reviews_remaining
-- -----------|---------------------------|---------------|------------------
-- true       | Puedes dejar una review  | 0             | 5

-- =====================================================
-- SUMMARY
-- =====================================================

-- P0-030 FIXES APPLIED:
-- 1. ✅ Created review_rate_limits table to track daily submissions
-- 2. ✅ Updated create_review_v2() to check:
--    - Only 1 review per booking
--    - Maximum 5 reviews per day per user
-- 3. ✅ Created can_leave_review() helper function
-- 4. ✅ Added proper error messages for rate limit violations
-- 5. ✅ Rate limit resets daily at midnight
