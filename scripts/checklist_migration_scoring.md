# Checklist: Migración de Scoring con location_geom

## 📋 Pre-requisitos

- [ ] Acceso a base de datos de producción (DATABASE_URL)
- [ ] Credenciales seguras (PGPASSWORD o .pgpass configurado)
- [ ] `psql` instalado y en PATH
- [ ] Backup reciente de la base de datos (el script lo hace automáticamente)
- [ ] Ventana de mantenimiento programada (recomendado: baja carga)

## 🧪 Testing en Staging (OBLIGATORIO antes de producción)

### 1. Aplicar en Staging
```bash
# Configurar conexión a staging
export DATABASE_URL="postgresql://postgres@staging-host:5432/postgres"
export PGPASSWORD="staging-password"

# Ejecutar migraciones
./scripts/apply_migrations_prod.sh
```

### 2. Validar en Staging
```bash
# Ejecutar validación
./scripts/validate_migration_scoring.sh

# Tests automatizados
npm run test:quick
npm run test:e2e  # Al menos el flujo de booking
```

### 3. Verificar Performance en Staging
```sql
-- Ejecutar EXPLAIN ANALYZE con datos realistas
EXPLAIN ANALYZE
SELECT * FROM get_available_cars(
  '2025-12-01T00:00:00Z'::timestamptz,
  '2025-12-05T00:00:00Z'::timestamptz,
  -34.6037,  -- Buenos Aires
  -58.3816,
  50,
  0
);
```

**Verificar que:**
- [ ] El plan usa `Index Scan` en `idx_cars_location_geom_gist`
- [ ] Tiempo de ejecución < 500ms para 50 resultados
- [ ] No hay `Seq Scan` en la tabla `cars`

## 🚀 Ejecución en Producción

### Paso 1: Backup (automático en el script)
```bash
# El script crea backup automáticamente en logs/db-backups/
# Verificar que se creó:
ls -lh logs/db-backups/backup_public_schema_*.sql
```

### Paso 2: Aplicar Migraciones
```bash
# Configurar conexión (NUNCA incluir password en DATABASE_URL)
export DATABASE_URL="postgresql://postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
export PGPASSWORD="tu-password-seguro"

# Ejecutar script
./scripts/apply_migrations_prod.sh
```

**Durante la ejecución:**
- [ ] El script pregunta por creación de índice CONCURRENTLY → responder `y`
- [ ] Verificar que no hay errores en cada paso
- [ ] Guardar el archivo de backup generado

### Paso 3: Validación Post-Migración
```bash
# Ejecutar validación
./scripts/validate_migration_scoring.sh
```

**Verificar:**
- [ ] ✅ Todas las validaciones pasan
- [ ] ✅ Índice GiST existe y está activo
- [ ] ✅ Función retorna score correctamente

### Paso 4: Tests Manuales en UI

**En el frontend (http://localhost:4200 o producción):**

- [ ] Marketplace muestra autos ordenados por score
- [ ] Score se muestra en cards de autos (si está implementado)
- [ ] Búsqueda con fechas funciona correctamente
- [ ] Búsqueda con ubicación del usuario mejora el ordenamiento
- [ ] No hay errores en consola del navegador

### Paso 5: Monitoreo Post-Deploy

**Primeras 24 horas:**

- [ ] Monitorear logs de errores en Supabase Dashboard
- [ ] Verificar latencias de consultas (Supabase → Database → Query Performance)
- [ ] Revisar métricas de CPU/Memoria de la base de datos
- [ ] Verificar que no hay timeouts en llamadas a `get_available_cars`

**Queries de monitoreo:**
```sql
-- Verificar uso del índice
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'idx_cars_location_geom_gist';

-- Verificar performance de la función
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%get_available_cars%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 🔄 Rollback Plan (si algo falla)

### Opción 1: Restaurar desde backup
```bash
# Restaurar schema completo desde backup
psql "$DATABASE_URL" -f logs/db-backups/backup_public_schema_YYYYMMDDTHHMMSSZ.sql
```

### Opción 2: Revertir migraciones manualmente
```sql
-- Eliminar índice
DROP INDEX CONCURRENTLY IF EXISTS idx_cars_location_geom_gist;

-- Eliminar columna (si es necesario)
ALTER TABLE public.cars DROP COLUMN IF EXISTS location_geom;

-- Restaurar función anterior (si tienes backup)
-- Pegar definición anterior de get_available_cars
```

## ✅ Criterios de Éxito

- [ ] Todas las validaciones pasan
- [ ] Performance de consultas mejoró o se mantiene (< 500ms)
- [ ] UI muestra scores correctamente
- [ ] No hay errores en logs
- [ ] Índice GiST está siendo usado (verificar con EXPLAIN ANALYZE)

## 📞 Contacto de Emergencia

Si algo falla críticamente:
1. **NO PANIC** - El backup está disponible
2. Ejecutar rollback plan
3. Revisar logs en Supabase Dashboard
4. Documentar el problema para análisis posterior






