# Runbook: Alta Carga y Rendimiento

## Descripción
Guía para responder a incidentes de alta carga, problemas de rendimiento y escalabilidad.

## Síntomas

- Latencia alta en requests (>2s)
- Errores 503 (Service Unavailable)
- Cloudflare rate limiting activo
- CPU/Memory alto en Edge Functions
- Usuarios reportan lentitud
- Alertas de Performance Monitoring Service

## Severidad

| Impacto | Severidad |
|---------|-----------|
| Sitio completamente lento/inaccesible | P1 |
| Funcionalidades específicas lentas | P2 |
| Degradación menor de rendimiento | P3 |

## Diagnóstico Rápido

### 1. Estado de Cloudflare

**Dashboard**: https://dash.cloudflare.com/ → Analytics

Verificar:
- Requests por segundo
- Bandwidth
- Error rate (4xx, 5xx)
- Cache hit ratio
- Top paths con más requests

### 2. Estado de Edge Functions

```bash
# Ver métricas de Edge Functions
supabase functions logs --all --tail

# Verificar función específica con alta carga
supabase functions logs mercadopago-create-preference --tail
```

**Dashboard Supabase**: Edge Functions → Ver invocations, errors, latency

### 3. Estado de Base de Datos

```sql
-- Conexiones activas
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Queries activos más antiguos
SELECT
  pid,
  now() - query_start as duration,
  left(query, 50)
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start
LIMIT 10;
```

### 4. Métricas de la Aplicación

Verificar en Sentry → Performance:
- Transaction duration
- Throughput
- Slowest transactions

## Acciones de Mitigación

### Escenario A: Pico de Tráfico Legítimo

**Síntoma**: Aumento repentino de usuarios reales

**Acciones**:

1. **Habilitar cache agresivo** (si no está):
   ```bash
   # En Cloudflare, aumentar cache TTL temporalmente
   # Dashboard → Caching → Configuration → Browser Cache TTL
   ```

2. **Reducir features no esenciales**:
   ```sql
   -- Desactivar features que consumen recursos
   UPDATE feature_flags
   SET enabled = false
   WHERE name IN ('ai_car_descriptions', 'map_clustering');
   ```

3. **Escalar Supabase** (si es posible):
   - Dashboard → Settings → Compute Add-ons

### Escenario B: Ataque DDoS

**Síntoma**: Tráfico anormal desde IPs sospechosas

**Acciones**:

1. **Verificar en Cloudflare**:
   - Security → Events
   - Buscar patrones de IPs, User-Agents, paths

2. **Activar modo "Under Attack"**:
   - Dashboard → Overview → Quick Actions → Under Attack Mode

3. **Crear regla de firewall**:
   ```
   # Cloudflare Firewall Rules
   # Bloquear User-Agent sospechoso
   (http.user_agent contains "BadBot")

   # Bloquear país específico (si aplica)
   (ip.geoip.country eq "XX")
   ```

4. **Rate limiting**:
   - Security → WAF → Rate limiting rules
   - Crear regla para paths críticos

### Escenario C: Query Lento Causando Bottleneck

**Síntoma**: Un endpoint específico muy lento

**Diagnóstico**:
```sql
-- Identificar queries lentos
SELECT
  left(query, 100) as query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Acciones**:

1. **Crear índice faltante**:
   ```sql
   -- Analizar query plan
   EXPLAIN ANALYZE SELECT ... FROM ... WHERE ...;

   -- Crear índice
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```

2. **Optimizar query** (si es posible hacer hotfix)

3. **Cache temporal**:
   - Añadir cache en el servicio Angular
   - Aumentar TTL en http-cache.interceptor

### Escenario D: Edge Functions Saturadas

**Síntoma**: Timeouts en Edge Functions

**Acciones**:

1. **Verificar cold starts**:
   ```bash
   supabase functions logs FUNCTION_NAME --tail
   ```

2. **Reducir payload size** si es muy grande

3. **Implementar queue** para operaciones pesadas

4. **Desactivar función temporalmente** si no es crítica:
   ```sql
   UPDATE feature_flags
   SET enabled = false
   WHERE name = 'feature_using_slow_function';
   ```

## Optimizaciones de Emergencia

### Frontend

```typescript
// Reducir polling intervals temporalmente
// En environment.prod.ts
export const environment = {
  // ...
  pollingInterval: 60000, // Aumentar de 10s a 60s
  enableRealtime: false,  // Desactivar realtime temporalmente
};
```

### Backend

```sql
-- Desactivar triggers no críticos temporalmente
ALTER TABLE bookings DISABLE TRIGGER trigger_booking_notifications;

-- Re-habilitar después
ALTER TABLE bookings ENABLE TRIGGER trigger_booking_notifications;
```

## Comunicación

### Mensaje para Banner de App

```
Estamos experimentando alta demanda. Algunas funciones pueden estar lentas.
Estamos trabajando para resolver esto. Gracias por tu paciencia.
```

### Tweet/Status Page

```
[AutoRenta Status] Estamos experimentando degradación de rendimiento
debido a alta demanda. El equipo está trabajando en la resolución.
Actualizaremos cuando se normalice el servicio.
```

## Verificación Post-Incidente

```sql
-- Verificar métricas normalizadas
SELECT
  date_trunc('minute', created_at) as minute,
  count(*) as requests,
  avg(response_time_ms) as avg_latency
FROM request_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY 1
ORDER BY 1 DESC;
```

## Checklist de Resolución

- [ ] Incidente detectado (alertas/usuarios)
- [ ] Tipo de incidente identificado (tráfico real/DDoS/bug)
- [ ] Mitigación aplicada
- [ ] Comunicación a usuarios (si aplica)
- [ ] Métricas normalizadas
- [ ] Features desactivadas re-habilitadas
- [ ] Post-mortem para entender root cause

## Prevención

1. **Monitoreo proactivo**: Alertas de Cloudflare y Sentry
2. **Caching**: Cache agresivo en CDN y aplicación
3. **Rate limiting**: Configurado por defecto
4. **Índices**: Monitoreo regular de queries lentos
5. **Load testing**: Ejecutar regularmente para conocer límites

## Recursos

- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [Supabase Dashboard](https://app.supabase.com/)
- [Sentry Performance](https://sentry.io/)
- [Load Testing Runbook](../tests/load/README.md)
