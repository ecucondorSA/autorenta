# 📘 Evaluación Integral de Flujos y Experiencias (AutoRenta)

Documento de referencia para QA, Producto y Desarrollo. Describe paso a paso los procesos críticos (búsqueda, reserva, pagos, confirmaciones, responsive, tours) con observaciones detalladas, fallas detectadas y recomendaciones para pruebas E2E. Incluye referencias directas al código actual (frontend Angular) para acelerar inspecciones.

_Última actualización: 24/10/2025._

---

## 1. Panorama general

- **Stack frontend**: Angular 17 standalone, signals + Tailwind tokens (`apps/web/src/app/…`).
- **Backend**: Supabase (Postgres + Edge Functions para MP). Los servicios Angular hacen RPC directas (`injectSupabase`).
- **Pagos**: Doble modalidad (preautorización Mercado Pago + wallet interno). Los flujos convergen en `BookingDetailPaymentPage` (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`).
- **Confirmación bilateral**: Servicio central `BookingConfirmationService` (`apps/web/src/app/core/services/booking-confirmation.service.ts`) coordina owner/renter, wallet y depósito.
- **Experiencia responsive**: Adaptada a breakpoints Tailwind (`sm=640`, `lg=1024`). iPhone y notch tratados con `viewport-fit=cover` + `env(safe-area-inset-*)` (`apps/web/src/index.html:6`).
- **Tours**: `TourService` actual utiliza Shepherd con timeouts (ver `TOUR_GUIADO_REWRITE.md` para reemplazo propuesto).

---

## 2. Flujo Locatario (Guest) – E2E detallado

### 2.1 Descubrimiento y selección
1. **Landing / Listado** (`CarsListPage`) carga inventario vía `CarsService.listActiveCars` (`apps/web/src/app/core/services/cars.service.ts:110`).
   - _Observación_: query solo filtra por `status='active'`; no evita solapes de reservas `apps/web/src/app/core/services/cars.service.ts:134` → riesgo de doble booking.
2. Segmentación premium/económico: score híbrido (70% precio, 30% rating) y percentil 60 (`apps/web/src/app/features/cars/list/cars-list.page.ts:199`).
3. UI responsive: en iPhone el carrusel “Cercanos y económicos” se sitúa entre el mapa y las tarjetas premium (`apps/web/src/app/features/cars/list/cars-list.page.html:96`). _Riesgo UX_: CTA premium desplaza hacia abajo.
4. Al tocar tarjeta/mapa → `onCarSelected` mantiene highlight y sincroniza `CarsMapComponent` (`apps/web/src/app/features/cars/list/cars-list.page.ts:212`).

### 2.2 Detalle de auto y solicitud
1. `CarDetailPage` muestra info completa y CTA “Reservar” (`apps/web/src/app/features/cars/detail/car-detail.page.ts`).
   - iOS: se detecta `navigator.platform` para abrir Apple Maps (`apps/web/src/app/features/cars/detail/car-detail.page.ts:345`).
2. `BookingsService.requestBooking(carId, start, end)` llama RPC `request_booking` (`apps/web/src/app/core/services/bookings.service.ts:15`).
   - Recalcula breakdown via `pricing_recalculate` (`apps/web/src/app/core/services/bookings.service.ts:32`).
   - Retorna booking en `status='pending'` / `payment_status='requires_payment'`.

### 2.3 Pago y garantías
1. Locatario navega a `BookingDetailPaymentPage` (standalone; signals para FX, riesgos, consents, etc.).
2. **SnapShots**: `fxService` y `riskService` fetch para mostrar monto a garantizar (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:63`).
3. Modalidades: `paymentMode` signal (default `card`) y `coverageUpgrade` (afecta monto en `RiskSnapshot`).

#### Tarjeta (Hold)
- `CardHoldPanelComponent` integra `MercadoPagoCardFormComponent`: renderiza cardform + callbacks (`apps/web/src/app/shared/components/mercadopago-card-form/mercadopago-card-form.component.ts`).
- Token generado → `PaymentAuthorizationService.authorizePayment` (crea payment_intent vía RPC + llama Edge `mp-create-preauth`) (`apps/web/src/app/core/services/payment-authorization.service.ts:70`).
- `getTestSafeAmount`: clamp a $10k ARS sandbox (logs warn). _Riesgo_: si hold falla, estado queda `failed` y requiere reintento manual (`apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts`, switch-case `failed`).
- Autorización expira tras 7 días; componente muestra alerta `needsReauthorizationWarning()`.

#### Wallet (Crédito de Seguridad)
- `CreditSecurityPanelComponent` revisa saldo protegido (`walletService.balance`) y diferencia vs. requisito (`apps/web/src/app/features/bookings/booking-detail-payment/components/credit-security-panel.component.ts:92`).
- `wallet.lockRentalAndDeposit` bloquea rental + depósito (default 250 USD) (`apps/web/src/app/core/services/wallet.service.ts:647`).
- _Riesgo_: si RPC falla, no hay rollback visible; booking sigue en pending sin lock.

#### Confirmar y pagar
- CTA `canProceed` exige snapshots + consents + auth/lock OK (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:63`).
- Al confirmar, se crea booking definitivo (`CreateBookingResult`), `status` cambia a `confirmed`, `payment_status='succeeded'` (tarjeta) u `wallet_status='locked'` (wallet).
- _QA_: verificar `payment_intent_id` y `wallet_lock_transaction_id` guardados en booking (`apps/web/src/app/core/models/index.ts:320`).

### 2.4 Estadía y devoluciones
1. `MyBookingsPage` lista reservas (join view) (`apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts`).
   - Acciones: ver instrucciones, abrir ubicación, iniciar chat.
2. Inspecciones (check-in/out) gestionadas por `InspectionUploaderComponent` (ver `apps/web/src/app/shared/components/inspection-uploader`).
3. Al entregar auto: owner marca `booking_mark_as_returned` (expuesto en Owner UI) vía `BookingConfirmationService.markAsReturned` (`apps/web/src/app/core/services/booking-confirmation.service.ts:64`).

### 2.5 Confirmación y liberación
1. `RenterConfirmationComponent` permite confirmar liberación. Llama `BookingConfirmationService.confirmRenter` (`apps/web/src/app/shared/components/renter-confirmation/renter-confirmation.component.ts:82`).
2. `ConfirmAndReleaseResponse.waiting_for` indica si falta owner/renter/both (`apps/web/src/app/core/services/booking-confirmation.service.ts:25`).
3. Si ambos confirmaron:
   - Tarjeta: hold se captura o libera via Edge (detallado en Edge Functions). _Front detecta `funds_released=true`._
   - Wallet: `wallet_complete_booking`/`wallet_complete_booking_with_damages` se ejecutan (`apps/web/src/app/core/services/wallet.service.ts:689`).
4. Estado final: `booking.completion_status='funds_released'`, `wallet_status='refunded' | 'charged'`.

### 2.6 Post-reserva
- `ReviewManagementComponent` maneja doble reseña (owner ↔ renter) (`apps/web/src/app/features/bookings/booking-detail/review-management.component.ts`).
- Ratings alimentan `UserStats` y `CarStats` (`apps/web/src/app/core/models/index.ts:402`).

---

## 3. Flujo Locador (Host) – E2E detallado

### 3.1 Publicación y disponibilidad
1. Completa onboarding y crea auto (`apps/web/src/app/features/cars/publish`).
2. `cars.status` pasa de `draft` a `active` tras validaciones; `carsService` retorna en listado general.
3. _Gap_: no existe bloqueo automático de visibilidad cuando hay reservas confirmadas; depende de floor scheduling (pendiente).

### 3.2 Gestión de reservas
1. `owner_bookings` view provee reseñas y estados (`apps/web/src/app/core/services/bookings.service.ts:63`).
2. `BookingDetailPage` detecta si usuario actual es owner (`apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts:101`).
3. Acciones owner:
   - Chat con locatario (`BookingChatComponent`).
   - Cargar inspecciones, ver FGO (Fondo Garantía Operativa) (`apps/web/src/app/features/bookings/booking-detail/fgo-management.component.ts`).

### 3.3 Confirmaciones y daños
- `OwnerConfirmationComponent` permite confirmar entrega y reportar daños (máx 250 USD) (`apps/web/src/app/shared/components/owner-confirmation/owner-confirmation.component.ts:58`).
- Validaciones: `damage_amount` > 0 y ≤ 250, `damage_description` >= 10 caracteres.
- Tras confirmar, `ConfirmAndReleaseResponse` indica si renter falta. _QA_: simular owner confirmando antes que renter (estado `waiting_for='renter'`).

### 3.4 Cobro
- Para wallet: `wallet_complete_booking(_with_damages)` transfiere fondos al owner y ajusta depósito.
- Para tarjeta: edge functions capturan hold (ver supabase functions, no en repo). _Frontend solo muestra éxito.

### 3.5 Post-venta
- Owner completa review (`ReviewManagementComponent`).
- Stats actualizados en `UserStats` con badges (Top Host, etc.).

---

## 4. Relaciones y puntos de contacto

| Área | Descripción | Referencia | Observaciones QA |
|------|-------------|------------|------------------|
| **Chat booking** | Canal Supabase realtime (no incluido en repo, pero componente centraliza UI) | `apps/web/src/app/shared/components/booking-chat/booking-chat.component.ts` | Validar envío/recepción simultánea (owner ↔ renter) y attachments. |
| **Inspecciones** | Fotos y firmas de check-in/out | `apps/web/src/app/shared/components/inspection-uploader/inspection-uploader.component.ts` | Confirmar que check-in se exija antes de check-out. |
| **Notificaciones** | No hay push nativo; rely on email/whatsapp (fuera de repo). | – | Futuro: integrar PWA badges (ya se usa `pwaService.setAppBadge` `apps/web/src/app/core/services/bookings.service.ts:55`). |
| **Tours** | `TourService` arranca tours welcome/guided en `AppComponent` y `CarsListPage` | `apps/web/src/app/core/services/tour.service.ts` | Problema actual: timeouts por elementos inexistentes. Necesario reescribir según `TOUR_GUIADO_REWRITE.md`. |

---

## 5. Responsive / iPhone consideraciones clave

### 5.1 Layout tokens
- Breakpoints `sm=640`, `lg=1024` controlan transformaciones de layout (`apps/web/src/app/features/cars/list/cars-list.page.css`).
- Safe areas: `padding-bottom: env(safe-area-inset-bottom)` en CTA sticky (`BookingDetailPayment`).

### 5.2 Componentes sensibles en iOS
- Carrusel económico: `scroll-snap`, `-webkit-overflow-scrolling: touch` para suavidad (`apps/web/src/app/features/cars/list/cars-list.page.css:90`).
- Mapbox: warnings `ResizeObserver disconnected` al rotar; no rompe UX pero hay log.
- Formularios largos: Safari reescala `vh`; se usa `100dvh` en layouts clave (Mapa). Confirmar en iPhone SE.

### 5.3 QA recomendada
- Test manual iPhone 13/14 + SE usando Safari Responsive Mode / BrowserStack.
- Validar: CTA sticky visible, carrusel no tapa filtros, forms no saltan con teclado, modales respetan notch.
- Ver doc específica `RESPONSIVE_IPHONE_GUIDE.md` para más detalles.

---

## 6. Fallas potenciales y brechas

1. **Doble booking del mismo auto**: no se excluyen `car_id` ya reservados en `listActiveCars`. _Solución_: agregar `blockedCarIds` en filtros (ya tipado `apps/web/src/app/core/models/index.ts:270`) y cargar desde backend.
2. **Tour guiado**: Shepherd lanza `Timeout waiting for selector` cuando elementos tardan en montar (`apps/web/src/app/core/services/tour.service.ts:70`). Peligroso en E2E (resalta overlay sin objetivo). _Reescritura planificada_.
3. **Hold MP fallo**: No hay mecanismo auto retry o fallback; usuario debe cambiar a wallet manualmente. Proponer `onRetry` + logs (ya hay botón) pero complementarlo con notificación en analytics.
4. **Wallet lock**: Si RPC falla, UI muestra error y booking queda pending. No hay proceso de limpieza; QA debe monitorear `wallet_status`. Sugerencia: job que verifique `pending` > X min sin lock.
5. **Cancelación con fondos bloqueados**: `BookingsService.cancelBooking` libera wallet lock pero no hay confirmación visual. _QA_: revisar logs en consola.
6. **Responsive**: En iPhone, carrusel + mapa ocupan viewport; CTA premium puede quedar fuera en scroll inicial. Considerar `scroll-margin-top` o collapse condicional del carrusel.
7. **Accessibilidad**: Muchos componentes dependen de hover; en mobile falta feedback. Tours no contemplan transiciones.

---

## 7. Recomendaciones para pruebas E2E

### 7.1 Escenarios críticos
- Reservar mismo auto con dos cuentas distintas en fechas solapadas → verificar comportamiento (debería bloquear). Falta cobertura.
- Pago con tarjeta (hold): simular rechazo `cc_rejected_high_risk` (monto > 100k ARS) y observar fallback.
- Pago con wallet: bloquear fondos, cancelar reserva, confirmar que `wallet_status` pasa de `locked` a `refunded`.
- Confirmaciones cruzadas: owner confirma con daños; renter rechaza. Validar `amountToReturn` y mensajes.
- Tours: ejecutar flows con tours deshabilitados (flag) para evitar timeouts.
- Responsive iPhone: check carrusel + CTA en Safari.

### 7.2 Automatización sugerida
- Cypress/Playwright con fixtures: `cy.viewport('iphone-13')` y `cy.viewport(1280, 720)` para desktop.
- Mock de Edge Functions (MercadoPago) para simular status `approved`, `rejected`, `authorized`.
- Supabase schema seeds para crear autos/usuarios/booking baseline.

### 7.3 Observabilidad
- Añadir instrumentation: `PaymentAuthorizationService` y `WalletService.lockRentalAndDeposit` deberían enviar eventos a analytics (no implementado actualmente).
- Logging: `card-hold-panel` muestra `console.log`; en producción se debería sustituir por logger centralizado.

---

## 8. Próximos pasos propuestos

1. **Disponibilidad en inventario**: añadir filtro `blockedCarIds` en `listActiveCars` usando datos de reservas confirmadas/pending.
2. **Tour Orchestrator**: implementar arquitectura nueva (`TOUR_GUIADO_REWRITE.md`) para evitar timeouts y soportar mobile.
3. **Monitoreo de pagos**: crear dashboard para holds fallidos y locks no liberados.
4. **Responsive tuning**: ajustar carrusel económico en mobile (opción: colocar en pestaña) y asegurar CTA premium visible.
5. **Doc QA**: migrar estos findings a Confluence + diagramas BPMN para flujos de owner/renter.
6. **A/B test**: experimentar con ocultar autos reservados y mostrar badge “Reservado” en mapa.

---

## 9. Referencias de documentación relacionada

- `MERCADOPAGO_INIT.md` – Integración MP y estados.
- `ROLES_LOCADOR_LOCATARIO_FLUJOS.md` – Detalle por rol y dos modalidades de pago.
- `RESPONSIVE_IPHONE_GUIDE.md` – Consideraciones de iPhone.
- `TOUR_GUIADO_REWRITE.md` – Plan para reimplementar tours.
- `AUTOS_COTIZACIONES_ANALISIS.md` – Segmentación de inventario y UI del listado.

---

> Este documento debe acompañarse con evidencias (screens, logs) y revisarse tras cada iteración relevante (pagos, wallet, responsive, tours).
