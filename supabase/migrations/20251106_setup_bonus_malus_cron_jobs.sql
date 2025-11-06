-- ============================================================================
-- MIGRATION: Bonus-Malus System Cron Jobs
-- Date: 2025-11-06
-- Purpose: Automated jobs for driver class updates, telemetry, and credit renewals
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- JOB 1: Annual Driver Class Updates for Good History
-- Runs: Once per year on January 1st at 3 AM
-- Purpose: Reward drivers with consistent good history (10+ clean bookings)
-- ============================================================================

SELECT cron.schedule(
    'annual-driver-class-update',
    '0 3 1 1 *',  -- January 1st at 3 AM every year
    $$
    -- Update classes for drivers with 10+ clean bookings in last year
    WITH good_drivers AS (
        SELECT
            drp.user_id,
            drp.class as current_class,
            drp.clean_bookings,
            drp.total_bookings,
            drp.clean_percentage
        FROM driver_risk_profile drp
        WHERE drp.clean_bookings >= 10
          AND drp.clean_percentage >= 80
          AND drp.class > 0  -- Can improve
          AND drp.is_active = true
    ),
    class_updates AS (
        -- Improve class by 1 for every 10 clean bookings
        UPDATE driver_risk_profile
        SET
            class = GREATEST(0, class - 1),
            last_class_update = NOW(),
            good_years = good_years + 1,
            updated_at = NOW()
        WHERE user_id IN (SELECT user_id FROM good_drivers)
        RETURNING user_id, class
    ),
    history_records AS (
        -- Record class changes in history
        INSERT INTO driver_class_history (
            user_id,
            old_class,
            new_class,
            class_change,
            reason,
            created_at
        )
        SELECT
            gd.user_id,
            gd.current_class,
            cu.class,
            gd.current_class - cu.class,
            FORMAT('Mejora anual automática: %s reservas sin daños (%s%% clean)',
                   gd.clean_bookings, gd.clean_percentage),
            NOW()
        FROM good_drivers gd
        JOIN class_updates cu ON gd.user_id = cu.user_id
        RETURNING user_id
    )
    -- Log the operation
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_annual_class_update',
        'Annual driver class updates completed',
        jsonb_build_object(
            'drivers_updated', COUNT(*),
            'year', EXTRACT(YEAR FROM NOW())
        )
    FROM history_records;
    $$
);

-- ============================================================================
-- JOB 2: Monthly Telemetry Score Recalculation
-- Runs: 1st day of each month at 2 AM
-- Purpose: Update driver scores with rolling 3-month average
-- ============================================================================

SELECT cron.schedule(
    'monthly-telemetry-score-update',
    '0 2 1 * *',  -- 1st of month at 2 AM
    $$
    -- Recalculate driver scores based on last 3 months telemetry
    WITH telemetry_scores AS (
        SELECT
            user_id,
            ROUND(AVG(driver_score)) as avg_score,
            COUNT(*) as trip_count
        FROM driver_telemetry
        WHERE trip_date > NOW() - INTERVAL '3 months'
        GROUP BY user_id
    ),
    score_updates AS (
        UPDATE driver_risk_profile drp
        SET
            driver_score = ts.avg_score,
            updated_at = NOW()
        FROM telemetry_scores ts
        WHERE drp.user_id = ts.user_id
          AND drp.is_active = true
          AND ts.trip_count >= 3  -- Minimum 3 trips for meaningful average
        RETURNING drp.user_id, drp.driver_score
    )
    -- Log the operation
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_monthly_telemetry_update',
        'Monthly telemetry score recalculation completed',
        jsonb_build_object(
            'profiles_updated', COUNT(*),
            'avg_score', ROUND(AVG(driver_score)),
            'month', EXTRACT(MONTH FROM NOW()),
            'year', EXTRACT(YEAR FROM NOW())
        )
    FROM score_updates;

    -- Clean up old telemetry data (older than 12 months)
    WITH deleted_telemetry AS (
        DELETE FROM driver_telemetry
        WHERE trip_date < NOW() - INTERVAL '12 months'
        RETURNING id
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_cleanup_old_telemetry',
        'Cleaned up telemetry data older than 12 months',
        jsonb_build_object('records_deleted', COUNT(*))
    FROM deleted_telemetry;
    $$
);

-- ============================================================================
-- JOB 3: Daily Autorentar Credit Renewal Check
-- Runs: Every day at 1 AM
-- Purpose: Check and process credit renewals for eligible users
-- ============================================================================

SELECT cron.schedule(
    'daily-autorentar-credit-renewal',
    '0 1 * * *',  -- Daily at 1 AM
    $$
    -- Find users eligible for credit renewal
    WITH eligible_users AS (
        SELECT
            uw.user_id,
            uw.autorentar_credit_balance,
            uw.autorentar_credit_expires_at,
            drp.clean_bookings,
            drp.total_bookings,
            drp.class
        FROM user_wallets uw
        JOIN driver_risk_profile drp ON uw.user_id = drp.user_id
        WHERE uw.autorentar_credit_expires_at IS NOT NULL
          AND uw.autorentar_credit_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
          AND drp.clean_bookings >= 10
          AND drp.is_active = true
    ),
    renewal_attempts AS (
        -- Attempt to renew credit for each eligible user
        SELECT
            eu.user_id,
            (SELECT * FROM extend_autorentar_credit_for_good_history(eu.user_id)) as result
        FROM eligible_users eu
    )
    -- Log renewal results
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_daily_credit_renewal',
        'Daily Autorentar Credit renewal check completed',
        jsonb_build_object(
            'eligible_users', COUNT(*),
            'renewed_successfully', COUNT(*) FILTER (WHERE (result).success = true),
            'date', CURRENT_DATE
        )
    FROM renewal_attempts;
    $$
);

-- ============================================================================
-- JOB 4: Daily Autorentar Credit Expiration and Breakage Recognition
-- Runs: Every day at 4 AM
-- Purpose: Process expired credits and recognize breakage revenue
-- ============================================================================

SELECT cron.schedule(
    'daily-autorentar-credit-expiration',
    '0 4 * * *',  -- Daily at 4 AM
    $$
    -- Find expired credits
    WITH expired_credits AS (
        SELECT
            uw.user_id,
            uw.autorentar_credit_balance,
            uw.autorentar_credit_expires_at
        FROM user_wallets uw
        WHERE uw.autorentar_credit_balance > 0
          AND uw.autorentar_credit_expires_at < NOW()
          AND uw.autorentar_credit_expires_at IS NOT NULL
    ),
    breakage_processed AS (
        -- Process breakage for each expired credit
        SELECT
            ec.user_id,
            (SELECT * FROM recognize_autorentar_credit_breakage(ec.user_id)) as result
        FROM expired_credits ec
    )
    -- Log breakage processing
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_daily_credit_expiration',
        'Daily Autorentar Credit expiration and breakage recognition completed',
        jsonb_build_object(
            'expired_credits', COUNT(*),
            'breakage_processed', COUNT(*) FILTER (WHERE (result).success = true),
            'total_breakage_revenue_cents', SUM((result).breakage_amount_cents),
            'date', CURRENT_DATE
        )
    FROM breakage_processed;
    $$
);

-- ============================================================================
-- JOB 5: Weekly Bonus Protector Expiration Check
-- Runs: Every Monday at 5 AM
-- Purpose: Mark expired protectors and send notifications
-- ============================================================================

SELECT cron.schedule(
    'weekly-bonus-protector-expiration',
    '0 5 * * 1',  -- Every Monday at 5 AM
    $$
    -- Find protectors expiring in next 7 days
    WITH expiring_soon AS (
        SELECT
            user_id,
            addon_id,
            expires_at,
            remaining_uses
        FROM driver_protection_addons
        WHERE is_active = true
          AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    ),
    expired_protectors AS (
        -- Mark expired protectors as inactive
        UPDATE driver_protection_addons
        SET
            is_active = false,
            updated_at = NOW()
        WHERE is_active = true
          AND expires_at < NOW()
        RETURNING user_id, addon_id
    )
    -- Log expiration processing
    INSERT INTO worker_logs (level, service, message, metadata)
    SELECT
        'info',
        'cron_weekly_protector_expiration',
        'Weekly Bonus Protector expiration check completed',
        jsonb_build_object(
            'protectors_expiring_soon', (SELECT COUNT(*) FROM expiring_soon),
            'protectors_expired', COUNT(*),
            'week', EXTRACT(WEEK FROM NOW()),
            'year', EXTRACT(YEAR FROM NOW())
        )
    FROM expired_protectors;
    $$
);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates 5 cron jobs for the Bonus-Malus system:
--
-- 1. ANNUAL (Jan 1, 3 AM): Update driver classes for good history
--    - Improves class by 1 for drivers with 10+ clean bookings
--    - Requires 80%+ clean percentage
--    - Records changes in driver_class_history
--
-- 2. MONTHLY (1st, 2 AM): Recalculate telemetry scores
--    - Updates driver_score with 3-month rolling average
--    - Requires minimum 3 trips for meaningful average
--    - Cleans up telemetry data older than 12 months
--
-- 3. DAILY (1 AM): Check Autorentar Credit renewals
--    - Finds credits expiring in next 30 days
--    - Extends credit for users with 10+ clean bookings
--    - Calls extend_autorentar_credit_for_good_history RPC
--
-- 4. DAILY (4 AM): Process expired credits and breakage
--    - Finds credits that expired
--    - Recognizes breakage revenue (accounting entry)
--    - Calls recognize_autorentar_credit_breakage RPC
--
-- 5. WEEKLY (Mon, 5 AM): Check Bonus Protector expirations
--    - Marks expired protectors as inactive
--    - Finds protectors expiring in next 7 days (for notifications)
--
-- All jobs log to worker_logs table for monitoring
-- View jobs: SELECT * FROM cron.job;
-- View logs: SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
--
-- Next: Test jobs with: SELECT cron.run_job('job-name');
-- ============================================================================
