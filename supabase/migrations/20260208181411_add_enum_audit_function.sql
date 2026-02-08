-- Migration: Add enum audit helper function
-- Purpose: Enable TypeScript scripts to validate enum sync
-- Created: 2026-02-08

-- ============================================================================
-- Function: Get enum values for a given enum type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_enum_values(enum_name text)
RETURNS TABLE(enumlabel text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT enumlabel::text
  FROM pg_enum
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
  WHERE pg_type.typname = enum_name
  ORDER BY enumsortorder;
$$;

-- Grant execute to service_role for validation scripts
GRANT EXECUTE ON FUNCTION public.get_enum_values TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_enum_values IS
  'Returns all values for a given PostgreSQL enum type. Used by validation scripts to ensure TypeScript types match database enums.';

-- ============================================================================
-- Verification Query (commented out for migration)
-- ============================================================================

-- Test the function:
-- SELECT * FROM public.get_enum_values('car_status');
-- Expected output: draft, active, paused, deleted, pending

-- SELECT * FROM public.get_enum_values('booking_status');
-- Expected output: all booking status values

-- SELECT * FROM public.get_enum_values('payment_status');
-- Expected output: pending, processing, approved, rejected, refunded, cancelled
