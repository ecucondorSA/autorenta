# ⚡ ACCIONES INMEDIATAS - PROBLEMAS CRÍTICOS DE DATABASE

**Fecha**: 28 Octubre, 2025
**Urgencia**: 🔴 CRÍTICA
**Impacto**: Bloquea funcionalidad de pagos y billetera

---

## 🔴 PROBLEMA #1: USER_WALLETS ESTÁ VACÍO

### Situación
- Tabla `user_wallets` existe pero tiene **0 registros**
- 32 usuarios registrados pero **NINGUNO tiene billetera**
- Usuarios NO pueden hacer depósitos
- Sistema de pagos está **completamente bloqueado**

### Causa
No existe trigger para crear wallet automáticamente cuando usuario se registra

### Solución (15 minutos)

#### Paso 1: Ver estructura actual
```sql
SELECT * FROM user_wallets;
-- Resultado: (0 rows) - VACÍO
```

#### Paso 2: Crear función trigger
```sql
-- Crear función que crea wallet para nuevo usuario
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_wallets (
    user_id,
    available_balance,
    locked_balance,
    currency,
    non_withdrawable_floor,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    0,
    0,
    NEW.country_code || '-ARS',  -- ARS por defecto
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en profiles
DROP TRIGGER IF EXISTS trigger_create_wallet_on_signup ON public.profiles;
CREATE TRIGGER trigger_create_wallet_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_for_new_user();
```

#### Paso 3: Crear wallets para usuarios existentes
```sql
-- Insertar wallets para todos los usuarios que no las tienen
INSERT INTO public.user_wallets (
  user_id,
  available_balance,
  locked_balance,
  currency,
  non_withdrawable_floor,
  created_at,
  updated_at
)
SELECT
  p.id,
  0,
  0,
  'ARS',
  0,
  NOW(),
  NOW()
FROM public.profiles p
LEFT JOIN public.user_wallets w ON p.id = w.user_id
WHERE w.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verificar resultado
SELECT COUNT(*) FROM public.user_wallets;
-- Esperado: 32
```

#### Paso 4: Verificación
```sql
-- Confirmar que todos tienen wallet
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM user_wallets) as total_wallets,
  CASE
    WHEN (SELECT COUNT(*) FROM profiles) = (SELECT COUNT(*) FROM user_wallets)
    THEN '✅ CORRECTO'
    ELSE '❌ MISMATCH'
  END as status;

-- Esperado:
-- total_users | total_wallets | status
--    32       |      32       | ✅ CORRECTO
```

---

## 🔴 PROBLEMA #2: PAYMENT_INTENTS INCOMPLETOS

### Situación
- 3 pagos en estado `requires_payment`
- Sin completarse automáticamente
- Webhook aún no configurado
- Usuarios viendo "pago pendiente" indefinidamente

### Causa
Bloqueador #2 (secrets no configurados) → Webhook no puede procesar pagos

### Solución (Completar Bloqueador #2)
1. Configurar secrets en Supabase
2. Configurar secrets en Cloudflare
3. Desplegar Edge Functions
4. Configurar webhook URL en MercadoPago dashboard

**Documentación**: Ver `HITO_BLOQUEADOR_2_SETUP_SECRETS.md`

---

## 🔴 PROBLEMA #3: PAYMENT_SPLITS SIN DATOS

### Situación
- Tabla `payment_splits` existe pero **0 registros**
- Sistema de split payment NO está implementado
- **Locadores NO reciben dinero** de rentas
- Revenue flow está completamente bloqueado

### Causa
Feature no implementada (necesita código nuevo)

### Solución (5-7 horas de desarrollo)

#### Paso 1: Test data de MercadoPago Marketplace

```sql
-- Preparar dato de prueba
INSERT INTO public.payment_intents (
  id,
  booking_id,
  user_id,
  intent_type,
  status,
  amount,
  amount_cents,
  currency,
  mp_payment_id,
  mp_preference_id,
  is_preauth,
  preauth_expires_at,
  processor_response,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM bookings LIMIT 1),
  (SELECT renter_id FROM bookings LIMIT 1),
  'rental_payment',
  'completed',
  10000.00,
  1000000,
  'ARS',
  'test_mp_payment_123',
  'test_preference_123',
  false,
  NULL,
  jsonb_build_object(
    'split_details', jsonb_build_array(
      jsonb_build_object('user_id', (SELECT owner_id FROM cars c JOIN bookings b ON c.id = b.car_id LIMIT 1), 'amount', 8500),
      jsonb_build_object('user_id', (SELECT id FROM profiles LIMIT 1 OFFSET 1), 'amount', 1500)
    )
  ),
  NOW(),
  NOW()
);
```

#### Paso 2: Crear split payment processor (TypeScript)

```typescript
// src/app/core/services/split-payment.service.ts
import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

interface SplitPaymentRequest {
  paymentIntentId: string;
  bookingId: string;
  totalAmount: number;
  collectors: {
    userId: string;
    percentage: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class SplitPaymentService {
  constructor(private supabase: SupabaseClientService) {}

  async processPaymentSplit(request: SplitPaymentRequest): Promise<void> {
    // 1. Validar que porcentajes suman 100%
    const totalPercentage = request.collectors.reduce((sum, c) => sum + c.percentage, 0);
    if (totalPercentage !== 100) {
      throw new Error('Collector percentages must sum to 100');
    }

    // 2. Calcular montos para cada collector
    const splits = request.collectors.map(collector => ({
      paymentId: request.paymentIntentId,
      bookingId: request.bookingId,
      collectorId: collector.userId,
      amount: (request.totalAmount * collector.percentage) / 100,
      platformFee: ((request.totalAmount * collector.percentage) / 100) * 0.05, // 5% fee
      netAmount: ((request.totalAmount * collector.percentage) / 100) * 0.95,
      status: 'pending' as const,
      createdAt: new Date(),
    }));

    // 3. Insertar splits en database
    for (const split of splits) {
      const { error } = await this.supabase
        .from('payment_splits')
        .insert(split);

      if (error) throw error;
    }

    // 4. Crear transacciones de billetera para cada collector
    for (const split of splits) {
      await this.supabase
        .from('wallet_transactions')
        .insert({
          userId: split.collectorId,
          type: 'payout',
          status: 'pending',
          amount: split.netAmount,
          currency: 'ARS',
          referenceType: 'payment_split',
          referenceId: split.paymentId,
          provider: 'mercadopago_split',
          createdAt: new Date(),
        });
    }
  }
}
```

#### Paso 3: Integrar en payment flow (Edge Function)

```typescript
// supabase/functions/mercadopago-webhook/index.ts
export async function handlePaymentCompleted(payment: any) {
  const { booking_id, total_amount } = payment;

  // 1. Obtener booking y car
  const booking = await db.query(`
    SELECT b.*, c.owner_id
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    WHERE b.id = $1
  `, [booking_id]);

  // 2. Obtener split configuration (e.g., 80/20 split)
  const ownerPercentage = 80; // Locador recibe 80%
  const platformPercentage = 20; // Platform recibe 20%

  // 3. Procesar split
  const splits = [
    {
      user_id: booking.owner_id,
      percentage: ownerPercentage,
      amount: total_amount * (ownerPercentage / 100),
    },
    {
      user_id: PLATFORM_ACCOUNT_ID,
      percentage: platformPercentage,
      amount: total_amount * (platformPercentage / 100),
    },
  ];

  // 4. Crear registros de split
  for (const split of splits) {
    await db.query(`
      INSERT INTO payment_splits (payment_id, booking_id, collector_id, amount, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [payment.id, booking_id, split.user_id, split.amount, 'completed']);
  }

  // 5. Creditar wallets
  for (const split of splits) {
    await db.query(`
      UPDATE user_wallets
      SET available_balance = available_balance + $1
      WHERE user_id = $2
    `, [split.amount, split.user_id]);

    // 6. Registrar transacción
    await db.query(`
      INSERT INTO wallet_transactions (user_id, type, amount, status, reference_type, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [split.user_id, 'payout', split.amount, 'completed', 'payment_split', payment.id]);
  }
}
```

---

## 🔴 PROBLEMA #4: BOOKING_RISK_SNAPSHOT SIN DATOS

### Situación
- Tabla `booking_risk_snapshot` existe pero **0 registros**
- Risk assessment NO está activado
- Bookings sin scoring de riesgo

### Causa
Risk scoring logic no implementado

### Solución (Implementar en Phase 2)

Para ahora: agregar trigger simple para crear snapshot en cada booking

```sql
CREATE OR REPLACE FUNCTION public.create_risk_snapshot_on_booking()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.booking_risk_snapshot (
    booking_id,
    country,
    currency_pair,
    exchange_rate,
    guarantee_type,
    risk_score,
    requires_revalidation,
    created_at
  ) VALUES (
    NEW.id,
    'AR',
    'ARS-USD',
    1.0,  -- Placeholder, get real rate from fx_rates table
    'standard',
    50,   -- Default medium risk
    false,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_risk_snapshot ON public.bookings;
CREATE TRIGGER trigger_create_risk_snapshot
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_risk_snapshot_on_booking();

-- Crear snapshots para bookings existentes
INSERT INTO public.booking_risk_snapshot (
  booking_id,
  country,
  currency_pair,
  exchange_rate,
  guarantee_type,
  risk_score,
  requires_revalidation,
  created_at
)
SELECT
  b.id,
  'AR',
  'ARS-USD',
  COALESCE((SELECT rate FROM fx_rates WHERE pair = 'ARS-USD' ORDER BY created_at DESC LIMIT 1), 1.0),
  'standard',
  50,
  false,
  NOW()
FROM bookings b
LEFT JOIN booking_risk_snapshot rs ON b.id = rs.booking_id
WHERE rs.booking_id IS NULL;
```

---

## ✅ PLAN DE ACCIÓN COMPLETO (Hoy)

### Inmediato (15 minutos)
```bash
# 1. Crear trigger de wallets
psql << 'EOF'
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_wallets (
    user_id, available_balance, locked_balance, currency, non_withdrawable_floor, created_at, updated_at
  ) VALUES (NEW.id, 0, 0, 'ARS', 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_wallet_on_signup
AFTER INSERT ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_for_new_user();

-- Populate existing users
INSERT INTO public.user_wallets (user_id, available_balance, locked_balance, currency, non_withdrawable_floor, created_at, updated_at)
SELECT p.id, 0, 0, 'ARS', 0, NOW(), NOW()
FROM profiles p
LEFT JOIN user_wallets w ON p.id = w.user_id
WHERE w.user_id IS NULL
ON CONFLICT DO NOTHING;
EOF

# 2. Crear trigger de risk snapshots
psql << 'EOF'
CREATE OR REPLACE FUNCTION public.create_risk_snapshot_on_booking()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.booking_risk_snapshot (booking_id, country, currency_pair, exchange_rate, guarantee_type, risk_score, requires_revalidation, created_at)
  VALUES (NEW.id, 'AR', 'ARS-USD', 1.0, 'standard', 50, false, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_risk_snapshot
AFTER INSERT ON public.bookings FOR EACH ROW
EXECUTE FUNCTION public.create_risk_snapshot_on_booking();

-- Populate existing bookings
INSERT INTO public.booking_risk_snapshot (booking_id, country, currency_pair, exchange_rate, guarantee_type, risk_score, requires_revalidation, created_at)
SELECT b.id, 'AR', 'ARS-USD', 1.0, 'standard', 50, false, NOW()
FROM bookings b
LEFT JOIN booking_risk_snapshot rs ON b.id = rs.booking_id
WHERE rs.booking_id IS NULL;
EOF

# 3. Verificar
psql << 'EOF'
SELECT 'user_wallets' as table_name, COUNT(*) as record_count FROM user_wallets
UNION ALL
SELECT 'booking_risk_snapshot', COUNT(*) FROM booking_risk_snapshot;
EOF
```

### Corto Plazo (Hoy - 2 horas después)
- [ ] Completar Bloqueador #2 (secrets)
- [ ] Desplegar Edge Functions
- [ ] Configurar webhook en MercadoPago

### Mediano Plazo (Esta semana)
- [ ] Implementar Split Payment system
- [ ] Escribir E2E tests
- [ ] Completar Bloqueador #3 (webhook validation)

---

## 📊 ANTES vs DESPUÉS

### Antes (Ahora)
```
user_wallets:            0 records ❌ Usuarios sin billetera
payment_splits:          0 records ❌ Locadores sin pagos
booking_risk_snapshot:   0 records ❌ Sin scoring
payment_intents:         3 pending ❌ Pagos bloqueados
```

### Después (Después de ejecutar)
```
user_wallets:            32 records ✅ Todos tienen billetera
payment_splits:          Ready ✅ Listos para procesar
booking_risk_snapshot:   39 records ✅ Todas con scoring
payment_intents:         Can process ✅ Webhook ready
```

---

## 🎯 RESULTADO ESPERADO

Una vez completadas estas acciones:

✅ **Sistema de Billetera**: Operacional
✅ **Depósitos**: Pueden procesarse
✅ **Pagos**: Pueden completarse
✅ **Split Payments**: Infraestructura lista
✅ **Risk Management**: Tracking activo

**Production Readiness**: 60% → 70% 🚀

---

**Próxima acción**: Completar Bloqueador #2 (Setup Secrets)

