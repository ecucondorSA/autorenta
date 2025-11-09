# 📊 Monitoring Setup - ISSUE #1

**Fecha**: 2025-11-09  
**Issue**: [#1](https://github.com/ecucondorSA/autorenta/issues/1)  
**Estado**: ⏳ En Configuración

---

## 🎯 Objetivo

Configurar monitoreo completo para AutoRenta:
- **UptimeRobot**: Monitoreo de uptime de la aplicación web
- **Supabase Alerts**: Alertas de recursos de base de datos

---

## 1. UPTIMEROBOT - Uptime Monitoring

### Paso 1: Crear Cuenta

1. Ir a: https://uptimerobot.com/
2. Click en **"Sign Up"** (esquina superior derecha)
3. Completar registro:
   - Email: [tu email]
   - Password: [password seguro]
   - Verificar email

### Paso 2: Crear Monitor para Web App

1. **Dashboard** → **"Add New Monitor"**

2. **Configuración del Monitor**:
   - **Monitor Type**: `HTTPS`
   - **Friendly Name**: `AutoRenta Web App`
   - **URL**: `https://autorenta-web.pages.dev`
   - **Monitoring Interval**: `5 minutes` (gratis permite mínimo 5 min)
   - **Alert Contacts**: Seleccionar tu email

3. **Advanced Options** (opcional):
   - **HTTP Method**: `GET`
   - **Expected Status Code**: `200`
   - **Keyword**: (dejar vacío o agregar texto único de la página)

4. Click **"Create Monitor"**

### Paso 3: Crear Monitor para API Health Check

1. **Add New Monitor** nuevamente

2. **Configuración**:
   - **Monitor Type**: `HTTPS`
   - **Friendly Name**: `AutoRenta API Health`
   - **URL**: `https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/`
   - **Monitoring Interval**: `5 minutes`
   - **Alert Contacts**: Tu email
   - **Expected Status Code**: `200` o `401` (401 es válido para endpoint protegido)

3. Click **"Create Monitor"**

### Paso 4: Configurar Alertas

1. **Dashboard** → **My Settings** → **Alert Contacts**

2. **Agregar Email Alert**:
   - **Alert Contact Type**: `Email`
   - **Email**: [tu email]
   - **Alert When**: 
     - ✅ Monitor goes DOWN
     - ✅ Monitor goes UP
   - Click **"Create Alert Contact"**

3. **Configurar Alertas por Monitor**:
   - En cada monitor → **Edit** → **Alert Contacts**
   - Seleccionar tu email contact
   - Guardar

### Paso 5: Verificar Funcionamiento

1. **Dashboard** debe mostrar 2 monitores:
   - ✅ AutoRenta Web App (Status: UP)
   - ✅ AutoRenta API Health (Status: UP)

2. **Test de alerta** (opcional):
   - Editar monitor temporalmente con URL incorrecta
   - Esperar 5 minutos
   - Debe recibir email de alerta
   - Corregir URL

---

## 2. SUPABASE MONITORING - Database Metrics

**⚠️ IMPORTANTE**: Supabase NO tiene alertas nativas en el Dashboard. Las métricas se pueden monitorear manualmente o usando el sistema de monitoring custom del proyecto.

### Opción A: Monitoreo Manual (Recomendado para ISSUE #1)

#### Paso 1: Acceder a Métricas

1. Ir a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx
2. **Settings** → **Database** → **Metrics**

#### Paso 2: Revisar Métricas Regularmente

**Métricas a monitorear**:
- **CPU Usage**: Revisar semanalmente, alertar si > 80%
- **Memory Usage**: Revisar semanalmente, alertar si > 85%
- **Storage Usage**: Revisar mensualmente, alertar si > 80%
- **Active Connections**: Revisar semanalmente, alertar si > 80%

**Frecuencia recomendada**: Revisar métricas 1-2 veces por semana

### Opción B: Monitoreo Automático (✅ RECOMENDADO - Ya implementado)

El proyecto tiene un sistema de monitoring automático implementado:

**Componentes creados**:
- ✅ Función `monitoring_check_database_metrics()` - Verifica métricas cada vez que se ejecuta
- ✅ Tabla `monitoring_alerts` - Almacena alertas activas
- ✅ Tabla `monitoring_performance_metrics` - Historial de métricas
- ✅ Edge Function `monitoring-database-metrics` - Endpoint para ejecutar monitoreo

**Para activar monitoreo automático**:

1. **Deploy Edge Function**:
   ```bash
   supabase functions deploy monitoring-database-metrics --project-ref pisqjmoklivzpwufhscx
   ```

2. **Configurar UptimeRobot para llamar la función cada 15 minutos**:
   - **Monitor Type**: `HTTPS`
   - **URL**: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitoring-database-metrics`
   - **Method**: `GET`
   - **Interval**: `15 minutes`
   - **Expected Status**: `200`
   - **Timeout**: `30 seconds` (ajustar si es necesario)
   - **HTTP Headers** (opcional, pero recomendado):
     - `apikey`: [SUPABASE_ANON_KEY del proyecto]
   - **Note**: 
     - La función puede tardar 1-2 segundos en cold start, esto es normal
     - Si recibe 401, agregar header `apikey` con el anon key del proyecto
     - El timeout inicial fue por cold start, ahora debería funcionar normalmente

3. **Verificar métricas**:
   ```bash
   # Ver métricas recientes
   curl "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitoring-metrics?action=summary"
   
   # Ver alertas activas
   PGPASSWORD='Ab.12345' psql "postgresql://..." -c "SELECT * FROM monitoring_alerts WHERE status = 'active';"
   ```

**Alertas automáticas**:
- Se crean alertas cuando conexiones > 80%
- Se resuelven automáticamente cuando conexiones < 70%
- Métricas se guardan cada 15 minutos

### Opción C: UptimeRobot para Database Health (Ya incluido en Opción B)

El monitor de `monitoring-database-metrics` también verifica la salud general de la base de datos.

---

## 3. MONITOREO ADICIONAL (Opcional)

### Sentry Performance Monitoring

Ya configurado en ISSUE #1:
- ✅ Error tracking activo
- ✅ Performance monitoring (10% sample rate)
- ✅ Session replay (10% en producción)

**Verificar**: https://sentry.io/ → Proyecto AutoRenta

### Cloudflare Analytics

**Ubicación**: Cloudflare Dashboard → Analytics

Métricas disponibles:
- Requests por segundo
- Bandwidth usage
- Error rate
- Cache hit ratio
- Response time

**No requiere configuración adicional** - Ya está activo

---

## ✅ Checklist de Verificación

### UptimeRobot
- [ ] Cuenta creada y verificada
- [ ] Monitor "AutoRenta Web App" creado y UP
- [ ] Monitor "AutoRenta API Health" creado y UP
- [ ] Email alerts configurados
- [ ] Test de alerta realizado (opcional)

### Supabase Monitoring
- [ ] Función `monitoring_check_database_metrics()` ejecutada y funcionando
- [ ] Edge Function `monitoring-database-metrics` desplegada
- [ ] UptimeRobot configurado para llamar función cada 15 minutos
- [ ] Alertas automáticas verificadas (conexiones > 80%)
- [ ] Métricas guardándose correctamente en `monitoring_performance_metrics`

### Verificación Final
- [ ] UptimeRobot dashboard muestra ambos monitores UP
- [ ] Supabase Dashboard accesible y métricas visibles
- [ ] Proceso de revisión de métricas establecido
- [ ] Email de prueba recibido de UptimeRobot (opcional)

---

## 📊 Métricas a Monitorear

### UptimeRobot
- **Uptime %**: Debe ser > 99.9%
- **Response Time**: Debe ser < 2 segundos
- **Downtime Events**: Revisar semanalmente

### Supabase (Revisión Manual)
- **CPU Usage**: Normal < 50%, Revisar si > 80%
- **Memory Usage**: Normal < 70%, Revisar si > 85%
- **Storage**: Monitorear crecimiento mensual, alertar si > 80%
- **Connections**: Normal < 50%, Revisar si > 80%
- **Frecuencia**: Revisar métricas 1-2 veces por semana

---

## 🔔 Respuesta a Alertas

### UptimeRobot - Monitor DOWN

1. **Verificar**:
   - ¿Es un problema real o falso positivo?
   - Revisar Cloudflare Dashboard
   - Revisar Sentry para errores

2. **Acciones**:
   - Si es real: Verificar deployment, revisar logs
   - Si es falso positivo: Ajustar configuración del monitor

### Supabase - CPU/Memory High (Detectado en revisión manual)

1. **Verificar**:
   - Dashboard → Database → Metrics
   - Revisar queries activas en Database → Logs
   - Verificar si hay proceso pesado corriendo

2. **Acciones**:
   - Optimizar queries lentas
   - Revisar índices faltantes
   - Considerar upgrade de plan si es recurrente
   - Usar sistema de monitoring custom para alertas automáticas (opcional)

### Supabase - Storage High

1. **Verificar**:
   - Revisar tamaño de tablas grandes
   - Verificar storage de archivos
   - Identificar datos que se pueden limpiar

2. **Acciones**:
   - Limpiar datos antiguos
   - Archivar datos históricos
   - Considerar upgrade de storage

---

## 📚 Referencias

- [UptimeRobot Documentation](https://uptimerobot.com/api/)
- [Supabase Metrics](https://supabase.com/docs/guides/platform/metrics)
- [Supabase Monitoring System](./MONITORING_SYSTEM.md) - Sistema custom del proyecto
- Issue template: `.github/issues/issue-1-day-1.md`

---

## 🎯 Próximos Pasos

Después de configurar monitoring:

1. **Monitorear por 1 semana** para establecer baseline
2. **Ajustar thresholds** si hay muchos falsos positivos
3. **Documentar** procedimientos de respuesta a alertas
4. **Revisar métricas** semanalmente en reunión de equipo

---

**Última actualización**: 2025-11-09  
**Estado**: ⏳ Pendiente de configuración manual

