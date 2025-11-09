-- Migration: Update admin_get_refund_requests to use profiles.email instead of auth.users.email
-- Issue: PR #150 - Fix TypeScript compilation errors
-- Problem: Function uses auth.users.email which requires SECURITY DEFINER and nested queries
-- Solution: Use profiles.email which is synced from auth.users via trigger

-- ============================================================================
-- Update admin_get_refund_requests function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_refund_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  refund_amount NUMERIC,
  currency TEXT,
  destination TEXT,
  status TEXT,
  booking_total NUMERIC,
  car_title TEXT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Authorization check
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administrador';
  END IF;

  -- Return refund requests with joined data
  -- CHANGED: Use profiles.email instead of auth.users.email
  RETURN QUERY
  SELECT
    rr.id,
    rr.booking_id,
    rr.user_id,
    p.full_name as user_name,
    p.email as user_email,  -- ✅ Changed from u.email to p.email
    rr.refund_amount,
    rr.currency,
    rr.destination,
    rr.status,
    COALESCE(b.total_amount, b.total_cents / 100.0) as booking_total,
    c.title as car_title,
    rr.created_at,
    rr.approved_at,
    rr.processed_at,
    rr.rejection_reason,
    rr.admin_notes
  FROM public.refund_requests rr
  INNER JOIN public.bookings b ON b.id = rr.booking_id
  INNER JOIN public.cars c ON c.id = b.car_id
  INNER JOIN public.profiles p ON p.id = rr.user_id
  -- ✅ Removed: INNER JOIN auth.users u ON u.id = rr.user_id
  WHERE
    (p_status IS NULL OR rr.status = p_status)
  ORDER BY rr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_get_refund_requests IS 'Admin RPC to retrieve refund requests with filtering. Uses profiles.email (synced from auth.users)';

