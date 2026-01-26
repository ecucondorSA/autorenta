# 🗄️ Auditoría de Base de Datos, Testing y CI/CD

> **Fecha de Auditoría:** 2026-01-09
> **Versión:** v1.0
> **Alcance:** Schema DB, Cobertura de Tests, Pipeline CI/CD
> **Veredicto:** ⚠️ **DEUDA TÉCNICA IDENTIFICADA**

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Auditoría de Schema de Base de Datos](#-auditoría-de-schema-de-base-de-datos)
   - [Inventario de Tablas](#inventario-de-tablas)
   - [Índices y Performance](#índices-y-performance)
   - [Estructura de Migraciones](#estructura-de-migraciones)
3. [Auditoría de Testing](#-auditoría-de-testing)
   - [Cobertura de Tests Unitarios](#cobertura-de-tests-unitarios)
   - [Tests E2E](#tests-e2e)
   - [Áreas Sin Cobertura](#áreas-sin-cobertura)
4. [Auditoría de CI/CD](#-auditoría-de-cicd)
   - [Inventario de Workflows](#inventario-de-workflows)
   - [Gates de Calidad](#gates-de-calidad)
   - [Monitoreo y Alertas](#monitoreo-y-alertas)
5. [Matriz de Deuda Técnica](#-matriz-de-deuda-técnica)
6. [Recomendaciones](#-recomendaciones)

---

## 📊 Resumen Ejecutivo

### Panel de Estado

| Categoría | Estado | Puntuación |
|-----------|--------|------------|
| **Schema DB** | ⚠️ Funcional | 70/100 |
| **Testing** | ⚠️ Parcial | 55/100 |
| **CI/CD** | ✅ Robusto | 85/100 |

### Métricas Clave

| Métrica | Valor | Meta |
|---------|-------|------|
| Tablas en DB | 60+ | N/A |
| Índices | 550+ | N/A |
| Archivos de Test | 79 | 150+ |
| Describe Blocks | 270+ | 500+ |
| Workflows CI/CD | 45 | N/A |
| Coverage Target | 60% | 80% |

---

## 🗄️ Auditoría de Schema de Base de Datos

### Inventario de Tablas

**Total de CREATE TABLE statements:** 160+ (incluye duplicados en migraciones)

#### Tablas Core

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `profiles` | `00_foundation.sql` | Perfiles de usuario |
| `cars` | `01_core.sql` | Vehículos listados |
| `bookings` | `01_core.sql` | Reservas |
| `payments` | `01_core.sql` | Pagos |
| `payment_intents` | `01_core.sql` | Intenciones de pago |
| `reviews` | `01_core.sql` | Reseñas |

#### Tablas Financieras

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `wallet_transactions` | `01_core.sql` | Transacciones de wallet |
| `payment_splits` | `04_archive_late.sql` | Splits de pago (DEPRECATED) |
| `accounting_ledger` | `03_archive.sql` | Libro contable |
| `accounting_provisions` | `03_archive.sql` | Provisiones |
| `withdrawal_requests` | `03_archive.sql` | Solicitudes de retiro |
| `subscriptions` | `restore_subscription_logic.sql` | Suscripciones |

#### Tablas de Riesgo/FGO

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `fgo_parameters` | `03_archive.sql` | Parámetros FGO |
| `fgo_subfunds` | `03_archive.sql` | Subfondos FGO |
| `fgo_movements` | `03_archive.sql` | Movimientos FGO |
| `booking_risk_snapshot` | `03_archive.sql` | Snapshots de riesgo |
| `booking_inspections` | `03_archive.sql` | Inspecciones |

#### Tablas de Verificación

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `user_verifications` | `03_archive.sql` | Verificaciones KYC |
| `user_identity_levels` | `fix_verification_sync.sql` | Niveles de identidad |
| `insurance_verifications` | `byoi_insurance_verification.sql` | Verificación de seguros |

---

### Índices y Performance

**Total de CREATE INDEX statements:** 550+

#### Patrones de Indexación Observados

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| FK Index | ✅ Generalizado | `idx_cars_owner_id` |
| Status Index | ✅ Generalizado | `idx_bookings_status` |
| Date Index | ✅ Generalizado | `idx_bookings_created_at DESC` |
| Composite Index | ⚠️ Parcial | `idx_subscriptions_user_status` |
| Partial Index | ✅ Presente | `WHERE plate IS NOT NULL` |

#### Índices Faltantes Potenciales

| Tabla | Columna(s) | Justificación |
|-------|------------|---------------|
| `bookings` | `(car_id, start_at, end_at)` | Consultas de disponibilidad |
| `payments` | `(booking_id, status)` | Consultas de estado de pago |
| `wallet_transactions` | `(user_id, type, status)` | Balance queries |

---

### Estructura de Migraciones

**Total de archivos de migración:** 79

#### Problema: Migraciones Monolíticas

| Archivo | Tamaño | Líneas | Estado |
|---------|--------|--------|--------|
| `03_archive.sql` | 1.89 MB | 50,000+ | ⚠️ Muy grande |
| `04_archive_late.sql` | 30 KB | 900+ | ⚠️ Grande |
| `01_core.sql` | 28 KB | 892 | ✅ Razonable |
| `02_pricing.sql` | 25 KB | 700+ | ✅ Razonable |

**Riesgo:** Las migraciones "archive" son difíciles de revisar y depurar.

#### Recomendación

Dividir migraciones grandes en archivos temáticos:
- `03_archive_fgo.sql`
- `03_archive_accounting.sql`
- `03_archive_notifications.sql`

---

## 🧪 Auditoría de Testing

### Cobertura de Tests Unitarios

**Archivos de test encontrados:** 79 (`.spec.ts` y `.test.ts`)

#### Distribución por Dominio

| Dominio | Archivos | Estado |
|---------|----------|--------|
| `payments/` | 25 | ✅ Alto |
| `bookings/` | 23 | ✅ Alto |
| `cars/` | 10 | ⚠️ Medio |
| `auth/` | 10 | ⚠️ Medio |
| `verification/` | 4 | ⚠️ Bajo |
| `infrastructure/` | 5 | ⚠️ Bajo |
| `geo/` | 2 | ❌ Bajo |

#### Tests por Servicio (Ejemplos)

```
core/services/payments/
├── accounting.service.spec.ts
├── bonus-malus.service.spec.ts
├── dynamic-pricing.service.spec.ts (426 líneas, 15 describe blocks)
├── fx.service.spec.ts
├── mercadopago-payment.service.spec.ts (508 líneas, 5 describe blocks)
├── payment-orchestration.service.spec.ts
├── pricing.service.spec.ts
├── settlement.service.spec.ts
├── split-payment.service.spec.ts (DEPRECATED pero testeado)
└── wallet-ledger.service.spec.ts
```

---

### Tests E2E

**Framework:** Playwright

**Configuración:** `e2e/playwright.config.ts`

#### Workflows E2E

| Workflow | Timeout | Trigger |
|----------|---------|---------|
| `e2e-tests.yml` | 20 min | Push/PR a main |
| `patchright-e2e.yml` | Variable | Manual |
| `critical-tests` | 10 min | Push/PR |

#### Tags de Prioridad

```typescript
// Uso en tests E2E
test('@critical Login flow', async ({ page }) => { ... });
test('@smoke Booking creation', async ({ page }) => { ... });
```

---

### Áreas Sin Cobertura

#### Servicios Críticos Sin Tests Adecuados

| Servicio | Importancia | Estado Test |
|----------|-------------|-------------|
| `RewardPoolService` | 🔴 Crítico | ❌ No existe |
| `PointsLedgerService` | 🔴 Crítico | ❌ No existe |
| `TreasuryService` | 🔴 Crítico | ❌ No existe |
| `FgoV1_1Service` | 🟠 Alto | ⚠️ Parcial |
| `BookingFlowService` | 🟠 Alto | ✅ Existe |

#### Componentes UI Sin Tests

```
features/
├── bookings/
│   ├── pages/booking-wizard/     # ❌ Sin tests
│   ├── components/               # ⚠️ Parcial
│   └── checkout/                 # ⚠️ Parcial
├── cars/
│   ├── publish-car-v2/           # ❌ Sin tests
│   └── detail/                   # ⚠️ Parcial
└── wallet/                       # ⚠️ Parcial
```

---

## 🔄 Auditoría de CI/CD

### Inventario de Workflows

**Total de workflows:** 45

#### Categorías

| Categoría | Cantidad | Ejemplos |
|-----------|----------|----------|
| **Build/Deploy** | 5 | `ci.yml`, `build-and-deploy.yml` |
| **Testing** | 6 | `e2e-tests.yml`, `code-coverage.yml` |
| **Security** | 3 | `security-scan.yml`, `fraud-detection-alerts.yml` |
| **Monitoring** | 10 | `error-rate-monitoring.yml`, `uptime-monitoring.yml` |
| **Financial Ops** | 8 | `payment-reconciliation.yml`, `wallet-balance-audit.yml` |
| **Automation** | 5 | `auto-merge-dependabot.yml`, `cleanup-expired-data.yml` |
| **Reporting** | 4 | `daily-metrics-report.yml`, `weekly-business-summary.yml` |
| **Maintenance** | 4 | `database-backup-verify.yml`, `update-exchange-rates.yml` |

---

### Gates de Calidad

#### Configuración Actual (`ci.yml`)

```yaml
# Gates Requeridos (Bloquean merge)
- build-gate    # TypeScript Check + Build
- lint-gate     # ESLint

# Quality Checks (Informativos)
- unit-tests    # NOT blocking (TODO: fix 167 tests)
- e2e-tests     # NOT blocking
- bundle-analysis
```

#### Problema Identificado

> *"TODO: Make required after fixing 167 tests"* (ci.yml línea 80-81)

Los tests unitarios **NO bloquean** el merge actualmente. Esto permite que código roto llegue a producción.

---

### Monitoreo y Alertas

#### Workflows de Monitoreo Activos

| Workflow | Frecuencia | Propósito |
|----------|------------|-----------|
| `error-rate-monitoring.yml` | Horario | Tasas de error |
| `mercadopago-api-health.yml` | Horario | Salud de MP API |
| `wallet-balance-audit.yml` | Diario | Auditoría de balances |
| `payment-reconciliation.yml` | Diario | Reconciliación |
| `slow-query-detection.yml` | Diario | Queries lentas |
| `uptime-monitoring.yml` | Continuo | Disponibilidad |
| `fraud-detection-alerts.yml` | Continuo | Detección de fraude |

#### Reportes Automáticos

| Workflow | Frecuencia | Destinatario |
|----------|------------|--------------|
| `daily-metrics-report.yml` | Diario | Equipo |
| `weekly-business-summary.yml` | Semanal | Stakeholders |

---

## 📊 Matriz de Deuda Técnica

### Prioridad Alta (Bloquea producción segura)

| ID | Deuda | Impacto | Esfuerzo |
|----|-------|---------|----------|
| TD-001 | Tests no bloquean CI | Regresiones llegan a prod | 4h |
| TD-002 | 167 tests rotos | Falsa confianza en CI | 16h |
| TD-003 | Migraciones monolíticas | Difícil auditoría | 8h |

### Prioridad Media (Mejora calidad)

| ID | Deuda | Impacto | Esfuerzo |
|----|-------|---------|----------|
| TD-004 | Booking Wizard sin tests | Bugs en flujo crítico | 8h |
| TD-005 | Coverage < 60% | Áreas sin verificar | 20h |
| TD-006 | FgoV1_1Service sin tests completos | Riesgo en FGO | 12h |

### Prioridad Baja (Mejora mantenibilidad)

| ID | Deuda | Impacto | Esfuerzo |
|----|-------|---------|----------|
| TD-007 | Índices compuestos faltantes | Performance | 4h |
| TD-008 | E2E no cubre pagos reales | Confianza limitada | 16h |

---

## 📋 Recomendaciones

### Fase 1: Estabilizar CI (Semana 1)

1. **Arreglar los 167 tests rotos**
   - Identificar tests obsoletos vs. bugs reales
   - Eliminar tests de código deprecado (SplitPaymentService)

2. **Hacer tests requeridos en CI**
   ```yaml
   # ci.yml - Cambiar
   needs: [build-gate, lint-gate, unit-tests]
   ```

### Fase 2: Aumentar Cobertura (Semana 2-3)

3. **Priorizar tests para servicios críticos**
   - `BookingFlowService` - Flujo principal
   - `FgoV1_1Service` - Lógica de riesgo
   - `CheckoutPaymentService` - Pagos

4. **Agregar tests E2E para flujos de dinero**
   - Booking + Payment completo
   - Deposit + Refund
   - Wallet transfer

### Fase 3: Optimizar DB (Mes 1)

5. **Dividir migraciones monolíticas**
   - Crear script de análisis de dependencias
   - Dividir `03_archive.sql` en archivos temáticos

6. **Agregar índices compuestos faltantes**
   ```sql
   CREATE INDEX idx_bookings_car_dates
   ON bookings(car_id, start_at, end_at)
   WHERE status NOT IN ('cancelled', 'expired');
   ```

---

## 📎 Comandos de Verificación

```bash
# Contar archivos de test
find apps/web/src/app -name "*.spec.ts" | wc -l

# Ejecutar tests con coverage
pnpm test:coverage

# Ver workflows de CI
ls -la .github/workflows/ | wc -l

# Contar tablas en migraciones
grep -r "CREATE TABLE" supabase/migrations/ | wc -l

# Contar índices
grep -r "CREATE INDEX" supabase/migrations/ | wc -l
```

---

**Documento generado automáticamente por Gemini Agent**
**Fecha de generación:** 2026-01-09T05:56:57-03:00
