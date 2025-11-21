# Glosario de Referencia: Base de Datos ↔ Frontend

**Última actualización**: 2025-11-14  
**Propósito**: Mapeo completo entre tablas de BD, modelos TypeScript y servicios Angular para tests E2E y desarrollo

---

## 📋 Índice

1. [Bookings (Reservas)](#bookings-reservas)
2. [Booking Inspections (Inspecciones)](#booking-inspections-inspecciones)
3. [Wallet System (Sistema de Billetera)](#wallet-system-sistema-de-billetera)
4. [Cars (Autos)](#cars-autos)
5. [Payment Splits (División de Pagos)](#payment-splits-división-de-pagos)
6. [Estados y Transiciones](#estados-y-transiciones)
7. [Servicios Angular](#servicios-angular)

---

## Bookings (Reservas)

### Tabla BD: `bookings`

**Archivo SQL**: `supabase/migrations/20251016_create_core_tables.sql`  
**Modelo Frontend**: `apps/web/src/app/core/models/index.ts` → `Booking` interface

### Mapeo de Campos

| Campo BD | Tipo BD | Modelo Frontend | Tipo TypeScript | Descripción |
|----------|---------|----------------|-----------------|-------------|
| `id` | `UUID` | `id` | `string` | ID único de la reserva |
| `car_id` | `UUID` | `car_id` | `string` | FK a `cars.id` |
| `renter_id` | `UUID` | `renter_id` | `string` | FK a `auth.users.id` (locatario) |
| `start_at` | `TIMESTAMPTZ` | `start_at` | `string` (ISO) | Fecha/hora inicio alquiler |
| `end_at` | `TIMESTAMPTZ` | `end_at` | `string` (ISO) | Fecha/hora fin alquiler |
| `status` | `booking_status` | `status` | `BookingStatus` | Estado actual (ver abajo) |
| `total_amount` | `NUMERIC(10,2)` | `total_amount` | `number` | Monto total (en moneda) |
| `currency` | `TEXT` | `currency` | `string` | Moneda ('ARS', 'USD', etc.) |
| `total_cents` | `BIGINT` | `total_cents` | `number` | Monto total en centavos |
| `payment_method` | `TEXT` | `payment_method` | `'credit_card' \| 'wallet' \| 'partial_wallet'` | Método de pago |
| `payment_mode` | `TEXT` | `payment_mode` | `'card' \| 'wallet'` | Modo de pago (nuevo) |
| `wallet_amount_cents` | `BIGINT` | `wallet_amount_cents` | `number \| null` | Monto pagado con wallet |
| `wallet_lock_transaction_id` | `UUID` | `wallet_lock_transaction_id` | `string \| null` | FK a `wallet_transactions.id` |
| `wallet_status` | `TEXT` | `wallet_status` | `'none' \| 'locked' \| 'charged' \| 'refunded'` | Estado de wallet |
| `rental_amount_cents` | `BIGINT` | `rental_amount_cents` | `number \| null` | Monto del alquiler (sistema dual) |
| `deposit_amount_cents` | `BIGINT` | `deposit_amount_cents` | `number \| null` | Monto de garantía (sistema dual) |
| `deposit_status` | `TEXT` | `deposit_status` | `BookingDepositStatus` | Estado de garantía |
| `completion_status` | `TEXT` | `completion_status` | `BookingCompletionStatus` | Estado de finalización bilateral |
| `owner_confirmed_delivery` | `BOOLEAN` | `owner_confirmed_delivery` | `boolean \| null` | Owner confirmó entrega |
| `renter_confirmed_payment` | `BOOLEAN` | `renter_confirmed_payment` | `boolean \| null` | Renter confirmó pago |
| `payment_split_completed` | `BOOLEAN` | - | `boolean` | Split de pago completado (85/15) |
| `owner_payment_amount` | `DECIMAL(10,2)` | - | `number` | Monto recibido por owner (85%) |
| `platform_fee` | `DECIMAL(10,2)` | - | `number` | Comisión plataforma (15%) |
| `provider_split_payment_id` | `TEXT` | - | `string` | ID de split payment en MP |
| `pickup_location_lat` | `NUMERIC(10,8)` | `pickup_location_lat` | `number \| null` | Latitud pickup |
| `pickup_location_lng` | `NUMERIC(11,8)` | `pickup_location_lng` | `number \| null` | Longitud pickup |
| `dropoff_location_lat` | `NUMERIC(10,8)` | `dropoff_location_lat` | `number \| null` | Latitud dropoff |
| `dropoff_location_lng` | `NUMERIC(11,8)` | `dropoff_location_lng` | `number \| null` | Longitud dropoff |
| `delivery_distance_km` | `NUMERIC(10,2)` | `delivery_distance_km` | `number \| null` | Distancia en km |
| `delivery_fee_cents` | `BIGINT` | `delivery_fee_cents` | `number \| null` | Fee de delivery |
| `created_at` | `TIMESTAMPTZ` | `created_at` | `string` (ISO) | Fecha creación |
| `updated_at` | `TIMESTAMPTZ` | `updated_at` | `string \| null` | Fecha última actualización |

### Estados de Booking (`BookingStatus`)

```typescript
type BookingStatus =
  | 'pending'           // Pendiente de pago
  | 'pending_payment'   // Esperando pago
  | 'pending_approval'  // Esperando aprobación del owner
  | 'confirmed'         // Confirmado, listo para check-in
  | 'in_progress'       // Alquiler en curso
  | 'completed'         // Alquiler completado
  | 'cancelled'         // Cancelado
  | 'rejected'          // Rechazado por owner
  | 'expired';          // Expirado
```

### Estados de Finalización (`BookingCompletionStatus`)

```typescript
type BookingCompletionStatus =
  | 'active'            // Booking activo, alquiler en progreso
  | 'returned'          // Auto devuelto, esperando confirmaciones
  | 'pending_owner'      // Esperando confirmación del propietario
  | 'pending_renter'     // Esperando confirmación del locatario
  | 'pending_both'       // Esperando confirmación de ambas partes
  | 'funds_released';    // Fondos liberados exitosamente
```

### Estados de Garantía (`BookingDepositStatus`)

```typescript
type BookingDepositStatus =
  | 'none'              // Sin garantía
  | 'locked'            // Garantía bloqueada
  | 'released'          // Garantía liberada al usuario
  | 'partially_charged'  // Garantía parcialmente cobrada por daños
  | 'fully_charged';     // Garantía completamente cobrada por daños
```

### Servicios Relacionados

- **`BookingsService`** (`apps/web/src/app/core/services/bookings.service.ts`)
  - `getBookingById(id: string): Promise<Booking>`
  - `updateBooking(id: string, updates: Partial<Booking>): Promise<void>`
  - `createBooking(params): Promise<Booking>`

- **`BookingCancellationService`** (`apps/web/src/app/core/services/booking-cancellation.service.ts`)
  - `cancelBooking(booking: Booking, force?: boolean): Promise<{success: boolean, error?: string}>`

- **`BookingWalletService`** (`apps/web/src/app/core/services/booking-wallet.service.ts`)
  - `lockFunds(bookingId: string, amount: number): Promise<void>`
  - `unlockFunds(bookingId: string, reason: string): Promise<void>`

### Componentes Frontend

- **Check-in**: `apps/web/src/app/features/bookings/check-in/check-in.page.ts`
- **Check-out**: `apps/web/src/app/features/bookings/check-out/check-out.page.ts`
- **Booking Detail**: `apps/web/src/app/features/bookings/booking-detail/`

---

## Booking Inspections (Inspecciones)

### Tabla BD: `booking_inspections`

**Archivo SQL**: `supabase/migrations/20251024_fgo_v1_1_enhancements.sql` (línea 104)  
**Modelo Frontend**: `apps/web/src/app/core/models/fgo-v1-1.model.ts` → `BookingInspection` interface

### Mapeo de Campos

| Campo BD | Tipo BD | Modelo Frontend | Tipo TypeScript | Descripción |
|----------|---------|----------------|-----------------|-------------|
| `id` | `UUID` | `id` | `string` | ID único de inspección |
| `booking_id` | `UUID` | `bookingId` | `string` | FK a `bookings.id` |
| `stage` | `TEXT` | `stage` | `'check_in' \| 'check_out'` | Etapa de inspección |
| `inspector_id` | `UUID` | `inspectorId` | `string` | FK a `profiles.id` (quien inspecciona) |
| `photos` | `JSONB` | `photos` | `InspectionPhoto[]` | Array de fotos con metadata |
| `odometer` | `INTEGER` | `odometer` | `number \| undefined` | Lectura de odómetro |
| `fuel_level` | `NUMERIC(5,2)` | `fuelLevel` | `number \| undefined` | Nivel de combustible (0-100) |
| `latitude` | `NUMERIC(10,6)` | `latitude` | `number \| undefined` | Latitud GPS |
| `longitude` | `NUMERIC(10,6)` | `longitude` | `number \| undefined` | Longitud GPS |
| `signed_at` | `TIMESTAMPTZ` | `signedAt` | `Date \| undefined` | Timestamp de firma digital |
| `created_at` | `TIMESTAMPTZ` | `createdAt` | `Date` | Fecha creación |

### Estructura de `InspectionPhoto`

```typescript
interface InspectionPhoto {
  url: string;                    // URL en Supabase Storage
  type: 'exterior' | 'interior' | 'odometer' | 'damage' | 'other';
  caption?: string;                // Descripción opcional
  timestamp?: string;              // ISO timestamp
}
```

### Constraint Único

```sql
UNIQUE(booking_id, stage)  -- Solo una inspección por booking y stage
```

### Servicios Relacionados

- **`FgoV1_1Service`** (`apps/web/src/app/core/services/fgo-v1-1.service.ts`)
  - `getInspectionByStage(bookingId: string, stage: InspectionStage): Observable<BookingInspection | null>`
  - `createInspection(params: CreateInspectionParams): Observable<BookingInspection>`
  - `signInspection(inspectionId: string): Observable<BookingInspection>`

### Componentes Frontend

- **InspectionUploader**: `apps/web/src/app/shared/components/inspection-uploader/inspection-uploader.component.ts`
- **Check-in Page**: `apps/web/src/app/features/bookings/check-in/check-in.page.ts`
- **Check-out Page**: `apps/web/src/app/features/bookings/check-out/check-out.page.ts`

### Validaciones para Tests E2E

- ✅ Mínimo 4 fotos requeridas (check-in)
- ✅ Mínimo 8 fotos requeridas (check-out completo)
- ✅ `odometer` debe ser >= 0
- ✅ `fuel_level` debe estar entre 0 y 100
- ✅ `signed_at` debe existir para considerar inspección completa
- ✅ `latitude` y `longitude` opcionales pero recomendados

---

## Wallet System (Sistema de Billetera)

### Tabla BD: `user_wallets`

**Modelo Frontend**: `apps/web/src/app/core/models/wallet.model.ts` → `WalletBalance` interface

### Mapeo de Campos

| Campo BD | Tipo BD | Modelo Frontend | Tipo TypeScript | Descripción |
|----------|---------|----------------|-----------------|-------------|
| `user_id` | `UUID` | `user_id` | `string` | FK a `auth.users.id` |
| `balance_cents` | `BIGINT` | `total_balance` | `number` | Balance total (available + locked) |
| `available_balance_cents` | `BIGINT` | `available_balance` | `number` | Fondos disponibles |
| `locked_balance_cents` | `BIGINT` | `locked_balance` | `number` | Fondos bloqueados en bookings |
| `autorentar_credit_balance_cents` | `BIGINT` | `autorentar_credit_balance` | `number` | Crédito Autorentar (no retirable) |
| `cash_deposit_balance_cents` | `BIGINT` | `cash_deposit_balance` | `number` | Depósitos en efectivo (no retirables) |
| `currency` | `TEXT` | `currency` | `string` | Moneda ('USD', 'ARS', 'UYU') |

### Tabla BD: `wallet_transactions`

**Modelo Frontend**: `apps/web/src/app/core/models/wallet.model.ts` → `WalletTransactionDB` (de Supabase types)

### Mapeo de Campos Principales

| Campo BD | Tipo BD | Modelo Frontend | Tipo TypeScript | Descripción |
|----------|---------|----------------|-----------------|-------------|
| `id` | `UUID` | `id` | `string` | ID único de transacción |
| `user_id` | `UUID` | `user_id` | `string` | FK a `auth.users.id` |
| `type` | `TEXT` | `type` | `WalletTransactionType` | Tipo de transacción |
| `amount` | `BIGINT` | `amount` | `number` | Monto en centavos |
| `currency` | `TEXT` | `currency` | `string` | Moneda |
| `status` | `TEXT` | `status` | `WalletTransactionStatus` | Estado |
| `description` | `TEXT` | `description` | `string` | Descripción |
| `reference_type` | `TEXT` | `reference_type` | `WalletReferenceType` | Tipo de referencia |
| `reference_id` | `UUID` | `reference_id` | `string` | ID de referencia (ej: booking_id) |
| `provider` | `TEXT` | `provider` | `WalletPaymentProvider` | Proveedor de pago |
| `provider_transaction_id` | `TEXT` | `provider_transaction_id` | `string` | ID en proveedor externo |
| `completed_at` | `TIMESTAMPTZ` | `completed_at` | `string` | Fecha completado |
| `created_at` | `TIMESTAMPTZ` | `created_at` | `string` | Fecha creación |

### Tipos de Transacciones (`WalletTransactionType`)

```typescript
type WalletTransactionType =
  | 'deposit'                    // Depósito de fondos
  | 'lock'                       // Bloqueo de fondos para garantía
  | 'unlock'                     // Desbloqueo de fondos
  | 'charge'                     // Cargo efectivo de fondos
  | 'refund'                     // Devolución de fondos
  | 'bonus'                      // Bonificación/regalo
  | 'rental_payment_lock'        // Bloqueo del pago del alquiler
  | 'rental_payment_transfer'    // Transferencia del pago al propietario
  | 'security_deposit_lock'      // Bloqueo de la garantía
  | 'security_deposit_release'   // Liberación de la garantía al usuario
  | 'security_deposit_charge'    // Cargo por daños de la garantía
  | 'withdrawal';                // Retiro de fondos a cuenta bancaria
```

### Estados de Transacción (`WalletTransactionStatus`)

```typescript
type WalletTransactionStatus =
  | 'pending'      // En proceso
  | 'completed'    // Completada exitosamente
  | 'failed'       // Falló
  | 'refunded';    // Reembolsada
```

### Tipos de Referencia (`WalletReferenceType`)

```typescript
type WalletReferenceType =
  | 'booking'           // Reserva/booking
  | 'deposit'           // Depósito normal
  | 'reward'            // Bonificación/recompensa
  | 'credit_protected'  // Crédito Autorentar (no retirable)
  | 'transfer'          // Transferencia entre usuarios
  | 'withdrawal';       // Retiro a cuenta bancaria
```

### Servicios Relacionados

- **`WalletService`** (`apps/web/src/app/core/services/wallet.service.ts`)
  - `getBalance(): Observable<WalletBalance>`
  - `getTransactions(filters?: WalletTransactionFilters): Observable<WalletTransaction[]>`
  - `initiateDeposit(params: InitiateDepositParams): Observable<WalletInitiateDepositResponse>`
  - `lockFunds(params: LockFundsParams): Observable<WalletLockFundsResponse>`
  - `unlockFunds(params: UnlockFundsParams): Observable<WalletUnlockFundsResponse>`

- **`BookingWalletService`** (`apps/web/src/app/core/services/booking-wallet.service.ts`)
  - `lockRentalAndDeposit(params: LockRentalAndDepositParams): Observable<WalletLockRentalAndDepositResponse>`
  - `completeBooking(bookingId: string): Observable<WalletCompleteBookingResponse>`
  - `completeBookingWithDamages(params: CompleteBookingWithDamagesParams): Observable<WalletCompleteBookingWithDamagesResponse>`

### RPC Functions (Supabase)

- `wallet_get_balance(p_user_id UUID)`
- `wallet_lock_funds(p_user_id UUID, p_amount BIGINT, p_reference_type TEXT, p_reference_id UUID)`
- `wallet_unlock_funds(p_user_id UUID, p_reference_id UUID)`
- `wallet_initiate_deposit(p_user_id UUID, p_amount BIGINT, p_provider TEXT)`
- `wallet_lock_rental_and_deposit(p_booking_id UUID, p_rental_amount BIGINT, p_deposit_amount BIGINT)`
- `wallet_complete_booking(p_booking_id UUID)`
- `wallet_complete_booking_with_damages(p_booking_id UUID, p_damage_amount BIGINT, p_description TEXT)`

---

## Payment Splits (División de Pagos)

### Tabla BD: `payment_splits`

**Archivo SQL**: `supabase/migrations/20250126_mercadopago_marketplace.sql` (línea 85)

### Mapeo de Campos

| Campo BD | Tipo BD | Descripción |
|----------|---------|-------------|
| `id` | `UUID` | ID único del split |
| `booking_id` | `UUID` | FK a `bookings.id` |
| `payment_id` | `TEXT` | ID del pago en MercadoPago |
| `mercadopago_payment_id` | `TEXT` | ID de MP (legacy) |
| `total_amount` | `DECIMAL(10,2)` | Monto total |
| `owner_amount` | `DECIMAL(10,2)` | Monto para owner (85%) |
| `platform_fee` | `DECIMAL(10,2)` | Comisión plataforma (15%) |
| `split_status` | `TEXT` | Estado del split |
| `created_at` | `TIMESTAMPTZ` | Fecha creación |

### Campos en `bookings` Relacionados

| Campo BD | Descripción |
|----------|-------------|
| `payment_split_completed` | `BOOLEAN` | Si el split fue completado |
| `owner_payment_amount` | `DECIMAL(10,2)` | Monto recibido por owner |
| `platform_fee` | `DECIMAL(10,2)` | Comisión plataforma |
| `provider_split_payment_id` | `TEXT` | ID del split payment en proveedor |

### Lógica de Split

- **Owner recibe**: 85% del `total_amount`
- **Plataforma recibe**: 15% del `total_amount`
- **Total**: `owner_amount + platform_fee = total_amount`

### Validaciones para Tests E2E

- ✅ `owner_amount` = `total_amount * 0.85` (redondeado)
- ✅ `platform_fee` = `total_amount * 0.15` (redondeado)
- ✅ `owner_amount + platform_fee` = `total_amount` (con tolerancia de redondeo)
- ✅ `payment_split_completed` = `true` después del split
- ✅ Transacciones en `wallet_transactions` creadas para owner y platform

---

## Cars (Autos)

### Tabla BD: `cars`

**Modelo Frontend**: `apps/web/src/app/core/models/index.ts` → `Car` interface

### Campos Principales para Tests E2E

| Campo BD | Tipo BD | Modelo Frontend | Descripción |
|----------|---------|----------------|-------------|
| `id` | `UUID` | `id` | ID único del auto |
| `owner_id` | `UUID` | `owner_id` | FK a `auth.users.id` |
| `brand` | `TEXT` | `brand` | Marca |
| `model` | `TEXT` | `model` | Modelo |
| `year` | `INTEGER` | `year` | Año |
| `price_per_day_cents` | `BIGINT` | `price_per_day_cents` | Precio por día |
| `status` | `TEXT` | `status` | Estado ('draft', 'pending', 'active', 'suspended') |
| `location_lat` | `NUMERIC(10,8)` | `location_lat` | Latitud |
| `location_lng` | `NUMERIC(11,8)` | `location_lng` | Longitud |

---

## Estados y Transiciones

### Flujo de Estados de Booking

```
pending → pending_payment → pending_approval → confirmed → in_progress → completed
                                                                    ↓
                                                              cancelled (en cualquier momento)
```

### Transiciones Críticas para Tests E2E

#### 1. Check-in (confirmed → in_progress)

**Trigger**: Usuario completa inspección check-in y firma

**Validaciones**:
- ✅ Booking `status` = `'confirmed'`
- ✅ `booking_inspections` con `stage='check_in'` existe y `signed_at IS NOT NULL`
- ✅ Mínimo 4 fotos en `photos` array
- ✅ `odometer` y `fuel_level` registrados
- ✅ Después: `status` = `'in_progress'`

**Código**:
```typescript
// check-in.page.ts línea 119-123
if (booking && booking.status === 'confirmed') {
  await this.bookingsService.updateBooking(booking.id, {
    status: 'in_progress',
  });
}
```

#### 2. Check-out (in_progress → completed)

**Trigger**: Usuario completa inspección check-out y firma

**Validaciones**:
- ✅ Booking `status` = `'in_progress'`
- ✅ `booking_inspections` con `stage='check_out'` existe y `signed_at IS NOT NULL`
- ✅ Mínimo 8 fotos en `photos` array
- ✅ Después: `status` = `'completed'` y `completion_status` = `'returned'`

**Código**:
```typescript
// check-out.page.ts línea 143-147
if (booking && booking.status === 'in_progress') {
  await this.bookingsService.updateBooking(booking.id, {
    status: 'completed',
    completion_status: 'returned',
  });
}
```

#### 3. Split de Pago (post-completed)

**Trigger**: Booking completado, ambas partes confirman

**Validaciones**:
- ✅ Booking `status` = `'completed'`
- ✅ `owner_confirmed_delivery` = `true`
- ✅ `renter_confirmed_payment` = `true`
- ✅ `payment_split_completed` = `true`
- ✅ `owner_payment_amount` = `total_amount * 0.85`
- ✅ `platform_fee` = `total_amount * 0.15`
- ✅ Transacciones en `wallet_transactions`:
  - Tipo `'rental_payment_transfer'` para owner
  - Tipo `'platform_fee'` para platform

---

## Servicios Angular

### BookingsService

**Archivo**: `apps/web/src/app/core/services/bookings.service.ts`

**Métodos Principales**:
```typescript
getBookingById(id: string): Promise<Booking>
updateBooking(id: string, updates: Partial<Booking>): Promise<void>
createBooking(params: CreateBookingParams): Promise<Booking>
getMyBookings(): Observable<Booking[]>
```

### FgoV1_1Service

**Archivo**: `apps/web/src/app/core/services/fgo-v1-1.service.ts`

**Métodos Principales**:
```typescript
getInspectionByStage(bookingId: string, stage: InspectionStage): Observable<BookingInspection | null>
createInspection(params: CreateInspectionParams): Observable<BookingInspection>
signInspection(inspectionId: string): Observable<BookingInspection>
```

### WalletService

**Archivo**: `apps/web/src/app/core/services/wallet.service.ts`

**Métodos Principales**:
```typescript
getBalance(): Observable<WalletBalance>
getTransactions(filters?: WalletTransactionFilters): Observable<WalletTransaction[]>
initiateDeposit(params: InitiateDepositParams): Observable<WalletInitiateDepositResponse>
lockFunds(params: LockFundsParams): Observable<WalletLockFundsResponse>
unlockFunds(params: UnlockFundsParams): Observable<WalletUnlockFundsResponse>
```

### BookingWalletService

**Archivo**: `apps/web/src/app/core/services/booking-wallet.service.ts`

**Métodos Principales**:
```typescript
lockRentalAndDeposit(params: LockRentalAndDepositParams): Observable<WalletLockRentalAndDepositResponse>
completeBooking(bookingId: string): Observable<WalletCompleteBookingResponse>
completeBookingWithDamages(params: CompleteBookingWithDamagesParams): Observable<WalletCompleteBookingWithDamagesResponse>
unlockFundsForCancellation(booking: Booking, reason: string): Promise<void>
```

---

## Helpers para Tests E2E

### Crear Booking de Test

```typescript
// tests/helpers/booking-test-helpers.ts
async function createTestBooking(params: {
  carId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      car_id: params.carId,
      renter_id: params.renterId,
      start_at: params.startDate.toISOString(),
      end_at: params.endDate.toISOString(),
      status: params.status,
      total_amount: 1000,
      currency: 'ARS',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Crear Inspección de Test

```typescript
async function createTestInspection(params: {
  bookingId: string;
  stage: 'check_in' | 'check_out';
  inspectorId: string;
  photos: InspectionPhoto[];
  odometer?: number;
  fuelLevel?: number;
  signed?: boolean;
}): Promise<BookingInspection> {
  const { data, error } = await supabase
    .from('booking_inspections')
    .insert({
      booking_id: params.bookingId,
      stage: params.stage,
      inspector_id: params.inspectorId,
      photos: params.photos,
      odometer: params.odometer,
      fuel_level: params.fuelLevel,
      signed_at: params.signed ? new Date().toISOString() : null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return mapBookingInspection(data);
}
```

### Verificar Split de Pago

```typescript
async function verifyPaymentSplit(bookingId: string): Promise<{
  ownerAmount: number;
  platformFee: number;
  totalAmount: number;
  splitCompleted: boolean;
}> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('total_amount, owner_payment_amount, platform_fee, payment_split_completed')
    .eq('id', bookingId)
    .single();
  
  return {
    ownerAmount: booking.owner_payment_amount || 0,
    platformFee: booking.platform_fee || 0,
    totalAmount: booking.total_amount || 0,
    splitCompleted: booking.payment_split_completed || false,
  };
}
```

---

## Referencias Rápidas

### URLs de Componentes

- Check-in: `/bookings/:id/check-in`
- Check-out: `/bookings/:id/check-out`
- Booking Detail: `/bookings/:id`
- My Bookings: `/bookings`

### Selectores para Tests E2E

```typescript
// Check-in page
page.locator('[data-testid="check-in-form"]')
page.locator('[data-testid="inspection-uploader"]')
page.locator('[data-testid="odometer-input"]')
page.locator('[data-testid="fuel-level-input"]')
page.locator('[data-testid="signature-pad"]')
page.getByRole('button', { name: /completar check-in/i })

// Check-out page
page.locator('[data-testid="check-out-form"]')
page.locator('[data-testid="check-in-comparison"]')
page.getByRole('button', { name: /completar check-out/i })

// Booking detail
page.locator('[data-testid="booking-status"]')
page.locator('[data-testid="booking-countdown"]')
page.getByRole('button', { name: /ver check-in/i })
page.getByRole('button', { name: /ver check-out/i })
```

---

**Última actualización**: 2025-11-14  
**Mantenedor**: AutoRenta Testing Team  
**Para actualizar**: Ejecutar `npm run sync:types` después de cambios en BD














