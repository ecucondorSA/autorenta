# Auditoria plataforma - 7 areas (estado actual)

Documento de analisis rapido con rutas y lineas para ubicar donde cambiar.
Enfocado en fluidez, actualizacion de estado y consistencia entre partes.

## 1) Pagos y garantias

**Hallazgo:** varias pantallas dependen de polling o cargas unicas; no hay realtime.
- Booking pending (polling cada 10s):  
  `apps/web/src/app/features/bookings/booking-pending/booking-pending.page.ts:76`
- Booking success (polling cada 3s hasta 2 min):  
  `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts:138`
- Booking confirmation (polling opcional):  
  `apps/web/src/app/features/bookings/pages/booking-confirmation/booking-confirmation.page.ts:254`
- Estados de pago/garantia se muestran en detalle de reserva, pero sin realtime (ver guia de reservas).
- Owner bookings y My bookings muestran deposit_status / payment_mode pero no se actualizan en vivo.

**Riesgo:** el usuario no ve cambios de estado al instante (aprobacion, pago confirmado, hold liberado).

## 2) Check-in / Check-out e inspecciones

**Hallazgo:** inspecciones se cargan una sola vez; sin realtime al cambiar por la contraparte.
- Carga inspecciones:  
  `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1235`
- Fuente de datos:  
  `apps/web/src/app/core/services/verification/fgo-v1-1.service.ts:262`

**Riesgo:** el locador/locatario no ve de inmediato el check-in/check-out del otro.

## 3) Chat / Notificaciones

**Chat (OK):** Inbox usa realtime en mensajes.
- Suscripcion realtime:  
  `apps/web/src/app/features/messages/inbox.page.ts:267`

**Notificaciones (posible gap):** pagina de notificaciones carga una vez y no se engancha a realtime.
- Carga unica:  
  `apps/web/src/app/features/notifications/notifications.page.ts:584`
- Servicio realtime existe, pero no esta enlazado a la pagina:  
  `apps/web/src/app/core/services/infrastructure/user-notifications.service.ts:188`

**Riesgo:** llegan notificaciones pero la lista no se actualiza sin recargar.

## 4) Reviews / reputacion

**Hallazgo:** categorias fijas iguales para ambos roles (ya documentado).
- Formulario de review con 6 categorias fijas:  
  `apps/web/src/app/shared/components/review-form/review-form.component.ts:41`
- Modelo de datos solo contempla esas categorias:  
  `apps/web/src/app/core/models/index.ts:775`
- Calculo de promedios usa esas mismas categorias:  
  `apps/web/src/app/core/services/cars/reviews.service.ts:349`

**Riesgo:** si se necesitan categorias distintas para owner->renter, el modelo y los promedios no lo soportan.

## 5) Cancelaciones / Disputas / Reembolsos

**Disputas:** pagina carga una vez y no escucha cambios.
- Carga inicial:  
  `apps/web/src/app/features/bookings/disputes/disputes-management.page.ts:34`
- Sin realtime de disputas / evidencias.

**Reembolsos / cancelaciones:** dependen del booking detail (sin realtime).
- Booking detail:  
  `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:1017`

**Riesgo:** cambios de admin o contraparte no se reflejan hasta recargar.

## 6) Onboarding / verificacion

**Realtime existe**, pero no se usa en la pagina principal de verificacion.
- Realtime de verificacion:  
  `apps/web/src/app/core/services/verification/verification-state.service.ts:80`
- Pagina de verificacion no usa ese servicio (carga estatica):  
  `apps/web/src/app/features/verification/verification.page.ts:1`
- Profile usa VerificationStateService:  
  `apps/web/src/app/features/profile/profile-expanded.page.ts:54`

**Riesgo:** inconsistencia entre pantalla de perfil (realtime) y verificacion (no realtime).

## 7) Payouts / liquidaciones / retiros

**Payout history:** carga una vez, sin realtime.
- Carga inicial:  
  `apps/web/src/app/features/dashboard/components/payouts-history/payouts-history.component.ts:209`

**Payouts page:** stats y bank accounts se cargan una vez.
- `apps/web/src/app/features/payouts/payouts.page.ts:98`

**Withdrawals (usuario):** servicio sin realtime.
- `apps/web/src/app/core/services/payments/withdrawal.service.ts:41`

**Withdrawals (admin):** carga una vez.
- `apps/web/src/app/features/admin/withdrawals/admin-withdrawals.page.ts:67`

**Riesgo:** cambios de estado (pending -> processing -> completed) no aparecen sin refresh.

## Infraestructura reusable (para todo esto)

Servicio de realtime listo para usar:
- `apps/web/src/app/core/services/infrastructure/realtime-connection.service.ts:71`

Ejemplo de patron realtime (mensajes):
- `apps/web/src/app/features/messages/inbox.page.ts:267`

## Recomendacion general (aplicable a las 7 areas)

1) Centralizar subscriptions realtime por entidad (bookings, disputes, payouts, notifications).
2) En cada pantalla, refrescar solo el item cambiado, no toda la pagina.
3) Mantener polling como fallback en pantallas sensibles a webhooks (pagos).

Si queres, avanzo con un plan de implementacion por etapas y diffs concretos.
