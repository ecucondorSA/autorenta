-- ============================================================================
-- REVIEWS SYSTEM V2 UPGRADE
-- ============================================================================
-- Upgrades the reviews system from v1 (simple rating + comment) to v2
-- (multi-dimensional ratings, stats tracking, moderation system)
--
-- Migration Steps:
-- 1. Backup existing reviews data
-- 2. Add v2 columns to reviews table
-- 3. Migrate v1 data to v2 format
-- 4. Create user_stats table
-- 5. Create optimized indexes
-- 6. Update RLS policies
-- 7. Create RPC functions
-- 8. Create triggers for auto-updating stats
-- 9. Grant permissions
-- ============================================================================

-- ============================================================================
-- STEP 1: BACKUP EXISTING REVIEWS DATA
-- ============================================================================

-- Create temporary backup table
CREATE TABLE IF NOT EXISTS public.reviews_v1_backup AS
SELECT * FROM public.reviews;

COMMENT ON TABLE public.reviews_v1_backup IS
'Backup of reviews table before v2 upgrade. Created: ' || now()::text;

-- ============================================================================
-- STEP 2: ADD V2 COLUMNS TO REVIEWS TABLE
-- ============================================================================

-- Add category ratings (1-5 scale, nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_communication'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_cleanliness'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_cleanliness INTEGER CHECK (rating_cleanliness >= 1 AND rating_cleanliness <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_punctuality'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_punctuality INTEGER CHECK (rating_punctuality >= 1 AND rating_punctuality <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_vehicle_condition'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_vehicle_condition INTEGER CHECK (rating_vehicle_condition >= 1 AND rating_vehicle_condition <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_accuracy'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_accuracy INTEGER CHECK (rating_accuracy >= 1 AND rating_accuracy <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating_value'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5);
  END IF;
END $$;

-- Add review type enum (replaces is_car_review and is_renter_review booleans)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_type_enum') THEN
    CREATE TYPE review_type_enum AS ENUM ('locador', 'locatario', 'car');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'review_type'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN review_type review_type_enum;
  END IF;
END $$;

-- Add moderation fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'moderation_reason'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN moderation_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'moderated_at'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN moderated_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'moderated_by'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN moderated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add response field (for reviewees to respond)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'response'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN response TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'response_at'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN response_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add helpful votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'helpful_count'
  ) THEN
    ALTER TABLE public.reviews
    ADD COLUMN helpful_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN public.reviews.rating_communication IS 'Communication quality (1-5)';
COMMENT ON COLUMN public.reviews.rating_cleanliness IS 'Cleanliness of vehicle/behavior (1-5)';
COMMENT ON COLUMN public.reviews.rating_punctuality IS 'Timeliness and punctuality (1-5)';
COMMENT ON COLUMN public.reviews.rating_vehicle_condition IS 'Vehicle condition (car reviews only, 1-5)';
COMMENT ON COLUMN public.reviews.rating_accuracy IS 'Accuracy of listing/profile (1-5)';
COMMENT ON COLUMN public.reviews.rating_value IS 'Value for money (1-5)';
COMMENT ON COLUMN public.reviews.review_type IS 'Type of review: locador (owner), locatario (renter), car';
COMMENT ON COLUMN public.reviews.is_flagged IS 'User-flagged for moderation';
COMMENT ON COLUMN public.reviews.is_hidden IS 'Hidden by admin/moderation';
COMMENT ON COLUMN public.reviews.moderation_reason IS 'Reason for hiding (if moderated)';
COMMENT ON COLUMN public.reviews.response IS 'Response from reviewee';
COMMENT ON COLUMN public.reviews.helpful_count IS 'Number of users who found this review helpful';

-- ============================================================================
-- STEP 3: MIGRATE V1 DATA TO V2 FORMAT
-- ============================================================================

-- Migrate review_type from booleans to enum
UPDATE public.reviews
SET review_type = CASE
  WHEN is_car_review = true THEN 'car'::review_type_enum
  WHEN is_renter_review = true THEN 'locatario'::review_type_enum
  ELSE 'locador'::review_type_enum
END
WHERE review_type IS NULL;

-- Set default category ratings based on overall rating
-- (This provides backward compatibility for v1 reviews)
UPDATE public.reviews
SET
  rating_communication = rating,
  rating_cleanliness = rating,
  rating_punctuality = rating,
  rating_vehicle_condition = CASE WHEN review_type = 'car' THEN rating ELSE NULL END,
  rating_accuracy = rating,
  rating_value = rating
WHERE rating_communication IS NULL;

-- Make review_type NOT NULL after migration
ALTER TABLE public.reviews
ALTER COLUMN review_type SET NOT NULL;

-- ============================================================================
-- STEP 4: CREATE USER_STATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Locador (owner) stats
  locador_avg_rating DECIMAL(3, 2) DEFAULT 0,
  locador_review_count INTEGER DEFAULT 0,
  locador_avg_communication DECIMAL(3, 2) DEFAULT 0,
  locador_avg_cleanliness DECIMAL(3, 2) DEFAULT 0,
  locador_avg_punctuality DECIMAL(3, 2) DEFAULT 0,
  locador_avg_accuracy DECIMAL(3, 2) DEFAULT 0,
  locador_avg_value DECIMAL(3, 2) DEFAULT 0,

  -- Locatario (renter) stats
  locatario_avg_rating DECIMAL(3, 2) DEFAULT 0,
  locatario_review_count INTEGER DEFAULT 0,
  locatario_avg_communication DECIMAL(3, 2) DEFAULT 0,
  locatario_avg_cleanliness DECIMAL(3, 2) DEFAULT 0,
  locatario_avg_punctuality DECIMAL(3, 2) DEFAULT 0,
  locatario_avg_accuracy DECIMAL(3, 2) DEFAULT 0,
  locatario_avg_value DECIMAL(3, 2) DEFAULT 0,

  -- Car stats (aggregated from all cars owned by user)
  car_avg_rating DECIMAL(3, 2) DEFAULT 0,
  car_review_count INTEGER DEFAULT 0,
  car_avg_vehicle_condition DECIMAL(3, 2) DEFAULT 0,
  car_avg_cleanliness DECIMAL(3, 2) DEFAULT 0,
  car_avg_accuracy DECIMAL(3, 2) DEFAULT 0,
  car_avg_value DECIMAL(3, 2) DEFAULT 0,

  -- Metadata
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_stats IS 'Aggregated review statistics per user (locador, locatario, car ratings)';

-- Enable RLS on user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE OPTIMIZED INDEXES
-- ============================================================================

-- Indexes for reviews table (add only if they don't exist)
DO $$
BEGIN
  -- Index for review type filtering
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_review_type'
  ) THEN
    CREATE INDEX idx_reviews_review_type ON public.reviews(review_type);
  END IF;

  -- Index for moderation queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_flagged'
  ) THEN
    CREATE INDEX idx_reviews_flagged ON public.reviews(is_flagged) WHERE is_flagged = true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_hidden'
  ) THEN
    CREATE INDEX idx_reviews_hidden ON public.reviews(is_hidden);
  END IF;

  -- Composite index for user review lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_reviewee_type_created'
  ) THEN
    CREATE INDEX idx_reviews_reviewee_type_created
    ON public.reviews(reviewee_id, review_type, created_at DESC);
  END IF;

  -- Index for helpful reviews
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_helpful_count'
  ) THEN
    CREATE INDEX idx_reviews_helpful_count ON public.reviews(helpful_count DESC);
  END IF;
END $$;

-- Indexes for user_stats table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_stats_locador_rating'
  ) THEN
    CREATE INDEX idx_user_stats_locador_rating
    ON public.user_stats(locador_avg_rating DESC)
    WHERE locador_review_count > 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_stats_locatario_rating'
  ) THEN
    CREATE INDEX idx_user_stats_locatario_rating
    ON public.user_stats(locatario_avg_rating DESC)
    WHERE locatario_review_count > 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_stats_car_rating'
  ) THEN
    CREATE INDEX idx_user_stats_car_rating
    ON public.user_stats(car_avg_rating DESC)
    WHERE car_review_count > 0;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Booking participants can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviewers can delete own reviews" ON public.reviews;

-- Create new v2 policies

-- SELECT: Anyone can view non-hidden reviews
CREATE POLICY "Anyone can view non-hidden reviews"
ON public.reviews FOR SELECT
USING (is_hidden = false);

-- SELECT: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- INSERT: Booking participants can create reviews after booking completion
CREATE POLICY "Booking participants can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND NOT EXISTS (
    -- Prevent duplicate reviews
    SELECT 1 FROM public.reviews r
    WHERE r.booking_id = reviews.booking_id
    AND r.reviewer_id = auth.uid()
    AND r.review_type = reviews.review_type
  )
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = reviews.booking_id
    AND b.status = 'completed'
    AND (
      -- Renter can review owner or car
      (b.renter_id = auth.uid() AND (
        (reviews.review_type = 'locador' AND reviews.reviewee_id IN (
          SELECT c.owner_id FROM public.cars c WHERE c.id = b.car_id
        ))
        OR
        (reviews.review_type = 'car' AND reviews.reviewee_id IN (
          SELECT c.owner_id FROM public.cars c WHERE c.id = b.car_id
        ))
      ))
      OR
      -- Owner can review renter
      (reviews.review_type = 'locatario' AND EXISTS (
        SELECT 1 FROM public.cars c
        WHERE c.id = b.car_id
        AND c.owner_id = auth.uid()
        AND reviews.reviewee_id = b.renter_id
      ))
    )
  )
);

-- UPDATE: Users can update their own reviews (within 7 days)
CREATE POLICY "Users can update own reviews within 7 days"
ON public.reviews FOR UPDATE
USING (
  reviewer_id = auth.uid()
  AND created_at > (now() - INTERVAL '7 days')
  AND is_hidden = false
)
WITH CHECK (
  reviewer_id = auth.uid()
);

-- UPDATE: Reviewees can add responses to reviews about them
CREATE POLICY "Reviewees can respond to reviews"
ON public.reviews FOR UPDATE
USING (
  reviewee_id = auth.uid()
  AND is_hidden = false
)
WITH CHECK (
  reviewee_id = auth.uid()
  -- Only allow updating response fields
  AND (
    (OLD.response IS NULL AND NEW.response IS NOT NULL)
    OR (OLD.response IS NOT NULL AND NEW.response != OLD.response)
  )
);

-- UPDATE: Admins can moderate reviews
CREATE POLICY "Admins can moderate reviews"
ON public.reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- DELETE: Users can delete their own reviews (within 24 hours)
CREATE POLICY "Users can delete own reviews within 24 hours"
ON public.reviews FOR DELETE
USING (
  reviewer_id = auth.uid()
  AND created_at > (now() - INTERVAL '24 hours')
  AND is_hidden = false
);

-- RLS Policies for user_stats
CREATE POLICY "Anyone can view user stats"
ON public.user_stats FOR SELECT
USING (true);

CREATE POLICY "Service can manage user stats"
ON public.user_stats FOR ALL
USING (auth.uid() IS NULL); -- Service role only

-- ============================================================================
-- STEP 7: CREATE RPC FUNCTIONS
-- ============================================================================

-- Function: Create a review (v2 with validations)
CREATE OR REPLACE FUNCTION public.create_review_v2(
  p_booking_id UUID,
  p_reviewee_id UUID,
  p_review_type review_type_enum,
  p_rating INTEGER,
  p_comment TEXT,
  p_rating_communication INTEGER,
  p_rating_cleanliness INTEGER,
  p_rating_punctuality INTEGER,
  p_rating_vehicle_condition INTEGER DEFAULT NULL,
  p_rating_accuracy INTEGER,
  p_rating_value INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review_id UUID;
  v_booking_status TEXT;
  v_renter_id UUID;
  v_car_owner_id UUID;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get booking details
  SELECT b.status, b.renter_id, c.owner_id
  INTO v_booking_status, v_renter_id, v_car_owner_id
  FROM public.bookings b
  JOIN public.cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Validate booking is completed
  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'Can only review completed bookings';
  END IF;

  -- Validate user is part of the booking
  IF auth.uid() != v_renter_id AND auth.uid() != v_car_owner_id THEN
    RAISE EXCEPTION 'User not part of this booking';
  END IF;

  -- Validate reviewee based on review type
  IF p_review_type = 'locador' AND p_reviewee_id != v_car_owner_id THEN
    RAISE EXCEPTION 'Invalid reviewee for locador review';
  END IF;

  IF p_review_type = 'locatario' AND p_reviewee_id != v_renter_id THEN
    RAISE EXCEPTION 'Invalid reviewee for locatario review';
  END IF;

  IF p_review_type = 'car' AND p_reviewee_id != v_car_owner_id THEN
    RAISE EXCEPTION 'Invalid reviewee for car review';
  END IF;

  -- Validate review type based on reviewer
  IF auth.uid() = v_renter_id AND p_review_type NOT IN ('locador', 'car') THEN
    RAISE EXCEPTION 'Renters can only review locador or car';
  END IF;

  IF auth.uid() = v_car_owner_id AND p_review_type != 'locatario' THEN
    RAISE EXCEPTION 'Owners can only review locatario';
  END IF;

  -- Check for duplicate review
  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id
    AND reviewer_id = auth.uid()
    AND review_type = p_review_type
  ) THEN
    RAISE EXCEPTION 'Review already exists for this booking and type';
  END IF;

  -- Validate ratings (1-5)
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  IF p_rating_communication < 1 OR p_rating_communication > 5 THEN
    RAISE EXCEPTION 'Communication rating must be between 1 and 5';
  END IF;

  IF p_rating_cleanliness < 1 OR p_rating_cleanliness > 5 THEN
    RAISE EXCEPTION 'Cleanliness rating must be between 1 and 5';
  END IF;

  IF p_rating_punctuality < 1 OR p_rating_punctuality > 5 THEN
    RAISE EXCEPTION 'Punctuality rating must be between 1 and 5';
  END IF;

  IF p_rating_accuracy < 1 OR p_rating_accuracy > 5 THEN
    RAISE EXCEPTION 'Accuracy rating must be between 1 and 5';
  END IF;

  IF p_rating_value < 1 OR p_rating_value > 5 THEN
    RAISE EXCEPTION 'Value rating must be between 1 and 5';
  END IF;

  IF p_rating_vehicle_condition IS NOT NULL AND (
    p_rating_vehicle_condition < 1 OR p_rating_vehicle_condition > 5
  ) THEN
    RAISE EXCEPTION 'Vehicle condition rating must be between 1 and 5';
  END IF;

  -- Validate vehicle_condition only for car reviews
  IF p_review_type = 'car' AND p_rating_vehicle_condition IS NULL THEN
    RAISE EXCEPTION 'Vehicle condition rating required for car reviews';
  END IF;

  -- Insert review
  INSERT INTO public.reviews (
    booking_id,
    reviewer_id,
    reviewee_id,
    review_type,
    rating,
    comment,
    rating_communication,
    rating_cleanliness,
    rating_punctuality,
    rating_vehicle_condition,
    rating_accuracy,
    rating_value,
    is_car_review,
    is_renter_review
  ) VALUES (
    p_booking_id,
    auth.uid(),
    p_reviewee_id,
    p_review_type,
    p_rating,
    p_comment,
    p_rating_communication,
    p_rating_cleanliness,
    p_rating_punctuality,
    p_rating_vehicle_condition,
    p_rating_accuracy,
    p_rating_value,
    p_review_type = 'car',
    p_review_type = 'locatario'
  )
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

COMMENT ON FUNCTION public.create_review_v2 IS
'Create a review (v2) with multi-dimensional ratings and validation';

-- Function: Check if user can review a booking
CREATE OR REPLACE FUNCTION public.user_can_review(
  p_booking_id UUID,
  p_review_type review_type_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_status TEXT;
  v_renter_id UUID;
  v_car_owner_id UUID;
  v_existing_review_count INTEGER;
BEGIN
  -- User must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Get booking details
  SELECT b.status, b.renter_id, c.owner_id
  INTO v_booking_status, v_renter_id, v_car_owner_id
  FROM public.bookings b
  JOIN public.cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Booking must be completed
  IF v_booking_status != 'completed' THEN
    RETURN false;
  END IF;

  -- User must be part of the booking
  IF auth.uid() != v_renter_id AND auth.uid() != v_car_owner_id THEN
    RETURN false;
  END IF;

  -- Check if review already exists
  SELECT COUNT(*)
  INTO v_existing_review_count
  FROM public.reviews
  WHERE booking_id = p_booking_id
  AND reviewer_id = auth.uid()
  AND review_type = p_review_type;

  IF v_existing_review_count > 0 THEN
    RETURN false;
  END IF;

  -- Validate review type based on user role
  IF auth.uid() = v_renter_id AND p_review_type NOT IN ('locador', 'car') THEN
    RETURN false;
  END IF;

  IF auth.uid() = v_car_owner_id AND p_review_type != 'locatario' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.user_can_review IS
'Check if current user can create a review for a booking';

-- Function: Flag a review for moderation
CREATE OR REPLACE FUNCTION public.flag_review(
  p_review_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update review
  UPDATE public.reviews
  SET
    is_flagged = true,
    moderation_reason = COALESCE(p_reason, moderation_reason)
  WHERE id = p_review_id
  AND is_hidden = false
  AND reviewer_id != auth.uid(); -- Can't flag your own review

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.flag_review IS
'Flag a review for moderation (users can flag inappropriate reviews)';

-- Function: Admin - Hide/unhide a review
CREATE OR REPLACE FUNCTION public.admin_moderate_review(
  p_review_id UUID,
  p_hide BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Update review
  UPDATE public.reviews
  SET
    is_hidden = p_hide,
    moderation_reason = CASE WHEN p_hide THEN p_reason ELSE NULL END,
    moderated_at = CASE WHEN p_hide THEN now() ELSE NULL END,
    moderated_by = CASE WHEN p_hide THEN auth.uid() ELSE NULL END,
    is_flagged = false -- Clear flag when moderated
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.admin_moderate_review IS
'Admin function to hide/unhide reviews and record moderation details';

-- Function: Get review statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_review_stats(
  p_user_id UUID,
  p_review_type review_type_enum DEFAULT NULL
)
RETURNS TABLE (
  review_type review_type_enum,
  avg_rating DECIMAL,
  review_count BIGINT,
  avg_communication DECIMAL,
  avg_cleanliness DECIMAL,
  avg_punctuality DECIMAL,
  avg_vehicle_condition DECIMAL,
  avg_accuracy DECIMAL,
  avg_value DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.review_type,
    ROUND(AVG(r.rating), 2) as avg_rating,
    COUNT(*) as review_count,
    ROUND(AVG(r.rating_communication), 2) as avg_communication,
    ROUND(AVG(r.rating_cleanliness), 2) as avg_cleanliness,
    ROUND(AVG(r.rating_punctuality), 2) as avg_punctuality,
    ROUND(AVG(r.rating_vehicle_condition), 2) as avg_vehicle_condition,
    ROUND(AVG(r.rating_accuracy), 2) as avg_accuracy,
    ROUND(AVG(r.rating_value), 2) as avg_value
  FROM public.reviews r
  WHERE r.reviewee_id = p_user_id
  AND r.is_hidden = false
  AND (p_review_type IS NULL OR r.review_type = p_review_type)
  GROUP BY r.review_type;
END;
$$;

COMMENT ON FUNCTION public.get_user_review_stats IS
'Get aggregated review statistics for a user, optionally filtered by review type';

-- ============================================================================
-- STEP 8: CREATE TRIGGERS FOR AUTO-UPDATING STATS
-- ============================================================================

-- Function: Update user stats after review insert/update/delete
CREATE OR REPLACE FUNCTION public.update_user_stats_from_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_review_type review_type_enum;
BEGIN
  -- Determine which user's stats to update
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.reviewee_id;
    v_review_type := OLD.review_type;
  ELSE
    v_user_id := NEW.reviewee_id;
    v_review_type := NEW.review_type;
  END IF;

  -- Ensure user_stats row exists
  INSERT INTO public.user_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update stats based on review type
  IF v_review_type = 'locador' THEN
    UPDATE public.user_stats
    SET
      locador_avg_rating = (
        SELECT COALESCE(ROUND(AVG(rating), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_avg_communication = (
        SELECT COALESCE(ROUND(AVG(rating_communication), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_avg_cleanliness = (
        SELECT COALESCE(ROUND(AVG(rating_cleanliness), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_avg_punctuality = (
        SELECT COALESCE(ROUND(AVG(rating_punctuality), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_avg_accuracy = (
        SELECT COALESCE(ROUND(AVG(rating_accuracy), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      locador_avg_value = (
        SELECT COALESCE(ROUND(AVG(rating_value), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locador'
        AND is_hidden = false
      ),
      last_updated = now()
    WHERE user_id = v_user_id;

  ELSIF v_review_type = 'locatario' THEN
    UPDATE public.user_stats
    SET
      locatario_avg_rating = (
        SELECT COALESCE(ROUND(AVG(rating), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_avg_communication = (
        SELECT COALESCE(ROUND(AVG(rating_communication), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_avg_cleanliness = (
        SELECT COALESCE(ROUND(AVG(rating_cleanliness), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_avg_punctuality = (
        SELECT COALESCE(ROUND(AVG(rating_punctuality), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_avg_accuracy = (
        SELECT COALESCE(ROUND(AVG(rating_accuracy), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      locatario_avg_value = (
        SELECT COALESCE(ROUND(AVG(rating_value), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'locatario'
        AND is_hidden = false
      ),
      last_updated = now()
    WHERE user_id = v_user_id;

  ELSIF v_review_type = 'car' THEN
    UPDATE public.user_stats
    SET
      car_avg_rating = (
        SELECT COALESCE(ROUND(AVG(rating), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      car_review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      car_avg_vehicle_condition = (
        SELECT COALESCE(ROUND(AVG(rating_vehicle_condition), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      car_avg_cleanliness = (
        SELECT COALESCE(ROUND(AVG(rating_cleanliness), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      car_avg_accuracy = (
        SELECT COALESCE(ROUND(AVG(rating_accuracy), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      car_avg_value = (
        SELECT COALESCE(ROUND(AVG(rating_value), 2), 0)
        FROM public.reviews
        WHERE reviewee_id = v_user_id
        AND review_type = 'car'
        AND is_hidden = false
      ),
      last_updated = now()
    WHERE user_id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for review changes
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_review ON public.reviews;

CREATE TRIGGER trigger_update_user_stats_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_from_review();

COMMENT ON TRIGGER trigger_update_user_stats_on_review ON public.reviews IS
'Auto-update user_stats when reviews are created, updated, or deleted';

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_review_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_review_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_user_stats_from_review TO authenticated;

-- ============================================================================
-- STEP 10: BACKFILL USER STATS FROM EXISTING REVIEWS
-- ============================================================================

-- Insert user_stats rows for all users with reviews
INSERT INTO public.user_stats (user_id)
SELECT DISTINCT reviewee_id
FROM public.reviews
WHERE reviewee_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Trigger the stats update for all existing reviews
-- (The trigger will calculate all stats automatically)
UPDATE public.reviews
SET updated_at = updated_at
WHERE id IN (SELECT id FROM public.reviews);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
DECLARE
  v_review_count INTEGER;
  v_stats_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_review_count FROM public.reviews;
  SELECT COUNT(*) INTO v_stats_count FROM public.user_stats;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'REVIEWS SYSTEM V2 MIGRATION COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Reviews migrated: %', v_review_count;
  RAISE NOTICE 'User stats created: %', v_stats_count;
  RAISE NOTICE 'Backup table: reviews_v1_backup';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Multi-dimensional ratings (6 categories)';
  RAISE NOTICE '  - Review types: locador, locatario, car';
  RAISE NOTICE '  - User stats aggregation';
  RAISE NOTICE '  - Moderation system (flag/hide)';
  RAISE NOTICE '  - Review responses';
  RAISE NOTICE '  - Helpful votes';
  RAISE NOTICE '=================================================';
END $$;
