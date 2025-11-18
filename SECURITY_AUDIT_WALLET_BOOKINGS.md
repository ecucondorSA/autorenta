# Auditoría de Seguridad: Wallet & Bookings

**Fecha**: 2025-11-18
**Scope**: Wallets (user_wallets, wallet_transactions) y Bookings
**Método**: Revisión manual de migraciones SQL

---

## 🚨 HALLAZGOS CRÍTICOS (P0)

### 1. ❌ NO HAY RLS POLICIES PARA WALLETS
**Severidad**: P0 CRÍTICA
**Tablas afectadas**: `user_wallets`, `wallet_transactions`

**Problema**:
- No se encontraron migraciones con RLS policies para tablas de wallet
- Sin RLS, cualquier usuario autenticado puede:
  - Leer balance de otros usuarios
  - Ver transacciones de otros usuarios
  - Potencialmente modificar datos (si no hay otros controles)

**Evidencia**:
```bash
grep -r "RLS\|POLICY" supabase/migrations/*wallet*.sql
# No matches found
```

**Impacto**:
- **GDPR/PCI-DSS violation** - Datos financieros sin protección
- **Breach potencial** - Acceso no autorizado a balances
- **Liability** - Responsabilidad legal

**Recomendación URGENTE**:
```sql
-- Habilitar RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy para user_wallets
CREATE POLICY user_wallets_select_own 
  ON user_wallets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY user_wallets_update_own 
  ON user_wallets FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy para wallet_transactions
CREATE POLICY wallet_transactions_select_own 
  ON wallet_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT/UPDATE solo via RPC functions
CREATE POLICY wallet_transactions_insert_via_rpc 
  ON wallet_transactions FOR INSERT 
  WITH CHECK (FALSE); -- Solo via RPC SECURITY DEFINER

CREATE POLICY wallet_transactions_update_via_rpc 
  ON wallet_transactions FOR UPDATE 
  USING (FALSE); -- Solo via RPC SECURITY DEFINER
```

---

### 2. ⚠️ FUNCIONES SECURITY DEFINER SIN VALIDACIÓN COMPLETA
**Severidad**: P0 CRÍTICA
**Función**: `wallet_confirm_deposit_admin()`

**Problema**:
La función es SECURITY DEFINER (ejecuta con permisos de owner) pero:
- ✅ Tiene validaciones de monto
- ✅ Previene duplicados de provider_transaction_id
- ❌ NO valida que el caller sea admin
- ❌ Cualquier usuario puede llamarla si conoce el user_id y transaction_id

**Código problemático** (línea 92-93):
```sql
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Ejecuta con permisos elevados
AS $function$
```

**Sin validación de rol**:
```sql
-- FALTA ESTO:
IF NOT EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
) THEN
  RAISE EXCEPTION 'Solo admins pueden confirmar depósitos';
END IF;
```

**Impacto**:
- Usuario malicioso puede confirmar depósitos de otros
- Bypass de validaciones de pago
- Creación de saldo ficticio

**Recomendación URGENTE**:
Agregar validación de rol al inicio de la función.

---

## ⚠️ HALLAZGOS DE ALTO RIESGO (P1)

### 3. ⚠️ NO HAY CONSTRAINTS EN user_wallets PARA BALANCES
**Severidad**: P1 ALTA

**Problema**:
La tabla `user_wallets` no tiene constraints para prevenir estados inválidos:
- Sin `CHECK (available_balance >= 0)`
- Sin `CHECK (locked_balance >= 0)`
- Sin `CHECK (non_withdrawable_floor >= 0)`
- Sin `CHECK (non_withdrawable_floor <= available_balance)`

**Impacto**:
- Balances negativos posibles (aunque cálculos en funciones lo prevengan)
- Estados inconsistentes en DB
- Dificultad para debugging

**Recomendación**:
```sql
ALTER TABLE user_wallets
  ADD CONSTRAINT check_available_balance_non_negative
  CHECK (available_balance >= 0);

ALTER TABLE user_wallets
  ADD CONSTRAINT check_locked_balance_non_negative
  CHECK (locked_balance >= 0);

ALTER TABLE user_wallets
  ADD CONSTRAINT check_non_withdrawable_floor_non_negative
  CHECK (non_withdrawable_floor >= 0);

ALTER TABLE user_wallets
  ADD CONSTRAINT check_non_withdrawable_floor_within_available
  CHECK (non_withdrawable_floor <= available_balance);
```

---

### 4. ⚠️ VALIDACIONES SOLO EN wallet_transactions, NO EN user_wallets

**Buenas validaciones existentes en wallet_transactions**:
- ✅ CHECK amount > 0 (línea 37-38)
- ✅ CHECK currency IN ('USD', 'ARS', 'EUR') (línea 44-45)
- ✅ CHECK type válido (línea 51-52)
- ✅ CHECK status válido (línea 58-59)
- ✅ CHECK provider válido (línea 65-66)
- ✅ UNIQUE INDEX para provider_transaction_id (línea 28-30)
- ✅ Trigger para prevenir modificación de completed (línea 230-235)

**Faltante**:
- ❌ Constraints en user_wallets (tabla principal de balances)
- ❌ Constraint para total_balance = available_balance + locked_balance

---

## 🔍 HALLAZGOS ADICIONALES

### 5. ℹ️ Rate Limiting Implementado
**Función**: `check_user_pending_deposits_limit()` (línea 238-254)

✅ **Buena práctica**: Limita a 10 depósitos pending en 7 días

**Mejora sugerida**:
- Agregar rate limiting por IP
- Agregar rate limiting por monto total (ej: max $10k/día)

---

### 6. ℹ️ Cleanup de Pending Deposits
**Función**: `cleanup_old_pending_deposits()` (línea 270-289)

✅ **Buena práctica**: Auto-cancela pending > 30 días

**Mejora sugerida**:
- Ejecutar automáticamente vía pg_cron
- Notificar al usuario antes de cancelar

---

### 7. ℹ️ Audit Log Implementado
**Tabla**: `wallet_audit_log` (línea 257-267)

✅ **Buena práctica**: Tabla de auditoría

**Mejora sugerida**:
- Agregar triggers para auto-log en INSERT/UPDATE
- Agregar audit de funciones SECURITY DEFINER
- Immutable (prohibir DELETE)

---

## 📊 RESUMEN DE RIESGOS

| # | Hallazgo | Severidad | CVSS | Estado |
|---|----------|-----------|------|--------|
| 1 | No RLS en wallets | P0 | 9.1 | 🔴 CRÍTICO |
| 2 | SECURITY DEFINER sin validación rol | P0 | 8.8 | 🔴 CRÍTICO |
| 3 | No constraints en user_wallets | P1 | 6.5 | 🟡 ALTO |
| 4 | Validaciones solo en transactions | P1 | 5.3 | 🟡 MEDIO |
| 5 | Rate limiting básico | P2 | 3.1 | 🟢 INFO |
| 6 | Cleanup manual | P2 | 2.3 | 🟢 INFO |
| 7 | Audit log parcial | P2 | 2.1 | 🟢 INFO |

**CVSS Score Total**: **8.2/10 (HIGH)**

---

## ✅ PLAN DE REMEDIACIÓN

### Fase 1: URGENTE (Hoy - 2 horas)

1. **Habilitar RLS en wallets** (30 min)
   - ALTER TABLE ENABLE ROW LEVEL SECURITY
   - CREATE POLICY para SELECT (user_id = auth.uid())
   - TEST con diferentes usuarios

2. **Validar rol en wallet_confirm_deposit_admin** (30 min)
   - Agregar check de role = 'admin'
   - Test con usuario no-admin (debe fallar)

3. **Agregar constraints en user_wallets** (30 min)
   - CHECK balances >= 0
   - CHECK non_withdrawable_floor <= available_balance
   - TEST con datos inválidos

4. **Deploy a staging y testing** (30 min)

### Fase 2: Alto Riesgo (Mañana - 4 horas)

5. Auditar otras funciones SECURITY DEFINER
6. Agregar audit triggers automáticos
7. Implementar rate limiting mejorado
8. Tests de concurrencia

### Fase 3: Mejoras (Esta semana)

9. pg_cron para cleanup automático
10. Notificaciones antes de cancelar
11. Dashboard de audit log
12. Tests E2E de security

---

## 🧪 TESTS REQUERIDOS

### Tests de RLS:
```sql
-- Test 1: Usuario A no puede ver wallet de Usuario B
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
SELECT * FROM user_wallets WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows

-- Test 2: Usuario A puede ver su propio wallet
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
SELECT * FROM user_wallets WHERE user_id = 'user-a-uuid';
-- Expected: 1 row
```

### Tests de Constraints:
```sql
-- Test 3: Balance negativo debe fallar
UPDATE user_wallets SET available_balance = -100 WHERE user_id = 'test-uuid';
-- Expected: ERROR constraint check_available_balance_non_negative

-- Test 4: Non-withdrawable > available debe fallar
UPDATE user_wallets 
SET non_withdrawable_floor = 1000, available_balance = 500 
WHERE user_id = 'test-uuid';
-- Expected: ERROR constraint check_non_withdrawable_floor_within_available
```

---

**Siguiente paso**: Implementar Fase 1 (RLS + validaciones) AHORA
