-- =====================================================
-- VERIFICACIÓN COMPLETA DE PLATAFORMA - AutoRenta
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ESTADO DE TABLAS PRINCIPALES
-- =====================================================
SELECT
    '📊 TABLAS PRINCIPALES' AS seccion,
    schemaname,
    tablename,
    n_live_tup AS total_rows,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'profiles', 'cars', 'bookings', 'notifications',
                    'wallet_audit_log', 'withdrawal_transactions', 'reviews')
ORDER BY n_live_tup DESC;

-- =====================================================
-- 2. ÍNDICES CRÍTICOS VERIFICACIÓN
-- =====================================================
SELECT
    '🔍 ÍNDICES CRÍTICOS' AS seccion,
    tablename,
    indexname,
    CASE
        WHEN indexname LIKE 'idx_%' THEN '✅ Custom'
        WHEN indexname LIKE '%pkey' THEN '🔑 Primary Key'
        ELSE '📌 Other'
    END AS tipo
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('bookings', 'cars', 'notifications', 'wallet_audit_log', 'withdrawal_transactions')
ORDER BY tablename, indexname;

-- =====================================================
-- 3. POLÍTICAS RLS ACTIVAS
-- =====================================================
SELECT
    '🔒 RLS POLICIES' AS seccion,
    tablename,
    COUNT(*) AS total_policies,
    SUM(CASE WHEN cmd = 'SELECT' THEN 1 ELSE 0 END) AS select_policies,
    SUM(CASE WHEN cmd = 'INSERT' THEN 1 ELSE 0 END) AS insert_policies,
    SUM(CASE WHEN cmd = 'UPDATE' THEN 1 ELSE 0 END) AS update_policies,
    SUM(CASE WHEN cmd = 'DELETE' THEN 1 ELSE 0 END) AS delete_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 4. TRIGGERS ACTIVOS
-- =====================================================
SELECT
    '⚡ TRIGGERS' AS seccion,
    c.relname AS table_name,
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN '✅ Enabled'
        WHEN 'D' THEN '❌ Disabled'
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- 5. PUBLICACIONES REALTIME
-- =====================================================
SELECT
    '📡 REALTIME PUBLICATIONS' AS seccion,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- 6. SESIONES ACTIVAS Y RENDIMIENTO
-- =====================================================
SELECT
    '💻 SESIONES ACTIVAS' AS seccion,
    COUNT(*) FILTER (WHERE state = 'active') AS active_queries,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    MAX(EXTRACT(EPOCH FROM (NOW() - query_start)))::int AS longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- =====================================================
-- 7. BLOQUEOS Y CONTENCIÓN
-- =====================================================
SELECT
    '🔐 LOCKS STATUS' AS seccion,
    COUNT(*) FILTER (WHERE granted = true) AS granted_locks,
    COUNT(*) FILTER (WHERE granted = false) AS waiting_locks,
    COUNT(DISTINCT relation) AS locked_relations
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database());

-- =====================================================
-- 8. ESTADÍSTICAS DE USO DE ÍNDICES
-- =====================================================
SELECT
    '📈 INDEX USAGE' AS seccion,
    tablename,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS index_usage_pct,
    seq_scan AS sequential_scans,
    idx_scan AS index_scans,
    n_live_tup AS live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (seq_scan + idx_scan) > 0
  AND tablename IN ('bookings', 'cars', 'notifications', 'profiles')
ORDER BY index_usage_pct DESC NULLS LAST;

-- =====================================================
-- 9. FUNCIONES QUE USAN REALTIME
-- =====================================================
SELECT
    '🔔 REALTIME FUNCTIONS' AS seccion,
    n.nspname AS schema_name,
    p.proname AS function_name,
    l.lanname AS language,
    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%realtime.send%' THEN '📤 realtime.send'
        WHEN pg_get_functiondef(p.oid) ILIKE '%pg_notify%' THEN '📢 pg_notify'
        ELSE '❓ other'
    END AS method
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE (pg_get_functiondef(p.oid) ILIKE '%realtime.send%'
   OR pg_get_functiondef(p.oid) ILIKE '%pg_notify%')
  AND n.nspname IN ('public', 'realtime')
ORDER BY n.nspname, p.proname;

-- =====================================================
-- 10. CONFIGURACIÓN DE STORAGE (Buckets)
-- =====================================================
SELECT
    '📦 STORAGE BUCKETS' AS seccion,
    id,
    name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- 11. TAMAÑO DE BASE DE DATOS
-- =====================================================
SELECT
    '💾 DATABASE SIZE' AS seccion,
    pg_size_pretty(pg_database_size(current_database())) AS total_size,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes;

-- =====================================================
-- 12. VACÍO Y MANTENIMIENTO
-- =====================================================
SELECT
    '🧹 MAINTENANCE STATUS' AS seccion,
    tablename,
    n_dead_tup AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_row_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 100
ORDER BY dead_row_pct DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- 13. RESUMEN EJECUTIVO
-- =====================================================
SELECT
    '✅ RESUMEN EJECUTIVO' AS seccion,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') AS custom_indexes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS rls_policies,
    (SELECT COUNT(*) FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE NOT t.tgisinternal AND n.nspname = 'public') AS active_triggers,
    (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime') AS realtime_tables,
    (SELECT pg_size_pretty(pg_database_size(current_database()))) AS db_size;
