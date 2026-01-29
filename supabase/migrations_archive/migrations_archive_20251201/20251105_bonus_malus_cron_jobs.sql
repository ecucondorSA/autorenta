-- ============================================================================
-- BONUS-MALUS CRON JOBS
-- Phase 8: Automated periodic jobs for bonus-malus system
-- Uses pg_cron extension in Supabase
-- ============================================================================

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- JOB 1: Annual Class Improvement (Bonus) - January 1st at 3 AM
-- ============================================================================

/**
 * Runs annually on January 1st to improve driver classes
 * for users who had a full year without fault claims.
 *
 * LOGIC:
 * - Checks if user has 0 fault claims in the past year
 * - Improves class by 1 level (minimum: class 0)
 * - Increments good_years counter
 */
SELECT cron.schedule(
    'improve-driver-classes-annual',
    '0 3 1 1 *',  -- January 1st at 3 AM every year
    $$
    WITH improved_drivers AS (
        SELECT improve_driver_class_annual()
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_improve_classes_annual',
        'Annual driver class improvement completed',
        jsonb_build_object(
            'year', EXTRACT(YEAR FROM NOW()),
            'drivers_improved', (
                SELECT COUNT(*)
                FROM driver_risk_profile
                WHERE last_class_update::DATE = CURRENT_DATE
                AND class < LAG(class) OVER (PARTITION BY user_id ORDER BY last_class_update DESC)
            )
        )
    );
    $$
);

-- ============================================================================
-- JOB 2: Recalculate Telemetry Scores - Monthly on 1st at 4 AM
-- ============================================================================

/**
 * Runs monthly to recalculate average driver scores
 * based on last 3 months of telemetry data.
 *
 * LOGIC:
 * - Calculates average score from telemetry records
 * - Updates driver_risk_profile.driver_score
 * - Normalizes per 100km for fairness
 */
SELECT cron.schedule(
    'recalculate-driver-scores-monthly',
    '0 4 1 * *',  -- 1st of every month at 4 AM
    $$
    WITH recalculated AS (
        SELECT recalculate_all_driver_scores()
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_recalculate_scores_monthly',
        'Monthly telemetry score recalculation completed',
        jsonb_build_object(
            'month', TO_CHAR(NOW(), 'YYYY-MM'),
            'drivers_updated', (
                SELECT COUNT(*)
                FROM driver_risk_profile
                WHERE updated_at::DATE = CURRENT_DATE
            )
        )
    );
    $$
);

-- ============================================================================
-- JOB 3: Auto-Renew Protection Credit - Daily at 5 AM
-- ============================================================================

/**
 * Runs daily to check eligibility and auto-renew CP
 * for users with ≥10 bookings and 0 fault claims.
 *
 * LOGIC:
 * - Checks if user meets renewal criteria
 * - Issues $300 USD CP for 1 year
 * - Creates accounting entry (deferred revenue)
 */
SELECT cron.schedule(
    'auto-renew-protection-credit-daily',
    '0 5 * * *',  -- Daily at 5 AM
    $$
    WITH eligible_users AS (
        SELECT DISTINCT renter_id as user_id
        FROM bookings
        WHERE status = 'COMPLETED'
        AND renter_id NOT IN (
            SELECT DISTINCT b.renter_id
            FROM bookings b
            INNER JOIN booking_claims bc ON b.id = bc.booking_id
            WHERE bc.with_fault = TRUE
        )
        GROUP BY renter_id
        HAVING COUNT(*) >= 10
    ),
    renewed_users AS (
        SELECT
            eu.user_id,
            extend_protection_credit_for_good_history(eu.user_id) as renewal_result
        FROM eligible_users eu
        INNER JOIN user_wallets uw ON eu.user_id = uw.user_id
        WHERE (
            uw.protection_credit_cents = 0
            OR uw.protection_credit_expires_at < NOW()
        )
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_auto_renew_cp_daily',
        'Daily CP auto-renewal completed',
        jsonb_build_object(
            'date', CURRENT_DATE,
            'users_renewed', (SELECT COUNT(*) FROM renewed_users)
        )
    );
    $$
);

-- ============================================================================
-- JOB 4: Recognize CP Breakage - Daily at 6 AM
-- ============================================================================

/**
 * Runs daily to recognize breakage (unused CP that expired).
 *
 * LOGIC:
 * - Finds users with expired CP (protection_credit_expires_at < NOW())
 * - Recognizes unused balance as breakage revenue
 * - Creates accounting entry (deferred revenue → breakage income)
 */
SELECT cron.schedule(
    'recognize-cp-breakage-daily',
    '0 6 * * *',  -- Daily at 6 AM
    $$
    WITH expired_cp AS (
        SELECT user_id
        FROM user_wallets
        WHERE protection_credit_cents > 0
        AND protection_credit_expires_at < NOW()
    ),
    breakage_recognized AS (
        SELECT
            ec.user_id,
            recognize_protection_credit_breakage(ec.user_id) as breakage_result
        FROM expired_cp ec
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_recognize_breakage_daily',
        'Daily CP breakage recognition completed',
        jsonb_build_object(
            'date', CURRENT_DATE,
            'users_processed', (SELECT COUNT(*) FROM breakage_recognized),
            'total_breakage_usd', (
                SELECT SUM((breakage_result).breakage_amount_usd)
                FROM breakage_recognized
            )
        )
    );
    $$
);

-- ============================================================================
-- JOB 5: Expire Inactive Bonus Protectors - Daily at 7 AM
-- ============================================================================

/**
 * Runs daily to expire Bonus Protectors that reached expiration date.
 *
 * LOGIC:
 * - Finds active protectors with expires_at < NOW()
 * - Marks them as 'EXPIRED'
 * - Logs expiration for auditing
 */
SELECT cron.schedule(
    'expire-bonus-protectors-daily',
    '0 7 * * *',  -- Daily at 7 AM
    $$
    WITH expired_protectors AS (
        UPDATE driver_protection_addons
        SET
            status = 'EXPIRED',
            updated_at = NOW()
        WHERE status = 'ACTIVE'
        AND addon_type = 'BONUS_PROTECTOR'
        AND expires_at < NOW()
        RETURNING id, user_id, protection_level, expires_at
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_expire_protectors_daily',
        'Daily Bonus Protector expiration completed',
        jsonb_build_object(
            'date', CURRENT_DATE,
            'protectors_expired', (SELECT COUNT(*) FROM expired_protectors)
        )
    );
    $$
);

-- ============================================================================
-- JOB 6: Weekly Driver Score Report - Sundays at 8 AM
-- ============================================================================

/**
 * Runs weekly to generate a summary report of driver scores
 * and class distribution for monitoring.
 *
 * LOGIC:
 * - Aggregates driver scores by class
 * - Calculates average scores per class
 * - Stores snapshot for historical analysis
 */
SELECT cron.schedule(
    'driver-score-report-weekly',
    '0 8 * * 0',  -- Sundays at 8 AM
    $$
    WITH class_distribution AS (
        SELECT
            class,
            COUNT(*) as driver_count,
            AVG(driver_score) as avg_score,
            MIN(driver_score) as min_score,
            MAX(driver_score) as max_score,
            AVG(total_claims) as avg_claims,
            AVG(good_years) as avg_good_years
        FROM driver_risk_profile
        GROUP BY class
        ORDER BY class
    )
    INSERT INTO driver_score_snapshots (
        snapshot_date,
        class_distribution,
        total_drivers,
        average_score,
        created_at
    )
    SELECT
        CURRENT_DATE,
        jsonb_agg(cd),
        (SELECT COUNT(*) FROM driver_risk_profile),
        (SELECT AVG(driver_score) FROM driver_risk_profile),
        NOW()
    FROM class_distribution cd;

    -- Log the snapshot
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_driver_report_weekly',
        'Weekly driver score report generated',
        jsonb_build_object(
            'week', TO_CHAR(NOW(), 'YYYY-WW'),
            'total_drivers', (SELECT COUNT(*) FROM driver_risk_profile),
            'avg_score', (SELECT AVG(driver_score) FROM driver_risk_profile)
        )
    );
    $$
);

-- ============================================================================
-- JOB 7: Alert High-Risk Drivers - Daily at 9 AM
-- ============================================================================

/**
 * Runs daily to identify and alert users in high-risk classes (8-10).
 *
 * LOGIC:
 * - Finds drivers in classes 8, 9, or 10
 * - Creates notifications for them
 * - Suggests Bonus Protector purchase
 */
SELECT cron.schedule(
    'alert-high-risk-drivers-daily',
    '0 9 * * *',  -- Daily at 9 AM
    $$
    WITH high_risk_drivers AS (
        SELECT
            user_id,
            class,
            driver_score,
            total_claims,
            claims_with_fault
        FROM driver_risk_profile
        WHERE class >= 8
        AND NOT EXISTS (
            SELECT 1
            FROM driver_protection_addons dpa
            WHERE dpa.user_id = driver_risk_profile.user_id
            AND dpa.addon_type = 'BONUS_PROTECTOR'
            AND dpa.status = 'ACTIVE'
            AND dpa.expires_at > NOW()
        )
    ),
    notifications_created AS (
        INSERT INTO notifications (
            id,
            user_id,
            type,
            title,
            message,
            data,
            status,
            created_at
        )
        SELECT
            gen_random_uuid(),
            user_id,
            'RISK_WARNING',
            'Alto Riesgo - Clase ' || class,
            'Tu clase de conductor está en nivel alto (' || class || '). Considera comprar un Protector de Bonus para proteger tu clase.',
            jsonb_build_object(
                'class', class,
                'score', driver_score,
                'action', 'PURCHASE_PROTECTOR'
            ),
            'UNREAD',
            NOW()
        FROM high_risk_drivers
        RETURNING id
    )
    INSERT INTO worker_logs (level, service, message, metadata)
    VALUES (
        'info',
        'cron_alert_high_risk_daily',
        'Daily high-risk driver alerts sent',
        jsonb_build_object(
            'date', CURRENT_DATE,
            'alerts_sent', (SELECT COUNT(*) FROM notifications_created)
        )
    );
    $$
);

-- ============================================================================
-- Create supporting tables for cron jobs
-- ============================================================================

-- Driver score snapshots for historical analysis
CREATE TABLE IF NOT EXISTS driver_score_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    class_distribution JSONB NOT NULL,
    total_drivers INT NOT NULL,
    average_score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_snapshots_date
    ON driver_score_snapshots(snapshot_date DESC);

COMMENT ON TABLE driver_score_snapshots IS 'Weekly snapshots of driver score distribution for monitoring';
COMMENT ON COLUMN driver_score_snapshots.class_distribution IS 'JSON array with stats per class';

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'DISMISSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_status
    ON notifications(user_id, status, created_at DESC);

COMMENT ON TABLE notifications IS 'User notifications for bonus-malus alerts';

-- ============================================================================
-- Helper: View Active Cron Jobs
-- ============================================================================

CREATE OR REPLACE VIEW bonus_malus_cron_jobs AS
SELECT
    jobid,
    jobname,
    schedule,
    active,
    jobid IN (
        SELECT jobid
        FROM cron.job_run_details
        WHERE start_time > NOW() - INTERVAL '24 hours'
    ) as ran_recently
FROM cron.job
WHERE jobname LIKE '%driver%'
   OR jobname LIKE '%protect%'
   OR jobname LIKE '%telemetry%'
   OR jobname LIKE '%bonus%'
ORDER BY jobname;

COMMENT ON VIEW bonus_malus_cron_jobs IS 'View of active bonus-malus related cron jobs';

-- ============================================================================
-- Verification and Summary
-- ============================================================================

DO $$
DECLARE
    v_job_count INT;
BEGIN
    SELECT COUNT(*) INTO v_job_count
    FROM cron.job
    WHERE jobname IN (
        'improve-driver-classes-annual',
        'recalculate-driver-scores-monthly',
        'auto-renew-protection-credit-daily',
        'recognize-cp-breakage-daily',
        'expire-bonus-protectors-daily',
        'driver-score-report-weekly',
        'alert-high-risk-drivers-daily'
    );

    IF v_job_count = 7 THEN
        RAISE NOTICE '✅ All 7 bonus-malus cron jobs configured successfully!';
    ELSE
        RAISE WARNING '⚠️ Only % out of 7 cron jobs were created', v_job_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📅 Bonus-Malus Cron Jobs:';
    RAISE NOTICE '1. improve-driver-classes-annual (Jan 1st @ 3 AM)';
    RAISE NOTICE '2. recalculate-driver-scores-monthly (1st of month @ 4 AM)';
    RAISE NOTICE '3. auto-renew-protection-credit-daily (Daily @ 5 AM)';
    RAISE NOTICE '4. recognize-cp-breakage-daily (Daily @ 6 AM)';
    RAISE NOTICE '5. expire-bonus-protectors-daily (Daily @ 7 AM)';
    RAISE NOTICE '6. driver-score-report-weekly (Sundays @ 8 AM)';
    RAISE NOTICE '7. alert-high-risk-drivers-daily (Daily @ 9 AM)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 View jobs: SELECT * FROM bonus_malus_cron_jobs;';
    RAISE NOTICE '📈 View logs: SELECT * FROM cron.job_run_details WHERE jobname LIKE ''%driver%'' ORDER BY start_time DESC;';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test manually:';
    RAISE NOTICE '   SELECT improve_driver_class_annual();';
    RAISE NOTICE '   SELECT recalculate_all_driver_scores();';
END $$;

-- ============================================================================
-- RLS Policies for New Tables
-- ============================================================================

-- Driver score snapshots: Only admin can view
ALTER TABLE driver_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view score snapshots"
ON driver_score_snapshots
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = TRUE
    )
);

-- Notifications: Users can view their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON driver_score_snapshots TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON bonus_malus_cron_jobs TO authenticated, service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
