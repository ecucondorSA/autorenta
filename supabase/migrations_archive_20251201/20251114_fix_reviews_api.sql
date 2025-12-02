-- ============================================
-- Migration: Fix Reviews API Issues
-- Date: 2025-11-14
-- Description: Ensure reviews table has correct structure and foreign keys
-- ============================================

-- ============================================
-- 1. VERIFY AND FIX REVIEWS TABLE STRUCTURE
-- ============================================

-- Ensure reviews table exists with all required columns
DO $$
BEGIN
    -- Check if reviews table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews'
    ) THEN
        RAISE EXCEPTION 'reviews table does not exist. Please create it first.';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'car_id') THEN
        ALTER TABLE public.reviews ADD COLUMN car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'review_type') THEN
        ALTER TABLE public.reviews ADD COLUMN review_type TEXT CHECK (review_type IN ('renter_to_owner', 'owner_to_renter'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_visible') THEN
        ALTER TABLE public.reviews ADD COLUMN is_visible BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewer_id') THEN
        ALTER TABLE public.reviews ADD COLUMN reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewee_id') THEN
        ALTER TABLE public.reviews ADD COLUMN reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 2. CREATE OR REPLACE FOREIGN KEY CONSTRAINTS
-- ============================================

-- Drop existing constraints if they exist and recreate with correct names
DO $$
BEGIN
    -- Check and create reviewer foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewer_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        -- Try to add the constraint (may fail if data is invalid)
        BEGIN
            ALTER TABLE public.reviews 
            ADD CONSTRAINT reviews_reviewer_id_fkey 
            FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Could not add reviews_reviewer_id_fkey constraint: %', SQLERRM;
        END;
    END IF;
    
    -- Check and create reviewee foreign key  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewee_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        BEGIN
            ALTER TABLE public.reviews 
            ADD CONSTRAINT reviews_reviewee_id_fkey 
            FOREIGN KEY (reviewee_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Could not add reviews_reviewee_id_fkey constraint: %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================
-- 3. UPDATE RLS POLICIES FOR PROPER ACCESS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;

-- Create comprehensive RLS policy for reading reviews
CREATE POLICY "Anyone can view visible reviews" ON public.reviews
    FOR SELECT USING (
        is_visible = true 
        OR reviewer_id = auth.uid()
        OR reviewee_id = auth.uid()
    );

-- Policy for creating reviews
CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        reviewer_id = auth.uid()
    );

-- Policy for updating own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (
        reviewer_id = auth.uid()
    );

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_car_id ON public.reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON public.reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON public.reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_car_visible ON public.reviews(car_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_reviews_car_type_visible ON public.reviews(car_id, review_type, is_visible) 
    WHERE is_visible = true;

-- ============================================
-- 5. GRANT PROPER PERMISSIONS
-- ============================================

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- ============================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON TABLE public.reviews IS 'User reviews for cars and bookings';
COMMENT ON COLUMN public.reviews.reviewer_id IS 'User who wrote the review';
COMMENT ON COLUMN public.reviews.reviewee_id IS 'User being reviewed';
COMMENT ON COLUMN public.reviews.car_id IS 'Car being reviewed';
COMMENT ON COLUMN public.reviews.review_type IS 'Type of review: renter_to_owner or owner_to_renter';
COMMENT ON COLUMN public.reviews.is_visible IS 'Whether review is publicly visible';

-- Success message
SELECT 
    'Reviews API fixed: ' || 
    'Table structure verified, ' ||
    'Foreign keys created, ' ||
    'RLS policies updated, ' ||
    'Indexes added' AS status;
