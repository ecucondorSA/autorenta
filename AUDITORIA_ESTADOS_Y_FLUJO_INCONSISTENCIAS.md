# Auditoria - Consistencia de estados y flujo

## Resumen
Se detectan inconsistencias entre pantallas y servicios al interpretar el estado del booking.
Esto puede generar mensajes incorrectos, rutas erradas y acciones faltantes para owner/renter.

## 1) Duplicidad de pagina de detalle (owner vs general)

- Ruta owner dedicada: `/bookings/owner/:id`  
  `apps/web/src/app/features/bookings/bookings.routes.ts:19`
- Ruta general (ambos roles): `/bookings/:id`  
  `apps/web/src/app/features/bookings/bookings.routes.ts:78`

**Riesgo:** la pagina owner (`owner-booking-detail`) no incluye los componentes
de confirmaciones, disputas, siniestros, timeline, etc.  
Ejemplo: en `owner-booking-detail` no hay `booking-confirmation-timeline`
ni `owner/renter-confirmation`.

Archivos:
- Owner detail:  
  `apps/web/src/app/features/bookings/owner-booking-detail/owner-booking-detail.page.html:1`
- General detail (completo):  
  `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.html:1`

**Impacto:** el owner puede perder acciones criticas (confirmacion bilateral,
estado de devolucion, disputas) si llega desde un link `/bookings/owner/:id`.

## 2) Mapeo de estado "pending" inconsistente (approval vs payment)

### a) BookingFlowService (base)
Siempre dice "Esperando aprobación del dueño" para `pending`,
sin distinguir flujo de pago tradicional.
- `apps/web/src/app/core/services/bookings/booking-flow.service.ts:435`

### b) BookingDetailPage (usa bookingFlowService como base)
Solo sobreescribe si `isPendingOwnerApproval()` o `pending_payment`,
pero **no** corrige el caso `pending` sin `payment_mode`.
- `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:440`

### c) OwnerBookingsPage
Para `pending` muestra hint "El locatario debe completar el pago",
lo cual es incorrecto en flujo con `payment_mode` (approval).
- `apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:166`

### d) OwnerBookingDetailPage
`pending` se etiqueta siempre como "Pendiente de aprobación"
sin considerar pagos tradicionales.
- `apps/web/src/app/features/bookings/owner-booking-detail/owner-booking-detail.page.ts:203`

### e) BookingStatusComponent
Si `pending` + `payment_mode` -> "Esperando aprobación", caso contrario -> "Pendiente de pago"
(este componente si distingue flujo).
- `apps/web/src/app/features/bookings/booking-detail/booking-status.component.ts:70`

**Impacto:** mensajes contradictorios en distintas pantallas para el mismo booking.

## 3) Estados faltantes en OwnerBookingDetailPage

`statusLabel()` no contempla:
- `pending_review`
- `pending_payment`
- `disputed` / `pending_dispute_resolution` / `resolved`
- `no_show`
- `cancelled_owner` / `cancelled_renter` / `cancelled_system`

Fuente:
- `apps/web/src/app/features/bookings/owner-booking-detail/owner-booking-detail.page.ts:203`

**Impacto:** el owner ve estados en blanco o mal etiquetados.

## 4) Flow next-step no considera `completion_status`

`BookingFlowService.getNextStep()` depende solo de `booking.status`,
pero el retorno/confirmaciones usan `completion_status` (returned, pending_owner, etc).
Esto puede sugerir acciones incorrectas en la UI.

Fuentes:
- `apps/web/src/app/core/services/bookings/booking-flow.service.ts:242`
- `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:630` (usa completion_status)
- `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.html:85` (usa nextStep)

**Impacto:** boton "Siguiente paso" puede llevar a un flujo que ya no aplica.

## 5) Listados no usan `completion_status`

Listas de bookings (owner/my) dependen solo de `status`,
pero el flujo real de devolucion/confirma usa `completion_status`.

Fuentes:
- Owner list: `apps/web/src/app/features/bookings/owner-bookings/owner-bookings.page.ts:145`
- My list: `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts:205`
- BookingStatusComponent si usa completion_status (en detalle):  
  `apps/web/src/app/features/bookings/booking-detail/booking-status.component.ts:86`

**Impacto:** el listado puede mostrar "En curso" mientras el detalle muestra "En revisión".

## Recomendacion

1) Unificar la pagina de detalle (usar siempre `/bookings/:id`)
   y redirigir `/bookings/owner/:id` al mismo componente o eliminar duplicado.
2) Centralizar el mapeo de status en un helper unico (e.g. booking-flow-helpers)
   y consumirlo desde todas las pantallas.
3) Ajustar `BookingFlowService.getBookingStatusInfo()` para distinguir:
   - pending + payment_mode -> "Esperando aprobación"
   - pending sin payment_mode -> "Pendiente de pago"
4) Incorporar `completion_status` en el next-step y en los listados.

Si queres, preparo el plan de cambios o el PR.
