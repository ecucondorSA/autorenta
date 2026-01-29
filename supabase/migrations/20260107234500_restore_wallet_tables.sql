-- ============================================================================
-- RESTORE WALLET TABLES
-- Date: 2026-01-07
-- Description: Restores missing user_wallets and wallet_transactions tables
--              using IF NOT EXISTS for safety.
-- ============================================================================

-- 1. Create wallet transaction types if not exists
DO $$ BEGIN
    CREATE TYPE wallet_tx_type AS ENUM (
        'deposit',
        'withdrawal',
        'charge',
        'refund',
        'lock',
        'unlock',
        'transfer_in',
        'transfer_out'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE wallet_tx_status AS ENUM (
        'pending',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Balances (in cents for precision)
    balance_cents BIGINT NOT NULL DEFAULT 0,
    available_balance_cents BIGINT NOT NULL DEFAULT 0,
    locked_balance_cents BIGINT NOT NULL DEFAULT 0,

    -- Currency
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT positive_balance CHECK (balance_cents >= 0),
    CONSTRAINT positive_available CHECK (available_balance_cents >= 0),
    CONSTRAINT positive_locked CHECK (locked_balance_cents >= 0),
    CONSTRAINT balance_consistency CHECK (balance_cents = available_balance_cents + locked_balance_cents)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);

-- RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own wallet"
        ON public.user_wallets FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Service role can manage wallets"
        ON public.user_wallets FOR ALL
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction details
    type TEXT NOT NULL, -- Using TEXT instead of enum for flexibility
    amount BIGINT NOT NULL, -- Negative for outgoing, positive for incoming
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Status
    status TEXT NOT NULL DEFAULT 'pending',

    -- Description
    description TEXT,

    -- Provider info
    provider TEXT,
    provider_transaction_id TEXT,

    -- Related entities
    booking_id UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider_id ON public.wallet_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own transactions"
        ON public.wallet_transactions FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Service role can manage transactions"
        ON public.wallet_transactions FOR ALL
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Grant permissions
GRANT SELECT ON public.user_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_wallets TO service_role;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wallet_transactions TO service_role;

-- 5. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER set_user_wallets_updated_at
    BEFORE UPDATE ON public.user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wallet_updated_at();

DROP TRIGGER IF EXISTS set_wallet_transactions_updated_at ON public.wallet_transactions;
CREATE TRIGGER set_wallet_transactions_updated_at
    BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wallet_updated_at();
