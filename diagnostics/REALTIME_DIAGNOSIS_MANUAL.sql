-- =====================================================
-- DIAGNÓSTICO MANUAL DE REALTIME - AutoRenta
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =====================================================
--
-- INSTRUCCIONES:
-- 1. Ir a https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx
-- 2. Navegar a SQL Editor
-- 3. Copiar y pegar cada sección una por una
-- 4. Copiar los resultados para análisis
--
-- =====================================================

-- =====================================================
-- 1. FUNCIONES Y TRIGGERS QUE USAN REALTIME
-- =====================================================

-- 1.1. Listar todas las funciones que mencionan 'realtime'
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%' THEN 'broadcast_changes'
        WHEN pg_get_functiondef(p.oid) ILIKE '%realtime.send%' THEN 'realtime.send'
        ELSE 'other'
    END AS realtime_method,
    l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%realtime%'
  AND n.nspname IN ('public', 'auth')
ORDER BY n.nspname, p.proname;

-- 1.2. Listar triggers asociados a funciones
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE t.tgtype::int & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END AS level,
    CASE t.tgtype::int & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    ARRAY(
        SELECT CASE
            WHEN t.tgtype::int & 4 != 0 THEN 'INSERT'
            WHEN t.tgtype::int & 8 != 0 THEN 'DELETE'
            WHEN t.tgtype::int & 16 != 0 THEN 'UPDATE'
            WHEN t.tgtype::int & 32 != 0 THEN 'TRUNCATE'
        END
    )::text[] AS events
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- 2. ACTIVIDAD DE BASE DE DATOS
-- =====================================================

-- 2.1. Sesiones activas (consultas en ejecución)
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    query_start,
    EXTRACT(EPOCH FROM (NOW() - query_start))::int AS duration_seconds,
    LEFT(query, 150) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
  AND datname = current_database()
ORDER BY query_start
LIMIT 50;

-- 2.2. Bloqueos activos (locks)
SELECT
    l.locktype,
    c.relname AS relation,
    l.mode,
    l.granted,
    a.pid,
    a.usename,
    a.state,
    LEFT(a.query, 100) AS query_preview
FROM pg_locks l
LEFT JOIN pg_class c ON l.relation = c.oid
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
  AND a.datname = current_database()
ORDER BY c.relname, l.mode;

-- =====================================================
-- 3. POLÍTICAS RLS Y SUS ÍNDICES
-- =====================================================

-- 3.1. Listar todas las políticas RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    LEFT(qual::text, 200) AS condition,
    LEFT(with_check::text, 200) AS with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3.2. Índices existentes en tablas públicas
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3.3. Identificar columnas comunes en RLS sin índice
-- Esta query busca columnas mencionadas en políticas RLS
WITH rls_columns AS (
    SELECT DISTINCT
        tablename,
        unnest(regexp_matches(qual::text || ' ' || COALESCE(with_check::text, ''),
                              '([a-z_]+)\s*=', 'g')) AS column_name
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    rc.tablename,
    rc.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = rc.tablename
              AND indexdef ILIKE '%' || rc.column_name || '%'
        ) THEN '✅ Indexada'
        ELSE '❌ NO indexada'
    END AS index_status
FROM rls_columns rc
ORDER BY rc.tablename, index_status DESC;

-- =====================================================
-- 4. ESTADÍSTICAS DE TABLAS
-- =====================================================

-- 4.1. Tablas con más actividad (inserts/updates/deletes)
SELECT
    schemaname,
    relname AS table_name,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_tup_ins + n_tup_upd + n_tup_del AS total_changes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_row_pct,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY total_changes DESC
LIMIT 20;

-- 4.2. Uso de índices vs scans secuenciales
SELECT
    schemaname,
    relname AS table_name,
    seq_scan AS sequential_scans,
    seq_tup_read AS rows_read_sequential,
    idx_scan AS index_scans,
    idx_tup_fetch AS rows_fetched_index,
    CASE
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
    END AS index_usage_pct,
    n_live_tup AS live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (seq_scan + idx_scan) > 0
ORDER BY (seq_scan + idx_scan) DESC, index_usage_pct ASC
LIMIT 20;

-- 4.3. Tamaño de tablas y sus índices
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- =====================================================
-- 5. ANÁLISIS DE COLUMNAS CANDIDATAS PARA ÍNDICES
-- =====================================================

-- 5.1. Columnas user_id sin índice (crítico para RLS)
SELECT
    t.table_schema,
    t.table_name,
    c.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes i
            WHERE i.schemaname = t.table_schema
              AND i.tablename = t.table_name
              AND i.indexdef ILIKE '%' || c.column_name || '%'
        ) THEN '✅ Indexada'
        ELSE '❌ FALTA ÍNDICE'
    END AS index_status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.column_name IN ('user_id', 'owner_id', 'locador_id', 'locatario_id', 'created_by')
ORDER BY t.table_name, c.column_name;

-- 5.2. Columnas de claves foráneas sin índice
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes i
            WHERE i.schemaname = tc.table_schema
              AND i.tablename = tc.table_name
              AND i.indexdef ILIKE '%' || kcu.column_name || '%'
        ) THEN '✅ Indexada'
        ELSE '❌ FALTA ÍNDICE'
    END AS index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 6. CONFIGURACIÓN DE REALTIME
-- =====================================================

-- 6.1. Verificar si Realtime está habilitado en tablas
SELECT
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6.2. Verificar publicaciones de Realtime (si existen)
SELECT
    pubname AS publication_name,
    puballtables AS all_tables,
    pubinsert,
    pubupdate,
    pubdelete,
    pubtruncate
FROM pg_publication
WHERE pubname LIKE '%realtime%' OR puballtables = true;

-- 6.3. Tablas incluidas en publicaciones
SELECT
    p.pubname AS publication_name,
    n.nspname AS schema_name,
    c.relname AS table_name
FROM pg_publication p
JOIN pg_publication_rel pr ON p.oid = pr.prpubid
JOIN pg_class c ON pr.prrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.pubname, n.nspname, c.relname;

-- =====================================================
-- 7. RECOMENDACIONES INICIALES
-- =====================================================

-- Este resultado te dará una idea de dónde buscar problemas
SELECT '✅ Diagnóstico completado. Revisa los resultados arriba.' AS status,
       'Busca tablas con alto total_changes y bajo index_usage_pct' AS tip_1,
       'Verifica que columnas user_id, booking_id, car_id tengan índices' AS tip_2,
       'Identifica triggers AFTER con broadcast_changes en tablas de alta escritura' AS tip_3;
