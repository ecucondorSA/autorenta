# 📊 Sistema de Monitoreo AutoRenta

**Estado**: ✅ Implementado  
**Fecha**: 2025-11-03  
**Versión**: 1.0.0

---

## 🎯 Resumen

Sistema completo de monitoreo para AutoRenta que incluye:
- ✅ Health checks periódicos automatizados (cada 5 minutos)
- ✅ Alertas automáticas (Slack, Email, Webhooks)
- ✅ Métricas de performance (response times, error rates)
- ✅ Dashboard de métricas via API
- ✅ Integración con Supabase Edge Functions

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

1. **Dashboard UI**: Crear dashboard Angular para visualizar métricas
2. **Email Alerts**: Agregar notificaciones por email
3. **Custom Webhooks**: Permitir configurar webhooks personalizados
4. **Performance Baselines**: Establecer baseline de performance y alertar desviaciones
5. **Integration Tests**: Agregar health checks para tests de integración

---

**Última actualización**: 2025-11-03





