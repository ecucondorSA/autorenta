# 🔒 Plan de Validaciones para Sistema de Wallet

**Fecha**: 2025-10-20 19:10 UTC
**Status**: Análisis Completo - Listo para Implementar

---

## 📊 ANÁLISIS DEL SISTEMA ACTUAL

### Capas del Sistema

```
┌─────────────────────────────────────────┐
│  CAPA 1: Frontend (Angular)             │
│  - wallet.service.ts                    │
│  - wallet.page.ts                       │
│  - Validaciones básicas (monto >0, <5k) │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CAPA 2: Edge Functions (Supabase)      │
│  - mercadopago-create-preference         │
│  - mercadopago-webhook                   │
│  - mercadopago-poll-pending-payments     │
│  ⚠️ POCAS VALIDACIONES                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CAPA 3: RPC Functions (PostgreSQL)     │
│  - wallet_initiate_deposit               │
│  - wallet_confirm_deposit                │
│  - wallet_lock_funds                     │
│  - wallet_unlock_funds                   │
│  ⚠️ VALIDACIONES BÁSICAS                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CAPA 4: Database (RLS + Constraints)   │
│  - RLS policies                          │
│  - Foreign keys                          │
│  - Check constraints                     │
│  ✅ BIEN PROTEGIDA                       │
└─────────────────────────────────────────┘
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **Frontend (wallet.service.ts)** ✅ BIEN

**Validaciones Existentes**:
- ✅ Monto > 0 (línea 201)
- ✅ Monto mínimo $10 (línea 205)
- ✅ Monto máximo $5,000 (línea 209)
- ✅ Verificar fondos suficientes antes de bloquear (línea 420)
- ✅ Validar booking_id (línea 416, 484)

**Lo que falta**:
- ❌ Validar formato de montos (evitar decimales con >2 posiciones)
- ❌ Validar que transaction_id sea UUID válido
- ❌ Rate limiting del lado del cliente (evitar doble-click)
- ❌ Validar balance negativo

### 2. **Edge Functions** ⚠️ MEJORABLE

#### `mercadopago-create-preference/index.ts`

**Validaciones Existentes**:
- ✅ Verificar variables de entorno (línea 46-67)
- ✅ Validar método HTTP POST (línea 71-78)
- ✅ Validar campos requeridos (línea 85-92)
- ✅ Verificar autorización (línea 96-104)
- ✅ Verificar transacción existe y está pending (línea 111-126)

**Lo que falta**:
- ❌ **Validar monto contra límites** (min $10, max $5,000)
- ❌ **Validar que transaction pertenece al usuario** (actualmente solo verifica existencia)
- ❌ **Prevenir doble-creación de preference** (idempotencia)
- ❌ **Validar que transaction_id sea UUID válido**
- ❌ **Timeout de transacciones** (rechazar pending >30 días)
- ❌ **Rate limiting** (max 5 depósitos por hora)

#### `mercadopago-webhook/index.ts`

**Validaciones Existentes**:
- ✅ Verificar variables de entorno (línea 66-76)
- ✅ Validar método HTTP POST (línea 79-86)
- ✅ Validar tipo de webhook (línea 95-103)
- ✅ Verificar pago approved (línea 197-209)
- ✅ Verificar transacción existe (línea 224-233)
- ✅ Idempotencia: ignorar si ya completed (línea 237-245)

**Lo que falta**:
- ❌ **Validar firma del webhook** (HMAC signature de MercadoPago)
- ❌ **Validar que payment_id sea string numérico válido**
- ❌ **Validar que external_reference sea UUID**
- ❌ **Verificar que monto del pago coincida con transacción**
- ❌ **Rate limiting de webhooks** (max 100/min)
- ❌ **Log de webhooks duplicados** (para auditoría)

### 3. **RPC Functions** ⚠️ CRÍTICO - FALTAN VALIDACIONES

#### `wallet_initiate_deposit`

**¿Qué hace?**:
Crea transacción pending en DB para depósito.

**Validaciones que DEBE tener**:
- ✅ Usuario autenticado (auth.uid())
- ❌ **Validar monto > 0**
- ❌ **Validar monto dentro de límites** ($10-$5,000)
- ❌ **Validar provider válido** ('mercadopago', 'stripe', etc.)
- ❌ **Rate limiting** (max 5 depósitos pending por usuario)
- ❌ **Validar que no haya >10 transacciones pending**
- ❌ **Validar descripción** (max 200 chars, no SQL injection)

#### `wallet_confirm_deposit` / `wallet_confirm_deposit_admin`

**¿Qué hace?**:
Confirma depósito y acredita fondos al wallet.

**Validaciones que DEBE tener**:
- ✅ Usuario autenticado (auth.uid())
- ❌ **Validar que transaction esté pending** (no completed/failed)
- ❌ **Validar que transaction pertenezca al usuario** (p_user_id)
- ❌ **Validar que provider_transaction_id no esté usado** (evitar duplicados)
- ❌ **Validar monto del payment coincida con transacción**
- ❌ **Validar que transaction no sea vieja** (<30 días)
- ❌ **Atomic operation** (BEGIN/COMMIT explícito)

#### `wallet_lock_funds`

**¿Qué hace?**:
Bloquea fondos del wallet del usuario para booking.

**Validaciones que DEBE tener**:
- ✅ Usuario autenticado
- ❌ **Validar monto > 0**
- ❌ **Verificar fondos disponibles >= monto** (BEFORE locking)
- ❌ **Validar booking existe y pertenece al usuario**
- ❌ **Validar booking en estado válido** (no cancelled/completed)
- ❌ **Prevenir doble-bloqueo** (verificar si ya hay lock para booking)
- ❌ **Atomic operation**

#### `wallet_unlock_funds`

**¿Qué hace?**:
Desbloquea fondos previamente bloqueados.

**Validaciones que DEBE tener**:
- ✅ Usuario autenticado
- ❌ **Validar booking existe**
- ❌ **Verificar que hay fondos bloqueados** (locked_balance > 0)
- ❌ **Validar que booking pertenece al usuario o es owner**
- ❌ **Verificar estado del booking** (puede ser cancelled/completed)
- ❌ **Prevenir doble-unlock**
- ❌ **Atomic operation**

---

## 🎯 PRIORIZACIÓN DE VALIDACIONES

### CRÍTICO (Seguridad y Dinero) 🔴

**Implementar INMEDIATAMENTE**:

1. **`wallet_confirm_deposit_admin`**: Validar provider_transaction_id único
   - **Riesgo**: Usuario podría duplicar acreditación
   - **Impacto**: Pérdida de dinero real

2. **`wallet_lock_funds`**: Verificar fondos disponibles ANTES de bloquear
   - **Riesgo**: Balance negativo
   - **Impacto**: Inconsistencia financiera

3. **Edge Functions**: Validar que transaction pertenece al usuario
   - **Riesgo**: Usuario A podría usar transaction_id de usuario B
   - **Impacto**: Robo de fondos

4. **Webhook**: Validar firma HMAC de MercadoPago
   - **Riesgo**: Webhooks falsos podrían acreditar fondos
   - **Impacto**: Fraude masivo

5. **RPC Functions**: Atomic operations (BEGIN/COMMIT)
   - **Riesgo**: Race conditions en transacciones
   - **Impacto**: Balance inconsistente

### ALTO (Integridad de Datos) 🟠

6. **Validar montos dentro de límites** ($10-$5,000)
   - Frontend ✅
   - Edge Functions ❌
   - RPC Functions ❌

7. **Validar formato de UUIDs**
   - transaction_id, booking_id, user_id

8. **Prevenir doble-creación de preferences**
   - Idempotencia en create-preference

9. **Validar que payment amount == transaction amount**
   - En webhook al confirmar

10. **Timeout de transacciones pending** (>30 días)
    - Limpiar automáticamente o rechazar

### MEDIO (UX y Performance) 🟡

11. **Rate limiting**
    - Frontend: Prevenir doble-click
    - Edge Functions: Max 5 depósitos/hora, 100 webhooks/min
    - RPC: Max 5 pending por usuario

12. **Validar descripciones** (max 200 chars, sanitizar)

13. **Log de eventos importantes** (auditoría)

14. **Normalizar montos** (redondear a 2 decimales)

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### Fase 1: CRÍTICO (Esta sesión) 🔴

**Archivos a modificar**:
1. `/supabase/functions/mercadopago-webhook/index.ts`
   - Agregar validación de firma HMAC
   - Validar payment amount vs transaction amount

2. Crear nueva migration: `20251020_add_wallet_validations.sql`
   - Agregar validaciones a RPC functions
   - Agregar unique constraint en provider_transaction_id
   - Agregar check constraints para montos

3. `/supabase/functions/mercadopago-create-preference/index.ts`
   - Validar ownership de transaction
   - Validar montos contra límites

**Tiempo estimado**: 1-2 horas

### Fase 2: ALTO (Próxima sesión) 🟠

**Archivos a modificar**:
1. RPC functions - agregar todas las validaciones de integridad
2. Edge Functions - agregar rate limiting
3. Frontend - mejorar validaciones de formato

**Tiempo estimado**: 2-3 horas

### Fase 3: MEDIO (Mejoras continuas) 🟡

**Archivos a modificar**:
1. Logging y auditoría
2. Cleanup automático de transacciones viejas
3. Dashboard de monitoreo

**Tiempo estimado**: 2-4 horas

---

## 📋 CHECKLIST DE VALIDACIONES

### Frontend (`wallet.service.ts`)

- [x] Monto > 0
- [x] Monto mínimo $10
- [x] Monto máximo $5,000
- [x] Verificar fondos antes de lock
- [x] Validar booking_id presente
- [ ] Validar formato de montos (2 decimales)
- [ ] Prevenir doble-click (debounce)
- [ ] Validar UUID format

### Edge Function: `mercadopago-create-preference`

- [x] Verificar env vars
- [x] Validar método HTTP
- [x] Validar campos requeridos
- [x] Verificar autorización
- [x] Verificar transacción existe
- [ ] **Validar ownership de transaction**
- [ ] **Validar montos contra límites**
- [ ] **Idempotencia (evitar doble-preference)**
- [ ] **Validar UUID format**
- [ ] **Timeout de transacciones viejas**

### Edge Function: `mercadopago-webhook`

- [x] Verificar env vars
- [x] Validar método HTTP
- [x] Validar tipo webhook
- [x] Verificar pago approved
- [x] Verificar transacción existe
- [x] Idempotencia (ignorar completed)
- [ ] **Validar firma HMAC**
- [ ] **Validar payment_id format**
- [ ] **Validar external_reference UUID**
- [ ] **Verificar payment amount == transaction amount**
- [ ] **Rate limiting (100/min)**
- [ ] **Log webhooks duplicados**

### RPC: `wallet_initiate_deposit`

- [x] Usuario autenticado
- [ ] **Validar monto > 0**
- [ ] **Validar monto dentro límites**
- [ ] **Validar provider válido**
- [ ] **Rate limiting (max 5 pending)**
- [ ] **Validar descripción (max 200 chars)**

### RPC: `wallet_confirm_deposit_admin`

- [x] Usuario autenticado
- [ ] **Validar transaction pending**
- [ ] **Validar ownership**
- [ ] **Validar provider_transaction_id único**
- [ ] **Validar payment amount == transaction amount**
- [ ] **Validar transaction no vieja**
- [ ] **Atomic operation (BEGIN/COMMIT)**

### RPC: `wallet_lock_funds`

- [x] Usuario autenticado
- [ ] **Validar monto > 0**
- [ ] **Verificar fondos disponibles >= monto**
- [ ] **Validar booking existe y pertenece**
- [ ] **Validar booking estado válido**
- [ ] **Prevenir doble-bloqueo**
- [ ] **Atomic operation**

### RPC: `wallet_unlock_funds`

- [x] Usuario autenticado
- [ ] **Validar booking existe**
- [ ] **Verificar locked_balance > 0**
- [ ] **Validar ownership de booking**
- [ ] **Verificar estado booking**
- [ ] **Prevenir doble-unlock**
- [ ] **Atomic operation**

---

## 🚨 VULNERABILIDADES ACTUALES

### 1. **Falta validación de ownership** (CRÍTICO)

**Escenario de ataque**:
```
1. Usuario A crea depósito → transaction_id: "abc-123"
2. Usuario B (malicioso) llama a create-preference con transaction_id: "abc-123"
3. Usuario B obtiene init_point del depósito de Usuario A
4. Usuario B paga y se acredita en cuenta de Usuario A
```

**Fix**: Validar que `transaction.user_id == auth.uid()`

### 2. **Falta validación de firma en webhook** (CRÍTICO)

**Escenario de ataque**:
```
1. Atacante descubre URL del webhook
2. Envía POST con payload falso: { data: { id: "fake-payment-123" } }
3. Webhook intenta confirmar depósito inexistente
4. Puede causar errores o acreeditar fondos si hay race condition
```

**Fix**: Validar x-signature header de MercadoPago

### 3. **Falta unique constraint en provider_transaction_id** (CRÍTICO)

**Escenario de ataque**:
```
1. Webhook recibe payment_id: "12345"
2. Confirma depósito de $100
3. Webhook recibe OTRA VEZ payment_id: "12345" (por error de MP o ataque)
4. Acredita OTRO $100 (duplicado)
```

**Fix**: Unique constraint + idempotencia en confirm_deposit

### 4. **Falta verificación de fondos en lock_funds** (ALTO)

**Escenario de problema**:
```
1. Usuario tiene $100 disponibles
2. Llama a lock_funds($150)
3. RPC NO verifica si tiene fondos
4. Balance negativo: -$50
```

**Fix**: Verificar `available_balance >= amount` ANTES de UPDATE

### 5. **Falta atomic operations** (ALTO)

**Escenario de race condition**:
```
Thread 1: lock_funds($100) - lee balance: $100
Thread 2: lock_funds($80) - lee balance: $100
Thread 1: actualiza balance = $0
Thread 2: actualiza balance = $20 (SOBRESCRIBE Thread 1!)
Result: Balance inconsistente
```

**Fix**: BEGIN/COMMIT con SELECT FOR UPDATE

---

## 📈 IMPACTO ESPERADO

### Antes de validaciones:

| Métrica | Estado |
|---------|--------|
| **Vulnerabilidades críticas** | 3 |
| **Vulnerabilidades altas** | 2 |
| **Riesgo de fraude** | ALTO |
| **Riesgo de balance negativo** | MEDIO |
| **Idempotencia** | PARCIAL (solo webhook) |

### Después de Fase 1 (CRÍTICO):

| Métrica | Estado |
|---------|--------|
| **Vulnerabilidades críticas** | 0 ✅ |
| **Vulnerabilidades altas** | 2 |
| **Riesgo de fraude** | BAJO ✅ |
| **Riesgo de balance negativo** | BAJO ✅ |
| **Idempotencia** | COMPLETA ✅ |

### Después de Fase 2 (ALTO):

| Métrica | Estado |
|---------|--------|
| **Vulnerabilidades críticas** | 0 ✅ |
| **Vulnerabilidades altas** | 0 ✅ |
| **Riesgo de fraude** | MUY BAJO ✅ |
| **Riesgo de balance negativo** | MUY BAJO ✅ |
| **Rate limiting** | COMPLETO ✅ |

---

## 🔄 PRÓXIMOS PASOS

### Ahora (Fase 1 - CRÍTICO):

1. ✅ Crear este documento de análisis
2. ⏳ Crear migration con validaciones en RPC
3. ⏳ Agregar validación de ownership en create-preference
4. ⏳ Agregar validación de firma en webhook
5. ⏳ Agregar unique constraint en provider_transaction_id
6. ⏳ Deploy y testing

### Próxima sesión (Fase 2 - ALTO):

7. Agregar todas las validaciones de integridad en RPC
8. Implementar rate limiting en Edge Functions
9. Mejorar validaciones en frontend
10. Testing exhaustivo

### Mejoras continuas (Fase 3 - MEDIO):

11. Dashboard de monitoreo
12. Alertas automáticas
13. Cleanup de transacciones viejas
14. Auditoría completa

---

**Última actualización**: 2025-10-20 19:15 UTC
**Autor**: Claude Code
**Status**: ✅ Análisis completo - Listo para implementar Fase 1
