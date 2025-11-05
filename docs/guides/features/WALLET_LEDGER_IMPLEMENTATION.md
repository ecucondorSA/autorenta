# 💰 AutoRenta Wallet Ledger System - Guía de Implementación

## 📋 Resumen

Sistema de contabilidad de **doble partida** para wallets internos con:
- ✅ Ledger atómico (libro mayor)
- ✅ Transferencias P2P con idempotencia
- ✅ Fondo de cobertura para franquicias
- ✅ RLS y seguridad completa
- ✅ Vistas y reportes

---

## 🚀 Instalación (3 pasos)

### Paso 1: Ejecutar migración SQL

```bash
# Desde el directorio del proyecto
cd apps/web

# Opción A: Via psql directo
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f database/migrations/003-wallet-ledger-system.sql

# Opción B: Via Supabase Dashboard
# 1. Ir a https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new
# 2. Pegar el contenido de database/migrations/003-wallet-ledger-system.sql
# 3. Ejecutar
```

### Paso 2: Desplegar Edge Function

```bash
# Desplegar función de transferencias
supabase functions deploy wallet-transfer \
  --project-ref obxvffplochgeiclibng

# Verificar que se desplegó
supabase functions list
```

### Paso 3: Verificar instalación

```sql
-- Verificar que las tablas se crearon
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('wallet_ledger', 'wallet_transfers', 'coverage_fund');

-- Verificar que las funciones RPC existen
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('wallet_transfer', 'wallet_deposit_ledger', 'wallet_charge_rental');

-- Verificar estado del fondo de cobertura
SELECT * FROM coverage_fund;
```

---

## 📖 Cómo Usar

### 1. Transferencia entre usuarios (Frontend)

```typescript
// apps/web/src/app/features/wallet/transfer.service.ts
import { inject, Injectable } from '@angular/core';
import { injectSupabase } from '@app/core/services/supabase-client.service';

@Injectable({ providedIn: 'root' })
export class WalletTransferService {
  private readonly supabase = injectSupabase();

  async transferFunds(
    toUserId: string,
    amountCents: number,
    description?: string
  ): Promise<{ ok: boolean; transfer_id?: string; error?: string }> {
    const idempotencyKey = `transfer-${Date.now()}-${Math.random()}`;

    const { data, error } = await this.supabase.functions.invoke('wallet-transfer', {
      body: {
        to_user_id: toUserId,
        amount_cents: amountCents,
        description,
      },
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, transfer_id: data.transfer.transfer_id };
  }
}
```

### 2. Depósito desde PSP (Backend - Webhook)

```typescript
// supabase/functions/mercadopago-webhook/index.ts (actualizar)
async function processApprovedPayment(payment: any) {
  const transactionId = payment.external_reference; // wallet_transaction.id

  // Registrar en el ledger
  const { data, error } = await supabase.rpc('wallet_deposit_ledger', {
    p_user_id: userId,
    p_amount_cents: payment.transaction_amount * 100,
    p_ref: `mp-${payment.id}`,
    p_provider: 'mercadopago',
    p_meta: {
      payment_id: payment.id,
      payment_method: payment.payment_method_id,
      transaction_id: transactionId,
    },
  });

  if (error) {
    console.error('Ledger deposit failed:', error);
    throw error;
  }

  return data;
}
```

### 3. Cargo por alquiler

```typescript
// apps/web/src/app/features/bookings/booking.service.ts
async chargeRentalFromWallet(
  userId: string,
  bookingId: string,
  amountCents: number
): Promise<boolean> {
  const ref = `rental-${bookingId}-${Date.now()}`;

  const { data, error } = await this.supabase.rpc('wallet_charge_rental', {
    p_user_id: userId,
    p_booking_id: bookingId,
    p_amount_cents: amountCents,
    p_ref: ref,
    p_meta: {
      charged_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Rental charge failed:', error);
    return false;
  }

  return data.ok;
}
```

### 4. Ver historial del usuario

```typescript
// apps/web/src/app/features/wallet/wallet-history.service.ts
async getUserLedgerHistory(userId: string, limit = 50) {
  const { data, error } = await this.supabase
    .from('v_user_ledger_history')
    .select('*')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
```

---

## 🔒 Seguridad

### Rate Limiting

- **Transferencias**: Máximo 10 por hora por usuario
- **Depósitos**: Ilimitados (controlado por PSP)
- **Cargos**: Controlado por lógica de negocio

### Idempotencia

Todas las operaciones usan **Idempotency Keys** únicos:

```typescript
const idempotencyKey = `${operation}-${userId}-${timestamp}-${random}`;
// Ejemplo: "transfer-123e4567-1729512345-0.8432"
```

### RLS Policies

- ✅ Usuarios solo leen su propio ledger
- ✅ Usuarios solo ven sus transferencias
- ✅ Solo admins ven el fondo de cobertura
- ✅ Inserciones solo desde `service_role`

---

## 📊 Reportes y Consultas

### Saldo actual de un usuario

```sql
SELECT balance, locked_funds
FROM user_wallets
WHERE user_id = 'USER_UUID';
```

### Movimientos del último mes

```sql
SELECT
  ts,
  kind,
  amount_cents,
  balance_change_cents,
  meta->>'description' as description
FROM v_user_ledger_history
WHERE user_id = 'USER_UUID'
  AND ts >= NOW() - INTERVAL '30 days'
ORDER BY ts DESC;
```

### Estado del fondo de cobertura

```sql
SELECT
  balance_cents / 100.0 as balance_ars,
  updated_at,
  meta
FROM coverage_fund;
```

### Transferencias pendientes/fallidas

```sql
SELECT *
FROM v_wallet_transfers_summary
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC;
```

### Top usuarios por volumen de transferencias (último mes)

```sql
SELECT
  user_id,
  COUNT(*) as transfer_count,
  SUM(amount_cents) / 100.0 as total_sent_ars
FROM wallet_ledger
WHERE kind = 'transfer_out'
  AND ts >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_sent_ars DESC
LIMIT 10;
```

---

## 🧪 Testing

### Test 1: Transferencia simple

```typescript
// Test transferencia exitosa
const result = await transferService.transferFunds(
  'recipient-uuid',
  50000, // ARS 500.00
  'Pago por alquiler compartido'
);

expect(result.ok).toBe(true);
expect(result.transfer_id).toBeDefined();
```

### Test 2: Saldo insuficiente

```typescript
// Test con saldo insuficiente
const result = await transferService.transferFunds(
  'recipient-uuid',
  9999999999, // Monto imposible
  'Test'
);

expect(result.ok).toBe(false);
expect(result.error).toContain('Insufficient balance');
```

### Test 3: Idempotencia

```typescript
// Ejecutar la misma transferencia 2 veces
const key = `test-${Date.now()}`;

const result1 = await supabase.rpc('wallet_transfer', {
  p_from_user: user1,
  p_to_user: user2,
  p_amount_cents: 1000,
  p_ref: key,
});

const result2 = await supabase.rpc('wallet_transfer', {
  p_from_user: user1,
  p_to_user: user2,
  p_amount_cents: 1000,
  p_ref: key,
});

// La segunda debe ser marcada como "duplicate"
expect(result2.status).toBe('duplicate');
expect(result1.transfer_id).toBe(result2.transfer_id);
```

---

## 🔧 Troubleshooting

### Problema: "Insufficient balance" en transferencias

```sql
-- Verificar saldo real vs locked_funds
SELECT
  user_id,
  balance / 100.0 as balance_ars,
  locked_funds / 100.0 as locked_ars,
  (balance - locked_funds) / 100.0 as available_ars
FROM user_wallets
WHERE user_id = 'PROBLEMATIC_UUID';
```

### Problema: Saldos descuadrados

```sql
-- Reconciliar saldo calculado vs saldo en user_wallets
WITH calculated AS (
  SELECT
    user_id,
    SUM(
      CASE
        WHEN kind IN ('deposit', 'transfer_in', 'refund', 'rental_payment', 'bonus')
          THEN amount_cents
        ELSE -amount_cents
      END
    ) as calculated_balance
  FROM wallet_ledger
  GROUP BY user_id
)
SELECT
  w.user_id,
  w.balance as stored_balance,
  c.calculated_balance,
  (w.balance - c.calculated_balance) as difference
FROM user_wallets w
LEFT JOIN calculated c ON w.user_id = c.user_id
WHERE w.balance != c.calculated_balance;
```

### Problema: Transferencia atascada

```sql
-- Ver transferencias con estado anómalo
SELECT * FROM wallet_transfers
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Cancelar manualmente (solo admin)
UPDATE wallet_transfers
SET status = 'failed', meta = meta || '{"cancelled_by": "admin"}'::jsonb
WHERE id = 'STUCK_TRANSFER_UUID';
```

---

## 📈 Métricas Recomendadas

### Dashboard diario

```sql
-- Resumen diario de operaciones
SELECT
  DATE(ts) as date,
  kind,
  COUNT(*) as operation_count,
  SUM(amount_cents) / 100.0 as total_amount_ars
FROM wallet_ledger
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY DATE(ts), kind
ORDER BY date DESC, kind;
```

### Alertas automáticas

1. **Fondo de cobertura bajo**: `balance < 1,000,000 cents` (ARS 10,000)
2. **Tasa de fallos alta**: `>5%` transferencias fallidas en 1 hora
3. **Usuario bloqueado**: Más de 10 transferencias fallidas consecutivas
4. **Saldo negativo**: Cualquier `user_wallets.balance < 0` (no debería pasar)

---

## 🎯 Próximos Pasos

1. ✅ **Fase 1** - Implementar sistema base (HECHO)
2. 🔜 **Fase 2** - UI/UX para transferencias
3. 🔜 **Fase 3** - Sistema de franquicias
4. 🔜 **Fase 4** - Retiros a cuenta bancaria
5. 🔜 **Fase 5** - Admin dashboard de reconciliación

---

## 📞 Soporte

Para consultas sobre este sistema:
- Ver documentación completa en `/home/edu/autorenta/WALLET_SYSTEM_DOCUMENTATION.md`
- Revisar código de las migraciones en `database/migrations/003-wallet-ledger-system.sql`
- Edge Functions en `supabase/functions/wallet-transfer/`

**Última actualización**: 2025-10-21
**Versión**: 1.0.0
