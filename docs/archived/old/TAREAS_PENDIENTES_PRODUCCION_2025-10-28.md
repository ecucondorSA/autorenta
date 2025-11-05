# 🎯 TAREAS PENDIENTES PARA PRODUCCIÓN - AutoRenta
**Fecha**: 2025-10-28 14:00 UTC
**Estado Actual**: 47% → Objetivo: 100%
**Timeline Estimado**: 2-3 semanas
**Prioridad**: CRÍTICA

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Progreso | Gap | Prioridad |
|-----------|----------|-----|-----------|
| 🔒 Seguridad & Secrets | 50% | 50% | **🔴 CRÍTICA** |
| 💳 Sistema de Pago Locador | 30% | 70% | **🔴 CRÍTICA** |
| 🛒 Checkout Locatario | 50% | 50% | **🟠 ALTA** |
| 🧪 Tests & CI/CD | 40% | 60% | **🟠 ALTA** |
| ☁️ Infraestructura Deploy | 40% | 60% | **🟠 ALTA** |
| **TOTAL** | **47%** | **53%** | - |

---

## 🔴 BLOQUEADORES CRÍTICOS PARA GO LIVE

### 1. ❌ TypeScript Compilation Errors (BLOQUEADOR #1)
**Estado**: 130 errores TypeScript sin resolver
**Impacto**: ❌ BUILD FALLIDO = NO HAY DEPLOY POSIBLE

#### Errores Críticos por Módulo:
```
❌ guided-tour.service.ts        - NewTourId type not found (5+ errors)
❌ messaging.service.ts          - Message type conversions (8+ errors)
❌ bookings.service.ts           - Property type mismatches (6+ errors)
❌ marketplace.service.ts        - Response type mismatches (7+ errors)
❌ wallet.service.ts             - Optional chaining issues (4+ errors)
❌ auth.routes.ts                - Component type issues (3+ errors)
❌ mercadopago services          - OAuth flow types (12+ errors)
❌ help-button component         - Animations import (2+ errors)
```

**Acción Inmediata**:
```bash
# 1. Ver errores exactos
cd apps/web && npm run build 2>&1 | tee build-errors.log

# 2. Revisar plan de corrección
cat TYPESCRIPT_FIX_PLAN.md

# 3. Ejecutar correcciones por fases
npm run fix:types:phase1  # Imports críticos
npm run fix:types:phase2  # Bookings & Marketplace
npm run fix:types:phase3  # Services & Models
npm run fix:types:phase4  # Final validation
```

**Timeline**: 2-4 horas
**Responsable**: Developer (o Claude Code)

---

### 2. 🔐 Secrets Management (BLOQUEADOR #2)
**Estado**: 0% - Sin configurar en producción
**Impacto**: ❌ PAGOS NO FUNCIONAN sin credenciales

#### A. Cloudflare Workers Secrets (Pagos Mock)
```bash
cd functions/workers/payments_webhook

# Setup interactivo
wrangler secret put SUPABASE_URL           # https://[project].supabase.co
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # eyJhbGc...
wrangler secret put MERCADOPAGO_ACCESS_TOKEN   # APP_USR-***
```

**Checklist**:
- [ ] Supabase URL configurada
- [ ] Service Role Key configurada (NO anon key)
- [ ] MercadoPago Access Token válido
- [ ] Verificar con: `wrangler secret list`

---

#### B. Supabase Edge Functions Secrets (Producción)
```bash
# Login a Supabase CLI
supabase login

# Link proyecto
supabase link --project-ref obxvffplochgeiclibng

# Configurar secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-***
supabase secrets set SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Verificar**:
```bash
supabase secrets list
# Debería mostrar: MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

---

#### C. Environment Variables (.env.local)
```bash
# Copiar template
cp config/environments/.env.production.template .env.local

# Editar con valores reales
cat .env.local
# NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
# NG_APP_SUPABASE_ANON_KEY=eyJhbGc...
# NG_APP_MERCADOPAGO_PUBLIC_KEY=TEST-***
# NG_APP_ENVIRONMENT=production
# NG_APP_WEBHOOK_URL=https://[cloudflare-domain]/webhooks/payments
```

**Timeline**: 1.5 horas (incluye testing)
**Responsable**: Usuario (necesita acceso a dashboards)

---

### 3. 💳 Sistema de Cobro para Locadores (BLOQUEADOR #3)
**Estado**: 30% - Framework preparado, falta integración
**Impacto**: ❌ LOCADORES NO PUEDEN COBRAR

#### Componentes Pendientes:

**A. Split Payment Implementation** (2-3 horas)
```typescript
// apps/web/src/app/core/services/split-payment.service.ts
// Necesita:
// 1. Crear transacciones split en Supabase
// 2. Calcular comisión de plataforma (5-10%)
// 3. Calcular retenciones locales
// 4. Crear múltiples órdenes MercadoPago

export interface SplitPaymentRequest {
  booking_id: string;
  total_amount: number;
  platform_fee: number;      // 5-10%
  locador_amount: number;
  taxes: number;
}

// Flujo:
// 1. booking.ts -> payBooking() -> Crea split transaction
// 2. MercadoPago receives -> split_payment_id
// 3. Webhook receives -> Distribuye fondos según tabla wallet_split_config
// 4. Locador ve en wallet -> Disponible para retiro
```

**B. Withdrawal System for Locadores** (2-3 horas)
```sql
-- Necesita migrations en Supabase:

-- 1. Table: withdrawal_requests
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount NUMERIC,
  status ENUM('pending', 'approved', 'rejected', 'processed'),
  bank_account_id UUID REFERENCES bank_accounts(id),
  created_at TIMESTAMP,
  processed_at TIMESTAMP
);

-- 2. Table: bank_accounts
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  account_number VARCHAR,
  account_type ENUM('checking', 'savings'),
  bank_code VARCHAR,
  verified BOOLEAN,
  created_at TIMESTAMP
);

-- 3. RPC: process_withdrawal
CREATE FUNCTION process_withdrawal(
  request_id UUID,
  transfer_id VARCHAR -- MercadoPago transfer ID
) RETURNS JSON AS $$
BEGIN
  UPDATE withdrawal_requests SET status='processed', processed_at=NOW();
  UPDATE user_wallets SET locked_funds = locked_funds - amount;
  -- Llamar MercadoPago API para transferencia
END;
$$ LANGUAGE plpgsql;
```

**C. Withdrawal UI Components** (1-2 horas)
```
apps/web/src/app/features/wallet/withdrawal/
├── withdrawal-list.component.ts          # Historial
├── withdrawal-request.component.ts       # Formulario
└── bank-account-management.component.ts  # Validación de cuenta bancaria
```

**Timeline**: 5-7 horas
**Responsable**: Developer + Backend (migrations)

---

## 🟠 TAREAS DE ALTA PRIORIDAD

### 4. 🧪 E2E Tests con Playwright (90%+ coverage)
**Estado**: 40% - Tests básicos creados, falta cobertura
**Impacto**: 🟠 Sin tests = riesgo de regressions

#### Tests Faltantes:
```bash
# Crear tests para:
tests/
├── renter/                         # Locatario
│   ├── booking-flow.spec.ts       # ✅ Creado
│   ├── payment-wallet.spec.ts     # ✅ Creado
│   ├── payment-card.spec.ts       # ✅ Creado
│   ├── success-page.spec.ts       # ✅ Creado
│   ├── car-search-filter.spec.ts  # ❌ FALTA
│   ├── map-integration.spec.ts    # ❌ FALTA
│   └── profile-update.spec.ts     # ❌ FALTA
├── owner/                          # Locador
│   ├── publish-car.spec.ts        # ❌ FALTA
│   ├── manage-bookings.spec.ts    # ❌ FALTA
│   ├── withdrawal-flow.spec.ts    # ❌ FALTA
│   └── dashboard.spec.ts          # ❌ FALTA
├── auth/
│   ├── login-flow.spec.ts         # ❌ FALTA
│   ├── register-flow.spec.ts      # ❌ FALTA
│   └── password-reset.spec.ts     # ❌ FALTA
└── shared/
    ├── navigation.spec.ts          # ❌ FALTA
    └── error-handling.spec.ts      # ❌ FALTA
```

**Comandos**:
```bash
npm run test:e2e                    # Correr todos
npm run test:e2e:ui                # UI debug
npm run test:e2e:report            # Ver reporte
npm run test:e2e:headed            # Modo visible
```

**Timeline**: 3-4 horas
**Responsable**: QA/Developer

---

### 5. ⚙️ CI/CD Pipeline (GitHub Actions)
**Estado**: 40% - Workflows básicos, falta cobertura completa

#### Workflows Necesarios:
```yaml
# .github/workflows/

1. lint-and-test.yml           # Lint + Tests en cada PR
   - ESLint check
   - TypeScript compilation
   - Unit tests (Karma)
   - E2E tests (Playwright)

2. build-and-deploy.yml        # Build + Deploy en main
   - Build Angular app
   - Deploy a Cloudflare Pages
   - Deploy Worker (payments)
   - Run smoke tests

3. security-scan.yml           # Security checks
   - OWASP dependency check
   - SAST (SonarQube)
   - Secrets detection

4. performance-monitor.yml     # Post-deploy monitoring
   - Lighthouse scores
   - Bundle size tracking
   - Performance metrics
```

**Setup Rápido**:
```bash
# Crear workflows
mkdir -p .github/workflows
cp templates/workflows/*.yml .github/workflows/

# Editar con:
# - Cloudflare credentials
# - Supabase project ref
# - GitHub token permisos

# Testear
git push -u origin feature/ci-cd
# Debería ejecutar lint-and-test automáticamente
```

**Timeline**: 2-3 horas
**Responsable**: DevOps/Developer

---

### 6. ☁️ Cloudflare Pages Auto-Deploy
**Estado**: 40% - Manual setup, falta automático

#### Configuración Requerida:
```bash
# 1. Conectar GitHub a Cloudflare Pages
# https://dash.cloudflare.com/login
# Pages > Create > GitHub > Select repo (autorenta)

# 2. Configurar Build
Build command:     npm run build:web
Output directory:  apps/web/dist/browser
Node version:      18.0.0

# 3. Environment Variables (Cloudflare Dashboard)
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=eyJhbGc...
NG_APP_ENVIRONMENT=production
NG_APP_WEBHOOK_URL=https://[project].pages.dev/api/webhooks/payments

# 4. Custom Domain
authorenta.com -> Pages project

# 5. Enable Preview Environments
Deployments > Preview URLs > Enable

# 6. Rollback Strategy
Auto-rollback después de 5 minutos si monitoreo falla
```

**Testing**:
```bash
# Hacer push a rama
git push -u origin feature/test
# Cloudflare debería crear preview automáticamente
# URL: https://[hash]--autorenta.pages.dev
```

**Timeline**: 1-1.5 horas
**Responsable**: Usuario (acceso Cloudflare)

---

## 📋 TABLA DE TAREAS CONSOLIDADAS

### Fase 1: CRÍTICA (Esta semana - 3-5 días)

| # | Tarea | Esfuerzo | Bloqueador | Estado |
|---|-------|----------|-----------|--------|
| 1 | Fix TypeScript errors (130 errores) | 2-4h | 🔴 | ❌ |
| 2 | Setup Secrets (Cloudflare + Supabase) | 1.5h | 🔴 | ❌ |
| 3 | Webhook MercadoPago config producción | 1h | 🔴 | ❌ |
| 4 | **Subtotal Fase 1** | **4.5-6.5h** | - | ❌ |

**Resultado**: Permitir builds exitosos + pagos básicos

---

### Fase 2: ALTA PRIORIDAD (Semana 2)

| # | Tarea | Esfuerzo | Bloqueador | Estado |
|---|-------|----------|-----------|--------|
| 5 | Split Payment para Locadores | 5-7h | 🟠 | ❌ |
| 6 | Withdrawal System UI/Backend | 3-5h | 🟠 | ❌ |
| 7 | E2E Tests cobertura (90%+) | 3-4h | 🟠 | ❌ |
| 8 | **Subtotal Fase 2** | **11-16h** | - | ❌ |

**Resultado**: Sistema de pago completo + tests exhaustivos

---

### Fase 3: IMPORTANTE (Semana 2-3)

| # | Tarea | Esfuerzo | Bloqueador | Estado |
|---|-------|----------|-----------|--------|
| 9 | CI/CD Pipeline GitHub Actions | 2-3h | ⚪ | ❌ |
| 10 | Cloudflare Pages auto-deploy | 1-1.5h | ⚪ | ❌ |
| 11 | Monitoreo & Alertas (Sentry) | 1-2h | ⚪ | ❌ |
| 12 | Documentación operativa | 2h | ⚪ | ❌ |
| 13 | **Subtotal Fase 3** | **6-7.5h** | - | ❌ |

**Resultado**: Infraestructura robusta + observabilidad

---

## 🔧 TABLA DE DEPENDENCIAS

```
┌─ Fase 1 (CRÍTICA) ──────────────────┐
│ 1. Fix TypeScript                   │ <- BLOQUEADOR para build
│ 2. Setup Secrets                    │ <- BLOQUEADOR para pagos
│ 3. Webhook config                   │ <- Depende de #2
└────────────┬────────────────────────┘
             │
             v
┌─ Fase 2 (ALTA PRIORIDAD) ──────────┐
│ 5. Split Payment                    │ <- Depende de #1, #2, #3
│ 6. Withdrawal System                │ <- Depende de #5
│ 7. E2E Tests                        │ <- Depende de #1, #5, #6
└────────────┬────────────────────────┘
             │
             v
┌─ Fase 3 (IMPORTANTE) ──────────────┐
│ 9. CI/CD Pipeline                  │ <- Depende de #1, #7
│ 10. Auto-deploy                    │ <- Depende de #9
│ 11. Monitoreo                      │ <- Depende de #10
│ 12. Documentación                  │ <- Depende de todo
└────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE GO-LIVE

### Pre-Production (Fase 1-3)
- [ ] TypeScript: 0 errores de build
- [ ] Secrets configurados en ambas plataformas
- [ ] Tests E2E: 90%+ coverage, todos pasando
- [ ] CI/CD: Workflows ejecutándose exitosamente
- [ ] Deploy: Auto-deploy funcionando

### Producción
- [ ] Cloudflare Pages live
- [ ] Domain DNS configurado
- [ ] SSL/TLS válido (auto-renovable)
- [ ] Webhooks MercadoPago validados
- [ ] Monitoreo activo (Sentry alerts)
- [ ] Backup strategy implementado

### Post-Go-Live (24 horas)
- [ ] Smoke tests exitosos
- [ ] Zero P0/P1 bugs
- [ ] Performance metrics normal
- [ ] Error rates < 0.1%
- [ ] Usuarios creados y activos

---

## 🚨 RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| TypeScript no compila | 🔴 Crítica | Bloquea deploy | Fase 1: 4h fixes |
| Secrets mal configurados | 🔴 Crítica | Pagos fallan | Testing 1h post-config |
| Webhook timeout | 🟠 Alta | Pagos pendientes | Retry logic en DB |
| Performance degradation | 🟠 Alta | Usuarios abandonen | Monitoreo realtime |
| Double bookings | 🔴 Crítica | Conflictos | Tests + RLS |
| Data loss | 🔴 Crítica | Desastre | Backups automáticos |

---

## 📞 CONTACTOS Y RECURSOS

**Repositorio**: https://github.com/ecucondorSA/autorenta
**Supabase Dashboard**: https://obxvffplochgeiclibng.supabase.co
**Cloudflare Dashboard**: https://dash.cloudflare.com
**MercadoPago Dashboard**: https://www.mercadopago.com.ar/business

---

## 📈 MÉTRICAS DE ÉXITO

**Before Go-Live**:
- TypeScript Errors: 130 → 0
- Build Time: 90s
- Test Coverage: 40% → 90%
- Deployment Time: 5m

**After Go-Live**:
- Uptime: >99.9%
- Error Rate: <0.1%
- Page Load: <2s
- Conversion Rate: >5%

---

## 🎯 RECOMENDACIÓN FINAL

### Orden de Ejecución Recomendado:

**Hoy/Mañana (8-10 horas)**:
1. Fix TypeScript errors (4h) ✅
2. Setup Secrets (2h) ✅
3. Test webhook MercadoPago (1h) ✅
4. Primer deploy a staging (1h) ✅

**Miércoles (6-8 horas)**:
5. Implementar Split Payment (6h)
6. Tests E2E adicionales (2h)

**Jueves (3-4 horas)**:
7. CI/CD setup (3h)
8. Auto-deploy config (1h)

**Viernes (2 horas)**:
9. QA final + rollback plan
10. GO LIVE 🚀

**Total Esfuerzo**: 19-25 horas | **Timeline Real**: 3-5 días de desarrollo paralelo

---

## 🏁 CONCLUSIÓN

AutoRenta está en **47%** de producción. Con un esfuerzo concentrado de **2-3 semanas**, puede llegar a **100% listo para producción** y soportar:

✅ Locatarios buscando/rentando autos
✅ Locadores cobrando por cada reserva
✅ Pagos seguros con MercadoPago
✅ Infraestructura escalable en Cloudflare
✅ Monitoreo 24/7 de errores y performance

**Status**: 🟡 **AMARILLO** - Ejecutable pero requiere acciones inmediatas

---

*Documento generado*: 2025-10-28 14:00 UTC
*Versión*: 1.0
*Responsable*: Claude Code (AI)
