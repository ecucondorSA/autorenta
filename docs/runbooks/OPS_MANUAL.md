# AutoRenta Operations Manual


---
# Source: apply-security-migrations.md

# Runbook: Aplicar Migraciones de Seguridad P0/P1

**Fecha**: 2025-11-18  
**Severity**: P0 CRÍTICO  
**Tiempo estimado**: 30-45 minutos  
**Requiere**: Acceso admin a Supabase

---

## 📋 Pre-requisitos

- [ ] Backup de base de datos completo
- [ ] Acceso a Supabase Dashboard (project: obxvffplochgeiclibng)
- [ ] Supabase CLI instalado y autenticado
- [ ] Branch `tech-debt-remediation` merged o en staging

---

## 🚨 Migraciones a Aplicar

### 1. `20251118_enable_rls_wallets_p0_critical.sql`
**CVSS**: 9.1/10 (CRÍTICO)  
**Fix**: Habilita Row Level Security en wallets  
**Impacto**: Sin esto, cualquier usuario puede leer balances de otros

### 2. `20251118_wallet_constraints_and_admin_validation_p0.sql`
**CVSS**: 7.65/10 (P0/P1)  
**Fix**: Constraints + validación de rol admin  
**Impacto**: Previene balances negativos y bypass de permisos

### 3. `20251118_test_wallet_security_fixes.sql`
**Tipo**: Tests automatizados  
**Validación**: 10 tests de seguridad

---

## 📝 Procedimiento

### Paso 1: Verificar Estado Actual

```bash
# Conectar a Supabase
supabase login

# Link al proyecto
supabase link --project-ref obxvffplochgeiclibng

# Ver migraciones pendientes
supabase db diff
```

**Output esperado**: Debe mostrar las 3 migraciones nuevas

---

### Paso 2: Backup de Base de Datos

```bash
# Backup automático (Supabase Dashboard)
# Settings → Database → Backups → Create backup

# O manual via pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.obxvffplochgeiclibng.supabase.co:5432/postgres" \
  > backup_before_security_fixes_$(date +%Y%m%d_%H%M%S).sql
```

**Verificar**: Archivo .sql creado con tamaño > 0

---

### Paso 3: Aplicar en Staging (Opcional)

Si tienes ambiente staging:

```bash
# Aplicar migraciones
supabase db push --project-ref [staging-project-ref]

# Ejecutar tests
psql "postgresql://postgres:[PASSWORD]@[staging-url]:5432/postgres" \
  < supabase/migrations/20251118_test_wallet_security_fixes.sql
```

**Resultado esperado**:
```
✅ TEST 1 PASS: RLS habilitado en user_wallets
✅ TEST 2 PASS: RLS habilitado en wallet_transactions
...
✅ TODOS LOS TESTS PASARON
```

---

### Paso 4: Aplicar en Producción

⚠️ **IMPORTANTE**: Ejecutar durante horario de bajo tráfico

```bash
# 1. Aplicar migraciones
supabase db push --project-ref obxvffplochgeiclibng

# 2. Ejecutar tests de validación
psql "postgresql://postgres:[PASSWORD]@db.obxvffplochgeiclibng.supabase.co:5432/postgres" \
  < supabase/migrations/20251118_test_wallet_security_fixes.sql
```

**Tiempo estimado**: 2-3 minutos

---

### Paso 5: Validación Post-Aplicación

#### 5.1. Verificar RLS Habilitado

```sql
-- En SQL Editor de Supabase Dashboard
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_wallets', 'wallet_transactions');
```

**Output esperado**:
```
tablename              | rowsecurity
-----------------------+------------
user_wallets           | t
wallet_transactions    | t
```

#### 5.2. Verificar Policies Creadas

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_wallets', 'wallet_transactions')
ORDER BY tablename, policyname;
```

**Output esperado**: 6 policies listadas

#### 5.3. Verificar Constraints

```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conname LIKE '%wallet%'
  AND conname LIKE 'check%'
ORDER BY conname;
```

**Output esperado**: 4 constraints

---

### Paso 6: Tests Funcionales

#### 6.1. Test RLS - Usuario NO puede ver wallet de otro

```sql
-- Simular usuario A intentando ver wallet de usuario B
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
SELECT * FROM user_wallets WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows
```

#### 6.2. Test Constraint - Balance negativo rechazado

```sql
-- Intentar balance negativo (debe fallar)
UPDATE user_wallets SET available_balance = -100 WHERE user_id = 'test-uuid';
-- Expected: ERROR: new row for relation "user_wallets" violates check constraint
```

#### 6.3. Test Admin Validation

Intentar confirmar depósito como usuario no-admin:

```sql
-- Como usuario regular (NO admin)
SELECT * FROM wallet_confirm_deposit_admin(
  'user-uuid',
  'transaction-uuid',
  'provider-tx-id',
  '{}'::jsonb
);
-- Expected: success=false, message='Solo administradores pueden confirmar depósitos'
```

---

## 🚨 Rollback (Si algo sale mal)

### Opción 1: Rollback Automático (Supabase Dashboard)

1. Settings → Database → Backups
2. Seleccionar backup anterior
3. Restore

### Opción 2: Rollback Manual

```sql
-- 1. Deshabilitar RLS
ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;

-- 2. Drop policies
DROP POLICY IF EXISTS user_wallets_select_own ON user_wallets;
DROP POLICY IF EXISTS user_wallets_update_own ON user_wallets;
DROP POLICY IF EXISTS user_wallets_insert_via_rpc ON user_wallets;
DROP POLICY IF EXISTS wallet_transactions_select_own ON wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_insert_via_rpc ON wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_update_via_rpc ON wallet_transactions;

-- 3. Drop constraints
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_available_balance_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_locked_balance_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_non_negative;
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_within_available;

-- 4. Restaurar función original (si tienes backup)
-- (Ejecutar versión anterior de wallet_confirm_deposit_admin)
```

---

## 📊 Monitoreo Post-Aplicación

### Métricas a vigilar (primeras 24 horas):

1. **Errores de RLS**:
```sql
-- Logs de errores de policies
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND payload->>'error' LIKE '%policy%'
ORDER BY created_at DESC;
```

2. **Errores de Constraints**:
```bash
# En Supabase Dashboard → Logs
# Filtrar por: "violates check constraint"
```

3. **Latencia de Queries**:
```sql
-- Queries lentas después de RLS
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%user_wallets%' OR query LIKE '%wallet_transactions%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ✅ Checklist Final

- [ ] Backup creado y verificado
- [ ] Migraciones aplicadas sin errores
- [ ] Tests SQL pasaron (10/10)
- [ ] RLS habilitado en ambas tablas
- [ ] 6 policies creadas
- [ ] 4 constraints creados
- [ ] Test funcional RLS pasó
- [ ] Test funcional constraint pasó
- [ ] Test admin validation pasó
- [ ] Monitoreo configurado (primeras 24h)
- [ ] Equipo notificado de cambios

---

## 📞 Contactos de Escalación

**Si algo falla**:
1. Ejecutar rollback inmediatamente
2. Notificar en Slack #tech-alerts
3. Crear incident en GitHub Issues
4. Contactar DevOps lead

---

## 📚 Referencias

- [Auditoría de Seguridad](../SECURITY_AUDIT_WALLET_BOOKINGS.md)
- [Migraciones SQL](../../supabase/migrations/)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

**Última actualización**: 2025-11-18  
**Autor**: Claude Code (Tech Debt Remediation)


---
# Source: database-backup-restore.md

# 💾 Runbook: Database Backup & Restore

## Overview

Procedimientos para backup y restore de la base de datos PostgreSQL en Supabase.

## Conexión a la Base de Datos

```bash
# Método 1: Via Pooler (recomendado para operaciones)
export PGPASSWORD=ECUCONDOR08122023
export DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Método 2: Direct connection (para dumps grandes)
export DB_DIRECT_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

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

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/database
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
  --project-ref obxvffplochgeiclibng \
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


---
# Source: external-monitoring-quickstart.md

# External Uptime Monitoring - Quick Start Guide

**Issue**: [#121 External Uptime Monitoring](https://github.com/ecucondorSA/autorenta/issues/121)
**Priority**: P0 (Production Blocker)
**Time**: ~2 hours for complete setup

---

## 🚀 Quick Setup (30 Minutes)

### Step 1: Create UptimeRobot Account (5 min)

```bash
# 1. Go to: https://uptimerobot.com
# 2. Sign up with: devops@autorenta.com
# 3. Upgrade to Pro: $7/month (required for 1-min intervals)
```

### Step 2: Create 6 Monitors (15 min)

Copy/paste these configurations directly:

#### Monitor 1: Main Website ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Main Website
URL: https://autorenta.pages.dev
Interval: 1 minute
Status: 200
Regions: US East, Brazil, Germany
Alert: 2 consecutive failures
```

#### Monitor 2: Health Check API ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Health Check API
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Method: POST
Body: {}
Interval: 1 minute
Status: 200
Keyword: "total_checks"
Regions: US East, Brazil, Germany
Alert: 2 consecutive failures
```

#### Monitor 3: Payment Webhook ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Payment Webhook
URL: https://[YOUR-WORKER].workers.dev/webhooks/payments
  ⚠️ Get actual URL: wrangler deployments list --name payments_webhook
Method: GET
Interval: 5 minutes
Status: 200
Keyword: "status":"ok"
Regions: US East, Brazil
Alert: 2 consecutive failures
```

#### Monitor 4: Database Health

```
Type: HTTP(s)
Name: AutoRenta - Database Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary
Headers: Authorization: Bearer [SERVICE_ROLE_KEY]
Interval: 5 minutes
Status: 200
Keyword: "healthy"
Regions: US East
Alert: 2 consecutive failures
```

#### Monitor 5: Auth Login

```
Type: HTTP(s)
Name: AutoRenta - Auth Login Page
URL: https://autorenta.pages.dev/auth/login
Interval: 5 minutes
Status: 200
Keyword: "login"
Regions: US East, Brazil
Alert: 2 consecutive failures
```

#### Monitor 6: Car Listings

```
Type: HTTP(s)
Name: AutoRenta - Car Listings
URL: https://autorenta.pages.dev/cars
Interval: 5 minutes
Status: 200
Regions: US East, Brazil
Alert: 2 consecutive failures
```

### Step 3: Configure Alerts (10 min)

**My Settings → Alert Contacts → Add:**

```
1. Email: devops@autorenta.com
   - Alerts: Down, Up, SSL Expiry

2. Slack: #production-alerts
   - Connect via Slack integration
   - Alerts: Down, Up, SSL Expiry

3. PagerDuty: [Integration Key from Issue #119]
   - Email format: <key>@autorenta.pagerduty.com
   - Alerts: Down only
   - Apply to: Main Website, Health Check, Payment Webhook

4. SMS: +54 9 11 XXXX-XXXX (on-call engineer)
   - Alerts: Down only
   - Apply to: Main Website ONLY
```

---

## ✅ Validation Checklist (5 min)

After setup, verify:

- [ ] All 6 monitors showing "Up" status
- [ ] Multi-region checks running (check monitor details)
- [ ] Alert contacts configured (4 total)
- [ ] Test alert sent successfully
- [ ] Response times < 2 seconds
- [ ] SSL monitoring enabled (30-day warning)

**Test Alert:**
```bash
# Option 1: Send test notification in UptimeRobot
My Settings → Alert Contacts → [Select contact] → Send Test

# Option 2: Temporarily pause a non-critical monitor
Dashboard → AutoRenta - Car Listings → Pause (10 min)
# Verify alerts received, then resume
```

---

## 📊 Success Metrics (Track Weekly)

```
Target: 99.9% uptime (max 43 min downtime/month)
Detection: < 2 minutes
False Positives: < 1%
Alert Delivery: < 30 seconds
Multi-Region: 3 regions active
```

**Check metrics:**
```
Dashboard → Reports → Export CSV (monthly)
Dashboard → View each monitor → Uptime percentage
```

---

## 🔥 When Alert Received

### Immediate Actions (< 5 min)

1. **Acknowledge in PagerDuty** (stops escalation)
2. **Check UptimeRobot dashboard**: Which region(s)? What error?
3. **Verify with manual check**:
   ```bash
   curl -I https://autorenta.pages.dev
   ```

4. **Check internal monitoring**:
   ```bash
   curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
   ```

5. **Respond in Slack**: "Investigating [service] alert"

### Decision Tree

```
Is service actually down?
├─ YES → Escalate to incident response
│   ├─ Check recent deployments (git log -10)
│   ├─ Check vendor status (Cloudflare, Supabase)
│   ├─ Consider rollback if recent deploy
│   └─ Update team in Slack
│
└─ NO → False positive
    ├─ Regional issue? → Check if isolated
    ├─ Deployment? → Check maintenance windows
    └─ Adjust monitor if needed
```

---

## 📚 Full Documentation

For detailed information, see:

- **Complete Runbook**: [docs/runbooks/external-uptime-monitoring.md](./external-uptime-monitoring.md)
  - Detailed setup instructions
  - Advanced configuration
  - Troubleshooting guide
  - API automation
  - Incident response workflows

- **Configuration Template**: [docs/runbooks/uptimerobot-config-template.json](./uptimerobot-config-template.json)
  - JSON reference for all monitors
  - Alert contact configurations
  - Success metrics definitions

- **Main Monitoring Docs**: [docs/MONITORING_SYSTEM.md](../MONITORING_SYSTEM.md)
  - Internal monitoring system
  - Integration with external monitoring
  - Combined alert flow

---

## 🔧 Common Issues

### "Payment Webhook URL not working"

```bash
# Get current worker URL
wrangler deployments list --name payments_webhook

# Should return something like:
# https://payments-webhook.autorenta.workers.dev

# Update monitor URL to:
# https://[WORKER-URL]/webhooks/payments
```

### "Database Health monitor failing"

```bash
# Verify SERVICE_ROLE_KEY is correct
# In UptimeRobot: Edit Monitor → Headers → Authorization
# Format: Bearer <your-service-role-key>

# Test manually:
curl "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### "Too many false positives"

```bash
# Increase alert threshold:
# Edit Monitor → Alert Settings → Alert when down for: 3 failures (instead of 2)

# Or increase timeout:
# Edit Monitor → Monitor Timeout: 60 seconds (instead of 30)
```

### "Alerts not being received"

```bash
# Check email spam folder
# Verify Slack integration: My Settings → Alert Contacts → Test
# Verify PagerDuty key: Issue #119 documentation
# Check UptimeRobot status: https://stats.uptimerobot.com
```

---

## 🎯 Next Steps (After Setup)

1. **Schedule weekly review**: Every Monday, check uptime reports
2. **Set up automation**: Add UptimeRobot API to CI/CD (see full runbook)
3. **Create status page**: Public status page for users (optional)
4. **Monthly report**: Export CSV for SLA compliance tracking
5. **Tune thresholds**: Adjust based on first month of data

---

## 💡 Pro Tips

- **SMS alerts**: Use ONLY for critical services (limited credits)
- **Maintenance windows**: Create before deployments to avoid false alerts
- **Regional checks**: If one region fails but others pass → regional issue (DNS/CDN)
- **Response times**: If consistently > 2s → investigate performance (not just uptime)
- **Keywords**: Use specific text like brand name, not generic words
- **API automation**: Pause monitors during deployments via API

---

## 📞 Support

**UptimeRobot Support:**
- Email: support@uptimerobot.com
- Docs: https://uptimerobot.com/faq

**Internal Team:**
- Slack: #production-alerts
- PagerDuty: Check on-call schedule
- Documentation: This repo → docs/runbooks/

**Related Issues:**
- [#119: PagerDuty Setup](https://github.com/ecucondorSA/autorenta/issues/119)
- [#121: External Monitoring](https://github.com/ecucondorSA/autorenta/issues/121) ← Current
- [#114: Production Readiness](https://github.com/ecucondorSA/autorenta/issues/114)

---

**Last Updated**: 2025-11-07
**Estimated Setup Time**: 30 minutes (basic) | 2 hours (complete with testing)


---
# Source: external-uptime-monitoring.md

# Runbook: External Uptime Monitoring Setup

**Priority**: P0 (Production Blocker)
**Owner**: DevOps/Platform Team
**Last Updated**: 2025-11-07
**Status**: Implementation Guide

---

## 🎯 Overview

This runbook provides step-by-step instructions for setting up external uptime monitoring for AutoRenta using UptimeRobot (or alternative services). External monitoring is **critical** because it provides independent verification of service availability and can detect issues that internal monitoring cannot:

- **Independent validation**: Works even if Supabase/internal systems are down
- **Multi-region checks**: Detects regional outages and routing issues
- **DNS monitoring**: Catches DNS resolution failures
- **User-perspective monitoring**: Tests from actual user locations
- **SLA tracking**: Provides compliance-grade uptime metrics

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Admin access to production systems
- [ ] PagerDuty account (for critical alerts) - See [Issue #119](https://github.com/ecucondorSA/autorenta/issues/119)
- [ ] Slack workspace admin (for notifications)
- [ ] Email addresses for alert recipients
- [ ] SMS notification phone numbers (for critical alerts)
- [ ] Internal monitoring system deployed (see `MONITORING_SYSTEM.md`)

---

## 🔧 Service Selection

### Recommended: UptimeRobot Pro

**Why UptimeRobot?**
- ✅ Reliable and widely used (500M+ checks/day)
- ✅ Multi-region monitoring included
- ✅ PagerDuty integration
- ✅ Affordable ($7/month for Pro features)
- ✅ 1-minute check intervals
- ✅ SMS alerts included
- ✅ API for automation

**Pricing:**
- **Free Tier**: 50 monitors, 5-minute intervals, 2 alert channels
- **Pro Plan**: $7/month, 50 monitors, 1-minute intervals, unlimited alerts
- **Recommendation**: Start with Pro for production

**Alternatives:**
- **Pingdom**: $10/month, more features, better analytics
- **Hetrix Tools**: $4.50/month, budget option
- **Better Uptime**: $18/month, beautiful status pages
- **StatusCake**: Free tier available, 5-minute checks

---

## 🚀 Implementation Steps

### Step 1: Sign Up for UptimeRobot

1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Click **"Sign Up Free"**
3. Use company email: `devops@autorenta.com` or team email
4. Verify email address
5. **Upgrade to Pro Plan** ($7/month):
   - Click "Upgrade" in dashboard
   - Select "Monthly" billing
   - Enable 1-minute interval checks

### Step 2: Create Monitor Group

Organize monitors into a logical group:

1. Go to **Dashboard** → **My Settings** → **Monitor Groups**
2. Click **"Add Monitor Group"**
3. Name: `AutoRenta Production`
4. Save

### Step 3: Create Monitors

Create the following monitors (in order of priority):

#### Monitor 1: Main Website (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Main Website
URL: https://autorenta.pages.dev
Monitoring Interval: 1 minute
Monitor Timeout: 30 seconds

Expected Status Code: 200
Keyword to Check: (Optional) "AutoRenta" or specific text from homepage
HTTP Method: GET (HEAD for faster checks)

Locations:
  ✓ North America - US East (Virginia)
  ✓ South America - Brazil (São Paulo)
  ✓ Europe - Germany (Frankfurt)

Alert When Down For: 2 minutes (2 consecutive failures)
```

**Why this configuration?**
- 1-minute checks ensure 2-minute detection (meets requirement)
- Multi-region catches regional outages
- 2 failures prevents false positives
- GET method validates full page load

#### Monitor 2: Health Check API (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Health Check API
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Monitoring Interval: 1 minute
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "total_checks" keyword
HTTP Method: POST
Request Body: {}
Headers:
  Content-Type: application/json

Locations:
  ✓ North America - US East
  ✓ South America - Brazil
  ✓ Europe - Germany

Alert When Down For: 2 minutes
```

**Why monitor the health check?**
- Validates backend services are running
- Tests database connectivity indirectly
- Monitors Edge Functions availability

#### Monitor 3: Payment Webhook (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Payment Webhook
URL: https://payments-webhook.autorenta.workers.dev/webhooks/payments
  (Replace with actual Cloudflare Worker URL)
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "status":"ok" keyword
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes (2 consecutive failures)
```

**Note**: Get actual webhook URL from:
```bash
wrangler deployments list --name payments_webhook
```

#### Monitor 4: Database Health (via Internal Check)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Database Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "healthy" keyword
HTTP Method: GET
Headers:
  Authorization: Bearer <SERVICE_ROLE_KEY>

Locations:
  ✓ North America - US East

Alert When Down For: 10 minutes
```

**⚠️ Security Note**: Use a read-only API key if possible. Store securely.

#### Monitor 5: Auth Endpoints (Important)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Auth Login Page
URL: https://autorenta.pages.dev/auth/login
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Keyword to Check: "login" or "email"
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes
```

#### Monitor 6: Car Listings API (Important)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Car Listings Page
URL: https://autorenta.pages.dev/cars
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes
```

### Step 4: Configure Alert Contacts

UptimeRobot supports multiple alert channels. Configure all:

#### 4.1 Email Alerts

1. Go to **My Settings** → **Alert Contacts**
2. Click **"Add Alert Contact"**
3. Select **Email**
4. Configuration:
   ```
   Friendly Name: DevOps Team
   Email: devops@autorenta.com

   Send alerts for:
   ✓ Down
   ✓ Up (recovery)
   ✓ SSL expiry (30 days before)
   ```
5. Verify email
6. **Repeat** for additional recipients:
   - `alerts@autorenta.com` (team distribution list)
   - Individual developers (optional)

#### 4.2 Slack Alerts

1. In UptimeRobot: **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Select **Slack**
3. Click **"Connect with Slack"**
4. Authorize UptimeRobot in Slack workspace
5. Select channel: `#production-alerts` or `#ops`
6. Configure:
   ```
   Friendly Name: Slack - Production Alerts
   Channel: #production-alerts

   Send alerts for:
   ✓ Down
   ✓ Up
   ✓ SSL expiry
   ```

**Slack Message Format:**
```
🚨 [AutoRenta - Main Website] is DOWN
Response: Connection timeout
Duration: 2 minutes
Location: US East (Virginia)

View: https://uptimerobot.com/dashboard#monitor_id
```

#### 4.3 PagerDuty Integration (Critical Alerts Only)

**Prerequisites**: Complete [Issue #119 - PagerDuty Setup](https://github.com/ecucondorSA/autorenta/issues/119)

1. In PagerDuty: Create **Integration Key**
   - Go to **Services** → **AutoRenta Production**
   - Add Integration → **UptimeRobot**
   - Copy Integration Key

2. In UptimeRobot:
   - **My Settings** → **Alert Contacts** → **Add Alert Contact**
   - Select **Custom Webhook (via PagerDuty)**
   - Or use **Email-to-PagerDuty**: `<integration-key>@<subdomain>.pagerduty.com`

3. Configuration:
   ```
   Friendly Name: PagerDuty - Critical
   Email: <integration-key>@autorenta.pagerduty.com

   Send alerts for:
   ✓ Down only (not recoveries)

   Apply to monitors:
   - AutoRenta - Main Website
   - AutoRenta - Health Check API
   - AutoRenta - Payment Webhook
   ```

**PagerDuty Alert Routing:**
- **Severity High**: Main Website, Health Check API
- **Severity Medium**: Payment Webhook, Database
- **Severity Low**: Auth, Car Listings

#### 4.4 SMS Alerts (Critical Escalation)

**Use sparingly** - SMS credits are limited even on Pro plan.

1. **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Select **SMS**
3. Configuration:
   ```
   Friendly Name: On-Call Engineer SMS
   Phone: +54 9 11 XXXX-XXXX (Argentina format)

   Send alerts for:
   ✓ Down only

   Apply to monitors:
   - AutoRenta - Main Website (ONLY)
   ```

4. **Add secondary contact**:
   ```
   Friendly Name: Backup On-Call
   Phone: +54 9 11 YYYY-YYYY

   Alert after: 10 minutes down
   Apply to: Main Website
   ```

**SMS Alert Format:**
```
AutoRenta MAIN WEBSITE DOWN
2 min - US East
https://status.uptimerobot.com/monitor_id
```

### Step 5: Configure Advanced Settings

#### 5.1 Maintenance Windows

Prevent false alerts during deployments:

1. **Dashboard** → **Maintenance Windows**
2. **Add Maintenance Window**:
   ```
   Title: Weekly Deployment Window
   Type: Recurring
   Schedule: Every Wednesday, 02:00-03:00 UTC

   Affects:
   - All monitors

   Notification: Email team 1 hour before
   ```

3. **Create ad-hoc window** for emergency maintenance:
   ```
   Title: Emergency Database Migration
   Type: Once
   Start: <timestamp>
   Duration: 2 hours

   Affects: Select specific monitors
   ```

#### 5.2 Status Pages (Optional - Public)

Create public status page for users:

1. **My Status Pages** → **Add Status Page**
2. Configuration:
   ```
   Page Name: AutoRenta Status
   URL: https://status.autorenta.com (custom domain)
   OR: https://stats.uptimerobot.com/XXXXX (subdomain)

   Display Monitors:
   - AutoRenta - Main Website
   - AutoRenta - Auth
   - AutoRenta - Car Listings

   Hide:
   - Database Health (internal only)
   - API keys in URLs

   Show History: 90 days
   Show Response Times: Yes
   ```

3. **Customize appearance**:
   - Logo: Upload AutoRenta logo
   - Colors: Match brand (primary, secondary)
   - Announcements: Enable for incident communication

4. **Embed in website**:
   ```html
   <!-- Add to footer or dedicated /status page -->
   <iframe src="https://status.autorenta.com"
           width="100%" height="400px" frameborder="0"></iframe>
   ```

#### 5.3 SSL Certificate Monitoring

UptimeRobot automatically monitors SSL certificates:

1. Enable for all HTTPS monitors:
   ```
   Alert when certificate expires in: 30 days
   Re-check: Every 6 hours
   ```

2. Configure dedicated contact for SSL alerts:
   ```
   Email: devops@autorenta.com
   Subject: [SSL] Certificate Expiring Soon
   ```

---

## 📊 Success Metrics & Validation

### Verify Setup is Working

After configuration, validate:

#### 1. Check Monitor Status (within 5 minutes)

```bash
# All monitors should show "Up" within their first interval
# Check dashboard: https://uptimerobot.com/dashboard
```

**Expected Results:**
- ✅ All 6 monitors reporting "Up"
- ✅ Response times < 2 seconds
- ✅ 0 downtime alerts
- ✅ Multi-region checks running

#### 2. Test Alert Channels (Controlled Test)

**Test Process:**

1. **Pause a non-critical monitor**:
   - Select "AutoRenta - Car Listings"
   - Click "Pause" for 10 minutes
   - Note: This does NOT trigger alerts

2. **Create a test alert** (if supported):
   - Some plans allow "Send Test Alert"
   - OR temporarily change URL to invalid endpoint

3. **Verify notifications received**:
   - [ ] Email arrives within 2 minutes
   - [ ] Slack message posted in #production-alerts
   - [ ] PagerDuty incident created (if configured)
   - [ ] SMS sent (if configured for test)

4. **Resume monitor**:
   - Verify "Up" alert/notification sent

**Do NOT test in production hours** - coordinate with team.

#### 3. Validate Multi-Region Monitoring

Check that monitors are testing from all configured regions:

1. Dashboard → Click monitor → **"View Details"**
2. Scroll to **"Uptime Logs"**
3. Verify entries from:
   - ✅ North America (US East)
   - ✅ South America (Brazil)
   - ✅ Europe (Germany)

#### 4. Review Alert Routing

Verify alert contacts are assigned correctly:

| Monitor | Email | Slack | PagerDuty | SMS |
|---------|-------|-------|-----------|-----|
| Main Website | ✅ | ✅ | ✅ Critical | ✅ 2min |
| Health Check API | ✅ | ✅ | ✅ Critical | ❌ |
| Payment Webhook | ✅ | ✅ | ✅ Medium | ❌ |
| Database Health | ✅ | ✅ | ❌ | ❌ |
| Auth Endpoints | ✅ | ✅ | ❌ | ❌ |
| Car Listings | ✅ | ✅ | ❌ | ❌ |

### Target Metrics (from Issue #121)

Track these KPIs weekly:

```
✅ Uptime Target: 99.9% (max 43 minutes downtime/month)
✅ Detection Time: < 2 minutes (via 1-minute checks)
✅ False Positive Rate: < 1% (via 2 consecutive failure requirement)
✅ Alert Delivery: < 30 seconds after detection
✅ Multi-Region Coverage: 3 regions minimum
```

**Reporting:**
- Weekly: Review uptime percentage in dashboard
- Monthly: Export uptime report (Dashboard → Reports → Export CSV)
- Quarterly: Review incident history and MTTR

---

## 🔥 Incident Response Workflow

When an alert is received:

### 1. Alert Received (Within 2 minutes of issue)

**Channels:**
- Email: `devops@autorenta.com`
- Slack: `#production-alerts` channel
- PagerDuty: On-call engineer paged
- SMS: Critical alerts only

### 2. Acknowledge Incident (Within 5 minutes)

**Actions:**
1. **Acknowledge in PagerDuty** (stops escalation)
2. **Respond in Slack**: "Investigating [monitor name] alert"
3. **Check UptimeRobot dashboard**:
   - Which regions are affected?
   - What's the error message?
   - Response time or connection issue?

### 3. Initial Diagnosis (Within 10 minutes)

**Quick Checks:**

```bash
# Check main website
curl -I https://autorenta.pages.dev

# Check health endpoint
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check \
  -H "Content-Type: application/json" \
  -d '{}'

# Check internal monitoring
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

### 4. Triage Decision Tree

```
Is it a real outage?
├─ YES → Continue to Step 5
└─ NO (false positive) →
   ├─ Regional issue? → Check if isolated to one region
   ├─ Deployment in progress? → Check maintenance windows
   ├─ Rate limiting? → Review recent traffic spikes
   └─ Monitor misconfiguration? → Adjust monitor settings
```

### 5. Escalation & Response

**Severity Levels:**

| Severity | Response Time | Actions |
|----------|---------------|---------|
| **Critical** (Main site down) | Immediate | Page on-call, create war room, post status update |
| **High** (API/Backend down) | 15 minutes | Investigate, prepare rollback, notify team |
| **Medium** (Degraded performance) | 30 minutes | Monitor, investigate during business hours |
| **Low** (Non-critical service) | 1 hour | Create ticket, fix in next sprint |

**Critical Incident Checklist:**
- [ ] Acknowledge in all channels
- [ ] Create Slack incident thread
- [ ] Post initial status update
- [ ] Check recent deployments (`git log -10`)
- [ ] Review Cloudflare/Supabase dashboards
- [ ] Consider rollback if recent deploy
- [ ] Update status page (if public)
- [ ] Post resolution when fixed
- [ ] Schedule post-mortem

### 6. Resolution & Post-Mortem

**After incident resolved:**

1. **Resolve in PagerDuty**
2. **Post resolution in Slack**:
   ```
   ✅ RESOLVED: Main Website restored
   Duration: 12 minutes
   Root cause: Database connection pool exhausted
   Fix: Restarted Edge Functions
   Follow-up: #123 created for connection pool tuning
   ```

3. **Update UptimeRobot** (if needed):
   - Add incident note in monitor history
   - Adjust monitor if false positive

4. **Schedule post-mortem** (for Critical/High severity):
   - Within 48 hours
   - Document in `docs/postmortems/YYYY-MM-DD-incident-name.md`
   - Action items → GitHub issues

---

## 🔐 Security Considerations

### API Keys and Credentials

UptimeRobot monitors may require authentication:

**Best Practices:**
1. **Use read-only keys** when possible
2. **Rotate keys quarterly**:
   ```bash
   # Update monitor with new auth header
   # Document in: docs/runbooks/secret-rotation.md
   ```

3. **Do NOT expose**:
   - Service role keys in public status pages
   - Database credentials in monitor URLs
   - Internal API endpoints publicly

### Access Control

Limit UptimeRobot dashboard access:

1. **My Settings** → **Account Settings** → **Sub-Users**
2. Add team members with appropriate roles:
   ```
   DevOps Lead: Admin (full access)
   Engineers: Viewer (read-only)
   Support: Viewer (alerts only)
   ```

3. **Enable 2FA**:
   - **My Settings** → **Security** → **Two-Factor Authentication**
   - Require for all admin users

### Webhook Security

If using custom webhooks:

```bash
# Verify webhook signature (if UptimeRobot supports)
# Or use IP whitelist for webhook endpoints
# UptimeRobot IPs: Check https://uptimerobot.com/locations
```

---

## 🛠️ Automation & API Integration

UptimeRobot provides API for automation:

### Get API Key

1. **My Settings** → **Account Settings** → **API Settings**
2. Generate **Main API Key** (full access) or **Monitor-specific keys**
3. Store securely:
   ```bash
   # .env (DO NOT COMMIT)
   UPTIMEROBOT_API_KEY=u123456-abcdef123456
   ```

### Common API Operations

#### Get All Monitors Status

```bash
#!/bin/bash
# tools/check-uptime-status.sh

API_KEY="u123456-abcdef123456"

curl -X POST "https://api.uptimerobot.com/v2/getMonitors" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"format\": \"json\",
    \"logs\": 1
  }" | jq '.monitors[] | {name: .friendly_name, status: .status, uptime: .custom_uptime_ratio}'
```

**Output:**
```json
{
  "name": "AutoRenta - Main Website",
  "status": 2,
  "uptime": "99.98"
}
```

**Status Codes:**
- `0`: Paused
- `1`: Not checked yet
- `2`: Up ✅
- `8`: Seems down
- `9`: Down ❌

#### Create Monitor Programmatically

```bash
#!/bin/bash
# tools/create-uptime-monitor.sh

API_KEY="u123456-abcdef123456"
MONITOR_URL="https://autorenta.pages.dev/new-feature"
MONITOR_NAME="AutoRenta - New Feature"

curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"friendly_name\": \"$MONITOR_NAME\",
    \"url\": \"$MONITOR_URL\",
    \"type\": 1,
    \"interval\": 300,
    \"timeout\": 30
  }"
```

#### Get Uptime Report (for SLA tracking)

```bash
#!/bin/bash
# tools/get-monthly-uptime.sh

API_KEY="u123456-abcdef123456"

# Get uptime for last 30 days
CUSTOM_UPTIME_RANGES="1-30-60-90"

curl -X POST "https://api.uptimerobot.com/v2/getMonitors" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"custom_uptime_ranges\": \"$CUSTOM_UPTIME_RANGES\"
  }" | jq '.monitors[] | {
    name: .friendly_name,
    uptime_1d: .custom_uptime_ranges[0],
    uptime_30d: .custom_uptime_ranges[1],
    uptime_60d: .custom_uptime_ranges[2]
  }'
```

### Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
# .github/workflows/deploy-production.yml

jobs:
  deploy:
    steps:
      # ... deployment steps ...

      - name: Pause UptimeRobot monitors
        run: |
          # Pause for deployment window
          curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
            -H "Content-Type: application/json" \
            -d "{
              \"api_key\": \"${{ secrets.UPTIMEROBOT_API_KEY }}\",
              \"id\": \"${{ secrets.UPTIMEROBOT_MAIN_MONITOR_ID }}\",
              \"status\": 0
            }"

      # ... deploy application ...

      - name: Resume monitors after deployment
        if: always()
        run: |
          sleep 30  # Wait for app to start
          curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
            -H "Content-Type: application/json" \
            -d "{
              \"api_key\": \"${{ secrets.UPTIMEROBOT_API_KEY }}\",
              \"id\": \"${{ secrets.UPTIMEROBOT_MAIN_MONITOR_ID }}\",
              \"status\": 1
            }"
```

---

## 📈 Monitoring Best Practices

### 1. Check Intervals

**Recommendations:**
- **Critical services**: 1 minute (requires Pro plan)
- **Important services**: 5 minutes
- **Nice-to-have**: 10 minutes

**Why?**
- Faster detection = Faster recovery
- 1-minute checks with 2-failure threshold = 2-minute detection ✅

### 2. Multi-Region Coverage

**Required regions for AutoRenta:**
- 🌎 **South America (Brazil)**: Primary user base (Argentina + region)
- 🌍 **North America (US East)**: Cloudflare/Supabase infrastructure
- 🌏 **Europe (Germany)**: Secondary market, EU compliance

**Benefits:**
- Detect regional outages
- Verify CDN/routing
- Comply with data residency

### 3. Keyword Matching

Use keyword checks to validate content:

```
Good keywords:
✅ "AutoRenta" - Brand name in page
✅ "Buscar autos" - Core functionality
✅ "Iniciar sesión" - Auth working

Avoid:
❌ Common words ("the", "a") - Too generic
❌ Dynamic content (user names, dates)
❌ Numbers (inventory counts change)
```

### 4. Alert Threshold Tuning

Prevent alert fatigue:

```
Aggressive (1 failure):
- High false positive rate
- Alert fatigue
❌ NOT recommended

Balanced (2 consecutive failures): ✅
- 2-minute detection (with 1-min checks)
- <1% false positive rate
- Recommended for production

Conservative (3 failures):
- 3-minute detection
- Very low false positives
- Use for non-critical services
```

### 5. Maintenance Window Strategy

Schedule regular maintenance:

```
Weekly Deployment: Wednesday 02:00-03:00 UTC
  → Pause alerts, deploy, resume

Emergency Maintenance: Ad-hoc
  → Create window via API before deploy

Database Maintenance: Monthly, Sunday 04:00-05:00 UTC
  → Pause database health checks
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### Issue: False Positives (Monitor shows down but service is up)

**Symptoms:**
- Alert received but manual check shows service working
- Random "down" spikes in uptime graph
- No actual user impact

**Diagnosis:**
```bash
# Check if issue is regional
curl -I https://autorenta.pages.dev

# Check from different locations
# Use: https://tools.keycdn.com/performance

# Check rate limiting
curl -v https://autorenta.pages.dev 2>&1 | grep -i "rate\|429"
```

**Solutions:**
1. **Increase alert threshold**: 2 → 3 consecutive failures
2. **Extend timeout**: 30s → 60s (for slow responses)
3. **Check IP whitelisting**: UptimeRobot IPs may be blocked
4. **Use HEAD method**: Faster than GET for simple checks

#### Issue: Delayed Alerts (Receiving alerts after issue resolved)

**Symptoms:**
- Alert arrives 10+ minutes after incident
- Service recovered before alert received

**Diagnosis:**
```bash
# Check UptimeRobot status
curl https://stats.uptimerobot.com/api/v2/status.json

# Verify alert contact settings
# Dashboard → My Settings → Alert Contacts → Test
```

**Solutions:**
1. **Check email delivery**: May be in spam folder
2. **Verify PagerDuty integration**: Test integration key
3. **Upgrade to Pro**: Faster alerts on paid plans
4. **Use webhook alerts**: Often faster than email

#### Issue: SSL Certificate Warnings

**Symptoms:**
- Monitor shows "SSL certificate expired" but cert is valid
- SSL warnings for valid certificates

**Diagnosis:**
```bash
# Check certificate expiry
echo | openssl s_client -servername autorenta.pages.dev \
  -connect autorenta.pages.dev:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
curl -I -v https://autorenta.pages.dev 2>&1 | grep -i cert
```

**Solutions:**
1. **Clear SSL cache**: Edit monitor → Save (forces re-check)
2. **Verify certificate chain**: Ensure intermediate certs included
3. **Check Cloudflare settings**: Verify SSL mode (Full vs Flexible)
4. **Disable SSL check**: Last resort for custom configs

#### Issue: High Response Times (but no downtime)

**Symptoms:**
- Response times consistently > 2 seconds
- No downtime but degraded performance

**Diagnosis:**
```bash
# Check internal metrics
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Check Cloudflare analytics
# Dashboard → Analytics → Performance

# Check database performance
# Supabase Dashboard → Database → Query Performance
```

**Solutions:**
1. **Optimize application**: See `docs/runbooks/performance-optimization.md`
2. **Scale infrastructure**: Upgrade Supabase/Cloudflare plan
3. **Enable caching**: Cloudflare Page Rules for static content
4. **Add CDN**: Ensure assets served from edge

#### Issue: Monitor Showing "Seems Down" (Not "Down")

**Symptoms:**
- Monitor status: "Seems down" (8) instead of "Down" (9)
- Intermittent failures

**Meaning:**
- Service responding but not as expected
- HTTP status != 200
- Keyword not found
- Timeout exceeded

**Solutions:**
1. **Check expected status**: May be returning 301/302 redirect
2. **Verify keywords**: Content may have changed
3. **Increase timeout**: Service may be slow but not down
4. **Check for redirects**: Use "Follow redirects" option

---

## 📚 Additional Resources

### Documentation
- **UptimeRobot API**: https://uptimerobot.com/api
- **Status Codes**: https://uptimerobot.com/faq/monitor-status-codes
- **IP Addresses**: https://uptimerobot.com/locations (for whitelisting)

### Internal Documentation
- **Internal Monitoring**: `docs/MONITORING_SYSTEM.md`
- **PagerDuty Setup**: Issue #119
- **Incident Response**: `docs/runbooks/incident-response.md` (TODO)
- **Disaster Recovery**: `docs/disaster-recovery-plan.md`

### Related Issues
- [#119: PagerDuty Integration](https://github.com/ecucondorSA/autorenta/issues/119)
- [#121: External Uptime Monitoring](https://github.com/ecucondorSA/autorenta/issues/121) ← Current
- [#114: Production Readiness Audit](https://github.com/ecucondorSA/autorenta/issues/114)

### External Tools
- **Multi-location testing**: https://tools.keycdn.com/performance
- **SSL checker**: https://www.ssllabs.com/ssltest/
- **DNS checker**: https://www.whatsmydns.net/
- **Status aggregator**: https://www.cloudflarestatus.com

---

## ✅ Checklist: External Monitoring Setup Complete

Use this checklist to verify setup:

### Account Setup
- [ ] UptimeRobot account created
- [ ] Upgraded to Pro plan ($7/month)
- [ ] 2FA enabled on account
- [ ] API key generated and stored securely

### Monitors Created (6 total)
- [ ] Main Website (1-min, multi-region)
- [ ] Health Check API (1-min, multi-region)
- [ ] Payment Webhook (5-min)
- [ ] Database Health (5-min)
- [ ] Auth Endpoints (5-min)
- [ ] Car Listings (5-min)

### Multi-Region Configuration
- [ ] North America (US East) enabled
- [ ] South America (Brazil) enabled
- [ ] Europe (Germany) enabled

### Alert Channels Configured
- [ ] Email (devops@autorenta.com)
- [ ] Slack (#production-alerts)
- [ ] PagerDuty (Critical monitors)
- [ ] SMS (Main website only)

### Advanced Features
- [ ] Maintenance windows scheduled
- [ ] SSL monitoring enabled (30-day warning)
- [ ] Status page created (optional)
- [ ] Alert thresholds tuned (2 consecutive failures)

### Testing & Validation
- [ ] All monitors showing "Up"
- [ ] Test alert sent and received
- [ ] Multi-region checks verified
- [ ] Response times < 2 seconds
- [ ] False positive rate tracked

### Documentation
- [ ] Team trained on alert response
- [ ] Incident response workflow documented
- [ ] API credentials stored in 1Password/Vault
- [ ] Monthly uptime review scheduled

### Integration
- [ ] GitHub Actions secrets configured
- [ ] Deployment workflow updated (pause/resume)
- [ ] Weekly uptime report automated
- [ ] Grafana dashboard linked (optional)

---

## 📞 Support & Escalation

**UptimeRobot Support:**
- Email: support@uptimerobot.com
- Response time: 24 hours (Pro plan)
- Docs: https://uptimerobot.com/faq

**Internal Team:**
- **DevOps Lead**: @devops (Slack)
- **On-Call Engineer**: Check PagerDuty schedule
- **Emergency**: +54 9 11 XXXX-XXXX

**Vendor Status Pages:**
- Cloudflare: https://www.cloudflarestatus.com
- Supabase: https://status.supabase.com
- MercadoPago: https://status.mercadopago.com

---

**Last Updated**: 2025-11-07
**Next Review**: Monthly (or after major incidents)
**Owner**: DevOps Team


---
# Source: fix-auth-callback-404.md

# Fix: Error 404 en /auth/callback

## Problema

Al intentar autenticarse con Google OAuth, el usuario es redirigido a:
```
https://autorentar.com/auth/callback#access_token=...
```

Pero recibe un error **HTTP 404**.

## Causa

El archivo `_redirects` de Cloudflare Pages no está presente o no está configurado correctamente en el build desplegado. Este archivo es **crítico** para que Cloudflare Pages redirija todas las rutas de Angular a `index.html`, permitiendo que el Angular Router maneje las rutas.

## Solución

### Paso 1: Verificar que el script se ejecuta

El script `create-cloudflare-config.js` se ejecuta automáticamente después del build (`postbuild`). Verifica que esté en `package.json`:

```json
{
  "scripts": {
    "postbuild": "node scripts/create-cloudflare-config.js"
  }
}
```

### Paso 2: Verificar que el archivo se genera

Después de hacer build, verifica que el archivo existe:

```bash
cd apps/web
npm run build
cat dist/web/browser/_redirects
```

Deberías ver:
```
/auth/* /index.html 200
...
/*  /index.html  200
```

### Paso 3: Verificar configuración de Cloudflare Pages

En Cloudflare Pages Dashboard:

1. Ve a **Settings > Builds & deployments**
2. Verifica que el **Build output directory** sea: `dist/web/browser`
3. Verifica que el comando de build incluya `postbuild`:
   ```bash
   npm run build
   ```

### Paso 4: Hacer nuevo deploy

Si el archivo `_redirects` no está en el build actual, necesitas hacer un nuevo deploy:

```bash
# Opción 1: Deploy manual
cd apps/web
npm run build
npm run deploy:pages

# Opción 2: Push a main (si tienes CI/CD configurado)
git add .
git commit -m "fix: Ensure _redirects file is generated for Cloudflare Pages"
git push origin main
```

### Paso 5: Verificar en Cloudflare Pages

Después del deploy:

1. Ve a **Deployments** en Cloudflare Pages
2. Abre el deployment más reciente
3. Verifica que el archivo `_redirects` esté presente en los archivos desplegados
4. Prueba la URL: `https://autorentar.com/auth/callback` (debería cargar la app Angular)

## Verificación

### Test local (simulando Cloudflare Pages)

```bash
cd apps/web
npm run build

# Verificar que _redirects existe
ls -la dist/web/browser/_redirects

# Ver contenido
cat dist/web/browser/_redirects
```

### Test en producción

1. Intenta autenticarte con Google
2. Deberías ser redirigido a `/auth/callback` sin error 404
3. La página debería mostrar "Completando inicio de sesión..." y luego redirigir

## Configuración de Supabase

Asegúrate de que en **Supabase Dashboard > Authentication > URL Configuration**:

- **Site URL**: `https://autorentar.com`
- **Redirect URLs** incluye:
  ```
  https://autorentar.com/auth/callback
  http://localhost:4200/auth/callback
  ```

## Archivos relacionados

- `apps/web/public/_redirects` - Archivo base (se copia durante build)
- `apps/web/scripts/create-cloudflare-config.js` - Script que genera `_redirects` en dist
- `apps/web/package.json` - Configuración de scripts (postbuild)
- `apps/web/angular.json` - Configuración de assets (copia `public/` al build)

## Notas importantes

1. **El archivo `_redirects` DEBE estar en la raíz del build output** (`dist/web/browser/_redirects`)
2. **Cloudflare Pages lee automáticamente `_redirects`** si está en la raíz del directorio de build
3. **El formato es específico**: `/*  /index.html  200` (con espacios específicos)
4. **El script `postbuild` sobrescribe** el archivo copiado desde `public/` con la versión generada

## Troubleshooting adicional

### Si el problema persiste después del deploy:

1. **Verifica el build log** en Cloudflare Pages para ver si `postbuild` se ejecutó
2. **Verifica que el archivo esté en el deployment**:
   - Cloudflare Pages > Deployments > [Latest] > View files
   - Busca `_redirects` en la lista
3. **Limpia el cache de Cloudflare**:
   - Cloudflare Dashboard > Caching > Purge Everything
4. **Verifica la configuración de rutas en Cloudflare Pages**:
   - Settings > Functions > Routes
   - No debería haber rutas que interfieran con `_redirects`

---

**Última actualización**: 2025-01-11
**Estado**: Solución implementada - requiere nuevo deploy







---
# Source: fix-bad-oauth-state.md

# 🔧 Solución: Error bad_oauth_state en Google OAuth

## ❌ Error

```
Error: bad_oauth_state
OAuth callback with invalid state
```

URL de error: `https://autorentar.com/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+callback+with+invalid+state`

## 🔍 Causa

El error `bad_oauth_state` ocurre cuando Supabase no puede validar el parámetro `state` durante el callback de OAuth. Esto puede suceder por:

1. **Cookies bloqueadas**: El navegador bloquea cookies de terceros, impidiendo que Supabase almacene el `state`
2. **Sesión perdida**: La sesión se perdió entre el inicio del OAuth y el callback
3. **Múltiples intentos**: Varios intentos de login simultáneos pueden invalidar el state
4. **Problemas con SameSite**: En producción, cookies con SameSite pueden causar problemas
5. **Storage bloqueado**: LocalStorage o sessionStorage bloqueados por el navegador
6. **Redirect URL no coincide**: El `redirectTo` no coincide exactamente con la URL configurada en Supabase

## ✅ Soluciones

### Solución 1: Verificar Configuración en Supabase Dashboard

1. **Ir a Supabase Dashboard**:
   - https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/url-configuration

2. **Verificar Redirect URLs**:
   - Debe incluir: `https://autorentar.com/auth/callback`
   - También: `http://localhost:4200/auth/callback` (para desarrollo)

3. **Verificar Site URL**:
   - Debe ser: `https://autorentar.com` (producción)

4. **Guardar cambios**

### Solución 2: Limpiar Cookies y Storage

1. **Abrir DevTools** (F12)
2. **Application/Storage tab**
3. **Limpiar**:
   - Cookies para `autorentar.com`
   - LocalStorage
   - SessionStorage
4. **Cerrar todas las pestañas** del sitio
5. **Intentar login nuevamente**

### Solución 3: Verificar Configuración de Google OAuth

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/apis/credentials

2. **Verificar OAuth 2.0 Client ID**:
   - **Authorized redirect URIs** debe incluir:
     - `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - **Authorized JavaScript origins**:
     - `https://autorentar.com`
     - `http://localhost:4200` (desarrollo)

3. **Guardar cambios**

### Solución 4: Usar Modo Incógnito (Testing)

Si funciona en modo incógnito, el problema es con cookies/storage:
- Abrir ventana incógnita
- Intentar login
- Si funciona, limpiar cookies/storage (Solución 2)

### Solución 5: Verificar Código (Ya Implementado)

El código ya fue mejorado para:
- ✅ Detectar errores en la URL antes de procesar
- ✅ Mostrar mensajes de error más claros
- ✅ Limpiar la URL después de detectar errores
- ✅ Manejar específicamente el error `bad_oauth_state`

## 🧪 Verificar que Funciona

### Test 1: Login en Producción

1. Ir a: `https://autorentar.com/auth/login`
2. Click en "Iniciar sesión con Google"
3. Autorizar en Google
4. Debe redirigir a `/auth/callback` sin errores
5. Debe completar el login y redirigir a `/`

### Test 2: Verificar Redirect URL

```bash
# Verificar que Supabase tiene la URL correcta
# En Supabase Dashboard → Authentication → URL Configuration
# Redirect URLs debe incluir:
https://autorentar.com/auth/callback
```

### Test 3: Verificar Cookies

```javascript
// En DevTools Console, verificar cookies de Supabase:
document.cookie
// Debe incluir cookies de supabase.co
```

## 🚨 Errores Comunes

### Error: "redirect_uri_mismatch"
**Solución**: Verificar que la redirect URI en Google Cloud Console coincida exactamente con la de Supabase.

### Error: "bad_oauth_state" persistente
**Solución**: 
1. Limpiar todas las cookies y storage
2. Verificar que no haya múltiples pestañas abiertas
3. Cerrar todas las pestañas y volver a intentar

### Error: Funciona en localhost pero no en producción
**Solución**: 
1. Verificar que la redirect URL en Supabase incluya el dominio de producción
2. Verificar configuración de cookies SameSite en producción
3. Verificar que Cloudflare Pages no esté bloqueando cookies

## 📚 Referencias

- [Supabase OAuth Troubleshooting](https://supabase.com/docs/guides/auth/troubleshooting)
- [Google OAuth State Parameter](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse)
- [SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Código mejorado para detectar y manejar el error






---
# Source: fix-google-calendar-oauth-redirect.md

# 🔧 Solución: Error 403 Google Calendar OAuth - Redirect URI Incorrecto

## ❌ Error

```
Error 403: access_denied
redirect_uri: https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

**Problema**: El `redirect_uri` en la solicitud OAuth es incorrecto. Está usando el endpoint de Supabase Auth (`/auth/v1/callback`) en lugar del endpoint de la Edge Function de Google Calendar.

## 🔍 Causa

El `redirect_uri` configurado en el secret de Supabase o en Google Cloud Console no coincide con el que debe usar la función `google-calendar-oauth`.

**Redirect URI Correcto**:
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

**Redirect URI Incorrecto** (el que está configurado):
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

## ✅ Solución

### Paso 1: Verificar Secret en Supabase

```bash
# Verificar el secret actual
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI
```

Si muestra el URI incorrecto (`/auth/v1/callback`), corregirlo:

```bash
# Configurar el redirect URI correcto
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

### Paso 2: Verificar en Google Cloud Console

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/apis/credentials

2. **Buscar el OAuth 2.0 Client ID**:
   - Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`

3. **Editar el Client ID**:
   - Click en el Client ID para editarlo

4. **Verificar Authorized redirect URIs**:
   - Debe incluir EXACTAMENTE:
     ```
     https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
     ```

5. **Si no está, agregarlo**:
   - Click en "+ ADD URI"
   - Pegar: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - Click "SAVE"

6. **Eliminar el URI incorrecto** (si existe):
   - Si ves `/auth/v1/callback`, eliminarlo (solo se usa para autenticación de usuario, no para Calendar)

### Paso 3: Verificar OAuth Consent Screen

1. **Ir a OAuth Consent Screen**:
   - https://console.cloud.google.com/apis/credentials/consent

2. **Verificar Scopes**:
   - Debe incluir:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`

3. **Verificar Test Users** (si está en modo Testing):
   - Agregar el email del usuario que intenta conectar

### Paso 4: Verificar Edge Function

```bash
# Verificar que la función esté desplegada
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar-oauth

# Debe mostrar: google-calendar-oauth | ACTIVE
```

### Paso 5: Probar Nuevamente

1. Limpiar cookies y storage del navegador
2. Intentar conectar Google Calendar nuevamente
3. Debe redirigir correctamente sin error 403

## 📋 Checklist de Configuración Correcta

### Supabase Secrets
- [ ] `GOOGLE_OAUTH_CLIENT_ID` configurado
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET` configurado
- [ ] `GOOGLE_OAUTH_REDIRECT_URI` = `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`

### Google Cloud Console
- [ ] OAuth 2.0 Client ID creado
- [ ] Authorized redirect URI incluye: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] OAuth Consent Screen configurado con scopes de Calendar
- [ ] Test users agregados (si está en modo Testing)

### Edge Function
- [ ] `google-calendar-oauth` desplegada y activa
- [ ] Secrets configurados correctamente

## 🚨 Nota Importante

**Dos Flujos OAuth Diferentes**:

1. **Google Auth OAuth** (para login de usuario):
   - Redirect URI: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - Scopes: `email`, `profile`, `openid`
   - Se configura en Supabase Dashboard → Authentication → Providers

2. **Google Calendar OAuth** (para conectar calendario):
   - Redirect URI: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - Scopes: `calendar`, `calendar.events`
   - Se configura en Supabase Secrets y Google Cloud Console

**NO confundir estos dos flujos**. Cada uno tiene su propio redirect URI.

## 📚 Referencias

- [Google Calendar OAuth Setup](./SETUP_GOOGLE_CALENDAR.md)
- [Google Calendar Integration](./docs/GOOGLE_CALENDAR_INTEGRATION.md)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Solución documentada






---
# Source: fix-google-calendar-redirect-uri-mismatch.md

# Runbook: Solución Error 400 redirect_uri_mismatch - Google Calendar OAuth

## Descripción del Problema

**Error**: `400 Bad Request - redirect_uri_mismatch`

**Mensaje completo**:
```
Error 400: redirect_uri_mismatch
The redirect URI in the request: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback does not match the ones authorized for the OAuth client.

Visit https://console.developers.google.com/apis/credentials/oauthclient/[CLIENT_ID]?project=[PROJECT_ID] to update the authorized redirect URIs.
```

## Causa Raíz

Google OAuth 2.0 requiere que el `redirect_uri` usado en la solicitud de autorización coincida **exactamente** con uno de los URIs autorizados configurados en Google Cloud Console.

### Dos Flujos OAuth Diferentes en AutoRenta

Es importante entender que AutoRenta tiene **DOS flujos OAuth separados**:

1. **Google Auth OAuth** (Login de usuario con Google)
   - **Propósito**: Autenticación de usuarios usando su cuenta de Google
   - **Redirect URI**: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - **Proyecto Supabase**: obxvffplochgeiclibng (proyecto principal)
   - **Configuración**: Supabase Dashboard → Authentication → Providers
   - **Scopes**: `email`, `profile`, `openid`

2. **Google Calendar OAuth** (Integración de calendario)
   - **Propósito**: Sincronizar bookings con Google Calendar del usuario
   - **Redirect URI**: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - **Proyecto Supabase**: pisqjmoklivzpwufhscx (proyecto alternativo/staging)
   - **Configuración**: Edge Function + Supabase Secrets
   - **Scopes**: `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/calendar.events`

**IMPORTANTE**: Estos flujos usan **diferentes proyectos de Supabase** y **diferentes redirect URIs**.

## Configuración Actual (Problemática)

### Secret en Supabase
```bash
GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```
❌ **Incorrecto**: Está usando `/auth/v1/callback` (endpoint de Supabase Auth) en lugar de `/functions/v1/google-calendar-oauth?action=handle-callback` (Edge Function)

### Google Cloud Console
- **Client ID**: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- **Authorized redirect URIs**: (Probablemente solo tiene el URI incorrecto)

## Solución Paso a Paso

### Paso 1: Verificar Client ID de Google Cloud

1. Ir a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Buscar el OAuth 2.0 Client ID con ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`

3. Click en el nombre del Client ID para editarlo

### Paso 2: Actualizar Authorized Redirect URIs en Google Cloud Console

En la sección **Authorized redirect URIs**, asegúrate de tener **AMBOS** URIs (si planeas usar ambos flujos):

```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

**Opcional** (solo si también usas Google Auth login en este proyecto):
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

**Pasos detallados**:
1. En "Authorized redirect URIs", click en **+ ADD URI**
2. Pegar exactamente: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
3. Verificar que no haya espacios en blanco al inicio o final
4. Click **SAVE**
5. Esperar 1-2 minutos para que los cambios se propaguen

### Paso 3: Actualizar Secret en Supabase

Actualizar el secret `GOOGLE_OAUTH_REDIRECT_URI` con el valor correcto:

```bash
# Actualizar el redirect URI al valor correcto
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

**Verificar el cambio**:
```bash
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI
```

Debería mostrar el digest (hash) del nuevo valor.

### Paso 4: Verificar OAuth Consent Screen

1. Ir a [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)

2. Verificar que los **Scopes** incluyan:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

3. Si la app está en modo **Testing**, verificar que tu email esté en **Test users**:
   - Scroll a la sección "Test users"
   - Agregar el email del usuario que intentará conectar Google Calendar
   - Click "Save"

### Paso 5: Verificar Edge Function

Asegúrate de que la Edge Function esté desplegada y activa:

```bash
# Listar funciones
supabase functions list --project-ref pisqjmoklivzpwufhscx

# Debería mostrar:
# google-calendar-oauth | ACTIVE
```

Si no está desplegada:
```bash
# Desplegar la función
supabase functions deploy google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
```

### Paso 6: Probar la Conexión

1. **Limpiar cache del navegador** (o usar incógnito)
   - Las cookies y cache pueden causar problemas

2. **Iniciar la app**:
   ```bash
   npm run dev
   ```

3. **Ir a la página de perfil**:
   ```
   http://localhost:4200/profile
   ```

4. **Click en "Conectar Google Calendar"**

5. **Verificar el flujo**:
   - Debe abrir popup de Google OAuth
   - Debe mostrar la pantalla de selección de cuenta
   - Debe mostrar los permisos solicitados (Calendar access)
   - Al aprobar, debe redirigir a: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback&code=...&state=...`
   - El popup debe cerrarse automáticamente
   - El estado debe cambiar a "Conectado"

6. **Verificar en base de datos**:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   SELECT
     user_id,
     primary_calendar_id,
     expires_at,
     sync_enabled,
     connected_at
   FROM google_calendar_tokens
   WHERE user_id = auth.uid();
   ```

   Debería retornar 1 fila con los datos del token.

## Verificación de Configuración Completa

### Checklist de Google Cloud Console

- [ ] Proyecto de Google Cloud creado
- [ ] Google Calendar API habilitada
- [ ] OAuth 2.0 Client ID creado
- [ ] Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- [ ] Authorized redirect URI incluye: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] OAuth Consent Screen configurado
- [ ] Scopes de Calendar agregados: `calendar` y `calendar.events`
- [ ] Test users configurados (si está en modo Testing)

### Checklist de Supabase

- [ ] Edge Function `google-calendar-oauth` desplegada
- [ ] Secret `GOOGLE_OAUTH_CLIENT_ID` configurado
- [ ] Secret `GOOGLE_OAUTH_CLIENT_SECRET` configurado
- [ ] Secret `GOOGLE_OAUTH_REDIRECT_URI` = `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] Secret `FRONTEND_URL` configurado (ej: `http://localhost:4200`)
- [ ] Migración de base de datos aplicada (tabla `google_calendar_tokens` existe)

### Comandos de Verificación

```bash
# 1. Verificar secrets
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE

# 2. Verificar Edge Function
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar

# 3. Verificar tabla en base de datos
# (Ejecutar en Supabase SQL Editor)
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'google_calendar_tokens';
```

## Troubleshooting Adicional

### Error: "Invalid client"
**Causa**: El Client ID o Client Secret no coinciden con Google Cloud Console

**Solución**:
1. Verificar Client ID en Google Cloud Console
2. Regenerar Client Secret si es necesario
3. Actualizar secrets en Supabase:
   ```bash
   supabase secrets set GOOGLE_OAUTH_CLIENT_ID="[nuevo-client-id]" --project-ref pisqjmoklivzpwufhscx
   supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[nuevo-secret]" --project-ref pisqjmoklivzpwufhscx
   ```

### Error: "Access blocked: This app has not been verified"
**Causa**: La app está en modo Testing y el usuario no está en la lista de test users

**Solución**:
1. Ir a OAuth Consent Screen en Google Cloud Console
2. Scroll a "Test users"
3. Agregar el email del usuario
4. Click "Save"

### Error: "Token exchange failed"
**Causa**: Problemas con el código de autorización o configuración incorrecta

**Solución**:
1. Verificar que los secrets estén correctamente configurados
2. Revisar logs de la Edge Function:
   ```bash
   supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
   ```
3. Verificar que el redirect URI coincida exactamente

### Popup se cierra inmediatamente sin conectar
**Causa**: Error en la Edge Function o redirect incorrecto

**Solución**:
1. Abrir DevTools → Console antes de hacer click
2. Revisar errores en la consola
3. Verificar Network tab para ver si hay errores 4xx/5xx
4. Revisar logs de la Edge Function

## Testing de Integración Completa

### Test 1: Conexión de Calendar
```typescript
// Desde la consola del navegador (con usuario autenticado)
fetch('https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=get-auth-url', {
  headers: {
    'Authorization': 'Bearer YOUR_USER_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Auth URL:', data.authUrl));
```

### Test 2: Estado de Conexión
```typescript
// Verificar si el usuario tiene calendar conectado
fetch('https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=status', {
  headers: {
    'Authorization': 'Bearer YOUR_USER_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Connection status:', data));

// Respuesta esperada:
// { connected: true/false, expires_at: "...", primary_calendar_id: "..." }
```

## Diagrama de Flujo OAuth

```
1. Usuario → Click "Conectar Google Calendar"
2. Frontend → GET /functions/v1/google-calendar-oauth?action=get-auth-url
3. Edge Function → Retorna authUrl
4. Frontend → Abre popup con authUrl
5. Popup → Google OAuth (user aprueba)
6. Google → Redirect a: /functions/v1/google-calendar-oauth?action=handle-callback&code=XXX&state=user_id
7. Edge Function → Intercambia code por tokens
8. Edge Function → Guarda tokens en google_calendar_tokens
9. Edge Function → Redirect a frontend con success
10. Popup → Se cierra
11. Frontend → Actualiza estado a "Conectado"
```

## Variables de Entorno Necesarias

### Supabase Secrets (Edge Function)
```bash
GOOGLE_OAUTH_CLIENT_ID=199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=[tu-secret]
GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
FRONTEND_URL=http://localhost:4200
SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Angular Environment (Frontend)
```typescript
// apps/web/src/environments/environment.ts
export const environment = {
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey: '[anon-key]',
  googleCalendarEnabled: true,
};
```

## Documentación Relacionada

- **Setup completo**: `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`
- **Integración detallada**: `/home/edu/autorenta/docs/GOOGLE_CALENDAR_INTEGRATION.md`
- **Testing guide**: `/home/edu/autorenta/GOOGLE_CALENDAR_TEST_GUIDE.md`
- **Runbook OAuth 403**: `/home/edu/autorenta/docs/runbooks/fix-google-oauth-403.md`
- **Runbook redirect incorrect**: `/home/edu/autorenta/docs/runbooks/fix-google-calendar-oauth-redirect.md`

## Referencias Externas

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [OAuth 2.0 Redirect URI Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

## Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-11-13 | Creación del runbook | Claude Code |
| 2025-11-13 | Documentación de dos flujos OAuth separados | Claude Code |
| 2025-11-13 | Agregado troubleshooting detallado | Claude Code |

---

**Última actualización**: 2025-11-13
**Estado**: ✅ Solución documentada y validada
**Prioridad**: Alta (bloquea funcionalidad de Google Calendar)
**Impacto**: Usuarios no pueden conectar Google Calendar hasta resolver

---

## Notas Adicionales

### Diferencias entre los dos proyectos de Supabase

AutoRenta usa dos proyectos de Supabase diferentes:

1. **obxvffplochgeiclibng** (Producción/Principal)
   - URL: `https://obxvffplochgeiclibng.supabase.co`
   - Uso: Autenticación principal, base de datos de producción
   - Google OAuth: Login de usuarios

2. **pisqjmoklivzpwufhscx** (Staging/Alternativo)
   - URL: `https://pisqjmoklivzpwufhscx.supabase.co`
   - Uso: Google Calendar integration, testing
   - Google OAuth: Integración de calendario

**IMPORTANTE**: No confundir estos dos proyectos al configurar redirect URIs.

### Políticas de OAuth 2.0 de Google

Google requiere:
1. **Coincidencia exacta** del redirect URI (incluyendo protocolo, dominio, path, y query params)
2. **HTTPS** en producción (permite HTTP solo para localhost)
3. **Redirect URIs preconfigurados** - no se pueden generar dinámicamente
4. **Máximo 100 redirect URIs** por Client ID
5. **Verificación de la app** si se solicitan scopes sensibles (como Calendar)

### Seguridad

- Los tokens de acceso se almacenan cifrados en Supabase
- RLS policies protegen el acceso a `google_calendar_tokens`
- Solo el usuario propietario puede ver/modificar sus tokens
- Los refresh tokens permiten renovar el acceso sin re-autorización
- Los tokens expiran automáticamente (típicamente en 1 hora)


---
# Source: fix-google-oauth-403.md

# 🔧 Solución: Error 403 Google OAuth - Access Denied

## ❌ Error

```
Error 403: access_denied
The developer hasn't given you access to this app. It's currently being tested and it hasn't been verified by Google.
```

## 🔍 Causa

La aplicación de Google OAuth está en **modo de prueba** y el usuario intentando iniciar sesión **no está en la lista de usuarios de prueba**.

## ✅ Solución Rápida

### Opción 1: Agregar Usuario a Lista de Prueba (Recomendado para desarrollo)

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/
   - Seleccionar el proyecto de AutoRenta

2. **Navegar a OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   ```

3. **Agregar Usuarios de Prueba**:
   - En la sección **"Test users"**
   - Click en **"+ ADD USERS"**
   - Agregar el email del usuario que intenta iniciar sesión
   - Ejemplo: `usuario@gmail.com`
   - Click **"ADD"**

4. **Guardar cambios**

5. **Probar nuevamente**:
   - El usuario agregado ahora podrá iniciar sesión con Google

### Opción 2: Publicar la App (Para producción)

⚠️ **Nota**: Publicar la app requiere verificación de Google, que puede tardar varios días.

1. **Ir a OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   ```

2. **Cambiar a Producción**:
   - Click en **"PUBLISH APP"**
   - Confirmar publicación

3. **Completar Verificación de Google** (si es requerido):
   - Google puede pedir información adicional
   - Proceso puede tardar 1-7 días
   - Mientras tanto, usar Opción 1 (usuarios de prueba)

## 📋 Checklist de Configuración Completa

### 1. OAuth Consent Screen Configurado

- [ ] Tipo: **External** (o Internal si es organización)
- [ ] App name: **AutoRenta**
- [ ] User support email: **autorentardev@gmail.com**
- [ ] Developer contact: **autorentardev@gmail.com**
- [ ] Scopes agregados:
  - [ ] `email`
  - [ ] `profile`
  - [ ] `openid`
  - [ ] `https://www.googleapis.com/auth/calendar` (si se usa Google Calendar)
  - [ ] `https://www.googleapis.com/auth/calendar.events` (si se usa Google Calendar)

### 2. OAuth 2.0 Client ID Configurado

- [ ] Application type: **Web application**
- [ ] Name: **AutoRenta Web**
- [ ] Authorized JavaScript origins:
  - [ ] `http://localhost:4200` (desarrollo)
  - [ ] `https://autorenta-web.pages.dev` (producción)
- [ ] Authorized redirect URIs:
  - [ ] `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback` (Supabase Auth)
  - [ ] `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback` (si se usa Calendar)

### 3. Supabase Dashboard Configurado

- [ ] Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/providers
- [ ] Habilitar **Google** provider
- [ ] Client ID configurado (de Google Cloud Console)
- [ ] Client Secret configurado (de Google Cloud Console)
- [ ] Redirect URL verificado: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`

### 4. Usuarios de Prueba (Modo Testing)

- [ ] Agregar emails de usuarios que necesitan acceso
- [ ] Incluir: `autorentardev@gmail.com` y otros emails de prueba

## 🧪 Verificar Configuración

### Test 1: Verificar OAuth Consent Screen

```bash
# Verificar que el consent screen esté configurado
# Ir a: https://console.cloud.google.com/apis/credentials/consent
# Debe mostrar estado: "Testing" o "In production"
```

### Test 2: Verificar Supabase Provider

```bash
# Verificar en Supabase Dashboard
# Authentication → Providers → Google
# Debe estar "Enabled" y mostrar Client ID
```

### Test 3: Probar Login

1. Ir a: `http://localhost:4200/auth/login`
2. Click en "Iniciar sesión con Google"
3. Debe redirigir a Google sin error 403

## 🚨 Errores Comunes

### Error: "redirect_uri_mismatch"
**Solución**: Verificar que la redirect URI en Google Cloud Console coincida exactamente con la de Supabase.

### Error: "invalid_client"
**Solución**: Verificar que Client ID y Client Secret en Supabase Dashboard sean correctos.

### Error: "access_denied" (403)
**Solución**: Agregar usuario a lista de prueba (ver Opción 1 arriba).

## 📚 Referencias

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Providers](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [OAuth Consent Screen Guide](https://support.google.com/cloud/answer/10311615)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Solución documentada






---
# Source: on-call-rotation.md

# On-Call Rotation and Escalation Procedures

**Status**: ✅ Active
**Owner**: Platform Engineering
**Last Updated**: 2025-11-07
**Related Issue**: #119

---

## Table of Contents

1. [Overview](#overview)
2. [On-Call Schedule](#on-call-schedule)
3. [Escalation Policy](#escalation-policy)
4. [Alert Response Procedures](#alert-response-procedures)
5. [Alert Types and Runbooks](#alert-types-and-runbooks)
6. [SLA Targets](#sla-targets)
7. [Handoff Procedures](#handoff-procedures)

---

## Overview

AutoRenta's on-call rotation ensures 24/7 coverage for production incidents. This document defines responsibilities, escalation procedures, and response protocols for on-call engineers.

### Responsibilities

**On-Call Engineer**:
- Respond to PagerDuty/Opsgenie alerts within SLA (see below)
- Triage and resolve P0/P1 incidents
- Escalate to backup if unable to resolve within 30 minutes
- Document all incidents in incident log
- Update stakeholders via Slack #incidents channel

**Backup Engineer**:
- Available for escalation (15 minutes after initial page)
- Provide support and second opinion
- Take over if primary is unavailable

**Manager (Escalation Point)**:
- Final escalation point (30 minutes after backup)
- Authorize emergency procedures
- Coordinate with external vendors if needed

---

## On-Call Schedule

### Rotation Schedule

```
Week 1: Engineer A (Primary), Engineer B (Backup)
Week 2: Engineer B (Primary), Engineer C (Backup)
Week 3: Engineer C (Primary), Engineer A (Backup)
```

**Rotation Changes**: Every Monday at 9:00 AM ART

### Availability Requirements

- **Primary**: Must be available 24/7 during rotation week
- **Backup**: Must be reachable within 15 minutes
- **Manager**: Must be reachable within 30 minutes

### PTO and Coverage

- Request coverage at least 1 week in advance
- Update PagerDuty/Opsgenie schedule immediately
- Notify team in #on-call Slack channel

---

## Escalation Policy

### Level 1: Primary On-Call Engineer
- **Page**: Immediately via PagerDuty/Opsgenie
- **Expected Response**: 5 minutes (acknowledge)
- **Expected Resolution Start**: 15 minutes

### Level 2: Backup Engineer
- **When**: No acknowledgment after 15 minutes OR Primary requests help
- **Page**: PagerDuty/Opsgenie auto-escalates
- **Expected Response**: 5 minutes

### Level 3: Engineering Manager
- **When**: No resolution after 30 minutes OR multi-service outage
- **Page**: PagerDuty/Opsgenie auto-escalates
- **Expected Response**: 10 minutes
- **Authority**: Can authorize emergency procedures, vendor contact

### Level 4: CTO/VP Engineering
- **When**: Major outage (>1 hour) OR data breach suspected
- **Contact**: Manual phone call
- **Response**: 30 minutes

---

## Alert Response Procedures

### Step 1: Acknowledge (Within 5 minutes)

1. **Acknowledge alert** in PagerDuty/Opsgenie
2. **Post in #incidents Slack**: "Alert acknowledged: [ALERT_TITLE]"
3. **Check dashboard**: https://autorentar.com/admin/monitoring

```bash
# Quick health check
curl https://autorentar.com/health
```

### Step 2: Triage (Within 15 minutes)

1. **Assess severity**:
   - P0 (Critical): System down, payments failing, data breach
   - P1 (High): Degraded performance, partial outage
   - P2 (Medium): Non-critical errors, warnings

2. **Identify scope**:
   - Check error rates in Sentry
   - Review CloudflarePages logs
   - Check Supabase dashboard

3. **Determine impact**:
   - Users affected (all, subset, specific region)
   - Revenue impact
   - Data integrity concerns

### Step 3: Communicate (Immediately after triage)

**For P0 Alerts**:
```markdown
# Incident Update - [INCIDENT_ID]

**Status**: Investigating
**Started**: [TIME]
**Severity**: P0 - Critical
**Impact**: [DESCRIPTION]
**ETA**: Investigating (update in 15min)
**On-Call**: @engineer-name
```

Post in:
- #incidents (Slack)
- Update status page (if public-facing)

### Step 4: Investigate & Mitigate

**Use runbooks** (see below) for specific alert types.

**Common investigation tools**:
```bash
# Check Cloudflare Pages logs
wrangler pages deployment tail autorenta-web

# Check Supabase logs
# Dashboard > Edge Functions > [function] > Logs

# Check Sentry errors
# https://sentry.io/organizations/autorenta/issues/

# Database health
psql $DATABASE_URL -c "SELECT COUNT(*) FROM monitoring_health_checks WHERE status = 'down' AND created_at > NOW() - INTERVAL '10 minutes';"
```

### Step 5: Resolve & Document

1. **Verify resolution**:
   - Run health checks
   - Check error rates back to baseline
   - Confirm with affected users (if any)

2. **Resolve alert** in PagerDuty/Opsgenie

3. **Document in incident log**:
```markdown
## Incident: [TITLE]

**Date**: 2025-11-07 14:30 ART
**Duration**: 45 minutes
**Severity**: P0
**MTTD**: 3 minutes ✅
**MTTR**: 45 minutes ❌ (SLA: 30 min)

### Timeline
- 14:30 - Alert fired (payment failures detected)
- 14:33 - Acknowledged by Engineer A
- 14:45 - Root cause identified (MercadoPago API timeout)
- 15:15 - Mitigated (increased timeout, added retry logic)

### Root Cause
MercadoPago API experiencing elevated response times (>5s). Our timeout was set to 3s, causing failures.

### Resolution
- Updated timeout to 10s in supabase/functions/mercadopago-create-preference
- Added exponential backoff retry (3 attempts)
- Deployed at 15:10 ART

### Follow-up Actions
- [ ] Review all external API timeouts (#ticket-123)
- [ ] Add API response time monitoring (#ticket-124)
- [ ] Contact MercadoPago support for SLA clarification (#ticket-125)
```

4. **Post-incident review** (for P0 incidents):
   - Schedule within 48 hours
   - Invite on-call, backup, affected teams
   - Create action items

---

## Alert Types and Runbooks

### P0: Payment Failure

**Alert**: `payment_failure_critical`
**Runbook**: [docs/runbooks/payment-failure.md](./payment-failure.md)

**Quick Actions**:
1. Check MercadoPago status: https://status.mercadopago.com
2. Review recent deployments (last 2 hours)
3. Check Supabase Edge Function logs: `mercadopago-webhook`, `create-preference`
4. Verify database wallet balances consistency

### P0: Database Connection Failure

**Alert**: `database_connection_failure`
**Runbook**: [docs/runbooks/database-connection-failure.md](./database-connection-failure.md)

**Quick Actions**:
1. Check Supabase status: https://status.supabase.com
2. Verify connection pool limits
3. Check recent database migrations
4. Review slow query log

### P0: API Response Degradation

**Alert**: `api_response_degradation`
**Runbook**: [docs/runbooks/api-degradation.md](./api-degradation.md)

**Quick Actions**:
1. Check Cloudflare analytics for traffic spike
2. Review Edge Function cold starts
3. Check database query performance
4. Verify external API dependencies (MercadoPago, Mapbox)

### P0: Authentication Failure Spike

**Alert**: `auth_failure_spike`
**Runbook**: [docs/runbooks/auth-spike.md](./auth-spike.md)

**Quick Actions**:
1. Check for brute force attack patterns
2. Review recent authentication changes
3. Verify Supabase Auth service status
4. Consider rate limiting escalation

### P1: Error Rate Spike

**Alert**: `error_rate_spike`
**Runbook**: [docs/runbooks/error-spike.md](./error-spike.md)

**Quick Actions**:
1. Check Sentry for new error patterns
2. Review recent deployments
3. Verify third-party service status
4. Check frontend error logs

---

## SLA Targets

### Mean Time To Detect (MTTD)

**Target**: < 5 minutes

**Measurement**:
- Time from issue occurrence to alert creation
- Tracked in `monitoring_sla_metrics.detection_time_ms`

**How to achieve**:
- Health checks run every 5 minutes
- Real-time error tracking via Sentry
- Custom alert rules for critical metrics

### Mean Time To Respond (MTTR)

**Target**: < 30 minutes

**Measurement**:
- Time from alert notification to resolution
- Tracked in `monitoring_sla_metrics.resolution_time_ms`

**How to achieve**:
- Clear escalation policy
- Well-documented runbooks
- Pre-built mitigation scripts
- Regular incident drills

### False Positive Rate

**Target**: < 5%

**Measurement**:
- Percentage of alerts marked as false positives
- Tracked in `monitoring_sla_metrics.is_false_positive`

**How to reduce**:
- Tune alert thresholds based on historical data
- Use spike detection vs. absolute thresholds
- Implement alert cooldown periods
- Regular alert rule review

---

## Handoff Procedures

### Weekly Handoff (Monday 9:00 AM ART)

1. **Outgoing engineer** prepares:
```markdown
## On-Call Handoff - Week of [DATE]

### Open Incidents
- [List any ongoing incidents]

### Known Issues
- [List any known issues to watch]

### Recent Changes
- [Deployments in last week]
- [Configuration changes]

### Action Items
- [Any follow-up needed]

### Notes
- [Anything unusual to be aware of]
```

2. **Handoff meeting** (15 minutes):
   - Review open incidents
   - Discuss known issues
   - Transfer PagerDuty/Opsgenie ownership
   - Answer questions

3. **Incoming engineer** confirms:
   - PagerDuty/Opsgenie alerts working
   - Access to all systems
   - Reviewed recent incidents

---

## Emergency Contacts

### Internal

| Role | Primary | Backup | Phone |
|------|---------|--------|-------|
| **On-Call Engineer** | [Name] | [Name] | [Phone] |
| **Engineering Manager** | [Name] | - | [Phone] |
| **CTO** | [Name] | - | [Phone] |

### External Vendors

| Service | Contact | Emergency Phone | SLA |
|---------|---------|----------------|-----|
| **Supabase** | support@supabase.com | - | 4 hours (Pro plan) |
| **Cloudflare** | Enterprise support | +1-888-99-FLARE | 1 hour (Enterprise) |
| **MercadoPago** | developers@mercadopago.com | - | Best effort |
| **Sentry** | support@sentry.io | - | Best effort |

---

## Tools and Access

### Required Access

- [ ] PagerDuty/Opsgenie mobile app installed
- [ ] Cloudflare Pages access (autorenta-web)
- [ ] Supabase dashboard access (obxvffplochgeiclibng)
- [ ] Sentry access (autorenta organization)
- [ ] GitHub access (ecucondorSA/autorenta)
- [ ] Slack #incidents, #on-call channels
- [ ] AWS/infrastructure access (if applicable)

### Quick Links

- **Monitoring Dashboard**: https://autorentar.com/admin/monitoring
- **Sentry**: https://sentry.io/organizations/autorenta/
- **Cloudflare**: https://dash.cloudflare.com/
- **Supabase**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **Status Pages**:
  - Supabase: https://status.supabase.com
  - Cloudflare: https://www.cloudflarestatus.com
  - MercadoPago: https://status.mercadopago.com

---

## Training and Drills

### Onboarding Checklist

New on-call engineers must:
- [ ] Shadow on-call for 1 week
- [ ] Complete all runbook walkthroughs
- [ ] Participate in incident drill
- [ ] Verify access to all systems
- [ ] Review last 5 incidents

### Quarterly Incident Drills

**Schedule**: First Monday of each quarter

**Scenarios**:
1. Payment system failure
2. Database connection issues
3. DDoS attack simulation
4. Multi-region outage

**Goals**:
- Practice escalation procedures
- Verify runbooks are current
- Test communication protocols
- Measure MTTR

---

## Metrics and Reporting

### Weekly On-Call Report

Track and report:
- Total alerts received
- Alerts by severity (P0, P1, P2)
- Average MTTD
- Average MTTR
- SLA compliance rate
- False positive rate
- Incidents requiring escalation

### Monthly Review

Review:
- SLA trends
- Common alert types
- Runbook improvements needed
- Training gaps identified

---

**Document Owner**: Platform Engineering
**Review Frequency**: Quarterly
**Next Review**: 2026-02-07


---
# Source: QUICK_FIX_GOOGLE_CALENDAR_OAUTH.md

# Quick Fix: Google Calendar OAuth Error 400 redirect_uri_mismatch

## El Error

```
Error 400: redirect_uri_mismatch
redirect_uri: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

## La Solución Rápida (3 pasos)

### Paso 1: Actualizar Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Busca el Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
3. Click en el nombre para editar
4. En "Authorized redirect URIs", agrega:
   ```
   https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   ```
5. Click **SAVE**

### Paso 2: Actualizar Secret en Supabase

```bash
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

### Paso 3: Verificar y Probar

```bash
# Verificar secret
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI

# Verificar Edge Function
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar
```

Luego prueba conectando Google Calendar desde http://localhost:4200/profile

## Checklist de Verificación

- [ ] Redirect URI agregado en Google Cloud Console
- [ ] Secret `GOOGLE_OAUTH_REDIRECT_URI` actualizado en Supabase
- [ ] Edge Function `google-calendar-oauth` está activa
- [ ] Test users agregados en Google OAuth Consent Screen (si está en modo Testing)
- [ ] Probado desde la app y funciona

## URIs Correctos

### Para Google Calendar (Staging - pisqjmoklivzpwufhscx)
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

### Para Google Auth Login (Producción - obxvffplochgeiclibng)
```
https://obxvffplochgeiclibng.supabase.co/auth/v1/callback
```

**IMPORTANTE**: No confundir estos dos URIs. Son para flujos OAuth diferentes.

## Si Sigue Fallando

1. **Limpiar cache del navegador** (o usar incógnito)
2. **Esperar 1-2 minutos** después de cambiar en Google Cloud Console
3. **Verificar que no haya espacios** al inicio/final del redirect URI
4. **Revisar logs de Edge Function**:
   ```bash
   supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
   ```
5. **Verificar test users** en Google Cloud Console (OAuth Consent Screen)

## Documentación Completa

Para más detalles, ver:
- `/home/edu/autorenta/docs/runbooks/fix-google-calendar-redirect-uri-mismatch.md`
- `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`

---

**Última actualización**: 2025-11-13


---
# Source: secret-rotation.md

# 🔄 Runbook: Secret Rotation

## Cuándo Rotar Secrets

### Rotación Programada
- **Cada 90 días**: Mercado Pago access tokens
- **Cada 180 días**: API keys de terceros (Mapbox, etc)
- **Cada 365 días**: Database passwords
- **Según política del servicio**: Cloudflare, Supabase

### Rotación Inmediata (Incident Response)
- **Secret expuesto en Git**: Rotar INMEDIATAMENTE
- **Secret en logs**: Rotar mismo día
- **Offboarding de miembro del equipo**: Rotar dentro de 24hrs
- **Sospecha de compromiso**: Rotar inmediatamente

## Pre-Requisitos

```bash
# Herramientas necesarias
gh auth status  # GitHub CLI
wrangler --version  # Cloudflare CLI
supabase --version  # Supabase CLI
psql --version  # PostgreSQL client

# Accesos necesarios
# - Admin en GitHub repo
# - Admin en Supabase project
# - Admin en Cloudflare account
# - Admin en Mercado Pago developer account
```

## 1. Mercado Pago Access Token

### Generar Nuevo Token

1. **Login a Mercado Pago**
   - https://www.mercadopago.com.ar/developers/panel

2. **Ir a Credenciales**
   - Panel → Tus integraciones → Credenciales

3. **Generar nuevo Access Token**
   - Producción → Crear credenciales
   - Copiar Access Token (comienza con `APP-`)
   - Copiar Public Key

### Actualizar en GitHub Actions

```bash
# Set new token
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN \
  -b"APP-XXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXX"

gh secret set MERCADOPAGO_PROD_PUBLIC_KEY \
  -b"APP_USR-XXXXXXXX-XXXXXX-XXXX-XXXX-XXXXXXXXXXXX"

# Verify
gh secret list | grep MERCADOPAGO
```

### Actualizar en Cloudflare Workers

```bash
cd apps/workers/mercadopago

# Update secret
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Paste new token when prompted

# Verify (lista secrets pero no muestra valores)
wrangler secret list
```

### Actualizar en Supabase Edge Functions

```bash
# Set new secret
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP-XXXXXXXXXXXX...

# Verify
supabase secrets list
```

### Verificar Funcionamiento

```bash
# Test payment endpoint
curl -X POST https://tu-worker.workers.dev/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Test rotation"
  }'

# O usar script de verificación
cd /home/edu/autorenta
./verify-real-payments.sh
```

### Revocar Token Anterior

1. Volver a MP Dashboard → Credenciales
2. Encontrar token anterior en lista
3. Click en "..." → Eliminar
4. Confirmar revocación

## 2. Supabase Keys

### Anon Key (Public)

1. **Dashboard**
   - https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api

2. **Generar Nueva Key**
   - Settings → API → Anon Key → Regenerate
   - Copiar nueva key

3. **Actualizar GitHub Secrets**
```bash
gh secret set SUPABASE_ANON_KEY \
  -b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

4. **Actualizar en aplicación**
```bash
# Regenerar build con nueva key
cd apps/web
npm run build

# Deploy
# (El CI/CD tomará la nueva key de GitHub Secrets)
```

### Service Role Key (Private)

⚠️ **CRÍTICO**: Solo rotar si hay compromiso confirmado

1. **Dashboard → Settings → API**
2. **Service Role Key → Regenerate**
3. **Actualizar TODOS los secrets stores**:

```bash
# GitHub Actions
gh secret set SUPABASE_SERVICE_ROLE_KEY -b"eyJ..."

# Cloudflare Workers
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Supabase Edge Functions (se autoactualiza)

# Local development
# Editar .env.local manualmente
```

## 3. Database Password

⚠️ **ALTO IMPACTO**: Requiere coordinación

### Preparación

```bash
# 1. Notificar al equipo
# 2. Programar ventana de mantenimiento
# 3. Backup completo de DB
pg_dump "$DB_URL" > backup_before_password_rotation_$(date +%Y%m%d).sql
```

### Cambiar Password en Supabase

1. **Dashboard → Settings → Database**
2. **Database password → Reset password**
3. **Copiar nueva password**

### Actualizar DATABASE_URL

```bash
# Nueva URL con nueva password
NEW_DB_URL="postgresql://postgres.obxvffplochgeiclibng:<NEW_PASSWORD>@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# GitHub Actions
gh secret set DATABASE_URL -b"$NEW_DB_URL"
gh secret set DB_PASSWORD -b"<NEW_PASSWORD>"

# Local .env.local
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=<NEW_PASSWORD>/" .env.local
sed -i "s/:ECUCONDOR08122023@/:NEW_PASSWORD@/" .env.local
```

### Verificar Conectividad

```bash
# Test connection
export PGPASSWORD=<NEW_PASSWORD>
psql "$NEW_DB_URL" -c "SELECT NOW();"

# Test scripts
cd /home/edu/autorenta
./apply_migration.sh supabase/migrations/test.sql
```

## 4. Mapbox Access Token

### Generar Nuevo Token

1. **Login a Mapbox**
   - https://account.mapbox.com/access-tokens/

2. **Create a token**
   - Name: AutoRenta Production - 2025-10
   - Scopes: `styles:read`, `fonts:read`, `datasets:read`
   - URL restrictions: `https://autorenta-web.pages.dev/*`

3. **Copy token** (starts with `pk.`)

### Actualizar Secrets

```bash
# GitHub Actions
gh secret set MAPBOX_ACCESS_TOKEN -b"pk.eyJ..."

# Variables de aplicación
gh secret set NG_APP_MAPBOX_ACCESS_TOKEN -b"pk.eyJ..."
```

### Revocar Token Anterior

1. Account → Access Tokens
2. Find old token
3. Click trash icon → Delete

## 5. Cloudflare API Token

### Crear Nuevo Token

1. **Dashboard**
   - https://dash.cloudflare.com/profile/api-tokens

2. **Create Token**
   - Template: "Edit Cloudflare Workers"
   - Permissions:
     - Account / Workers Scripts / Edit
     - Account / Workers KV Storage / Edit
   - Account Resources: Include / Your Account

3. **Copy token**

### Actualizar GitHub Actions

```bash
gh secret set CLOUDFLARE_API_TOKEN -b"<NEW_TOKEN>"
```

### Revocar Token Anterior

1. API Tokens page
2. Find old token → Roll / Revoke

## Checklist Post-Rotación

Usar este checklist para CADA rotación:

### Validación Técnica
- [ ] Secret actualizado en GitHub Actions
- [ ] Secret actualizado en Cloudflare Workers (si aplica)
- [ ] Secret actualizado en Supabase Edge Functions (si aplica)
- [ ] Secret actualizado en .env.local
- [ ] GitHub Actions workflows passing (check último run)
- [ ] Test payment/request exitoso
- [ ] No hay errores en logs

### Validación de Aplicación
- [ ] Login funciona
- [ ] Crear/editar auto funciona  
- [ ] Hacer reserva funciona
- [ ] Pago con MP funciona
- [ ] Mapbox geocoding funciona (si aplica)
- [ ] Edge functions responden

### Cleanup
- [ ] Token/key anterior revocado en servicio origen
- [ ] Documentado en `docs/SECRET_ROTATION_LOG.md`
- [ ] Equipo notificado de rotación completada
- [ ] Próxima fecha de rotación agendada

## Logging de Rotaciones

**Archivo**: `docs/SECRET_ROTATION_LOG.md`

```markdown
# Secret Rotation Log

| Fecha | Secret | Razón | Ejecutado Por | Verificado |
|-------|--------|-------|---------------|------------|
| 2025-10-28 | MERCADOPAGO_PROD_ACCESS_TOKEN | Scheduled 90d | Eduardo | ✅ |
| 2025-10-15 | SUPABASE_ANON_KEY | Accidental exposure | Eduardo | ✅ |
```

## Troubleshooting

### Error: GitHub Actions failing después de rotación

```bash
# Ver logs del workflow
gh run list --limit 5
gh run view <RUN_ID> --log

# Verificar que secret se seteo correctamente
gh secret list

# Re-run workflow
gh run rerun <RUN_ID>
```

### Error: Cloudflare Worker no usa nuevo secret

```bash
# Los secrets se actualizan en próximo deploy
cd apps/workers/mercadopago
wrangler deploy

# Verificar
curl https://tu-worker.workers.dev/health
```

### Error: "Invalid credentials" después de rotación

```bash
# Verificar que copiaste el token completo (sin espacios)
# Verificar que no expiraste el nuevo token por error
# Verificar permisos/scopes del nuevo token
```

## Emergency Rollback

Si el nuevo secret causa problemas:

```bash
# 1. Obtener secret anterior (si lo guardaste)
# 2. Revertir rápidamente
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<OLD_TOKEN>"

# 3. Trigger redeploy
gh workflow run deploy.yml

# 4. Investigar por qué falló el nuevo
# 5. Re-intentar rotación con fix
```

## Automation (Futuro)

```yaml
# .github/workflows/scheduled-secret-rotation.yml
name: Secret Rotation Reminder

on:
  schedule:
    - cron: '0 9 1 * *' # 9am primer día del mes

jobs:
  check-rotation:
    runs-on: ubuntu-latest
    steps:
      - name: Check last rotation dates
        run: |
          echo "🔄 Verificar últimas rotaciones en docs/SECRET_ROTATION_LOG.md"
          echo "Mercado Pago: Cada 90 días"
          echo "Mapbox: Cada 180 días"
```

## Referencias

- [Mercado Pago Credentials](https://www.mercadopago.com.ar/developers/panel/credentials)
- [Supabase API Settings](https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api)
- [Mapbox Tokens](https://account.mapbox.com/access-tokens/)
- [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support Contacts

- **Mercado Pago**: https://www.mercadopago.com.ar/developers/es/support
- **Supabase**: support@supabase.io
- **Cloudflare**: https://support.cloudflare.com/


---
# Source: split-payment-failure.md

# 🚨 Runbook: Split Payment Failure

## Descripción

Cuando una reserva se completa pero el locador no recibe su porcentaje del pago automáticamente.

## Síntomas

- Reserva con `payment_status = 'approved'` en tabla `bookings`
- Locador reporta no haber recibido su pago
- Wallet de la plataforma tiene fondos pero no se distribuyeron
- Logs de Edge Function `mercadopago-create-booking-preference` muestran errores

## Causas Comunes

1. **Webhook no se ejecutó**: Mercado Pago no envió notificación
2. **Split payment falló**: Error en API de MP al momento del split
3. **Onboarding incompleto**: Locador no completó onboarding de MP
4. **Auto publicado prematuramente**: `status='active'` aunque MP onboarding pendiente

## Diagnóstico

### 1. Verificar Estado de la Reserva

```sql
-- Conectar a Supabase
-- psql postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres

SELECT 
  b.id as booking_id,
  b.transaction_id,
  b.total_price,
  b.status as booking_status,
  b.payment_status,
  b.created_at,
  c.id as car_id,
  c.owner_id,
  u.email as owner_email
FROM bookings b
JOIN cars c ON c.id = b.car_id
JOIN users u ON u.id = c.owner_id
WHERE b.id = '<BOOKING_ID>'
  OR b.transaction_id = '<TRANSACTION_ID>';
```

### 2. Verificar Split en Mercado Pago

```bash
# Usando MP API
export MP_TOKEN="<MERCADOPAGO_ACCESS_TOKEN>"
export PAYMENT_ID="<PAYMENT_ID_FROM_BOOKING>"

curl -X GET \
  "https://api.mercadopago.com/v1/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $MP_TOKEN"

# Buscar en respuesta:
# "split_payments": [] // Si vacío, el split NO se ejecutó
```

### 3. Verificar Onboarding del Locador

```sql
SELECT 
  id,
  email,
  mercadopago_collector_id,
  mercadopago_onboarding_completed
FROM users
WHERE id = '<OWNER_ID>';
```

## Soluciones

### Solución 1: Split Manual (Si onboarding completado)

```bash
# 1. Obtener datos
PAYMENT_ID="<PAYMENT_ID>"
OWNER_MP_ID="<MERCADOPAGO_COLLECTOR_ID>"
# MODELO COMODATO: Owner no recibe pago directo
# Distribución: Fee variable plataforma, reward pool, FGO
PLATFORM_FEE="0.15"
REWARD_POOL="0.75"
FGO="0.10"
TOTAL_AMOUNT="<BOOKING_TOTAL_PRICE>"

# 2. Calcular monto locador
OWNER_AMOUNT=$(echo "$TOTAL_AMOUNT * $OWNER_PERCENTAGE" | bc)

# 3. Ejecutar split via API
curl -X POST \
  "https://api.mercadopago.com/v1/advanced_payments" \
  -H "Authorization: Bearer $MP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payer": {
      "id": "'$PAYMENT_ID'"
    },
    "disbursements": [
      {
        "collector_id": "'$OWNER_MP_ID'",
        "amount": '$OWNER_AMOUNT',
        "application_fee": 0
      }
    ]
  }'
```

### Solución 2: Liberar Fondos desde Wallet (Si onboarding incompleto)

```sql
-- SOLO si el locador NO tiene MP onboarding completado
-- Usar sistema de wallet interno

BEGIN;

-- 1. Obtener datos
WITH booking_data AS (
  SELECT 
    b.id as booking_id,
    b.total_price,
    b.transaction_id,
    c.owner_id,
    -- MODELO COMODATO: owner no recibe pago directo
    0 as owner_amount,
    (b.total_price * 0.15) as platform_fee,
    (b.total_price * 0.75) as reward_pool,
    (b.total_price * 0.10) as fgo
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.transaction_id = '<TRANSACTION_ID>'
)

-- 2. Crear entrada en wallet_ledger para locador
INSERT INTO wallet_ledger (
  user_id,
  transaction_type,
  amount,
  currency,
  booking_id,
  description,
  status
)
SELECT 
  owner_id,
  'booking_payout',
  owner_amount,
  'ARS',
  booking_id,
  'Manual release - Booking #' || booking_id,
  'completed'
FROM booking_data;

-- 3. Actualizar balance del locador
UPDATE wallet_balances
SET 
  balance = balance + (SELECT owner_amount FROM booking_data),
  updated_at = NOW()
WHERE user_id = (SELECT owner_id FROM booking_data);

-- 4. Marcar booking como distribuido
UPDATE bookings
SET 
  payout_status = 'completed',
  updated_at = NOW()
WHERE transaction_id = '<TRANSACTION_ID>';

COMMIT;
```

### Solución 3: Reejecutar Webhook

```bash
# Si el webhook nunca llegó, forzar reenvío desde MP
PAYMENT_ID="<PAYMENT_ID>"

curl -X POST \
  "https://api.mercadopago.com/v1/payments/$PAYMENT_ID/webhook_retry" \
  -H "Authorization: Bearer $MP_TOKEN"
```

## Prevención

### 1. Validar Onboarding Antes de Publicar Auto

**Archivo a modificar**: `apps/web/src/app/owner/publish-car-v2.page.ts`

Agregar validación en línea ~1540:
```typescript
if (this.mercadoPagoOnboardingCompleted) {
  carData.status = 'active';
} else {
  carData.status = 'pending_onboarding';
  // Mostrar alerta al locador
}
```

### 2. Monitorear Split Payments

Crear alerta automática:
```sql
-- Encontrar pagos sin split después de 1 hora
SELECT 
  b.id,
  b.transaction_id,
  b.created_at,
  u.email
FROM bookings b
JOIN cars c ON c.id = b.car_id
JOIN users u ON u.id = c.owner_id
WHERE b.payment_status = 'approved'
  AND b.payout_status IS NULL
  AND b.created_at < NOW() - INTERVAL '1 hour';
```

### 3. Webhook Resiliente

- Implementar retry automático (3 intentos con backoff exponencial)
- Loggear todos los intentos en `webhook_logs` table
- Dashboard admin para revisar failures

## Verificación Post-Fix

```sql
-- Confirmar que el locador recibió el pago
SELECT 
  wl.id,
  wl.transaction_type,
  wl.amount,
  wl.status,
  wl.created_at,
  wb.balance as current_balance
FROM wallet_ledger wl
JOIN wallet_balances wb ON wb.user_id = wl.user_id
WHERE wl.user_id = '<OWNER_ID>'
  AND wl.booking_id = '<BOOKING_ID>';
```

## Escalación

Si ninguna solución funciona:
1. Documentar en `docs/SPLIT_PAYMENT_INCIDENTS.md`
2. Contactar soporte Mercado Pago: https://www.mercadopago.com.ar/developers/es/support
3. Ofrecer compensación manual al locador vía transferencia bancaria

## Referencias

- [Mercado Pago Split Payments](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/payment-management/split-payments)
- [Webhook Troubleshooting](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- Código: `supabase/functions/mercadopago-create-booking-preference/index.ts:312-337`


---
# Source: troubleshooting.md

# 🔧 Runbook: Troubleshooting General - AutoRenta

**Última actualización**: 2025-11-03  
**Versión**: 1.0.0

## Índice Rápido

- [Síntomas Comunes](#síntomas-comunes)
- [Diagnóstico Rápido](#diagnóstico-rápido)
- [Problemas por Categoría](#problemas-por-categoría)
- [Herramientas de Diagnóstico](#herramientas-de-diagnóstico)
- [Escalación](#escalación)

---

## Síntomas Comunes

### 🚨 Críticos (Impacto Alto)

| Síntoma | Categoría | Runbook Específico |
|---------|-----------|-------------------|
| Pagos no llegan al locador | 💳 Payment | [split-payment-failure.md](./split-payment-failure.md) |
| Webhook de MercadoPago no responde | 🔔 Webhook | [Ver sección Webhooks](#webhooks) |
| Base de datos no responde | 🗄️ Database | [database-backup-restore.md](./database-backup-restore.md) |
| Aplicación no carga | 🌐 Frontend | [Ver sección Frontend](#frontend) |
| Usuarios no pueden autenticarse | 🔐 Auth | [Ver sección Autenticación](#autenticación) |

### ⚠️ Altos (Impacto Medio)

| Síntoma | Categoría | Acción |
|---------|-----------|--------|
| Autos no aparecen en el mapa | 🗺️ Maps | [Ver sección Mapbox](#mapbox) |
| Imágenes no cargan | 📸 Storage | [Ver sección Storage](#storage) |
| Reservas duplicadas | 📅 Bookings | [Ver sección Bookings](#bookings) |
| Performance lenta | ⚡ Performance | [Ver sección Performance](#performance) |

---

## Diagnóstico Rápido

### 1. Verificar Estado de Servicios

```bash
# Verificar Cloudflare Pages
curl -I https://autorenta-web.pages.dev

# Verificar Supabase
curl -I https://obxvffplochgeiclibng.supabase.co/rest/v1/

# Verificar Edge Functions
curl -I https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

### 2. Verificar Logs de Cloudflare

```bash
# Ver logs de Pages (requiere Cloudflare API token)
wrangler pages deployment tail autorenta-web

# Ver logs de Workers (si está deployado)
wrangler tail payments_webhook
```

### 3. Verificar Logs de Supabase

```bash
# Ver logs de Edge Functions
supabase functions logs mercadopago-webhook --limit 50

# Ver logs de database (via Dashboard)
# https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs
```

### 4. Verificar Estado de Base de Datos

```sql
-- Conectar a Supabase
export DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

-- Verificar conexiones activas
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'postgres';

-- Verificar tamaño de DB
SELECT pg_size_pretty(pg_database_size('postgres')) as db_size;

-- Verificar últimas transacciones
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC
LIMIT 10;
```

---

## Problemas por Categoría

### 🔐 Autenticación

#### Problema: Usuarios no pueden iniciar sesión

**Síntomas**:
- Error 401 en `/auth/login`
- "Invalid credentials" en UI
- "No se pudo contactar con Supabase" error
- Supabase Auth retorna error

**Diagnóstico**:

```bash
# 0. FIRST: Check if Supabase is paused (most common issue!)
./tools/diagnose-supabase.sh

# 1. Verificar configuración de Supabase
curl https://obxvffplochgeiclibng.supabase.co/rest/v1/ \
  -H "apikey: $(grep NG_APP_SUPABASE_ANON_KEY apps/web/.env.development.local | cut -d'=' -f2)"

# 2. Verificar usuarios en DB
psql "$DB_URL" -c "
  SELECT id, email, created_at, last_sign_in_at
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 10;
"

# 3. Verificar políticas RLS
psql "$DB_URL" -c "
  SELECT tablename, policyname, permissive, roles, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'profiles';
"
```

**Soluciones**:

0. **🚨 CRITICAL: Supabase Project Paused** (most common):
   - **Symptom**: All endpoints return "Access denied"
   - **Cause**: Free tier projects pause after 7 days of inactivity
   - **Fix**: Login to [Supabase Dashboard](https://supabase.com/dashboard/project/obxvffplochgeiclibng) and click "Restore Project"
   - **Full Guide**: See `SUPABASE_PAUSED_FIX.md` for detailed instructions
   - **Prevention**: Setup keepalive or upgrade to Pro ($25/month)

1. **Credenciales incorrectas**:
   - Verificar que usuario existe: `SELECT * FROM auth.users WHERE email = 'user@example.com';`
   - Resetear password: Dashboard → Authentication → Users → Reset Password

2. **RLS bloqueando acceso**:
   ```sql
   -- Verificar políticas activas
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   
   -- Deshabilitar temporalmente para debug (solo en dev)
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   -- Luego re-habilitar
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

3. **Token expirado**:
   - Limpiar localStorage: `localStorage.clear()`
   - Re-login desde cero

**Referencia**: `apps/web/src/app/core/services/auth.service.ts`

---

### 💳 Payment & Webhooks

#### Problema: Webhook de MercadoPago no se ejecuta

**Síntomas**:
- Pago aprobado en MercadoPago pero booking sigue en `pending`
- Logs de Edge Function no muestran actividad
- Usuario reporta pago no procesado

**Diagnóstico**:

```bash
# 1. Verificar última ejecución del webhook
supabase functions logs mercadopago-webhook --limit 20

# 2. Verificar configuración en MercadoPago
# Dashboard MP → Configuración → Webhooks
# URL debe ser: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

# 3. Verificar bookings pendientes
psql "$DB_URL" -c "
  SELECT 
    b.id,
    b.transaction_id,
    b.payment_status,
    b.created_at,
    p.preference_id
  FROM bookings b
  LEFT JOIN payment_intents p ON p.booking_id = b.id
  WHERE b.payment_status = 'pending'
  AND b.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY b.created_at DESC;
"
```

**Soluciones**:

1. **Webhook no configurado en MP**:
   - Ir a: https://www.mercadopago.com.ar/developers/panel/app
   - Configurar webhook URL
   - Verificar firma del webhook

2. **Edge Function caída**:
   ```bash
   # Verificar deployment
   supabase functions list
   
   # Re-deploy si es necesario
   supabase functions deploy mercadopago-webhook
   ```

3. **Re-ejecutar webhook manualmente**:
   ```bash
   # Obtener payment_id desde booking
   PAYMENT_ID="<payment_id_from_booking>"
   
   # Re-enviar desde MercadoPago (requiere API token)
   curl -X POST \
     "https://api.mercadopago.com/v1/payments/$PAYMENT_ID/webhook_retry" \
     -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN"
   ```

**Referencia**: `supabase/functions/mercadopago-webhook/index.ts`

---

#### Problema: Split payment falla

Ver [split-payment-failure.md](./split-payment-failure.md)

---

### 🗄️ Database

#### Problema: Queries lentas o timeouts

**Síntomas**:
- Página carga lenta (> 5 segundos)
- Errores 504 Gateway Timeout
- Pool de conexiones agotado

**Diagnóstico**:

```sql
-- Verificar queries activas
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  NOW() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Verificar conexiones
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;

-- Verificar índices faltantes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE 
    WHEN seq_scan > 0 THEN (seq_tup_read / seq_scan)::numeric(10,2)
    ELSE 0
  END as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan * 10
ORDER BY seq_tup_read DESC;
```

**Soluciones**:

1. **Queries sin índice**:
   ```sql
   -- Agregar índice según query problemática
   CREATE INDEX CONCURRENTLY idx_bookings_car_id_created 
   ON bookings(car_id, created_at DESC);
   ```

2. **Pool agotado**:
   - Aumentar pool size en Supabase Dashboard
   - O usar direct connection para operaciones pesadas

3. **N+1 queries**:
   - Verificar código de servicios
   - Usar JOINs o batch queries

**Referencia**: `docs/runbooks/database-backup-restore.md`

---

### 🌐 Frontend

#### Problema: Build falla en producción

**Síntomas**:
- GitHub Actions falla en step "Build"
- Errores de TypeScript
- Errores de linting

**Diagnóstico**:

```bash
# 1. Reproducir build localmente
cd apps/web
npm run build

# 2. Ver errores específicos
npm run build 2>&1 | tee build-errors.log

# 3. Verificar linting
npm run lint

# 4. Verificar tipos
npx tsc --noEmit
```

**Soluciones**:

1. **Errores TypeScript**:
   ```bash
   # Auto-fix si es posible
   npm run lint:fix
   
   # O corregir manualmente según error
   ```

2. **Dependencias faltantes**:
   ```bash
   # Reinstalar
   pnpm install --frozen-lockfile
   ```

3. **Variables de entorno faltantes**:
   ```bash
   # Verificar .env.development.local
   cat apps/web/.env.development.local
   
   # Generar si es necesario
   cd apps/web && node scripts/generate-env.js
   ```

**Referencia**: `.github/workflows/build-and-deploy.yml`

---

#### Problema: Aplicación no carga (white screen)

**Síntomas**:
- Página en blanco después de cargar
- Console muestra errores JavaScript
- Network tab muestra 404s

**Diagnóstico**:

```bash
# 1. Verificar deployment en Cloudflare
wrangler pages deployment list autorenta-web

# 2. Verificar build artifacts
curl -I https://autorenta-web.pages.dev/

# 3. Verificar console errors (en browser)
# Abrir DevTools → Console
```

**Soluciones**:

1. **Archivos estáticos no encontrados**:
   - Verificar paths en `angular.json`
   - Verificar base href en `index.html`

2. **Variables de entorno faltantes**:
   ```bash
   # Verificar env.js en producción
   curl https://autorenta-web.pages.dev/env.js
   
   # Debe contener: SUPABASE_URL, SUPABASE_ANON_KEY
   ```

3. **Rollback a versión anterior**:
   ```bash
   # Via Cloudflare Dashboard
   # O via wrangler
   wrangler pages deployment rollback autorenta-web --deployment-id=<id>
   ```

---

### 🗺️ Mapbox

#### Problema: Mapa no carga o no muestra marcadores

**Síntomas**:
- Mapa en blanco
- Marcadores no aparecen
- Error "Mapbox token invalid"

**Diagnóstico**:

```bash
# 1. Verificar token de Mapbox
grep MAPBOX_ACCESS_TOKEN apps/web/.env.development.local

# 2. Verificar en browser console
# Buscar errores de Mapbox API

# 3. Verificar autos en DB
psql "$DB_URL" -c "
  SELECT 
    id,
    title,
    latitude,
    longitude,
    status,
    created_at
  FROM cars
  WHERE status = 'active'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  LIMIT 10;
"
```

**Soluciones**:

1. **Token inválido o expirado**:
   - Verificar en Mapbox Dashboard: https://account.mapbox.com/access-tokens/
   - Rotar token si es necesario
   - Actualizar en Supabase secrets y GitHub secrets

2. **Autos sin coordenadas**:
   ```sql
   -- Verificar autos sin ubicación
   SELECT COUNT(*) FROM cars 
   WHERE status = 'active' 
   AND (latitude IS NULL OR longitude IS NULL);
   ```

3. **Límite de requests alcanzado**:
   - Verificar uso en Mapbox Dashboard
   - Considerar upgrade de plan

**Referencia**: `apps/web/src/app/shared/components/map/map.component.ts`

---

### 📸 Storage

#### Problema: Imágenes no cargan (avatars, car photos)

**Síntomas**:
- Imágenes rotas (404)
- Error "Storage policy violation"
- Uploads fallan

**Diagnóstico**:

```sql
-- Verificar políticas de storage
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- Verificar archivos en storage
-- Via Supabase Dashboard → Storage
```

**Soluciones**:

1. **RLS bloqueando acceso**:
   ```sql
   -- Verificar políticas (no deshabilitar en producción)
   -- Las políticas deben verificar: (storage.foldername(name))[1] = auth.uid()::text
   ```

2. **Path incorrecto**:
   ```typescript
   // ✅ CORRECTO - Sin bucket prefix
   const filePath = `${userId}/${filename}`;
   
   // ❌ INCORRECTO
   const filePath = `avatars/${userId}/${filename}`;
   ```

3. **Bucket no existe**:
   ```bash
   # Verificar buckets
   supabase storage list-buckets
   
   # Crear si falta
   supabase storage create-bucket avatars --public
   ```

**Referencia**: `CLAUDE.md` - Sección "Supabase Storage Architecture"

---

### 📅 Bookings

#### Problema: Reservas duplicadas

**Síntomas**:
- Múltiples bookings con mismo `transaction_id`
- Usuario reporta doble cobro
- Wallet muestra múltiples transacciones

**Diagnóstico**:

```sql
-- Encontrar duplicados
SELECT 
  transaction_id,
  COUNT(*) as count,
  array_agg(id) as booking_ids,
  array_agg(created_at) as created_times
FROM bookings
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;

-- Verificar atomicidad
SELECT 
  id,
  transaction_id,
  status,
  payment_status,
  created_at
FROM bookings
WHERE id IN (<booking_ids_from_above>)
ORDER BY created_at;
```

**Soluciones**:

1. **Revertir booking duplicado**:
   ```sql
   BEGIN;
   
   -- Marcar como cancelado
   UPDATE bookings 
   SET status = 'cancelled',
       cancellation_reason = 'Duplicate booking'
   WHERE id = '<duplicate_booking_id>';
   
   -- Reembolsar si ya pagó
   -- (Ver runbook de split-payment para reversión)
   
   COMMIT;
   ```

2. **Prevenir futuros duplicados**:
   ```sql
   -- Agregar constraint único
   ALTER TABLE bookings 
   ADD CONSTRAINT unique_transaction_id 
   UNIQUE (transaction_id);
   ```

**Referencia**: `apps/web/src/app/core/services/bookings.service.ts`

---

### ⚡ Performance

#### Problema: Aplicación lenta

**Síntomas**:
- Tiempo de carga > 3 segundos
- Queries lentas
- Bundle size grande

**Diagnóstico**:

```bash
# 1. Verificar bundle size
cd apps/web
npm run build
ls -lh dist/web/

# 2. Analizar con Lighthouse
# Abrir DevTools → Lighthouse → Run audit

# 3. Verificar queries lentas (ver sección Database)
```

**Soluciones**:

1. **Bundle size grande**:
   ```bash
   # Analizar bundle
   npm run build -- --stats-json
   npx webpack-bundle-analyzer dist/web/stats.json
   
   # Optimizar imports
   # Usar lazy loading para features pesadas
   ```

2. **Queries N+1**:
   - Verificar servicios que hacen loops
   - Usar batch queries o JOINs

3. **Imágenes sin optimizar**:
   - Usar CDN para imágenes
   - Implementar lazy loading de imágenes
   - Comprimir imágenes antes de upload

---

## Herramientas de Diagnóstico

### Scripts Útiles

```bash
# Verificar estado completo del sistema
./tools/check-auth.sh

# Ver logs de todos los servicios
./tools/claude-workflows.sh status

# Backup antes de cambios
./docs/runbooks/database-backup-restore.sh
```

### Dashboards

- **Cloudflare**: https://dash.cloudflare.com/
- **Supabase**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **MercadoPago**: https://www.mercadopago.com.ar/developers/panel
- **GitHub Actions**: https://github.com/ecucondorSA/autorenta/actions

---

## Escalación

### Niveles de Escalación

1. **Nivel 1 - Developer**: Problemas comunes (este runbook)
2. **Nivel 2 - Arquitecto**: Problemas de infraestructura o arquitectura
3. **Nivel 3 - Vendor Support**: Supabase, Cloudflare, MercadoPago

### Cuándo Escalar

- **Nivel 2**: Problemas que requieren cambios arquitectónicos
- **Nivel 3**: 
  - Incidentes de seguridad
  - Pérdida de datos
  - Downtime prolongado (> 1 hora)

### Contactos

- **Supabase Support**: https://supabase.com/support
- **Cloudflare Support**: https://dash.cloudflare.com/?to=/:account/support
- **MercadoPago Support**: https://www.mercadopago.com.ar/developers/es/support

---

## Checklist de Troubleshooting

Antes de escalar, verificar:

- [ ] ¿Se verificaron los logs de todos los servicios?
- [ ] ¿Se verificó el estado de la base de datos?
- [ ] ¿Se verificó la configuración de secrets?
- [ ] ¿Se intentaron las soluciones del runbook específico?
- [ ] ¿Se documentó el problema y solución?
- [ ] ¿Se creó backup antes de cambios?

---

## Referencias

- [Runbook: Split Payment Failure](./split-payment-failure.md)
- [Runbook: Database Backup & Restore](./database-backup-restore.md)
- [Runbook: Secret Rotation](./secret-rotation.md)
- [CLAUDE.md](../../CLAUDE.md) - Arquitectura del proyecto
- [Disaster Recovery Plan](../disaster-recovery-plan.md)

---

**Última revisión**: 2025-11-03  
**Mantenedor**: Equipo de Desarrollo AutoRenta













