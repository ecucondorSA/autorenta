-- Migration: create request_booking RPC
-- Date: 2025-11-16

-- NOTE: This migration creates a helper RPC `request_booking` that:
--  - validates car active state
--  - checks booking overlaps (pending/confirmed/in_progress)
--  - inserts a booking row with status 'pending'
--  - if payment_method='wallet' attempts to call `wallet_lock_funds(booking_id, amount_cents)`

BEGIN;

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id uuid,
  p_renter_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_payment_method text DEFAULT 'card',
  p_idempotency_key text DEFAULT NULL
) RETURNS TABLE(booking_id uuid, status text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_car RECORD;
  v_overlap_exists boolean;
  v_nights int;
  v_price_per_day int;
  v_total_amount_cents bigint;
  v_total_amount numeric;
  v_lock_id uuid;
  v_status text;
BEGIN
  -- basic date sanity
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = 'P0001';
  END IF;

  -- load car
  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAR_NOT_FOUND';
  END IF;

  IF v_car.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'CAR_NOT_ACTIVE';
  END IF;

  -- acquire advisory lock per car to avoid races from parallel requests
  PERFORM pg_advisory_xact_lock(hashtext(p_car_id::text)::bigint);

  -- idempotency: if the same idempotency_key exists for this renter/car/dates return it
  IF p_idempotency_key IS NOT NULL THEN
    SELECT b.id, b.status INTO booking_id, v_status
    FROM public.bookings b
    WHERE b.idempotency_key = p_idempotency_key
      AND b.renter_id = p_renter_id
      AND b.car_id = p_car_id
      AND b.start_at = p_start
      AND b.end_at = p_end
    LIMIT 1;

    IF booking_id IS NOT NULL THEN
      status := v_status;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- check overlaps against active reservations
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
    LIMIT 1
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'OVERLAP' USING ERRCODE = 'P0001';
  END IF;

  -- compute nights and total
  v_price_per_day := COALESCE(v_car.price_per_day_cents, 0);
  v_nights := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_end - p_start)) / 86400.0)::int);
  v_total_amount_cents := v_price_per_day::bigint * v_nights;
  v_total_amount := (v_total_amount_cents::numeric / 100)::numeric;

  -- create booking as pending by default (use total_cents column in bookings)
  INSERT INTO public.bookings (car_id, renter_id, start_at, end_at, status, total_amount, total_cents, idempotency_key, created_at)
  VALUES (p_car_id, p_renter_id, p_start, p_end, 'pending', v_total_amount, v_total_amount_cents, p_idempotency_key, now())
  RETURNING id INTO booking_id;

  -- if wallet path, attempt to lock funds and confirm booking
  IF lower(coalesce(p_payment_method, 'card')) = 'wallet' THEN
    BEGIN
      -- ensure wallet function exists
      IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'wallet_lock_funds') THEN
        RAISE EXCEPTION 'WALLET_NOT_AVAILABLE' USING ERRCODE = 'P0002';
      END IF;

      -- call wallet_lock_funds; assume it returns uuid lock id
      SELECT public.wallet_lock_funds(booking_id, v_total_amount_cents) INTO v_lock_id;
      UPDATE public.bookings
      SET wallet_lock_id = v_lock_id,
      wallet_amount_cents = v_total_amount_cents,
          status = 'confirmed',
          updated_at = now()
      WHERE id = booking_id;

      status := 'confirmed';
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      -- bubble up as insufficient funds or propagate original message
      RAISE EXCEPTION 'INSUFFICIENT_FUNDS' USING ERRCODE = 'P0003';
    END;
  ELSE
    -- card path: leave pending so frontend handles redirect and webhook will confirm
    status := 'pending';
    RETURN NEXT;
    RETURN;
  END IF;

END;
$$;

COMMIT;

-- NOTE: This function assumes tables `cars` and `bookings` exist with the referenced columns
-- and that a `wallet_lock_funds(uuid, bigint)` function is available when using wallet flow.
