-- Create medium-priority phantom tables identified in DB audit
-- These tables have 3-5 code references and support secondary features
--
-- Tables: mp_onboarding_states, mp_webhook_logs, user_favorite_cars,
--         chargebacks, booking_inspections, mercadopago_accounts,
--         preauthorizations, vehicle_inspections

BEGIN;

-- ============================================================
-- 1. MP_ONBOARDING_STATES — MercadoPago OAuth onboarding flow
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mp_onboarding_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth flow
  state_token TEXT,
  expires_at TIMESTAMPTZ,

  -- MercadoPago credentials (stored encrypted at rest by Supabase)
  collector_id BIGINT,
  public_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')),

  -- Legacy fields
  auth_code TEXT,
  redirect_url TEXT,

  -- Audit
  completed_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_onboarding_user_id ON public.mp_onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_status ON public.mp_onboarding_states(status);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_state_token ON public.mp_onboarding_states(state_token)
  WHERE state_token IS NOT NULL;

ALTER TABLE public.mp_onboarding_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding state"
  ON public.mp_onboarding_states FOR SELECT
  USING (user_id = (select auth.uid()));

GRANT SELECT ON public.mp_onboarding_states TO authenticated;

-- ============================================================
-- 2. MP_WEBHOOK_LOGS — MercadoPago webhook audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mp_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  mp_id TEXT,
  type TEXT,
  payload JSONB,
  ip INET,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotency: prevent duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_webhook_logs_event_id_unique
  ON public.mp_webhook_logs(event_id)
  WHERE event_id IS NOT NULL;

-- Admin/service-role only (no PostgREST access for users)
ALTER TABLE public.mp_webhook_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. USER_FAVORITE_CARS — Marketplace favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_favorite_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorite_cars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_car ON public.user_favorite_cars(car_id);

ALTER TABLE public.user_favorite_cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.user_favorite_cars FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can add favorites"
  ON public.user_favorite_cars FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can remove own favorites"
  ON public.user_favorite_cars FOR DELETE
  USING (user_id = (select auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.user_favorite_cars TO authenticated;

-- ============================================================
-- 4. CHARGEBACKS — MercadoPago chargeback handling
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  mp_payment_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  payment_id UUID REFERENCES public.payments(id),
  renter_id UUID REFERENCES public.profiles(id),
  owner_id UUID REFERENCES public.profiles(id),

  -- Amounts
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'ARS',

  -- MercadoPago data
  mp_reason TEXT,
  mp_status TEXT,
  mp_case_id TEXT,
  mp_webhook_data JSONB DEFAULT '{}',

  -- Internal processing
  status TEXT NOT NULL DEFAULT 'opened'
    CHECK (status IN ('opened', 'processing', 'fgo_debited', 'recovered', 'lost', 'disputed')),

  -- FGO debit tracking
  fgo_debit_amount_cents BIGINT DEFAULT 0,
  fgo_debit_transaction_id UUID,
  fgo_debit_at TIMESTAMPTZ,

  -- Recovery tracking
  recovery_status TEXT CHECK (recovery_status IN ('pending', 'partial', 'full', 'failed')),
  recovery_amount_cents BIGINT DEFAULT 0,

  -- Dispute link (references disputes table from critical migration)
  dispute_id UUID REFERENCES public.disputes(id),

  -- Notifications
  owner_notified_at TIMESTAMPTZ,
  admin_notified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chargebacks_mp_payment ON public.chargebacks(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_booking ON public.chargebacks(booking_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_renter ON public.chargebacks(renter_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON public.chargebacks(status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_created ON public.chargebacks(created_at DESC);

ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

-- Affected parties can view chargebacks
CREATE POLICY "Owners can view chargebacks for their bookings"
  ON public.chargebacks FOR SELECT
  USING (owner_id = (select auth.uid()));

CREATE POLICY "Renters can view chargebacks for their bookings"
  ON public.chargebacks FOR SELECT
  USING (renter_id = (select auth.uid()));

GRANT SELECT ON public.chargebacks TO authenticated;

-- ============================================================
-- 5. BOOKING_INSPECTIONS — Check-in/check-out inspections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('check_in', 'check_out', 'renter_check_in')),

  -- GPS & Location
  latitude NUMERIC,
  longitude NUMERIC,
  location_address TEXT,

  -- Inspection data
  odometer_km INTEGER,
  fuel_level_percent SMALLINT,

  -- Evidence
  photo_urls TEXT[],
  video_url TEXT,

  -- Signature
  signature_data TEXT,
  signed_at TIMESTAMPTZ,

  -- Inspector info
  inspector_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(booking_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_booking_inspections_booking ON public.booking_inspections(booking_id);

ALTER TABLE public.booking_inspections ENABLE ROW LEVEL SECURITY;

-- Booking parties can view inspections
CREATE POLICY "Renter can view inspections"
  ON public.booking_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_inspections.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

CREATE POLICY "Owner can view inspections"
  ON public.booking_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = booking_inspections.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

GRANT SELECT ON public.booking_inspections TO authenticated;

-- ============================================================
-- 6. MERCADOPAGO_ACCOUNTS — MP seller account linking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mercadopago_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,

  -- MP account data
  collector_id BIGINT,
  public_key TEXT,

  -- Status
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected')),
  disconnected_at TIMESTAMPTZ,
  disconnection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mp_accounts_user ON public.mercadopago_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_accounts_collector ON public.mercadopago_accounts(collector_id)
  WHERE collector_id IS NOT NULL;

ALTER TABLE public.mercadopago_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own MP account
CREATE POLICY "Users can view own MP account"
  ON public.mercadopago_accounts FOR SELECT
  USING (user_id = (select auth.uid()));

GRANT SELECT ON public.mercadopago_accounts TO authenticated;

-- ============================================================
-- 7. PREAUTHORIZATIONS — Payment pre-auth tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.preauthorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES public.payment_intents(id),

  -- Pre-auth data
  provider_preauth_id TEXT,
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'ARS',

  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'captured', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Capture data
  captured_at TIMESTAMPTZ,
  captured_amount_cents BIGINT,

  -- Provider metadata
  provider_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preauth_booking ON public.preauthorizations(booking_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status ON public.preauthorizations(status);
CREATE INDEX IF NOT EXISTS idx_preauth_expires ON public.preauthorizations(expires_at)
  WHERE status = 'active';

ALTER TABLE public.preauthorizations ENABLE ROW LEVEL SECURITY;

-- Booking parties can view pre-authorizations
CREATE POLICY "Renter can view own preauths"
  ON public.preauthorizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = preauthorizations.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

CREATE POLICY "Owner can view preauths for car bookings"
  ON public.preauthorizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = preauthorizations.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

GRANT SELECT ON public.preauthorizations TO authenticated;

-- ============================================================
-- 8. VEHICLE_INSPECTIONS — Vehicle condition tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pre_rental', 'post_rental', 'damage_assessment')),

  -- Location & odometer
  location_lat NUMERIC,
  location_lon NUMERIC,
  odometer_reading_km INTEGER,

  -- Vehicle condition
  fuel_level_percent SMALLINT,
  exterior_damage TEXT[],
  interior_condition TEXT,

  -- Evidence
  photo_urls TEXT[],
  video_url TEXT,

  -- Inspector & signature
  inspector_id UUID REFERENCES public.profiles(id),
  signature_data BYTEA,
  signed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_booking ON public.vehicle_inspections(booking_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_type ON public.vehicle_inspections(type);

ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Booking parties can view inspections
CREATE POLICY "Renter can view vehicle inspections"
  ON public.vehicle_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = vehicle_inspections.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

CREATE POLICY "Owner can view vehicle inspections"
  ON public.vehicle_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = vehicle_inspections.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

GRANT SELECT ON public.vehicle_inspections TO authenticated;

COMMIT;
