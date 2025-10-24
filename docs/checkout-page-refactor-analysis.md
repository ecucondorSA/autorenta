# Checkout Page Refactor Assessment

## Current State

- El componente original concentraba más de 500 líneas combinando lógica de negocio, estado UI y llamadas a servicios, dificultando su prueba y mantenimiento.
- Se empleaban señales y `computed`, pero sin efectos coordinados que garantizaran la sincronización entre la reserva, los parámetros FGO y el método de pago seleccionado.
- Los tres flujos de pago (wallet, parcial, tarjeta) compartían pasos similares, duplicando validaciones y actualizaciones.

## Problemas Críticos Identificados

- **Orden de carga roto**: `ngOnInit` disparaba `loadFgoParameters` antes de terminar `loadBooking`, por lo que `this.booking()` permanecía en `null` y los parámetros FGO nunca se cargaban (`checkout.page.ts:172`, `checkout.page.ts:581`). El UI quedaba con valores por defecto y los snapshots fallaban.
- **Estado inicial inconsistente**: `selectedPaymentMethod` iniciaba en `'credit_card'` aunque la reserva podía venir con otro método y nunca se sincronizaba tras cargarla (`checkout.page.ts:41`, `checkout.page.ts:471`), afectando cálculos de depósito y textos.
- **Depósitos no reactivos**: `calculateDepositAmount` dependía del método de pago, pero solo se recalculaba al cargar la reserva o al forzar `ensureDepositAmount`. Cambiar la selección en UI no actualizaba los montos mostrados hasta el intento de pago (`checkout.page.ts:493`).
- **Sin reversión de locks**: si `updateBooking` o `createIntent` fallaban tras bloquear fondos, nunca se liberaban los montos en wallet (`checkout.page.ts:244`, `checkout.page.ts:301`). No había manejo transaccional.
- **Integración MercadoPago acoplada**: la página construía la URL de la Edge Function y hacía `fetch` directo (`checkout.page.ts:383`), rompiendo la separación de capas y exponiendo la URL de Supabase.
- **Flujo parcial incompleto**: el camino `partial_wallet` creaba un intent pero no generaba preferencia ni manejaba el retorno; un `setTimeout` marcaba la reserva como pagada sin confirmación (`checkout.page.ts:314`, `checkout.page.ts:341`).
- **Timeout casero**: `Promise.race` con `setTimeout` para snapshots podía dejar promesas rechazadas sin manejar (`checkout.page.ts:671`).
- **Navegación con temporizadores**: la redirección tras wallet dependía de `setTimeout`, aun si `router.navigate` se disparaba nuevamente (`checkout.page.ts:281`).

## Reestructura Aplicada

1. **`CheckoutStateService`**  
   Servicio inyectado por componente que centraliza señales (`booking`, `status`, `paymentMethod`, `depositUsd`, `guarantee`, etc.), garantiza la inicialización secuencial (`booking` → parámetros FGO → FX) y expone `asReadonly()` para la plantilla.

2. **`CheckoutPaymentService`**  
   Caso de uso que orquesta los flujos de pago:
   - Bloqueo y reversión segura en wallet (`safeUnlockWallet`).
   - Actualización de booking y recálculo de pricing.
   - Delegación a `MercadoPagoBookingGateway` para obtener `init_point`.
   - Creación de snapshots no bloqueante usando `timeout` de RxJS.

3. **Servicios de soporte**  
   - `FranchiseTableService`: calcula bucket, franquicia estándar/rollover y mínimos ARS.  
   - `CheckoutRiskCalculator`: calcula hold estimado, crédito de seguridad y contribuciones.  
   - `GuaranteeCopyBuilder`: genera copy dinámico para checkout/voucher.  
   - `MercadoPagoBookingGateway`: encapsula `supabase.functions.invoke`.

4. **Pago mixto habilitado**  
   - Bloqueo del monto parcial en wallet con reversión segura ante errores.  
   - Actualización del booking a `pending_payment`, creación del intent y redirección a Mercado Pago.  
   - Mensajería específica y snapshots FGO coherentes con el mix wallet + tarjeta.

5. **Plantilla simplificada**  
   - Ya no se usa `setTimeout` para navegación ni simuladores `createIntent`.
   - El card de garantías consume `guaranteeCopy()` y `guaranteeWaterfallSteps()` derivados del nuevo estado.
   - El CTA refleja estado `processing` combinado con `state.loading`.

## Próximos Pasos

- Evaluar si la Edge Function debe recibir el monto en tarjeta cuando existan splits personalizados.
- Añadir pruebas unitarias para `CheckoutRiskCalculator` y `FranchiseTableService`, junto con pruebas de integración (Cypress) que mockeen respuestas de wallet y MercadoPago.
- Crear un job backend que revalide `fxSnapshot` (±10 % o >7 días) y actualice snapshots en consecuencia.
- Instrumentar métricas RC/LR/hit-rate en dashboards, usando los snapshots generados.
