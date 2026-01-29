-- ============================================================================
-- Script: analyze-unused-indexes.sql
-- Analiza índices no usados y genera DROP statements seguros
--
-- Uso: Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Ver índices no usados ordenados por tamaño (más grandes primero)
SELECT
  schemaname || '.' || relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used,
  idx_tup_read AS rows_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_relation_size(indexrelid) AS size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Nunca usado
  AND indexrelname NOT LIKE '%_pkey'  -- No eliminar PKs
  AND indexrelname NOT LIKE '%_fkey'  -- No eliminar FKs
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 50;

-- 2. Generar DROP statements para índices no usados (> 1MB)
SELECT
  'DROP INDEX IF EXISTS public.' || indexrelname || ';  -- ' ||
  pg_size_pretty(pg_relation_size(indexrelid)) || ' saved' AS drop_statement
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_fkey'
  AND pg_relation_size(indexrelid) > 1048576  -- > 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Resumen de ahorro potencial
SELECT
  COUNT(*) AS unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS total_size_saved
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_fkey';

-- 4. Ver índices duplicados (mismo set de columnas)
WITH index_cols AS (
  SELECT
    i.indexrelid,
    i.indrelid,
    i.indkey::text AS columns,
    c.relname AS table_name,
    ic.relname AS index_name,
    pg_get_indexdef(i.indexrelid) AS index_def
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indrelid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
)
SELECT
  a.table_name,
  a.index_name AS index_to_keep,
  b.index_name AS index_to_drop,
  a.columns
FROM index_cols a
JOIN index_cols b ON a.indrelid = b.indrelid
  AND a.columns = b.columns
  AND a.indexrelid < b.indexrelid
ORDER BY a.table_name;

-- ============================================================================
-- IMPORTANTE: Antes de ejecutar DROP, verificar que:
-- 1. El índice no se usa en queries de reportes mensuales
-- 2. No hay procesos batch que lo usen
-- 3. Hacer backup de la lista de índices por si hay que recrear
-- ============================================================================
