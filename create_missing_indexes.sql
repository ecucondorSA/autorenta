-- ============================================================================
-- CREATE MISSING INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
-- Based on Index Advisor recommendations
-- These indexes will improve JOIN performance on foreign key columns
-- ============================================================================

-- Create indexes for foreign key columns that don't have them
CREATE INDEX IF NOT EXISTS idx_booking_inspections_inspector_id
ON public.booking_inspections (inspector_id);

CREATE INDEX IF NOT EXISTS idx_driver_class_history_booking_id
ON public.driver_class_history (booking_id);

CREATE INDEX IF NOT EXISTS idx_driver_class_history_claim_id
ON public.driver_class_history (claim_id);

CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_message_id
ON public.encryption_audit_log (message_id);

CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_split_id
ON public.mp_webhook_logs (split_id);

CREATE INDEX IF NOT EXISTS idx_pricing_calculations_region_id
ON public.pricing_calculations (region_id);

CREATE INDEX IF NOT EXISTS idx_pricing_hour_factors_region_id
ON public.pricing_hour_factors (region_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_manual_reviewed_by
ON public.vehicle_documents (manual_reviewed_by);

-- Additional performance indexes for heavy queries
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id_status
ON public.bookings (renter_id, status)
WHERE status IN ('active', 'confirmed', 'pending');

CREATE INDEX IF NOT EXISTS idx_cars_owner_id_status
ON public.cars (owner_id, status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id_read_at
ON public.messages (recipient_id, read_at)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at
ON public.notifications (user_id, read_at)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id_created_at
ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id_status
ON public.payments (booking_id, status);

CREATE INDEX IF NOT EXISTS idx_claims_booking_id_status
ON public.claims (booking_id, status);

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_active_recent
ON public.bookings (created_at DESC)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_cars_available_location
ON public.cars USING GIST (location)
WHERE status = 'active' AND available = true;

-- Verify all indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Analyze tables to update statistics after creating indexes
ANALYZE public.booking_inspections;
ANALYZE public.driver_class_history;
ANALYZE public.encryption_audit_log;
ANALYZE public.mp_webhook_logs;
ANALYZE public.pricing_calculations;
ANALYZE public.pricing_hour_factors;
ANALYZE public.vehicle_documents;
ANALYZE public.bookings;
ANALYZE public.cars;
ANALYZE public.messages;
ANALYZE public.notifications;
ANALYZE public.wallet_transactions;
ANALYZE public.payments;
ANALYZE public.claims;

-- Summary report
SELECT
    'INDEX OPTIMIZATION COMPLETE' as status,
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_%') as custom_indexes,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public';