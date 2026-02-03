-- ============================================================================
-- FIX: Create RLS policies for cars and car_photos tables
-- Date: 2026-02-03
-- Problem: RLS is enabled but no policies exist, blocking all operations
-- ============================================================================

-- ============================================================================
-- CARS TABLE POLICIES
-- ============================================================================

-- Policy: Anyone can read active cars (for marketplace)
DROP POLICY IF EXISTS "Anyone can view active cars" ON public.cars;
CREATE POLICY "Anyone can view active cars"
    ON public.cars FOR SELECT
    USING (status = 'active' OR owner_id = auth.uid());

-- Policy: Authenticated users can create their own cars
DROP POLICY IF EXISTS "Users can create own cars" ON public.cars;
CREATE POLICY "Users can create own cars"
    ON public.cars FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy: Owners can update their own cars
DROP POLICY IF EXISTS "Owners can update own cars" ON public.cars;
CREATE POLICY "Owners can update own cars"
    ON public.cars FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Policy: Owners can delete their own cars
DROP POLICY IF EXISTS "Owners can delete own cars" ON public.cars;
CREATE POLICY "Owners can delete own cars"
    ON public.cars FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================================================
-- CAR_PHOTOS TABLE POLICIES
-- ============================================================================

-- Policy: Anyone can view photos of active cars or own cars
DROP POLICY IF EXISTS "Anyone can view car photos" ON public.car_photos;
CREATE POLICY "Anyone can view car photos"
    ON public.car_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cars c
            WHERE c.id = car_id
            AND (c.status = 'active' OR c.owner_id = auth.uid())
        )
    );

-- Policy: Car owners can insert photos for their cars
DROP POLICY IF EXISTS "Owners can add photos to own cars" ON public.car_photos;
CREATE POLICY "Owners can add photos to own cars"
    ON public.car_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cars c
            WHERE c.id = car_id AND c.owner_id = auth.uid()
        )
    );

-- Policy: Car owners can update photos of their cars
DROP POLICY IF EXISTS "Owners can update photos of own cars" ON public.car_photos;
CREATE POLICY "Owners can update photos of own cars"
    ON public.car_photos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cars c
            WHERE c.id = car_id AND c.owner_id = auth.uid()
        )
    );

-- Policy: Car owners can delete photos of their cars
DROP POLICY IF EXISTS "Owners can delete photos of own cars" ON public.car_photos;
CREATE POLICY "Owners can delete photos of own cars"
    ON public.car_photos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cars c
            WHERE c.id = car_id AND c.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- GRANTS (ensure authenticated role has access)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_photos TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
    car_policy_count INT;
    photo_policy_count INT;
BEGIN
    SELECT COUNT(*) INTO car_policy_count FROM pg_policies WHERE tablename = 'cars';
    SELECT COUNT(*) INTO photo_policy_count FROM pg_policies WHERE tablename = 'car_photos';

    RAISE NOTICE 'Cars policies: %, Car_photos policies: %', car_policy_count, photo_policy_count;

    IF car_policy_count < 4 THEN
        RAISE WARNING 'Expected at least 4 policies on cars table';
    END IF;

    IF photo_policy_count < 4 THEN
        RAISE WARNING 'Expected at least 4 policies on car_photos table';
    END IF;
END $$;
