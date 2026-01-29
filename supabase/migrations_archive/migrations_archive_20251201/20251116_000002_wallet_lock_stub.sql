-- Migration: wallet_lock_funds dev stub
-- Date: 2025-11-16
-- Dev-only helper: simple implementation of wallet_lock_funds used for local testing.
-- It attempts to insert a row into wallet_transactions if table exists, otherwise returns a generated uuid.

BEGIN;

CREATE OR REPLACE FUNCTION public.wallet_lock_funds(p_booking_id uuid, p_amount_cents bigint)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_lock_id uuid := gen_random_uuid();
BEGIN
  -- If wallet_transactions table exists, insert a lock transaction to simulate behavior
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    INSERT INTO public.wallet_transactions (id, user_id, type, amount, status, reference_type, reference_id, created_at)
    VALUES (v_lock_id, (SELECT renter_id FROM public.bookings WHERE id = p_booking_id), 'lock', p_amount_cents, 'locked', 'booking', p_booking_id, now());
  END IF;

  RETURN v_lock_id;
END;
$$;

COMMIT;

-- NOTE: This is intended for development/test environments only. In production, replace with the real wallet implementation.
