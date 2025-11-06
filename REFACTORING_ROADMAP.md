# Roadmap de Refactorizaciones Pendientes

## ✅ Completado (2025-11-06)

**Total reducido: -1,358 líneas**

### Fase 1: Limpieza de código (-596 líneas)
- ✅ Eliminado `tour.service.ts` deprecado (477 líneas)
- ✅ `NotificationService` → `ToastService` (claridad semántica)
- ✅ Consolidada estructura de notificaciones
- ✅ Eliminadas carpetas innecesarias

### Fase 2: Models refactoring (-762 líneas)
- ✅ `models/index.ts`: 802 → 40 líneas
- ✅ Creados 6 archivos domain-specific:
  - `user.model.ts`
  - `car.model.ts`
  - `booking.model.ts`
  - `payment.model.ts`
  - `review.model.ts`
  - `bonus-malus.model.ts`
- ✅ Mejor tree-shaking
- ✅ Backward compatibility completa

---

## 🔄 Pendiente (Requiere Testing Exhaustivo)

### 1. BookingsService Refactoring (1,427 líneas)

**Objetivo**: Dividir en servicios especializados

**Complejidad**: 🔴 Alta
**Riesgo**: Crítico (lógica de negocio central)
**Tiempo estimado**: 6-8 horas + 4-6 horas de testing

**Plan de acción**:
```
bookings.service.ts (1,427)
  ↓
BookingsFacade (facade principal, ~200 líneas)
BookingPaymentService (~300 líneas)
BookingApprovalService (~250 líneas)
BookingInsuranceService (~200 líneas)
BookingPricingService (~200 líneas)
BookingValidationService (~150 líneas)
```

**Testing requerido**:
- [ ] Flujo completo de creación de booking
- [ ] Pagos con wallet y tarjeta
- [ ] Aprobación/rechazo de bookings
- [ ] Activación de seguros
- [ ] Cálculo de pricing con descuentos
- [ ] Cancelación de bookings
- [ ] Integración con wallet locks
- [ ] E2E tests de flujos críticos

**Referencias**:
- `/apps/web/src/app/core/services/bookings.service.ts`

---

### 2. PublishCarV2Page Refactoring (1,747 líneas)

**Objetivo**: Extraer sub-componentes reutilizables

**Complejidad**: 🔴 Alta
**Riesgo**: Medio (solo UI, no lógica de negocio)
**Tiempo estimado**: 6-8 horas + 2-4 horas de testing

**Plan de acción**:
```
publish-car-v2.page.ts (1,747)
  ↓
PublishCarPage (coordinador, ~200 líneas)
CarBasicInfoFormComponent (~300 líneas)
CarPhotosUploadComponent (~250 líneas)
CarLocationFormComponent (~200 líneas)
CarPricingFormComponent (~250 líneas)
CarInsuranceFormComponent (~200 líneas)
CarTermsFormComponent (~150 líneas)
PublishCarSidebarComponent (~150 líneas)
```

**Beneficios**:
- Componentes reutilizables en edición de autos
- Mejor testabilidad unitaria
- Reducción de cognitive load
- Mejor performance (lazy loading de secciones)

**Testing requerido**:
- [ ] Publicación completa de auto
- [ ] Edición de auto existente
- [ ] Validaciones de formulario
- [ ] Upload de fotos
- [ ] Geocoding de ubicación
- [ ] Integración con MercadoPago onboarding

**Referencias**:
- `/apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`

---

### 3. Wallet Services Consolidation (1,098 líneas)

**Objetivo**: Crear WalletFacade pattern

**Complejidad**: 🔴 Alta
**Riesgo**: Crítico (transacciones financieras)
**Tiempo estimado**: 4-6 horas + 6-8 horas de testing

**Plan de acción**:
```
wallet.service.ts (508)
wallet-ledger.service.ts (241)
payout.service.ts (349)
  ↓
WalletFacade (facade, ~300 líneas)
  - wallet.service.ts (refactored, ~300 líneas)
  - wallet-ledger.service.ts (mantener, ~241 líneas)
  - payout.service.ts (mantener, ~349 líneas)
```

**Approach conservador**:
- NO consolidar lógica financiera (riesgo alto)
- Crear facade que coordine servicios existentes
- Mantener servicios especializados intactos
- Reducir duplicación de lógica compartida

**Testing requerido (CRÍTICO)**:
- [ ] Depósitos via MercadoPago
- [ ] Bloqueo/desbloqueo de fondos
- [ ] Transacciones de wallet
- [ ] Retiros a cuenta bancaria
- [ ] Cálculo de balances disponibles/bloqueados
- [ ] Integración con bookings
- [ ] Manejo de créditos no retirables
- [ ] Ledger double-entry accounting
- [ ] E2E tests de flujos monetarios

**Referencias**:
- `/apps/web/src/app/core/services/wallet.service.ts`
- `/apps/web/src/app/core/services/wallet-ledger.service.ts`
- `/apps/web/src/app/core/services/payout.service.ts`

---

### 4. Payment Services Unification (7 servicios)

**Objetivo**: Arquitectura unificada de gateways

**Complejidad**: 🔴 Alta
**Riesgo**: Crítico (pagos de producción)
**Tiempo estimado**: 8-12 horas + 8-10 horas de testing

**Servicios involucrados**:
- `payments.service.ts`
- `checkout-payment.service.ts`
- `payment-authorization.service.ts`
- `payment-gateway.factory.ts`
- `mercadopago-booking-gateway.service.ts`
- `split-payment.service.ts`
- `paypal-*.service.ts` (múltiples)

**Plan de acción**:
```
PaymentFacade (coordinador)
  ↓
PaymentGatewayFactory (ya existe, mejorar)
  ├── MercadoPagoGateway (refactored)
  ├── PayPalGateway (refactored)
  └── WalletGateway (nuevo)

Compartido:
- PaymentAuthorizationService (mantener)
- SplitPaymentService (mantener)
```

**Beneficios**:
- Facilita agregar nuevos gateways
- Reduce duplicación entre gateways
- Mejora manejo de errores unificado
- Simplifica testing con mocks

**Testing requerido (CRÍTICO)**:
- [ ] Pagos con MercadoPago (sandbox + prod)
- [ ] Pagos con PayPal
- [ ] Split payments (owner + platform)
- [ ] Autorizaciones de tarjeta (holds)
- [ ] Webhooks de confirmación
- [ ] Manejo de pagos fallidos
- [ ] Refunds y devoluciones
- [ ] Idempotencia de webhooks
- [ ] E2E tests con payment providers

**Referencias**:
- `/apps/web/src/app/core/services/payments.service.ts`
- `/apps/web/src/app/core/services/checkout-payment.service.ts`
- `/apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts`

---

## 📊 Estimación de Impacto Total

| Métrica | Valor |
|---------|-------|
| **Líneas ya reducidas** | -1,358 |
| **Potencial adicional** | ~3,000-4,000 |
| **Total posible** | **-4,500 líneas** |
| **Tiempo total estimado** | 24-34 horas + 20-28 horas de testing |
| **Riesgo general** | 🔴 Alto (áreas críticas) |

---

## 🎯 Recomendaciones

### Priorización sugerida

1. **Corto plazo** (bajo riesgo):
   - ✅ Ya completado: Models refactoring
   - ✅ Ya completado: Deprecated code cleanup

2. **Mediano plazo** (testing moderado):
   - 🔄 PublishCarV2Page (1-2 sprints)
     - Menor riesgo (solo UI)
     - Alto impacto en maintainability

3. **Largo plazo** (testing exhaustivo):
   - 🔄 BookingsService (2-3 sprints)
   - 🔄 Wallet Services (2-3 sprints)
   - 🔄 Payment Services (3-4 sprints)

### Estrategia de ejecución

**Para cada refactorización grande**:
1. Branch feature dedicado
2. Implementación incremental con commits pequeños
3. Tests unitarios en paralelo
4. E2E tests de flujos críticos
5. Code review exhaustivo
6. Testing en staging por 1 semana
7. Deploy gradual a producción (feature flags)
8. Monitoring post-deploy intensivo

### Métricas de éxito

- ✅ 0 bugs críticos en producción
- ✅ Coverage de tests ≥ 80%
- ✅ Tiempo de build reducido ≥ 15%
- ✅ Bundle size reducido ≥ 10%
- ✅ Mejor performance en Lighthouse

---

## 📝 Notas

- **Backward compatibility**: Todas las refactorizaciones DEBEN mantener la API pública
- **Feature flags**: Implementar para rollback rápido
- **Monitoring**: Configurar alertas para detectar regresiones
- **Documentation**: Actualizar docs en paralelo a cada refactorización

---

**Última actualización**: 2025-11-06
**Responsable**: Claude Code Refactoring Session
**Estado**: Fase 1 y 2 completadas (-1,358 líneas)
