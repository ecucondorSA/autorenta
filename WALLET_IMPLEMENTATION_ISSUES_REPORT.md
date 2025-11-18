# 🚨 REPORTE: Problemas Críticos en Implementación de Wallet

**Fecha**: 15 de noviembre de 2025  
**Severidad**: 🔴 **CRÍTICA** - Sistema de wallet NO está implementado correctamente  
**Impacto**: Datos inconsistentes, lógica de negocio rota, pérdida de trazabilidad

---

## 📊 RESUMEN EJECUTIVO

La wallet de AutoRenta tiene **GRAVES inconsistencias** entre:
1. ❌ **Documentación** (`CLAUDE_PAYMENTS.md`)
2. ❌ **Estructura de BD** (tablas reales)
3. ❌ **Código Frontend** (`wallet.service.ts`, `wallet.model.ts`)
4. ❌ **Funciones RPC** (`wallet_get_balance`)

**Resultado**: Sistema de wallet NO funcional en producción.

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1️⃣ INCONSISTENCIA DE TIPOS DE DATOS

#### Documentación dice (CLAUDE_PAYMENTS.md):
```sql
CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY,
  balance DECIMAL(10,2) DEFAULT 0,           -- ❌ NO EXISTE
  locked_balance DECIMAL(10,2) DEFAULT 0,    -- ❌ NO EXISTE
  non_withdrawable_floor DECIMAL(10,2),      -- ❌ NO EXISTE
  ...
);
```

#### Realidad en BD:
```sql
CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY,
  balance_cents BIGINT NOT NULL DEFAULT 0,             -- ✅ CENTAVOS
  available_balance_cents BIGINT NOT NULL DEFAULT 0,   -- ✅ CENTAVOS
  locked_balance_cents BIGINT NOT NULL DEFAULT 0,      -- ✅ CENTAVOS
  autorentar_credit_balance_cents BIGINT NOT NULL DEFAULT 0,
  cash_deposit_balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  ...
);
```

**Problema**: 
- ❌ Documentación usa DECIMAL (pesos)
- ✅ BD real usa BIGINT (centavos)
- ❌ `non_withdrawable_floor` no existe, se reemplazó por `cash_deposit_balance_cents` + `autorentar_credit_balance_cents`

**Impacto**: Cualquier developer que lea la doc va a escribir código INCORRECTO.

---

### 2️⃣ TABLA `wallet_locks` NO EXISTE

#### Documentación menciona:
```sql
CREATE TABLE wallet_locks (
  id UUID PRIMARY KEY,
  user_id UUID,
  amount DECIMAL(10,2),
  status VARCHAR(20),
  ...
);
```

#### Realidad:
```sql
SELECT EXISTS (...) as wallet_locks_exists;
-- Result: FALSE ❌
```

**Problema**: La tabla `wallet_locks` nunca fue creada. El sistema de bloqueo de fondos NO está implementado correctamente.

**Impacto**:
- ❌ `wallet_lock_funds()` probablemente usa otra tabla o está roto
- ❌ No hay tracking de fondos bloqueados por booking
- ❌ No se puede auditar locks activos vs liberados

---

### 3️⃣ FUNCIÓN `wallet_get_balance()` ESTÁ ROTA

#### Implementación actual:
```sql
CREATE OR REPLACE FUNCTION public.wallet_get_balance()
RETURNS TABLE(...)
AS $function$
BEGIN
  -- ❌ INTENTA CALCULAR BALANCE DESDE accounting_ledger
  SELECT 
    COALESCE(SUM(credit - debit), 0)
  INTO v_available
  FROM accounting_ledger
  WHERE user_id = v_user_id
    AND account_code LIKE 'WALLET%'  -- ❌ PATRÓN GENÉRICO INCORRECTO
    AND is_reversed = false;
  
  -- ❌ LOCKED Y WITHDRAWABLE HARDCODEADOS A 0
  v_locked := 0;
  v_withdrawable := v_available;
  v_non_withdrawable := 0;
  
  RETURN QUERY SELECT ...;
END;
$function$
```

**Problemas críticos**:
1. ❌ **NO lee de `user_wallets`** (la tabla maestra)
2. ❌ Intenta calcular balance desde `accounting_ledger` usando patrón `LIKE 'WALLET%'` (incorrecto)
3. ❌ **`locked_balance` SIEMPRE retorna 0** (hardcoded)
4. ❌ **`non_withdrawable_balance` SIEMPRE retorna 0** (hardcoded)
5. ❌ No considera `autorentar_credit_balance_cents` ni `cash_deposit_balance_cents`

**Implementación correcta debería ser**:
```sql
CREATE OR REPLACE FUNCTION public.wallet_get_balance()
RETURNS TABLE(...) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- ✅ LEER DIRECTAMENTE DE user_wallets
  RETURN QUERY 
  SELECT
    available_balance_cents / 100.0 AS available_balance,
    (available_balance_cents - cash_deposit_balance_cents - autorentar_credit_balance_cents) / 100.0 AS withdrawable_balance,
    (cash_deposit_balance_cents + autorentar_credit_balance_cents) / 100.0 AS non_withdrawable_balance,
    locked_balance_cents / 100.0 AS locked_balance,
    balance_cents / 100.0 AS total_balance,
    currency
  FROM user_wallets
  WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 4️⃣ INCONSISTENCIA: CENTAVOS vs PESOS

#### Frontend espera (wallet.model.ts):
```typescript
export interface WalletBalance {
  available_balance: number;      // ❌ Espera PESOS (DECIMAL)
  locked_balance: number;          // ❌ Espera PESOS
  total_balance: number;           // ❌ Espera PESOS
  withdrawable_balance: number;    // ❌ Espera PESOS
  ...
}
```

#### BD almacena:
```sql
available_balance_cents BIGINT   -- ✅ CENTAVOS
locked_balance_cents BIGINT      -- ✅ CENTAVOS
balance_cents BIGINT             -- ✅ CENTAVOS
```

**Problema**: 
- ❌ Frontend espera `balance: 100.50` (pesos)
- ✅ BD almacena `balance_cents: 10050` (centavos)
- ❌ RPC `wallet_get_balance()` NO hace la conversión `/100.0`

**Impacto**: Los balances van a aparecer 100x más grandes en la UI.

**Ejemplo**:
```
User tiene $500.00 en wallet
BD almacena: balance_cents = 50000
RPC retorna: available_balance = 50000 (SIN dividir por 100)
Frontend muestra: $50,000.00 ❌ (100x más)
```

---

### 5️⃣ CONSTRAINTS DE BD vs DOCUMENTACIÓN

#### Constraints reales en `user_wallets`:
```sql
✅ balance_consistency: balance_cents = available_balance_cents + locked_balance_cents
✅ balance_non_negative: balance_cents >= 0
✅ available_non_negative: available_balance_cents >= 0
✅ locked_non_negative: locked_balance_cents >= 0
```

**Buenas noticias**: Los constraints están bien implementados y previenen inconsistencias.

**PERO**: La función `wallet_get_balance()` NO respeta esta estructura y retorna datos incorrectos.

---

### 6️⃣ SISTEMA DE WALLET_LOCKS FALTA

#### Documentación promete:
- `wallet_lock_funds(booking_id, amount)` → Bloquea fondos
- `wallet_unlock_funds(booking_id)` → Libera fondos
- Tabla `wallet_locks` para tracking

#### Realidad:
- ❌ Tabla `wallet_locks` no existe
- ✅ Función `wallet_lock_funds()` existe (pero probablemente rota)
- ✅ Función `wallet_unlock_funds()` existe (pero probablemente rota)

**Necesitamos verificar**: ¿Cómo están implementadas estas funciones sin la tabla?

---

### 7️⃣ WALLET_TRANSACTIONS vs WALLET_LEDGER (Dual System)

#### Hay DOS tablas de transacciones:
1. **`wallet_transactions`** (sistema legacy)
   - 3 registros actuales
   - Almacena `amount` en CENTAVOS (BIGINT)
   - Status: pending/completed/failed

2. **`wallet_ledger`** (sistema nuevo de doble partida)
   - Mencionado en código pero NO verificado
   - Supuestamente sistema contable doble entrada

**Problema**: Sistema dual no está sincronizado. Documentación no menciona `wallet_ledger`.

---

## 📉 DATOS ACTUALES (Estado Real)

### user_wallets (2 usuarios):
```
User 1: balance_cents=50,000,000 (500k ARS), locked=0, available=50M
User 2: balance_cents=20,000,000 (200k ARS), locked=15M, available=5M
```

### wallet_transactions (3 transacciones):
```
1. User 2: deposit 20,000,000 (200k) - completed
2. User 1: deposit 50,000,000 (500k) - completed  
3. User 2: lock 15,000,000 (150k) - completed
```

**Validación**: 
✅ Balance User 1 = 50M (correcto según transacciones)
✅ Balance User 2 = 20M - 15M = 5M available (correcto)

**Conclusión**: Los datos actuales están BIEN. El problema es la FUNCIÓN `wallet_get_balance()` que NO lee estos datos correctamente.

---

## 🚨 IMPACTO EN PRODUCCIÓN

Si un usuario abre la página `/wallet`:

1. ❌ Frontend llama `walletService.getBalance()`
2. ❌ Service llama RPC `wallet_get_balance()`
3. ❌ RPC retorna balance INCORRECTO (calculado desde accounting_ledger)
4. ❌ UI muestra balance erróneo (probablemente $0 o 100x más)
5. ❌ Usuario intenta depositar/retirar → FALLA (balance real vs mostrado no coincide)

**Resultado**: Sistema de wallet NO funcional.

---

## ✅ SOLUCIONES REQUERIDAS

### PRIORIDAD P0 (CRÍTICO - Arreglar YA):

#### 1. Arreglar `wallet_get_balance()`
```sql
-- Archivo: supabase/migrations/20251115_fix_wallet_get_balance.sql
CREATE OR REPLACE FUNCTION public.wallet_get_balance()
RETURNS TABLE(
  available_balance NUMERIC,
  withdrawable_balance NUMERIC,
  non_withdrawable_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  transferable_balance NUMERIC,
  autorentar_credit_balance NUMERIC,
  cash_deposit_balance NUMERIC,
  protected_credit_balance NUMERIC,
  currency TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Leer directamente de user_wallets
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    -- Crear wallet si no existe
    INSERT INTO user_wallets (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Retornar balances en PESOS (dividir centavos por 100)
  RETURN QUERY SELECT
    v_wallet.available_balance_cents / 100.0 AS available_balance,
    (v_wallet.available_balance_cents - v_wallet.cash_deposit_balance_cents - v_wallet.autorentar_credit_balance_cents) / 100.0 AS withdrawable_balance,
    (v_wallet.cash_deposit_balance_cents + v_wallet.autorentar_credit_balance_cents) / 100.0 AS non_withdrawable_balance,
    v_wallet.locked_balance_cents / 100.0 AS locked_balance,
    v_wallet.balance_cents / 100.0 AS total_balance,
    v_wallet.available_balance_cents / 100.0 AS transferable_balance,
    v_wallet.autorentar_credit_balance_cents / 100.0 AS autorentar_credit_balance,
    v_wallet.cash_deposit_balance_cents / 100.0 AS cash_deposit_balance,
    (v_wallet.cash_deposit_balance_cents + v_wallet.autorentar_credit_balance_cents) / 100.0 AS protected_credit_balance,
    v_wallet.currency;
END;
$$;
```

#### 2. Crear tabla `wallet_locks` (si es necesaria)
```sql
-- Si el sistema actual NO usa wallet_locks, documentar que se usa locked_balance_cents en user_wallets
-- Si SÍ es necesaria, crear:
CREATE TABLE IF NOT EXISTS wallet_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'charged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  charged_at TIMESTAMPTZ,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_wallet_locks_user_status ON wallet_locks(user_id, status);
CREATE INDEX idx_wallet_locks_booking ON wallet_locks(booking_id);
```

#### 3. Actualizar documentación CLAUDE_PAYMENTS.md
- ✅ Cambiar DECIMAL a BIGINT (centavos)
- ✅ Agregar `autorentar_credit_balance_cents` y `cash_deposit_balance_cents`
- ✅ Remover `non_withdrawable_floor` (no existe)
- ✅ Clarificar si `wallet_locks` se usa o no

---

### PRIORIDAD P1 (ALTA - Después de P0):

#### 4. Verificar funciones `wallet_lock_funds` y `wallet_unlock_funds`
```sql
-- Ver implementación actual
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'wallet_lock_funds';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'wallet_unlock_funds';
```

Si están rotas, arreglarlas.

#### 5. Agregar tests de integración
```typescript
// apps/web/src/app/core/services/wallet.service.spec.ts
describe('WalletService - Balance Display', () => {
  it('should convert centavos to pesos correctly', async () => {
    // Mock: user_wallets.balance_cents = 50000
    const balance = await walletService.getBalance().toPromise();
    
    expect(balance.available_balance).toBe(500.00); // ✅ PESOS, no 50000
    expect(balance.total_balance).toBe(500.00);
  });
  
  it('should show locked balance correctly', async () => {
    // Mock: locked_balance_cents = 15000
    const balance = await walletService.getBalance().toPromise();
    
    expect(balance.locked_balance).toBe(150.00); // ✅ PESOS
  });
});
```

---

### PRIORIDAD P2 (MEDIA - Mejoras):

#### 6. Consolidar sistema dual wallet_transactions + wallet_ledger
- Decidir si usar solo `wallet_ledger` (sistema contable doble entrada)
- O mantener `wallet_transactions` como fuente de verdad
- Migrar datos si es necesario

#### 7. Agregar validaciones en Frontend
```typescript
// apps/web/src/app/core/services/wallet.service.ts
getBalance(): Observable<WalletBalance> {
  return from(this.supabase.rpc('wallet_get_balance')).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      const balance = data[0];
      
      // ✅ VALIDAR que los números sean razonables
      if (balance.available_balance > 10000000) {
        console.error('Balance suspiciosamente alto - posible bug de centavos/pesos');
      }
      
      // ✅ VALIDAR que balance total = available + locked
      const expectedTotal = balance.available_balance + balance.locked_balance;
      if (Math.abs(balance.total_balance - expectedTotal) > 0.01) {
        console.error('Balance inconsistente - total no suma available + locked');
      }
      
      return balance;
    })
  );
}
```

---

## 📋 CHECKLIST DE VALIDACIÓN POST-FIX

Después de aplicar los fixes, verificar:

- [ ] `wallet_get_balance()` retorna balances en PESOS (no centavos)
- [ ] Balance total = available + locked (constraint validado)
- [ ] Frontend muestra balances correctos ($500.00, no $50,000.00)
- [ ] `wallet_lock_funds()` actualiza `locked_balance_cents` correctamente
- [ ] `wallet_unlock_funds()` libera fondos correctamente
- [ ] Deposits acreditan fondos a `available_balance_cents`
- [ ] Withdrawals restan de `available_balance_cents` (si <= withdrawable)
- [ ] Documentación CLAUDE_PAYMENTS.md actualizada con estructura real

---

## 🎯 CONCLUSIÓN

**Estado actual**: 🔴 **WALLET NO FUNCIONAL**

**Causa raíz**: 
1. Función `wallet_get_balance()` NO lee de `user_wallets`
2. Inconsistencia centavos vs pesos sin conversión
3. Documentación desactualizada

**Tiempo estimado de fix**: 
- P0: 2-3 horas (arreglar función + testing manual)
- P1: 4-6 horas (verificar lock/unlock + tests)
- P2: 1-2 días (consolidar sistema dual + validaciones)

**Recomendación**: 
🚨 **NO LANZAR A PRODUCCIÓN** hasta arreglar `wallet_get_balance()`.
Los usuarios verían balances incorrectos y el sistema de pagos fallaría.

---

**Documentado por**: GitHub Copilot  
**Fecha**: 2025-11-15  
**Revisión requerida**: Antes de merge a main
