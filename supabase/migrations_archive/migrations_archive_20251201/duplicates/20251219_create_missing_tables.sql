-- ============================================================================
-- Migration: Create missing tables for booking operations
-- Created: 2025-12-19
-- Description: Creates tables that the frontend expects but don't exist yet
-- ============================================================================

-- ============================================================================
-- 1. booking_extension_requests - Solicitudes de extensión de alquiler
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    original_end_at TIMESTAMPTZ NOT NULL,
    new_end_at TIMESTAMPTZ NOT NULL,
    request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected', 'cancelled')),
    estimated_cost_amount NUMERIC(12, 2),
    estimated_cost_currency TEXT DEFAULT 'ARS',
    renter_message TEXT,
    owner_response TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_extension_requests_booking_id ON booking_extension_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extension_requests_status ON booking_extension_requests(request_status);

-- RLS
ALTER TABLE booking_extension_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extension requests"
    ON booking_extension_requests FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Renters can create extension requests"
    ON booking_extension_requests FOR INSERT
    WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Owners can update extension requests"
    ON booking_extension_requests FOR UPDATE
    USING (auth.uid() = owner_id OR auth.uid() = renter_id);

-- ============================================================================
-- 2. insurance_claims - Reclamos de seguro
-- ============================================================================
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    policy_id UUID,
    reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_role TEXT NOT NULL CHECK (reporter_role IN ('driver', 'owner')),
    claim_type TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    incident_location TEXT,
    incident_date DATE NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    evidence_photos JSONB DEFAULT '[]'::jsonb,
    police_report_number TEXT,
    police_report_url TEXT,
    estimated_damage_amount NUMERIC(12, 2),
    deductible_charged NUMERIC(12, 2),
    insurance_payout NUMERIC(12, 2),
    assigned_adjuster TEXT,
    adjuster_contact TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid', 'closed')),
    resolution_notes TEXT,
    closed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_booking_id ON insurance_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_reported_by ON insurance_claims(reported_by);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

-- RLS
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claims they are involved in"
    ON insurance_claims FOR SELECT
    USING (
        auth.uid() = reported_by
        OR EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = insurance_claims.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create claims for their bookings"
    ON insurance_claims FOR INSERT
    WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can update their own claims"
    ON insurance_claims FOR UPDATE
    USING (auth.uid() = reported_by);

-- ============================================================================
-- 3. bookings_pricing - Desglose de precios de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings_pricing (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    nightly_rate_cents INTEGER,
    days_count INTEGER,
    subtotal_cents INTEGER,
    fees_cents INTEGER DEFAULT 0,
    discounts_cents INTEGER DEFAULT 0,
    insurance_cents INTEGER DEFAULT 0,
    total_cents INTEGER,
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pricing for their bookings"
    ON bookings_pricing FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_pricing.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "System can insert pricing"
    ON bookings_pricing FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can update pricing"
    ON bookings_pricing FOR UPDATE
    USING (true);

-- ============================================================================
-- 4. bookings_insurance - Información de seguro de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings_insurance (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    insurance_coverage_id UUID,
    insurance_premium_total NUMERIC(12, 2),
    guarantee_type TEXT CHECK (guarantee_type IN ('deposit', 'preauth', 'none', 'wallet')),
    guarantee_amount_cents INTEGER,
    coverage_upgrade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insurance for their bookings"
    ON bookings_insurance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_insurance.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "System can insert insurance"
    ON bookings_insurance FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 5. bookings_confirmation - Estado de confirmación de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings_confirmation (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    pickup_confirmed_at TIMESTAMPTZ,
    pickup_confirmed_by UUID REFERENCES profiles(id),
    dropoff_confirmed_at TIMESTAMPTZ,
    dropoff_confirmed_by UUID REFERENCES profiles(id),
    owner_confirmation_at TIMESTAMPTZ,
    renter_confirmation_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    funds_released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings_confirmation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view confirmation for their bookings"
    ON bookings_confirmation FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_confirmation.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can update confirmation for their bookings"
    ON bookings_confirmation FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_confirmation.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "System can insert confirmation"
    ON bookings_confirmation FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 6. bookings_cancellation - Información de cancelaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings_cancellation (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    cancellation_reason TEXT,
    cancellation_fee_cents INTEGER DEFAULT 0,
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancel_policy_id INTEGER,
    cancelled_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings_cancellation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cancellation for their bookings"
    ON bookings_cancellation FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_cancellation.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create cancellation for their bookings"
    ON bookings_cancellation FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

-- ============================================================================
-- 7. bookings_payment - Estado de pagos de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings_payment (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    payment_mode TEXT CHECK (payment_mode IN ('card', 'wallet', 'cash', 'transfer')),
    wallet_status TEXT CHECK (wallet_status IN ('pending', 'locked', 'charged', 'released', 'refunded')),
    deposit_status TEXT CHECK (deposit_status IN ('pending', 'locked', 'released', 'claimed')),
    wallet_charged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings_payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment for their bookings"
    ON bookings_payment FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = bookings_payment.booking_id
            AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "System can manage payments"
    ON bookings_payment FOR ALL
    USING (true);

-- ============================================================================
-- 8. user_blocks - Bloqueos entre usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
    ON user_blocks FOR SELECT
    USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks"
    ON user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- ============================================================================
-- Trigger para updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'booking_extension_requests',
        'insurance_claims',
        'bookings_pricing',
        'bookings_insurance',
        'bookings_confirmation',
        'bookings_payment'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON booking_extension_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON insurance_claims TO authenticated;
GRANT SELECT ON bookings_pricing TO authenticated;
GRANT SELECT ON bookings_insurance TO authenticated;
GRANT SELECT, UPDATE ON bookings_confirmation TO authenticated;
GRANT SELECT ON bookings_cancellation TO authenticated;
GRANT INSERT ON bookings_cancellation TO authenticated;
GRANT SELECT ON bookings_payment TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_blocks TO authenticated;
