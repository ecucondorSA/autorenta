# 🔄 Flujos completos por rol: Locador vs Locatario

Guía integral para mapear los ciclos de vida de ambos roles (locador = propietario, locatario = huésped) desde la publicación/búsqueda hasta la liberación de fondos. Incluye referencias al código actual (_apps/web_) y focos para pruebas E2E.

---

## 1. Estado actual del sistema

- **Roles soportados**: `owner`, `renter`, `both`, `admin` (`apps/web/src/app/core/types/database.types.ts:10`).
- **Tipos de pago habilitados**: 
  1. **Hold con tarjeta (preautorización)** via Mercado Pago (`apps/web/src/app/core/services/payment-authorization.service.ts`).
  2. **Wallet interno** (depósitos + bloqueo dual alquiler/garantía) (`apps/web/src/app/core/services/wallet.service.ts`).
- **Confirmación bilateral**: ambos deben completar confirmaciones para liberar fondos (`apps/web/src/app/core/services/booking-confirmation.service.ts`).
- **Disponibilidad del auto**: actualmente no se recalcula disponibilidad en la consulta de inventario; los autos reservados siguen apareciendo en el mapa/listado (ver TODO `apps/web/src/app/core/services/cars.service.ts:134`).
- **Comunicación**: chat embebido en detalle de reserva (`apps/web/src/app/shared/components/booking-chat/booking-chat.component.ts`).

---

## 2. Formas de pago y garantías

| Modalidad | ¿Cómo funciona? | Componentes/Servicios clave | Resultados esperados | Riesgos detectados |
|-----------|-----------------|-----------------------------|----------------------|--------------------|
| **Tarjeta (hold)** | El locatario genera un token de tarjeta → `mp-create-preauth` crea hold por el monto de garantía + alquiler (según configuración). | `apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts`; `PaymentAuthorizationService` | - Preautorización queda asociada al `payment_intent` y se libera/captura al cerrar ciclo.<br>- Estado `booking.payment_method = 'credit_card'`. | - Sandbox MP rechaza montos altos (`cc_rejected_high_risk`). Ver fallback en `PaymentAuthorizationService.getTestSafeAmount()`.<br>- Si el hold falla no hay retry automático; CTA queda bloqueado. |
| **Wallet (depósito + bloqueo)** | Locatario carga saldo → `wallet_lock_rental_and_deposit` bloquea alquiler + garantía (default 250 USD) (`apps/web/src/app/core/services/wallet.service.ts:647`). | `WalletService`, `CreditSecurityPanelComponent`, `WalletLock` signals | - `wallet_status = 'locked'` hasta completar la reserva.<br>- Al completar: `wallet_complete_booking(_with_damages)` distribuye fondos. | - Depende de balance actualizado; sin refresco previo puede fallar `hasSufficientFunds` (`apps/web/src/app/core/services/wallet.service.ts:132`).<br>- Desbloqueos ante cancelaciones manejados en `BookingsService.cancelBooking()`; si falla se necesita retry manual. |

**Combinaciones**: El UI permite cambiar de modo con toggle (`apps/web/src/app/features/bookings/booking-detail-payment/components/payment-mode-toggle.component.ts`). Las validaciones (`validatePaymentAuthorization`, `validateConsents`) se recalculan cada vez que la señal `paymentMode` cambia (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:118`).

---

## 3. Ciclo del Locatario (huésped)

### 3.1 Descubrimiento y selección
1. Entra a `CarsListPage` (mapa + listado) (`apps/web/src/app/features/cars/list/cars-list.page.ts`).
2. Segmentación premium/económico calcula score 70% precio / 30% rating (`apps/web/src/app/features/cars/list/cars-list.page.ts:199`).
3. Al seleccionar un auto se navega a `CarDetailPage` (`apps/web/src/app/features/cars/detail/car-detail.page.ts`).
4. **E2E check**: confirmá que el auto siga visible en el mapa después de iniciar una reserva; hoy no hay bloqueo visual.

### 3.2 Solicitud de reserva
1. CTA “Reservar” dispara `BookingsService.requestBooking()` (`apps/web/src/app/core/services/bookings.service.ts:15`).
2. RPC `request_booking` crea booking en estado `pending`/`pending_payment`.
3. El sistema recalcula pricing `pricing_recalculate` y vuelve a buscar booking (`apps/web/src/app/core/services/bookings.service.ts:32`).
4. **E2E check**: validar que el booking aparezca en `my_bookings` view (`apps/web/src/app/core/services/bookings.service.ts:50`) con breakdown completo.

### 3.3 Pago y garantía
1. Navegación a `BookingDetailPaymentPage` (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`).
2. Seleccionar modalidad: `paymentMode` (`card` por default), `coverageUpgrade` (Standard/Premium/Franquicia Cero) afecta `riskSnapshot` (`apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:118`).
3. **Tarjeta**: `CardHoldPanelComponent` genera token y llama a `PaymentAuthorizationService.authorizePayment()` (preauth). Validar `paymentAuthorization` no-null.
4. **Wallet**: `CreditSecurityPanelComponent` ejecuta `wallet.lockRentalAndDeposit`. Validar `walletLock.status === 'locked'`.
5. CTA “Confirmar y pagar” llama `createBooking` (Edge Function). Revisar `CreateBookingResult` para `payment_method`.
6. **E2E check**: después del pago exitoso, `booking.status` debe pasar a `confirmed` y `payment_status = 'succeeded'`. Para wallet, `wallet_status = 'locked'`.

### 3.4 Retiro, estadía y devolución
1. En `MyBookings` se muestran instrucciones de check-in/out (`apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts:165`).
2. Inspecciones (fotos) gestionadas por `InspectionUploaderComponent` (LOCADOR + LOCATARIO). Validar estados `check_in`/`check_out`.
3. Tras devolución, locador o sistema marca `booking_mark_as_returned` (`BookingConfirmationService.markAsReturned()`).

### 3.5 Confirmación y liberación de fondos
1. `RenterConfirmationComponent` permite confirmar liberación (`apps/web/src/app/shared/components/renter-confirmation/renter-confirmation.component.ts`).
2. Al confirmar, `BookingConfirmationService.confirmRenter()` evalúa si ambos roles confirmaron y en tal caso dispara `booking_confirm_and_release` (`apps/web/src/app/core/services/booking-confirmation.service.ts:274`).
3. Garantía devuelta por wallet (`wallet_complete_booking`), pago al locador.
4. **E2E check**: validar `completion_status` transiciona a `funds_released` y `wallet_status` cambia a `refunded` o `charged` según daños.

### 3.6 Post-venta
1. `ReviewManagementComponent` habilita reseñas bilaterales (`apps/web/src/app/features/bookings/booking-detail/review-management.component.ts`).
2. Roles se intercambian reseñas; estados `pending/published/hidden` (`apps/web/src/app/core/models/index.ts:372`).

---

## 4. Ciclo del Locador (propietario)

### 4.1 Onboarding y publicación
1. Completa perfil (datos, verificación). Los perfiles usan `Profile.role` (`apps/web/src/app/core/types/database.types.ts:25`).
2. Crea anuncio desde flujo “Publicá tu auto” (`apps/web/src/app/features/cars/publish`). Guarda en `cars.status = 'draft'` hasta confirmación.
3. Tras completar requisitos (fotos, documentos) se activa `cars.status = 'active'` (`apps/web/src/app/core/services/cars.service.ts:14`).
4. **E2E check**: asegurar que tras activar, el auto aparezca en listado/mapa con pricing correcto.

### 4.2 Recepción de reservas
1. Las reservas entran vía view `owner_bookings` (`apps/web/src/app/core/services/bookings.service.ts:63`).
2. Dashboard de anfitrión (pendiente) muestra `BookingStatus` y `payment_status`.
3. Puede cancelar antes de confirmación (pendiente) o proceder.
4. **Comunicación**: chat en detalle de reserva (`apps/web/src/app/shared/components/booking-chat/booking-chat.component.ts`).

### 4.3 Durante la reserva
1. Debe coordinar entrega; puede usar `InspectionUploader` para check-in (fotos, firma) y check-out.
2. Si detecta daños → `OwnerConfirmationComponent` permite reportarlos antes de liberar fondos (`apps/web/src/app/shared/components/owner-confirmation/owner-confirmation.component.ts`). Monto máximo 250 USD (`Validators.max(250)`).

### 4.4 Cobro y liberación
1. Tras devolución, confirma en `OwnerConfirmationComponent`.
2. Si ambos confirmaron y no hay daños → `wallet_complete_booking` transfiere alquiler + libera garantía.
3. Si hay daños → `wallet_complete_booking_with_damages` cobra parte/all 250 USD (`apps/web/src/app/core/services/wallet.service.ts:689`).
4. **E2E check**: validar que se recibe notificación de éxito (mensaje `ConfirmAndReleaseResponse.message`) y que `owner_confirmed_delivery` y `renter_confirmed_payment` quedan en `true` en booking.

### 4.5 Reviews y reputación
1. Completa reseña del locatario (`ReviewManagementComponent`).
2. Métricas de host (rating promedio, badges) se actualizan en `UserStats` (`apps/web/src/app/core/models/index.ts:402`).

---

## 5. Interacciones entre roles

| Interacción | Punto de contacto | Detalle | QA/E2E a validar |
|-------------|-------------------|---------|------------------|
| **Chat** | `BookingChatComponent` | Canal persistente por booking (mensajes + archivos). Depende de supabase channel `booking_chat` (ver componente para suscripción). | - Renter y owner ven mensajes en tiempo real.<br>- Notificar si channel se rompe (sin fallback). |
| **Inspecciones** | `InspectionUploaderComponent` | Ambos pueden subir fotos check-in/out. Guarda en tabla `booking_inspections`. | - Estado check-in debe bloquear check-out duplicado.<br>- Verificar firmas digitales si aplica. |
| **Confirmaciones** | `OwnerConfirmationComponent` + `RenterConfirmationComponent` | Confirmación bilateral; fondos liberados cuando ambos completan. | - Simular owner con daños + renter confirmando, revisar prorrateo.<br>- Simular renter confirmando antes que owner → `waiting_for` = `'owner'`. |
| **Pagos** | `PaymentActionsComponent`, `BookingDetailPaymentPage` | Locatario paga; locador ve estado en `owner_bookings`. | - Al cancelar antes del pago, liberar hold/wallet lock. |

---

## 6. Gaps y focos para pruebas E2E

1. **Disponibilidad del auto**: `CarsService.listActiveCars()` no filtra por reservas futuras (`apps/web/src/app/core/services/cars.service.ts:134`). Se pueden crear reservas simultáneas del mismo auto. _Test recomendada_: intentar reservar el mismo auto en fechas solapadas.
2. **Tour guiado**: dispara errores `Timeout waiting for selector: [data-tour-step="guided-search"]` (`apps/web/src/app/core/services/tour.service.ts:72`). Para pruebas E2E, desactivar tours o esperar evento `inventoryReady` antes de correr.
3. **Hold rechazado**: MP sandbox rechaza > $10,000 ARS; la UI solo muestra mensaje genérico. Validar fallback `getTestSafeAmount` y flujos de reintento manual.
4. **Wallet lock fallido**: si `wallet_lock_rental_and_deposit` falla, no hay rollback visible. Verificar estado del booking queda `pending` pero sin lock.
5. **Liberación automática**: si uno de los roles no confirma, `waiting_for` queda `'owner'`/`'renter'`. QA debe validar recordatorios y que fondos no se liberen hasta completar.
6. **Cancelaciones tardías**: Calcular si al cancelar con fondos bloqueados se ejecuta `walletService.unlockFunds` (capturar logs en consola). _Edge case_: error en unlock → booking queda `cancelled` pero `wallet_status = 'locked'`.
7. **Map + carrusel económico**: en mobile el carrusel mueve el listado premium (posible UX issue). Para E2E, validar que CTA premium sigue accesible.

---

## 7. Checklist resumido para QA

### Locatario
- [ ] Crear reserva con tarjeta → hold creado (ver logs `PaymentAuthorizationService`).
- [ ] Crear reserva con wallet → `wallet_lock_rental_and_deposit` retorna `success=true`.
- [ ] Completar check-in/out y confirmar sin daños → fondos liberados, guarantee devuelta.
- [ ] Reporte de daños por locador → locatario ve descuento en `amountToReturn` (`apps/web/src/app/shared/components/renter-confirmation/renter-confirmation.component.ts:71`).
- [ ] Cancelación antes de pago libera wallet/hold.

### Locador
- [ ] Publicar auto y verificar estado `active`.
- [ ] Recibir reserva, ver detalle en `BookingDetailPage` con chat activo.
- [ ] Registrar inspección check-in y check-out.
- [ ] Confirmar con daños >250 USD → validar error (`Validators.max(250)`).
- [ ] Confirmar sin daños → recibir mensaje de éxito y pago acreditado.

### Interacción
- [ ] Chat en tiempo real ambos lados.
- [ ] Reservas simultáneas (doble booking) y comportamiento del sistema.
- [ ] Tours guiados desactivados o adaptados en ambientes de prueba.

---

## 8. Próximos pasos

1. Incorporar filtro de disponibilidad en `CarsService.listActiveCars()` para ocultar autos ya bloqueados.
2. Migrar Tour Service a nuevo orquestador (ver `TOUR_GUIADO_REWRITE.md`).
3. Añadir telemetría unificada para hold rechazos y locks fallidos.
4. Documentar en Confluence/Notion este flujo con diagramas BPMN para comunicación con producto y QA manual.

Última actualización: 24/10/2025.
