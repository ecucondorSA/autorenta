# Flujo Completo de Contratación - AutoRenta

**Versión**: 1.0.0
**Fecha**: 2025-11-16
**Autor**: Sistema AutoRenta

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Estados del Booking](#estados-del-booking)
3. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
4. [Check-In y Check-Out](#check-in-y-check-out)
5. [Sistema de Reseñas](#sistema-de-reseñas)
6. [Cálculo de Ganancias](#cálculo-de-ganancias)
7. [Estadísticas y Analytics](#estadísticas-y-analytics)
8. [Seguros y Documentos](#seguros-y-documentos)
9. [Diagramas de Flujo](#diagramas-de-flujo)

---

## 🎯 Visión General

El flujo de contratación de AutoRenta es un proceso completo que abarca desde la solicitud de reserva hasta la finalización con reseñas, incluyendo:

- ✅ **Gestión de estados** del booking (pending → confirmed → in_progress → completed)
- ✅ **Check-in y Check-out** con inspecciones detalladas (FGO - Fine-Grained Observations)
- ✅ **Sistema de reseñas** bidireccional (locador ↔ locatario)
- ✅ **Cálculo automático** de ganancias para el locador (85% split)
- ✅ **Estadísticas en tiempo real** para ambos roles
- ✅ **Seguros P2P** y gestión de documentos

---

## 🔄 Estados del Booking

### Estados Principales

```typescript
type BookingStatus =
  | 'pending'      // Esperando aprobación del dueño
  | 'confirmed'    // Confirmada, pago aprobado
  | 'in_progress'  // En curso (auto entregado)
  | 'completed'    // Completada exitosamente
  | 'cancelled'    // Cancelada
  | 'expired'      // Expirada (no pagada a tiempo)
```

### Transiciones de Estado

```
┌─────────┐
│ pending │ ← Solicitud inicial
└────┬────┘
     │
     ├─→ [Owner Rejects] → cancelled
     │
     ├─→ [Owner Approves + Payment] → confirmed
     │
     └─→ [Payment Timeout] → expired

┌───────────┐
│ confirmed │ ← Pago completado
└─────┬─────┘
      │
      ├─→ [Owner Check-In] → in_progress
      │
      └─→ [Cancellation] → cancelled

┌──────────────┐
│ in_progress  │ ← Alquiler activo
└──────┬───────┘
       │
       ├─→ [Renter Check-Out] → completed
       │
       └─→ [Early Return] → completed

┌───────────┐
│ completed │ ← Finalizado
└─────┬─────┘
      │
      └─→ [Reviews Period (14 días)] → Reviews disponibles
```

---

## 📝 Flujo Completo Paso a Paso

### Fase 1: Solicitud y Confirmación

#### 1.1. Locatario Solicita Booking

**Acción**: Locatario selecciona auto y fechas en marketplace

**Proceso**:
1. Validación de disponibilidad (excluye overlaps con `pending`, `confirmed`, `in_progress`)
2. Cálculo de pricing (base + seguro + delivery si aplica)
3. Creación de booking con `status = 'pending'`
4. Notificación al locador

**Código**:
```typescript
// RPC: request_booking()
const booking = await supabase.rpc('request_booking', {
  p_car_id: carId,
  p_start: startDate,
  p_end: endDate
});
```

#### 1.2. Locador Aprueba/Rechaza

**Acción**: Locador revisa solicitud en dashboard

**Proceso**:
- **Aprobar**: Booking pasa a `confirmed` (requiere pago)
- **Rechazar**: Booking pasa a `cancelled`

**UI**: `/bookings/owner` → Lista de bookings pendientes

#### 1.3. Pago y Confirmación

**Acción**: Locatario completa pago

**Proceso**:
1. Bloqueo de fondos en wallet (rental + deposit)
2. Booking pasa a `status = 'confirmed'`
3. Notificaciones a ambas partes
4. Preparación para check-in

**Componente**: `booking-detail-payment.page.ts`

---

### Fase 2: Check-In (Inicio del Alquiler)

#### 2.1. Owner Check-In (Pre-Entrega)

**Acción**: Locador realiza inspección antes de entregar

**Proceso**:
1. **Inspección Física**:
   - Odómetro inicial
   - Nivel de combustible
   - Daños existentes (fotos)
   - Firma digital del locador

2. **Creación de FGO** (Fine-Grained Observation):
   ```typescript
   {
     booking_id: string,
     event_type: 'check_in_owner',
     odometer_reading: number,
     fuel_level: number,
     damage_notes: string,
     photo_urls: string[],
     signature_data_url: string
   }
   ```

3. **Cambio de Estado**: `confirmed` → `in_progress`

**Componente**: `owner-check-in.page.ts`
**Ruta**: `/bookings/owner/check-in/:id`

#### 2.2. Renter Check-In (Recepción)

**Acción**: Locatario confirma recepción del auto

**Proceso**:
1. **Verificación**:
   - Revisa inspección del locador
   - Confirma estado del vehículo
   - Firma digital del locatario

2. **Creación de FGO**:
   ```typescript
   {
     booking_id: string,
     event_type: 'check_in_renter',
     odometer_reading: number,
     fuel_level: number,
     signature_data_url: string
   }
   ```

3. **Tracking de Ubicación** (opcional):
   - Compartir ubicación en tiempo real
   - Guardar punto de entrega (GPS)

**Componente**: `check-in.page.ts`
**Ruta**: `/bookings/check-in/:id`

---

### Fase 3: Alquiler en Progreso

#### 3.1. Estado `in_progress`

**Características**:
- Booking activo
- Auto en poder del locatario
- Tracking de ubicación disponible
- Soporte 24/7 activo

**Monitoreo**:
- Dashboard del locador muestra ubicación (si compartida)
- Notificaciones de eventos importantes
- Sistema de alertas para incidencias

---

### Fase 4: Check-Out (Finalización)

#### 4.1. Renter Check-Out (Devolución)

**Acción**: Locatario devuelve el auto

**Proceso**:
1. **Inspección Final**:
   - Odómetro final
   - Nivel de combustible final
   - Fotos 360° del vehículo
   - Detección de daños nuevos (IA futura)

2. **Cálculo de Diferencias**:
   ```typescript
   const fuelDifference = checkOut.fuelLevel - checkIn.fuelLevel;
   const kmDifference = checkOut.odometer - checkIn.odometer;
   ```

3. **Creación de FGO**:
   ```typescript
   {
     booking_id: string,
     event_type: 'check_out_renter',
     odometer_reading: number,
     fuel_level: number,
     photos_360: string[],
     damages_detected: Damage[],
     signature_data_url: string
   }
   ```

**Componente**: `check-out.page.ts`
**Ruta**: `/bookings/check-out/:id`

#### 4.2. Owner Check-Out (Confirmación)

**Acción**: Locador confirma recepción y estado

**Proceso**:
1. **Revisión de Inspección**:
   - Compara check-in vs check-out
   - Valida daños reportados
   - Confirma estado del vehículo

2. **Reporte de Daños** (si aplica):
   ```typescript
   {
     owner_reported_damages: boolean,
     owner_damage_amount: number,
     owner_damage_description: string
   }
   ```

3. **Confirmación Bilateral**:
   - Locador confirma entrega: `owner_confirmed_delivery = true`
   - Locatario confirma pago: `renter_confirmed_payment = true`
   - Liberación de fondos: `funds_released_at`

**Componente**: `owner-check-out.page.ts` (si existe)

#### 4.3. Finalización del Booking

**Proceso**:
1. **Cambio de Estado**: `in_progress` → `completed`
2. **Split Payment**:
   - 85% al locador (owner_payment_amount)
   - 15% a la plataforma (platform_fee)
3. **Liberación de Depósito** (si no hay daños)
4. **Notificaciones** a ambas partes

**Código**:
```typescript
// Edge Function: complete-booking
await supabase.functions.invoke('complete-booking', {
  body: { booking_id: bookingId }
});
```

---

### Fase 5: Reseñas (Post-Completación)

#### 5.1. Período de Reseñas

**Ventana**: 14 días después de `completed`

**Proceso**:
1. **Notificación Automática** (día 1 post-completación):
   - Email a locador y locatario
   - Link directo a formulario de reseña

2. **Sistema Bidireccional**:
   - Locatario califica al locador: `renter_to_owner`
   - Locador califica al locatario: `owner_to_renter`

3. **Calificaciones por Categoría** (1-5 estrellas):
   ```typescript
   {
     rating_cleanliness: number,    // Limpieza
     rating_communication: number,  // Comunicación
     rating_accuracy: number,       // Precisión del anuncio
     rating_location: number,       // Ubicación
     rating_checkin: number,        // Proceso de check-in
     rating_value: number           // Relación precio/calidad
   }
   ```

4. **Publicación Automática**:
   - Se publican cuando ambas partes completan
   - Si solo una parte califica, queda `pending` hasta que la otra califique
   - Después de 14 días, se publican las que estén completas

**Componente**: `reviews.service.ts`
**Ruta**: `/bookings/:id/review`

#### 5.2. Validaciones de Reseñas

**Reglas**:
- ✅ Booking debe estar `completed`
- ✅ Reviewer debe ser parte del booking (renter o owner)
- ✅ No puede haber duplicados (una reseña por booking por reviewer)
- ✅ Período máximo: 14 días después de `completed`

**Código**:
```typescript
// RPC: create_review()
await supabase.rpc('create_review', {
  p_booking_id: bookingId,
  p_reviewer_id: userId,
  p_review_type: 'renter_to_owner',
  p_rating_cleanliness: 5,
  // ... otros ratings
  p_comment_public: 'Excelente experiencia'
});
```

---

## 💰 Cálculo de Ganancias

### Fórmula Base

```typescript
// Split Payment: 85% locador, 15% plataforma
const ownerEarnings = booking.total_amount * 0.85;
const platformFee = booking.total_amount * 0.15;
```

### Cálculo Mensual

**Servicio**: `car-depreciation-notifications.service.ts`

```typescript
async calculateMonthlyEarnings(carId: string, month: string): Promise<number> {
  const bookings = await supabase
    .from('bookings')
    .select('total_amount, status')
    .eq('car_id', carId)
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .gte('start_date', `${month}-01`)
    .lte('start_date', `${month}-31`);

  const totalEarnings = bookings.reduce((sum, booking) => {
    // Solo bookings completados o en progreso cuentan
    if (booking.status === 'completed' || booking.status === 'in_progress') {
      return sum + booking.total_amount * 0.85; // 85% para owner
    }
    return sum;
  }, 0);

  return totalEarnings;
}
```

### Dashboard de Ganancias

**Componente**: `owner-dashboard.page.ts`

**Métricas**:
- **Este mes**: `earnings.thisMonth`
- **Mes anterior**: `earnings.lastMonth`
- **Total histórico**: `earnings.total`
- **Crecimiento**: `((thisMonth - lastMonth) / lastMonth) * 100`

**Edge Function**: `dashboard-stats`

```typescript
interface DashboardStats {
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  // ... otros stats
}
```

### Depreciación vs Ganancias

**Notificación Mensual** (Cron Job):
- Calcula depreciación mensual del auto
- Compara con ganancias del mes
- Notifica al locador si `ganancias < depreciación`

**Código**: `supabase/migrations/20251113_create_car_depreciation_notifications_cron.sql`

---

## 📊 Estadísticas y Analytics

### Dashboard del Locador

**Componente**: `owner-dashboard.page.ts`

**Métricas Principales**:

1. **Autos**:
   - Total de autos
   - Activos (`status = 'active'`)
   - Pendientes (`status = 'pending'`)
   - Suspendidos (`status = 'suspended'`)

2. **Bookings**:
   - Próximos (`status = 'confirmed'` y `start_at > now()`)
   - Activos (`status = 'in_progress'`)
   - Completados (`status = 'completed'`)
   - Total histórico

3. **Ganancias**:
   - Este mes
   - Mes anterior
   - Total histórico
   - % de crecimiento

4. **Wallet**:
   - Balance disponible
   - Balance bloqueado (en bookings activos)
   - Balance retirable
   - Total

### Dashboard del Locatario

**Componente**: `personalized-dashboard.component.ts`

**Métricas**:
- Reservas activas
- Historial de reservas
- Balance de wallet
- Notificaciones no leídas

### Edge Function: Dashboard Stats

**Ruta**: `supabase/functions/dashboard-stats/index.ts`

**Endpoint**: `POST /dashboard-stats`

**Respuesta**:
```typescript
{
  wallet: {
    availableBalance: number;
    lockedBalance: number;
    totalBalance: number;
    withdrawableBalance: number;
  };
  cars: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  bookings: {
    upcoming: number;
    active: number;
    completed: number;
    total: number;
  };
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  timestamp: string;
}
```

---

## 🛡️ Seguros y Documentos

### Sistema de Seguros P2P

**Tabla**: `booking_insurance_coverage`

**Proceso**:
1. **Selección de Cobertura** (durante booking):
   - Póliza flotante de plataforma (default)
   - Seguro propio del locador (si tiene)

2. **Cálculo de Prima**:
   ```typescript
   const dailyPremium = policy.daily_premium;
   const rentalDays = calculateDays(startDate, endDate);
   const totalPremium = dailyPremium * rentalDays;
   ```

3. **Franquicia (Deductible)**:
   - Calculada según valor del auto
   - Retenida como `security_deposit_amount`
   - Liberada si no hay siniestros

**Campos en Booking**:
```typescript
{
  insurance_coverage_id: string;
  insurance_premium_total: number;  // En centavos
  security_deposit_amount: number; // Franquicia
  deposit_held: boolean;
  deposit_released_at: string | null;
  has_active_claim: boolean;
}
```

**Componente**: `insurance.model.ts`

### Documentos del Vehículo

**Tabla**: `vehicle_documents`

**Tipos de Documentos**:
```typescript
type VehicleDocumentKind =
  | 'registration'          // Cédula verde/título
  | 'insurance'             // Póliza de seguro
  | 'technical_inspection'  // Revisión técnica
  | 'circulation_permit'    // Permiso de circulación
  | 'ownership_proof';       // Comprobante de titularidad
```

**Estados**:
- `pending`: Pendiente de verificación
- `verified`: Verificado por admin
- `rejected`: Rechazado (requiere corrección)

**Validación**:
- Cada auto debe tener al menos `registration` y `insurance` verificados para estar `active`
- Documentos con `expiry_date` generan alertas antes de vencer

**Componente**: `MissingDocumentsWidgetComponent`

### Verificación de Conductor

**Tabla**: `driver_vehicle_verification`

**Proceso**:
1. Locatario sube documentos (licencia, DNI)
2. Verificación automática (IA) + manual (admin)
3. Aprobación requerida antes de `confirmed`

---

## 🔀 Diagramas de Flujo

### Flujo Completo Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE CONTRATACIÓN                     │
└─────────────────────────────────────────────────────────────┘

1. SOLICITUD
   Locatario → Selecciona auto → Solicita booking
   └─→ status: 'pending'

2. APROBACIÓN
   Locador → Aprueba/Rechaza
   ├─→ Rechaza: status: 'cancelled'
   └─→ Aprueba: Espera pago

3. PAGO
   Locatario → Completa pago (Wallet/Tarjeta)
   └─→ status: 'confirmed'
   └─→ Fondos bloqueados (rental + deposit)

4. CHECK-IN
   ├─→ Owner Check-In: Inspección pre-entrega
   │   └─→ FGO creado
   │
   └─→ Renter Check-In: Confirmación recepción
       └─→ status: 'in_progress'

5. ALQUILER ACTIVO
   └─→ Tracking ubicación (opcional)
   └─→ Soporte 24/7

6. CHECK-OUT
   ├─→ Renter Check-Out: Inspección devolución
   │   └─→ FGO creado
   │
   └─→ Owner Check-Out: Confirmación recepción
       └─→ Validación de daños
       └─→ Confirmación bilateral

7. FINALIZACIÓN
   └─→ status: 'completed'
   └─→ Split payment (85% owner, 15% platform)
   └─→ Liberación de depósito (si no hay daños)

8. RESEÑAS (14 días)
   ├─→ Locatario califica locador
   └─→ Locador califica locatario
   └─→ Publicación automática cuando ambas completan
```

### Estados y Transiciones Detalladas

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   [Rechaza]      [Aprueba]        [Timeout]
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌───────────┐   ┌──────────┐
│ cancelled   │  │ confirmed │   │ expired  │
└─────────────┘  └─────┬─────┘   └──────────┘
                       │
                  [Owner Check-In]
                       │
                       ▼
                ┌──────────────┐
                │ in_progress  │
                └──────┬───────┘
                       │
                  [Check-Out]
                       │
                       ▼
                ┌───────────┐
                │ completed │
                └─────┬─────┘
                      │
                 [Reviews]
                      │
                      ▼
              ┌──────────────┐
              │ Reviews Live │
              └──────────────┘
```

---

## 🔧 Implementación Técnica

### Servicios Principales

1. **BookingsService** (`bookings.service.ts`):
   - Gestión de bookings
   - Transiciones de estado
   - Queries optimizadas

2. **FGOService** (`fgo.service.ts`):
   - Creación de inspecciones
   - Gestión de check-in/check-out
   - Comparación de inspecciones

3. **ReviewsService** (`reviews.service.ts`):
   - Creación de reseñas
   - Validaciones
   - Publicación automática

4. **DashboardService** (`dashboard.service.ts`):
   - Estadísticas agregadas
   - Cálculo de ganancias
   - Métricas en tiempo real

5. **InsuranceService** (futuro):
   - Gestión de seguros
   - Cálculo de primas
   - Gestión de siniestros

### Edge Functions

1. **complete-booking**:
   - Finalización de booking
   - Split payment
   - Liberación de fondos

2. **dashboard-stats**:
   - Estadísticas agregadas
   - Cálculo de métricas

3. **create-preference** (MercadoPago):
   - Creación de preferencia de pago

4. **mercadopago-webhook**:
   - Procesamiento de webhooks
   - Actualización de pagos

### RPC Functions (PostgreSQL)

1. **request_booking()**:
   - Validación de disponibilidad
   - Creación de booking

2. **create_review()**:
   - Validaciones
   - Creación de reseña

3. **calculate_payment_split()**:
   - Cálculo de split (85/15)

4. **update_user_stats_v2_for_booking()**:
   - Actualización de estadísticas post-reseña

---

## 📝 Notas Finales

### Mejoras Futuras

1. **IA de Detección de Daños**:
   - Análisis automático de fotos 360°
   - Comparación check-in vs check-out

2. **Sistema de Disputas**:
   - Gestión de conflictos
   - Arbitraje automático

3. **Bonificación por Calificaciones**:
   - Incentivos para buenas reseñas
   - Programa de fidelización

4. **Analytics Avanzados**:
   - Predicción de demanda
   - Optimización de precios
   - Recomendaciones personalizadas

### Consideraciones de Seguridad

- ✅ RLS policies en todas las tablas
- ✅ Validación de permisos en cada transición
- ✅ Firma digital en inspecciones
- ✅ Tracking de ubicación opcional (consentimiento)
- ✅ Encriptación de datos sensibles

---

**Última actualización**: 2025-11-16
**Mantenido por**: Equipo AutoRenta




