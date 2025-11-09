#!/bin/bash
# Script para obtener métricas de Supabase Database
# Uso: ./tools/get-supabase-metrics.sh

set -e

DB_URL="postgresql://postgres.pisqjmoklivzpwufhscx:Ab.12345@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

echo "📊 MÉTRICAS DE SUPABASE DATABASE"
echo "=================================="
echo ""

echo "1️⃣ TAMAÑO DE BASE DE DATOS:"
PGPASSWORD='Ab.12345' psql "$DB_URL" -c "
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as db_size,
  pg_database_size('postgres') as size_bytes;
"

echo ""
echo "2️⃣ CONEXIONES:"
PGPASSWORD='Ab.12345' psql "$DB_URL" -c "
SELECT 
  (SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres') as active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
  ROUND(
    (SELECT count(*)::numeric FROM pg_stat_activity WHERE datname = 'postgres') / 
    (SELECT setting::numeric FROM pg_settings WHERE name = 'max_connections') * 100, 
    2
  ) as connection_usage_percent;
"

echo ""
echo "3️⃣ QUERIES ACTIVAS:"
PGPASSWORD='Ab.12345' psql "$DB_URL" -c "
SELECT 
  count(*) as total_queries,
  count(*) FILTER (WHERE state = 'active') as running,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
FROM pg_stat_activity 
WHERE datname = 'postgres';
"

echo ""
echo "4️⃣ STORAGE POR TABLA (TOP 15):"
PGPASSWORD='Ab.12345' psql "$DB_URL" -c "
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size,
  pg_total_relation_size('public.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 15;
"

echo ""
echo "5️⃣ TOTAL STORAGE:"
PGPASSWORD='Ab.12345' psql "$DB_URL" -c "
SELECT 
  pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_public_schema_size
FROM pg_tables
WHERE schemaname = 'public';
"

echo ""
echo "✅ Métricas obtenidas exitosamente"
echo ""
echo "💡 Para monitoreo continuo, revisa:"
echo "   https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/settings/database"

