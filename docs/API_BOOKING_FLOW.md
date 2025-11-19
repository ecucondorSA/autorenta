# API de Booking Flow - AutoRenta

**Versión**: 1.0.0
**Fecha**: 2025-11-16
**Autor**: Sistema AutoRenta

---

## 📋 Índice

1. [BookingFlowService](#bookingflowservice)
2. [BookingNotificationsService](#bookingnotificationsservice)
3. [BookingFlowHelpers](#bookingflowhelpers)
4. [BookingFlowLoggerService](#bookingflowloggerservice)
5. [Ejemplos de Uso](#ejemplos-de-uso)

---

## BookingFlowService

Servicio centralizado que coordina el flujo completo de contratación.

### Métodos Públicos

#### `getAvailableActions(booking, userRole)`

Obtiene las acciones disponibles para un booking según su estado y el rol del usuario.

**Parámetros**:
- `booking: Booking` - El booking a analizar
- `userRole: 'owner' | 'renter' | 'both'` - Rol del usuario

**Retorna**: `BookingAction[]` - Array de acciones disponibles

**Ejemplo**:
```typescript
const actions = bookingFlowService.getAvailableActions(booking, 'owner');
// [
//   { label: 'Aprobar Reserva', action: 'approve', route: '/bookings/123', ... },
//   { label: 'Rechazar', action: 'reject', route: '/bookings/123', ... }
// ]
```

#### `getNextStep(booking, userRole)`

Obtiene el siguiente paso recomendado en el flujo.

**Parámetros**:
- `booking: Booking` - El booking actual
- `userRole: 'owner' | 'renter'` - Rol del usuario

**Retorna**: `NextStep | null` - Información del siguiente paso o null si no hay

**Ejemplo**:
```typescript
const nextStep = bookingFlowService.getNextStep(booking, 'owner');
// {
//   title: 'Realizar Check-In',
//   description: 'Inspecciona el vehículo antes de entregarlo...',
//   action: 'Iniciar Check-In',
//   route: '/bookings/123/owner-check-in',
//   priority: 'high'
// }
```

#### `navigateToNextStep(booking)`

Navega automáticamente al siguiente paso del flujo.

**Parámetros**:
- `booking: Booking` - El booking actual

**Retorna**: `Promise<void>`

**Ejemplo**:
```typescript
await bookingFlowService.navigateToNextStep(booking);
// Navega automáticamente a la ruta del siguiente paso
```

#### `validateStatusTransition(booking, newStatus)`

Valida si se puede realizar una transición de estado.

**Parámetros**:
- `booking: Booking` - El booking actual
- `newStatus: BookingStatus` - El estado destino

**Retorna**: `{ valid: boolean; error?: string }`

**Ejemplo**:
```typescript
const validation = bookingFlowService.validateStatusTransition(booking, 'in_progress');
if (!validation.valid) {
  console.error(validation.error);
  // "El check-in solo está disponible para bookings confirmados..."
}
```

#### `getBookingStatusInfo(booking)`

Obtiene información visual del estado del booking para UI.

**Parámetros**:
- `booking: Booking` - El booking a analizar

**Retorna**: `BookingStatusInfo` - Información visual del estado

**Ejemplo**:
```typescript
const statusInfo = bookingFlowService.getBookingStatusInfo(booking);
// {
//   label: 'Confirmada',
//   color: 'success',
//   icon: 'checkmark-circle',
//   description: 'Reserva confirmada. Preparate para el check-in'
// }
```

#### `calculateOwnerEarnings(totalAmount)`

Calcula y formatea las ganancias del locador (split 85/15).

**Parámetros**:
- `totalAmount: number` - Monto total del booking

**Retorna**: Objeto con ganancias calculadas y formateadas

**Ejemplo**:
```typescript
const earnings = bookingFlowService.calculateOwnerEarnings(100000);
// {
//   ownerAmount: 85000,
//   platformFee: 15000,
//   ownerPercentage: 85,
//   platformPercentage: 15,
//   formatted: {
//     owner: '$85.000',
//     platform: '$15.000',
//     total: '$100.000'
//   }
// }
```

---

## BookingNotificationsService

Servicio especializado para crear notificaciones automáticas cuando cambia el estado de un booking.

### Métodos Públicos

#### `notifyStatusChange(booking, oldStatus, newStatus)`

Notifica cuando un booking cambia de estado.

**Parámetros**:
- `booking: Booking` - El booking actualizado
- `oldStatus: string` - Estado anterior
- `newStatus: string` - Estado nuevo

**Retorna**: `Promise<void>`

**Ejemplo**:
```typescript
await bookingNotificationsService.notifyStatusChange(
  booking,
  'confirmed',
  'in_progress'
);
// Crea notificaciones para locador y locatario
```

#### `notifyActionRequired(booking, action, targetUserId)`

Notifica cuando se requiere acción del usuario.

**Parámetros**:
- `booking: Booking` - El booking
- `action: 'check_in' | 'check_out' | 'review' | 'approve' | 'payment'` - Acción requerida
- `targetUserId: string` - ID del usuario que debe realizar la acción

**Retorna**: `Promise<void>`

**Ejemplo**:
```typescript
await bookingNotificationsService.notifyActionRequired(
  booking,
  'check_in',
  ownerId
);
// Notifica al locador que debe realizar check-in
```

#### `notifyInspectionCompleted(booking, inspectionType, completedByUserId)`

Notifica cuando se completa un check-in o check-out.

**Parámetros**:
- `booking: Booking` - El booking
- `inspectionType: 'check_in' | 'check_out'` - Tipo de inspección
- `completedByUserId: string` - ID del usuario que completó

**Retorna**: `Promise<void>`

**Ejemplo**:
```typescript
await bookingNotificationsService.notifyInspectionCompleted(
  booking,
  'check_in',
  ownerId
);
// Notifica al locatario que puede hacer su check-in
```

#### `notifyReviewAvailable(booking, userId)`

Notifica cuando se puede dejar una reseña.

**Parámetros**:
- `booking: Booking` - El booking completado
- `userId: string` - ID del usuario que puede dejar reseña

**Retorna**: `Promise<void>`

---

## BookingFlowHelpers

Funciones puras de utilidad para trabajar con el flujo de booking.

### Funciones Disponibles

#### `isValidStatusTransition(from, to)`

Valida si una transición de estado es permitida.

```typescript
const result = isValidStatusTransition('pending', 'confirmed');
// { valid: true }
// { valid: false, reason: 'No se puede cambiar de...' }
```

#### `canPerformCheckIn(booking)`

Verifica si un booking está en un estado que permite check-in.

```typescript
const result = canPerformCheckIn(booking);
// { allowed: true }
// { allowed: false, reason: 'El check-in solo está disponible...' }
```

#### `canPerformCheckOut(booking)`

Verifica si un booking está en un estado que permite check-out.

```typescript
const result = canPerformCheckOut(booking);
// { allowed: true }
// { allowed: false, reason: 'El check-out solo está disponible...' }
```

#### `canLeaveReview(booking, completedDate?)`

Verifica si un booking puede recibir reseñas.

```typescript
const result = canLeaveReview(booking, booking.updated_at);
// { canReview: true, daysRemaining: 10 }
// { canReview: false, reason: 'Período expirado...' }
```

#### `getTimeRemaining(targetDate)`

Calcula el tiempo restante para una acción.

```typescript
const time = getTimeRemaining(new Date('2025-12-01'));
// {
//   days: 15,
//   hours: 3,
//   minutes: 30,
//   isOverdue: false,
//   formatted: '15d 3h 30m'
// }
```

#### `getBookingStatusDisplay(status)`

Obtiene el estado visual de un booking para UI.

```typescript
const display = getBookingStatusDisplay('confirmed');
// {
//   label: 'Confirmada',
//   color: 'success',
//   icon: '✅',
//   description: 'Reserva confirmada...'
// }
```

#### `formatOwnerEarnings(totalAmount)`

Formatea el monto de ganancias del locador (85% del total).

```typescript
const earnings = formatOwnerEarnings(100000);
// {
//   ownerAmount: 85000,
//   platformFee: 15000,
//   formatted: { owner: '$85.000', ... }
// }
```

#### `getBookingFlowProgress(booking)`

Calcula el porcentaje de completitud del flujo.

```typescript
const progress = getBookingFlowProgress(booking);
// {
//   percentage: 50,
//   currentStep: 2,
//   totalSteps: 4,
//   stepLabel: 'Confirmada'
// }
```

---

## BookingFlowLoggerService

Servicio especializado para logging del flujo de booking.

### Métodos Públicos

#### `logStatusTransition(bookingId, from, to, userId, metadata?)`

Log de transición de estado (solo en desarrollo).

#### `logAction(bookingId, action, userId, success, error?)`

Log de acción realizada.

#### `logValidation(bookingId, validation, passed, reason?)`

Log de validación.

#### `logError(bookingId, context, error, metadata?)`

Log de error en el flujo (siempre activo).

#### `logPerformance(bookingId, operation, duration, metadata?)`

Log de métricas de performance (solo en desarrollo).

---

## Ejemplos de Uso

### Ejemplo 1: Validar y realizar transición de estado

```typescript
// En un componente
async onCheckIn(booking: Booking) {
  // 1. Validar transición
  const validation = this.bookingFlowService.validateStatusTransition(
    booking,
    'in_progress'
  );

  if (!validation.valid) {
    this.toastService.error('Error', validation.error);
    return;
  }

  // 2. Realizar check-in
  try {
    await this.bookingsService.updateBooking(booking.id, {
      status: 'in_progress'
    });

    // 3. Notificar
    const updated = await this.bookingsService.getBookingById(booking.id);
    if (updated) {
      await this.bookingNotificationsService.notifyStatusChange(
        updated,
        'confirmed',
        'in_progress'
      );
    }

    this.toastService.success('Éxito', 'Check-in completado');
  } catch (error) {
    this.toastService.error('Error', 'No se pudo completar el check-in');
  }
}
```

### Ejemplo 2: Mostrar siguiente paso en UI

```typescript
// En un componente
readonly nextStep = computed(() => {
  const booking = this.booking();
  if (!booking) return null;

  const userRole = this.isOwner() ? 'owner' : 'renter';
  return this.bookingFlowService.getNextStep(booking, userRole);
});

// En template
@if (nextStep()) {
  <div class="next-step-card">
    <h3>{{ nextStep()?.title }}</h3>
    <p>{{ nextStep()?.description }}</p>
    <button (click)="navigateToNextStep()">
      {{ nextStep()?.action }}
    </button>
  </div>
}
```

### Ejemplo 3: Calcular y mostrar ganancias

```typescript
// En un componente
readonly earnings = computed(() => {
  const booking = this.booking();
  if (!booking?.total_amount) return null;

  return this.bookingFlowService.calculateOwnerEarnings(
    booking.total_amount
  );
});

// En template
@if (earnings()) {
  <div class="earnings-breakdown">
    <p>Total: {{ earnings()?.formatted.total }}</p>
    <p>Tu ganancia (85%): {{ earnings()?.formatted.owner }}</p>
    <p>Comisión plataforma (15%): {{ earnings()?.formatted.platform }}</p>
  </div>
}
```

### Ejemplo 4: Usar helpers directamente

```typescript
import {
  canPerformCheckIn,
  getTimeRemaining,
  formatOwnerEarnings
} from '@core/services/booking-flow-helpers';

// Validar check-in
const canCheckIn = canPerformCheckIn(booking);
if (!canCheckIn.allowed) {
  console.error(canCheckIn.reason);
}

// Tiempo restante
const time = getTimeRemaining(booking.start_at);
console.log(`Faltan ${time.formatted} para el inicio`);

// Formatear ganancias
const earnings = formatOwnerEarnings(100000);
console.log(`Ganarás ${earnings.formatted.owner}`);
```

---

## Tipos e Interfaces

### BookingAction

```typescript
interface BookingAction {
  label: string;
  action: string;
  route: string;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  icon: string;
  description?: string;
}
```

### NextStep

```typescript
interface NextStep {
  title: string;
  description: string;
  action: string;
  route: string;
  priority: 'high' | 'medium' | 'low';
}
```

### BookingStatusInfo

```typescript
interface BookingStatusInfo {
  label: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  icon: string;
  description: string;
}
```

---

**Última actualización**: 2025-11-16
**Mantenido por**: Equipo AutoRenta






