SET search_path = public, auth, extensions;
-- ============================================================================
-- AUTORENTA CORE DATABASE MIGRATION
-- Created: 2025-10-16
-- Purpose: Complete database schema for car rental marketplace
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENUMS (Custom Types)
-- ============================================================================

CREATE TYPE booking_status AS ENUM (
  'pending',      -- Esperando aprobación del dueño
  'confirmed',    -- Confirmada, pago aprobado
  'in_progress',  -- En curso (auto entregado)
  'completed',    -- Completada exitosamente
  'cancelled',    -- Cancelada
  'no_show'       -- Cliente no se presentó
);

CREATE TYPE car_status AS ENUM (
  'draft',        -- Borrador (no visible)
  'pending',      -- Pendiente de aprobación admin
  'active',       -- Activo y visible
  'suspended',    -- Suspendido por admin
  'deleted'       -- Soft delete
);

CREATE TYPE payment_status AS ENUM (
  'pending',      -- Pendiente
  'processing',   -- Procesando
  'approved',     -- Aprobado
  'rejected',     -- Rechazado
  'refunded',     -- Reembolsado
  'cancelled'     -- Cancelado
);

CREATE TYPE payment_provider AS ENUM (
  'mock',         -- Mock para testing
  'mercadopago',  -- Mercado Pago (future)
  'stripe'        -- Stripe (future)
);

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 CARS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER CHECK (year >= 1900 AND year <= 2100),

  -- Pricing
  price_per_day NUMERIC(10, 2) NOT NULL CHECK (price_per_day >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Location
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),

  -- Status
  status car_status NOT NULL DEFAULT 'draft',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for cars
CREATE INDEX idx_cars_owner_id ON public.cars(owner_id);
CREATE INDEX idx_cars_status ON public.cars(status);
CREATE INDEX idx_cars_city ON public.cars(city);
CREATE INDEX idx_cars_created_at ON public.cars(created_at DESC);

-- Updated_at trigger for cars
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cars_updated_at
  BEFORE UPDATE ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2.2 CAR_PHOTOS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.car_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Storage
  stored_path TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Order
  position INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for car_photos
CREATE INDEX idx_car_photos_car_id ON public.car_photos(car_id);
CREATE INDEX idx_car_photos_sort_order ON public.car_photos(car_id, sort_order);

-- ----------------------------------------------------------------------------
-- 2.3 BOOKINGS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Dates
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,

  -- Status
  status booking_status NOT NULL DEFAULT 'pending',

  -- Pricing
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (end_at > start_at)
);

-- Indexes for bookings
CREATE INDEX idx_bookings_car_id ON public.bookings(car_id);
CREATE INDEX idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(start_at, end_at);
CREATE INDEX idx_bookings_created_at ON public.bookings(created_at DESC);

-- Updated_at trigger for bookings
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2.4 PAYMENT_INTENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Provider
  provider payment_provider NOT NULL,
  provider_intent_id TEXT,

  -- Amount
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Status
  status payment_status NOT NULL DEFAULT 'pending',

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment_intents
CREATE INDEX idx_payment_intents_booking_id ON public.payment_intents(booking_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX idx_payment_intents_provider ON public.payment_intents(provider);

-- Updated_at trigger for payment_intents
CREATE TRIGGER set_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2.5 PAYMENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,

  -- Provider
  provider payment_provider NOT NULL,
  provider_payment_id TEXT,

  -- Amount
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Status
  status payment_status NOT NULL DEFAULT 'pending',

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payments
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Updated_at trigger for payments
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2.6 REVIEWS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Type
  is_car_review BOOLEAN NOT NULL DEFAULT false,
  is_renter_review BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(booking_id, reviewer_id, reviewee_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Updated_at trigger for reviews
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: RLS (Row Level Security) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3.1 CARS POLICIES
-- ----------------------------------------------------------------------------

-- Anyone can view active cars
CREATE POLICY "Anyone can view active cars"
ON public.cars FOR SELECT
USING (status = 'active' OR auth.uid() = owner_id);

-- Authenticated users can create their own cars
CREATE POLICY "Users can create own cars"
ON public.cars FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own cars
CREATE POLICY "Owners can update own cars"
ON public.cars FOR UPDATE
USING (auth.uid() = owner_id);

-- Owners can delete their own cars (soft delete)
CREATE POLICY "Owners can delete own cars"
ON public.cars FOR DELETE
USING (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- 3.2 CAR_PHOTOS POLICIES
-- ----------------------------------------------------------------------------

-- Anyone can view photos of active cars
CREATE POLICY "Anyone can view car photos"
ON public.car_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = car_photos.car_id
    AND (cars.status = 'active' OR cars.owner_id = auth.uid())
  )
);

-- Car owners can insert photos
CREATE POLICY "Car owners can insert photos"
ON public.car_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = car_photos.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- Car owners can delete photos
CREATE POLICY "Car owners can delete photos"
ON public.car_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = car_photos.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 3.3 BOOKINGS POLICIES
-- ----------------------------------------------------------------------------

-- Renters can view their own bookings
CREATE POLICY "Renters can view own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = renter_id);

-- Car owners can view bookings for their cars
CREATE POLICY "Owners can view bookings for their cars"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = bookings.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- Authenticated users can create bookings (via RPC function)
CREATE POLICY "Authenticated users can request bookings"
ON public.bookings FOR INSERT
WITH CHECK (
  auth.uid() = renter_id
  AND status = 'pending'
);

-- Owners and renters can update bookings
CREATE POLICY "Owners and renters can update bookings"
ON public.bookings FOR UPDATE
USING (
  auth.uid() = renter_id
  OR EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = bookings.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 3.4 PAYMENT_INTENTS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view payment intents for their bookings
CREATE POLICY "Users can view own payment intents"
ON public.payment_intents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = payment_intents.booking_id
    AND (
      bookings.renter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cars
        WHERE cars.id = bookings.car_id
        AND cars.owner_id = auth.uid()
      )
    )
  )
);

-- Service role can insert payment intents
CREATE POLICY "Service can insert payment intents"
ON public.payment_intents FOR INSERT
WITH CHECK (true);

-- Service role can update payment intents
CREATE POLICY "Service can update payment intents"
ON public.payment_intents FOR UPDATE
USING (true);

-- ----------------------------------------------------------------------------
-- 3.5 PAYMENTS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view payments for their bookings
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = payments.booking_id
    AND (
      bookings.renter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cars
        WHERE cars.id = bookings.car_id
        AND cars.owner_id = auth.uid()
      )
    )
  )
);

-- Service role can insert payments
CREATE POLICY "Service can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);

-- Service role can update payments
CREATE POLICY "Service can update payments"
ON public.payments FOR UPDATE
USING (true);

-- ----------------------------------------------------------------------------
-- 3.6 REVIEWS POLICIES
-- ----------------------------------------------------------------------------

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
USING (true);

-- Booking participants can create reviews
CREATE POLICY "Booking participants can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = reviews.booking_id
    AND bookings.status = 'completed'
    AND (
      bookings.renter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cars
        WHERE cars.id = bookings.car_id
        AND cars.owner_id = auth.uid()
      )
    )
  )
);

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = reviewer_id);

-- ============================================================================
-- SECTION 4: RPC FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 REQUEST_BOOKING FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_total NUMERIC(10, 2);
  v_car public.cars;
  v_days INTEGER;
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que las fechas son válidas
  IF p_start >= p_end THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_start < now() THEN
    RAISE EXCEPTION 'No podés reservar en el pasado';
  END IF;

  -- Obtener información del auto
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  -- Validar que el usuario no es el dueño del auto
  IF v_car.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés reservar tu propio auto';
  END IF;

  -- ✅ FIX: Validar disponibilidad incluyendo 'pending' para coincidir con constraint bookings_no_overlap
  -- El constraint bookings_no_overlap previene overlaps de bookings con status: pending, confirmed, in_progress
  -- Por lo tanto, la validación debe incluir también 'pending' para evitar race conditions
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE car_id = p_car_id
    AND status IN ('pending', 'confirmed', 'in_progress')
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calcular días y total
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  v_total := v_car.price_per_day * v_days;

  -- Crear booking
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    total_amount,
    currency
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start,
    p_end,
    'pending',
    v_total,
    v_car.currency
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4.2 QUOTE_BOOKING FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.quote_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car public.cars;
  v_days INTEGER;
  v_total NUMERIC(10, 2);
  v_available BOOLEAN;
BEGIN
  -- Obtener información del auto
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Auto no disponible'
    );
  END IF;

  -- Validar fechas
  IF p_start >= p_end THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Fechas inválidas'
    );
  END IF;

  -- Verificar disponibilidad
  v_available := NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE car_id = p_car_id
    AND status IN ('confirmed', 'in_progress')
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
  );

  -- Calcular precio
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  v_total := v_car.price_per_day * v_days;

  RETURN jsonb_build_object(
    'available', v_available,
    'days', v_days,
    'price_per_day', v_car.price_per_day,
    'total_amount', v_total,
    'currency', v_car.currency
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 IS_CAR_OWNER FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_car_owner(p_car_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cars
    WHERE id = p_car_id
    AND owner_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_car_owner(UUID) TO authenticated;

-- ============================================================================
-- SECTION 6: COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.cars IS 'Car listings created by owners';
COMMENT ON TABLE public.car_photos IS 'Photos associated with car listings';
COMMENT ON TABLE public.bookings IS 'Rental bookings between renters and car owners';
COMMENT ON TABLE public.payment_intents IS 'Payment intents created for bookings';
COMMENT ON TABLE public.payments IS 'Payment records from payment providers';
COMMENT ON TABLE public.reviews IS 'Reviews between renters and car owners';

COMMENT ON FUNCTION public.request_booking IS 'Creates a new booking with validation';
COMMENT ON FUNCTION public.quote_booking IS 'Calculates booking price without creating booking';
COMMENT ON FUNCTION public.is_car_owner IS 'Checks if current user owns a car';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;
