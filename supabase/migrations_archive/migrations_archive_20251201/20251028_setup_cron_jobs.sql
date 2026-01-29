-- ============================================================================
-- Automated Cron Jobs for AutoRenta
-- Uses pg_cron extension in Supabase
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- JOB 1: Expire Pending Deposits (Every Hour)
-- ============================================================================

SELECT cron.schedule(
    'expire-pending-deposits',
    '0 * * * *',  -- Every hour at minute 0
    $$
    -- Update expired deposits
    UPDATE wallet_transactions
    SET 
        status = 'expired',
        updated_at = NOW(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{expired_at}',
            to_jsonb(NOW())
        )
    WHERE type = 'deposit'
    AND status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND (expires_at IS NULL OR expires_at < NOW());

    -- Log the operation
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_expire_deposits',
        'Expired pending deposits older than 24h',
        jsonb_build_object(
            'rows_affected', (SELECT count(*) FROM wallet_transactions 
                             WHERE type = 'deposit' AND status = 'expired' 
                             AND updated_at > NOW() - INTERVAL '5 minutes')
        )
    );
    $$
);

-- ============================================================================
-- JOB 2: Poll Pending Payments (Every 3 Minutes)
-- ============================================================================

SELECT cron.schedule(
    'poll-pending-payments',
    '*/3 * * * *',  -- Every 3 minutes
    $$
    -- Find payments pending for less than 2 hours
    WITH pending_payments AS (
        SELECT id, mercadopago_payment_id
        FROM payments
        WHERE status = 'pending'
        AND created_at > NOW() - INTERVAL '2 hours'
        AND mercadopago_payment_id IS NOT NULL
        LIMIT 50  -- Process max 50 at a time
    )
    -- Mark them for polling (Edge Function will handle actual API calls)
    UPDATE payments
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{poll_requested_at}',
        to_jsonb(NOW())
    )
    WHERE id IN (SELECT id FROM pending_payments);

    -- Log the operation
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_poll_payments',
        'Marked pending payments for polling',
        jsonb_build_object(
            'payments_marked', (SELECT count(*) FROM payments 
                               WHERE metadata->>'poll_requested_at' IS NOT NULL
                               AND (metadata->>'poll_requested_at')::timestamptz > NOW() - INTERVAL '5 minutes')
        )
    );
    $$
);

-- ============================================================================
-- JOB 3: Sync Binance Exchange Rates (Every 15 Minutes)
-- ============================================================================

SELECT cron.schedule(
    'sync-binance-rates',
    '*/15 * * * *',  -- Every 15 minutes
    $$
    -- This triggers the Edge Function to fetch latest rates
    -- Store a flag that Edge Function can poll
    INSERT INTO system_flags (key, value, updated_at)
    VALUES (
        'exchange_rate_sync_requested',
        to_jsonb(NOW()),
        NOW()
    )
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = to_jsonb(NOW()),
        updated_at = NOW();

    -- Log the request
    INSERT INTO worker_logs (level, service, message)
    VALUES (
        'info',
        'cron_sync_rates',
        'Exchange rate sync requested'
    );
    $$
);

-- ============================================================================
-- JOB 4: Update Demand Snapshots for Dynamic Pricing (Every 15 Minutes)
-- ============================================================================

SELECT cron.schedule(
    'update-demand-snapshots',
    '*/15 * * * *',  -- Every 15 minutes
    $$
    -- Calculate demand for each region
    WITH regional_demand AS (
        SELECT 
            c.region,
            COUNT(DISTINCT c.id) as total_cars,
            COUNT(DISTINCT b.id) as active_bookings,
            CASE 
                WHEN COUNT(DISTINCT c.id) > 0 
                THEN CAST(COUNT(DISTINCT b.id) AS FLOAT) / COUNT(DISTINCT c.id)
                ELSE 0 
            END as demand_ratio
        FROM cars c
        LEFT JOIN bookings b ON c.id = b.car_id
            AND b.status IN ('confirmed', 'active')
            AND b.start_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        WHERE c.status = 'active'
        AND c.is_available = true
        GROUP BY c.region
    )
    -- Insert demand snapshots
    INSERT INTO pricing_demand_snapshots (
        region,
        total_cars,
        active_bookings,
        demand_ratio,
        price_multiplier,
        created_at
    )
    SELECT 
        region,
        total_cars,
        active_bookings,
        demand_ratio,
        -- Calculate dynamic price multiplier
        CASE 
            WHEN demand_ratio >= 0.8 THEN 1.5   -- 50% increase when 80%+ booked
            WHEN demand_ratio >= 0.6 THEN 1.3   -- 30% increase when 60%+ booked
            WHEN demand_ratio >= 0.4 THEN 1.15  -- 15% increase when 40%+ booked
            WHEN demand_ratio <= 0.1 THEN 0.9   -- 10% discount when <10% booked
            ELSE 1.0
        END as price_multiplier,
        NOW()
    FROM regional_demand;

    -- Log the operation
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_demand_snapshots',
        'Updated demand snapshots for dynamic pricing',
        jsonb_build_object(
            'regions_updated', (SELECT count(*) FROM pricing_demand_snapshots 
                               WHERE created_at > NOW() - INTERVAL '1 minute')
        )
    );
    $$
);

-- ============================================================================
-- JOB 5: Cleanup Old Logs (Daily at 2 AM)
-- ============================================================================

SELECT cron.schedule(
    'cleanup-old-logs',
    '0 2 * * *',  -- Daily at 2 AM
    $$
    -- Delete logs older than 30 days
    WITH deleted_worker AS (
        DELETE FROM worker_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    ),
    deleted_webhook AS (
        DELETE FROM webhook_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_cleanup_logs',
        'Cleaned up old logs',
        jsonb_build_object(
            'worker_logs_deleted', (SELECT count(*) FROM deleted_worker),
            'webhook_logs_deleted', (SELECT count(*) FROM deleted_webhook)
        )
    );
    $$
);

-- ============================================================================
-- JOB 6: Backup Wallet Data (Daily at 3 AM)
-- ============================================================================

SELECT cron.schedule(
    'backup-wallet-data',
    '0 3 * * *',  -- Daily at 3 AM
    $$
    -- Create daily snapshot of wallet transactions
    INSERT INTO wallet_transaction_backups (
        backup_date,
        total_transactions,
        total_volume,
        data_snapshot
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*),
        SUM(ABS(amount)),
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'user_id', user_id,
                'type', type,
                'amount', amount,
                'status', status,
                'created_at', created_at
            )
        )
    FROM wallet_transactions
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

    -- Log the backup
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_backup_wallet',
        'Created daily wallet backup',
        jsonb_build_object(
            'backup_date', CURRENT_DATE - INTERVAL '1 day',
            'transactions_backed_up', (SELECT count(*) FROM wallet_transactions 
                                       WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day')
        )
    );
    $$
);

-- ============================================================================
-- JOB 7: Auto-retry Failed Deposits (Every 30 Minutes)
-- ============================================================================

SELECT cron.schedule(
    'retry-failed-deposits',
    '*/30 * * * *',  -- Every 30 minutes
    $$
    -- Mark failed deposits for retry if they failed less than 3 times
    UPDATE wallet_transactions
    SET 
        status = 'pending',
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{retry_count}',
            to_jsonb(COALESCE((metadata->>'retry_count')::int, 0) + 1)
        ),
        updated_at = NOW()
    WHERE type = 'deposit'
    AND status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'
    AND COALESCE((metadata->>'retry_count')::int, 0) < 3
    AND mercadopago_payment_id IS NOT NULL;

    -- Log retry attempts
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_retry_deposits',
        'Marked failed deposits for retry',
        jsonb_build_object(
            'deposits_retried', (SELECT count(*) FROM wallet_transactions 
                                WHERE type = 'deposit' 
                                AND status = 'pending'
                                AND updated_at > NOW() - INTERVAL '2 minutes'
                                AND (metadata->>'retry_count')::int > 0)
        )
    );
    $$
);

-- ============================================================================
-- Create supporting tables if they don't exist
-- ============================================================================

-- System flags for coordination
CREATE TABLE IF NOT EXISTS system_flags (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet transaction backups
CREATE TABLE IF NOT EXISTS wallet_transaction_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_date DATE NOT NULL UNIQUE,
    total_transactions INTEGER,
    total_volume NUMERIC(15,2),
    data_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_backups_date 
    ON wallet_transaction_backups(backup_date DESC);

-- Pricing demand snapshots (if not exists)
CREATE TABLE IF NOT EXISTS pricing_demand_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region VARCHAR(100) NOT NULL,
    total_cars INTEGER NOT NULL,
    active_bookings INTEGER NOT NULL,
    demand_ratio NUMERIC(5,4) NOT NULL,
    price_multiplier NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_snapshots_region_created 
    ON pricing_demand_snapshots(region, created_at DESC);

-- ============================================================================
-- Verify Cron Jobs
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Cron jobs configured successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Active jobs:';
    RAISE NOTICE '1. expire-pending-deposits (hourly)';
    RAISE NOTICE '2. poll-pending-payments (every 3 min)';
    RAISE NOTICE '3. sync-binance-rates (every 15 min)';
    RAISE NOTICE '4. update-demand-snapshots (every 15 min)';
    RAISE NOTICE '5. cleanup-old-logs (daily 2 AM)';
    RAISE NOTICE '6. backup-wallet-data (daily 3 AM)';
    RAISE NOTICE '7. retry-failed-deposits (every 30 min)';
    RAISE NOTICE '';
    RAISE NOTICE 'View jobs: SELECT * FROM cron.job;';
    RAISE NOTICE 'View logs: SELECT * FROM cron.job_run_details ORDER BY start_time DESC;';
END $$;
