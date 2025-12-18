-- Create view for car reviews with proper JOINs
-- This view joins reviews with bookings to get car_id and adds computed columns

CREATE OR REPLACE VIEW public.v_car_reviews AS
SELECT
    r.id,
    r.booking_id,
    b.car_id,
    r.reviewer_id,
    r.reviewee_id,
    r.rating,
    r.comment,
    r.is_car_review,
    r.is_renter_review,
    r.created_at,
    r.updated_at,
    -- Computed columns for compatibility
    CASE
        WHEN r.is_car_review = true THEN 'renter_to_owner'
        WHEN r.is_renter_review = true THEN 'owner_to_renter'
        ELSE 'unknown'
    END AS review_type,
    true AS is_visible,  -- All reviews are visible by default
    -- Reviewer info
    p.full_name AS reviewer_name,
    p.avatar_url AS reviewer_avatar
FROM public.reviews r
JOIN public.bookings b ON r.booking_id = b.id
LEFT JOIN public.profiles p ON r.reviewer_id = p.id;

-- Grant access
GRANT SELECT ON public.v_car_reviews TO authenticated;
GRANT SELECT ON public.v_car_reviews TO anon;

-- Add comment
COMMENT ON VIEW public.v_car_reviews IS 'View for car reviews with booking JOIN and computed review_type/is_visible columns';
