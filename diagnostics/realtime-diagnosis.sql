-- =====================================================
-- DIAGNÓSTICO DE REALTIME - AutoRenta
-- Fecha: 2025-11-13
-- =====================================================

-- 1. LISTAR TRIGGERS Y FUNCIONES QUE USAN REALTIME.BROADCAST_CHANGES / REALTIME.SEND
-- =====================================================

-- 1.1. Funciones que usan realtime.broadcast_changes
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%'
   OR pg_get_functiondef(p.oid) ILIKE '%realtime.send%'
ORDER BY n.nspname, p.proname;

-- 1.2. Triggers asociados a funciones de realtime
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE t.tgtype::int & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END AS trigger_level,
    CASE t.tgtype::int & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_timing,
    CASE
        WHEN t.tgtype::int & 4 != 0 THEN 'INSERT'
        WHEN t.tgtype::int & 8 != 0 THEN 'DELETE'
        WHEN t.tgtype::int & 16 != 0 THEN 'UPDATE'
        ELSE 'TRUNCATE'
    END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND (pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%'
       OR pg_get_functiondef(p.oid) ILIKE '%realtime.send%')
ORDER BY n.nspname, c.relname, t.tgname;

-- =====================================================
-- 2. CONSULTAR PG_STAT_ACTIVITY (Sesiones Activas)
-- =====================================================

SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    wait_event_type,
    wait_event,
    EXTRACT(EPOCH FROM (NOW() - query_start)) AS query_duration_seconds,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY query_start;

-- =====================================================
-- 3. CONSULTAR PG_LOCKS (Bloqueos Activos)
-- =====================================================

SELECT
    l.locktype,
    l.database,
    l.relation::regclass AS relation,
    l.page,
    l.tuple,
    l.virtualxid,
    l.transactionid,
    l.mode,
    l.granted,
    a.usename,
    a.query_start,
    a.state,
    LEFT(a.query, 100) AS query_preview
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY l.relation, l.mode;

-- =====================================================
-- 4. ANÁLISIS DE PAYLOADS DE REALTIME (Tamaño de Mensajes)
-- =====================================================

-- 4.1. Verificar si hay tabla de mensajes de realtime
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'realtime'
      AND table_name = 'messages'
) AS realtime_messages_exists;

-- 4.2. Si existe, analizar tamaño de payloads recientes
-- (Comentado por si no existe la tabla)
/*
SELECT
    topic,
    event,
    pg_column_size(payload) AS payload_size_bytes,
    inserted_at
FROM realtime.messages
WHERE inserted_at > NOW() - INTERVAL '1 hour'
ORDER BY payload_size_bytes DESC
LIMIT 20;
*/

-- =====================================================
-- 5. VERIFICAR ÍNDICES EN COLUMNAS USADAS POR RLS
-- =====================================================

-- 5.1. Listar políticas RLS activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5.2. Verificar índices existentes en tablas públicas
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 6. ESTADÍSTICAS DE TABLAS (Actividad Reciente)
-- =====================================================

SELECT
    schemaname,
    relname AS table_name,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
LIMIT 20;

-- =====================================================
-- 7. IDENTIFICAR TABLAS CON ALTO VOLUMEN DE CAMBIOS
-- =====================================================

SELECT
    schemaname,
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins + n_tup_upd + n_tup_del AS total_modifications,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS index_usage_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY total_modifications DESC
LIMIT 20;
