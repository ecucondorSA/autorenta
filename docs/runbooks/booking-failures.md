# Runbook: Fallos en Sistema de Reservas

## Descripción
Guía para responder a incidentes relacionados con el sistema de reservas de AutoRenta.

## Síntomas

- Usuarios no pueden crear reservas
- Errores 500 en `/api/bookings`
- Timeouts en el flujo de checkout
- Reservas quedan en estado `pending` indefinidamente
- Alertas de Sentry: `BookingCreationError`, `PaymentIntentError`

## Severidad

| Impacto | Severidad |
|---------|-----------|
| 100% de reservas fallan | P0 |
| >50% de reservas fallan | P0 |
| 10-50% de reservas fallan | P1 |
| <10% de reservas fallan | P2 |

## Diagnóstico Rápido

### 1. Verificar logs de Supabase

```bash
# Ver logs recientes de Edge Functions
supabase functions logs mercadopago-create-preference --tail

# Ver logs de bookings
supabase db remote exec --query "
  SELECT status, count(*), max(created_at)
  FROM bookings
  WHERE created_at > now() - interval '1 hour'
  GROUP BY status
  ORDER BY count(*) DESC;
"
```

### 2. Verificar estado de MercadoPago

```bash
# Verificar conectividad
curl -I https://api.mercadopago.com/v1/payments

# Verificar status de OAuth tokens
supabase db remote exec --query "
  SELECT id, mp_connection_status, mp_token_expires_at
  FROM profiles
  WHERE mp_connection_status != 'connected'
  AND role = 'owner'
  LIMIT 10;
"
```

### 3. Verificar métricas de Edge Functions

- Dashboard Supabase → Edge Functions → mercadopago-create-preference
- Buscar: Error rate, Latency, Invocations

## Acciones de Mitigación

### Escenario A: Fallo de MercadoPago

**Síntoma**: Errores 5xx al crear preferences

**Acción inmediata**:
1. Verificar status de MercadoPago: https://status.mercadopago.com/
2. Si está caído, activar modo de espera:
   ```sql
   -- Pausar creación de nuevas reservas
   UPDATE feature_flags
   SET enabled = false
   WHERE name = 'booking_creation_enabled';
   ```
3. Comunicar a usuarios en la app (banner de maintenance)

**Acción de seguimiento**:
- Esperar restauración de MercadoPago
- Procesar reservas pendientes manualmente si es necesario

### Escenario B: Fallo de Base de Datos

**Síntoma**: Timeouts o errores de conexión

**Acción inmediata**:
1. Verificar estado de Supabase: https://status.supabase.com/
2. Verificar conexiones activas:
   ```sql
   SELECT count(*) FROM pg_stat_activity
   WHERE datname = current_database();
   ```
3. Si hay demasiadas conexiones, cerrar idle:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < now() - interval '5 minutes';
   ```

### Escenario C: Error en Lógica de Negocio

**Síntoma**: Errores específicos en Sentry

**Acción inmediata**:
1. Identificar el error específico en Sentry
2. Verificar si es regresión reciente:
   - Revisar últimos deploys
   - Revertir si es necesario

**Rollback de emergencia**:
```bash
# Ver deploys recientes
wrangler pages deployment list --project-name autorenta-web

# Revertir a deployment anterior
wrangler pages deployment rollback --project-name autorenta-web
```

## Verificación Post-Incidente

```sql
-- Verificar que las reservas se están creando
SELECT
  date_trunc('hour', created_at) as hour,
  count(*) as bookings,
  count(*) FILTER (WHERE status = 'confirmed') as confirmed,
  count(*) FILTER (WHERE status = 'pending') as pending,
  count(*) FILTER (WHERE status = 'failed') as failed
FROM bookings
WHERE created_at > now() - interval '6 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

## Checklist de Resolución

- [ ] Incidente detectado y severidad asignada
- [ ] Equipo notificado en #incidents
- [ ] Diagnóstico inicial completado
- [ ] Mitigación aplicada
- [ ] Usuarios informados (si aplica)
- [ ] Fix permanente implementado
- [ ] Verificación post-incidente exitosa
- [ ] Post-mortem creado (P0/P1)

## Recursos Relacionados

- [Payment Failures Runbook](./payment-failures.md)
- [Documentación MercadoPago](https://www.mercadopago.com.ar/developers)
- [Supabase Troubleshooting](https://supabase.com/docs/guides/platform/troubleshooting)
