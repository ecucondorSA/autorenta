-- Feature: Booking Contracts & Geofencing System
-- Extracted from: sql/feature_contracts_geofence.sql
-- Context: Module identified as missing during alignment audit.

-- 1. Booking Contracts
CREATE TABLE IF NOT EXISTS public.booking_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_by_renter boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_read_participants_or_admin" ON public.booking_contracts;
CREATE POLICY "contracts_read_participants_or_admin"
ON public.booking_contracts
FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "contracts_insert_participants" ON public.booking_contracts;
CREATE POLICY "contracts_insert_participants"
ON public.booking_contracts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.renter_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "contracts_update_accept_renter" ON public.booking_contracts;
CREATE POLICY "contracts_update_accept_renter"
ON public.booking_contracts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.renter_id = auth.uid()
  )
)
WITH CHECK (
  accepted_by_renter = true
  AND accepted_at IS NOT NULL
);

-- 2. Geofencing Handover Points
CREATE TABLE IF NOT EXISTS public.car_handover_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('pickup', 'dropoff')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 150,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.car_handover_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handover_points_owner_or_admin" ON public.car_handover_points;
CREATE POLICY "handover_points_owner_or_admin"
ON public.car_handover_points
FOR ALL
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.cars c
    WHERE c.id = car_id AND c.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.cars c
    WHERE c.id = car_id AND c.owner_id = auth.uid()
  )
);

-- 3. Tracking Sessions & Points
CREATE TABLE IF NOT EXISTS public.car_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.car_tracking_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.car_tracking_sessions(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.car_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_tracking_points ENABLE ROW LEVEL SECURITY;

DROP VIEW IF EXISTS public.car_latest_location;
CREATE VIEW public.car_latest_location AS
SELECT DISTINCT ON (p.session_id)
  p.session_id,
  p.lat,
  p.lng,
  p.recorded_at
FROM public.car_tracking_points p
ORDER BY p.session_id, p.recorded_at DESC;

DROP POLICY IF EXISTS "tracking_sessions_participants_or_admin" ON public.car_tracking_sessions;
CREATE POLICY "tracking_sessions_participants_or_admin"
ON public.car_tracking_sessions
FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = car_tracking_sessions.booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "tracking_points_participants_or_admin" ON public.car_tracking_points;
CREATE POLICY "tracking_points_participants_or_admin"
ON public.car_tracking_points
FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.car_tracking_sessions s
    JOIN public.bookings b ON b.id = s.booking_id
    JOIN public.cars c ON c.id = b.car_id
    WHERE s.id = session_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- 4. Auto-close function
CREATE OR REPLACE FUNCTION public.autoclose_tracking_if_returned(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  s record;
  last_point record;
  handover record;
  dist double precision;
BEGIN
  SELECT s.id, b.car_id
  INTO s
  FROM public.car_tracking_sessions s
  JOIN public.bookings b ON b.id = s.booking_id
  WHERE s.id = p_session_id AND s.active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.*
  INTO last_point
  FROM public.car_latest_location l
  WHERE l.session_id = s.id;

  SELECT hp.*
  INTO handover
  FROM public.car_handover_points hp
  WHERE hp.car_id = s.car_id AND hp.kind = 'dropoff'
  ORDER BY hp.created_at DESC
  LIMIT 1;

  IF last_point IS NULL OR handover IS NULL THEN
    RETURN;
  END IF;

  SELECT ST_DistanceSphere(
           ST_SetSRID(ST_MakePoint(last_point.lng, last_point.lat), 4326),
           ST_SetSRID(ST_MakePoint(handover.lng, handover.lat), 4326)
         )
  INTO dist;

  IF dist <= handover.radius_m THEN
    UPDATE public.car_tracking_sessions
    SET active = false,
        ended_at = now()
    WHERE id = s.id;
  END IF;
END;
$$;
