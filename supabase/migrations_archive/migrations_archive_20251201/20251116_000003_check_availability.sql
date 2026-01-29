-- Migration: check_availability RPC
-- Date: 2025-11-16

BEGIN;

CREATE OR REPLACE FUNCTION public.check_availability(p_car_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
  );
$$;

COMMIT;
