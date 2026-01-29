-- ============================================================================
-- ENSURE SUBSCRIPTION SCHEMA
-- Date: 2026-01-07
-- Description: Ensures subscriptions table has all required columns.
--              Safe migration that only adds missing columns.
-- ============================================================================

DO $$
BEGIN
    -- 1. Ensure columns exist

    -- coverage_limit_cents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'coverage_limit_cents') THEN
        ALTER TABLE public.subscriptions ADD COLUMN coverage_limit_cents BIGINT DEFAULT 0;
    END IF;

    -- remaining_balance_cents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'remaining_balance_cents') THEN
        ALTER TABLE public.subscriptions ADD COLUMN remaining_balance_cents BIGINT DEFAULT 0;
    END IF;

    -- payment_provider
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_provider') THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_provider TEXT DEFAULT 'wallet';
    END IF;

    -- payment_external_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_external_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_external_id TEXT;
    END IF;

    -- payment_transaction_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_transaction_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN payment_transaction_id UUID;
    END IF;

    -- metadata (ensure it's jsonb)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'metadata') THEN
        ALTER TABLE public.subscriptions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Ensure RLS is enabled
    EXECUTE 'ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY';

END $$;

-- 3. Re-grant permissions (just in case)
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO service_role;
GRANT SELECT ON public.subscriptions TO authenticated;
