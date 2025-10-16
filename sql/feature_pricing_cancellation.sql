-- Feature pack: pricing overrides, promos, cancellation policies, service fees

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancel_policy') THEN
    CREATE TYPE cancel_policy AS ENUM ('flex', 'moderate', 'strict');
  END IF;
END
$$;

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS cancel_policy cancel_policy NOT NULL DEFAULT 'moderate';

CREATE TABLE IF NOT EXISTS public.pricing_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  day date NOT NULL,
  price_per_day numeric(10, 2) NOT NULL,
  UNIQUE (car_id, day)
);

CREATE TABLE IF NOT EXISTS public.promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  percent_off numeric(5, 2),
  amount_off numeric(10, 2),
  valid_from date,
  valid_to date,
  max_redemptions int DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('service', 'cleaning', 'late_return', 'deposit_hold')),
  amount numeric(10, 2) NOT NULL,
  refundable boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fees_read_participants_or_admin" ON public.fees;
CREATE POLICY "fees_read_participants_or_admin"
ON public.fees
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

DROP POLICY IF EXISTS "fees_insert_admin_only" ON public.fees;
CREATE POLICY "fees_insert_admin_only"
ON public.fees
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "fees_update_admin_only" ON public.fees;
CREATE POLICY "fees_update_admin_only"
ON public.fees
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.compute_cancel_fee(uuid, timestamptz);
CREATE OR REPLACE FUNCTION public.compute_cancel_fee(p_booking_id uuid, p_now timestamptz DEFAULT now())
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_policy cancel_policy := 'moderate';
  hours_before numeric;
  fee numeric := 0;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % no encontrado', p_booking_id;
  END IF;

  SELECT c.cancel_policy
  INTO v_policy
  FROM public.cars c
  WHERE c.id = v_booking.car_id;

  hours_before := EXTRACT(EPOCH FROM (v_booking.start_at - p_now)) / 3600.0;

  IF v_policy = 'flex' THEN
    fee := CASE
      WHEN hours_before >= 24 THEN 0
      ELSE v_booking.total_amount * 0.10
    END;
  ELSIF v_policy = 'moderate' THEN
    fee := CASE
      WHEN hours_before >= 48 THEN 0
      ELSE v_booking.total_amount * 0.25
    END;
  ELSE
    fee := CASE
      WHEN hours_before >= 72 THEN 0
      ELSE v_booking.total_amount * 0.50
    END;
  END IF;

  RETURN ROUND(fee::numeric, 2);
END;
$$;

DROP FUNCTION IF EXISTS public.cancel_with_fee(uuid);
CREATE OR REPLACE FUNCTION public.cancel_with_fee(p_booking_id uuid)
RETURNS TABLE(cancel_fee numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fee numeric;
  allowed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = p_booking_id
      AND (
        public.is_admin()
        OR b.renter_id = auth.uid()
        OR c.owner_id = auth.uid()
      )
  )
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Operación no permitida para la reserva %', p_booking_id;
  END IF;

  fee := public.compute_cancel_fee(p_booking_id);

  UPDATE public.bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed', 'in_progress');

  RETURN QUERY SELECT fee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_with_fee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_cancel_fee(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.quote_booking(
  p_car_id uuid,
  p_start date,
  p_end date,
  p_promo text DEFAULT NULL
)
RETURNS TABLE (
  price_subtotal numeric,
  discount numeric,
  service_fee numeric,
  total numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  d date;
  day_price numeric;
  base_price numeric := 0;
  promo_discount numeric := 0;
  service numeric := 0;
BEGIN
  IF p_car_id IS NULL THEN
    RAISE EXCEPTION 'Car id requerido';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
    RAISE EXCEPTION 'Rango de fechas inválido % - %', p_start, p_end;
  END IF;

  d := p_start;
  WHILE d < p_end LOOP
    SELECT COALESCE(o.price_per_day, c.price_per_day)
    INTO day_price
    FROM public.cars c
    LEFT JOIN public.pricing_overrides o
      ON o.car_id = c.id AND o.day = d
    WHERE c.id = p_car_id;

    base_price := base_price + COALESCE(day_price, 0);
    d := d + 1;
  END LOOP;

  IF p_promo IS NOT NULL THEN
    SELECT CASE
             WHEN percent_off IS NOT NULL THEN base_price * (percent_off / 100.0)
             WHEN amount_off IS NOT NULL THEN amount_off
             ELSE 0
           END
    INTO promo_discount
    FROM public.promos
    WHERE code = p_promo
      AND (valid_from IS NULL OR valid_from <= p_start)
      AND (valid_to IS NULL OR valid_to >= p_end)
    LIMIT 1;
  END IF;

  promo_discount := COALESCE(promo_discount, 0);
  service := ROUND((base_price - promo_discount) * 0.10, 2);

  RETURN QUERY
  SELECT
    ROUND(base_price, 2) AS price_subtotal,
    ROUND(promo_discount, 2) AS discount,
    service AS service_fee,
    ROUND(base_price - promo_discount + service, 2) AS total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.quote_booking(uuid, date, date, text) TO anon, authenticated;
