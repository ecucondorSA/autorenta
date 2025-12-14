-- Fix for reviews table structure and foreign keys
-- Also creates car_stats table if missing

-- 1. Ensure reviews table exists with correct structure
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),
    
    -- Ratings
    rating_cleanliness INTEGER NOT NULL DEFAULT 5,
    rating_communication INTEGER NOT NULL DEFAULT 5,
    rating_accuracy INTEGER NOT NULL DEFAULT 5,
    rating_location INTEGER NOT NULL DEFAULT 5,
    rating_checkin INTEGER NOT NULL DEFAULT 5,
    rating_value INTEGER NOT NULL DEFAULT 5,
    
    -- Comments
    comment_public TEXT,
    comment_private TEXT,
    
    -- Status & Moderation
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden')),
    is_visible BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT now(),
    
    -- Moderation flags
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    flagged_by UUID REFERENCES public.profiles(id),
    flagged_at TIMESTAMPTZ,
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderated_by UUID REFERENCES public.profiles(id),
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Public reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (is_visible = true);

DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their bookings"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can update their own pending reviews" ON public.reviews;
CREATE POLICY "Users can update their own pending reviews"
    ON public.reviews FOR UPDATE
    USING (auth.uid() = reviewer_id AND status = 'pending');

-- 2. Ensure car_stats table exists (it's often a materialized view or regular table)
CREATE TABLE IF NOT EXISTS public.car_stats (
    car_id UUID PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
    reviews_count INTEGER DEFAULT 0,
    rating_avg NUMERIC(3,2) DEFAULT 0,
    rating_cleanliness_avg NUMERIC(3,2) DEFAULT 0,
    rating_communication_avg NUMERIC(3,2) DEFAULT 0,
    rating_accuracy_avg NUMERIC(3,2) DEFAULT 0,
    rating_location_avg NUMERIC(3,2) DEFAULT 0,
    rating_checkin_avg NUMERIC(3,2) DEFAULT 0,
    rating_value_avg NUMERIC(3,2) DEFAULT 0,
    
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    cancellation_rate NUMERIC(5,2) DEFAULT 0,
    
    last_review_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on car_stats
ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

-- Policies for car_stats
DROP POLICY IF EXISTS "Car stats are viewable by everyone" ON public.car_stats;
CREATE POLICY "Car stats are viewable by everyone"
    ON public.car_stats FOR SELECT
    USING (true);

-- 3. Function to update car stats on new review
CREATE OR REPLACE FUNCTION public.update_car_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for renter_to_owner reviews
    IF NEW.review_type = 'renter_to_owner' AND NEW.is_visible = true THEN
        INSERT INTO public.car_stats (car_id)
        VALUES (NEW.car_id)
        ON CONFLICT (car_id) DO NOTHING;
        
        UPDATE public.car_stats
        SET 
            reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE car_id = NEW.car_id AND review_type = 'renter_to_owner' AND is_visible = true),
            rating_avg = (SELECT AVG((rating_cleanliness + rating_communication + rating_accuracy + rating_location + rating_checkin + rating_value) / 6.0) FROM public.reviews WHERE car_id = NEW.car_id AND review_type = 'renter_to_owner' AND is_visible = true),
            last_review_at = NOW(),
            updated_at = NOW()
        WHERE car_id = NEW.car_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for car stats
DROP TRIGGER IF EXISTS on_review_created_update_stats ON public.reviews;
CREATE TRIGGER on_review_created_update_stats
    AFTER INSERT OR UPDATE OF is_visible ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_car_stats_on_review();

-- 4. Create user_stats table if missing (referenced in ReviewsService)
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Owner stats
    owner_reviews_count INTEGER DEFAULT 0,
    owner_rating_avg NUMERIC(3,2) DEFAULT 0,
    
    -- Renter stats
    renter_reviews_count INTEGER DEFAULT 0,
    renter_rating_avg NUMERIC(3,2) DEFAULT 0,
    
    -- General stats
    total_bookings_as_owner INTEGER DEFAULT 0,
    total_bookings_as_renter INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    cancellation_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Badges flags
    is_top_host BOOLEAN DEFAULT false,
    is_super_host BOOLEAN DEFAULT false,
    is_verified_renter BOOLEAN DEFAULT false,
    
    last_review_received_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User stats are viewable by everyone" ON public.user_stats;
CREATE POLICY "User stats are viewable by everyone"
    ON public.user_stats FOR SELECT
    USING (true);
