# Runbook: Problemas de Base de Datos

## Descripción
Guía para responder a incidentes relacionados con la base de datos PostgreSQL en Supabase.

## Síntomas

- Timeouts en queries
- Errores de conexión (`ECONNREFUSED`, `connection pool exhausted`)
- Latencia alta en operaciones CRUD
- Alertas de Supabase sobre uso de recursos
- Errores `deadlock detected`, `serialization failure`

## Severidad

| Impacto | Severidad |
|---------|-----------|
| DB completamente inaccesible | P0 |
| Queries críticos timeout | P0 |
| Latencia >5s en operaciones | P1 |
| Queries específicos lentos | P2 |

## Diagnóstico Rápido

### 1. Estado General

```sql
-- Conexiones activas
SELECT
  state,
  count(*),
  max(now() - state_change) as max_duration
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Queries lentos en ejecución
SELECT
  pid,
  now() - query_start as duration,
  state,
  left(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < now() - interval '10 seconds'
ORDER BY query_start;
```

### 2. Bloqueos

```sql
-- Detectar bloqueos
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
  AND blocked_locks.database = blocking_locks.database
  AND blocked_locks.relation = blocking_locks.relation
  AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### 3. Uso de Recursos

```sql
-- Tamaño de tablas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 10;

-- Índices no utilizados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND pg_relation_size(indexrelid) > 1000000
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Acciones de Mitigación

### Escenario A: Pool de Conexiones Agotado

**Síntoma**: `connection pool exhausted`

**Acción inmediata**:
```sql
-- Terminar conexiones idle antiguas
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '5 minutes'
AND datname = current_database()
AND pid != pg_backend_pid();
```

**Verificar**: Que el pool se recupera en Supabase Dashboard → Database → Connections

### Escenario B: Query Lento Bloqueando

**Síntoma**: Un query específico tarda mucho y bloquea otros

**Acción inmediata**:
```sql
-- Identificar el query
SELECT pid, query, state, now() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start
LIMIT 5;

-- Terminar query específico (CUIDADO)
SELECT pg_terminate_backend(PID_DEL_QUERY);
```

### Escenario C: Deadlock

**Síntoma**: `deadlock detected`

**Acción**:
1. PostgreSQL resuelve deadlocks automáticamente terminando una transacción
2. Verificar en logs cuál query fue cancelado
3. Revisar lógica de la aplicación para evitar deadlocks futuros

**Diagnóstico post-deadlock**:
```sql
-- Ver locks actuales
SELECT
  l.locktype,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation IS NOT NULL
ORDER BY l.relation;
```

### Escenario D: Tabla Muy Grande

**Síntoma**: Queries en tabla específica muy lentos

**Acciones**:

1. **Verificar si hay índice**:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'NOMBRE_TABLA';
   ```

2. **Crear índice si falta**:
   ```sql
   -- Crear índice concurrentemente (no bloquea)
   CREATE INDEX CONCURRENTLY idx_table_column
   ON table_name (column_name);
   ```

3. **Vacuum si hay bloat**:
   ```sql
   VACUUM ANALYZE table_name;
   ```

### Escenario E: Supabase Down

**Verificar**:
1. Status: https://status.supabase.com/
2. Dashboard: https://app.supabase.com/

**Acción**:
- No hay mucho que hacer más que esperar
- Activar página de mantenimiento en la app
- Comunicar a usuarios

## Queries de Monitoreo Útiles

```sql
-- Cache hit ratio (debe ser >99%)
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;

-- Queries más frecuentes
SELECT
  left(query, 80) as query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Transacciones por segundo
SELECT
  xact_commit + xact_rollback as total_transactions,
  xact_commit as commits,
  xact_rollback as rollbacks
FROM pg_stat_database
WHERE datname = current_database();
```

## Prevención

1. **Monitoreo regular** de conexiones y query performance
2. **VACUUM automático** configurado (Supabase lo hace)
3. **Índices** en columnas usadas en WHERE/JOIN
4. **Connection pooling** con PgBouncer (incluido en Supabase)
5. **Query optimization** regular

## Checklist de Resolución

- [ ] Incidente detectado
- [ ] Diagnóstico inicial (conexiones, bloqueos, queries)
- [ ] Causa raíz identificada
- [ ] Mitigación aplicada
- [ ] Base de datos estabilizada
- [ ] Monitoreo verificado normal
- [ ] Post-mortem para P0/P1

## Recursos

- [Supabase Dashboard](https://app.supabase.com/)
- [Supabase Status](https://status.supabase.com/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
