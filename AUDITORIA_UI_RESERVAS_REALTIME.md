# Auditoria UI Reservas (Realtime)

## Objetivo
Detectar pantallas donde el estado de reservas puede quedar desactualizado cuando la contraparte realiza acciones,
y proponer puntos concretos para agregar realtime (sin recargar).

## Hallazgos (pantallas con estado potencialmente estatico)

### 1) Booking detail (renter/owner)
**Problema:** Carga inicial unica y refresh solo tras acciones locales.  
**Impacto:** Si la contraparte confirma/devolvio/aprobo, la UI no avanza sin recarga.  
**Referencias (ver guia base ya creada):**
- `GUIA_FLUJO_RESERVAS_REALTIME.md` (detalle completo)
- Carga inicial: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1017`

### 2) Owner booking detail (detalle para propietario)
**Problema:** Carga unica en `ngOnInit`, sin suscripcion realtime.  
**Lineas clave:**
- `apps/web/src/app/features/bookings/owner-booking-detail/owner-booking-detail.page.ts:137`
- `apps/web/src/app/features/bookings/owner-booking-detail/owner-booking-detail.page.ts:148`

### 3) Listado de reservas del locatario (MyBookings)
**Problema:** Carga en `ngOnInit` y no vuelve a refrescar si el usuario permanece en la pagina.  
**Lineas clave:**
- `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts:157`
- `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts:161`

### 4) Listado de reservas del locador (OwnerBookings)
**Problema:** Solo refresca en `ionViewWillEnter`; si el locador esta en la pagina y la contraparte actua, la lista no cambia.  
**Lineas clave:**
- `apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:77`
- `apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:86`
- `apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:111`

### 5) Pendientes de aprobacion (locador)
**Problema:** Polling cada 30s; no es realtime.  
**Lineas clave:**
- `apps/web/src/app/features/bookings/pending-approval/pending-approval.page.ts:67`
- `apps/web/src/app/features/bookings/pending-approval/pending-approval.page.ts:71`

### 6) Pendientes de revision (locador)
**Problema:** Carga en `ngOnInit` + `ionViewWillEnter`; no realtime.  
**Lineas clave:**
- `apps/web/src/app/features/bookings/pending-review/pending-review.page.ts:38`
- `apps/web/src/app/features/bookings/pending-review/pending-review.page.ts:43`

### 7) Flujo de pago/pending (polling)
**Problema:** Estas pantallas dependen de polling de estado (espera webhook).  
**Lineas clave:**
- Booking pending: `apps/web/src/app/features/bookings/booking-pending/booking-pending.page.ts:76`
- Booking confirmation: `apps/web/src/app/features/bookings/pages/booking-confirmation/booking-confirmation.page.ts:254`
- Booking success: `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts:138`

## Infraestructura realtime ya disponible
- `apps/web/src/app/core/services/infrastructure/realtime-connection.service.ts:71`  
  (suscripcion con retry y reuso de canales)
- Ejemplo real de uso:  
  `apps/web/src/app/core/services/bookings/messages.service.ts:212`

## Propuesta tecnica (realtime)

### A) Crear servicio central de realtime de reservas
Archivo sugerido:
- `apps/web/src/app/core/services/bookings/booking-realtime.service.ts`

Responsabilidad:
- Suscribirse a cambios relevantes por `booking_id`, `owner_id` o `renter_id`
- Exponer `subscribeToBooking(bookingId, callback)` y `subscribeToUserBookings(userId, role, callback)`

Tablas minimas a escuchar:
- `bookings` (estado principal)
- `booking_inspections` (check-in/check-out)
- `booking_extension_requests` (extensiones)
- `bookings_confirmation` (confirmaciones)
- `insurance_claims` (siniestros)
- `traffic_infractions` (multas)

Opcionales:
- `bookings_payment`, `bookings_pricing`, `bookings_insurance`, `car_tracking_sessions`

### B) Integracion por pantalla (que cambiar)

1) BookingDetailPage (renter/owner)
- Suscribir por booking_id.
- Al evento: `refreshBooking()` (ya listado en `GUIA_FLUJO_RESERVAS_REALTIME.md`)

2) OwnerBookingDetailPage
- Suscribir por booking_id.
- Al evento: recargar `booking` y `renterVerification` si aplica.

3) MyBookingsPage
- Suscribir por `renter_id=eq.<userId>` en tabla `bookings`.
- Al evento: refrescar lista (o actualizar solo el booking afectado).

4) OwnerBookingsPage
- Suscribir por `owner_id=eq.<userId>` en tabla `bookings`.
- Al evento: refrescar lista + counters (pending approvals, pending review).

5) PendingApprovalPage
- Reemplazar polling por realtime (bookings con `owner_id` y `status=pending`).
- Si la suscripcion no es viable, mantener polling como fallback.

6) PendingReviewPage
- Suscribir por `owner_id=eq.<userId>` en tabla `bookings`.
- Al evento: filtrar y recalcular lista.

7) BookingPending / BookingConfirmation / BookingSuccess
- Suscribir por `bookings.id=eq.<bookingId>` y cortar polling si cambia el status.
- Mantener polling como respaldo si el canal falla.

## Notas de implementacion
- Usar `RealtimeConnectionService` para manejar reconexion y evitar leaks.
- Desuscribir en `ngOnDestroy`.
- Evitar multiples llamadas simultaneas (debounce basico si llegan eventos seguidos).

---

Si queres, continuo con una guia de implementacion con diffs concretos
o avanzo directamente con los cambios en codigo.
