# AUTORENTA - CHECKLIST ITERACIÓN 2

**Fecha:** 2025-12-28
**Basado en:** Backlog de CHECKLIST_FIXES_2025-12-27.md + Nuevas mejoras
**Enfoque:** Calidad de datos, DX, y robustez

---

## LEYENDA

- [ ] Pendiente
- [x] Completado
- `ALTO` - Alto impacto, hacer primero
- `MEDIO` - Impacto moderado
- `BAJO` - Nice to have

---

## 1. CALIDAD DE DATOS (Impacto directo en UX)

### 1.1 Validación de Autos
- [x] `ALTO` Validar al menos 1 foto al publicar auto (UI valida 3 fotos min + RPC filtra autos sin fotos)
- [x] `ALTO` Agregar validación de precio máximo ($500/día) (Form + DB constraint)
- [x] `MEDIO` Agregar imagen placeholder por defecto (car-placeholder.util.ts ya existía)
- [x] `MEDIO` Mostrar badge "Sin foto" en listado de autos (car-card.component)
- [ ] `BAJO` Agregar placeholder visual si falta título

### 1.2 Limpieza de Datos
- [x] `ALTO` Crear script de limpieza de datos de prueba (scripts/maintenance/cleanup-data.sql)
- [x] `MEDIO` Identificar y archivar reservas antiguas (> 1 año) (maintenance_get_data_health_report)
- [x] `MEDIO` Verificar consistencia de estados de reservas (maintenance_get_data_health_report)
- [x] `MEDIO` Limpiar notificaciones antiguas (> 6 meses) (maintenance_cleanup_old_notifications)
- [x] `BAJO` Identificar cuentas de prueba para marcar/eliminar (maintenance_identify_test_accounts)
- [ ] `BAJO` Verificar consistencia de datos de wallet

---

## 2. SEGURIDAD Y RATE LIMITING

### 2.1 Edge Functions Rate Limiting
- [x] `ALTO` Rate limiting en mercadopago-process-booking-payment (ya existía)
- [x] `ALTO` Rate limiting en wallet-deposit/withdraw functions (+ fail-closed fix)
- [x] `ALTO` Rate limiting en mp-create/capture/cancel-preauth (NUEVO)
- [x] `ALTO` Rate limiting en paypal-create-order/capture-order (NUEVO)
- [x] `ALTO` Fix FAIL-OPEN vulnerability en brick-payment y deposit-payment
- [x] `MEDIO` Rate limiting en funciones de búsqueda (N/A - búsqueda usa RPC, no Edge Functions)
- [x] `MEDIO` Implementar sliding window rate limiter compartido (ya existía)

### 2.2 PII y Datos Sensibles
- [x] `MEDIO` Auditar todos los campos sensibles en metadata (docs/PII_METADATA_AUDIT.md - No PII encontrado)
- [x] `MEDIO` Documentar política de retención de datos (docs/DATA_RETENTION_POLICY.md)
- [ ] `BAJO` Evaluar encriptación de PII en reposo
- [x] `BAJO` Documentar dominios CORS permitidos (docs/CORS_DOMAINS.md)

---

## 3. CODE QUALITY Y TYPE SAFETY

### 3.1 TypeScript Strictness
- [x] `MEDIO` Habilitar strict null checks gradualmente (Ya habilitado: strict: true en tsconfig.json)
- [x] `MEDIO` Reducir uso de `any` types (auditar con ESLint) (Solo 9 any en todo el codebase!)
- [x] `BAJO` Agregar ESLint rule para prohibir `any` (Ya existe: no-explicit-any: warn)

### 3.2 Error Handling
- [x] `MEDIO` Implementar error boundaries en componentes críticos (ErrorBoundaryComponent)
- [x] `MEDIO` Crear componente ErrorBoundary global (shared/components/error-boundary/)
- [ ] `BAJO` Agregar fallback UI para errores de carga

### 3.3 Utilities Compartidos
- [x] `MEDIO` Crear DateUtils service (formateo, parsing, timezone) (shared/utils/date.utils.ts - 299 líneas)
- [x] `MEDIO` Crear MoneyUtils service (formateo multi-currency) (shared/utils/money.utils.ts - 286 líneas)
- [x] `BAJO` Unificar helpers de formateo en shared/utils (date.utils + money.utils)

---

## 4. OBSERVABILIDAD Y LOGGING

### 4.1 Structured Logging
- [x] `MEDIO` Implementar formato JSON para logs en producción (_shared/logger.ts - outputJson)
- [x] `MEDIO` Agregar correlation IDs a requests (_shared/request-context.ts + logger.ts)
- [ ] `BAJO` Crear dashboard de logs en Sentry

### 4.2 Métricas Adicionales
- [x] `ALTO` Tracking de conversión de reservas (vista → reserva → pago) (+ nuevos eventos)
- [x] `ALTO` Fix admin-analytics tabla incorrecta (analytics_events → conversion_events)
- [x] `MEDIO` Métricas de performance de queries SQL (query_performance_log + RPCs)
- [x] `MEDIO` Dashboard de circuit breakers (alertas automáticas) (Ya existe en system-monitoring.page.ts)
- [ ] `BAJO` Métricas de uso de wallet

---

## 5. TESTING

### 5.1 Load Testing
- [x] `MEDIO` Load test de Edge Functions principales (scripts/load-tests/edge-functions-load-test.ts)
- [x] `MEDIO` Benchmark de queries SQL críticas (scripts/load-tests/sql-queries-benchmark.ts)
- [ ] `BAJO` Stress test de búsqueda de autos

### 5.2 Integration Testing
- [x] `MEDIO` Tests E2E para flujo de disputa (e2e/specs/booking/disputes.spec.ts)
- [x] `MEDIO` Tests E2E para flujo de daños (e2e/specs/booking/damages.spec.ts)
- [ ] `BAJO` Tests de regresión automatizados

---

## 6. ARQUITECTURA (Event Sourcing)

### 6.1 Audit Trail de Pagos
- [x] `MEDIO` Crear tabla booking_payment_events (migración 20251228_booking_payment_events.sql)
- [x] `MEDIO` Registrar todos los cambios de estado de pago (log_payment_event RPC)
- [ ] `BAJO` Implementar replay de eventos para debugging
- [x] `BAJO` Vista de historial de pago para admin (get_booking_payment_history RPC)

---

## 7. DOCUMENTACIÓN

### 7.1 Código
- [ ] `BAJO` Documentar funciones RPC con JSDoc
- [ ] `BAJO` Agregar comentarios a lógica compleja
- [ ] `BAJO` README por feature principal

### 7.2 API
- [x] `MEDIO` Crear Postman collection para Edge Functions (docs/postman/)
- [ ] `BAJO` Documentar webhooks de MercadoPago
- [ ] `BAJO` Swagger/OpenAPI para Edge Functions

### 7.3 Operaciones
- [x] `MEDIO` Documentar flujo de deploy (CI/CD) (docs/CI_CD_WORKFLOW.md)
- [x] `MEDIO` Crear runbook de incidentes (docs/INCIDENT_RUNBOOK.md)
- [ ] `BAJO` Documentar proceso de rollback
- [ ] `BAJO` Guía de troubleshooting

---

## RESUMEN POR PRIORIDAD

| Prioridad | Completado | Total | Enfoque |
|-----------|------------|-------|---------|
| ALTO | 10 | 10 | Validación, Rate Limiting, Conversión, Security |
| MEDIO | 24 | 24 | Calidad, Observabilidad, Testing, Documentación |
| BAJO | 6 | 18 | Documentación adicional, Nice-to-have |
| **TOTAL** | **40** | **52** | |

---

## PROGRESO

```
ALTO:   [x] [x] [x] [x] [x] [x] [x] [x] [x] [x]  10/10  (100%) ✅
MEDIO:  [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x] [x]  24/24  (100%) ✅
BAJO:   [x] [x] [x] [x] [x] [x] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  6/18  (33%)

TOTAL:  40/52 (77%)
```

---

## PLAN DE EJECUCIÓN SUGERIDO

### Fase 1: Calidad de Datos (1-2 días)
1. Validación de fotos y precios al publicar
2. Script de limpieza de datos

### Fase 2: Rate Limiting Edge Functions (1 día)
1. Implementar rate limiter compartido
2. Aplicar a funciones de pago

### Fase 3: Observabilidad (1-2 días)
1. Tracking de conversión
2. Structured logging

### Fase 4: Code Quality (ongoing)
1. Strict null checks
2. Error boundaries
3. Utilities compartidos

---

## NOTAS

- Priorizar items ALTO primero
- Algunos items BAJO pueden ser descartados si no aportan valor
- Revisar prioridades después de cada fase

---

*Checklist generado por Claude Code*
*Fecha de creación: 2025-12-28*
