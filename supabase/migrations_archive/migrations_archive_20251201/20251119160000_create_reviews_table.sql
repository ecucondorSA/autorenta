-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    car_id uuid REFERENCES public.cars(id) ON DELETE CASCADE,
    review_type text NOT NULL CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),

    -- Ratings (1-5)
    rating_cleanliness integer CHECK (rating_cleanliness BETWEEN 1 AND 5),
    rating_communication integer CHECK (rating_communication BETWEEN 1 AND 5),
    rating_accuracy integer CHECK (rating_accuracy BETWEEN 1 AND 5),
    rating_location integer CHECK (rating_location BETWEEN 1 AND 5),
    rating_checkin integer CHECK (rating_checkin BETWEEN 1 AND 5),
    rating_value integer CHECK (rating_value BETWEEN 1 AND 5),
    rating_overall numeric(3, 2), -- Calculated average

    comment_public text,
    comment_private text,

    status text DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
    is_visible boolean DEFAULT false,
    published_at timestamptz,

    -- Moderation
    is_flagged boolean DEFAULT false,
    flag_reason text,
    flagged_by uuid REFERENCES public.profiles(id),
    flagged_at timestamptz,
    moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderated_by uuid REFERENCES public.profiles(id),
    moderated_at timestamptz,
    moderation_notes text,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Owner stats
    owner_reviews_count integer DEFAULT 0,
    owner_rating_avg numeric(3, 2) DEFAULT 0,
    owner_rating_cleanliness_avg numeric(3, 2) DEFAULT 0,
    owner_rating_communication_avg numeric(3, 2) DEFAULT 0,
    owner_rating_accuracy_avg numeric(3, 2) DEFAULT 0,
    owner_rating_location_avg numeric(3, 2) DEFAULT 0,
    owner_rating_checkin_avg numeric(3, 2) DEFAULT 0,
    owner_rating_value_avg numeric(3, 2) DEFAULT 0,

    -- Renter stats
    renter_reviews_count integer DEFAULT 0,
    renter_rating_avg numeric(3, 2) DEFAULT 0,
    renter_rating_cleanliness_avg numeric(3, 2) DEFAULT 0,
    renter_rating_communication_avg numeric(3, 2) DEFAULT 0,
    renter_rating_accuracy_avg numeric(3, 2) DEFAULT 0,
    renter_rating_checkin_avg numeric(3, 2) DEFAULT 0,

    -- Bookings
    total_bookings_as_owner integer DEFAULT 0,
    total_bookings_as_renter integer DEFAULT 0,
    cancellation_count integer DEFAULT 0,
    cancellation_rate numeric(5, 2) DEFAULT 0,

    -- Badges
    is_top_host boolean DEFAULT false,
    is_super_host boolean DEFAULT false,
    is_verified_renter boolean DEFAULT false,
    badges jsonb DEFAULT '[]',

    last_review_received_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
    ON public.reviews FOR UPDATE
    USING (auth.uid() = reviewer_id);

-- Policies for user_stats
CREATE POLICY "User stats are viewable by everyone"
    ON public.user_stats FOR SELECT
    USING (true);

-- Create function to calculate overall rating
CREATE OR REPLACE FUNCTION calculate_review_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
    NEW.rating_overall := (
        NEW.rating_cleanliness +
        NEW.rating_communication +
        NEW.rating_accuracy +
        NEW.rating_location +
        NEW.rating_checkin +
        NEW.rating_value
    ) / 6.0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for overall rating
CREATE TRIGGER update_review_overall_rating
    BEFORE INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION calculate_review_overall_rating();
