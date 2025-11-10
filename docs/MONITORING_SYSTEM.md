# 📊 Sistema de Monitoreo AutoRenta

**Estado**: ✅ Implementado  
**Fecha**: 2025-11-03  
**Versión**: 1.0.0

---

## 🎯 Resumen

Sistema completo de monitoreo para AutoRenta que incluye:

### Monitoreo Interno (Implementado ✅)
- ✅ Health checks periódicos automatizados (cada 5 minutos)
- ✅ Alertas automáticas (Slack, Email, Webhooks)
- ✅ Métricas de performance (response times, error rates)
- ✅ Dashboard de métricas via API
- ✅ Integración con Supabase Edge Functions

### Monitoreo Externo (P0 - Ver Runbook 📖)
- 📖 **Uptime monitoring** con UptimeRobot (multi-región)
- 📖 **Detección rápida** de outages (< 2 minutos)
- 📖 **Alertas críticas** vía PagerDuty, Slack, Email, SMS
- 📖 **SLA tracking** para cumplimiento de 99.9% uptime
- 📖 **Status page** público para usuarios

**Ver**: [External Uptime Monitoring Runbook](./runbooks/external-uptime-monitoring.md) (Issue #121)

---

## 📋 Componentes

### 1. Base de Datos

**Tablas creadas**:
- `monitoring_health_checks` - Resultados de health checks
- `monitoring_performance_metrics` - Métricas de performance
- `monitoring_alerts` - Alertas activas y resueltas
- `monitoring_alert_notifications` - Historial de notificaciones enviadas

**Funciones RPC**:
- `monitoring_create_alert()` - Crear nueva alerta
- `monitoring_get_health_summary()` - Resumen de health checks
- `monitoring_get_active_alerts()` - Alertas activas
- `monitoring_cleanup_old_data()` - Limpieza de datos antiguos

**Archivo**: `database/monitoring_setup.sql`

### 2. Edge Functions

#### `monitoring-health-check`
- **URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check`
- **Método**: POST
- **Función**: Ejecuta health checks de todos los servicios críticos
- **Checks incluidos**:
  - Production website
  - Critical endpoints (`/auth/login`, `/cars`)
  - Supabase database connectivity
  - Edge Functions críticas (mercadopago-webhook, mercadopago-create-preference)

#### `monitoring-alerts`
- **URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts`
- **Método**: POST
- **Función**: Procesa alertas activas y envía notificaciones
- **Canales**: Slack (configurable para Email, Webhooks)

#### `monitoring-metrics`
- **URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics`
- **Método**: GET
- **Función**: API para consultar métricas y alertas
- **Acciones**:
  - `?action=summary` - Resumen completo
  - `?action=health_history&hours=24&check_name=production_website` - Historial de health checks
  - `?action=performance_metrics&hours=24&metric_name=api_response_time` - Métricas de performance
  - `?action=active_alerts` - Alertas activas

### 3. Cron Jobs

**Configurados en Supabase** (pg_cron):
- `monitoring-health-check-every-5min` - Health checks cada 5 minutos
- `monitoring-alerts-every-2min` - Procesamiento de alertas cada 2 minutos
- `monitoring-cleanup-daily` - Limpieza de datos antiguos (diario a las 2 AM)

### 4. Scripts Locales

- `tools/monitoring-setup.sh` - Script de configuración inicial
- `tools/monitor-health.sh` - Script mejorado que integra con el sistema de monitoreo

---

## 🚀 Instalación

### Paso 1: Ejecutar Setup Script

```bash
cd /home/edu/autorenta
./tools/monitoring-setup.sh
```

El script guiará a través de:
1. Setup de base de datos
2. Deploy de Edge Functions
3. Configuración de secrets
4. Setup de cron jobs
5. Testing del sistema

### Paso 2: Configurar Secrets en Supabase

```bash
# Via Supabase CLI
supabase secrets set PRODUCTION_URL="https://autorenta.com"
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

O manualmente en Dashboard:
- Settings > Vault > New Secret
- Agregar: `PRODUCTION_URL`, `SLACK_WEBHOOK_URL`

### Paso 3: Verificar Cron Jobs

En Supabase Dashboard:
- Database > Extensions > pg_cron
- Verificar que los 3 jobs estén activos

---

## 📊 Uso

### Ver Resumen de Métricas

```bash
curl -X GET "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Ver Alertas Activas

```bash
curl -X GET "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=active_alerts" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Ver Historial de Health Checks

```bash
curl -X GET "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=health_history&hours=24&check_name=production_website" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Ejecutar Health Check Manual

```bash
curl -X POST "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Usar Script Local Mejorado

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
./tools/monitor-health.sh
```

---

## 🔔 Alertas

### Tipos de Alertas

1. **health_check_failed** (severity: critical)
   - Se dispara cuando un servicio está DOWN
   - Notificación inmediata a Slack

2. **performance_degradation** (severity: warning)
   - Se dispara cuando servicios tienen respuesta lenta (> 3s)
   - Notificación a Slack

3. **error_spike** (severity: warning)
   - Se dispara cuando hay un aumento de errores
   - Notificación a Slack

### Configurar Slack Webhook

1. Crear Slack App en https://api.slack.com/apps
2. Habilitar "Incoming Webhooks"
3. Crear webhook para tu canal
4. Copiar URL del webhook
5. Configurar en Supabase: `supabase secrets set SLACK_WEBHOOK_URL="URL"`

### Formato de Alertas Slack

```
🚨 AutoRenta Alert: Health Check Failed: production_website

Severity: CRITICAL
Type: health_check_failed
Message: HTTP 503
Time: 2025-11-03 10:30:00
```

---

## 📈 Métricas Disponibles

### Health Checks

- `production_website` - Website principal
- `endpoint_auth_login` - Endpoint de login
- `endpoint_cars_list` - Lista de autos
- `supabase_database` - Conexión a base de datos
- `edge_function_mercadopago-webhook` - Webhook de MercadoPago
- `edge_function_mercadopago-create-preference` - Creación de preferencias

### Performance Metrics

- `response_time_ms` - Tiempo de respuesta en milisegundos
- `http_status` - Código de estado HTTP
- `error_rate` - Tasa de errores (calculada)

### Estados

- `healthy` - Servicio funcionando correctamente (< 1s response time)
- `degraded` - Servicio funcionando pero lento (1-3s response time)
- `down` - Servicio no disponible

---

## 🗄️ Retención de Datos

- **Health checks**: 30 días
- **Performance metrics**: 30 días
- **Alertas resueltas**: 90 días
- **Notificaciones**: 90 días

Limpieza automática diaria a las 2 AM (cron job).

---

## 🔧 Troubleshooting

### Health Checks no se ejecutan

1. Verificar cron jobs:
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'monitoring%';
```

2. Verificar logs de Edge Functions:
   - Supabase Dashboard > Edge Functions > monitoring-health-check > Logs

3. Verificar secrets:
```bash
supabase secrets list
```

### Alertas no se envían

1. Verificar webhook de Slack:
```bash
curl -X POST "YOUR_SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}'
```

2. Verificar tabla de notificaciones:
```sql
SELECT * FROM monitoring_alert_notifications 
WHERE notification_status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

### Métricas no se muestran

1. Verificar permisos RLS:
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename LIKE 'monitoring%';
```

2. Verificar que Edge Function tenga SERVICE_ROLE_KEY configurado

---

## 📚 Referencias

- **SQL Setup**: `database/monitoring_setup.sql`
- **Edge Functions**: `supabase/functions/monitoring-*`
- **Scripts**: `tools/monitoring-setup.sh`, `tools/monitor-health.sh`
- **Documentación Supabase**: https://supabase.com/docs/guides/functions

---

## ✅ Checklist de Implementación

- [x] Tablas de base de datos creadas
- [x] Funciones RPC implementadas
- [x] Edge Functions desplegadas
- [x] Cron jobs configurados
- [x] Sistema de alertas (Slack)
- [x] API de métricas
- [x] Scripts de setup y monitoreo
- [x] Documentación completa
- [ ] Dashboard UI (opcional, futuro)
- [ ] Email notifications (opcional, futuro)
- [ ] Webhook notifications personalizados (opcional, futuro)

---

## 🚀 Próximos Pasos

1. ~~**Dashboard UI**: Crear dashboard Angular para visualizar métricas~~ (Futuro)
2. ~~**Email Alerts**: Agregar notificaciones por email~~ (Futuro)
3. ~~**Custom Webhooks**: Permitir configurar webhooks personalizados~~ (Futuro)
4. **Performance Baselines**: Establecer baseline de performance y alertar desviaciones
5. **Integration Tests**: Agregar health checks para tests de integración

---

## 🌐 Monitoreo Externo (External Uptime Monitoring)

### ¿Por qué necesitamos monitoreo externo?

El sistema de monitoreo interno (descrito arriba) es **esencial** pero tiene limitaciones:

| Limitación | Solución Externa |
|------------|------------------|
| ❌ Si Supabase cae, no podemos monitorear | ✅ UptimeRobot es independiente |
| ❌ No detecta problemas de DNS | ✅ Verifica desde Internet real |
| ❌ No cubre múltiples regiones | ✅ Checks desde 3+ regiones |
| ❌ No proporciona SLA tracking externo | ✅ Reportes de uptime para compliance |
| ❌ No detecta problemas de routing/CDN | ✅ Tests desde perspectiva del usuario |

### 📖 Runbook Completo: External Uptime Monitoring

**Documento principal**: [docs/runbooks/external-uptime-monitoring.md](./runbooks/external-uptime-monitoring.md)

El runbook incluye:
- ✅ **Setup paso a paso** de UptimeRobot (incluye alternativas: Pingdom, Hetrix)
- ✅ **6 monitores configurados**: Website, API, Payment Webhook, Database, Auth, Cars
- ✅ **Multi-región**: US, Brazil, Germany (cobertura completa para Argentina)
- ✅ **Alertas en 4 canales**: Email, Slack, PagerDuty, SMS
- ✅ **Integración con PagerDuty** (Issue #119)
- ✅ **Status page público** para usuarios
- ✅ **API automation** para CI/CD
- ✅ **Troubleshooting** completo (false positives, delays, SSL issues)
- ✅ **Incident response** workflow detallado

### 🎯 Configuración Rápida

**Template JSON**: [docs/runbooks/uptimerobot-config-template.json](./runbooks/uptimerobot-config-template.json)

```bash
# Ver configuración completa
cat docs/runbooks/uptimerobot-config-template.json

# Configurar en UptimeRobot:
# 1. Crear cuenta Pro ($7/month)
# 2. Importar monitors usando template como referencia
# 3. Configurar alertas (Email, Slack, PagerDuty, SMS)
# 4. Verificar multi-región enabled
```

### 📊 Métricas de Éxito (SLA)

El monitoreo externo debe cumplir:

```
✅ Uptime Target: 99.9% (máximo 43 minutos downtime/mes)
✅ Detection Time: < 2 minutos (checks cada 1 min + 2 fallos)
✅ False Positive Rate: < 1% (threshold: 2 consecutive failures)
✅ Multi-Region Coverage: 3 regiones (US, Brazil, Germany)
✅ Alert Delivery: < 30 segundos después de detección
```

### 🔄 Integración con Sistema Interno

Ambos sistemas se complementan:

| Aspecto | Monitoreo Interno | Monitoreo Externo |
|---------|-------------------|-------------------|
| **Perspectiva** | Desde Supabase (interno) | Desde Internet (usuario) |
| **Alcance** | Servicios, DB, Edge Functions | Endpoints públicos HTTP |
| **Detección** | 5 minutos | 1-2 minutos |
| **Independencia** | Depende de Supabase | Totalmente independiente |
| **Alertas** | Slack (interno) | PagerDuty + SMS (crítico) |
| **Métricas** | Response times, error rates | Uptime %, SLA tracking |
| **Uso** | Debugging, performance | Outage detection, compliance |

**Recomendación**: Usar ambos sistemas para cobertura completa.

### 🚨 Flujo de Alertas Combinado

```
1. UptimeRobot detecta outage (1-2 min)
   ↓
2. PagerDuty página on-call engineer (< 30 seg)
   ↓
3. Slack alert en #production-alerts (< 30 seg)
   ↓
4. Engineer checks internal monitoring dashboard
   ↓
5. Internal system provee detalles (DB status, error logs, etc.)
   ↓
6. Engineer diagnostica y resuelve
   ↓
7. UptimeRobot confirma recovery
   ↓
8. PagerDuty incident resolved
```

### 📚 Recursos Adicionales

- **Issue tracking**: [#121 External Uptime Monitoring](https://github.com/ecucondorSA/autorenta/issues/121)
- **PagerDuty setup**: [#119 PagerDuty Integration](https://github.com/ecucondorSA/autorenta/issues/119)
- **Disaster Recovery**: [docs/disaster-recovery-plan.md](./disaster-recovery-plan.md)
- **Production Readiness**: [#114 Production Audit](https://github.com/ecucondorSA/autorenta/issues/114)

---

**Última actualización**: 2025-11-07













