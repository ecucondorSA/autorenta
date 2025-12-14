# AutoRenta ↔︎ Turo/Tripwip: Backlog Accionable

Fuente principal: `../COMPETITIVE_ANALYSIS_TURO_TRIPWIP.md` (2025-12-12).

Este documento traduce el análisis competitivo a un backlog **ejecutable** (qué falta, qué ya existe, y qué pasos concretos siguen).

## Estado actual (ya existe en AutoRenta)

### Feature Flags + A/B (parcial)
- Modelos: `src/app/core/models/feature-flag.model.ts`
- Servicio: `src/app/core/services/feature-flag.service.ts`
- UI Admin (lazy chunk detectado en build): `admin-feature-flags-page`

**Gap:** falta usar flags en flujos críticos (checkout/onboarding) con variantes medibles y rollout.

### Verificación (parcial)
- Flujo de verificación/documentos: `src/app/features/verification/verification.page.ts`

**Gap:** no hay KYC “provider-grade” (liveness/AML) ni callbacks/webhooks automatizados.

### Dynamic Pricing (parcial)
- Servicio: `src/app/core/services/dynamic-pricing.service.ts`
- Campo: `cars.uses_dynamic_pricing` (varias referencias)
- Calendario de disponibilidad + bloqueos: `src/app/features/cars/availability-calendar/availability-calendar.page.ts`
- Bulk blocking: `src/app/features/cars/bulk-blocking/*`

**Gap:** falta “calendar day view” y edición de precio por día / bulk pricing dentro del calendario.

### Incident Detector (iniciado, no integrado)
- Servicio: `src/app/core/services/incident-detector.service.ts`

**Gap:** no está cableado al ciclo de vida de un viaje/booking (start/stop), ni tiene UX completa de post-incidente.

### Biometría (iniciada, no integrada)
- Servicio: `src/app/core/services/biometric-auth.service.ts`

**Gap:** no se usa para proteger acciones críticas (pago, retiro, confirmaciones).

---

## Backlog priorizado (acciones)

### P0 (30 días): Seguridad + antifraude + disputas

1) KYC Provider (Veriff / MercadoPago KYC / Socure)
- Objetivo: reducir fraude de identidad y chargebacks; subir confianza owners.
- Trabajo backend:
  - Tabla `identity_verifications` + índices.
  - Edge Function `veriff-create-session` + `veriff-webhook` (o equivalente MP KYC).
  - Políticas/RLS para lectura por el usuario y escritura por service role.
- Trabajo frontend:
  - Integrar provider dentro del flujo actual de `VerificationPage` o agregar `IdentityVerificationPage`.
  - Mostrar estado “started/pending/approved/declined” y CTA claro.
- Dependencias: claves provider, endpoints, y wiring con perfil (`profiles.id_verified`).

2) Incident Detector end-to-end
- Objetivo: detección temprana → menos disputas.
- Trabajo:
  - Definir estados de “trip activo” (por status + rango de fechas) y enganchar `startMonitoring(bookingId)`/`stopMonitoring()`.
  - Persistencia: tabla `incident_reports` (si no existe) + payload mínimo (g-force, geo, buffer).
  - UX: pantalla/modal post-incidente (confirmar/descartar, subir evidencia) + notificación owner/soporte.
- Archivos base: `src/app/core/services/incident-detector.service.ts`.

3) Biometría en acciones críticas
- Objetivo: fricción baja + seguridad alta.
- Trabajo:
  - Agregar “gating” opcional (feature flag + setting del usuario) para:
    - Pago de booking (`BookingDetailPaymentPage`)
    - Depósitos/retiros (`DepositPage`, wallet flows)
    - Confirmaciones sensibles (ej. release/confirm booking)
  - UX: fallbacks y copy (“usar PIN del sistema”).

### P1 (60 días): Monetización + conversión

4) Insurance Upsell (planes)
- Objetivo: revenue adicional + menor exposición.
- Trabajo:
  - DB: `insurance_plans`, relación en `bookings` (plan/costo).
  - UI: selector de plan dentro del checkout/pago.
  - Pricing breakdown: incluir costo seguro + fee platform.
  - Analytics: funnel plan selection → conversion.

5) Checkout A/B (v2/v3)
- Objetivo: iterar sin romper conversión.
- Trabajo:
  - Flag/variant: `checkout_version` (rollout %).
  - Componentización: `BookingDetailPaymentV2` vs `V3` o variantes internas.
  - Métricas: eventos comparables (view, start, success, fail, time-to-pay).

### P2 (90 días): Growth/attribution + tooling

6) Branch.io (deferred deep linking + attribution)
- Objetivo: links que funcionan sin app instalada + tracking de campañas.
- Trabajo:
  - Integración SDK (Capacitor/Cordova según stack).
  - `AppComponent` session init + router mapping (`car_id`, `booking_id`).
  - Generación de links desde share flows (ej. car detail).

7) Dynamic Pricing Calendar (day view + bulk pricing)
- Objetivo: owners maximizan revenue y control.
- Trabajo:
  - UI: vista mes + día, edición precio por día, bulk pricing y demand hints.
  - RPC: `set_bulk_car_pricing` (si no existe).
  - Integración con `DynamicPricingService` + `uses_dynamic_pricing`.

### P3 (120+ días): Observabilidad + pagos

8) APM/observabilidad (NewRelic/Datadog) + Sentry hardening
- Objetivo: detectar y resolver issues rápido.
- Trabajo:
  - Definir estándar de breadcrumbs, tags (booking_id, user_id), performance traces.

9) Google Pay
- Objetivo: subir conversión en checkout.
- Trabajo:
  - Evaluar compatibilidad con MercadoPago/alternativa (Stripe/GPay).

---

## Notas de “permisos críticos” (Android)
El análisis sugiere permisos adicionales (biometría, foreground service location, attribution). Esto tiene impacto en Play Store policies; tratar como tarea separada con revisión legal/producto antes de mergear.

