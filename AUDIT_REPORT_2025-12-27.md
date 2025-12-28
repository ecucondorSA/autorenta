# AUTORENTA - REPORTE DE AUDITORIA COMPLETA

**Fecha:** 2025-12-27
**Auditor:** Claude Code (Opus 4.5)
**Version:** 2.0.0
**Estado:** REQUIERE ATENCION INMEDIATA

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura Tecnica](#2-arquitectura-tecnica)
3. [Flujo del Renter (Locatario)](#3-flujo-del-renter-locatario)
4. [Flujo del Owner (Locador)](#4-flujo-del-owner-locador)
5. [Sistema de Pagos y Wallet](#5-sistema-de-pagos-y-wallet)
6. [Bugs Detectados en UI](#6-bugs-detectados-en-ui)
7. [Vulnerabilidades de Seguridad](#7-vulnerabilidades-de-seguridad)
8. [Code Smells y Antipatrones](#8-code-smells-y-antipatrones)
9. [Recomendaciones de Mejora](#9-recomendaciones-de-mejora)
10. [Plan de Accion](#10-plan-de-accion)
11. [Metricas del Sistema](#11-metricas-del-sistema)
12. [Anexos](#12-anexos)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Objetivo

Realizar una revision exhaustiva de la aplicacion AutoRenta, una plataforma P2P de alquiler de vehiculos que conecta propietarios (owners/locadores) con arrendatarios (renters/locatarios).

### 1.2 Alcance

- Flujo completo del renter: busqueda, reserva, pago, check-in/out
- Flujo completo del owner: dashboard, publicacion, gestion de reservas
- Sistema de pagos: MercadoPago, Wallet, garantias
- Seguridad: vulnerabilidades, race conditions, validaciones

### 1.3 Hallazgos Criticos

| Categoria | Cantidad | Severidad Maxima |
|-----------|----------|------------------|
| Vulnerabilidades de Seguridad | 7 | CRITICA |
| Bugs de UI | 4 | ALTA |
| Code Smells | 6 | MEDIA |
| Mejoras Recomendadas | 12 | BAJA |

### 1.4 Veredicto General

**ESTADO: REQUIERE CORRECCION INMEDIATA**

Se detectaron 3 vulnerabilidades criticas en el sistema de pagos que podrian resultar en:
- Sobregiro de wallet por race conditions
- Pagos duplicados por falta de idempotencia
- Explotacion de price lock por validacion debil

**Recomendacion:** Pausar despliegues a produccion hasta corregir issues criticos.

---

## 2. ARQUITECTURA TECNICA

### 2.1 Stack Tecnologico

```
FRONTEND
├── Angular 20 (Standalone Components)
├── Ionic 8
├── Capacitor 7
├── TailwindCSS
├── Three.js (modelos 3D)
├── Mapbox GL (mapas)
└── RxJS + Signals

BACKEND
├── Supabase (PostgreSQL 15)
├── Supabase Auth
├── Supabase Storage
├── Deno Edge Functions
└── Row Level Security (RLS)

PAGOS
├── MercadoPago SDK v2 (Checkout Bricks)
├── PayPal REST API
└── Binance API (tasas FX)

INFRAESTRUCTURA
├── Cloudflare Pages (web)
├── Supabase Cloud (backend)
└── Capacitor (mobile)
```

### 2.2 Estructura del Proyecto

```
/home/edu/autorenta/
├── apps/
│   └── web/
│       └── src/
│           └── app/
│               ├── core/
│               │   ├── models/          # Interfaces y tipos
│               │   └── services/        # Servicios inyectables
│               │       ├── bookings/    # 15 servicios de reservas
│               │       ├── cars/        # 8 servicios de autos
│               │       ├── payments/    # 12 servicios de pagos
│               │       └── ...
│               ├── features/            # Paginas por feature
│               │   ├── bookings/        # Flujos de reserva
│               │   ├── cars/            # Gestion de autos
│               │   ├── dashboard/       # Panel del owner
│               │   └── ...
│               └── shared/              # Componentes compartidos
├── supabase/
│   ├── functions/                       # Edge Functions
│   │   ├── mercadopago-process-booking-payment/
│   │   ├── dashboard-stats/
│   │   └── ...
│   └── migrations/                      # Migraciones SQL
└── tools/                               # Scripts de desarrollo
```

### 2.3 Patrones Arquitectonicos

| Patron | Implementacion | Estado |
|--------|----------------|--------|
| Standalone Components | Todos los componentes | OK |
| Signals + Computed | Estado reactivo | OK |
| OnPush Detection | Todos los componentes | OK |
| Service Injection | providedIn: 'root' | OK |
| RLS (Row Level Security) | Todas las tablas | OK |
| Edge Functions | Operaciones sensibles | OK |

### 2.4 Reglas de Desarrollo (CLAUDE.md)

```
PROHIBIDO:
- Step-by-step Wizards
- Modales/Dialogs
- Componentes huerfanos (sin integrar)
- console.log en produccion
- NgModules (solo standalone)

OBLIGATORIO:
- Signals para estado reactivo
- OnPush change detection
- LoggerService para logs
- RLS en tablas nuevas
- Validacion de contratos antes de pagos
```

---

## 3. FLUJO DEL RENTER (LOCATARIO)

### 3.1 Busqueda de Autos

**Ruta:** `/cars/list`
**Componente:** `CarsListPage`

```typescript
// Funcionalidades principales
- Mapa interactivo Mapbox con clusters de autos
- Filtros: fechas, precio, rating, distancia, transmision
- Ordenamiento: distance | price_asc | price_desc | rating | newest
- Segmentacion: Premium (top 40%) y Recomendados (rating >= 3)
- Real-time: Suscripcion a cambios en tabla `cars`
- Paginacion: 12 autos por pagina (client-side)
```

**Servicios Involucrados:**
```typescript
CarsService.getAvailableCars()      // Autos en rango de fechas
CarsService.listActiveCars()        // Todos los autos activos
DistanceCalculatorService           // Distancia Haversine
LocationService                     // GPS y ubicacion guardada
```

### 3.2 Detalle de Auto

**Ruta:** `/cars/:id`
**Componente:** `CarDetailPage`

```typescript
// Informacion mostrada
- Galeria de fotos (Unsplash con srcset responsivo)
- Especificaciones: marca, modelo, año, transmision, combustible
- Precio por dia + moneda
- Rating del owner + reviews
- Ubicacion (ciudad, estado, pais)
- Caracteristicas con iconos
- Calendario de disponibilidad
- Risk calculator para garantias

// Acciones disponibles
- Selector de fechas (DateRangePicker)
- Boton "Reservar ahora" → Booking Wizard
- Favoritos (localStorage)
- Chat con propietario
```

### 3.3 Proceso de Reserva

**Ruta:** `/bookings/wizard?carId=...&from=...&to=...`
**Componente:** `BookingWizardPage`

**Pasos del proceso (inline forms, NO wizard UI):**

| Paso | Contenido | Validaciones |
|------|-----------|--------------|
| 1. Fechas | Pickup/dropoff, ubicacion | Fechas futuras, end > start |
| 2. Seguro | basic, standard, premium | Seleccion obligatoria |
| 3. Extras | GPS, child seat, toll pass | Cantidades validas |
| 4. Conductor | Licencia, emergencia | Licencia vigente |
| 5. Pago | wallet, card, split | Fondos suficientes |
| 6. Revision | Terminos, cancelacion | Aceptacion obligatoria |

**Price Lock (15 minutos):**
```typescript
// Al crear booking
price_locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
metadata: {
  fx_locked: {
    binanceRate: 1000,      // Tasa sin margen (alquiler)
    platformRate: 1100,     // Tasa + 10% (garantias)
    expiresAt: "..."
  }
}
```

### 3.4 Checkout y Pago

**Rutas:** `/bookings/:id/checkout`, `/bookings/:id/payment`

**Metodos de pago disponibles:**

| Metodo | Implementacion | Fee |
|--------|----------------|-----|
| Wallet | Lock atomico rental + deposit | 0% |
| Tarjeta (MP) | Payment Brick + split | 12.5% |
| PayPal | REST API v2 | Variable |

**Sistema Dual FX:**
```typescript
interface DualRateFxSnapshot {
  binanceRate: number;    // Sin margen → para alquiler
  platformRate: number;   // Binance + 10% → para garantias
}

// Ejemplo:
// Alquiler: $500 USD × 1000 ARS = 500,000 ARS
// Garantia: $125 USD × 1100 ARS = 137,500 ARS
```

### 3.5 Estados de Reserva

```
FLUJO NORMAL:
pending_approval → confirmed → in_progress → completed

FLUJO CANCELACION:
pending_approval → cancelled
confirmed → cancelled

FLUJO DISPUTA:
in_progress → dispute → resolved
```

### 3.6 Check-In / Check-Out

**Check-In (`/bookings/:id/check-in`):**
```typescript
// Proceso
1. Inspeccion con fotos (odometro, combustible, estado)
2. Firma digital FGO v1.1
3. Location tracking compartido
4. Transicion: confirmed → in_progress
```

**Check-Out (`/bookings/:id/check-out`):**
```typescript
// Proceso
1. Inspeccion final con fotos
2. Comparacion automatica km/combustible
3. Reporte de daños (si aplica)
4. Firma digital
5. Transicion: in_progress → returned
```

---

## 4. FLUJO DEL OWNER (LOCADOR)

### 4.1 Dashboard Principal

**Ruta:** `/dashboard`
**Componente:** `OwnerDashboardPage`

**Widgets disponibles:**

| Widget | Datos | Fuente |
|--------|-------|--------|
| Balance Disponible | $2,089.41 | wallet_get_balance() |
| En Proceso | $1,200.00 | Reservas activas |
| Total Ganado | $2,000.00 | Historico acumulado |
| Rendimiento Mensual | $2,000 / $0 / +100% | Este mes vs anterior |
| Historial de Ingresos | Transacciones | booking_payments |

**Edge Function:** `dashboard-stats`

### 4.2 Gestion de Autos

**Ruta:** `/cars/my`
**Componente:** `MyCarsPage`

```typescript
// Informacion por auto
- Foto, titulo, ubicacion
- Transmision, pasajeros, combustible
- Precio por dia (USD)
- Status: active | draft | suspended
- Badge: Disponible (verde)

// Acciones
- Editar → PublishCarV2Page
- Pausar → Desactivar temporalmente
- Eliminar → Borrar (si no hay bookings activos)
```

### 4.3 Publicacion de Auto

**Ruta:** `/cars/publish`
**Componente:** `PublishCarV2Page`

**Campos del formulario:**

| Seccion | Campos |
|---------|--------|
| Basico | Marca, modelo, año, precio/dia |
| Ubicacion | Direccion, lat/lng (mapa) |
| Fotos | Galeria (hasta 10 fotos) |
| Reglas | Mileage limit, extra km price |
| Documentos | Registro, poliza |

### 4.4 Calendario de Disponibilidad

**Ruta:** `/cars/:id/availability`
**Componente:** `AvailabilityCalendarPage`

```typescript
// Visualizacion
- Calendario Flatpickr
- Dias disponibles: verde
- Dias reservados: rojo
- Bloqueos manuales: gris

// Tipos de bloqueo
- maintenance: Mantenimiento
- personal_use: Uso personal
- vacation: Vacaciones
- other: Otro
```

### 4.5 Gestion de Reservas

**Ruta:** `/bookings/owner`
**Componente:** `OwnerBookingsPage`

**Secciones:**

1. **Alertas:**
   - Reservas pendientes de aprobacion
   - MercadoPago no vinculado

2. **Consultas sobre autos:**
   - Mensajes pre-reserva
   - Badges de mensajes sin leer
   - Chat con potenciales renters

### 4.6 Aprobacion de Reservas

**Ruta:** `/bookings/pending-approval`
**Componente:** `PendingApprovalPage`

```typescript
// Por cada reserva pendiente
- Info del renter (verificacion, reviews, licencia)
- Detalles de la reserva (fechas, precio)
- Tiempo restante para decidir
- Botones: Aprobar / Rechazar

// Auto-refresh cada 30 segundos
```

### 4.7 Check-In/Out del Owner

**Check-In Owner (`/bookings/:id/owner-check-in`):**
```typescript
// Proceso
1. Inspeccion inicial (fotos, odometro, combustible)
2. Location tracking con renter
3. Notificacion cuando renter < 500m
4. Transicion: confirmed → in_progress
```

**Check-Out Owner (`/bookings/:id/owner-check-out`):**
```typescript
// Step 1: Inspeccion final
- Fotos del estado devuelto
- Odometro final
- Nivel combustible

// Step 2: Confirmar daños
- RadioButton: ¿Hay daños? Si/No
- Si hay daños: monto ($1-$250 USD) + descripcion

// RPCs ejecutados:
- booking_mark_as_returned()
- booking_confirm_and_release()
```

### 4.8 Confirmacion Bilateral

```typescript
// Flujo de liberacion de fondos
1. Owner marca como devuelto + inspecciona
2. Owner confirma (con/sin daños)
3. Renter confirma pago
→ Si ambos confirman: fondos liberados automaticamente

// Estados de completion
- active: En progreso
- returned: Devuelto, esperando confirmaciones
- pending_owner: Falta confirmacion del owner
- pending_renter: Falta confirmacion del renter
- funds_released: Fondos liberados
```

### 4.9 Retiros (Payouts)

**Ruta:** `/payouts`
**Componente:** `PayoutsPage`

```typescript
// Balance
- Disponible: US$ 2,089.41
- Retirable: US$ 1,289.41
- Credito Autorentar: US$ 800.00 (no retirable)
- Bloqueado: US$ 1,200.00

// Requisitos para retiro
- Minimo: $1,000 ARS
- KYC verificado
- Cuenta bancaria registrada (CBU/CVU)
```

---

## 5. SISTEMA DE PAGOS Y WALLET

### 5.1 Arquitectura del Wallet

**Tablas principales:**

```sql
wallet_transactions
├── id UUID PRIMARY KEY
├── user_id UUID REFERENCES auth.users
├── type: deposit | lock | unlock | charge | refund | bonus
├── status: pending | completed | failed | refunded
├── amount NUMERIC(10,2)
├── reference_type: booking | deposit | reward
├── reference_id UUID
├── provider: mercadopago | stripe | bank_transfer | internal
├── provider_transaction_id TEXT
├── provider_metadata JSONB
├── is_withdrawable BOOLEAN
└── created_at, updated_at, completed_at

wallet_ledger (Doble partida)
├── id UUID PRIMARY KEY
├── user_id UUID
├── kind: deposit | transfer_out | transfer_in | rental_charge |
│         rental_payment | refund | franchise_user | franchise_fund |
│         withdrawal | adjustment | bonus | fee
├── amount_cents BIGINT (siempre positivo)
├── ref VARCHAR(128) (idempotencia)
├── meta JSONB
├── transaction_id UUID
└── booking_id UUID
```

### 5.2 Flujo del Dinero

```
RENTER DEPOSITA
     ↓
[1] wallet_initiate_deposit() → wallet_transactions (pending)
     ↓
[2] MercadoPago preference → Usuario paga
     ↓
[3] Webhook confirma → wallet_transactions (completed)
     ↓
RENTER RESERVA
     ↓
[4] wallet_lock_rental_and_deposit() → Lock atomico
     ↓
[5] Owner acepta → Fondos permanecen bloqueados
     ↓
RESERVA COMPLETA
     ↓
[6] unlock + charge rental + pay owner
     ↓
[7] Owner recibe 87.5% (12.5% fee plataforma)
```

### 5.3 Split Payment

```typescript
// Distribucion de pagos
Owner:      87.5% del rental
Plataforma: 12.5% fee

// Implementacion en Edge Function
const platformFee = expectedAmount * 0.125;
const paymentPayload = {
  transaction_amount: expectedAmount,
  marketplace_fee: platformFee,
  collector_id: owner.mercadopago_collector_id,
};
```

### 5.4 Garantia/Deposito

```typescript
// Configuracion base
Base deposit: $250 USD (ajustable por riesgo)

// Bonus-Malus tiers
Elite:    factor <= -0.05, verificado → 100% descuento
Trusted:  factor <= 0.0, verificado  → 50% descuento
Standard: todos los demas            → 0% descuento

// Lock atomico
await supabase.rpc('wallet_lock_rental_and_deposit', {
  p_booking_id: bookingId,
  p_rental_amount: rentalAmount,
  p_deposit_amount: adjustedDeposit
});
```

### 5.5 Bonus-Malus System

```sql
-- Factores de calculo
Rating:        -10% (excelente) a +10% (pobre)
Cancelaciones: 0% a +15%
Completadas:   -5% (20+ rentals)
Verificacion:  -5% (si verificado)

-- Limite total
Minimo: -15% (descuento maximo)
Maximo: +20% (recargo maximo)

-- Ejemplo
Usuario con 5 estrellas, verificado, 25 rentals, sin cancelaciones:
-0.05 + -0.03 + -0.03 + 0 = -0.11 = 11% descuento
```

### 5.6 MercadoPago Integration

**Componente:** `MercadoPagoCardFormComponent`

```typescript
// Inicializacion con exponential backoff
private async initializePaymentBrick(): Promise<void> {
  const maxAttempts = 5;
  const baseDelayMs = 200;  // 200 → 400 → 800 → 1600 → 3200ms

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const mp = await this.mpScriptService.getMercadoPago(publicKey);
      this.brickController = await mp.bricks().create('cardPayment', ...);
      return;
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }
}
```

**Edge Function:** `mercadopago-process-booking-payment`

```typescript
// Features implementadas
- Rate limiting: 60 req/min por usuario
- Price lock validation: 15 minutos
- Idempotency: X-Idempotency-Key header
- Split payment: marketplace_fee
- Contract validation: Requiere firma antes de pago
```

### 5.7 Funciones RPC Criticas

```sql
-- Bookings
request_booking()                    -- Crear reserva
approve_booking()                    -- Owner acepta
reject_booking()                     -- Owner rechaza
booking_mark_as_returned()           -- Marcar devuelto
booking_confirm_and_release()        -- Liberar fondos (bilateral)
booking_cancel()                     -- Cancelar

-- Wallet
wallet_lock_rental_and_deposit()     -- Lock atomico
wallet_complete_booking()            -- Sin daños
wallet_complete_booking_with_damages() -- Con daños
wallet_get_balance()                 -- Obtener saldo
wallet_initiate_deposit()            -- Iniciar deposito

-- Disponibilidad
get_available_cars()                 -- Autos en rango de fechas
calculate_bonus_malus()              -- Factor descuento/recargo
```

---

## 6. BUGS DETECTADOS EN UI

### 6.1 Contador de Aprobaciones Inconsistente

**Severidad:** ALTA
**Ubicacion:** `/bookings/owner` → `/bookings/pending-approval`

**Descripcion:**
- Banner muestra: "16 reservas requieren tu aprobacion!"
- Pagina de aprobaciones muestra: "No hay solicitudes pendientes"

**Causa probable:**
- Query del contador usa filtro diferente al de la lista
- Datos de prueba no limpiados
- Race condition en cache de estado

**Solucion recomendada:**
```typescript
// Usar misma query para contador y lista
const pendingQuery = supabase
  .from('bookings')
  .select('*', { count: 'exact' })
  .eq('status', 'pending_approval')
  .eq('owner_id', userId);

// Contador
const { count } = await pendingQuery;

// Lista
const { data } = await pendingQuery;
```

### 6.2 Autos Sin Titulo

**Severidad:** MEDIA
**Ubicacion:** `/cars/my`

**Descripcion:**
- Multiples autos muestran "Auto sin titulo"
- Falta validacion al publicar

**Solucion recomendada:**
```typescript
// Validar titulo obligatorio
if (!car.title || car.title.trim() === '') {
  throw new Error('El titulo del auto es obligatorio');
}

// Auto-generar titulo si falta
const autoTitle = `${car.brand} ${car.model} ${car.year}`;
```

### 6.3 Datos de Prueba en Produccion

**Severidad:** BAJA
**Ubicacion:** `/cars/my`

**Descripcion:**
- VW Gol 2022 con precio USD 7,500/dia
- Autos "Test FIPE" sin imagenes

**Solucion recomendada:**
```sql
-- Limpiar datos de prueba
DELETE FROM cars WHERE title LIKE '%Test FIPE%';
DELETE FROM cars WHERE price_per_day > 1000;
```

### 6.4 Imagenes Faltantes

**Severidad:** BAJA
**Ubicacion:** `/cars/my`, `/cars/list`

**Descripcion:**
- Algunos autos muestran placeholder en lugar de foto real

**Solucion recomendada:**
```typescript
// Imagen por defecto
const defaultCarImage = '/assets/images/car-placeholder.webp';

// En template
<img [src]="car.photos?.[0]?.url || defaultCarImage" />
```

---

## 7. VULNERABILIDADES DE SEGURIDAD

### 7.1 Race Condition en wallet_lock_funds

**Severidad:** CRITICA
**Archivo:** `rpc_wallet_lock_funds.sql`

**Problema:**
```sql
-- VULNERABLE: No hay lock exclusivo
SELECT available_balance INTO v_current_available
FROM wallet_get_balance();

IF v_current_available >= p_amount THEN
  INSERT INTO wallet_transactions (...);  -- Race condition!
END IF;
```

**Escenario de ataque:**
```
1. Usuario tiene $100 disponible
2. Request A: Valida ($100 >= $100) ✓
3. Request B: Valida ($100 >= $100) ✓
4. Request A: INSERT lock de $100
5. Request B: INSERT lock de $100
6. Resultado: $200 bloqueados de $100 disponibles = SOBREGIRO
```

**Solucion:**
```sql
BEGIN;

-- Lock exclusivo con SELECT FOR UPDATE
SELECT available_balance INTO v_current_available
FROM user_wallets
WHERE user_id = p_user_id
FOR UPDATE;

IF v_current_available >= p_amount THEN
  INSERT INTO wallet_transactions (...);
END IF;

COMMIT;
```

### 7.2 Falta de Idempotencia en Pagos

**Severidad:** CRITICA
**Archivo:** `mercadopago-process-booking-payment/index.ts`

**Problema:**
```typescript
// Se envia idempotency key a MercadoPago...
headers: { 'X-Idempotency-Key': booking_id }

// PERO no se valida en el servidor antes de crear pago
// Si cliente reintenta despues de error de red → pago duplicado
```

**Escenario de ataque:**
```
1. Cliente envia pago de $10,000
2. MercadoPago responde HTTP 200
3. Red se cae antes de recibir respuesta
4. Cliente reintenta → NUEVO pago de $10,000
5. Usuario cobra $20,000 en lugar de $10,000
```

**Solucion:**
```typescript
// 1. Verificar si ya existe pago para este booking
const existing = await supabase
  .from('booking_payments')
  .select('id, mp_payment_id, status')
  .eq('booking_id', booking_id)
  .eq('idempotency_key', booking_id)
  .maybeSingle();

if (existing?.data) {
  // Retornar resultado anterior
  return Response.json({
    success: true,
    payment_id: existing.data.mp_payment_id,
    idempotency_hit: true
  });
}

// 2. Registrar intento ANTES de llamar a MP
await supabase.from('booking_payments').insert({
  booking_id,
  idempotency_key: booking_id,
  status: 'processing'
});

// 3. Procesar pago
const mpResponse = await fetch(...);

// 4. Actualizar resultado
await supabase.from('booking_payments').update({
  mp_payment_id: mpData.id,
  status: mpData.status
}).eq('booking_id', booking_id);
```

### 7.3 Price Lock Validation Debil

**Severidad:** ALTA
**Archivo:** `mercadopago-process-booking-payment/index.ts`

**Problema:**
```typescript
// Comparacion de strings con Date puede fallar
if (booking.price_locked_until) {
  const lockExpiry = new Date(booking.price_locked_until);
  if (lockExpiry < new Date()) {  // ⚠️ Timezone issues
    return error('Price lock expired');
  }
}
```

**Solucion:**
```typescript
if (booking.price_locked_until) {
  const lockExpiry = new Date(booking.price_locked_until);
  const now = new Date();

  // Comparar timestamps en milliseconds
  if (lockExpiry.getTime() < now.getTime()) {
    return Response.json({
      error: 'El precio de la reserva ha expirado',
      expired_at: booking.price_locked_until,
      current_time: now.toISOString()
    }, { status: 400 });
  }
}
```

### 7.4 Silent Failures en Bonus-Malus

**Severidad:** MEDIA
**Archivo:** `bonus-malus.service.ts`

**Problema:**
```typescript
async getUserBonusMalus(userId?: string): Promise<UserBonusMalus | null> {
  try {
    // ...
  } catch {
    return null;  // ⚠️ Error silencioso, sin logging
  }
}
```

**Impacto:**
- Usuario Elite puede perder descuento sin saberlo
- SRE no recibe alertas de fallos
- Debugging imposible sin logs

**Solucion:**
```typescript
async getUserBonusMalus(userId?: string): Promise<UserBonusMalus | null> {
  try {
    // ...
  } catch (err) {
    this.logger.error('Failed to fetch bonus-malus', err, { userId });
    // Decidir: fallar o retornar default
    return {
      user_id: userId || 'unknown',
      total_factor: 0,  // Factor neutro
      metrics: { error: true }
    };
  }
}
```

### 7.5 Cache Inconsistente en Wallet

**Severidad:** MEDIA
**Archivo:** `wallet.service.ts`

**Problema:**
```typescript
private readonly STALE_TIME_MS = 5000;  // 5 segundos cache

// Despues de lockFunds(), NO se invalida cache
async lockFunds(bookingId, amount) {
  await this.supabase.rpc('wallet_lock_funds', ...);
  this.fetchBalance().catch(() => { });  // Fetch pero no invalida
}
```

**Impacto:**
- UI puede mostrar saldo desactualizado por 5 segundos
- Dos operaciones concurrentes pueden ver saldo inconsistente

**Solucion:**
```typescript
async lockFunds(bookingId: string, amount: number) {
  const result = await this.supabase.rpc('wallet_lock_funds', ...);

  // Invalidar cache inmediatamente
  this.lastFetchTimestamp = 0;
  await this.fetchBalance(true);  // Forzar refresh

  return result;
}
```

### 7.6 Informacion Sensible en Metadata

**Severidad:** MEDIA
**Archivo:** `mercadopago-process-booking-payment/index.ts`

**Problema:**
```typescript
metadata: {
  mp_card_holder_name: mpData.card?.cardholder?.name,  // PII
  mp_status_detail: mpData.status_detail,  // Info tecnica
}
```

**Riesgo:**
- Nombre del titular expuesto en data breach
- Detalles tecnicos pueden revelar politicas antifraude

**Solucion:**
```typescript
metadata: {
  mp_payment_id: mpData.id,
  mp_status: mpData.status,
  mp_card_last4: mpData.card?.last_four_digits,
  // NO incluir: cardholder name, status_detail
}
```

### 7.7 Falta de Rate Limiting en Wallet

**Severidad:** MEDIA
**Archivo:** `wallet.service.ts`

**Problema:**
```typescript
// Cualquier usuario puede llamar sin limite
lockFunds(bookingId, amount) {
  return from(this.supabase.rpc('wallet_lock_funds', ...));
}
```

**Riesgo:** DoS attack con 1000 requests/segundo

**Solucion:**
```typescript
private lockFundsLimiter = new Map<string, number[]>();

async lockFunds(bookingId: string, amount: number) {
  const userId = this.getCurrentUserId();
  const now = Date.now();
  const timestamps = this.lockFundsLimiter.get(userId) || [];

  // Maximo 5 locks por minuto
  const recentLocks = timestamps.filter(t => now - t < 60000);
  if (recentLocks.length >= 5) {
    throw new Error('Rate limit: Maximum 5 locks per minute');
  }

  recentLocks.push(now);
  this.lockFundsLimiter.set(userId, recentLocks);

  return this.supabase.rpc('wallet_lock_funds', ...);
}
```

---

## 8. CODE SMELLS Y ANTIPATRONES

### 8.1 Type Coercion Insegura

**Archivo:** `mercadopago-card-form.component.ts`

```typescript
// ANTES (inseguro)
const errorMsg = error instanceof Error ? error['message'] : String(error);

// DESPUES (seguro)
const errorMsg = error instanceof Error ? error.message : String(error);
```

### 8.2 Acceso a Propiedades Internas

**Archivo:** `mercadopago-payment.service.ts`

```typescript
// ANTES (fragil)
private getSupabaseUrl(): string {
  const supabase = this.supabaseService.getClient();
  // @ts-expect-error - Acceso interno
  return supabase.supabaseUrl || '';
}

// DESPUES (robusto)
constructor(
  @Inject('SUPABASE_URL') private readonly supabaseUrl: string
) {}
```

### 8.3 Promises Sin Manejo de Error

```typescript
// ANTES
this.fetchBalance().catch(() => { });  // Silencioso

// DESPUES
this.fetchBalance().catch(err => {
  this.logger.error('Failed to fetch balance', err);
});
```

### 8.4 Magic Numbers

```typescript
// ANTES
if (recentLocks.length >= 5) { ... }
await sleep(200 * Math.pow(2, attempt - 1));

// DESPUES
const MAX_LOCKS_PER_MINUTE = 5;
const BASE_RETRY_DELAY_MS = 200;

if (recentLocks.length >= MAX_LOCKS_PER_MINUTE) { ... }
await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
```

### 8.5 Codigo Duplicado en Validaciones

```typescript
// Multiples archivos repiten validacion de booking
if (!booking) throw new Error('Booking not found');
if (booking.status !== 'confirmed') throw new Error('Invalid status');

// Extraer a servicio compartido
class BookingValidationService {
  validateForPayment(booking: Booking): void {
    if (!booking) throw new BookingNotFoundError();
    if (booking.status !== 'confirmed') throw new InvalidStatusError();
  }
}
```

### 8.6 Console.log en Codigo

```typescript
// Encontrados en varios archivos
console.log('Debug:', data);
console.error('Error:', error);

// Usar LoggerService
this.logger.info('Debug', { data });
this.logger.error('Error', error);
```

---

## 9. RECOMENDACIONES DE MEJORA

### 9.1 Arquitectura

| Mejora | Prioridad | Esfuerzo |
|--------|-----------|----------|
| Implementar Distributed Locks (Advisory Locks) | ALTA | 2 dias |
| Event Sourcing para pagos | MEDIA | 1 semana |
| Circuit Breaker para MercadoPago | MEDIA | 1 dia |
| Separar Edge Functions por dominio | BAJA | 3 dias |

### 9.2 Seguridad

| Mejora | Prioridad | Esfuerzo |
|--------|-----------|----------|
| SELECT FOR UPDATE en wallet | CRITICA | 1 dia |
| Idempotencia en pagos | CRITICA | 1 dia |
| Rate limiting en wallet | ALTA | 2 horas |
| Encriptar PII en metadata | MEDIA | 4 horas |
| Auditar CORS configuration | MEDIA | 1 hora |

### 9.3 Codigo

| Mejora | Prioridad | Esfuerzo |
|--------|-----------|----------|
| Agregar logging a bonus-malus | ALTA | 2 horas |
| Invalidar cache tras operaciones | ALTA | 1 hora |
| Extraer validaciones a servicios | MEDIA | 4 horas |
| Remover console.log | BAJA | 1 hora |
| Documentar funciones RPC | BAJA | 2 horas |

### 9.4 Testing

| Mejora | Prioridad | Esfuerzo |
|--------|-----------|----------|
| Tests de race conditions | ALTA | 2 dias |
| Tests E2E de flujo de pago | ALTA | 1 dia |
| Tests de bonus-malus edge cases | MEDIA | 4 horas |
| Load testing de wallet | MEDIA | 1 dia |

---

## 10. PLAN DE ACCION

### 10.1 Inmediato (0-3 dias)

- [ ] **CRITICO:** Implementar SELECT FOR UPDATE en wallet_lock_funds
- [ ] **CRITICO:** Agregar idempotencia en mercadopago-process-booking-payment
- [ ] **CRITICO:** Corregir validacion de price lock (timestamps)
- [ ] **ALTA:** Agregar logging a bonus-malus service
- [ ] **ALTA:** Invalidar cache de wallet tras operaciones

### 10.2 Corto Plazo (1-2 semanas)

- [ ] Implementar circuit breaker para MercadoPago SDK
- [ ] Agregar exponential backoff en wallet.service
- [ ] Remover informacion sensible de metadata
- [ ] Revisar CORS configuration
- [ ] Limpiar datos de prueba

### 10.3 Mediano Plazo (1 mes)

- [ ] Implementar event sourcing para pagos
- [ ] Usar advisory locks para distributed locking
- [ ] Agregar rate limiting en operaciones de wallet
- [ ] Crear dashboard de monitoreo de pagos
- [ ] Documentar todas las funciones RPC

### 10.4 Largo Plazo (3 meses)

- [ ] Migrar a arquitectura de microservicios
- [ ] Implementar saga pattern para transacciones distribuidas
- [ ] Agregar soporte para multiples pasarelas de pago
- [ ] Internacionalizacion completa

---

## 11. METRICAS DEL SISTEMA

### 11.1 Estado Actual

| Metrica | Valor |
|---------|-------|
| Vehiculos disponibles | 7 |
| Autos sin titulo | 3 |
| Reservas pendientes (real) | 0 |
| Balance wallet usuario test | US$ 3,289.41 |
| Fondos bloqueados | US$ 1,200.00 |
| Fondos retirables | US$ 1,289.41 |
| Credito Autorentar | US$ 800.00 |

### 11.2 Cobertura de Funcionalidades

| Feature | Estado | Notas |
|---------|--------|-------|
| Busqueda de autos | OK | Mapa Mapbox funcionando |
| Filtros de busqueda | OK | Fechas, precio, rating, distancia |
| Detalle de auto | OK | Galeria, specs, calendario |
| Reserva (renter) | No probado | Usuario es owner de todos los autos |
| Dashboard owner | OK | Widgets, balance, earnings |
| Gestion de autos | OK | CRUD funcionando |
| Aprobacion de reservas | BUG | Contador inconsistente |
| Wallet | OK | Balance, depositos, bloqueos |
| Chat | OK | Mensajes pre-reserva |

### 11.3 Performance

| Metrica | Valor | Target |
|---------|-------|--------|
| Tiempo de carga inicial | ~3s | < 2s |
| Tiempo de compilacion | ~51s | < 30s |
| Bundle size (main) | ~500KB | < 300KB |
| Lazy chunks | 173 | Optimizar |

---

## 12. ANEXOS

### 12.1 Servicios por Dominio

**Bookings (15 servicios):**
```
bookings.service.ts
booking-initiation.service.ts
booking-approval.service.ts
booking-completion.service.ts
booking-cancellation.service.ts
booking-confirmation.service.ts
booking-validation.service.ts
booking-wallet.service.ts
booking-notifications.service.ts
insurance.service.ts
messages.service.ts
urgent-rental.service.ts
waitlist.service.ts
booking-utils.service.ts
booking-stats.service.ts
```

**Payments (12 servicios):**
```
wallet.service.ts
wallet-ledger.service.ts
mercadopago-booking-gateway.service.ts
mercadopago-payment.service.ts
mercadopago-script.service.ts
paypal-booking-gateway.service.ts
fx.service.ts
pricing.service.ts
bonus-malus.service.ts
dynamic-pricing.service.ts
payment-orchestration.service.ts
payout.service.ts
```

**Cars (8 servicios):**
```
cars.service.ts
car-availability.service.ts
car-blocking.service.ts
car-depreciation-notifications.service.ts
reviews.service.ts
favorites.service.ts
cars-compare.service.ts
car-stats.service.ts
```

### 12.2 Rutas Principales

**Renter:**
```
/                       → Marketplace home
/cars                   → Landing conversion
/cars/list              → Mapa de autos
/cars/:id               → Detalle auto
/bookings/wizard        → Crear reserva
/bookings               → Mis reservas
/bookings/:id           → Detalle reserva
/bookings/:id/checkout  → Pago
/bookings/:id/check-in  → Inicio alquiler
/bookings/:id/check-out → Devolucion
/wallet                 → Cartera
```

**Owner:**
```
/dashboard              → Panel principal
/dashboard/earnings     → Ingresos
/dashboard/stats        → Estadisticas
/dashboard/calendar     → Calendario multi-car
/cars/my                → Mis autos
/cars/publish           → Publicar auto
/cars/:id/availability  → Calendario disponibilidad
/bookings/owner         → Reservas recibidas
/bookings/pending-approval → Pendientes
/bookings/:id/owner-check-in  → Entrega
/bookings/:id/owner-check-out → Recepcion
/payouts                → Retiros
```

### 12.3 Edge Functions

```
supabase/functions/
├── mercadopago-process-booking-payment/  → Procesar pago MP
├── mercadopago-create-preference/        → Crear preferencia MP
├── mercadopago-webhook-deposit/          → Webhook depositos
├── dashboard-stats/                      → Stats del dashboard
├── send-booking-confirmation-email/      → Email confirmacion
├── send-booking-cancellation-email/      → Email cancelacion
└── _shared/
    └── cors.ts                           → Config CORS
```

### 12.4 Comandos Utiles

```bash
# Desarrollo
pnpm dev:web                    # Servidor desarrollo :4200

# Build
pnpm build                      # Build produccion
pnpm build:web                  # Solo web

# Deploy
./scripts/deploy-android.sh     # Android debug
./scripts/deploy-android.sh --release  # Android release
npx wrangler pages deploy ...   # Cloudflare Pages

# Database
supabase db push                # Aplicar migraciones
supabase gen types typescript   # Generar tipos

# Testing
npm run test:e2e                # Tests E2E
npm run test:e2e:booking        # Solo booking
```

---

## CONCLUSIONES

AutoRenta es una plataforma bien estructurada con patrones modernos de Angular, pero presenta **vulnerabilidades criticas** en el sistema de pagos que requieren correccion inmediata antes de cualquier despliegue a produccion.

**Fortalezas:**
- Arquitectura limpia con servicios especializados
- Implementacion correcta de RLS
- Sistema dual FX bien diseñado
- Exponential backoff en integraciones externas

**Debilidades:**
- Race conditions en operaciones de wallet
- Falta de idempotencia en pagos
- Logging insuficiente en servicios criticos
- Datos de prueba en ambiente

**Recomendacion final:** Priorizar las correcciones criticas de seguridad antes de continuar con nuevas funcionalidades.

---

*Documento generado automaticamente por Claude Code (Opus 4.5)*
*Fecha: 2025-12-27*
*Version del documento: 1.0*
