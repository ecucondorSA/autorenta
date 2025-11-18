# Estado Inicial de Deuda Técnica

**Fecha**: 2025-11-18
**Branch**: tech-debt-remediation
**Commit**: 7bd85487 (chore: commit work in progress before tech debt remediation)

## 📊 Métricas Generales

| Métrica | Valor |
|---------|-------|
| Scripts de "fix" | 5 archivos |
| Migraciones SQL con "fix" | 38 archivos |
| Tests deshabilitados (.skip) | 11 archivos |
| Docs obsoletos (archived/) | 298 archivos |

## 🔴 Scripts de Parches Identificados

### En `apps/web/`:

1. **FIX_WALLET_DEFINITIVO.sh** (124 líneas)
   - **Problema**: Intenta hardcodear URL de Supabase en producción
   - **Estado**: No ejecutado (URL no presente en código)
   - **Acción**: ELIMINAR

2. **comprehensive-fix.py** (230 líneas)
   - **Problema**: Fix masivo de ESLint (no-unused-vars, no-explicit-any, etc.)
   - **Acción**: DEPRECAR (consolidar en fix-eslint.js)

3. **smart-fix.py** (232 líneas)
   - **Problema**: Versión "inteligente" de comprehensive-fix.py
   - **Acción**: DEPRECAR (duplicado)

4. **final-fix.sh** (33 líneas)
   - **Problema**: Versión bash+perl de los fixes
   - **Acción**: DEPRECAR (duplicado)

5. **fix-eslint.js** (101 líneas)
   - **Problema**: Versión JavaScript de los fixes
   - **Acción**: MANTENER como único oficial (agregar tests)

## ⚠️ Tests Deshabilitados (11 archivos)

```
./apps/web/src/app/core/database/rpc-functions.spec.ts.skip
./apps/web/src/app/core/services/bonus-protector.service.spec.ts.skip
./apps/web/src/app/core/services/reviews.service.spec.ts.skip
./apps/web/src/app/core/services/error-handling.spec.ts.skip
./apps/web/src/app/core/services/car-availability.service.spec.ts.skip
./apps/web/src/app/core/services/payments.service.spec.ts.skip
./apps/web/src/app/core/services/bonus-malus-integration.spec.ts.skip
./apps/web/src/app/core/services/cars.service.getAvailableCars.spec.ts.skip
./apps/web/src/app/core/services/driver-profile.service.spec.ts.skip
./apps/web/src/app/core/security/rls-security.spec.ts.skip
./apps/web/src/app/e2e/booking-flow-e2e.spec.ts.skip
```

**Gravedad**: ALTA - 11 archivos de tests críticos deshabilitados

**Servicios afectados**:
- Database RPC functions
- Bonus/malus system
- Reviews system
- Error handling
- Car availability (CRÍTICO para bookings)
- Payment system (CRÍTICO)
- Security RLS (CRÍTICO)
- E2E booking flow (CRÍTICO)

## 📁 Documentación Obsoleta

- **docs/archived/**: 298 archivos
- **Acción**: Eliminar completamente (confiar en git history)

## 🔍 Migraciones SQL con "fix"

Total: 38 migraciones con patrón "fix" en nombre

**Categorías principales** (según análisis):
- Wallet system: ~28% (non-withdrawable, balance locks, etc.)
- Bookings system: ~35% (overlap validation, race conditions, total_amount)
- Payment system: ~20% (payment authorization, intents, providers)
- RLS policies: ~10% (messages, reviews, notifications)
- Otros: ~7% (exchange rates, categories, search radius)

**Indicador**: Problemas recurrentes en:
1. Sistema de wallet (arquitectura frágil)
2. Sistema de bookings (race conditions)
3. Sistema de pagos (evolución ad-hoc)

## 📋 CI/CD Actual

**Archivo**: `.github/workflows/ci.yml`

**Pipeline**:
1. Lint (BLOQUEANTE ✅)
2. Unit tests (BLOQUEANTE ✅)
3. **Coverage (NO bloqueante ⚠️ - continue-on-error: true)**
4. Build (BLOQUEANTE ✅)

**Faltante**:
- E2E tests no ejecutados en CI
- Security scanning automático
- Coverage mínimo NO enforced

## 🎯 Objetivos de Remediación

### Semana 1: P0 (Crítico)
- ✅ Eliminar FIX_WALLET_DEFINITIVO.sh
- ✅ Consolidar scripts ESLint (4 → 1)
- ✅ Habilitar 11 tests deshabilitados
- ✅ Tests para funciones SQL críticas

### Semana 2-3: P1 (Alto)
- ✅ Refactor wallet system
- ✅ Refactor bookings system
- ✅ Coverage bloqueante en CI
- ✅ E2E tests en CI
- ✅ Eliminar docs/archived/ (298 archivos)

## 📈 Resultados Esperados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Scripts de fix | 5 | 1 | -80% |
| Tests deshabilitados | 11 | 0 | -100% |
| Docs obsoletos | 298 | 0 | -100% |
| Coverage enforced | NO | SÍ (80%+) | ✅ |
| E2E en CI | NO | SÍ | ✅ |

---

**Próximos pasos**: Comenzar con Semana 1 - P0 Critical
