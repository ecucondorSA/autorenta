# Analisis Pagos y Garantias (flujo, montos, estado, realtime)

Documento guia con rutas, archivos y lineas para ubicar cambios exactos.
Foco: consistencia entre flujos, montos/currency, estado de reserva y experiencia fluida.

## 0) Rutas activas (3 flujos distintos)

- Solicitud con preautorizacion / wallet lock (approval flow)
  - /bookings/detail-payment
  - /bookings/:bookingId/detail-payment
  - Archivo: apps/web/src/app/features/bookings/bookings.routes.ts:42-55

- Pago directo (wallet o tarjeta, sin approval)
  - /bookings/:bookingId/payment
  - Archivo: apps/web/src/app/features/bookings/bookings.routes.ts:137-140

- Checkout multi-proveedor (MP/PayPal)
  - /bookings/:bookingId/checkout
  - Archivo: apps/web/src/app/features/bookings/bookings.routes.ts:131-134

Impacto: tres experiencias y reglas distintas para el mismo objetivo (pagar / garantizar).

## 1) Validacion de estado inconsistente entre flujos

- Checkout exige status === 'pending'
  - apps/web/src/app/features/bookings/pages/booking-checkout/booking-checkout.page.ts:201-204

- BookingPayment no valida estado
  - Carga booking y permite pagar siempre
  - apps/web/src/app/features/bookings/booking-payment/booking-payment.page.ts:252-289

- Detail-Payment tampoco valida estado (solo valida terminos y preauth/lock)
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:493-520

Riesgo:
- Un mismo booking puede entrar en flujos incompatibles.
- Posible doble pago / doble bloqueo si el usuario entra por otra ruta.

## 2) Calculo de garantia inconsistente (constante vs calculo por franquicia)

### Flujo A (detail-payment)
- Usa constante fija PRE_AUTH_AMOUNT_USD = 600
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:96-98
- Hold estimado deriva de esa constante
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:617-620

### Flujo B (checkout)
- Hold calculado en base a franquicia y deducible
  - apps/web/src/app/features/bookings/checkout/support/risk-calculator.ts:30-69

Riesgo:
- El monto de garantia cambia segun el flujo elegido.
- El usuario puede ver 600 USD en un flujo y otro valor en otro.

## 3) Moneda / monto de garantia guardado con inconsistencias

- En detail-payment, para wallet se calcula lock en USD si wallet es USD
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:440-449
- Pero guarantee_amount_cents se guarda como ARS (walletRequiredArs * 100)
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:555-565

Riesgo:
- Lock real en wallet puede ser USD, pero el booking guarda ARS.
- UI usa guarantee_amount_cents como ARS (ver detalle de reserva)
  - apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:572-585

## 4) RPC mismatch: wallet_lock_funds (parametros y unidades)

- Frontend envia:
  - p_booking_id, p_amount, p_description
  - apps/web/src/app/core/services/payments/wallet.service.ts:341-360

- DB (segun migracion en repo) espera:
  - wallet_lock_funds(p_booking_id, p_amount_cents)
  - supabase/migrations/20251211050017_wallet_lock_expiration_system.sql:163-268

Riesgo:
- Si la BD sigue las migraciones del repo, la llamada puede fallar
  o interpretar p_amount como cents (monto 100x menor).
- Afecta flujos que usan lockFunds (split/partial, booking wallet service).

## 5) lockRentalAndDeposit no actualiza booking

- Frontend llama lockRentalAndDeposit y navega a success
  - apps/web/src/app/features/bookings/booking-payment/booking-payment.page.ts:365-389

- La funcion wallet_lock_rental_and_deposit solo bloquea fondos en wallet
  y no actualiza la reserva
  - supabase/snapshots/remote-schema-20251201.sql:15780-15869

Riesgo:
- booking queda en status pendiente aunque el usuario ya bloqueo fondos.
- La UI puede mostrar inconsistencias (pago hecho vs estado pendiente).

## 6) Duplication de flujos para garantia (mismos objetivos, logica distinta)

- BookingDetailPayment: usa PaymentAuthorizationService + wallet_lock_funds
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:538-567
  - apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts:71-98

- BookingWalletService: usa wallet_lock_funds (y MP preauth directo)
  - apps/web/src/app/core/services/bookings/booking-wallet.service.ts:124-204

- CheckoutPaymentService: usa wallet_lock_rental_and_deposit + payment intents
  - apps/web/src/app/features/bookings/checkout/services/checkout-payment.service.ts:62-135

Riesgo:
- Tres implementaciones de garantia en paralelo => divergencia de montos, estados y moneda.

## 7) payment_mode vs payment_method (impacto en UI de estado)

- Detail-payment actualiza payment_mode (no payment_method)
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:540-567

- Booking detail determina flujo segun payment_mode
  - apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:603-617

Riesgo:
- Si otro flujo solo setea payment_method (checkout/booking-payment),
  UI puede interpretar erroneamente la reserva como "falta pago".

## 8) FX rate lock no usado / polling continuo

- Existe fxRateLocked pero no se aplica
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:77
- FX polling cada 30s siempre activo
  - apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:374-385

Riesgo:
- El usuario ve montos moviendose mientras decide.
- Si se esperaba lockear tasa despues de crear booking, hoy no sucede.

## 9) Realtime vs polling en pagos

- booking-success usa polling de 3s por hasta 2 minutos
  - apps/web/src/app/features/bookings/booking-success/booking-success.page.ts:138-200
- booking-pending usa polling de 10s
  - apps/web/src/app/features/bookings/booking-pending/booking-pending.page.ts:92-131

Riesgo:
- Experiencia no fluida: el estado puede tardar y no es realtime.

## Posibles soluciones (sin implementar)

1) Unificar flujo de pagos y garantias
   - Definir un solo entry point (checkout) y adaptar detail-payment a ese motor.

2) Normalizar moneda
   - Definir claramente si guarantee_amount_cents es ARS o USD y respetarlo en todos los flujos.

3) Corregir RPC de wallet_lock_funds
   - Alinear parametros y unidades (cents vs decimal) en frontend y SQL.

4) Actualizar booking al bloquear fondos
   - Si se usa wallet_lock_rental_and_deposit, actualizar booking en el mismo RPC o desde el frontend.

5) Manejar payment_mode/payment_method
   - Unificar semantica y usar un solo campo (o derivar en frontend para evitar confusion).

Si queres, preparo un plan de correccion por etapas con cambios puntuales por archivo.
