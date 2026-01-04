# Guia de correccion: Flujo y seguimiento de reservas con Realtime

## Objetivo
Que la UI de locador y locatario avance automaticamente cuando la contraparte realiza una accion
(aprobacion, check-in/check-out, devolucion, confirmaciones, extension, siniestros, multas),
sin necesidad de recargar la pagina. La experiencia debe ser fluida y rapida.

## Estado actual (por que la UI puede quedar estatica)

### 1) BookingDetail carga una sola vez y no se subscribe a cambios
- Carga inicial unica en `ngOnInit` y setea `booking` una sola vez:
  - `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1017`
  - `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1026`
  - `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1033`

### 2) Solo se refresca el booking cuando el usuario local realiza acciones
- Ejemplos de refresh local luego de acciones del mismo usuario:
  - Confirmacion: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1498`
  - Marcar como devuelto: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1562`
  - No-show (owner/renter): `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1658`
  - Solicitud de extension: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:936`

### 3) Los datos que influyen en el flujo tambien se cargan solo una vez
- Inspecciones: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1235`
- Siniestros: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1247`
- Extensiones: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1574`
- Multas: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1586`
- Confirmaciones/pagos/tracking: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1264`

**Conclusion:** Si el locador cambia algo (aprueba, confirma, reporta dano, etc.),
el locatario no lo ve hasta recargar. Eso rompe la fluidez del flujo.

## Infraestructura Realtime disponible en el repo

### Servicio listo para reusar (recomendado)
- `RealtimeConnectionService` permite suscribir con retry y reuso de canales:
  - `apps/web/src/app/core/services/infrastructure/realtime-connection.service.ts:71`
  - `apps/web/src/app/core/services/infrastructure/realtime-connection.service.ts:98`

### Ejemplo de uso real en el repo
- Mensajes en tiempo real (patron a copiar):
  - `apps/web/src/app/core/services/bookings/messages.service.ts:212`
  - `apps/web/src/app/core/services/bookings/messages.service.ts:220`

## Guia de correccion (Realtime)

### A) Crear una suscripcion realtime para el booking
**Opcion 1 (limpia):** crear un servicio nuevo (sugerido)
- Archivo nuevo sugerido:
  - `apps/web/src/app/core/services/bookings/booking-realtime.service.ts`
- Responsabilidad:
  - Suscribirse a cambios de tablas criticas por `booking_id`
  - Emitir un callback `onChange` al componente

**Opcion 2 (rapida):** implementar directo en `BookingDetailPage`
- Archivo actual:
  - `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts`

### B) Tablas que impactan el flujo y deben disparar refresh
Minimo recomendado para flujo rapido:

1) `bookings` (status y flags principales)
- Cambios visibles en timeline/estado general
- Referencias de uso:
  - Timeline usa campos de `booking`:
    - `apps/web/src/app/shared/components/booking-confirmation-timeline/booking-confirmation-timeline.component.ts:75`
    - `apps/web/src/app/shared/components/booking-confirmation-timeline/booking-confirmation-timeline.component.ts:132`

2) `booking_inspections` (check-in/check-out)
- Fuente de datos:
  - `apps/web/src/app/core/services/verification/fgo-v1-1.service.ts:262`

3) `booking_extension_requests`
- Fuente de datos:
  - `apps/web/src/app/core/services/bookings/bookings.service.ts:1308`

4) `insurance_claims`
- Fuente de datos:
  - `apps/web/src/app/core/services/bookings/insurance.service.ts:392`

5) `traffic_infractions`
- Fuente de datos:
  - `apps/web/src/app/core/services/infrastructure/traffic-infractions.service.ts:48`

6) `bookings_confirmation`
- Fuente de datos (para confirmaciones y release de fondos):
  - `apps/web/src/app/core/services/bookings/booking-ops.service.ts:113`

Opcionales (si queres sincronizar paneles secundarios):
- `bookings_pricing`, `bookings_payment`, `bookings_insurance`, `car_tracking_sessions`
  - Fuentes: `apps/web/src/app/core/services/bookings/booking-ops.service.ts:70`

### C) Donde refrescar el estado al recibir un evento realtime
Agregar un metodo en `BookingDetailPage` (o servicio) que centralice el refresh:

```
refreshBooking(bookingId):
  - getBookingById(bookingId)
  - loadNextStep(booking)
  - loadInspections()
  - loadClaims()
  - loadPendingExtensionRequests(bookingId)
  - loadTrafficFines(bookingId)
  - loadConfirmation(bookingId)
  - loadPayment/Tracking/Insurance/Pricing (si necesitas)
```

Referencias de los metodos existentes:
- `getBookingById`: `apps/web/src/app/core/services/bookings/bookings.service.ts:364`
- `loadInspections`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1235`
- `loadClaims`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1247`
- `loadPendingExtensionRequests`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1574`
- `loadTrafficFines`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1586`
- `loadConfirmation`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1312`
- `loadPricing/Insurance/Payment/Tracking`: `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1264`

### D) Ejemplo de suscripcion (pseudo-codigo con el patron existente)
Basado en `messages.service.ts`:

```
// booking-realtime.service.ts (sugerido)
subscribeToBooking(bookingId, onChange):
  realtime.subscribeWithRetry(
    `booking-${bookingId}`,
    { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
    () => onChange('bookings')
  )

// repetir para booking_inspections, booking_extension_requests, insurance_claims, traffic_infractions, bookings_confirmation
```

### E) Limpieza de suscripciones
- Debe hacerse en `ngOnDestroy` para evitar leaks.
- `RealtimeConnectionService` ya ofrece `unsubscribe` y `unsubscribeAll`.

## Checklist de cambios (resumen rapido)
1) Agregar servicio realtime de booking (o en el page directamente)
2) Suscribirse en `ngOnInit` y desuscribirse en `ngOnDestroy`
3) En cada evento realtime, llamar `refreshBooking()`
4) Validar que el timeline/estado cambia sin recargar

---

Si queres, hago el PR con los cambios concretos o preparo el diff exacto para copiar y pegar.
