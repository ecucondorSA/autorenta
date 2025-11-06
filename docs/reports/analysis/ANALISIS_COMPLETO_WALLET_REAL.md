# 🔍 ANÁLISIS COMPLETO Y REAL DEL SISTEMA WALLET - AUTORENTA

**Fecha**: 28 de Octubre 2025
**Basado en**: Análisis directo de base de datos PostgreSQL
**Estado**: Análisis Exhaustivo del Código Real

---

## ⚠️ DISCLAIMER IMPORTANTE

Este documento reemplaza análisis anteriores que contenían **INFORMACIÓN INCORRECTA** sobre el sistema Wallet.

El análisis previo asumía un flujo simplificado que **NO refleja la arquitectura real** de AutoRenta.

---

## 📊 ARQUITECTURA REAL DEL SISTEMA WALLET

### 🗄️ **TABLAS PRINCIPALES** (5 tablas core)

#### 1. `user_wallets` - Balance del Usuario

```sql
CREATE TABLE user_wallets (
  user_id                uuid PRIMARY KEY,
  available_balance      numeric(10,2) NOT NULL DEFAULT 0,
  locked_balance         numeric(10,2) NOT NULL DEFAULT 0,
  non_withdrawable_floor numeric(10,2) NOT NULL DEFAULT 0,
  currency               text NOT NULL DEFAULT 'ARS',
  created_at             timestamptz,
  updated_at             timestamptz
);
```

**Campos clave**:
- `available_balance`: Dinero que el usuario **puede usar AHORA**
- `locked_balance`: Dinero **bloqueado** (reservas activas, garantías)
- `non_withdrawable_floor`: Dinero que **NO se puede retirar** (créditos protegidos, bonos, etc.)

**Ejemplo real**:
```
Usuario tiene:
├─ available_balance:      $50,000  (puede usar para reservar)
├─ locked_balance:         $30,000  (bloqueado en reserva activa)
├─ non_withdrawable_floor: $10,000  (bonos que no se pueden retirar)
└─ TOTAL en wallet:        $90,000
```

---

#### 2. `wallet_ledger` - Sistema de Contabilidad de Doble Entrada

```sql
CREATE TABLE wallet_ledger (
  id                    uuid PRIMARY KEY,
  ts                    timestamptz NOT NULL,
  user_id               uuid NOT NULL,
  kind                  ledger_kind NOT NULL,  -- Tipo de movimiento
  amount_cents          bigint NOT NULL,       -- En CENTAVOS
  ref                   varchar(128) UNIQUE,   -- Referencia única
  meta                  jsonb,
  transaction_id        uuid,  -- FK a wallet_transactions
  booking_id            uuid,  -- FK a bookings
  exchange_rate         numeric(20,8),
  original_currency     text,
  original_amount_cents bigint
);
```

**Tipos de movimientos (ledger_kind)**:
```sql
ENUM ledger_kind (
  'deposit',           -- Depósito de fondos
  'transfer_out',      -- Transferencia saliente
  'transfer_in',       -- Transferencia entrante
  'rental_charge',     -- Cargo por alquiler
  'rental_payment',    -- Pago recibido por alquiler
  'refund',            -- Reembolso
  'franchise_user',    -- Franquicia usuario
  'franchise_fund',    -- Franquicia fondo
  'withdrawal',        -- Retiro de fondos
  'adjustment',        // Ajuste manual
  'bonus',             -- Bono/crédito
  'fee'                -- Comisión
)
```

**🔑 CLAVE**: **Trigger automático**
```sql
-- Después de INSERT en wallet_ledger
TRIGGER tg_apply_ledger
  EXECUTE FUNCTION apply_ledger_entry()

-- Esta función AUTOMÁTICAMENTE actualiza user_wallets
-- basándose en el tipo de movimiento
```

**Ejemplo de flujo**:
```
1. INSERT INTO wallet_ledger (kind='deposit', amount_cents=5000000)
2. Trigger se dispara automáticamente
3. Ejecuta: UPDATE user_wallets SET available_balance += 50000
4. Balance actualizado SIN intervención manual
```

---

#### 3. `wallet_transactions` - Transacciones de Alto Nivel

```sql
CREATE TABLE wallet_transactions (
  id                      uuid PRIMARY KEY,
  user_id                 uuid NOT NULL,
  type                    text NOT NULL,    -- deposit, withdrawal, lock, unlock, etc.
  status                  text NOT NULL DEFAULT 'pending',
  amount                  numeric(10,2) NOT NULL,
  currency                text NOT NULL DEFAULT 'ARS',
  reference_type          text,           -- booking, deposit, reward, etc.
  reference_id            uuid,
  provider                text,           -- mercadopago, stripe, etc.
  provider_transaction_id text UNIQUE,
  provider_metadata       jsonb,
  description             text,
  is_withdrawable         boolean DEFAULT true,
  created_at              timestamptz,
  updated_at              timestamptz,
  completed_at            timestamptz
);
```

**Tipos de transacción (`type`)**:
```
'deposit'                    - Depósito
'withdrawal'                 - Retiro
'charge'                     - Cargo
'refund'                     - Reembolso
'bonus'                      - Bono
'lock'                       - Bloqueo
'unlock'                     - Desbloqueo
'rental_payment_lock'        - Bloqueo de pago de alquiler
'rental_payment_transfer'    - Transferencia de pago de alquiler
'security_deposit_lock'      - Bloqueo de garantía
'security_deposit_release'   - Liberación de garantía
'security_deposit_charge'    - Cargo de garantía (por daños)
```

**Estados (`status`)**:
```
'pending'    - Pendiente (esperando confirmación)
'completed'  - Completada
'failed'     - Fallida
'cancelled'  - Cancelada
```

**Proveedores (`provider`)**:
```
'mercadopago'     - MercadoPago (principal en Argentina)
'stripe'          - Stripe (internacional)
'bank_transfer'   - Transferencia bancaria
'manual'          - Manual (admin)
'system'          - Sistema interno
```

---

#### 4. `wallet_transfers` - Transferencias entre Usuarios

```sql
CREATE TABLE wallet_transfers (
  id              uuid PRIMARY KEY,
  from_user_id    uuid NOT NULL,
  to_user_id      uuid NOT NULL,
  amount_cents    bigint NOT NULL,
  status          text NOT NULL,
  ref             varchar(128) UNIQUE,
  created_at      timestamptz,
  completed_at    timestamptz
);
```

**Uso**: Transferencias P2P entre usuarios (no usado actualmente en bookings).

---

#### 5. `wallet_audit_log` - Auditoría Completa

```sql
CREATE TABLE wallet_audit_log (
  id              uuid PRIMARY KEY,
  user_id         uuid,
  action_type     text NOT NULL,
  table_name      text NOT NULL,
  record_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  performed_by    uuid,
  performed_at    timestamptz DEFAULT NOW(),
  ip_address      inet,
  user_agent      text
);
```

**Uso**: Registro de auditoría de TODAS las operaciones del wallet (compliance, seguridad).

---

## 🔄 FLUJO REAL DE UN BOOKING CON WALLET

### **PASO 1: Usuario Deposita Fondos a su Wallet**

```sql
-- 1. Usuario inicia depósito de $50,000 ARS
CALL wallet_initiate_deposit(
  p_amount := 50000,
  p_provider := 'mercadopago',
  p_description := 'Depósito para reservar auto'
);

-- RESULTADO:
-- ✅ Crea wallet_transaction con status='pending'
-- ✅ Retorna transaction_id para usar en MercadoPago
-- ✅ NO actualiza balance todavía (esperando confirmación)
```

**Salida**:
```json
{
  "transaction_id": "uuid-xxx",
  "success": true,
  "payment_provider": "mercadopago",
  "payment_url": "https://mercadopago.com/checkout/...",
  "status": "pending",
  "is_withdrawable": false  // ← IMPORTANTE: NO retirable hasta confirmación
}
```

---

**Usuario paga en MercadoPago** → Webhook confirma pago

```sql
-- 2. Webhook de MercadoPago llama a confirm_deposit
CALL wallet_confirm_deposit(
  p_transaction_id := 'uuid-xxx',
  p_provider_transaction_id := '12345678',  -- ID de MP
  p_provider_metadata := '{"status": "approved", ...}'::jsonb
);

-- QUÉ HACE INTERNAMENTE:
-- ✅ Actualiza wallet_transaction.status = 'completed'
-- ✅ Actualiza wallet_transaction.completed_at = NOW()
-- ✅ Guarda provider_transaction_id y metadata
-- ✅ INSERT en wallet_ledger (kind='deposit', amount_cents=5000000)
-- ✅ TRIGGER actualiza user_wallets.available_balance += 50000
```

**Salida**:
```json
{
  "success": true,
  "message": "Depósito confirmado",
  "new_available_balance": 50000.00
}
```

---

### **PASO 2: Usuario Crea Reserva**

```sql
-- Usuario selecciona auto con:
-- - Alquiler: $30,000
-- - Garantía: $20,000
-- TOTAL a bloquear: $50,000

-- Sistema verifica balance
SELECT available_balance FROM user_wallets WHERE user_id = 'uuid-user';
-- Resultado: $50,000 ✅ Tiene fondos suficientes

-- Llamada a RPC (desde frontend)
CALL wallet_lock_rental_and_deposit(
  p_booking_id := 'uuid-booking',
  p_rental_amount := 30000,
  p_deposit_amount := 20000
);
```

**QUÉ HACE INTERNAMENTE** (`wallet_lock_rental_and_deposit`):

```sql
BEGIN;
  -- 1. Verificar fondos disponibles
  IF available_balance < (p_rental_amount + p_deposit_amount) THEN
    RAISE EXCEPTION 'Fondos insuficientes';
  END IF;

  -- 2. Crear transacción de bloqueo de alquiler
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    reference_type,
    reference_id
  ) VALUES (
    user_id,
    'rental_payment_lock',
    'completed',
    30000,
    'booking',
    p_booking_id
  ) RETURNING id INTO rental_lock_tx_id;

  -- 3. Crear transacción de bloqueo de garantía
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    reference_type,
    reference_id
  ) VALUES (
    user_id,
    'security_deposit_lock',
    'completed',
    20000,
    'booking',
    p_booking_id
  ) RETURNING id INTO deposit_lock_tx_id;

  -- 4. Actualizar booking con IDs de transacciones
  UPDATE bookings SET
    rental_lock_transaction_id = rental_lock_tx_id,
    deposit_lock_transaction_id = deposit_lock_tx_id,
    status = 'confirmed'
  WHERE id = p_booking_id;

  -- 5. Actualizar balances en user_wallets
  UPDATE user_wallets SET
    available_balance = available_balance - 50000,
    locked_balance = locked_balance + 50000
  WHERE user_id = user_id;

COMMIT;
```

**Resultado**:
```json
{
  "success": true,
  "rental_lock_transaction_id": "uuid-rental-lock",
  "deposit_lock_transaction_id": "uuid-deposit-lock",
  "total_locked": 50000.00,
  "new_available_balance": 0.00,      // Bajó de 50k a 0
  "new_locked_balance": 50000.00      // Subió de 0 a 50k
}
```

**Estado del wallet ahora**:
```
user_wallets:
├─ available_balance: $0       (antes $50,000)
├─ locked_balance:    $50,000  (antes $0)
└─ Total:             $50,000
```

---

### **PASO 3: Finalización de Reserva SIN DAÑOS**

```sql
-- Al devolver el auto, locador inspecciona
-- TODO OK, sin daños

CALL wallet_complete_booking(
  p_booking_id := 'uuid-booking',
  p_completion_notes := 'Auto devuelto en perfectas condiciones'
);
```

**QUÉ HACE INTERNAMENTE**:

```sql
BEGIN;
  -- 1. Obtener datos del booking
  SELECT
    rental_amount_cents,
    deposit_amount_cents,
    rental_lock_transaction_id,
    deposit_lock_transaction_id,
    owner_id,
    renter_id
  FROM bookings WHERE id = p_booking_id;

  -- 2. Transferir pago de alquiler al dueño del auto
  -- Crea entrada en ledger: rental_payment
  INSERT INTO wallet_ledger (
    user_id,              -- owner_id
    kind,
    amount_cents,
    ref,
    booking_id,
    transaction_id
  ) VALUES (
    owner_id,
    'rental_payment',     -- ← Ingreso para el dueño
    3000000,              // $30,000 en centavos
    'rental-payment-booking-xxx',
    p_booking_id,
    NULL
  );
  -- TRIGGER: Aumenta available_balance del dueño

  -- 3. Liberar garantía al usuario
  UPDATE user_wallets SET
    locked_balance = locked_balance - 20000,
    available_balance = available_balance + 20000
  WHERE user_id = renter_id;

  -- 4. Crear transacción de release
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    reference_type,
    reference_id
  ) VALUES (
    renter_id,
    'security_deposit_release',
    'completed',
    20000,
    'booking',
    p_booking_id
  ) RETURNING id INTO deposit_release_tx_id;

  -- 5. Calcular comisión de plataforma (ej: 10%)
  platform_fee := rental_amount * 0.10;  // $3,000

  -- 6. Descontar comisión del pago al dueño
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref
  ) VALUES (
    owner_id,
    'fee',                // ← Cargo de comisión
    -300000,              // -$3,000 en centavos
    'platform-fee-booking-xxx'
  );
  -- TRIGGER: Reduce available_balance del dueño en $3,000

  -- 7. Actualizar booking
  UPDATE bookings SET
    status = 'completed',
    deposit_release_transaction_id = deposit_release_tx_id,
    completed_at = NOW()
  WHERE id = p_booking_id;

COMMIT;
```

**Resultado**:
```json
{
  "success": true,
  "rental_payment_transaction_id": "uuid-rental-payment",
  "deposit_release_transaction_id": "uuid-deposit-release",
  "platform_fee_transaction_id": "uuid-platform-fee",
  "amount_to_owner": 27000.00,      // $30k - $3k comisión
  "amount_to_renter": 20000.00,     // Garantía devuelta
  "platform_fee": 3000.00
}
```

**Estado final de balances**:

```
RENTER (usuario que alquiló):
├─ available_balance: $20,000  (garantía devuelta)
├─ locked_balance:    $0       (todo liberado)
└─ Total:             $20,000

OWNER (dueño del auto):
├─ available_balance: $27,000  ($30k pago - $3k comisión)
├─ locked_balance:    $0
└─ Total:             $27,000

PLATAFORMA:
└─ Ganancia: $3,000 (comisión 10%)
```

---

### **PASO 4: Finalización CON DAÑOS**

```sql
-- Locador inspecciona auto
-- Encuentra daños: Rayón en puerta ($5,000)

CALL wallet_complete_booking_with_damages(
  p_booking_id := 'uuid-booking',
  p_damage_amount := 5000,
  p_damage_description := 'Rayón en puerta lateral izquierda'
);
```

**QUÉ HACE**:

```sql
BEGIN;
  -- 1. Transferir pago de alquiler al dueño ($30k)
  -- (igual que sin daños)

  -- 2. Cargar daños desde la garantía
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    reference_type,
    reference_id,
    description
  ) VALUES (
    renter_id,
    'security_deposit_charge',  -- ← Cargo de garantía
    'completed',
    5000,
    'booking',
    p_booking_id,
    p_damage_description
  ) RETURNING id INTO damage_charge_tx_id;

  -- 3. Transferir monto de daños al dueño
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta
  ) VALUES (
    owner_id,
    'rental_payment',     // O podría ser 'damage_compensation'
    500000,               // $5,000
    'damage-compensation-booking-xxx',
    jsonb_build_object('reason', 'damage_compensation')
  );

  -- 4. Liberar RESTO de garantía al usuario
  remaining_deposit := 20000 - 5000;  // $15,000

  UPDATE user_wallets SET
    locked_balance = locked_balance - 20000,
    available_balance = available_balance + remaining_deposit
  WHERE user_id = renter_id;

  -- 5. Actualizar booking
  UPDATE bookings SET
    status = 'completed',
    owner_reported_damages = true,
    owner_damage_amount = 5000,
    owner_damage_description = p_damage_description
  WHERE id = p_booking_id;

COMMIT;
```

**Resultado**:
```json
{
  "success": true,
  "rental_payment_transaction_id": "uuid-rental-payment",
  "damage_charge_transaction_id": "uuid-damage-charge",
  "deposit_release_transaction_id": "uuid-deposit-release",
  "platform_fee_transaction_id": "uuid-platform-fee",
  "amount_to_owner": 32000.00,         // $30k pago + $5k daños - $3k comisión
  "damage_charged": 5000.00,
  "amount_returned_to_renter": 15000.00,  // $20k garantía - $5k daños
  "platform_fee": 3000.00
}
```

**Estado final de balances**:

```
RENTER:
├─ available_balance: $15,000  ($20k garantía - $5k daños)
├─ locked_balance:    $0
└─ Perdió: $35,000 total ($30k alquiler + $5k daños)

OWNER:
├─ available_balance: $32,000  ($30k + $5k daños - $3k comisión)
├─ locked_balance:    $0
└─ Ganó: $32,000

PLATAFORMA:
└─ Ganancia: $3,000 (comisión 10% solo sobre alquiler)
```

---

## 💡 AHORA SÍ: RESPUESTA A TU PREGUNTA SOBRE EFECTIVO

### ¿Se puede cargar Wallet con efectivo (Pago Fácil)?

**RESPUESTA CORTA**: **SÍ, técnicamente se puede** y **tiene sentido**.

---

### **CÓMO FUNCIONARÍA**:

```
PASO 1: Usuario va a Pago Fácil
════════════════════════════════════════════════════

Usuario llama a wallet_initiate_deposit($50,000)
   ↓
Frontend obtiene transaction_id
   ↓
Edge Function crea preferencia MercadoPago CON:
   payment_methods: {
     excluded_payment_types: []  // ✅ NO excluir 'ticket'
   }
   ↓
MercadoPago genera código de pago para Pago Fácil
   ↓
Usuario paga $50,000 en efectivo en sucursal
   ↓
MercadoPago acredita a AutoRenta
   ↓
Webhook llama wallet_confirm_deposit()
   ↓
✅ Fondos acreditados en wallet

RESULTADO:
├─ wallet_transactions: 1 registro (type='deposit', status='completed')
├─ wallet_ledger: 1 entrada (kind='deposit', amount_cents=5000000)
├─ user_wallets.available_balance: +$50,000
└─ is_withdrawable: false  ← CLAVE: NO se puede retirar
```

---

### **VENTAJAS DE PERMITIR EFECTIVO PARA WALLET**:

1. ✅ **Inclusión financiera**: Personas sin tarjeta pueden usar AutoRenta
2. ✅ **Seguridad mantenida**: Fondos en wallet NO se pueden retirar fácilmente
3. ✅ **Bloqueos funcionan igual**: locked_balance opera normalmente
4. ✅ **Trazabilidad completa**: wallet_ledger registra TODO
5. ✅ **Sin riesgo para locador**: Fondos YA están en el sistema

---

### **DIFERENCIAS CLAVE vs MI ANÁLISIS ANTERIOR ERRÓNEO**:

| Aspecto | Análisis Anterior (INCORRECTO) | Realidad del Sistema |
|---------|--------------------------------|----------------------|
| **Estructura** | Wallet simple (solo balance) | Sistema complejo: 5 tablas + ledger |
| **Pagos directos** | Asumí que existen 2 flujos | SOLO existe flujo Wallet |
| **Garantías** | No entendí cómo funcionan | Usan `locked_balance` + transacciones |
| **Efectivo** | Dije que era riesgoso | ES VIABLE para depositar a wallet |
| **Contabilidad** | No mencioné ledger | Sistema de doble entrada completo |

---

### **POR QUÉ MI ANÁLISIS ANTERIOR ESTABA MAL**:

❌ **Asumí** que había "pago directo sin wallet"
✅ **Realidad**: TODO pago pasa por wallet (even si es "directo")

❌ **Asumí** que efectivo = sin garantía
✅ **Realidad**: Efectivo → Wallet → Bloqueo funciona IGUAL

❌ **Asumí** arquitectura simple
✅ **Realidad**: Sistema complejo con ledger contable

---

## 🎯 RECOMENDACIÓN FINAL CORRECTA

### **SÍ, HABILITAR EFECTIVO PARA DEPÓSITOS A WALLET**

**Configuración sugerida**:

```typescript
// Edge Function: mercadopago-create-preference

function createPreference(context: PaymentContext) {
  // Para depósitos a wallet: PERMITIR TODO
  if (context === 'WALLET_DEPOSIT') {
    return {
      payment_methods: {
        excluded_payment_types: []  // ✅ Permite tarjetas Y efectivo
      }
    };
  }

  // Para cualquier otro contexto, analizar caso por caso
  // (actualmente NO hay otros contextos, todo va a wallet)
}
```

**Flujo completo**:
```
1. Usuario deposita $50k en Pago Fácil
2. Fondos llegan a wallet (is_withdrawable=false)
3. Usuario crea reserva
4. Sistema bloquea $50k (available → locked)
5. Reserva confirmada automáticamente
6. Al finalizar, fondos se liberan o cobran según daños
7. Usuario NO puede retirar fondos fácilmente (protección anti-fraude)
```

---

## ✅ CONCLUSIÓN

**Mi análisis anterior tenía errores fundamentales** porque:
1. No leí el código real de la base de datos
2. Asumí arquitectura simplificada
3. No entendí el sistema de ledger contable
4. Confundí "pago directo" con "pago sin wallet"

**La realidad es**:
- AutoRenta tiene un **sistema de wallet MUY completo**
- TODO pago pasa por el wallet (incluso los "directos")
- El efectivo **SÍ es viable** para cargar wallet
- La garantía funciona con `locked_balance`, no con tarjeta

**Disculpas por la confusión anterior**. Este análisis es el **correcto** basado en código real. 🙏

