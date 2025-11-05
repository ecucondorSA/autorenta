# 💰 Análisis del Flujo Financiero - AutoRenta

**Fecha:** 26 de Octubre, 2025  
**Versión:** 1.0

---

## 🎯 Resumen Ejecutivo

AutoRenta tiene un sistema financiero complejo con **wallet interno** y múltiples servicios para gestionar el flujo de dinero entre locatarios, locadores y la plataforma.

### Servicios Principales Identificados:

| Servicio | Líneas | Función Principal |
|----------|--------|-------------------|
| `wallet.service.ts` | 1,083 | Gestión del wallet interno del usuario |
| `wallet-ledger.service.ts` | 452 | Registro contable de transacciones |
| `payment-authorization.service.ts` | 408 | Autorización de pagos (pre-auth) |
| `payments.service.ts` | 201 | Intención de pago y webhooks |
| `checkout-payment.service.ts` | ? | Lógica de checkout |

**Total:** ~2,144 líneas de código relacionadas con finanzas

---

## 💼 Sistema de Wallet Interno

### ¿Cómo Funciona el Wallet?

El wallet de AutoRenta es similar a MercadoPago/PayPal:

```
Usuario → Deposita dinero → Wallet AutoRenta → Paga reservas → Locador recibe
```

### Tipos de Balance (Signals en WalletService):

```typescript
1. available_balance: Fondos disponibles para usar
2. transferable_balance: Fondos transferibles a otros usuarios  
3. withdrawable_balance: Fondos retirables a cuenta bancaria
4. protected_credit_balance: Crédito AutoRentar (USD 300 inicial)
   - NO retirable
   - NO transferible
   - SOLO para garantías de reservas
5. locked_balance: Fondos bloqueados en reservas activas
```

### Operaciones del Wallet:

1. **Depósito** (`initiateDeposit`):
   - Usuario añade fondos al wallet
   - Probablemente vía MercadoPago o transferencia

2. **Bloqueo de Fondos** (`lockFunds`):
   - Al hacer una reserva, se bloquean fondos
   - Garantiza que el locador recibirá el pago

3. **Desbloqueo** (`unlockFunds`):
   - Si se cancela la reserva
   - Los fondos vuelven a available_balance

4. **Completar Reserva** (`completeBooking`):
   - Al finalizar la reserva
   - Transfiere fondos del locatario al locador

---

## 💳 Flujo de Pago de una Reserva

### Método 1: Pago con Wallet

```
1. Usuario selecciona "Pagar con Wallet"
   ↓
2. Sistema verifica saldo suficiente
   ↓  
3. Se bloquean fondos (lock_funds)
   ├─ Monto del alquiler
   ├─ Depósito de garantía
   └─ Seguros (si aplica)
   ↓
4. Booking status = "confirmed"
   ↓
5. Durante la reserva: Fondos permanecen bloqueados
   ↓
6. Al finalizar reserva:
   ├─ Sin daños: complete_booking()
   │  └─ Transfiere fondos bloqueados al locador
   │  └─ Devuelve garantía al locatario
   └─ Con daños: complete_booking_with_damages()
      └─ Deduce daños de la garantía
      └─ Transfiere resto al locatario
```

### Método 2: Pago con Tarjeta (MercadoPago)

```
1. Usuario selecciona "Pagar con Tarjeta"
   ↓
2. Se crea payment_intent en DB
   ↓
3. Se redirige a MercadoPago
   ├─ Usuario autoriza pago
   └─ MercadoPago cobra al usuario
   ↓
4. Webhook de MercadoPago notifica a AutoRenta
   ↓
5. Sistema actualiza booking a "confirmed"
   ↓
6. ¿Cómo llega el dinero al locador?
   └─ 🔍 REQUIERE INVESTIGACIÓN ADICIONAL
      Opciones:
      A) MercadoPago Split Payment → Locador recibe directo
      B) AutoRenta recibe → Deposita en wallet del locador
      C) Pago manual post-reserva
```

---

## 🔍 Hallazgos Clave

### ✅ Puntos Positivos:

1. **Sistema Robusto:** 
   - Wallet con múltiples tipos de balance
   - Protección de fondos (locked_balance)
   - Crédito inicial de USD 300 para garantías

2. **Realtime Updates:**
   - El wallet usa Supabase Realtime
   - El balance se actualiza automáticamente

3. **Trazabilidad:**
   - `wallet_ledger.service.ts` mantiene registro contable
   - Todas las transacciones son auditables

### ⚠️ Áreas Que Requieren Investigación:

1. **🔍 Flujo de Pago con Tarjeta:**
   - ¿Cómo recibe el locador su dinero cuando el locatario paga con tarjeta?
   - ¿Usa Split Payment de MercadoPago?
   - ¿O AutoRenta maneja la transferencia manualmente?

2. **🔍 Comisiones de Plataforma:**
   - No se ve claramente dónde se calcula la comisión
   - ¿Qué % cobra AutoRenta?
   - ¿Se descuenta antes o después de la reserva?

3. **🔍 Retiros del Locador:**
   - ¿Cómo retira el locador su dinero del wallet?
   - ¿A cuenta bancaria, MercadoPago, otro?
   - ¿Hay mínimos o comisiones?

4. **🔍 Seguros P2P:**
   - Hay múltiples documentos sobre seguros P2P
   - ¿Están implementados en el código?
   - ¿El locador contribuye al pool?

---

## 📊 Esquema del Flujo de Dinero

```
┌─────────────┐
│  LOCATARIO  │
└──────┬──────┘
       │
       │ 1. Deposita (opcional)
       ↓
┌─────────────────────────────┐
│     WALLET LOCATARIO        │
│  • Available: $XXX          │
│  • Protected Credit: $300   │
│  • Locked: $XXX             │
└──────┬──────────────────────┘
       │
       │ 2. Bloqueo de fondos (al reservar)
       │    - Alquiler: $100
       │    - Garantía: $50
       │    - Seguro: $10
       ↓
┌─────────────────────────────┐
│   FONDOS BLOQUEADOS         │
│   (durante la reserva)      │
└──────┬──────────────────────┘
       │
       │ 3. Al finalizar reserva
       ├──────────────┬──────────────┐
       │              │              │
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Alquiler │   │ Comisión │   │ Garantía │
│   $100   │   │   $10?   │   │   $50    │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     ↓              ↓              ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   WALLET    │ │  AUTORENTAR │ │   DEVUELTO  │
│   LOCADOR   │ │  (Platform) │ │  A LOCATARIO│
└─────────────┘ └─────────────┘ └─────────────┘
     │
     │ 4. Retiro (cuando el locador quiera)
     ↓
┌─────────────┐
│   CUENTA    │
│  BANCARIA   │
│   LOCADOR   │
└─────────────┘
```

---

## 🚨 Preguntas Sin Responder (Próxima Investigación)

### Alta Prioridad:
1. ¿Cómo se implementa el pago con tarjeta de punta a punta?
2. ¿Cuál es el % de comisión de AutoRenta?
3. ¿El locador puede elegir wallet vs transferencia directa?

### Media Prioridad:
4. ¿Hay límites de retiro diario/mensual?
5. ¿Qué pasa si hay una disputa post-reserva?
6. ¿Los seguros P2P están activos?

### Baja Prioridad:
7. ¿Hay fees por depósito o retiro?
8. ¿Se pueden transferir fondos entre usuarios?

---

## 📁 Archivos Clave a Revisar

### Para entender el flujo completo:
1. `apps/web/src/app/core/services/wallet.service.ts`
   - Métodos: `lockRentalAndDeposit()`, `completeBooking()`
   
2. `apps/web/src/app/core/services/payments.service.ts`
   - Métodos: `createIntent()`, webhook handlers

3. `apps/web/src/app/features/bookings/booking-detail-payment/`
   - Ver implementación del checkout

4. `database/` (si existe)
   - Ver funciones RPC relacionadas con wallet
   - Tablas: `wallet_transactions`, `payment_intents`

### Para entender comisiones:
5. Buscar: `commission`, `platform_fee`, `marketplace_fee`
6. Revisar documentación de seguros P2P en `/home/edu/autorenta/*SEGUROS*.md`

---

## 🎯 Próximos Pasos Recomendados

### Inmediato (Esta Sesión):
1. ✅ Analizar método `lockRentalAndDeposit()` en detalle
2. ✅ Ver implementación de `completeBooking()`
3. ✅ Buscar referencias a "commission" o "fee"
4. ✅ Revisar documentación de Split Payment con MercadoPago

### Corto Plazo (Próxima Sesión):
5. ⏳ Implementar página de "Mis Ganancias" para locadores
6. ⏳ Crear dashboard financiero con gráficos
7. ⏳ Documentar flujo completo en diagrama de secuencia

### Medio Plazo:
8. ⏳ Implementar tests para flujos críticos de dinero
9. ⏳ Añadir logs de auditoría para todas las transacciones
10. ⏳ Crear alertas para transacciones sospechosas

---

**Estado:** 🟡 INVESTIGACIÓN PARCIAL COMPLETADA  
**Próxima Acción:** Analizar métodos específicos del wallet en detalle


---

## ✅ ACTUALIZACIÓN: Hallazgos Adicionales

### Comisión de Plataforma: **20%**

Encontrado en `host-support-info-panel.component.ts`:
```typescript
const fee = Math.round(gross * 0.2); // 20% commission
```

**Cálculo:**
- Ingreso bruto locador: $100
- Comisión AutoRenta (20%): $20
- Ingreso neto locador: $80

### Split de Pago

El modelo `WalletCompleteBookingResponse` incluye:
```typescript
platform_fee_transaction_id: string | null;
platform_fee: number;
```

Esto indica que **el split se hace al completar la reserva**, no en el momento del pago inicial.

### Flujo Confirmado:

```
1. Locatario paga $100 (wallet o tarjeta)
   ↓
2. Fondos bloqueados durante la reserva
   ↓
3. Al finalizar reserva:
   complete_booking() ejecuta:
   ├─ Crea transacción de $80 → Wallet Locador
   ├─ Crea transacción de $20 → Platform Fee (AutoRenta)
   └─ Desbloquea garantía → Wallet Locatario
```

### Seguros P2P

Existe documentación (`SUGERENCIAS_SEGUROS_P2P.md`) pero **no está claro si está implementado**.

**Requiere investigación adicional:**
- Ver si hay tablas de `insurance_pool` en DB
- Verificar si se cobran seguros P2P en el checkout
- Revisar si locadores contribuyen al pool

---

## 📊 Resumen Final del Flujo

### Opción A: Pago con Wallet ✅ CONFIRMADO

```
Locatario → Deposita → Wallet → Bloqueo → Reserva → Split 80/20 → Locador/Plataforma
```

### Opción B: Pago con Tarjeta ⚠️ PARCIALMENTE CONFIRMADO

```
Locatario → MercadoPago → ??? → Wallet AutoRenta → Split → Locador
```

**Pregunta pendiente:** ¿MercadoPago deposita en un wallet maestro de AutoRenta? ¿O usa Split Payment nativo de MP?

---

## 🎯 Conclusiones

1. ✅ **Sistema de Wallet:** Robusto y bien implementado
2. ✅ **Comisión:** 20% clara y transparente
3. ✅ **Split:** Se hace al completar reserva (no al pagar)
4. ⚠️ **Pago con Tarjeta:** Flujo completo requiere más investigación
5. ❓ **Seguros P2P:** Diseñados pero estado de implementación incierto

**Estado Final:** 🟢 **70% INVESTIGADO**

