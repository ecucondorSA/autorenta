-- ============================================================================
-- ENABLE INDEX ADVISOR FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
-- These extensions help identify missing indexes that can improve query performance
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS hypopg;
CREATE EXTENSION IF NOT EXISTS index_advisor;

-- Verify extensions are enabled
SELECT
  extname,
  extversion,
  extnamespace::regnamespace as schema
FROM pg_extension
WHERE extname IN ('hypopg', 'index_advisor');

-- ============================================================================
-- ANALYZE QUERY PERFORMANCE AND GET INDEX RECOMMENDATIONS
-- ============================================================================

-- Get index recommendations for the most common queries on heavy tables
SELECT
  schemaname,
  tablename,
  attname,
  index_advisor(format('SELECT * FROM %I.%I WHERE %I = $1', schemaname, tablename, attname))
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('bookings', 'cars', 'payments', 'messages', 'notifications', 'wallet_transactions')
AND n_distinct > 10
LIMIT 20;

-- Check for missing indexes on foreign key columns
WITH foreign_keys AS (
  SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
),
existing_indexes AS (
  SELECT
    schemaname,
    tablename,
    indexdef,
    SUBSTRING(indexdef FROM '\((.*?)\)') as indexed_columns
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT DISTINCT
  fk.table_name,
  fk.column_name,
  'CREATE INDEX idx_' || fk.table_name || '_' || fk.column_name ||
  ' ON public.' || fk.table_name || ' (' || fk.column_name || ');' as suggested_index
FROM foreign_keys fk
LEFT JOIN existing_indexes ei
  ON ei.tablename = fk.table_name
  AND ei.indexed_columns LIKE '%' || fk.column_name || '%'
WHERE ei.indexdef IS NULL
ORDER BY fk.table_name, fk.column_name;

-- ============================================================================
-- ANALYZE SLOW QUERIES AND SUGGEST INDEXES
-- ============================================================================

-- Find tables with sequential scans that might benefit from indexes
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  CASE
    WHEN seq_scan > 0 THEN
      ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
    ELSE 0
  END as seq_scan_percentage,
  CASE
    WHEN seq_scan > idx_scan AND seq_tup_read > 1000000 THEN
      'HIGH - Table needs indexes'
    WHEN seq_scan > idx_scan THEN
      'MEDIUM - Consider adding indexes'
    ELSE
      'LOW - Indexing adequate'
  END as recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND (seq_scan > 0 OR idx_scan > 0)
ORDER BY seq_tup_read DESC
LIMIT 20;

-- ============================================================================
-- CREATE HYPOTHETICAL INDEXES AND TEST PERFORMANCE
-- ============================================================================

-- Example: Test hypothetical index on bookings table
SELECT hypopg_create_index('CREATE INDEX ON public.bookings (user_id, status, created_at)');
SELECT hypopg_create_index('CREATE INDEX ON public.cars (owner_id, status)');
SELECT hypopg_create_index('CREATE INDEX ON public.messages (conversation_id, created_at)');
SELECT hypopg_create_index('CREATE INDEX ON public.wallet_transactions (user_id, created_at)');

-- List all hypothetical indexes
SELECT * FROM hypopg_list_indexes();

-- Test query performance with hypothetical indexes
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bookings
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
AND status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Clean up hypothetical indexes after testing
SELECT hypopg_drop_index(indexrelid) FROM hypopg_list_indexes();

-- ============================================================================
-- SUMMARY RECOMMENDATIONS
-- ============================================================================

SELECT
  'INDEX OPTIMIZATION SUMMARY' as report,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as current_indexes,
  (SELECT COUNT(DISTINCT tablename) FROM pg_stat_user_tables
   WHERE schemaname = 'public' AND seq_scan > idx_scan) as tables_needing_indexes,
  (SELECT SUM(seq_tup_read) FROM pg_stat_user_tables
   WHERE schemaname = 'public') as total_sequential_reads,
  (SELECT SUM(idx_tup_fetch) FROM pg_stat_user_tables
   WHERE schemaname = 'public') as total_index_reads;