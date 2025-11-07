# 💾 Runbook: Database Backup & Restore

## Overview

Procedimientos para backup y restore de la base de datos PostgreSQL en Supabase.

## Conexión a la Base de Datos

```bash
# Método 1: Via Pooler (recomendado para operaciones)
export PGPASSWORD=ECUCONDOR08122023
export DB_URL="postgresql://postgres.pisqjmoklivzpwufhscx:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Método 2: Direct connection (para dumps grandes)
export DB_DIRECT_URL="postgresql://postgres.pisqjmoklivzpwufhscx:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Test connection
psql "$DB_URL" -c "SELECT NOW();"
```

## Backups Manuales

### Full Backup (Schema + Data)

```bash
#!/bin/bash
# backup-full.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_full_${BACKUP_DATE}.sql"

echo "🗄️  Iniciando backup completo..."

pg_dump "$DB_URL" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=plain \
  > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  # Comprimir
  gzip "$BACKUP_FILE"
  echo "✅ Backup completado: ${BACKUP_FILE}.gz"
  
  # Mostrar tamaño
  ls -lh "${BACKUP_FILE}.gz"
else
  echo "❌ Error en backup"
  exit 1
fi
```

### Data-Only Backup

```bash
# Solo datos (sin schema)
pg_dump "$DB_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  > backup_data_only_$(date +%Y%m%d).sql
```

### Schema-Only Backup

```bash
# Solo estructura (sin datos)
pg_dump "$DB_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  > backup_schema_only_$(date +%Y%m%d).sql
```

### Backup de Tablas Específicas

```bash
# Una tabla
pg_dump "$DB_URL" \
  --table=bookings \
  > backup_bookings_$(date +%Y%m%d).sql

# Múltiples tablas
pg_dump "$DB_URL" \
  --table=bookings \
  --table=cars \
  --table=users \
  > backup_critical_tables_$(date +%Y%m%d).sql
```

## Restore desde Backup

### Restore Completo

```bash
#!/bin/bash
# restore-full.sh

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos"
read -p "¿Continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelado"
  exit 0
fi

# Si está comprimido, descomprimir primero
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Descomprimiendo..."
  gunzip -k "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

echo "🔄 Restaurando desde $BACKUP_FILE..."

psql "$DB_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Restore completado"
else
  echo "❌ Error en restore"
  exit 1
fi
```

### Restore con Drop/Recreate

```bash
# Para restore limpio (⚠️ DESTRUCTIVO)
psql "$DB_URL" <<EOF
-- Desconectar otras sesiones
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres' AND pid <> pg_backend_pid();

-- Drop y recrear (solo si tienes permisos)
-- Preferir usar Supabase Dashboard para esto
EOF

# Luego restore
psql "$DB_URL" < backup_file.sql
```

## Backups Automáticos de Supabase

### Via Dashboard

1. Ir a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/settings/database
2. Sección "Backups"
3. Ver backups diarios automáticos
4. Descargar backup específico

### Point-in-Time Recovery (PITR)

```bash
# Supabase Pro incluye PITR de últimas 7 días
# Via Dashboard: Settings → Database → Point in Time Recovery

# Ejemplo: Restaurar a 2 horas atrás
# 1. Dashboard → PITR
# 2. Seleccionar timestamp
# 3. Confirmar restore
```

## Backup de Producción a Local

```bash
#!/bin/bash
# download-prod-backup.sh

# Descargar último backup de Supabase
supabase db dump \
  --project-ref pisqjmoklivzpwufhscx \
  --output backup_from_supabase.sql

# O via Dashboard → Download
```

## Restore a Ambiente Local

```bash
# 1. Resetear base local
supabase db reset

# 2. Aplicar backup
psql postgresql://postgres:postgres@localhost:54322/postgres \
  < backup_from_production.sql

# 3. Verificar
supabase db diff
```

## Snapshot Antes de Migraciones

```bash
#!/bin/bash
# pre-migration-snapshot.sh

MIGRATION_NAME="$1"
SNAPSHOT_FILE="snapshot_before_${MIGRATION_NAME}_$(date +%Y%m%d_%H%M%S).sql"

echo "📸 Creando snapshot pre-migración..."

pg_dump "$DB_URL" \
  --no-owner \
  --no-acl \
  > "$SNAPSHOT_FILE"

echo "✅ Snapshot guardado: $SNAPSHOT_FILE"
echo "Para revertir: psql \$DB_URL < $SNAPSHOT_FILE"
```

## Frecuencia Recomendada

### Automáticos (ya configurados por Supabase)
- **Diarios**: Backup completo automático (retained 7 días en plan Pro)
- **PITR**: Continuous backup con recovery point cada 2 minutos

### Manuales
- **Antes de migraciones**: SIEMPRE
- **Antes de cambios de schema**: SIEMPRE  
- **Semanales**: Descargar backup local como precaución
- **Mensuales**: Archive long-term en S3/Cloud Storage

## Almacenamiento de Backups

```bash
# Estructura recomendada
backups/
├── daily/
│   ├── backup_20251028.sql.gz
│   └── backup_20251027.sql.gz
├── pre-migration/
│   ├── snapshot_before_add_wallet_20251015.sql
│   └── snapshot_before_risk_scoring_20251020.sql
└── monthly/
    ├── backup_202510.sql.gz
    └── backup_202509.sql.gz

# Limpieza automática (retener solo últimos 30 días locales)
find backups/daily/ -name "*.sql.gz" -mtime +30 -delete
```

## Verificación de Integridad

```bash
# Verificar que backup no está corrupto
gunzip -t backup_file.sql.gz

# Test restore en dry-run (sin aplicar)
pg_restore --list backup_file.sql | head -20

# Verificar checksum
md5sum backup_file.sql.gz > backup_file.md5
md5sum -c backup_file.md5
```

## Disaster Recovery

### Escenario 1: Corrupción de Datos

```bash
# 1. Identificar timestamp de última data buena
# 2. Usar PITR via Dashboard
# 3. O restore desde backup manual más cercano
```

### Escenario 2: Migración Fallida

```bash
# 1. Cargar snapshot pre-migración
psql "$DB_URL" < snapshot_before_migration.sql

# 2. Verificar estado
psql "$DB_URL" -c "\d bookings"

# 3. Re-intentar migración con fix
```

### Escenario 3: Pérdida de Proyecto Supabase

```bash
# 1. Crear nuevo proyecto Supabase
# 2. Obtener nueva DB_URL
# 3. Restore desde último backup local
psql "$NEW_DB_URL" < latest_backup.sql

# 4. Reconfigurar secrets
# 5. Actualizar env vars en todos los servicios
```

## Monitoreo

```sql
-- Tamaño de la base de datos
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as db_size;

-- Tablas más grandes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Último backup automático (via Supabase)
-- Ver en Dashboard → Settings → Database → Backups
```

## Checklist Pre-Restore

- [ ] Confirmar que tienes backup reciente (< 24hrs)
- [ ] Notificar a usuarios de downtime planificado
- [ ] Desconectar aplicaciones de la DB
- [ ] Verificar integridad del archivo de backup
- [ ] Tener plan de rollback
- [ ] Documentar razón del restore

## Troubleshooting

### Error: Connection pool exhausted

```bash
# Usar direct connection en lugar de pooler
export DB_URL="postgresql://...pooler.supabase.com:5432/..."
```

### Error: Permission denied

```bash
# Remover --no-owner flag
pg_dump "$DB_URL" > backup.sql
```

### Error: Out of memory durante restore

```bash
# Restore en transacciones más pequeñas
pg_restore --format=custom --single-transaction backup.dump
```

## Referencias

- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
