# Análisis: Separación de Balances del Wallet

**Fecha**: 2025-10-22
**Rama**: `debug/wallet-balance-split`
**Estado**: En Desarrollo

## 🎯 Problema Actual

El sistema muestra incorrectamente:
- **Total**: USD 10.00 ✅ (correcto)
- **Retirable**: USD 7.50 ❌ (incorrecto)
- **Crédito Protegido**: USD 2.50 ❌ (incorrecto)

### Root Cause

1. **Modelo de cómputo incorrecto**: El `non_withdrawable_balance` se calcula como `MIN(available, floor)` en lugar de basarse en transacciones específicas con `reference_type='credit_protected'`

2. **Confusión terminológica**: "Retirable" mezcla dos conceptos:
   - Fondos transferibles **dentro de la plataforma** (in-app)
   - Fondos retirables **a cuenta bancaria externa** (off-ramp)

3. **Inconsistencia de unidades**: Mezcla de centavos vs dólares en diferentes capas

## ✅ Solución Propuesta

### Tres Tipos de Balance

```
┌─────────────────────────────────────────────────┐
│  BALANCE TOTAL: USD 10.00                       │
├─────────────────────────────────────────────────┤
│  ├─ Crédito Protegido: USD 0.00                 │
│  │  • No retirable                              │
│  │  • No transferible                           │
│  │  • Solo para cubrir garantías de reservas    │
│  │  • Meta: USD 250.00                          │
│  │                                               │
│  ├─ Transferible (in-app): USD 10.00            │
│  │  • Pagar reservas dentro de Autorentar       │
│  │  • Transferir a otros usuarios               │
│  │  • NO es retiro a banco                      │
│  │                                               │
│  └─ Retirable (off-ramp): USD 10.00             │
│     • Solicitar envío a cuenta bancaria         │
│     • Sujeto a verificación KYC                 │
│     • Puede tener comisión                      │
└─────────────────────────────────────────────────┘
```

### Fórmulas de Cálculo

```typescript
// Backend (en centavos)
total_cents = SUM(deposits + bonuses - charges - withdrawals) WHERE status='completed'
locked_cents = SUM(locks - unlocks) WHERE status='completed'
protected_credit_cents = SUM(amount) WHERE reference_type='credit_protected' AND status='completed'

// Computed
available_cents = total_cents - locked_cents
transferable_cents = available_cents - protected_credit_cents
withdrawable_cents = transferable_cents - minimum_operational_hold (si aplica)
```

## 🔧 Implementación

### Backend Changes

#### 1. Agregar constraint para `reference_type`

```sql
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'deposit',
    'booking',
    'reward',
    'credit_protected',  -- ← NUEVO: para aportes al Crédito Autorentar
    'transfer',          -- ← NUEVO: transferencias entre usuarios
    'withdrawal'         -- ← NUEVO: retiros a banco
  ]));
```

#### 2. Vista de agregados

```sql
CREATE OR REPLACE VIEW wallet_user_aggregates AS
SELECT
  t.user_id,

  -- Total en centavos (solo completed)
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.type IN ('deposit', 'bonus', 'refund')
        THEN t.amount
      WHEN t.status='completed' AND t.type IN ('withdrawal', 'charge')
        THEN -t.amount
      ELSE 0
    END
  ), 0) AS total_cents,

  -- Bloqueos (locks) en centavos
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.type='lock'
        THEN t.amount
      WHEN t.status='completed' AND t.type='unlock'
        THEN -t.amount
      ELSE 0
    END
  ), 0) AS locked_cents,

  -- Crédito protegido aportado explícitamente
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.reference_type='credit_protected'
        THEN t.amount
      ELSE 0
    END
  ), 0) AS protected_credit_cents

FROM wallet_transactions t
GROUP BY t.user_id;
```

#### 3. RPC `wallet_get_balance()` actualizado

```sql
CREATE OR REPLACE FUNCTION wallet_get_balance()
RETURNS TABLE (
  available_balance NUMERIC(10, 2),
  transferable_balance NUMERIC(10, 2),
  withdrawable_balance NUMERIC(10, 2),
  protected_credit_balance NUMERIC(10, 2),
  locked_balance NUMERIC(10, 2),
  total_balance NUMERIC(10, 2),
  currency TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_total NUMERIC(10, 2) := 0;
  v_locked NUMERIC(10, 2) := 0;
  v_protected NUMERIC(10, 2) := 0;
  v_available NUMERIC(10, 2) := 0;
  v_transferable NUMERIC(10, 2) := 0;
  v_withdrawable NUMERIC(10, 2) := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener agregados desde la vista
  SELECT
    total_cents / 100.0,
    locked_cents / 100.0,
    protected_credit_cents / 100.0
  INTO v_total, v_locked, v_protected
  FROM wallet_user_aggregates
  WHERE user_id = v_user_id;

  -- Calcular balances derivados
  v_available := GREATEST(v_total - v_locked, 0);
  v_transferable := GREATEST(v_available - v_protected, 0);
  v_withdrawable := v_transferable; -- Por ahora, sin hold mínimo

  RETURN QUERY SELECT
    v_available AS available_balance,
    v_transferable AS transferable_balance,
    v_withdrawable AS withdrawable_balance,
    v_protected AS protected_credit_balance,
    v_locked AS locked_balance,
    v_total AS total_balance,
    'USD'::TEXT AS currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Changes

#### 1. Actualizar modelo `WalletBalance`

```typescript
// wallet.model.ts
export interface WalletBalance {
  available_balance: number;        // Total - Locked
  transferable_balance: number;     // Available - Protected (para in-app)
  withdrawable_balance: number;     // Transferable - Hold (para off-ramp)
  protected_credit_balance: number; // Crédito Autorentar (meta USD 250)
  locked_balance: number;           // En reservas activas
  total_balance: number;            // Total
  currency: string;                 // USD
}
```

#### 2. Actualizar signals en `WalletService`

```typescript
// wallet.service.ts
readonly availableBalance = computed(() => this.balance()?.available_balance ?? 0);
readonly transferableBalance = computed(() => this.balance()?.transferable_balance ?? 0);
readonly withdrawableBalance = computed(() => this.balance()?.withdrawable_balance ?? 0);
readonly protectedCreditBalance = computed(() => this.balance()?.protected_credit_balance ?? 0);
readonly lockedBalance = computed(() => this.balance()?.locked_balance ?? 0);
readonly totalBalance = computed(() => this.balance()?.total_balance ?? 0);
```

#### 3. Función de formateo consistente

```typescript
// wallet.utils.ts
export function formatCurrencyFromCents(cents: number): string {
  const amount = (cents ?? 0) / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

#### 4. UI/UX Updates

**Wallet Balance Card**:
```html
<!-- Balance Total -->
<p>US$ {{ totalBalance() / 100 | number:'1.2-2' }}</p>

<!-- Transferible (in-app) -->
<div class="info-box">
  <p class="label">Fondos Transferibles</p>
  <p class="amount">US$ {{ transferableBalance() / 100 | number:'1.2-2' }}</p>
  <p class="hint">Usalos dentro de Autorentar o envialos a otros usuarios.</p>
</div>

<!-- Retirable (off-ramp) -->
<div class="info-box">
  <p class="label">Fondos Retirables</p>
  <p class="amount">US$ {{ withdrawableBalance() / 100 | number:'1.2-2' }}</p>
  <p class="hint">Podés solicitar el envío a tu cuenta bancaria. Sujeto a verificación.</p>
</div>

<!-- Crédito Protegido -->
<div class="info-box">
  <p class="label">Crédito Autorentar</p>
  <p class="amount">US$ {{ protectedCreditBalance() / 100 | number:'1.2-2' }}</p>
  <p class="hint">No retirable. Se libera para futuras reservas.</p>
</div>
```

## 📊 Casos de Uso

### Caso 1: Usuario nuevo con depósito de USD 10

**Transacciones**:
```sql
INSERT INTO wallet_transactions (user_id, type, status, amount, reference_type)
VALUES ('user-123', 'deposit', 'completed', 1000, 'deposit'); -- USD 10.00
```

**Resultado**:
- Total: USD 10.00
- Transferible: USD 10.00
- Retirable: USD 10.00
- Crédito Protegido: USD 0.00

### Caso 2: Usuario aporta USD 250 al Crédito Autorentar

**Transacciones**:
```sql
-- Depósito inicial
INSERT INTO wallet_transactions (user_id, type, status, amount, reference_type)
VALUES ('user-123', 'deposit', 'completed', 1000, 'deposit'); -- USD 10.00

-- Aporte a crédito protegido
INSERT INTO wallet_transactions (user_id, type, status, amount, reference_type)
VALUES ('user-123', 'deposit', 'completed', 25000, 'credit_protected'); -- USD 250.00
```

**Resultado**:
- Total: USD 260.00
- Transferible: USD 10.00 (260 - 250)
- Retirable: USD 10.00
- Crédito Protegido: USD 250.00 ✅ Meta alcanzada

### Caso 3: Reserva activa con lock

**Transacciones**:
```sql
-- Depósito
INSERT INTO wallet_transactions (user_id, type, status, amount, reference_type)
VALUES ('user-123', 'deposit', 'completed', 30000, 'deposit'); -- USD 300.00

-- Lock por reserva
INSERT INTO wallet_transactions (user_id, type, status, amount, reference_type, reference_id)
VALUES ('user-123', 'lock', 'completed', 5000, 'booking', 'booking-456'); -- USD 50.00 bloqueado
```

**Resultado**:
- Total: USD 300.00
- Disponible: USD 250.00 (300 - 50 locked)
- Transferible: USD 250.00
- Retirable: USD 250.00
- Bloqueado: USD 50.00

## 🧪 Tests

```typescript
describe('WalletBalance Split', () => {
  it('debe separar transferible de retirable correctamente', async () => {
    const balance = await walletService.getBalance();

    expect(balance.total_balance).toBe(1000); // USD 10.00 en centavos
    expect(balance.transferable_balance).toBe(1000);
    expect(balance.withdrawable_balance).toBe(1000);
    expect(balance.protected_credit_balance).toBe(0);
  });

  it('debe restar crédito protegido de transferible', async () => {
    // Setup: agregar transacción de crédito protegido
    await createTransaction({
      type: 'deposit',
      amount: 25000,
      reference_type: 'credit_protected'
    });

    const balance = await walletService.getBalance();

    expect(balance.total_balance).toBe(25000); // USD 250
    expect(balance.protected_credit_balance).toBe(25000);
    expect(balance.transferable_balance).toBe(0); // 25000 - 25000
    expect(balance.withdrawable_balance).toBe(0);
  });
});
```

## 📝 Próximos Pasos

1. ✅ Crear vista `wallet_user_aggregates`
2. ✅ Actualizar RPC `wallet_get_balance()`
3. ✅ Actualizar modelo `WalletBalance` en frontend
4. ✅ Actualizar `WalletService` signals
5. ✅ Actualizar UI/UX con nuevos labels y tooltips
6. ✅ Crear tests unitarios y E2E
7. ✅ Migrar datos existentes (limpiar `non_withdrawable_floor`)
8. ✅ Deploy y verificación

## 🔄 Migración de Datos

```sql
-- Limpiar floor (ya no se usa)
UPDATE user_wallets
SET non_withdrawable_floor = 0
WHERE non_withdrawable_floor > 0;

-- Si había crédito protegido "fake", convertirlo a depósito normal
UPDATE wallet_transactions
SET reference_type = 'deposit'
WHERE reference_type IS NULL
  AND type = 'deposit';
```

## 📚 Referencias

- **Diseño original**: Conversación 2025-10-22
- **Issue**: Bug en separación retirable/protegido
- **Solución**: Basar crédito protegido en transacciones específicas, no en "floor"
