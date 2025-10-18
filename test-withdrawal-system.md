# 🧪 Test del Sistema de Retiros - AutoRenta

## Prerequisitos

1. **Usuario de prueba con saldo en wallet**
2. **Acceso a Supabase SQL Editor**
3. **PostgreSQL client configurado**

---

## 📋 Pruebas de la API

### 1️⃣ Preparación: Crear usuario de prueba con saldo

```sql
-- 1. Crear usuario con saldo en wallet (si no existe)
-- Reemplazar 'TU_USER_ID' con un UUID real de la tabla auth.users

DO $$
DECLARE
  v_user_id UUID := 'TU_USER_ID'; -- 🔴 REEMPLAZAR CON USER ID REAL
BEGIN
  -- Crear o actualizar wallet con saldo
  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_user_id, 5000.00, 0, 'USD')
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = 5000.00,
    updated_at = NOW();

  RAISE NOTICE 'Wallet creado/actualizado con $5000 para user %', v_user_id;
END $$;
```

---

### 2️⃣ Prueba: Agregar cuenta bancaria

```sql
-- Test 1: Agregar cuenta CBU
INSERT INTO bank_accounts (
  user_id,
  account_type,
  account_number,
  account_holder_name,
  account_holder_document,
  bank_name,
  is_active,
  is_default
)
VALUES (
  'TU_USER_ID', -- 🔴 REEMPLAZAR
  'cbu',
  '0170018740000000123456',
  'Juan Pérez',
  '20123456789',
  'Banco Galicia',
  true,
  true
)
RETURNING id, account_number, is_default;

-- Verificar que se creó correctamente
SELECT * FROM bank_accounts WHERE user_id = 'TU_USER_ID';
```

**Resultado esperado:**
```
✅ Cuenta creada con is_default = true
✅ account_number enmascarado en la UI
```

---

### 3️⃣ Prueba: Solicitar retiro (RPC Function)

```sql
-- Test 2: Solicitar retiro de $1000
-- La comisión será $15 (1.5%), neto $985

SELECT * FROM wallet_request_withdrawal(
  p_bank_account_id := (
    SELECT id FROM bank_accounts
    WHERE user_id = 'TU_USER_ID'
    AND is_default = true
    LIMIT 1
  ),
  p_amount := 1000.00,
  p_user_notes := 'Prueba de retiro desde script SQL'
);
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Solicitud de retiro creada exitosamente. Será procesada en breve.",
  "request_id": "uuid-de-la-solicitud",
  "fee_amount": 15.00,
  "net_amount": 985.00,
  "new_available_balance": 5000.00
}
```

**Verificar en la base de datos:**
```sql
-- Ver la solicitud creada
SELECT
  id,
  amount,
  fee_amount,
  net_amount,
  status,
  created_at,
  user_notes
FROM withdrawal_requests
WHERE user_id = 'TU_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 4️⃣ Prueba: Aprobar retiro (Admin)

```sql
-- Test 3: Aprobar la solicitud (como admin)

SELECT * FROM wallet_approve_withdrawal(
  p_request_id := (
    SELECT id FROM withdrawal_requests
    WHERE user_id = 'TU_USER_ID'
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  p_admin_notes := 'Aprobado para testing del sistema'
);
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Solicitud aprobada. Procesando transferencia...",
  "provider": "mercadopago",
  "amount": 985.00,
  "recipient": "0170018740000000123456"
}
```

---

### 5️⃣ Prueba: Completar retiro (Simular webhook)

```sql
-- Test 4: Simular que MercadoPago completó la transferencia

SELECT * FROM wallet_complete_withdrawal(
  p_request_id := (
    SELECT id FROM withdrawal_requests
    WHERE user_id = 'TU_USER_ID'
    AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  p_provider_transaction_id := 'MP-TEST-' || gen_random_uuid()::text,
  p_provider_metadata := '{"test": true, "simulated": true}'::jsonb
);
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Retiro completado exitosamente. $985.00 transferido.",
  "wallet_transaction_id": "uuid-de-la-transaccion"
}
```

**Verificar el wallet:**
```sql
-- El saldo debe haberse debitado
SELECT
  user_id,
  available_balance, -- Debe ser $5000 - $1015 = $3985
  locked_balance,
  updated_at
FROM user_wallets
WHERE user_id = 'TU_USER_ID';

-- Ver la transacción de wallet creada
SELECT
  id,
  type,           -- Debe ser 'withdrawal'
  amount,         -- Debe ser $1015 (monto + comisión)
  status,         -- Debe ser 'completed'
  description,
  created_at
FROM wallet_transactions
WHERE user_id = 'TU_USER_ID'
AND type = 'withdrawal'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 6️⃣ Prueba: Validaciones de error

#### Test 6.1: Intentar retiro con saldo insuficiente

```sql
-- Intentar retirar más de lo disponible
SELECT * FROM wallet_request_withdrawal(
  p_bank_account_id := (SELECT id FROM bank_accounts WHERE user_id = 'TU_USER_ID' LIMIT 1),
  p_amount := 10000.00,  -- Más del saldo disponible
  p_user_notes := 'Prueba de error: saldo insuficiente'
);
```

**Resultado esperado:**
```json
{
  "success": false,
  "message": "Saldo insuficiente. Disponible: $3985.00, Necesario: $10150.00 (incluye comisión de $150.00)"
}
```

#### Test 6.2: Intentar retiro con monto mínimo inválido

```sql
SELECT * FROM wallet_request_withdrawal(
  p_bank_account_id := (SELECT id FROM bank_accounts WHERE user_id = 'TU_USER_ID' LIMIT 1),
  p_amount := 50.00,  -- Menor al mínimo ($100)
  p_user_notes := 'Prueba de error: monto muy bajo'
);
```

**Resultado esperado:**
```json
{
  "success": false,
  "message": "El monto mínimo de retiro es $100 ARS"
}
```

---

### 7️⃣ Prueba: Marcar retiro como fallido

```sql
-- Test 7: Simular que la transferencia falló

-- Primero crear una solicitud y aprobarla
INSERT INTO withdrawal_requests (user_id, bank_account_id, amount, fee_amount, status)
SELECT
  'TU_USER_ID',
  id,
  200.00,
  3.00,
  'processing'
FROM bank_accounts WHERE user_id = 'TU_USER_ID' LIMIT 1
RETURNING id;

-- Marcar como fallida
SELECT * FROM wallet_fail_withdrawal(
  p_request_id := (
    SELECT id FROM withdrawal_requests
    WHERE user_id = 'TU_USER_ID'
    AND status = 'processing'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  p_failure_reason := 'MercadoPago error: Cuenta bancaria inválida'
);
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Retiro marcado como fallido: MercadoPago error: Cuenta bancaria inválida"
}
```

---

## 🎯 Resumen de Pruebas

| # | Test | Resultado Esperado | Status |
|---|------|-------------------|--------|
| 1 | Agregar cuenta bancaria | Cuenta creada con CBU válido | ⏳ |
| 2 | Solicitar retiro válido | Solicitud en estado 'pending' | ⏳ |
| 3 | Aprobar retiro | Estado cambia a 'approved' | ⏳ |
| 4 | Completar retiro | Fondos debitados, estado 'completed' | ⏳ |
| 5 | Saldo insuficiente | Error con mensaje claro | ⏳ |
| 6 | Monto mínimo | Error: mínimo $100 | ⏳ |
| 7 | Retiro fallido | Estado 'failed' con razón | ⏳ |

---

## 🔍 Queries Útiles para Debugging

### Ver todas las solicitudes de un usuario
```sql
SELECT
  wr.id,
  wr.amount,
  wr.fee_amount,
  wr.net_amount,
  wr.status,
  wr.created_at,
  wr.completed_at,
  ba.account_type,
  ba.account_number
FROM withdrawal_requests wr
JOIN bank_accounts ba ON wr.bank_account_id = ba.id
WHERE wr.user_id = 'TU_USER_ID'
ORDER BY wr.created_at DESC;
```

### Ver balance de wallet
```sql
SELECT * FROM wallet_get_balance();
```

### Ver transacciones de wallet
```sql
SELECT
  type,
  amount,
  status,
  description,
  created_at
FROM wallet_transactions
WHERE user_id = 'TU_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📝 Notas

1. **Reemplazar `'TU_USER_ID'`** en todos los scripts con un UUID real de auth.users
2. **Los CBU/CVU deben tener 22 dígitos** para pasar validaciones
3. **La comisión es 1.5%** sobre el monto solicitado
4. **Estado del wallet se actualiza** solo cuando el retiro se completa

---

## ✅ Checklist de Implementación

- [ ] Base de datos migrada
- [ ] RPC Functions creadas
- [ ] Cuenta bancaria agregada
- [ ] Solicitud de retiro creada
- [ ] Aprobación funciona
- [ ] Completar retiro funciona
- [ ] Validaciones funcionan
- [ ] Saldo se debita correctamente
- [ ] Transacciones se registran
- [ ] Edge Function deployada (próximo paso)
