-- =====================================================
-- DIAGNÓSTICO REALTIME - QUERIES CORREGIDAS
-- Ejecutar una por una en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. BUSCAR FUNCIONES QUE USAN REALTIME
-- =====================================================

-- 1.1. Funciones con realtime.broadcast_changes o realtime.send (CORREGIDO)
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%' THEN '📡 broadcast_changes'
        WHEN pg_get_functiondef(p.oid) ILIKE '%realtime.send%' THEN '📤 realtime.send'
        ELSE '❓ other'
    END AS realtime_method,
    l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE (pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%'
   OR pg_get_functiondef(p.oid) ILIKE '%realtime.send%'
   OR pg_get_functiondef(p.oid) ILIKE '%pg_notify%')
  AND n.nspname IN ('public', 'auth', 'realtime')
ORDER BY n.nspname, p.proname;

-- =====================================================
-- 2. TRIGGERS ACTIVOS EN TABLAS PÚBLICAS
-- =====================================================

-- 2.1. Listar todos los triggers (incluyendo los de Realtime)
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE
        WHEN t.tgenabled = 'O' THEN '✅ Enabled'
        WHEN t.tgenabled = 'D' THEN '❌ Disabled'
        ELSE 'Other'
    END AS status,
    CASE t.tgtype::int & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- 3. VERIFICAR ÍNDICES EN COLUMNAS RLS CRÍTICAS
-- =====================================================

-- 3.1. Verificar índices en user_id, locador_id, locatario_id
SELECT
    t.table_name,
    c.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = t.table_name
              AND i.indexdef ILIKE '%' || c.column_name || '%'
        ) THEN '✅ Indexada'
        ELSE '❌ FALTA ÍNDICE'
    END AS index_status,
    -- Mostrar el índice si existe
    (SELECT indexname FROM pg_indexes i
     WHERE i.schemaname = 'public'
       AND i.tablename = t.table_name
       AND i.indexdef ILIKE '%' || c.column_name || '%'
     LIMIT 1) AS index_name
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND c.column_name IN ('user_id', 'owner_id', 'locador_id', 'locatario_id', 'created_by')
ORDER BY index_status, t.table_name, c.column_name;

-- =====================================================
-- 4. ANALIZAR TABLA NOTIFICATIONS (alto tráfico Realtime)
-- =====================================================

-- 4.1. Índices en tabla notifications
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'notifications';

-- 4.2. Políticas RLS en notifications
SELECT
    policyname,
    cmd,
    qual::text AS condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notifications';

-- 4.3. Triggers en notifications
SELECT
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgtype::int & 66
        WHEN 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END AS timing
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'notifications'::regclass
  AND NOT t.tgisinternal;

-- =====================================================
-- 5. VERIFICAR PUBLICACIONES REALTIME
-- =====================================================

-- 5.1. Publicaciones activas
SELECT
    pubname AS publication_name,
    puballtables AS all_tables,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication;

-- 5.2. Tablas en publicación supabase_realtime
SELECT
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- =====================================================
-- 6. ANÁLISIS DE TABLAS CRÍTICAS (bookings, cars)
-- =====================================================

-- 6.1. Índices en tabla bookings
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'bookings';

-- 6.2. Índices en tabla cars
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'cars';

-- =====================================================
-- 7. RESUMEN: ÍNDICES FALTANTES MÁS CRÍTICOS
-- =====================================================

-- Esta query identifica las combinaciones tabla+columna más críticas sin índice
WITH critical_columns AS (
    SELECT 'bookings' AS table_name, 'locatario_id' AS column_name, 1 AS priority
    UNION ALL SELECT 'bookings', 'locador_id', 1
    UNION ALL SELECT 'bookings', 'car_id', 2
    UNION ALL SELECT 'cars', 'user_id', 1
    UNION ALL SELECT 'notifications', 'user_id', 1
    UNION ALL SELECT 'wallet_transactions', 'user_id', 1
    UNION ALL SELECT 'reviews', 'booking_id', 2
    UNION ALL SELECT 'car_images', 'car_id', 3
)
SELECT
    cc.table_name,
    cc.column_name,
    cc.priority,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes i
            WHERE i.schemaname = 'public'
              AND i.tablename = cc.table_name
              AND i.indexdef ILIKE '%' || cc.column_name || '%'
        ) THEN '✅ OK'
        ELSE '❌ CREAR ÍNDICE'
    END AS status
FROM critical_columns cc
ORDER BY cc.priority, cc.table_name, cc.column_name;
