-- ============================================================================
-- FIX: Add 'pending' status to car_status enum + align marketplace policies
-- Date: 2026-02-08
--
-- Why:
-- - Product wants cars to be publishable while owner verification is incomplete.
-- - Those cars should appear publicly (grey overlay) but not be bookable until active.
-- - This requires a 'pending' status and public SELECT for active/pending.
-- ============================================================================

-- Enum: ensure 'pending' exists (idempotent on Postgres 15+)
ALTER TYPE public.car_status ADD VALUE IF NOT EXISTS 'pending';

-- Cars: public can read active + pending; owners can read their own cars always.
DROP POLICY IF EXISTS "Anyone can view active cars" ON public.cars;
CREATE POLICY "Anyone can view active cars"
  ON public.cars FOR SELECT
  USING (status IN ('active', 'pending') OR auth.uid() = owner_id);

-- Car photos: keep in sync with cars visibility.
DROP POLICY IF EXISTS "Anyone can view car photos" ON public.car_photos;
CREATE POLICY "Anyone can view car photos"
  ON public.car_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cars
      WHERE cars.id = car_photos.car_id
        AND (cars.status IN ('active', 'pending') OR cars.owner_id = auth.uid())
    )
  );

