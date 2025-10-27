# Plan de Limpieza Lint & Tests

## Contexto
- Última ejecución `pnpm lint` (27/10/2025) falla con **8 errores** y **520 warnings** históricos.  
  - Errores resueltos en esta sesión: `@angular-eslint/no-output-native` (se renombró `cardError`).  
  - Errores remanentes: principalmente `no-explicit-any`, `no-unused-vars`, `use-lifecycle-interface`, `import/order`.
- `pnpm test:quick` (ChromeHeadless) finaliza con **39 fallos**, concentrados en specs que invocan RPC reales (`availability.service.spec.ts`, `booking-logic.test.ts`, etc.) y propagan timeouts/errores de red.
- Objetivo: dejar `pnpm lint` y `pnpm test:quick` en verde sin suprimir reglas ni comentar specs.

## Backlog Lint (prioridad por impacto)
1. **Servicios y specs con `any`**  
   - `apps/web/src/app/core/database/rpc-functions.spec.ts` (~14 ocurrencias).  
   - `apps/web/src/app/core/services/availability.service.spec.ts`, `booking-logic.test.ts`, `payments.service.spec.ts`.  
   - Servicios de guided-tour (`shepherd-adapter`, `telemetry-bridge`, `tour-orchestrator`).
2. **Imports/variables sin uso**  
   - `TourGuard`, `TourTrigger`, helpers en specs.  
   - `computed` en `deposit-modal`, `MercadoPagoCardFormData`.
3. **Reglas estructurales**  
   - `@angular-eslint/use-lifecycle-interface` (añadir `implements OnDestroy`).  
   - `import/order` en `tabs.routes.ts`.
4. **Utilities con tipos débiles**  
   - `car-placeholder-images.ts`, `environment.base.ts`, `wallet-balance-card.component.ts`.

## Backlog Tests
1. **Specs dependientes de Supabase (RPC/timeouts)**  
   - `availability.service.spec.ts`, `booking-logic.test.ts`, `payments.service.spec.ts`.  
   - Problema: llamadas reales a `supabase.rpc/is_car_available` → `Network error` / `Database timeout`.  
   - Solución: mock de `injectSupabase()` con `jest.spyOn`/stubs y fixtures locales.
2. **Suite `booking-detail-payment.page`**  
   - Validar que nuevos flujos (creación de booking y FX) tengan cobertura; ajustar tests si asumen el viejo `checkout`.  
3. **Smoke tests de componentes Ionic**  
   - Revisar `owner-bookings` tras reemplazar `alert/confirm` por `IonAlertController` (agregar mocks).

## Plan Multisesión
### ✅ Fase 1 – Estabilizar pruebas (bloqueante) [COPILOT - EN PROGRESO]
1. ✅ Añadir mock central para `injectSupabase()` en specs críticas (availability, booking-logic, payments).  
2. ✅ Crear fixtures (`tests/fixtures/availability/*.json`) para respuestas RPC.  
3. ⏳ Ejecutar `pnpm test:quick` hasta obtener 0 fallos.

**Progreso Copilot (Actualizado 2025-10-27 07:45):**
- ✅ Creados mocks centrales en `tests/mocks/supabase-mock.ts` y `apps/web/src/testing/mocks/`
- ✅ Creados fixtures JSON en `tests/fixtures/availability/`
- ✅ 8 errores de lint corregidos (0 errores, 517 warnings restantes)
- ✅ Creado helper global responsive UI: `apps/web/src/testing/helpers/responsive-test-helpers.ts` (200 líneas)
- ✅ Integrados mocks en `availability.service.spec.ts` y `availability-performance.spec.ts`
- ✅ Actualizado `my-bookings-mobile.spec.ts` con responsive helpers (matchMedia, ResizeObserver)
- ✅ Guided Tour y Payments specs actualizados para evitar dependencias reales
- ⏳ Ejecutando `pnpm test:quick` para verificar reducción de fallos
- Archivos modificados Sesión 1:
  - `apps/web/src/app/core/services/mercado-pago-script.service.ts` (Object → object)
  - `apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts` (@ts-ignore → @ts-expect-error)
  - `apps/web/src/app/core/services/push-notification.service.ts` (escape regex)
  - `apps/web/src/app/core/services/risk-calculator.service.ts` (case block declarations)
  - `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts` (constant condition)
  - `apps/web/src/app/features/explore/explore.page.ts` (empty lifecycle)
  - `apps/web/src/app/core/services/error-handling.spec.ts` (any → unknown)
- Archivos nuevos/modificados Sesión 2:
  - `apps/web/src/testing/helpers/responsive-test-helpers.ts` (NUEVO)
  - `apps/web/src/testing/mocks/supabase-mock.ts` (NUEVO)
  - `apps/web/src/app/core/services/availability*.spec.ts` (imports actualizados)
  - `apps/web/src/app/features/bookings/my-bookings/my-bookings-mobile.spec.ts` (integrado helpers)

**Próximo paso:** Verificar resultado test:quick, integrar mocks restantes si necesario.

### Fase 2 – Tipado y limpieza lint
1. Tipar utils y servicios (`car-placeholder-images`, `mercado-pago-card-form`, `wallet-balance-card`).  
2. Actualizar specs para reemplazar `any` por tipos concretos o generics.  
3. Remover imports/variables sin uso y alinear `OnDestroy`.

### Fase 3 – Reforzar cobertura y reglas
1. Añadir tests para el nuevo flujo `car-detail → booking detail payment` (creación previa de booking).  
2. Activar `pnpm lint --max-warnings=0` en CI.  
3. Documentar convenciones de mocks Supabase en `docs/testing/`.

## Métricas de salida esperadas
- `pnpm lint` → exit code 0, sin warnings críticos (objetivo: ≤10 avisos benignos).  
- `pnpm test:quick` → exit code 0, 0 fallos.  
- Documento de buenas prácticas actualizado + checklist de regresión para flujos de locador/locatario.

## 🔒 Fase 4 (Nueva) – Correcciones de Seguridad Supabase

**Prioridad:** CRÍTICA (después de Fase 1 completa)

Supabase Database Linter detectó **30 errores de seguridad** que requieren atención:

### Issues Identificados:
- **1 issue crítico:** Vista `v_payment_authorizations` expone `auth.users` a roles anon/authenticated
- **27 issues:** Vistas con `SECURITY DEFINER` que pueden bypassear RLS
- **2 issues críticos:** Tablas sin RLS habilitado (`spatial_ref_sys`, `platform_config`)

### Acción Inmediata (P0):
1. Revocar acceso público a `spatial_ref_sys`
2. Habilitar RLS en `platform_config` con política apropiada
3. Auditar y corregir `v_payment_authorizations`

### Plan Completo:
Ver documento detallado: `docs/reports/SUPABASE_SECURITY_LINTER_ISSUES.md`

---

**Referencias:**
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- Reporte completo: `docs/reports/SUPABASE_SECURITY_LINTER_ISSUES.md`
