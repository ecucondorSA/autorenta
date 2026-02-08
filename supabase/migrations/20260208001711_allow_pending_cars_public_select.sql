-- Allow showing cars that are published but not yet bookable (pending verification)
-- so the UI can render them with a disabled overlay instead of "disappearing".
--
-- IMPORTANT:
-- - We keep 'draft' and 'suspended' private (owner-only via auth.uid()).
-- - Availability/booking remains enforced elsewhere (RPC + app logic).

-- public.cars: anyone can read active + pending
DROP POLICY IF EXISTS "Anyone can view active cars" ON public.cars;
CREATE POLICY "Anyone can view active cars"
  ON public.cars FOR SELECT
  USING (status IN ('active', 'pending') OR auth.uid() = owner_id);

-- public.car_photos: anyone can read photos for active + pending cars
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

