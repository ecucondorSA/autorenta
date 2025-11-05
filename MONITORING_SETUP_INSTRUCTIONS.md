# 🚀 Instrucciones de Setup del Sistema de Monitoreo

**Fecha**: 2025-11-03  
**Estado**: Edge Functions desplegadas ✅

---

## ✅ Completado

1. ✅ Edge Functions desplegadas:
   - `monitoring-health-check` ✅
   - `monitoring-alerts` ✅
   - `monitoring-metrics` ✅

---

## 📋 Pasos Pendientes

### Paso 1: Aplicar Schema de Base de Datos

**Opción A: Via Supabase Dashboard (Recomendado)**

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new
2. Abrir el archivo: `database/monitoring_setup.sql`
3. Copiar todo el contenido
4. Pegar en el editor SQL
5. Click en **"Run"** o presionar `Ctrl+Enter`

**Opción B: Via psql (si tienes acceso directo)**

```bash
psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@db.obxvffplochgeiclibng.supabase.co:5432/postgres" -f database/monitoring_setup.sql
```

**Verificar que se crearon las tablas**:
```sql
-- En Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'monitoring%'
ORDER BY table_name;
```

**Debe mostrar**:
- `monitoring_alert_notifications`
- `monitoring_alerts`
- `monitoring_health_checks`
- `monitoring_performance_metrics`

---

### Paso 2: Configurar Secrets

**Ya configurado**:
- ✅ `PRODUCTION_URL` = `https://autorenta.com`

**Pendiente - Configurar Slack Webhook**:

```bash
# Obtener webhook URL de Slack:
# 1. Ir a https://api.slack.com/apps
# 2. Crear nueva app o seleccionar existente
# 3. Features > Incoming Webhooks > Activate
# 4. Add New Webhook to Workspace
# 5. Seleccionar canal (ej: #monitoring)
# 6. Copiar Webhook URL

# Configurar en Supabase:
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" --project-ref obxvffplochgeiclibng
```

**O manualmente en Dashboard**:
1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault
2. Click **"New secret"**
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Tu webhook URL de Slack
5. Click **"Add new secret"**

**Verificar secrets**:
```bash
supabase secrets list --project-ref obxvffplochgeiclibng | grep -E "(PRODUCTION_URL|SLACK_WEBHOOK)"
```

---

### Paso 3: Configurar Cron Jobs

**Aplicar SQL de cron jobs**:

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new
2. Abrir el archivo: `database/monitoring_cron_setup.sql`
3. Copiar todo el contenido
4. Pegar en el editor SQL
5. **IMPORTANTE**: Antes de ejecutar, necesitas obtener tu `SERVICE_ROLE_KEY`:
   - Dashboard > Settings > API > Service Role Key
   - Copiar la key completa
6. Reemplazar en el SQL: `YOUR_SERVICE_ROLE_KEY` con tu key real
7. Click en **"Run"**

**Alternativa: Usar función RPC** (más seguro):

```sql
-- En Supabase SQL Editor, ejecutar uno por uno:

-- 1. Health check cada 5 minutos
SELECT cron.schedule(
    'monitoring-health-check-every-5min',
    '*/5 * * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- 2. Alertas cada 2 minutos
SELECT cron.schedule(
    'monitoring-alerts-every-2min',
    '*/2 * * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- 3. Limpieza diaria a las 2 AM
SELECT cron.schedule(
    'monitoring-cleanup-daily',
    '0 2 * * *',
    $$
    SELECT monitoring_cleanup_old_data();
    $$
);
```

**Verificar cron jobs**:
```sql
SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname LIKE 'monitoring%'
ORDER BY jobname;
```

**Debe mostrar 3 jobs activos**.

---

### Paso 4: Probar Health Check Manual

```bash
# Primero, obtener SERVICE_ROLE_KEY del dashboard
export SERVICE_ROLE_KEY="tu-service-role-key-aqui"

# Ejecutar health check
curl -X POST "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Respuesta esperada**:
```json
{
  "timestamp": "2025-11-03T...",
  "total_checks": 6,
  "healthy": 6,
  "degraded": 0,
  "down": 0,
  "checks": [
    {
      "name": "production_website",
      "status": "healthy",
      "response_time_ms": 234
    },
    ...
  ]
}
```

**O usar el script npm**:
```bash
export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
npm run monitoring:health
```

---

### Paso 5: Verificar Métricas

```bash
# Ver resumen de métricas
curl -X GET "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Ver alertas activas
curl -X GET "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=active_alerts" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

---

## ✅ Checklist Final

- [ ] Schema de base de datos aplicado (4 tablas creadas)
- [ ] `PRODUCTION_URL` secret configurado ✅
- [ ] `SLACK_WEBHOOK_URL` secret configurado
- [ ] 3 cron jobs activos
- [ ] Health check manual funciona
- [ ] Métricas API responde correctamente

---

## 🔍 Troubleshooting

### Error: "relation monitoring_health_checks does not exist"
→ Aplicar `database/monitoring_setup.sql` primero

### Error: "function monitoring_create_alert does not exist"
→ Aplicar `database/monitoring_setup.sql` completamente

### Error: "cron.job does not exist"
→ Instalar extensión pg_cron:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Health check retorna 401 Unauthorized
→ Verificar que `SERVICE_ROLE_KEY` esté correcto en el Authorization header

### Cron jobs no se ejecutan
→ Verificar que pg_cron esté habilitado y los jobs estén activos:
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'monitoring%';
```

---

## 📚 Referencias

- **Documentación completa**: `docs/MONITORING_SYSTEM.md`
- **SQL Schema**: `database/monitoring_setup.sql`
- **Cron Jobs**: `database/monitoring_cron_setup.sql`

---

**Última actualización**: 2025-11-03





