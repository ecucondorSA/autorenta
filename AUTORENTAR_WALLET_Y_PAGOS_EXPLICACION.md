# 🚗💰 AutoRenta - Sistema Wallet y Flujo de Pagos Explicado

**Fecha**: 28 de Octubre 2025
**Autor**: Análisis completo del sistema
**Estado**: Documentación Ejecutiva

---

## 📋 ÍNDICE RÁPIDO

1. [¿Qué es el Sistema Wallet de AutoRenta?](#qué-es-el-sistema-wallet-de-autorenta)
2. [Flujo Completo de Reserva](#flujo-completo-de-reserva)
3. [Por Qué NO Usar Pagos en Efectivo](#por-qué-no-usar-pagos-en-efectivo)
4. [Arquitectura de Pagos](#arquitectura-de-pagos)
5. [Configuración Actual de MercadoPago](#configuración-actual-de-mercadopago)
6. [Recomendaciones](#recomendaciones)

---

## 🎯 ¿QUÉ ES EL SISTEMA WALLET DE AUTORENTA?

### Concepto Central

**AutoRenta usa un sistema de WALLET (billetera virtual)** para gestionar reservas de autos:

```
┌────────────────────────────────────────────────────────────┐
│                    WALLET DEL USUARIO                       │
│                                                             │
│  Balance Disponible:     $50,000 ARS                       │
│  Balance Bloqueado:      $30,000 ARS (Reserva activa)      │
│  ────────────────────────────────────────────              │
│  TOTAL:                  $80,000 ARS                        │
└────────────────────────────────────────────────────────────┘
```

### Características Principales

1. ✅ **Depósito previo**: Usuarios cargan fondos ANTES de reservar
2. ✅ **Bloqueo de fondos**: Garantía bloqueada durante la reserva
3. ✅ **Liberación automática**: Fondos vuelven al wallet al finalizar
4. ✅ **Sin cargos sorpresa**: Usuario sabe exactamente cuánto se bloqueará

---

## 🔄 FLUJO COMPLETO DE RESERVA EN AUTORENTA

### OPCIÓN 1: Pago con Wallet (Sistema Actual Principal)

```
PASO 1: DEPOSITAR FONDOS AL WALLET
═══════════════════════════════════════════════════════════

Usuario → "Quiero depositar $50,000"
   ↓
Frontend llama RPC: wallet_initiate_deposit($50,000)
   ↓
DB crea transacción PENDING
   ↓
Edge Function crea preferencia MercadoPago
   ↓
Usuario redirigido a Checkout MercadoPago
   ↓
Usuario paga con tarjeta (Visa/Mastercard/etc)
   ↓
MercadoPago envía webhook → Edge Function
   ↓
RPC: wallet_confirm_deposit()
   ↓
✅ Fondos acreditados en Wallet


PASO 2: CREAR RESERVA
═══════════════════════════════════════════════════════════

Usuario → Selecciona auto ($30,000 por 3 días)
   ↓
Frontend llama RPC: request_booking()
   ↓
DB verifica: user_wallets.balance >= $30,000 + garantía
   ↓
Si hay fondos suficientes:
   ├─ Crea booking con status='confirmed'
   ├─ RPC: wallet_lock_funds($30,000 + garantía)
   └─ Fondos bloqueados (no disponibles para usar)
   ↓
✅ Reserva confirmada INSTANTÁNEAMENTE


PASO 3: INICIO DEL ALQUILER
═══════════════════════════════════════════════════════════

Locador entrega el auto
   ↓
Locador confirma entrega en app
   ↓
owner_confirmed_delivery = true
   ↓
booking.status = 'in_progress'
   ↓
Fondos siguen bloqueados


PASO 4: FIN DEL ALQUILER
═══════════════════════════════════════════════════════════

Usuario devuelve auto
   ↓
Locador inspecciona
   ↓
┌─ SIN DAÑOS:
│   ├─ RPC: wallet_unlock_funds()
│   ├─ Fondos vuelven a balance disponible
│   ├─ Locador recibe su parte
│   └─ booking.status = 'completed'
│
└─ CON DAÑOS ($5,000):
    ├─ Locador reporta daños
    ├─ owner_reported_damages = true
    ├─ owner_damage_amount = $5,000
    ├─ RPC: wallet_deduct_damages($5,000)
    ├─ $5,000 transferidos al locador
    ├─ Resto vuelve a balance disponible
    └─ booking.status = 'completed'
```

---

### OPCIÓN 2: Pago Directo con MercadoPago (Sin Wallet)

```
PASO 1: CREAR RESERVA Y PREFERENCIA
═══════════════════════════════════════════════════════════

Usuario → Selecciona auto ($30,000 por 3 días)
   ↓
Frontend llama Edge Function: mercadopago-create-booking-preference
   ↓
Edge Function crea preferencia con:
   ├─ items: Alquiler auto
   ├─ unit_price: $30,000 + garantía
   ├─ external_reference: booking_id
   └─ notification_url: webhook
   ↓
Usuario redirigido a Checkout MercadoPago


PASO 2: WEBHOOK CONFIRMA PAGO
═══════════════════════════════════════════════════════════

MercadoPago procesa pago
   ↓
Webhook recibe notificación
   ↓
Extrae booking_id de external_reference
   ↓
Actualiza booking.status = 'confirmed'
   ↓
✅ Reserva confirmada


PASO 3 y 4: Igual que Wallet
═══════════════════════════════════════════════════════════

(Inicio y fin del alquiler funcionan igual)
```

---

## ⚠️ POR QUÉ **NO** USAR PAGOS EN EFECTIVO (Rapipago/Pago Fácil)

### PROBLEMA #1: **IMPOSIBLE BLOQUEAR GARANTÍA** 🚨

**Con Wallet o Tarjeta**:
```
Alquiler:  $30,000 ARS
Garantía:  $50,000 ARS
────────────────────────
TOTAL BLOQUEADO: $80,000

✅ Si hay daños de $15,000 → Se descuentan automáticamente
✅ Usuario ve fondos bloqueados y luego liberados
✅ Locador está protegido
```

**Con Efectivo (Rapipago)**:
```
Pago en Rapipago: $30,000 ARS (solo alquiler)
Garantía: ¿¿?? ❌ NO SE PUEDE BLOQUEAR

❌ Usuario paga $30,000 en efectivo
❌ No hay forma de bloquear garantía adicional
❌ Si hay daños de $15,000 → Locador pierde dinero
❌ Usuario desaparece, imposible cobrar
```

**Ejemplo Real**:
```
Caso 1: Usuario alquila auto por $30,000 (paga en Rapipago)
       → Choca el auto → Daños de $100,000
       → Locador NO TIENE garantía bloqueada
       → ❌ Pérdida de $100,000

Caso 2: Usuario alquila auto por $30,000 (paga con Wallet)
       → Choca el auto → Daños de $100,000
       → Sistema tiene $50,000 bloqueados de garantía
       → ✅ Locador recupera $50,000
       → ✅ Seguro cubre el resto (si tiene)
```

---

### PROBLEMA #2: **SIN PRE-AUTORIZACIÓN** 🔒

**Con Tarjeta de Crédito**:
```
1. Pre-autorización de $80,000 (bloqueo temporal)
2. Usuario usa el auto 3 días
3. Devolución OK → Cargo final $30,000
4. Liberación automática de $50,000
```

**Con Efectivo**:
```
1. Pago de $30,000 en Rapipago (confirmado)
2. ¿Cómo bloquear garantía? ❌ IMPOSIBLE
3. ¿Cobrar extra por daños? ❌ Usuario desapareció
```

---

### PROBLEMA #3: **FRAUDE Y NO COMPARECENCIA** 🏃

**Escenario real**:
```
Lunes 10:00 → Usuario paga $30,000 en Rapipago
Lunes 10:05 → MercadoPago acredita a AutoRenta
Lunes 10:06 → Reserva confirmada automáticamente

Opción A: Usuario NO aparece a retirar el auto
   ├─ AutoRenta debe reembolsar $30,000
   ├─ Proceso manual complejo
   ├─ Auto bloqueado innecesariamente
   └─ Pérdida de tiempo y dinero

Opción B: Usuario aparece, usa auto, lo choca
   ├─ Daños de $50,000
   ├─ Solo pagó $30,000 en efectivo
   ├─ No hay garantía bloqueada
   └─ Locador asume pérdida de $20,000
```

---

### PROBLEMA #4: **IMPOSIBLE COBRAR MULTAS POSTERIORES** 🚔

| Situación | Con Tarjeta/Wallet | Con Efectivo |
|-----------|-------------------|--------------|
| Multa de tránsito recibida 2 meses después | ✅ Cargo automático desde garantía bloqueada | ❌ Usuario desaparecido |
| Kilometraje excedido (2000km extra) | ✅ Cargo adicional automático | ❌ Imposible cobrar |
| Combustible faltante ($5,000) | ✅ Descuento de garantía | ❌ Pérdida asumida |
| Peajes automáticos (Telepase) | ✅ Cargo diferido | ❌ Imposible cobrar |
| Limpieza profunda necesaria | ✅ $3,000 deducidos | ❌ Locador paga de su bolsillo |

**Caso Real**:
```
Usuario devuelve auto → Todo parece OK → Garantía liberada

2 meses después:
├─ Llega multa por exceso de velocidad: $15,000
├─ Con tarjeta: Cargo automático ✅
└─ Con efectivo: ¿Cómo cobrar? ❌ IMPOSIBLE
```

---

### PROBLEMA #5: **COMPLEJIDAD OPERATIVA** 📋

**Proceso con Efectivo**:
```
1. Usuario paga en Rapipago → MercadoPago notifica
2. Verificar pago manualmente
3. Usuario viene a retirar → ¿Pedir garantía en efectivo?
4. ¿Cuánto efectivo acepta la sucursal? ¿$50,000?
5. ¿Dónde guardar $50,000 en efectivo? Caja fuerte
6. Riesgo de robo/asalto con tanto efectivo
7. Usuario devuelve auto → Contar y devolver efectivo
8. Controles de caja diarios
9. Declarar ingresos en efectivo (AFIP)
```

**Proceso con Wallet/Tarjeta**:
```
1. Pre-autorización automática
2. Sin manejo de efectivo físico
3. Bloqueo/liberación automático
4. Trazabilidad 100%
5. Cumplimiento AFIP automático
6. Cero riesgo de robo
```

---

### PROBLEMA #6: **LÍMITES INSUFICIENTES** 💰

**Límites de efectivo MercadoPago**:
- Rapipago/Pago Fácil: **Máximo $1,000,000 ARS** por transacción

**Caso real AutoRenta**:
```
Alquiler BMW X5 por 7 días:
├─ Tarifa:               $150,000 ARS
├─ Garantía necesaria:   $300,000 ARS
├─ TOTAL A BLOQUEAR:     $450,000 ARS
│
├─ Con Wallet/Tarjeta: ✅ Pre-autorizo $450,000 completos
└─ Con Efectivo:       ❌ Solo puedo cobrar $150,000
                       ❌ Garantía de $300,000 → IMPOSIBLE
```

---

## 🎯 ARQUITECTURA DE PAGOS ACTUAL

### Métodos de Pago Configurados

```typescript
// apps/web/src/app/core/services/payments.service.ts

const metodosPermitidos = [
  'visa',        // Tarjeta crédito/débito
  'master',      // Tarjeta crédito/débito
  'amex',        // Solo crédito
  'cabal',       // Crédito
  'naranja',     // Crédito
  'argencard',   // Crédito
];

const metodosBloqueados = [
  'pagofacil',   // ❌ Bloqueado
  'rapipago',    // ❌ Bloqueado
];
```

### Configuración de MercadoPago

```typescript
// supabase/functions/mercadopago-create-booking-preference/index.ts

const preferenceData = {
  items: [{
    title: `Alquiler de ${carTitle}`,
    unit_price: totalAmount,  // Alquiler + Garantía
    currency_id: 'ARS',
  }],

  payment_methods: {
    excluded_payment_types: [
      { id: 'ticket' },  // ❌ Bloquea Rapipago/Pago Fácil
      { id: 'atm' },     // ❌ Bloquea cajeros automáticos
    ],
    installments: 12,    // Hasta 12 cuotas
  },

  external_reference: booking_id,
  notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
};
```

---

## 📊 COMPARACIÓN: WALLET vs DIRECTO vs EFECTIVO

| Característica | Wallet | Directo (Tarjeta) | Efectivo |
|----------------|--------|-------------------|----------|
| **Bloqueo de garantía** | ✅ Sí | ✅ Sí (pre-auth) | ❌ No |
| **Cargos posteriores** | ✅ Sí | ✅ Sí | ❌ No |
| **Confirmación instant ánea** | ✅ Sí | ⏱️ Espera webhook | ⏱️ Espera acreditación |
| **Protección locador** | ✅ Alta | ✅ Alta | ❌ Baja |
| **Protección usuario** | ✅ Alta | ✅ Alta | ⚠️ Media |
| **Trazabilidad** | ✅ 100% | ✅ 100% | ⚠️ Parcial |
| **Manejo operativo** | ✅ Automático | ✅ Automático | ❌ Manual |
| **Riesgo de fraude** | ✅ Bajo | ✅ Bajo | ❌ Alto |
| **Validación identidad** | ✅ Sí (tarjeta) | ✅ Sí (tarjeta) | ❌ No |
| **Límite máximo** | ✅ Sin límite | ✅ Límite tarjeta | ❌ $1,000,000 |

---

## ✅ RECOMENDACIONES PARA AUTORENTA

### 1. **MANTENER BLOQUEADO PAGOS EN EFECTIVO** ⛔

**Razones**:
- ✅ Protege a locadores de daños no cubiertos
- ✅ Evita fraude y no comparecencia
- ✅ Permite cobros posteriores (multas, combustible, etc.)
- ✅ Valida identidad financiera del usuario
- ✅ Reduce complejidad operativa

**Configuración actual (CORRECTA)**:
```typescript
payment_methods: {
  excluded_payment_types: [
    { id: 'ticket' },  // ❌ Bloquea efectivo
  ],
}
```

---

### 2. **PRIORIZAR SISTEMA WALLET** 💰

**Ventajas sobre pago directo**:
- ✅ Confirmación instantánea (no espera webhook)
- ✅ Mejor experiencia de usuario
- ✅ Fondos pre-cargados = mayor compromiso
- ✅ Facilita pagos recurrentes

**Estrategia de incentivos**:
```
Opción A: Pagar directo con tarjeta → 0% descuento
Opción B: Cargar wallet y pagar → 5% descuento

Ejemplo:
Alquiler de $30,000:
├─ Pago directo: $30,000
└─ Con wallet: $28,500 (ahorro de $1,500)
```

---

### 3. **CONFIGURAR PRE-AUTORIZACIÓN CORRECTAMENTE** 🔒

**Para pagos directos con tarjeta**:

```typescript
// Implementar en MercadoPago preference
const preferenceData = {
  // ... resto de config

  binary_mode: false,  // ✅ Permite pending
  capture: false,      // ✅ Pre-autorización (no captura inmediata)

  metadata: {
    is_preauth: true,
    security_deposit: 50000,
    rental_amount: 30000,
  },
};
```

**Flujo mejorado**:
```
1. Pre-autorización de $80,000 (bloqueo, no cargo)
2. Usuario usa auto
3. Devolución sin daños → Captura solo $30,000
4. Liberación automática de $50,000
```

---

### 4. **HABILITAR CUOTAS SOLO PARA ALQUILER** 💳

**Configuración recomendada**:
```typescript
const preferenceData = {
  payment_methods: {
    installments: 12,              // Hasta 12 cuotas
    default_installments: 1,       // Default 1 cuota
  },

  // Garantía siempre en 1 pago
  // Alquiler puede financiarse
};
```

**Ejemplo**:
```
Alquiler de $30,000 en 6 cuotas = $5,000/mes
Garantía de $50,000 en 1 pago (pre-auth)
```

---

### 5. **IMPLEMENTAR APROBACIÓN MANUAL OPCIONAL** ⏱️

**Problema actual**:
- Reservas son AUTO-CONFIRMADAS al pagar
- Locador NO puede rechazar después del pago

**Solución propuesta**:
```typescript
interface Car {
  instant_booking: boolean;       // true = auto-confirm
  require_approval: boolean;      // true = requiere aprobación
  approval_timeout_hours: number; // 24h default
}

// Flujo mejorado:
if (car.instant_booking) {
  booking.status = 'confirmed';  // Inmediato
} else {
  booking.status = 'pending_approval';  // Espera aprobación
  // Locador tiene 24h para aprobar/rechazar
}
```

**Beneficios**:
- ✅ Locador mantiene control
- ✅ Previene problemas (auto en mantenimiento, etc.)
- ✅ Compatible con flujo actual (default instant_booking=true)

---

## 🎓 CONCLUSIÓN

### ❌ EFECTIVO NO ES VIABLE PARA AUTORENTA

**Razones principales**:
1. Imposible bloquear garantía de daños
2. No hay pre-autorización
3. Alto riesgo de fraude
4. Imposible cobrar multas/extras posteriores
5. Complejidad operativa con efectivo físico
6. Límites insuficientes para autos premium

### ✅ SISTEMA ACTUAL ES CORRECTO

**AutoRenta ya tiene bloqueados los pagos en efectivo**:
```typescript
excluded_payment_types: [
  { id: 'ticket' },  // ✅ Rapipago/Pago Fácil bloqueados
]
```

### 🚀 PRÓXIMAS MEJORAS RECOMENDADAS

| Prioridad | Mejora | Impacto | Esfuerzo |
|-----------|--------|---------|----------|
| 🔴 ALTA | Pre-autorización en pagos directos | Alto | 6-8h |
| 🔴 ALTA | Aprobación manual opcional | Medio | 8-12h |
| 🟡 MEDIA | Incentivos para uso de Wallet | Alto | 4-6h |
| 🟡 MEDIA | Configuración de cuotas inteligente | Medio | 3-4h |
| 🟢 BAJA | Requisitos por auto (edad, trips) | Medio | 6-8h |

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `/home/edu/autorenta/WALLET_SYSTEM_DOCUMENTATION.md` - Sistema Wallet completo
- `/home/edu/autorenta/ANALISIS_FLUJO_RESERVAS.md` - Flujo de reservas
- `/home/edu/autorenta/MERCADOPAGO_PRODUCTION_FIXES_APPLIED.md` - Configuración MercadoPago
- `/home/edu/autorenta/METODOS_DE_PAGO_MERCADOPAGO.md` - Métodos disponibles (este documento)

---

**Última actualización**: 28 de Octubre 2025
**Configuración actual**: ✅ Correcta (efectivo bloqueado)
**Recomendación**: Mantener configuración actual + implementar mejoras sugeridas
