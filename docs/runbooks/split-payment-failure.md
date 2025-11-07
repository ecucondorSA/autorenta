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
-- psql postgresql://postgres.pisqjmoklivzpwufhscx:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres

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
OWNER_PERCENTAGE="0.85"  # 85% al locador, 15% plataforma
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
    (b.total_price * 0.85) as owner_amount,
    (b.total_price * 0.15) as platform_fee
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
