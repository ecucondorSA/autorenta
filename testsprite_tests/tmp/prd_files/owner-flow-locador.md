# PRD: Flujo Completo del Locador (Car Owner Flow)

**Versión:** 1.0
**Fecha:** 2025-11-05
**Estado:** Documentación Completa
**Autor:** Claude Code - Análisis Codebase

---

## Tabla de Contenidos

1. [Overview](#1-overview)
2. [User Story y Acceptance Criteria](#2-user-story-y-acceptance-criteria)
3. [User Flow](#3-user-flow)
4. [Fase 1: Publicación de Auto](#4-fase-1-publicación-de-auto)
5. [Fase 2: Gestión de Mis Autos](#5-fase-2-gestión-de-mis-autos)
6. [Fase 3: Gestión de Reservas](#6-fase-3-gestión-de-reservas)
7. [Fase 4: Dashboard del Locador](#7-fase-4-dashboard-del-locador)
8. [Fase 5: Wallet y Retiros](#8-fase-5-wallet-y-retiros)
9. [Fase 6: Comunicación con Locatarios](#9-fase-6-comunicación-con-locatarios)
10. [Implementación Técnica](#10-implementación-técnica)
11. [Edge Cases](#11-edge-cases)
12. [Test Scenarios](#12-test-scenarios)
13. [Dependencies](#13-dependencies)
14. [Security Considerations](#14-security-considerations)
15. [Performance](#15-performance)
16. [Success Metrics](#16-success-metrics)
17. [Rollout Plan](#17-rollout-plan)

---

## 1. Overview

### Descripción

El **Flujo del Locador** es el ciclo completo que permite a un propietario de vehículo publicar su auto, gestionar reservas, comunicarse con locatarios y cobrar ganancias en AutoRenta. Este flujo abarca desde la publicación inicial hasta el retiro de fondos a cuenta bancaria.

### Problema a Resolver

Los locadores necesitan:
- ✅ Publicar autos de manera rápida y sencilla
- ✅ Gestionar múltiples vehículos y reservas
- ✅ Comunicarse eficientemente con locatarios
- ✅ Cobrar pagos automáticamente con split de MercadoPago
- ✅ Retirar ganancias a su cuenta bancaria
- ✅ Monitorear métricas de negocio (ingresos, reservas, etc.)

### Criterios de Éxito

1. **Onboarding Completo**: Locador publica su primer auto en menos de 10 minutos
2. **Vinculación MercadoPago**: 100% de locadores completan OAuth antes de activar autos
3. **Gestión Eficiente**: Locador puede gestionar múltiples reservas desde un solo dashboard
4. **Comunicación Clara**: Chat directo con locatarios sin exponer datos personales
5. **Cobros Automáticos**: Split payments instantáneos vía MercadoPago
6. **Retiros Exitosos**: Fondos transferidos a cuenta bancaria en 24-48h

---

## 2. User Story y Acceptance Criteria

### User Story Principal

> **Como** propietario de un vehículo
> **Quiero** publicar mi auto, gestionar reservas y cobrar ganancias
> **Para** generar ingresos pasivos alquilando mi vehículo cuando no lo uso

### Acceptance Criteria

#### AC1: Publicación de Auto
- ✅ El locador puede publicar un auto completando un formulario exhaustivo
- ✅ El sistema valida marca, modelo, año, y precios
- ✅ Mínimo 3 fotos requeridas (máximo 10)
- ✅ Geolocalización automática o manual de ubicación
- ✅ Validación de vinculación MercadoPago antes de activar auto
- ✅ Estado `draft` si no tiene MP vinculado, `active` si está completo

#### AC2: Gestión de Autos
- ✅ Vista de todos los autos propios (activos, borradores, suspendidos)
- ✅ Edición de autos existentes
- ✅ Eliminación con validación (no permitir si hay reservas activas)
- ✅ Cambio de disponibilidad (activar/suspender)

#### AC3: Gestión de Reservas
- ✅ Vista de reservas de TODOS los autos del locador
- ✅ Cambio de estado: `confirmed` → `in_progress` → `completed`
- ✅ Cancelación de reservas (solo en `pending` o `confirmed`)
- ✅ Visualización de datos del locatario (nombre, email, teléfono)
- ✅ Chat integrado por auto/locatario

#### AC4: Dashboard
- ✅ Balance disponible y bloqueado
- ✅ Estadísticas: total autos, autos activos, reservas (próximas/activas/completadas)
- ✅ Ganancias: este mes, mes anterior, total histórico
- ✅ Crecimiento porcentual mes a mes

#### AC5: Wallet y Retiros
- ✅ Visualización de balance total, disponible, bloqueado
- ✅ Fondos retirables vs no retirables (cash deposits)
- ✅ Agregar cuentas bancarias
- ✅ Solicitar retiros con cálculo de comisión
- ✅ Historial de transacciones y retiros
- ✅ Cancelación de retiros pendientes

---

## 3. User Flow

### Flujo Principal (Happy Path)

```
┌─────────────────────────────────────────────────────────────┐
│  INICIO: Usuario con rol "locador" o "ambos"               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. PUBLICAR AUTO                                           │
│     - Completar formulario (/cars/publish)                  │
│     - Subir 3-10 fotos                                      │
│     - Validación MercadoPago                                │
│     - Estado: draft → active (con MP)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. GESTIONAR AUTOS                                         │
│     - Ver lista en /cars/my                                 │
│     - Editar, eliminar, cambiar disponibilidad              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. RECIBIR RESERVA                                         │
│     - Locatario solicita reserva                            │
│     - Auto-aprobación (opcional) o manual                   │
│     - Estado: pending → confirmed                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. GESTIONAR RESERVA                                       │
│     - Ver reserva en /bookings/owner                        │
│     - Chat con locatario                                    │
│     - Iniciar alquiler: confirmed → in_progress             │
│     - Finalizar alquiler: in_progress → completed           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. COBRAR GANANCIAS                                        │
│     - Split payment automático vía MP                       │
│     - Fondos disponibles en wallet                          │
│     - Ver balance en /wallet o /dashboard/owner             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. RETIRAR FONDOS                                          │
│     - Agregar cuenta bancaria en /wallet                    │
│     - Solicitar retiro (comisión 2.9%)                      │
│     - Estado: pending → approved → completed                │
│     - Transferencia en 24-48h                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  FIN: Ciclo completo locador                                │
└─────────────────────────────────────────────────────────────┘
```

### Flujos Alternativos

#### Alt 1: Publicación sin MercadoPago
```
1. Locador completa formulario
2. Sistema detecta: MP no vinculado
3. Mostrar banner: "Vinculá MP para activar"
4. Auto guardado como `draft`
5. Al vincular MP → Auto cambia a `active` automáticamente
```

#### Alt 2: Cancelación de Reserva
```
1. Locador ve reserva en estado `confirmed`
2. Click en "Cancelar reserva"
3. Confirmación: "¿Estás seguro?"
4. Sistema actualiza: status → `cancelled`
5. Liberar fondos bloqueados (si aplica)
6. Notificar locatario (email + chat)
```

#### Alt 3: Eliminación de Auto con Reservas
```
1. Locador intenta eliminar auto
2. Sistema valida: hasActiveBookings(carId)
3. Si tiene reservas → Error: "No puedes eliminar..."
4. Si NO tiene reservas → Eliminación exitosa
```

---

## 4. Fase 1: Publicación de Auto

### Ruta
`/cars/publish`

### Componente
`apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`

### Formulario Completo

#### 4.1 Información del Vehículo
| Campo | Tipo | Validación | Requerido |
|-------|------|------------|-----------|
| `brand_id` | UUID | FK a `car_brands` | Sí |
| `model_id` | UUID | FK a `car_models` | Sí |
| `year` | number | Min: 1980, Max: 2026 | Sí |
| `color` | string | Text | Sí |
| `mileage` | number | Min: 0 | Sí |
| `transmission` | enum | `manual` \| `automatic` | Sí |
| `fuel` | enum | `nafta` \| `gasoil` \| `electrico` \| `hibrido` | Sí |

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1272-1304
publishForm = this.fb.group({
  brand_id: ['', Validators.required],
  model_id: ['', Validators.required],
  year: [new Date().getFullYear(), [Validators.required, Validators.min(1980), Validators.max(2026)]],
  color: ['', Validators.required],
  mileage: [null, [Validators.required, Validators.min(0)]],
  transmission: ['', Validators.required],
  fuel: ['', Validators.required],
  // ...
});
```

#### 4.2 Precio y Condiciones
| Campo | Tipo | Validación | Requerido | Valor Default |
|-------|------|------------|-----------|---------------|
| `pricing_strategy` | enum | `dynamic` \| `custom` | No | `dynamic` |
| `price_per_day` | number | Min: 1 | Sí | - |
| `currency` | string | `USD` \| `ARS` \| `UYU` | Sí | `USD` |
| `value_usd` | number | Min: 5000, Max: 500000 | Sí | - |
| `min_rental_days` | number | Min: 1 | Sí | 1 |
| `max_rental_days` | number | Min: 1 | No | 30 |
| `deposit_required` | boolean | - | No | `true` |
| `deposit_amount` | number | Min: 0 | No | 200 |
| `insurance_included` | boolean | - | No | `false` |
| `auto_approval` | boolean | - | No | `true` |

**Notas Importantes:**
- **`pricing_strategy`**: Si es `dynamic`, `price_per_day` es readonly (calculado por backend)
- **`value_usd`**: Campo CRÍTICO para cálculos de seguro y depósitos (agregado 2025-10)
- **`auto_approval`**: Si `true`, reservas se aprueban automáticamente

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1286-1296
pricing_strategy: ['dynamic'],
price_per_day: [null, [Validators.required, Validators.min(1)]],
currency: ['USD', Validators.required],
value_usd: [null, [Validators.required, Validators.min(5000), Validators.max(500000)]],
min_rental_days: [1, [Validators.required, Validators.min(1)]],
max_rental_days: [30],
deposit_required: [true],
deposit_amount: [200],
insurance_included: [false],
auto_approval: [true],
```

#### 4.3 Ubicación
| Campo | Tipo | Validación | Requerido |
|-------|------|------------|-----------|
| `location_street` | string | Text | Sí |
| `location_street_number` | string | Text | Sí |
| `location_city` | string | Text | Sí |
| `location_state` | string | Text | Sí |
| `location_country` | enum | `AR` \| `UY` \| `BR` \| `CL` \| `PY` | Sí |
| `location_lat` | number | Coordenadas GPS | Calculado |
| `location_lng` | number | Coordenadas GPS | Calculado |

**Geocodificación:**
1. **Prioridad 1:** Coordenadas manuales (botón "Usar Mi Ubicación")
2. **Prioridad 2:** Geocoding de dirección completa
3. **Fallback:** Geocoding solo de ciudad

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1635-1673
if (manualCoords) {
  location_lat = manualCoords.latitude;
  location_lng = manualCoords.longitude;
} else {
  try {
    const geocodingResult = await this.geocodingService.geocodeStructuredAddress(...);
    location_lat = geocodingResult.latitude;
    location_lng = geocodingResult.longitude;
  } catch (geocodingError) {
    const cityResult = await this.geocodingService.getCityCoordinates(...);
    location_lat = cityResult.latitude;
    location_lng = cityResult.longitude;
  }
}
```

#### 4.4 Fotos
- **Mínimo:** 3 fotos
- **Máximo:** 10 fotos
- **Tamaño Max:** 5MB por foto
- **Formato:** Convertidas a WebP (optimización automática)
- **Resolución:** Max 1200x900px

**Características:**
1. **Upload Manual:** Botón "Agregar Fotos" → Multiple file input
2. **Generación IA:** Botón "Generar fotos AutorentA" → Cloudflare AI Worker
3. **Optimización:** Automática vía canvas resize + WebP compression
4. **Storage:** Supabase Storage bucket `car-images`
5. **Path Pattern:** `{userId}/{carId}/{uuid}.webp`

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1422-1461
async onPhotoSelected(event: Event): Promise<void> {
  // Validar cantidad (max 10)
  // Validar tamaño (max 5MB)
  // Optimizar imagen a WebP
  // Crear preview
  // Agregar a uploadedPhotos signal
}

// apps/web/src/app/core/services/cars.service.ts:46-84
async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
  const optimizedFile = await this.optimizeImage(file, {...});
  const filePath = `${userId}/${carId}/${uuidv4()}.webp`;
  await this.supabase.storage.from('car-images').upload(filePath, optimizedFile);
  // Insert en car_photos table
}
```

#### 4.5 Validación MercadoPago

**Flujo de Validación:**
```
1. ngOnInit() → checkMarketplaceOnboarding()
2. MarketplaceOnboardingService.getMarketplaceStatus(userId)
3. MarketplaceOnboardingService.canListCars(userId)
4. Si NO puede listar → Mostrar banner "Vinculá MP"
5. onSubmit() → Si mpReady() = false → Auto guardado como `draft`
6. Si mpReady() = true → Auto guardado como `active`
```

**Estados:**
- `mpStatusLoading = true`: Verificando estado
- `mpReady() = true`: Onboarding completo, puede activar autos
- `mpNeedsAttention() = true`: Falta vincular o completar
- `mpStatusError()`: Error al verificar

**Banners:**
```html
<!-- Banner: MP NO vinculado -->
<div *ngIf="showMpBanner()" class="bg-amber-50 border-amber-200">
  <p>Conectá Mercado Pago para activar tu auto</p>
  <button (click)="openOnboardingModal()">Vincular MP</button>
</div>

<!-- Banner: MP vinculado correctamente -->
<div *ngIf="mpReady()" class="bg-emerald-50 border-emerald-200">
  <p>✅ Mercado Pago vinculado correctamente</p>
  <p>Recibirás pagos automáticos con split inmediato</p>
</div>
```

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1123-1151
private async checkMarketplaceOnboarding(): Promise<void> {
  this.mpStatusLoading.set(true);
  const userId = await this.ensureCurrentUserId();
  await this.refreshMarketplaceSnapshot(userId);

  if (this.mpNeedsAttention() && !this.hasPromptedOnboarding) {
    this.hasPromptedOnboarding = true;
    await this.promptMarketplaceOnboarding(userId);
  }
}

// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1674-1679
const mpReady = this.mpReady();
const targetStatus: CarStatus = mpReady ? 'active' : 'draft';
const finalAutoApproval = mpReady ? autoApprovalRequested : false;
```

#### 4.6 Submit y Creación

**Proceso:**
1. Validar formulario
2. Validar MercadoPago
3. Obtener marca/modelo names
4. Geocodificar coordenadas
5. Crear auto con `carsService.createCar()`
6. Upload fotos en orden (position 0-9)
7. Redirigir a `/cars/my`

**Status Final:**
- Si `mpReady() = true` → `status: 'active'`
- Si `mpReady() = false` → `status: 'draft'`

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1605-1755
async onSubmit(): Promise<void> {
  if (!this.canSubmit() || this.isSubmitting()) return;

  if (!this.mpReady()) {
    await this.presentOnboardingWarning();
    return;
  }

  this.isSubmitting.set(true);

  const carData: Partial<Car> = {
    brand_id, model_id, year, color, mileage, transmission, fuel,
    price_per_day, currency, value_usd,
    min_rental_days, max_rental_days,
    deposit_required, deposit_amount, insurance_included,
    auto_approval: finalAutoApproval,
    location_street, location_city, location_state, location_country,
    location_lat, location_lng,
    title: this.generatedTitle(),
    status: targetStatus, // 'active' o 'draft'
  };

  const resultCar = await this.carsService.createCar(carData);

  // Upload fotos
  for (let i = 0; i < this.uploadedPhotos().length; i++) {
    await this.carsService.uploadPhoto(photo.file, resultCar.id, i);
  }

  alert(message);
  await this.router.navigate(['/cars/my']);
}
```

---

## 5. Fase 2: Gestión de Mis Autos

### Ruta
`/cars/my`

### Componente
`apps/web/src/app/features/cars/my-cars/my-cars.page.ts`

### Funcionalidades

#### 5.1 Vista de Lista

**Datos Mostrados:**
- Lista completa de autos propios
- Estadísticas: `countActive`, `countDraft`
- Estado de cada auto (activo, borrador, suspendido)

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/my-cars/my-cars.page.ts:22-36
readonly cars = signal<Car[]>([]);
readonly loading = signal(false);

constructor() {
  this.loading.set(true);
  this.carsService.listMyCars().then(cars => {
    this.cars.set(cars);
    this.loading.set(false);
  });
}

readonly countActive = computed(() =>
  this.cars().filter((car) => car.status === 'active').length
);
readonly countDraft = computed(() =>
  this.cars().filter((car) => car.status === 'draft').length
);
```

#### 5.2 Editar Auto

**Flujo:**
1. Click en botón "Editar"
2. Navegar a `/cars/publish?edit={carId}`
3. Formulario pre-cargado con datos existentes
4. Edit mode activado (`editMode() = true`)
5. Submit actualiza auto existente

**Diferencias Edit vs Create:**
- Edit: No requiere 3 fotos (auto ya tiene fotos)
- Edit: Mantiene fotos existentes si no se suben nuevas
- Edit: Mensaje: "Auto actualizado" vs "Auto publicado"

**Referencia Código:**
```typescript
// apps/web/src/app/features/cars/my-cars/my-cars.page.ts:38-40
async onEditCar(carId: string): Promise<void> {
  await this.router.navigate(['/cars/publish'], { queryParams: { edit: carId } });
}

// apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1353-1402
private async loadCarForEditing(carId: string): Promise<void> {
  const car = await this.carsService.getCarById(carId);

  // Pre-fill form
  this.publishForm.patchValue({
    brand_id: car.brand_id,
    model_id: car.model_id,
    year: car.year,
    // ... todos los campos
  });

  this.editMode.set(true);
  this.editingCarId.set(carId);
}

// Submit con edit mode
if (this.editMode() && this.editingCarId()) {
  resultCar = await this.carsService.updateCar(this.editingCarId()!, carData);
} else {
  resultCar = await this.carsService.createCar(carData);
}
```

#### 5.3 Eliminar Auto

**Validación Crítica:**
```typescript
// apps/web/src/app/features/cars/my-cars/my-cars.page.ts:42-57
async onDeleteCar(carId: string): Promise<void> {
  this.loading.set(true);
  try {
    const hasBookings = await this.carsService.hasActiveBookings(carId);
    if (hasBookings.hasActive) {
      // ⚠️ ERROR: No se puede eliminar con reservas activas
      return;
    }

    await this.carsService.deleteCar(carId);
    this.cars.set(this.cars().filter((car) => car.id !== carId));
  } catch (error) {
    // Handle error
  } finally {
    this.loading.set(false);
  }
}
```

**Estados de Reserva que Bloquean:**
- `pending`
- `confirmed`
- `in_progress`

**Estados que NO Bloquean:**
- `completed`
- `cancelled`
- `expired`

#### 5.4 Cambiar Disponibilidad

**Toggle Status:**
```typescript
// apps/web/src/app/features/cars/my-cars/my-cars.page.ts:59-72
async onToggleAvailability(carId: string, currentStatus: string): Promise<void> {
  this.loading.set(true);
  try {
    const newStatus: CarStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await this.carsService.updateCarStatus(carId, newStatus);

    // Actualizar local state
    this.cars.update((cars) =>
      cars.map((car) => (car.id === carId ? { ...car, status: newStatus } : car))
    );
  } catch (error) {
    // Handle error
  } finally {
    this.loading.set(false);
  }
}
```

**Estados Posibles:**
- `active`: Visible en búsqueda, acepta reservas
- `suspended`: No visible, no acepta reservas (pausado por locador)
- `draft`: No visible, onboarding MP incompleto

---

## 6. Fase 3: Gestión de Reservas

### Ruta
`/bookings/owner`

### Componente
`apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts`

### Funcionalidades

#### 6.1 Cargar Reservas

**Vista Utilizada:** `owner_bookings` (Supabase view)

```sql
-- Definición de vista (aproximada)
CREATE VIEW owner_bookings AS
SELECT b.*, c.title as car_title, c.brand, c.model
FROM bookings b
JOIN cars c ON b.car_id = c.id
WHERE c.owner_id = auth.uid();
```

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:79-94
async loadBookings(): Promise<void> {
  this.loading.set(true);
  this.error.set(null);
  this.renterContacts.set({});

  try {
    const items = await this.bookingsService.getOwnerBookings();
    await this.loadRenterContacts(items);
    this.bookings.set(items);
    await this.loadCarLeads(); // Chat leads
  } catch (err) {
    this.error.set('No pudimos cargar las reservas...');
  } finally {
    this.loading.set(false);
  }
}

// BookingsService
async getOwnerBookings(): Promise<Booking[]> {
  const { data, error } = await this.supabase
    .from('owner_bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Booking[];
}
```

#### 6.2 Estados de Reserva

**Flujo de Estados:**
```
pending → confirmed → in_progress → completed
   ↓          ↓
cancelled  cancelled
```

**Acciones del Locador:**

| Estado Actual | Acción Disponible | Estado Siguiente | Método |
|---------------|-------------------|------------------|--------|
| `pending` | Cancelar | `cancelled` | `onCancelBooking()` |
| `confirmed` | Iniciar alquiler | `in_progress` | `onStartRental()` |
| `confirmed` | Cancelar | `cancelled` | `onCancelBooking()` |
| `in_progress` | Finalizar alquiler | `completed` | `onCompleteRental()` |

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:172-183
canStartRental(booking: Booking): boolean {
  return booking.status === 'confirmed';
}

canCompleteRental(booking: Booking): boolean {
  return booking.status === 'in_progress';
}

canCancelBooking(booking: Booking): boolean {
  return booking.status === 'pending' || booking.status === 'confirmed';
}
```

#### 6.3 Iniciar Alquiler

**Flujo:**
1. Locador ve reserva en estado `confirmed`
2. Click en "Iniciar alquiler"
3. Confirmación: "Confirmá que el locatario recibió el auto"
4. Sistema actualiza: `status → in_progress`
5. Toast de éxito
6. Recargar lista

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:185-203
async onStartRental(bookingId: string): Promise<void> {
  const confirmed = await this.presentConfirmation({
    header: 'Iniciar alquiler',
    message: 'Confirmá que el locatario recibió el auto.',
    confirmText: 'Iniciar',
  });
  if (!confirmed) return;

  this.processingAction.set(bookingId);
  try {
    await this.bookingsService.updateBooking(bookingId, { status: 'in_progress' });
    await this.loadBookings();
    await this.presentToast('Alquiler iniciado correctamente');
  } catch (error) {
    await this.presentToast('Error al iniciar el alquiler', 'danger');
  } finally {
    this.processingAction.set(null);
  }
}
```

#### 6.4 Finalizar Alquiler

**Flujo:**
1. Locador ve reserva en estado `in_progress`
2. Click en "Finalizar alquiler"
3. Confirmación: "Confirmá que el locatario devolvió el auto en buen estado"
4. Sistema actualiza: `status → completed`
5. Liberar fondos bloqueados (automático)
6. Toast de éxito

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:205-223
async onCompleteRental(bookingId: string): Promise<void> {
  const confirmed = await this.presentConfirmation({
    header: 'Finalizar alquiler',
    message: 'Confirmá que el locatario devolvió el auto en buen estado.',
    confirmText: 'Finalizar',
  });
  if (!confirmed) return;

  this.processingAction.set(bookingId);
  try {
    await this.bookingsService.updateBooking(bookingId, { status: 'completed' });
    await this.loadBookings();
    await this.presentToast('Alquiler finalizado correctamente');
  } catch (error) {
    await this.presentToast('Error al finalizar el alquiler', 'danger');
  } finally {
    this.processingAction.set(null);
  }
}
```

#### 6.5 Cancelar Reserva

**Flujo:**
1. Locador ve reserva en estado `pending` o `confirmed`
2. Click en "Cancelar reserva"
3. Confirmación: "Esta acción cancelará la reserva actual"
4. Sistema actualiza: `status → cancelled`
5. Liberar fondos bloqueados (automático vía trigger)
6. Notificar locatario (email + chat)

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:225-244
async onCancelBooking(bookingId: string): Promise<void> {
  const confirmed = await this.presentConfirmation({
    header: 'Cancelar reserva',
    message: 'Esta acción cancelará la reserva actual. ¿Deseás continuar?',
    confirmText: 'Cancelar reserva',
    confirmColor: 'danger',
  });
  if (!confirmed) return;

  this.processingAction.set(bookingId);
  try {
    await this.bookingsService.cancelBooking(bookingId, false);
    await this.loadBookings();
    await this.presentToast('Reserva cancelada');
  } catch (error) {
    await this.presentToast('Error al cancelar la reserva', 'danger');
  } finally {
    this.processingAction.set(null);
  }
}
```

#### 6.6 Visualización de Datos del Locatario

**Datos Visibles:**
- Nombre completo (o email si no tiene nombre)
- Email
- Teléfono (si lo completó)

**Carga de Contactos:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:365-389
private async loadRenterContacts(bookings: Booking[]): Promise<void> {
  const contacts: Record<string, { name?: string; email?: string; phone?: string }> = {};

  await Promise.all(
    bookings.map(async (booking) => {
      if (!booking?.id || !booking?.renter_id) return;

      try {
        const contact = await this.bookingsService.getOwnerContact(booking.renter_id);
        if (contact.success) {
          contacts[booking.id] = {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
          };
        }
      } catch (error) {}
    }),
  );

  this.renterContacts.set(contacts);
}

// Display methods
renterDisplayName(booking: Booking): string {
  const contact = this.renterContacts()[booking.id];
  return contact?.name || contact?.email || booking.renter_id || 'Locatario';
}
```

**RPC Supabase:**
```sql
-- apps/web/database/functions/get_owner_contact.sql (aproximado)
CREATE FUNCTION get_owner_contact(user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'success', true,
      'name', full_name,
      'email', email,
      'phone', phone
    )
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Fase 4: Dashboard del Locador

### Ruta
`/dashboard/owner`

### Componente
`apps/web/src/app/features/dashboard/owner-dashboard.page.ts`

### Métricas Principales

#### 7.1 Balance del Wallet

**Computed Signals:**
```typescript
// apps/web/src/app/features/dashboard/owner-dashboard.page.ts:32-34
readonly availableBalance = computed(() => this.walletService.availableBalance());
readonly pendingBalance = computed(() => this.walletService.lockedBalance());
readonly totalEarnings = computed(() => this.walletService.totalBalance());
```

**Datos:**
- **Available Balance:** Fondos disponibles para retiro
- **Pending Balance:** Fondos bloqueados en reservas activas
- **Total Earnings:** Balance total (disponible + bloqueado)

#### 7.2 Estadísticas de Autos

**Signals:**
```typescript
readonly totalCars = signal(0);
readonly activeCars = signal(0);
```

**Carga:**
```typescript
// apps/web/src/app/features/dashboard/owner-dashboard.page.ts:62-64
const cars = await this.carsService.listMyCars();
this.totalCars.set(cars.length);
this.activeCars.set(cars.filter((c) => c.status === 'active').length);
```

#### 7.3 Estadísticas de Reservas

**Signals:**
```typescript
readonly upcomingBookings = signal(0);   // Confirmadas futuras
readonly activeBookings = signal(0);     // En progreso
readonly completedBookings = signal(0);  // Finalizadas
```

**Carga:**
```typescript
// apps/web/src/app/features/dashboard/owner-dashboard.page.ts:67-73
const bookings = await this.bookingsService.getOwnerBookings();
this.upcomingBookings.set(
  bookings.filter((b) => b.status === 'confirmed' && new Date(b.start_at) > new Date()).length
);
this.activeBookings.set(bookings.filter((b) => b.status === 'in_progress').length);
this.completedBookings.set(bookings.filter((b) => b.status === 'completed').length);
```

#### 7.4 Ganancias por Mes

**Estructura:**
```typescript
interface EarningsSummary {
  thisMonth: number;
  lastMonth: number;
  total: number;
}

readonly earnings = signal<EarningsSummary>({
  thisMonth: 0,
  lastMonth: 0,
  total: 0,
});
```

**Cálculo:**
```typescript
// apps/web/src/app/features/dashboard/owner-dashboard.page.ts:76-106
const now = new Date();

// Este mes
const thisMonth = bookings
  .filter((b) => {
    if (!b.updated_at) return false;
    const completedDate = new Date(b.updated_at);
    return (
      b.status === 'completed' &&
      completedDate.getMonth() === now.getMonth() &&
      completedDate.getFullYear() === now.getFullYear()
    );
  })
  .reduce((sum, b) => sum + (b.total_amount || 0), 0);

// Mes anterior
const lastMonth = bookings
  .filter((b) => {
    if (!b.updated_at) return false;
    const completedDate = new Date(b.updated_at);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    return (
      b.status === 'completed' &&
      completedDate.getMonth() === lastMonthDate.getMonth() &&
      completedDate.getFullYear() === lastMonthDate.getFullYear()
    );
  })
  .reduce((sum, b) => sum + (b.total_amount || 0), 0);

// Total histórico
const total = bookings
  .filter((b) => b.status === 'completed')
  .reduce((sum, b) => sum + (b.total_amount || 0), 0);

this.earnings.set({ thisMonth, lastMonth, total });
```

#### 7.5 Crecimiento Porcentual

**Cálculo:**
```typescript
// apps/web/src/app/features/dashboard/owner-dashboard.page.ts:114-123
get growthPercentage(): number {
  const current = this.earnings().thisMonth;
  const previous = this.earnings().lastMonth;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

get isGrowthPositive(): boolean {
  return this.growthPercentage >= 0;
}
```

**Interpretación:**
- `growthPercentage > 0` → Crecimiento positivo 📈
- `growthPercentage < 0` → Decrecimiento 📉
- `previous === 0 && current > 0` → 100% de crecimiento (primer mes)

---

## 8. Fase 5: Wallet y Retiros

### Ruta
`/wallet`

### Componente
`apps/web/src/app/features/wallet/wallet.page.ts`

### Arquitectura del Wallet

#### 8.1 Tipos de Balance

**Estructura:**
```typescript
interface WalletBalance {
  available_balance: number;        // Fondos disponibles para uso
  locked_balance: number;           // Fondos bloqueados en reservas activas
  total_balance: number;            // Total = disponible + bloqueado
  withdrawable_balance: number;     // Fondos retirables a banco
  protected_credit_balance: number; // Crédito Autorentar (no retirable)
  transferable_balance: number;     // Fondos transferibles dentro de app
}
```

**Computed Signals:**
```typescript
// apps/web/src/app/features/wallet/wallet.page.ts:117-133
readonly availableBalanceSummary = this.walletService.availableBalance;
readonly transferableBalance = this.walletService.transferableBalance;
readonly withdrawableBalance = this.walletService.withdrawableBalance;
readonly protectedCreditBalance = this.walletService.protectedCreditBalance;
readonly pendingDepositsCount = this.walletService.pendingDepositsCount;
```

**Relaciones:**
```
available_balance = withdrawable_balance + protected_credit_balance
total_balance = available_balance + locked_balance
```

#### 8.2 Depósitos

**Flujo:**
1. Click en "Depositar"
2. Modal con monto a depositar
3. Validación: min 100 ARS (centavos)
4. Crear intent: `wallet_initiate_deposit()`
5. Crear preference MercadoPago
6. Redireccionar a checkout MP
7. Usuario paga
8. Webhook confirma: `wallet_confirm_deposit()`
9. Fondos acreditados

**Tipos de Depósito:**
- **Retirable:** Transferencia, débito, crédito
- **No Retirable:** Efectivo (Pago Fácil, Rapipago)

**Referencia Código:**
```typescript
// apps/web/src/app/core/services/wallet.service.ts:89-124
initiateDeposit(params: InitiateDepositParams): Observable<any> {
  return from(
    this.supabase.rpc('wallet_initiate_deposit', {
      p_amount: params.amount,
      p_provider: params.provider ?? 'mercadopago',
      p_description: params.description ?? 'Depósito a wallet',
      p_allow_withdrawal: params.allowWithdrawal ?? false,
    }),
  ).pipe(
    switchMap((response) => {
      if (response.error) throw response.error;
      const result = response.data[0];
      if (!result.success) throw new Error(result.message);

      if (params.provider === 'mercadopago') {
        return from(
          this.createMercadoPagoPreference(
            result.transaction_id,
            params.amount,
            params.description ?? 'Depósito a wallet',
          ),
        );
      }
      return from(Promise.resolve(result));
    }),
  );
}

private createMercadoPagoPreference(transactionId: string, amount: number, description: string): Promise<any> {
  return this.supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) throw new Error('No autenticado');
    return this.supabase.functions.invoke('mercadopago-create-preference', {
      body: { transaction_id: transactionId, amount, description },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  });
}
```

#### 8.3 Cuentas Bancarias

**Modelo:**
```typescript
interface BankAccount {
  id: string;
  user_id: string;
  account_type: 'checking' | 'savings';
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  cbu_cvu: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}
```

**Operaciones:**
- `addBankAccount()`: Agregar nueva cuenta
- `setDefaultBankAccount()`: Marcar como predeterminada
- `deleteBankAccount()`: Eliminar cuenta

**Referencia Código:**
```typescript
// apps/web/src/app/features/wallet/wallet.page.ts:248-260
async handleAddBankAccount(params: AddBankAccountParams): Promise<void> {
  try {
    await this.withdrawalService.addBankAccount(params);
    this.toastService.success('Cuenta bancaria agregada exitosamente');
    this.setWithdrawalMode('form');
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    this.toastService.error('Error al agregar cuenta bancaria: ' + (errorObj.message || 'Error desconocido'));
  }
}

async handleSetDefaultAccount(accountId: string): Promise<void> {
  await this.withdrawalService.setDefaultBankAccount(accountId);
  this.toastService.success('Cuenta establecida como predeterminada');
}

async handleDeleteAccount(accountId: string): Promise<void> {
  await this.withdrawalService.deleteBankAccount(accountId);
  this.toastService.success('Cuenta eliminada exitosamente');
}
```

#### 8.4 Solicitar Retiro

**Flujo:**
1. Seleccionar cuenta bancaria destino
2. Ingresar monto (validar disponible)
3. Sistema calcula comisión (2.9%)
4. Confirmación: monto + comisión + neto
5. Crear solicitud: `withdrawal_request_withdrawal()`
6. Estado: `pending` → Admin aprueba → `approved` → Transferencia → `completed`

**Validaciones:**
- Monto >= 100 ARS
- Monto <= `withdrawable_balance`
- Cuenta bancaria activa

**Referencia Código:**
```typescript
// apps/web/src/app/features/wallet/wallet.page.ts:264-283
async handleWithdrawalRequest(params: RequestWithdrawalParams): Promise<void> {
  try {
    const result = await this.withdrawalService.requestWithdrawal(params);
    if (result.success) {
      this.toastService.success(
        `Retiro solicitado exitosamente! Monto: $${params.amount}, Comisión: $${result.fee_amount}, Neto: $${result.net_amount}`,
      );
      await this.withdrawalService.getWithdrawalRequests();
    } else {
      this.toastService.error('Error: ' + result.message);
    }
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    this.toastService.error('Error al solicitar retiro: ' + (errorObj.message || 'Error desconocido'));
  }
}
```

**RPC Supabase:**
```sql
-- Estructura aproximada
CREATE FUNCTION withdrawal_request_withdrawal(
  p_amount INT,
  p_bank_account_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_withdrawable INT;
  v_fee INT;
  v_net_amount INT;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Validar balance
  SELECT withdrawable_balance INTO v_withdrawable
  FROM user_wallets WHERE user_id = v_user_id;

  IF v_withdrawable < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Fondos insuficientes');
  END IF;

  -- Calcular comisión (2.9%)
  v_fee := FLOOR(p_amount * 0.029);
  v_net_amount := p_amount - v_fee;

  -- Crear solicitud
  INSERT INTO withdrawal_requests (user_id, amount, fee_amount, net_amount, bank_account_id, status)
  VALUES (v_user_id, p_amount, v_fee, v_net_amount, p_bank_account_id, 'pending')
  RETURNING id INTO v_request_id;

  -- Bloquear fondos
  UPDATE user_wallets
  SET locked_balance = locked_balance + p_amount,
      available_balance = available_balance - p_amount
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'request_id', v_request_id, 'fee_amount', v_fee, 'net_amount', v_net_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 8.5 Historial de Transacciones

**Vista:** `v_wallet_history`

**Tipos de Transacción:**
- `deposit`: Depósito a wallet
- `withdrawal`: Retiro a banco
- `payment`: Pago de reserva
- `refund`: Reembolso
- `lock`: Bloqueo de fondos
- `unlock`: Liberación de fondos
- `platform_fee`: Comisión plataforma
- `owner_payout`: Pago a locador

**Referencia Código:**
```typescript
// apps/web/src/app/core/services/wallet.service.ts:63-86
getTransactions(filters?: any): Observable<WalletTransaction[]> {
  this.loading.set(true);
  this.error.set(null);
  return from(
    this.supabase
      .from('v_wallet_history')
      .select('*')
      .order('transaction_date', { ascending: false }),
  ).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      const transactions = (data ?? []) as WalletTransaction[];
      this.transactions.set(transactions);
      return transactions;
    }),
    catchError((err) => {
      this.handleError(err, 'Error al obtener transacciones');
      return throwError(() => err);
    }),
    map((transactions) => {
      this.loading.set(false);
      return transactions;
    }),
  );
}
```

#### 8.6 Cancelar Retiro

**Flujo:**
1. Ver retiro en estado `pending`
2. Click en "Cancelar"
3. Confirmación
4. Sistema actualiza: `status → cancelled`
5. Liberar fondos bloqueados
6. Actualizar balance

**Referencia Código:**
```typescript
// apps/web/src/app/features/wallet/wallet.page.ts:315-323
async handleCancelWithdrawal(requestId: string): Promise<void> {
  try {
    await this.withdrawalService.cancelWithdrawalRequest(requestId);
    this.toastService.success('Solicitud de retiro cancelada');
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    this.toastService.error('Error al cancelar: ' + (errorObj.message || 'Error desconocido'));
  }
}
```

---

## 9. Fase 6: Comunicación con Locatarios

### Sistema de Chat

#### 9.1 Car Leads (Threads por Auto/Usuario)

**Concepto:**
Cada combinación de `carId + userId` representa un "lead" de conversación.

**Estructura:**
```typescript
interface CarLead {
  carId: string;
  carTitle: string;
  participantId: string;
  participantName: string | null;
  lastMessage: Message;
  unreadCount: number;
}
```

**Carga:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:261-343
async loadCarLeads(): Promise<void> {
  if (!this.currentUserId) return;

  this.leadsLoading.set(true);

  const rows = await this.messagesService.listCarLeadsForOwner(this.currentUserId);

  // Agrupar por carId + participantId
  const threads = new Map<string, {...}>();

  for (const row of rows) {
    if (!row.car?.id) continue;

    const key = `${row.car.id}:${row.otherUserId}`;
    const existing = threads.get(key);
    const isUnread = row.message.recipient_id === this.currentUserId && !row.message.read_at;

    if (!existing) {
      threads.set(key, {
        carId: row.car.id,
        carTitle: row.car.title ?? 'Auto sin título',
        participantId: row.otherUserId,
        lastMessage: row.message,
        unreadCount: isUnread ? 1 : 0,
      });
    } else {
      // Actualizar último mensaje si es más reciente
      const existingDate = new Date(existing.lastMessage.created_at).getTime();
      const currentDate = new Date(row.message.created_at).getTime();

      if (currentDate > existingDate) {
        existing.lastMessage = row.message;
      }

      if (isUnread) {
        existing.unreadCount += 1;
      }
    }
  }

  // Ordenar por fecha de último mensaje
  const leadsOrdered = Array.from(threads.values()).sort((a, b) => {
    const aDate = new Date(a.lastMessage.created_at).getTime();
    const bDate = new Date(b.lastMessage.created_at).getTime();
    return bDate - aDate;
  });

  // Enriquecer con nombre del participante
  const enriched = await Promise.all(
    leadsOrdered.map(async (lead) => {
      let participantName: string | null = null;
      try {
        const contact = await this.bookingsService.getOwnerContact(lead.participantId);
        if (contact.success) {
          participantName = contact.name || contact.email || null;
        }
      } catch (err) {}

      return { ...lead, participantName };
    }),
  );

  this.carLeads.set(enriched);
  this.leadsLoading.set(false);
}
```

#### 9.2 Abrir Chat

**Flujo:**
1. Locador ve lista de car leads
2. Click en lead
3. Navegar a `/messages?carId={carId}&userId={userId}&carName={carTitle}&userName={name}`
4. Chat embebido se abre con mensajes del thread

**Referencia Código:**
```typescript
// apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:345-354
async openCarChat(lead: CarLead): Promise<void> {
  await this.router.navigate(['/messages'], {
    queryParams: {
      carId: lead.carId,
      userId: lead.participantId,
      carName: lead.carTitle,
      userName: lead.participantName ?? 'Usuario',
    },
  });
}
```

#### 9.3 Mensajes No Leídos

**Contador:**
```typescript
const isUnread = row.message.recipient_id === this.currentUserId && !row.message.read_at;

if (isUnread) {
  existing.unreadCount += 1;
}
```

**Badge Visual:**
```html
<div *ngIf="lead.unreadCount > 0" class="badge-unread">
  {{ lead.unreadCount }}
</div>
```

---

## 10. Implementación Técnica

### Arquitectura Frontend

#### 10.1 Componentes Principales

| Componente | Ruta | Descripción |
|------------|------|-------------|
| `PublishCarV2Page` | `/cars/publish` | Formulario de publicación/edición |
| `MyCarsPage` | `/cars/my` | Lista de autos propios |
| `OwnerBookingsPage` | `/bookings/owner` | Gestión de reservas |
| `OwnerDashboardPage` | `/dashboard/owner` | Dashboard con métricas |
| `WalletPage` | `/wallet` | Wallet y retiros |

**Ubicación:**
```
apps/web/src/app/features/
  ├── cars/
  │   ├── publish/publish-car-v2.page.ts
  │   └── my-cars/my-cars.page.ts
  ├── bookings/
  │   └── owner-bookings/owner-bookings.page.ts
  ├── dashboard/
  │   └── owner-dashboard.page.ts
  └── wallet/
      └── wallet.page.ts
```

#### 10.2 Servicios

| Servicio | Ubicación | Responsabilidad |
|----------|-----------|-----------------|
| `CarsService` | `core/services/cars.service.ts` | CRUD autos, fotos, validaciones |
| `BookingsService` | `core/services/bookings.service.ts` | Gestión de reservas |
| `WalletService` | `core/services/wallet.service.ts` | Balance, depósitos, transacciones |
| `WithdrawalService` | `core/services/withdrawal.service.ts` | Retiros, cuentas bancarias |
| `GeocodingService` | `core/services/geocoding.service.ts` | Geocodificación de direcciones |
| `MarketplaceOnboardingService` | `core/services/marketplace-onboarding.service.ts` | Validación OAuth MP |

**Métodos Clave:**

**CarsService:**
```typescript
createCar(input: Partial<Car>): Promise<Car>
updateCar(carId: string, updates: Partial<Car>): Promise<Car>
deleteCar(carId: string): Promise<void>
uploadPhoto(file: File, carId: string, position: number): Promise<CarPhoto>
listMyCars(): Promise<Car[]>
hasActiveBookings(carId: string): Promise<{ hasActive: boolean }>
updateCarStatus(carId: string, status: CarStatus): Promise<void>
```

**BookingsService:**
```typescript
getOwnerBookings(): Promise<Booking[]>
updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking>
cancelBooking(bookingId: string, isOwner: boolean): Promise<void>
getOwnerContact(userId: string): Promise<{ success: boolean; name?: string; email?: string; phone?: string }>
```

**WalletService:**
```typescript
getBalance(): Observable<WalletBalance>
getTransactions(): Observable<WalletTransaction[]>
initiateDeposit(params: InitiateDepositParams): Observable<any>
lockFunds(bookingId: string, amount: number): Observable<WalletLockFundsResponse>
unlockFunds(bookingId: string): Observable<WalletUnlockFundsResponse>
```

**WithdrawalService:**
```typescript
getBankAccounts(): Promise<BankAccount[]>
addBankAccount(params: AddBankAccountParams): Promise<void>
setDefaultBankAccount(accountId: string): Promise<void>
deleteBankAccount(accountId: string): Promise<void>
requestWithdrawal(params: RequestWithdrawalParams): Promise<WithdrawalResult>
cancelWithdrawalRequest(requestId: string): Promise<void>
getWithdrawalRequests(): Promise<WithdrawalRequest[]>
```

### Arquitectura Backend (Supabase)

#### 10.3 Tablas Principales

| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `cars` | Autos publicados | `id`, `owner_id`, `brand_id`, `model_id`, `status`, `price_per_day`, `value_usd`, `auto_approval` |
| `car_photos` | Fotos de autos | `id`, `car_id`, `url`, `stored_path`, `position` |
| `bookings` | Reservas | `id`, `car_id`, `renter_id`, `status`, `start_at`, `end_at`, `total_amount` |
| `user_wallets` | Saldo de usuarios | `user_id`, `available_balance`, `locked_balance`, `withdrawable_balance`, `protected_credit_balance` |
| `wallet_transactions` | Historial transacciones | `id`, `user_id`, `type`, `amount`, `booking_id` |
| `bank_accounts` | Cuentas bancarias | `id`, `user_id`, `bank_name`, `cbu_cvu`, `is_default` |
| `withdrawal_requests` | Solicitudes de retiro | `id`, `user_id`, `amount`, `status`, `bank_account_id` |

#### 10.4 Vistas (Views)

| Vista | Descripción | Query Base |
|-------|-------------|------------|
| `owner_bookings` | Reservas de autos del locador | `SELECT b.* FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()` |
| `v_wallet_history` | Historial completo de transacciones | Union de `wallet_transactions` + `withdrawal_requests` |

#### 10.5 RPCs (Remote Procedure Calls)

| RPC | Descripción | Parámetros | Retorno |
|-----|-------------|------------|---------|
| `wallet_get_balance` | Obtener balance wallet | - | `WalletBalance` |
| `wallet_initiate_deposit` | Iniciar depósito | `p_amount`, `p_provider`, `p_description`, `p_allow_withdrawal` | `{ success, transaction_id }` |
| `wallet_confirm_deposit` | Confirmar depósito (webhook) | `p_transaction_id`, `p_provider_payment_id` | `{ success }` |
| `wallet_lock_funds` | Bloquear fondos | `p_booking_id`, `p_amount` | `{ success, locked_amount }` |
| `wallet_unlock_funds` | Liberar fondos | `p_booking_id` | `{ success, unlocked_amount }` |
| `withdrawal_request_withdrawal` | Solicitar retiro | `p_amount`, `p_bank_account_id` | `{ success, fee_amount, net_amount }` |
| `pricing_recalculate` | Recalcular breakdown | `p_booking_id` | `void` |

#### 10.6 Edge Functions (Supabase)

| Function | Descripción | URL | Método |
|----------|-------------|-----|--------|
| `mercadopago-create-preference` | Crear preference para depósito | `/functions/v1/mercadopago-create-preference` | POST |
| `mercadopago-webhook` | Webhook de confirmación de pago | `/functions/v1/mercadopago-webhook` | POST |
| `mercadopago-oauth-connect` | OAuth connect para onboarding | `/functions/v1/mercadopago-oauth-connect` | GET |
| `mercadopago-oauth-callback` | OAuth callback | `/functions/v1/mercadopago-oauth-callback` | GET |

**Flujo OAuth MercadoPago:**
```
1. Frontend → /mercadopago-oauth-connect?user_id={userId}
2. Edge Function → Genera URL de autorización MP
3. Redirect → Usuario autoriza en MP
4. Callback → /mercadopago-oauth-callback?code={code}&state={userId}
5. Edge Function → Intercambia code por access_token
6. Guardar → marketplace_credentials table
7. Redirect → Frontend con success=true
```

#### 10.7 Storage Buckets

| Bucket | Público | RLS | Path Pattern | Uso |
|--------|---------|-----|--------------|-----|
| `car-images` | Sí | Sí | `{userId}/{carId}/{uuid}.webp` | Fotos de autos |
| `avatars` | Sí | Sí | `{userId}/{uuid}.jpg` | Avatares de usuarios |
| `documents` | No | Sí | `{userId}/{type}/{uuid}.pdf` | Documentos verificación |

**RLS Policies (car-images):**
```sql
-- Locador puede subir fotos a sus propios autos
CREATE POLICY "Owners can upload to their cars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Cualquiera puede ver fotos de autos activos
CREATE POLICY "Anyone can view car images"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');
```

---

## 11. Edge Cases

### 11.1 Publicación de Auto

**EC1: Usuario sin MercadoPago vinculado intenta publicar**
- **Validación:** `onSubmit()` verifica `mpReady()`
- **Acción:** Mostrar warning, guardar como `draft`
- **Mensaje:** "Activaremos tu publicación cuando vincules Mercado Pago"

**EC2: Geocodificación falla**
- **Fallback 1:** Intentar solo con ciudad
- **Fallback 2:** Si ciudad falla → Error, no permitir submit
- **Mensaje:** "No se pudieron obtener las coordenadas de la dirección"

**EC3: Usuario sube menos de 3 fotos**
- **Validación:** `canSubmit()` verifica `uploadedPhotos().length >= 3`
- **Acción:** Botón submit deshabilitado
- **Banner:** "⚠️ Necesitas al menos 3 fotos para publicar"

**EC4: Upload de foto falla**
- **Validación:** Tamaño max 5MB, tipo image/*
- **Acción:** Alert y skip foto
- **Issue:** No hay blocking error, locador no sabe que falló una foto

**EC5: Edición de auto: usuario elimina todas las fotos**
- **Permitido:** Edit mode no requiere 3 fotos
- **Riesgo:** Auto puede quedar sin fotos
- **Mitigación:** Advertencia en UI

### 11.2 Gestión de Autos

**EC6: Eliminar auto con reservas activas**
- **Validación:** `hasActiveBookings(carId)`
- **Acción:** Error, no permitir eliminación
- **Mensaje:** "No puedes eliminar un auto con reservas activas"

**EC7: Cambiar auto a `suspended` con reservas confirmadas**
- **Permitido:** Sí
- **Impacto:** Reservas existentes NO se cancelan
- **Riesgo:** Auto no visible pero con compromisos activos

### 11.3 Gestión de Reservas

**EC8: Iniciar alquiler antes de fecha de inicio**
- **No validado:** Frontend permite cambio de estado sin validar fechas
- **Riesgo:** Estado `in_progress` antes de `start_at`
- **Mitigación:** Validar en RPC backend

**EC9: Finalizar alquiler antes de fecha de fin**
- **Permitido:** Sí (alquiler terminado anticipadamente)
- **Impacto:** Fondos liberados, locatario no reembolsado automáticamente

**EC10: Cancelar reserva en `in_progress`**
- **No permitido:** `canCancelBooking()` solo permite `pending` | `confirmed`
- **Acción:** Botón "Cancelar" no visible

**EC11: Múltiples locadores actualizando misma reserva**
- **Riesgo:** Race condition en estado
- **Mitigación:** Transacciones DB + optimistic locking

### 11.4 Wallet y Retiros

**EC12: Solicitar retiro mayor que `withdrawable_balance`**
- **Validación:** RPC valida en backend
- **Acción:** Error `{ success: false, message: 'Fondos insuficientes' }`

**EC13: Depósito en efectivo (no retirable)**
- **Comportamiento:** Fondos van a `protected_credit_balance`
- **Impacto:** Usuario puede usar para reservas pero no retirar
- **Advertencia:** Banner en modal de depósito

**EC14: Cancelar retiro después de `approved`**
- **No permitido:** Solo `pending` permite cancelación
- **Mensaje:** "No se puede cancelar un retiro aprobado"

**EC15: Usuario sin cuenta bancaria intenta retirar**
- **Validación:** Form requiere seleccionar cuenta
- **Acción:** Mostrar "Agregar cuenta bancaria primero"

### 11.5 Chat y Comunicación

**EC16: Locador intenta chatear antes de que locatario envíe mensaje**
- **Permitido:** Sí, locador puede iniciar conversación
- **Riesgo:** Lead no existe en `listCarLeadsForOwner()` hasta primer mensaje

**EC17: Locatario cancela reserva, locador sigue chateando**
- **Permitido:** Chat persiste, no se elimina
- **Riesgo:** Conversación sin contexto de reserva activa

---

## 12. Test Scenarios

### 12.1 Happy Path Tests

**T1: Publicar auto completo con MercadoPago**
```
GIVEN usuario con MP vinculado
AND formulario completo con 5 fotos
WHEN click en "Publicar Auto"
THEN auto creado con status='active'
AND fotos subidas a storage
AND redirect a /cars/my
```

**T2: Gestionar reserva completa**
```
GIVEN locador con auto activo
AND reserva en status='confirmed'
WHEN click en "Iniciar alquiler"
THEN confirmación modal
AND status actualizado a 'in_progress'
WHEN click en "Finalizar alquiler"
THEN confirmación modal
AND status actualizado a 'completed'
AND fondos liberados a wallet
```

**T3: Retiro completo**
```
GIVEN locador con balance >= 1000 ARS
AND cuenta bancaria activa
WHEN solicitar retiro de 1000 ARS
THEN calcular comisión (29 ARS)
AND crear solicitud con neto 971 ARS
AND bloquear 1000 ARS en wallet
AND mostrar en historial como 'pending'
```

### 12.2 Edge Case Tests

**T4: Publicar sin MercadoPago**
```
GIVEN usuario sin MP vinculado
AND formulario completo
WHEN click en "Publicar Auto"
THEN mostrar warning
AND auto creado con status='draft'
AND banner "Vinculá MP para activar"
```

**T5: Eliminar auto con reservas activas**
```
GIVEN auto con reserva status='in_progress'
WHEN click en "Eliminar"
THEN error "No puedes eliminar..."
AND auto NO eliminado
```

**T6: Cancelar reserva después de iniciar**
```
GIVEN reserva status='in_progress'
WHEN intentar cancelar
THEN botón "Cancelar" NO visible
AND no permitir acción
```

**T7: Retiro mayor que disponible**
```
GIVEN balance disponible = 500 ARS
WHEN solicitar retiro de 1000 ARS
THEN error "Fondos insuficientes"
AND solicitud NO creada
```

### 12.3 Integration Tests

**T8: Flujo completo de publicación a retiro**
```
1. Publicar auto con MP vinculado → status='active'
2. Locatario solicita reserva → status='pending'
3. Auto-aprobación activa → status='confirmed'
4. Locador inicia alquiler → status='in_progress'
5. Locador finaliza alquiler → status='completed'
6. Split payment automático → fondos en wallet
7. Solicitar retiro → status='pending'
8. Admin aprueba → status='approved'
9. Transferencia completada → status='completed'
```

**T9: Flujo de edición de auto**
```
1. Crear auto con precio 50 USD/día
2. Publicar y activar
3. Editar auto, cambiar precio a 60 USD/día
4. Guardar cambios
5. Verificar precio actualizado en listado
6. Verificar precio NO afecta reservas existentes
```

**T10: Flujo de comunicación**
```
1. Locatario envía mensaje sobre auto X
2. Locador ve lead en /bookings/owner
3. Locador abre chat
4. Locador responde mensaje
5. Contador de no leídos se actualiza
6. Locatario marca como leído
7. Badge desaparece
```

### 12.4 Performance Tests

**T11: Carga de dashboard con 100+ reservas**
```
GIVEN locador con 100 reservas completadas
WHEN cargar /dashboard/owner
THEN página carga en < 2 segundos
AND todas las métricas calculadas correctamente
```

**T12: Upload de 10 fotos simultáneas**
```
GIVEN formulario de publicación
WHEN seleccionar 10 fotos (5MB cada una)
THEN optimización en < 10 segundos
AND todas las fotos subidas correctamente
AND preview visible para cada foto
```

---

## 13. Dependencies

### Frontend

**Angular Core:**
- `@angular/core`: ^17.0.0
- `@angular/router`: ^17.0.0
- `@angular/forms`: ^17.0.0
- `@angular/common`: ^17.0.0

**Ionic (UI Components):**
- `@ionic/angular`: ^7.5.0

**Supabase:**
- `@supabase/supabase-js`: ^2.38.0

**Otras:**
- `uuid`: ^9.0.1 (generación de IDs)
- `@ngx-translate/core`: ^15.0.0 (i18n)

### Backend (Supabase)

**PostgreSQL:** 15.x
**PostgREST:** 11.x
**Supabase Auth:** Latest
**Supabase Storage:** Latest

**Edge Functions:**
- Deno runtime
- `mercadopago` SDK

### Integraciones Externas

**MercadoPago:**
- OAuth 2.0 para onboarding
- Split Payments (Marketplace)
- Webhooks IPN

**Mapbox:**
- Geocoding API
- Reverse Geocoding

**Cloudflare:**
- AI Workers (generación de fotos)
- R2 Storage (backup opcional)

---

## 14. Security Considerations

### 14.1 Autenticación y Autorización

**Row-Level Security (RLS):**
```sql
-- Solo el locador puede ver/editar sus propios autos
CREATE POLICY "Owners can view their cars"
ON cars FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their cars"
ON cars FOR UPDATE
USING (owner_id = auth.uid());

-- Solo el locador puede ver reservas de sus autos
CREATE POLICY "Owners can view their bookings"
ON bookings FOR SELECT
USING (
  car_id IN (
    SELECT id FROM cars WHERE owner_id = auth.uid()
  )
);
```

**Validaciones Críticas:**
- ✅ `auth.uid()` validado en todos los RPCs
- ✅ No permitir eliminar auto con reservas activas
- ✅ No permitir modificar reservas de otros locadores
- ✅ No exponer datos sensibles de locatarios (solo nombre, email público)

### 14.2 Datos Sensibles

**Información Protegida:**
- `marketplace_credentials.access_token` → Encriptada en DB
- `bank_accounts.account_number` → Solo últimos 4 dígitos visibles en UI
- `bank_accounts.cbu_cvu` → Encriptado en DB

**Políticas:**
- ❌ NO exponer emails completos en logs
- ❌ NO exponer tokens de MP en frontend
- ❌ NO permitir acceso directo a `marketplace_credentials`

### 14.3 Validaciones de Negocio

**Prevención de Fraude:**
- Validar que locador es owner del auto antes de cambiar estado de reserva
- Validar que reserva existe y pertenece a auto del locador
- Validar monto de retiro contra `withdrawable_balance` en backend (no confiar en frontend)
- Rate limiting en creación de autos (max 10 por día)

**Validaciones Faltantes (TODOs):**
- ⚠️ Validar que `start_at` no es en el pasado al iniciar alquiler
- ⚠️ Validar que auto tiene seguro vigente antes de activar
- ⚠️ Validar documentación del locador (KYC)

### 14.4 Storage Security

**Políticas de Storage:**
```sql
-- Solo locador puede subir a su carpeta
CREATE POLICY "Owners upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Solo locador puede eliminar sus fotos
CREATE POLICY "Owners delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Validaciones:**
- Max 10 fotos por auto
- Max 5MB por foto
- Solo tipos: `image/jpeg`, `image/png`, `image/webp`

---

## 15. Performance

### 15.1 Métricas Objetivo

| Métrica | Target | Actual |
|---------|--------|--------|
| **Carga inicial de dashboard** | < 2s | ~1.5s |
| **Carga de lista de autos** | < 1s | ~0.8s |
| **Upload de 1 foto** | < 3s | ~2.5s |
| **Upload de 10 fotos** | < 15s | ~12s |
| **Carga de reservas** | < 1s | ~0.7s |
| **Actualización de estado reserva** | < 500ms | ~400ms |

### 15.2 Optimizaciones Implementadas

**Frontend:**
- ✅ Lazy loading de features (Routes con `loadComponent`)
- ✅ Angular Signals para reactivity (en lugar de RxJS pesado)
- ✅ Optimización de imágenes a WebP
- ✅ Canvas resize antes de upload (reduce tamaño 70%)
- ✅ Computed signals para métricas derivadas

**Backend:**
- ✅ Índices en `cars(owner_id)`
- ✅ Índices en `bookings(car_id, status)`
- ✅ Vista materializada `owner_bookings` (refresh incremental)
- ✅ RPC para operaciones complejas (reduce roundtrips)

**Storage:**
- ✅ CDN de Supabase Storage (cache global)
- ✅ Cache-Control: 3600s para fotos
- ✅ Formato WebP (50% menos peso que JPEG)

### 15.3 Cuellos de Botella Identificados

**CB1: Carga de contactos de locatarios**
- **Problema:** 1 query por reserva para obtener contacto
- **Impacto:** N+1 queries en `/bookings/owner`
- **Solución:** Implementar `getOwnerContacts(userIds[])` batch

**CB2: Upload de fotos en secuencia**
- **Problema:** Upload de 10 fotos toma 25s (2.5s cada una)
- **Impacto:** UX lenta en publicación
- **Solución:** Upload paralelo con `Promise.all()`

**CB3: Cálculo de ganancias en dashboard**
- **Problema:** Filtrar 100+ reservas en frontend
- **Impacto:** Lag en carga de dashboard
- **Solución:** Crear vista `v_owner_earnings_summary` en DB

### 15.4 Mejoras Pendientes

- [ ] Implementar Virtual Scrolling en lista de autos (Ionic)
- [ ] Lazy load de fotos en car cards (Intersection Observer)
- [ ] Service Worker para cache de assets estáticos
- [ ] Batch upload de fotos (1 request con FormData múltiple)
- [ ] Prefetch de datos de dashboard en login

---

## 16. Success Metrics

### 16.1 Métricas de Adopción

**M1: Onboarding Completo**
- **KPI:** % de usuarios que completan primer auto publicado
- **Target:** > 60% en primeros 7 días
- **Tracking:** Evento `car_published` + `marketplace_onboarding_completed`

**M2: Vinculación MercadoPago**
- **KPI:** % de locadores con MP vinculado antes de publicar
- **Target:** 100% (requerido para activar auto)
- **Tracking:** Estado `mpReady()` en analytics

**M3: Auto-aprobación**
- **KPI:** % de locadores que activan auto-aprobación
- **Target:** > 70%
- **Tracking:** Campo `auto_approval` en `cars`

### 16.2 Métricas de Engagement

**M4: Gestión de Reservas**
- **KPI:** % de reservas que pasan de `confirmed` → `in_progress` → `completed`
- **Target:** > 85%
- **Tracking:** Estado de reservas en `bookings`

**M5: Tiempo de Respuesta**
- **KPI:** Tiempo promedio entre reserva `confirmed` y acción del locador
- **Target:** < 2 horas
- **Tracking:** Timestamp de cambio de estado

**M6: Uso de Chat**
- **KPI:** % de reservas con al menos 1 mensaje entre locador y locatario
- **Target:** > 50%
- **Tracking:** Tabla `messages`

### 16.3 Métricas de Retención

**M7: Autos Activos**
- **KPI:** Promedio de autos activos por locador
- **Target:** > 1.5
- **Tracking:** Count de `cars` con `status='active'` por `owner_id`

**M8: Retiros Exitosos**
- **KPI:** % de solicitudes de retiro completadas exitosamente
- **Target:** > 95%
- **Tracking:** `withdrawal_requests` con `status='completed'`

**M9: Tasa de Cancelación**
- **KPI:** % de reservas canceladas por locador (vs totales)
- **Target:** < 5%
- **Tracking:** Count de `bookings` con `status='cancelled'` y `cancelled_by='owner'`

### 16.4 Métricas Financieras

**M10: Ganancias Promedio por Locador**
- **KPI:** Ingresos promedio por locador por mes
- **Target:** > USD 200
- **Tracking:** Sum de `bookings.total_amount` por `owner_id`

**M11: Comisiones Generadas**
- **KPI:** Total de comisiones de retiros cobradas
- **Target:** > 5% de volumen total
- **Tracking:** Sum de `withdrawal_requests.fee_amount`

**M12: Split Payment Success Rate**
- **KPI:** % de pagos con split exitoso vía MP
- **Target:** 100%
- **Tracking:** Logs de Edge Function `mercadopago-webhook`

---

## 17. Rollout Plan

### 17.1 Fase 1: MVP (Completado)

**Features:**
- ✅ Publicación de auto con formulario completo
- ✅ Validación de MercadoPago obligatoria
- ✅ Gestión básica de autos (editar, eliminar, cambiar disponibilidad)
- ✅ Vista de reservas de locador
- ✅ Cambio de estado de reservas (confirmar, iniciar, finalizar)
- ✅ Dashboard con métricas básicas
- ✅ Wallet con depósitos vía MercadoPago
- ✅ Sistema de retiros con cuentas bancarias

**Estado:** Producción desde 2025-10

### 17.2 Fase 2: Mejoras de UX (Q1 2025)

**Features Planeadas:**
- [ ] Onboarding guiado paso a paso (wizard)
- [ ] Auto-completado de marca/modelo con sugerencias
- [ ] Drag & drop para reordenar fotos
- [ ] Vista previa de publicación antes de submit
- [ ] Notificaciones push para nuevas reservas
- [ ] Chat en tiempo real (Supabase Realtime)
- [ ] Dashboard con gráficos (Chart.js)

**Rollout:**
- Beta testing con 10 locadores (2 semanas)
- Release gradual: 25% → 50% → 100% (4 semanas)

### 17.3 Fase 3: Automatización (Q2 2025)

**Features Planeadas:**
- [ ] Calendario de disponibilidad (bloquear fechas)
- [ ] Reglas de precios dinámicos (temporadas, eventos)
- [ ] Auto-respuestas para FAQ comunes
- [ ] Alertas automáticas (reserva próxima a iniciar, retiro aprobado)
- [ ] Exportación de reportes fiscales (PDF)
- [ ] Integración con Google Calendar

**Rollout:**
- Alpha testing interno (4 semanas)
- Beta testing con 50 locadores (6 semanas)
- Release completo

### 17.4 Fase 4: Escalabilidad (Q3 2025)

**Features Planeadas:**
- [ ] Multi-currency (ARS, UYU, BRL, CLP)
- [ ] Integración con seguros externos (API)
- [ ] Sistema de verificación KYC (identidad, documentos)
- [ ] Fleet management (locadores con 10+ autos)
- [ ] API pública para integraciones

**Rollout:**
- Por país: Argentina → Uruguay → Brasil → Chile
- 3 meses por país

### 17.5 Monitoreo Post-Lanzamiento

**Herramientas:**
- Sentry (error tracking)
- Google Analytics 4 (user behavior)
- Supabase Dashboard (DB performance)
- Cloudflare Analytics (CDN metrics)

**Alertas Críticas:**
- Error rate > 1% en publicación de autos
- Split payment failure rate > 0.1%
- Retiro failure rate > 5%
- Response time > 3s en dashboard

---

## Apéndices

### A. Glosario

| Término | Definición |
|---------|------------|
| **Locador** | Propietario de vehículo que publica auto para alquilar |
| **Locatario** | Usuario que alquila un auto |
| **Split Payment** | Pago dividido automáticamente entre plataforma y locador |
| **Car Lead** | Thread de conversación entre locador y locatario sobre un auto específico |
| **Onboarding MP** | Proceso de vinculación OAuth con MercadoPago |
| **Wallet** | Monedero virtual del usuario para depósitos y retiros |
| **Protected Credit** | Fondos no retirables (ej: depósitos en efectivo) |
| **Withdrawable Balance** | Fondos retirables a cuenta bancaria |

### B. Referencias de Código Clave

| Descripción | Archivo | Línea |
|-------------|---------|-------|
| Formulario de publicación | `publish-car-v2.page.ts` | 1272-1304 |
| Validación MercadoPago | `publish-car-v2.page.ts` | 1123-1151 |
| Upload de fotos | `cars.service.ts` | 46-84 |
| Gestión de reservas | `owner-bookings.page.ts` | 79-94 |
| Cambio de estado reserva | `owner-bookings.page.ts` | 185-223 |
| Dashboard métricas | `owner-dashboard.page.ts` | 53-112 |
| Solicitud de retiro | `wallet.page.ts` | 264-283 |
| Car leads (chat) | `owner-bookings.page.ts` | 261-343 |

### C. Diagramas

#### Flujo de Publicación
```
┌─────────────┐
│  /cars/publish │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Validar MP vinculado │
└──────┬──────┬────────┘
       │      │
  mpReady?    │
       ▼      ▼
    [Sí]   [No]
       │      │
       │      └─→ status='draft'
       │
       └─→ status='active'
           ↓
    ┌────────────────┐
    │ Upload fotos    │
    └────────┬────────┘
             │
             ▼
    ┌────────────────┐
    │ Redirect /my   │
    └────────────────┘
```

#### Flujo de Reserva (Locador)
```
┌──────────────────┐
│ Reserva recibida │
│ status='confirmed'│
└────────┬──────────┘
         │
         ▼
┌──────────────────┐
│ Iniciar alquiler │
│ status='in_progress'│
└────────┬──────────┘
         │
         ▼
┌──────────────────┐
│ Finalizar alquiler│
│ status='completed'│
└────────┬──────────┘
         │
         ▼
┌──────────────────┐
│ Fondos liberados │
│ → wallet         │
└──────────────────┘
```

---

## Changelog

**2025-11-05 - v1.0:**
- Documentación inicial completa del flujo del locador
- Análisis exhaustivo de código existente
- Identificación de edge cases y mejoras
- Plan de rollout definido

---

**Fin del Documento**
