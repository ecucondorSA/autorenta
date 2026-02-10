-- Create critical phantom tables identified in DB audit
-- These tables have 6+ code references each and block core features
--
-- Tables: wallet_ledger, booking_contracts, disputes, claims, insurance_policies, payouts, bank_accounts
-- All include RLS + appropriate policies

BEGIN;

-- ============================================================
-- 1. WALLET_LEDGER — Double-entry accounting ledger
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_kind') THEN
    CREATE TYPE public.ledger_kind AS ENUM (
      'deposit',
      'transfer_out',
      'transfer_in',
      'rental_charge',
      'rental_payment',
      'refund',
      'franchise_user',
      'franchise_fund',
      'withdrawal',
      'adjustment',
      'bonus',
      'fee'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  kind public.ledger_kind NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  ref VARCHAR(128) NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  transaction_id UUID REFERENCES public.wallet_transactions(id),
  booking_id UUID REFERENCES public.bookings(id),
  is_autorentar_credit BOOLEAN DEFAULT false,
  autorentar_credit_reference_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_ledger_ref ON public.wallet_ledger(ref);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_ts ON public.wallet_ledger(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_kind ON public.wallet_ledger(kind);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_booking ON public.wallet_ledger(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_ts_kind ON public.wallet_ledger(ts DESC, kind);

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
  ON public.wallet_ledger FOR SELECT
  USING (user_id = (select auth.uid()));

GRANT SELECT ON public.wallet_ledger TO authenticated;

-- ============================================================
-- 2. BOOKING_CONTRACTS — Legal contracts for bookings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_by_renter BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contract versioning and locale
  contract_version TEXT NOT NULL DEFAULT 'v1.0.0',
  contract_locale TEXT NOT NULL DEFAULT 'es-AR',

  -- Legal audit trail (Ley 25.506 compliance)
  renter_ip_address INET,
  renter_user_agent TEXT,
  renter_device_fingerprint TEXT,

  -- PDF generation
  pdf_generated_at TIMESTAMPTZ,
  pdf_storage_path TEXT,
  pdf_generation_status TEXT DEFAULT 'pending'
    CHECK (pdf_generation_status IN ('pending', 'generating', 'ready', 'failed')),
  pdf_error TEXT,

  -- Contract data snapshot (immutable)
  contract_data JSONB,
  clauses_accepted JSONB,
  ev_clauses_accepted JSONB DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_contracts_booking_id ON public.booking_contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_contracts_pdf_status ON public.booking_contracts(pdf_generation_status)
  WHERE pdf_generation_status IN ('pending', 'generating');

ALTER TABLE public.booking_contracts ENABLE ROW LEVEL SECURITY;

-- Renter and car owner can read contracts for their bookings
CREATE POLICY "Renter can view booking contracts"
  ON public.booking_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_contracts.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

CREATE POLICY "Owner can view booking contracts"
  ON public.booking_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = booking_contracts.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Renter can accept contracts
CREATE POLICY "Renter can update to accept contract"
  ON public.booking_contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_contracts.booking_id
        AND b.renter_id = (select auth.uid())
    )
  )
  WITH CHECK (accepted_by_renter = true AND accepted_at IS NOT NULL);

GRANT SELECT ON public.booking_contracts TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_booking_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booking_contracts_timestamp
  BEFORE UPDATE ON public.booking_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_contracts_updated_at();

-- ============================================================
-- 3. DISPUTES — Booking dispute management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  opened_by UUID NOT NULL REFERENCES public.profiles(id),
  kind TEXT NOT NULL CHECK (kind IN ('damage', 'no_show', 'late_return', 'other')),
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_favor TEXT CHECK (resolution_favor IN ('owner', 'renter', 'none')),
  penalty_amount_cents BIGINT,
  resolution_amount NUMERIC,
  resolution_currency TEXT,
  responsible_party_id UUID REFERENCES public.profiles(id),
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking ON public.disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON public.disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Parties to the booking can view disputes
CREATE POLICY "Renter can view disputes for their bookings"
  ON public.disputes FOR SELECT
  USING (
    opened_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = disputes.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

CREATE POLICY "Owner can view disputes for their car bookings"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = disputes.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Users can open disputes for their bookings
CREATE POLICY "Users can create disputes for their bookings"
  ON public.disputes FOR INSERT
  WITH CHECK (opened_by = (select auth.uid()));

GRANT SELECT ON public.disputes TO authenticated;

-- ============================================================
-- 4. CLAIMS — Insurance/damage claims with optimistic locking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  damages JSONB DEFAULT '[]',
  total_estimated_cost_usd DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'pending', 'under_review', 'approved', 'processing', 'paid', 'rejected')),
  notes TEXT,
  fraud_warnings JSONB DEFAULT '[]',
  owner_claims_30d INTEGER DEFAULT 0,

  -- Optimistic locking (P0-SECURITY: prevents double-spend)
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_booking ON public.claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_claims_reported_by ON public.claims(reported_by);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Users can view claims they reported or that affect their bookings
CREATE POLICY "Users can view own claims"
  ON public.claims FOR SELECT
  USING (
    reported_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = claims.booking_id
        AND (b.renter_id = (select auth.uid()))
    )
  );

CREATE POLICY "Owners can view claims on their car bookings"
  ON public.claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = claims.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Users can create claims
CREATE POLICY "Users can create claims"
  ON public.claims FOR INSERT
  WITH CHECK (reported_by = (select auth.uid()));

-- Users can update their own draft claims
CREATE POLICY "Users can update own draft claims"
  ON public.claims FOR UPDATE
  USING (reported_by = (select auth.uid()) AND status = 'draft')
  WITH CHECK (reported_by = (select auth.uid()));

GRANT SELECT ON public.claims TO authenticated;

-- ============================================================
-- 5. INSURANCE_POLICIES — Vehicle insurance management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('platform_floating', 'owner_byoi')),
  insurer TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'cancelled')),
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Coverage details
  liability_coverage DECIMAL(10,2),
  own_damage_coverage BOOLEAN DEFAULT false,
  theft_coverage BOOLEAN DEFAULT false,
  fire_coverage BOOLEAN DEFAULT false,
  misappropriation_coverage BOOLEAN DEFAULT false,

  -- Verification (for BYOI)
  verified_by_admin BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_car ON public.insurance_policies(car_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON public.insurance_policies(status) WHERE status = 'active';

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- Car owners can view insurance for their cars
CREATE POLICY "Owners can view insurance for their cars"
  ON public.insurance_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cars c
      WHERE c.id = insurance_policies.car_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Anyone can read active platform policies (marketplace display)
CREATE POLICY "Anyone can read active platform policies"
  ON public.insurance_policies FOR SELECT
  USING (status = 'active' AND policy_type = 'platform_floating');

GRANT SELECT ON public.insurance_policies TO authenticated;

-- ============================================================
-- 6. BANK_ACCOUNTS — User bank accounts for payouts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'unverified' CHECK (status IN ('verified', 'unverified', 'invalid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can add bank accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own bank accounts"
  ON public.bank_accounts FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own bank accounts"
  ON public.bank_accounts FOR DELETE
  USING (user_id = (select auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;

-- ============================================================
-- 7. PAYOUTS — Withdrawal/payout tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider TEXT DEFAULT 'mercadopago',
  provider_payout_id TEXT,
  provider_response JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payouts
CREATE POLICY "Users can view own payouts"
  ON public.payouts FOR SELECT
  USING (user_id = (select auth.uid()));

GRANT SELECT ON public.payouts TO authenticated;

COMMIT;
