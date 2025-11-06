# 🔴 PROBLEMAS CRÍTICOS DE AUTORENTA - CONSOLIDADO

**Fecha:** 2025-10-25  
**Status:** Requiere atención inmediata

---

## 📋 RESUMEN EJECUTIVO

| Área | Problemas | Prioridad | Estado |
|------|-----------|-----------|---------|
| 💳 **Pagos** | 3 críticos | P0 | 🔴 Bloqueante |
| 🚗 **Alquiler/Reservas** | 5 críticos | P0 | 🟡 Parcial |
| 💬 **Chat Propietario** | 1 crítico | P1 | ❌ No implementado |
| 🗺️ **Disponibilidad** | 2 críticos | P0 | ❌ Sin bloqueo |

**Total:** **11 problemas críticos** que afectan funcionalidad core

---

## 🔴 P0: BLOQUEANTES (Resolver primero)

### 1. 💳 **PAGO: Email hardcodeado en autorización de tarjetas**

**Ubicación:** `apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts:293`

**Problema:**
```typescript
// ❌ ACTUAL (ROTO)
const email = 'test@autorenta.com'; // Hardcoded!
await this.createCardHold(email, amount);
```

**Impacto:** 
- ❌ Usuarios reales NO pueden autorizar tarjetas
- ❌ Solo funciona para test@autorenta.com
- ❌ Bloquea todo el flujo de pago

**Solución:**
```typescript
// ✅ CORRECTO
const user = await this.authService.getCurrentUser();
const email = user.email;
await this.createCardHold(email, amount);
```

**Archivos a modificar:**
- `card-hold-panel.component.ts:293`

---

### 2. 🚗 **RESERVAS: Flujo inconsistente de creación**

**Ubicación:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:703`

**Problema:**
```typescript
// ❌ ACTUAL (ROTO)
const { data, error } = await this.supabase
  .from('bookings')
  .insert({
    renter_id: userId,  // Directo sin validación
    car_id: carId,
    // ... datos heurísticos
  });
```

**Impacto:**
- ❌ Sin validación de disponibilidad
- ❌ Sin transacción atómica
- ❌ Posibles inconsistencias en BD
- ❌ Doble reserva posible

**Solución:**
```typescript
// ✅ CORRECTO
const booking = await this.bookingService.createBookingRequest({
  renterId: userId,
  carId: carId,
  startAt: startDate,
  endAt: endDate,
  totalAmount: price
});
// Usa RPC function con validaciones y transacción
```

**Archivos a modificar:**
- `booking-detail-payment.page.ts:703`
- Crear/usar `BookingService.createBookingRequest()`

---

### 3. 🗺️ **DISPONIBILIDAD: Sin bloqueo de autos comprometidos**

**Ubicación:** `apps/web/src/app/core/services/cars.service.ts:138`

**Problema:**
```typescript
// ❌ ACTUAL (ROTO)
async listActiveCars(): Promise<Car[]> {
  // Solo filtra por status='active'
  // NO verifica si tiene bookings activos
  return await this.supabase
    .from('cars')
    .select('*')
    .eq('status', 'active');
}
```

**Impacto:**
- ❌ Autos con reservas aparecen disponibles
- ❌ Doble reserva posible
- ❌ Mala experiencia de usuario
- ❌ Conflictos al intentar reservar

**Solución:**
```typescript
// ✅ CORRECTO
async listAvailableCars(startDate: Date, endDate: Date): Promise<Car[]> {
  // Usar RPC function que valida disponibilidad
  return await this.supabase.rpc('get_available_cars', {
    p_start_date: startDate,
    p_end_date: endDate
  });
}
```

**SQL a crear:**
```sql
CREATE OR REPLACE FUNCTION get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS SETOF cars AS $$
  SELECT c.*
  FROM cars c
  WHERE c.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.car_id = c.id
        AND b.status IN ('confirmed', 'in_progress')
        AND (b.start_at, b.end_at) OVERLAPS (p_start_date, p_end_date)
    );
$$ LANGUAGE sql STABLE;
```

---

### 4. 💳 **PAGO: Código duplicado en "Pagar ahora"**

**Ubicación:** `apps/web/src/app/features/bookings/booking-detail/payment-actions.component.ts:138`

**Problema:**
```typescript
// ❌ CÓDIGO DUPLICADO
// Misma lógica que booking-detail-payment pero sin manejo de errores
async payNow() {
  // Reimplementación manual del flujo de pago
  // Sin validaciones
  // Sin retry logic
}
```

**Impacto:**
- ❌ Difícil de mantener
- ❌ Bugs inconsistentes
- ❌ Sin manejo de errores
- ❌ Código frágil

**Solución:**
```typescript
// ✅ USAR SERVICIO CENTRALIZADO
async payNow() {
  try {
    await this.paymentService.processPayment(this.booking.id);
  } catch (error) {
    this.handlePaymentError(error);
  }
}
```

---

## 🟡 P1: IMPORTANTES (Resolver después)

### 5. 🚗 **MY BOOKINGS: Acciones sin implementar**

**Ubicación:** `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts:156`

**Problema:**
```typescript
// ❌ BLOQUEADO
async cancelBooking(bookingId: string) {
  console.log('Cancel not implemented'); // TODO
}

async openChat(booking: Booking) {
  console.log('Chat not implemented'); // TODO
}

async showMap(booking: Booking) {
  console.log('Map not implemented'); // TODO
}

async startTour() {
  console.log('Tour not implemented'); // TODO
}
```

**Impacto:**
- ❌ Usuario no puede cancelar reservas
- ❌ No puede contactar al propietario
- ❌ No puede ver ubicación del auto
- ❌ Mala UX post-pago

**Solución:**
1. **Cancelación:**
```typescript
async cancelBooking(bookingId: string) {
  const confirmed = await this.showCancelConfirmation();
  if (!confirmed) return;
  
  await this.bookingService.cancelBooking(bookingId);
  await this.loadBookings(); // Refresh
  this.showToast('Reserva cancelada');
}
```

2. **Chat:**
```typescript
async openChat(booking: Booking) {
  this.router.navigate(['/chat', booking.car.owner_id]);
}
```

3. **Mapa:**
```typescript
async showMap(booking: Booking) {
  const modal = await this.modalCtrl.create({
    component: MapModalComponent,
    componentProps: {
      latitude: booking.pickup_location.lat,
      longitude: booking.pickup_location.lng,
      title: 'Ubicación de retiro'
    }
  });
  await modal.present();
}
```

---

### 6. 💬 **CHAT: Sistema de mensajería no implementado**

**Estado:** ❌ **COMPLETAMENTE AUSENTE**

**Impacto:**
- ❌ Usuario no puede contactar propietario
- ❌ No hay forma de coordinar retiro/devolución
- ❌ Sin soporte durante el alquiler

**Solución (Opción 1 - Rápida):**
```typescript
// Usar WhatsApp Business API o similar
async contactOwner(ownerId: string) {
  const owner = await this.getOwner(ownerId);
  const phone = owner.phone;
  const message = `Hola, te contacto por el auto ${car.name}...`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
}
```

**Solución (Opción 2 - Completa):**
Implementar chat in-app:
- Tabla `messages` en Supabase
- Realtime subscriptions
- UI de chat con Ionic components

---

## 📊 ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────────────────────┐
│               FLUJO CORRECTO (A IMPLEMENTAR)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 🔍 Usuario busca autos                                  │
│     └─▶ ✅ CarsService.listAvailableCars(dates)            │
│        └─▶ Filtra por disponibilidad real                   │
│                                                              │
│  2. 📝 Selecciona auto y va a booking                       │
│     └─▶ ✅ BookingService.createBookingRequest()           │
│     └─▶ ✅ Lee email de auth.user (dinámico)               │
│     └─▶ ✅ Transacción atómica con validaciones            │
│                                                              │
│  3. 💳 Autoriza tarjeta                                     │
│     └─▶ ✅ CardHoldService con email del usuario           │
│     └─▶ ✅ Manejo de errores específicos                    │
│                                                              │
│  4. 💰 Paga la reserva                                      │
│     └─▶ ✅ PaymentService centralizado                      │
│     └─▶ ✅ Retry logic y error handling                     │
│                                                              │
│  5. 📱 Gestiona en My Bookings                              │
│     └─▶ ✅ Puede cancelar (si aplica)                       │
│     └─▶ ✅ Puede chatear con propietario                    │
│     └─▶ ✅ Puede ver mapa de ubicación                      │
│     └─▶ ✅ Tour guiado funcional                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ PLAN DE ACCIÓN (Priorizado)

### Sprint 1 (1-2 días) - Desbloquear pagos

1. **Fix email hardcodeado** (30 min)
   - Modificar `card-hold-panel.component.ts`
   - Obtener email de auth service
   - Testing con usuario real

2. **Centralizar PaymentService** (2 horas)
   - Crear servicio unificado
   - Migrar lógica duplicada
   - Agregar error handling

3. **Testing de pagos** (1 hora)
   - Probar con tarjeta real
   - Verificar flow completo
   - Validar en BD

---

### Sprint 2 (2-3 días) - Bloqueo de disponibilidad

4. **Crear RPC function de disponibilidad** (1 hora)
   - SQL function `get_available_cars`
   - Validación de overlaps
   - Testing con datos reales

5. **Actualizar CarsService** (1 hora)
   - Usar RPC en listado
   - Agregar filtros de fecha
   - Cache si es necesario

6. **Usar BookingService** (2 horas)
   - Reemplazar INSERT directo
   - Implementar createBookingRequest
   - Validaciones transaccionales

---

### Sprint 3 (2-3 días) - My Bookings funcional

7. **Implementar cancelación** (2 horas)
   - Lógica de cancelación
   - Validaciones (fecha límite, etc)
   - UI de confirmación

8. **Implementar mapa** (1 hora)
   - Modal con Mapbox
   - Marker de ubicación
   - Integración en My Bookings

9. **Chat simple** (3 horas)
   - Opción 1: WhatsApp redirect (rápido)
   - Opción 2: Chat in-app (completo)

---

## 🧪 TESTING CHECKLIST

### Después de cada fix:

**Pagos:**
- [ ] Usuario puede autorizar tarjeta con su email
- [ ] PaymentService maneja errores correctamente
- [ ] Código duplicado eliminado

**Disponibilidad:**
- [ ] Autos con reservas NO aparecen disponibles
- [ ] Búsqueda por fechas funciona
- [ ] Doble reserva es imposible

**My Bookings:**
- [ ] Cancelación funciona (con validaciones)
- [ ] Chat/contacto funciona
- [ ] Mapa muestra ubicación correcta
- [ ] Tour guiado no rompe

---

## 📁 ARCHIVOS CLAVE A MODIFICAR

```
apps/web/src/app/
├── core/services/
│   ├── cars.service.ts              # Fix disponibilidad
│   ├── booking.service.ts           # Crear/mejorar
│   └── payment.service.ts           # Centralizar lógica
├── features/bookings/
│   ├── booking-detail-payment/
│   │   ├── booking-detail-payment.page.ts        # Fix insert directo
│   │   └── components/
│   │       └── card-hold-panel.component.ts     # Fix email hardcoded
│   ├── booking-detail/
│   │   └── payment-actions.component.ts         # Usar PaymentService
│   └── my-bookings/
│       └── my-bookings.page.ts                  # Implementar acciones
└── ...
```

---

## 🎯 IMPACTO ESTIMADO

### Antes (Actual):
- 🔴 Pagos: 10% éxito (solo test users)
- 🔴 Reservas: 50% (doble booking posible)
- 🔴 Gestión: 0% (nada implementado)

### Después (Con fixes):
- 🟢 Pagos: 95% éxito
- 🟢 Reservas: 98% (sin conflictos)
- 🟢 Gestión: 90% funcional

---

## 💰 ESFUERZO ESTIMADO

| Sprint | Días | Complejidad | Riesgo |
|--------|------|-------------|--------|
| Sprint 1 (Pagos) | 1-2 | 🟢 Baja | 🟢 Bajo |
| Sprint 2 (Disponibilidad) | 2-3 | 🟡 Media | 🟡 Medio |
| Sprint 3 (My Bookings) | 2-3 | 🟡 Media | 🟢 Bajo |
| **TOTAL** | **5-8 días** | **Media** | **Bajo** |

---

## 🚀 CÓMO EMPEZAR

**Ahora mismo:**
```bash
# 1. Crear rama para fixes
cd /home/edu/autorenta
git checkout -b fix/critical-issues

# 2. Empezar con P0 #1 (email hardcoded)
code apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts
```

**Seguir este documento como guía step-by-step.**

---

**Generado:** 2025-10-25  
**Próxima revisión:** Después de Sprint 1  
**Owner:** @edu
