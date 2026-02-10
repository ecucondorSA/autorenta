-- Create payment_intents table
-- Audit finding: 27 code references to this table but it does NOT exist in production
-- Schema reconstructed from archive migration (20251201000001_01_core.sql) and TypeScript models
--
-- This table tracks payment intent lifecycle across providers (MercadoPago, PayPal)

BEGIN;

-- ============================================================
-- 1. Create payment_intent_status enum if not exists
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
    CREATE TYPE public.payment_intent_status AS ENUM (
      'pending',
      'requires_payment',
      'processing',
      'succeeded',
      'failed',
      'cancelled',
      'refunded',
      'expired'
    );
  END IF;
END $$;

-- ============================================================
-- 2. Create payment_intents table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Provider info
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_intent_id TEXT,
  provider_payment_id TEXT,
  provider_status TEXT,
  provider_status_detail TEXT,

  -- MercadoPago-specific
  mp_order_id TEXT,
  mp_order_status TEXT,

  -- PayPal-specific
  paypal_order_id TEXT,
  paypal_capture_id TEXT,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  amount_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'ARS',
  amount_usd DECIMAL(12,2),
  amount_ars DECIMAL(12,2),
  fx_rate DECIMAL(12,6),

  -- Intent metadata
  intent_type TEXT DEFAULT 'booking_payment',
  is_preauth BOOLEAN DEFAULT false,
  preauth_expires_at TIMESTAMPTZ,
  description TEXT,
  external_reference TEXT,

  -- Payment method info
  payment_method_id TEXT,
  card_last4 TEXT,

  -- Status
  status public.payment_intent_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT payment_intents_amount_positive CHECK (amount >= 0),
  CONSTRAINT payment_intents_amount_cents_positive CHECK (amount_cents IS NULL OR amount_cents >= 0)
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payment_intents_booking
  ON public.payment_intents(booking_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user
  ON public.payment_intents(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_intent
  ON public.payment_intents(provider_intent_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON public.payment_intents(status);

CREATE INDEX IF NOT EXISTS idx_payment_intents_external_ref
  ON public.payment_intents(external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_mp_order
  ON public.payment_intents(mp_order_id)
  WHERE mp_order_id IS NOT NULL;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Users can view payment intents for their own bookings
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_intents.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

-- Car owners can view payment intents for bookings on their cars
CREATE POLICY "Owners can view payment intents for their car bookings"
  ON public.payment_intents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = payment_intents.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Only service_role can INSERT/UPDATE (edge functions handle payment intent writes)

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_intents_updated_at();

-- ============================================================
-- 6. Grants
-- ============================================================

GRANT SELECT ON public.payment_intents TO authenticated;

-- ============================================================
-- 7. Backfill FK on payments.payment_intent_id if column exists
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'payment_intent_id'
  ) THEN
    -- Only add FK if no orphan payment_intent_ids exist
    IF NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.payment_intent_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.payment_intents pi
          WHERE pi.id = p.payment_intent_id
        )
    ) THEN
      ALTER TABLE public.payments
        ADD CONSTRAINT payments_payment_intent_id_fkey
        FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;
