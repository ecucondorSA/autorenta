-- ============================================================================
-- Migration: Split Payment System & Infrastructure Fixes
-- Created: 2025-10-28
-- Purpose: Add complete split payment infrastructure + fix booking_risk_snapshots
-- ============================================================================

-- ============================================================================
-- PART 1: Fix booking_risk_snapshots inconsistency
-- ============================================================================

-- Check if singular table exists and plural doesn't
DO $$
BEGIN
    -- Create plural table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'booking_risk_snapshots') THEN
        CREATE TABLE booking_risk_snapshots (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
            risk_factors JSONB DEFAULT '[]'::jsonb,
            verification_status TEXT NOT NULL DEFAULT 'pending',
            requires_manual_review BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_booking_risk_snapshots_booking_id ON booking_risk_snapshots(booking_id);
        CREATE INDEX idx_booking_risk_snapshots_created_at ON booking_risk_snapshots(created_at DESC);
        CREATE INDEX idx_booking_risk_snapshots_verification_status ON booking_risk_snapshots(verification_status);

        -- Migrate data from singular if exists
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'booking_risk_snapshot') THEN
            INSERT INTO booking_risk_snapshots 
                (id, booking_id, risk_score, risk_factors, verification_status, requires_manual_review, created_at, updated_at)
            SELECT id, booking_id, risk_score, risk_factors, verification_status, requires_manual_review, created_at, updated_at
            FROM booking_risk_snapshot
            ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Enable RLS
        ALTER TABLE booking_risk_snapshots ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        CREATE POLICY "Users can view their own booking risk snapshots"
            ON booking_risk_snapshots FOR SELECT
            USING (
                booking_id IN (
                    SELECT id FROM bookings 
                    WHERE user_id = auth.uid() OR owner_id = auth.uid()
                )
            );

        CREATE POLICY "System can insert risk snapshots"
            ON booking_risk_snapshots FOR INSERT
            WITH CHECK (true);

        CREATE POLICY "System can update risk snapshots"
            ON booking_risk_snapshots FOR UPDATE
            USING (true);

        RAISE NOTICE 'Created booking_risk_snapshots table and migrated data';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Split Payment System Tables
-- ============================================================================

-- Wallet Split Configuration
CREATE TABLE IF NOT EXISTS wallet_split_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
    locador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_fee_percent NUMERIC(5,2) CHECK (custom_fee_percent >= 0 AND custom_fee_percent <= 100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_split_config_locador_id ON wallet_split_config(locador_id);
CREATE INDEX IF NOT EXISTS idx_wallet_split_config_active ON wallet_split_config(active);

-- Bank Accounts for Withdrawals
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('savings', 'checking', 'cbu', 'cvu', 'alias')),
    bank_code VARCHAR(10),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(200) NOT NULL,
    account_holder_id VARCHAR(20) NOT NULL, -- DNI/CUIT
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_verified ON bank_accounts(verified);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(user_id, is_default) WHERE is_default = true;

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Withdrawal Transactions (actual transfers)
CREATE TABLE IF NOT EXISTS withdrawal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
    mercadopago_transfer_id VARCHAR(100) UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'reversed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_request_id ON withdrawal_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_mp_id ON withdrawal_transactions(mercadopago_transfer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_status ON withdrawal_transactions(status);

-- ============================================================================
-- PART 3: RPC Functions for Split Payment
-- ============================================================================

-- Process Split Payment
CREATE OR REPLACE FUNCTION process_split_payment(
    p_booking_id UUID,
    p_total_amount NUMERIC
)
RETURNS TABLE (
    split_payment_id UUID,
    locador_amount NUMERIC,
    platform_amount NUMERIC,
    locador_transaction_id UUID,
    platform_transaction_id UUID
) AS $$
DECLARE
    v_split_payment_id UUID;
    v_booking RECORD;
    v_fee_percent NUMERIC;
    v_platform_amount NUMERIC;
    v_locador_amount NUMERIC;
    v_locador_tx_id UUID;
    v_platform_tx_id UUID;
    v_platform_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID; -- System/Platform user
BEGIN
    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Get fee configuration
    SELECT COALESCE(custom_fee_percent, platform_fee_percent, 10.00) INTO v_fee_percent
    FROM wallet_split_config
    WHERE (locador_id = v_booking.owner_id OR locador_id IS NULL)
    AND active = true
    ORDER BY locador_id NULLS LAST
    LIMIT 1;

    -- Calculate split
    v_platform_amount := ROUND(p_total_amount * (v_fee_percent / 100), 2);
    v_locador_amount := p_total_amount - v_platform_amount;

    -- Generate split payment ID
    v_split_payment_id := uuid_generate_v4();

    -- Create transaction for locador (owner receives rental amount)
    INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        description,
        metadata,
        related_booking_id
    ) VALUES (
        v_booking.owner_id,
        'booking_payment',
        v_locador_amount,
        'ARS',
        'completed',
        'Payment for booking (after platform fee)',
        jsonb_build_object(
            'split_payment_id', v_split_payment_id,
            'original_amount', p_total_amount,
            'platform_fee_percent', v_fee_percent,
            'is_split_payment', true
        ),
        p_booking_id
    ) RETURNING id INTO v_locador_tx_id;

    -- Create transaction for platform
    INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        description,
        metadata,
        related_booking_id
    ) VALUES (
        v_platform_user_id,
        'platform_fee',
        v_platform_amount,
        'ARS',
        'completed',
        'Platform fee from booking',
        jsonb_build_object(
            'split_payment_id', v_split_payment_id,
            'original_amount', p_total_amount,
            'platform_fee_percent', v_fee_percent,
            'locador_id', v_booking.owner_id
        ),
        p_booking_id
    ) RETURNING id INTO v_platform_tx_id;

    -- Update user wallets
    UPDATE user_wallets
    SET balance = balance + v_locador_amount,
        updated_at = NOW()
    WHERE user_id = v_booking.owner_id;

    -- Return results
    RETURN QUERY SELECT 
        v_split_payment_id,
        v_locador_amount,
        v_platform_amount,
        v_locador_tx_id,
        v_platform_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Withdrawal Request
CREATE OR REPLACE FUNCTION process_withdrawal(
    p_request_id UUID,
    p_transfer_id VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_user_wallet RECORD;
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- Get withdrawal request
    SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF v_request.status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not approved');
    END IF;

    -- Get user wallet
    SELECT * INTO v_user_wallet FROM user_wallets WHERE user_id = v_request.user_id FOR UPDATE;

    -- Check available funds
    IF v_user_wallet.balance < v_request.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- Create withdrawal transaction
    INSERT INTO withdrawal_transactions (
        request_id,
        mercadopago_transfer_id,
        amount,
        currency,
        status
    ) VALUES (
        p_request_id,
        p_transfer_id,
        v_request.amount,
        v_request.currency,
        'in_progress'
    ) RETURNING id INTO v_transaction_id;

    -- Deduct from wallet
    UPDATE user_wallets
    SET balance = balance - v_request.amount,
        updated_at = NOW()
    WHERE user_id = v_request.user_id;

    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        description,
        metadata
    ) VALUES (
        v_request.user_id,
        'withdrawal',
        -v_request.amount,
        v_request.currency,
        'completed',
        'Withdrawal to bank account',
        jsonb_build_object(
            'request_id', p_request_id,
            'transaction_id', v_transaction_id,
            'transfer_id', p_transfer_id
        )
    );

    -- Update request status
    UPDATE withdrawal_requests
    SET status = 'processing',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount', v_request.amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify Bank Account (basic validation)
CREATE OR REPLACE FUNCTION verify_bank_account(
    p_user_id UUID,
    p_account_number VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_is_valid BOOLEAN := true;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Basic validation rules
    IF LENGTH(p_account_number) < 10 THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account number too short');
    END IF;

    IF LENGTH(p_account_number) > 50 THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account number too long');
    END IF;

    -- Check if already exists for another user
    IF EXISTS (
        SELECT 1 FROM bank_accounts 
        WHERE account_number = p_account_number 
        AND user_id != p_user_id
    ) THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account already registered');
    END IF;

    RETURN jsonb_build_object(
        'is_valid', v_is_valid,
        'errors', v_errors
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Performance Indexes
-- ============================================================================

-- Wallet transactions indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created 
    ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status 
    ON wallet_transactions(status) WHERE status IN ('pending', 'processing');

-- Bookings indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_owner_status_created 
    ON bookings(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created 
    ON bookings(user_id, status, created_at DESC);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_status 
    ON payments(booking_id, status);

-- ============================================================================
-- PART 5: RLS Policies for New Tables
-- ============================================================================

-- wallet_split_config
ALTER TABLE wallet_split_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own split config"
    ON wallet_split_config FOR SELECT
    USING (locador_id = auth.uid() OR locador_id IS NULL);

CREATE POLICY "Admins can manage split config"
    ON wallet_split_config FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bank accounts"
    ON bank_accounts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bank accounts"
    ON bank_accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bank accounts"
    ON bank_accounts FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own bank accounts"
    ON bank_accounts FOR DELETE
    USING (user_id = auth.uid());

-- withdrawal_requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests"
    ON withdrawal_requests FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own withdrawal requests"
    ON withdrawal_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage withdrawal requests"
    ON withdrawal_requests FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- withdrawal_transactions
ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal transactions"
    ON withdrawal_transactions FOR SELECT
    USING (
        request_id IN (
            SELECT id FROM withdrawal_requests WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage withdrawal transactions"
    ON withdrawal_transactions FOR ALL
    USING (true);

-- ============================================================================
-- PART 6: Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallet_split_config_updated_at') THEN
        CREATE TRIGGER update_wallet_split_config_updated_at
            BEFORE UPDATE ON wallet_split_config
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bank_accounts_updated_at') THEN
        CREATE TRIGGER update_bank_accounts_updated_at
            BEFORE UPDATE ON bank_accounts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdrawal_requests_updated_at') THEN
        CREATE TRIGGER update_withdrawal_requests_updated_at
            BEFORE UPDATE ON withdrawal_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdrawal_transactions_updated_at') THEN
        CREATE TRIGGER update_withdrawal_transactions_updated_at
            BEFORE UPDATE ON withdrawal_transactions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- PART 7: Seed Data
-- ============================================================================

-- Insert default platform fee configuration
INSERT INTO wallet_split_config (platform_fee_percent, locador_id, active)
VALUES (10.00, NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Split Payment System migration completed successfully!';
    RAISE NOTICE '✅ booking_risk_snapshots table fixed and indexed';
    RAISE NOTICE '✅ Split payment tables created';
    RAISE NOTICE '✅ RPC functions deployed';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test RPCs: SELECT * FROM process_split_payment(...)';
    RAISE NOTICE '2. Verify indexes: SELECT * FROM pg_indexes WHERE tablename LIKE ''wallet%''';
    RAISE NOTICE '3. Check RLS: SELECT * FROM pg_policies WHERE tablename LIKE ''bank_accounts''';
END $$;
