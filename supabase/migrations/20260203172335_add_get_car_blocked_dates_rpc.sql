-- Migration: Add get_car_blocked_dates RPC function
-- This function was missing from migrations but exists in production schema

CREATE OR REPLACE FUNCTION public.get_car_blocked_dates(
  p_car_id uuid,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT (CURRENT_DATE + '6 mons'::interval)
)
RETURNS TABLE(
  booking_id uuid,
  start_date date,
  end_date date,
  status public.booking_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return all confirmed or in-progress bookings for the car
  -- within the requested date range
  RETURN QUERY
  SELECT
    b.id,
    b.start_at::DATE,
    b.end_at::DATE,
    b.status
  FROM bookings b
  WHERE b.car_id = p_car_id
    AND b.status IN ('confirmed', 'in_progress', 'pending_owner_approval')
    AND b.start_at::DATE <= p_end_date
    AND b.end_at::DATE >= p_start_date
  ORDER BY b.start_at;
END;
$$;

COMMENT ON FUNCTION public.get_car_blocked_dates(p_car_id uuid, p_start_date date, p_end_date date)
IS 'Returns blocked date ranges for a car (confirmed/in_progress/pending bookings). Used by calendar component.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_car_blocked_dates(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_car_blocked_dates(uuid, date, date) TO anon;
