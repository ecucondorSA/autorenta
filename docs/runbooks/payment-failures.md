# Runbook: Fallos en Procesamiento de Pagos

## Descripción
Guía para responder a incidentes relacionados con el procesamiento de pagos en AutoRenta.

## Severidad: P0 (Siempre Crítico)
Los fallos de pago impactan directamente los ingresos y la experiencia del usuario.

## Síntomas

- Depósitos de wallet no se acreditan
- Pagos de reservas fallan
- Webhooks de MercadoPago no llegan
- Split de pagos no se ejecuta
- Alertas Sentry: `PaymentProcessingError`, `WebhookError`, `WalletTransferError`

## Diagnóstico Rápido

### 1. Estado de Webhooks

```bash
# Ver webhooks pendientes/fallidos
supabase db remote exec --query "
  SELECT
    status,
    error_message,
    retry_count,
    count(*)
  FROM webhook_events
  WHERE created_at > now() - interval '1 hour'
  GROUP BY status, error_message, retry_count
  ORDER BY count(*) DESC;
"
```

### 2. Estado de Payment Intents

```sql
-- Pagos pendientes de más de 30 minutos
SELECT
  id,
  booking_id,
  status,
  amount,
  created_at,
  error_message
FROM payment_intents
WHERE status = 'pending'
AND created_at < now() - interval '30 minutes'
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Estado de Wallet Transfers

```sql
-- Transfers fallidos
SELECT
  id,
  from_wallet_id,
  to_wallet_id,
  amount,
  status,
  error_message,
  created_at
FROM wallet_transfers
WHERE status = 'failed'
AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

## Acciones de Mitigación

### Escenario A: Webhooks no llegan

**Verificar**:
1. URL de webhook en MercadoPago Dashboard
2. Estado del Edge Function:
   ```bash
   supabase functions logs mercadopago-webhook --tail
   ```

**Acción**:
1. Verificar que el webhook está activo en MercadoPago
2. Re-procesar webhooks manualmente:
   ```bash
   # Obtener payment ID de MercadoPago y re-procesar
   curl -X POST https://your-project.supabase.co/functions/v1/mercadopago-webhook \
     -H "Content-Type: application/json" \
     -d '{"action": "payment.updated", "data": {"id": "PAYMENT_ID"}}'
   ```

### Escenario B: Depósitos no se acreditan

**Diagnóstico**:
```sql
-- Ver depósitos pendientes
SELECT
  d.id,
  d.user_id,
  d.amount,
  d.status,
  d.payment_id,
  d.created_at,
  p.email
FROM wallet_deposits d
JOIN profiles p ON d.user_id = p.id
WHERE d.status = 'pending'
AND d.created_at < now() - interval '15 minutes'
ORDER BY d.created_at DESC;
```

**Acción manual de acreditación**:
```sql
-- CUIDADO: Solo en emergencias, verificar payment_id primero
BEGIN;

-- Actualizar depósito
UPDATE wallet_deposits
SET status = 'completed', completed_at = now()
WHERE id = 'DEPOSIT_ID';

-- Acreditar wallet
UPDATE wallets
SET available_balance = available_balance + AMOUNT
WHERE user_id = 'USER_ID';

-- Registrar en audit log
INSERT INTO wallet_audit_log (user_id, action, details)
VALUES ('USER_ID', 'manual_deposit_credit', '{"deposit_id": "DEPOSIT_ID", "reason": "incident_recovery"}');

COMMIT;
```

### Escenario C: Split de pagos falla

**Diagnóstico**:
```sql
-- Ver splits pendientes
SELECT
  b.id as booking_id,
  b.total_price,
  b.platform_fee,
  b.owner_payout,
  b.status,
  b.payment_split_status
FROM bookings b
WHERE b.payment_split_status = 'pending'
AND b.status = 'completed'
ORDER BY b.created_at DESC;
```

**Re-ejecutar split**:
```bash
# Invocar función de split manualmente
curl -X POST https://your-project.supabase.co/functions/v1/wallet-transfer \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "BOOKING_ID"}'
```

### Escenario D: MercadoPago API no responde

**Verificar**:
1. Status de MP: https://status.mercadopago.com/
2. Rate limits:
   ```bash
   # Ver headers de rate limit en response
   curl -I -H "Authorization: Bearer ACCESS_TOKEN" \
     https://api.mercadopago.com/v1/payments
   ```

**Acción**:
1. Si hay rate limit, esperar período de cooldown
2. Si MP está caído, activar modo offline:
   ```sql
   UPDATE feature_flags
   SET enabled = false
   WHERE name IN ('wallet_deposits_enabled', 'card_payments_enabled');
   ```

## Verificación Post-Incidente

```sql
-- Verificar flujo de pagos restaurado
SELECT
  date_trunc('hour', created_at) as hour,
  count(*) as total,
  count(*) FILTER (WHERE status = 'completed') as completed,
  count(*) FILTER (WHERE status = 'failed') as failed,
  avg(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_seconds
FROM wallet_deposits
WHERE created_at > now() - interval '6 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

## Comunicación con Usuarios Afectados

```sql
-- Obtener usuarios con pagos fallidos para notificar
SELECT DISTINCT
  p.email,
  p.first_name,
  wd.amount,
  wd.created_at
FROM wallet_deposits wd
JOIN profiles p ON wd.user_id = p.id
WHERE wd.status = 'failed'
AND wd.created_at > now() - interval '24 hours';
```

## Checklist de Resolución

- [ ] Incidente detectado (Sentry/Alertas)
- [ ] Notificado en #incidents con severidad P0
- [ ] Diagnóstico completado
- [ ] Causa raíz identificada
- [ ] Mitigación aplicada
- [ ] Pagos pendientes procesados
- [ ] Usuarios afectados notificados
- [ ] Sistema verificado funcionando
- [ ] Post-mortem programado

## Recursos

- [MercadoPago Dashboard](https://www.mercadopago.com.ar/developers/panel)
- [MercadoPago Status](https://status.mercadopago.com/)
- [Booking Failures Runbook](./booking-failures.md)
