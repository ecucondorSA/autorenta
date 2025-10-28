# 📊 Production Readiness - Baseline Assessment

**Fecha de Evaluación**: 2025-10-28  
**Evaluación Global**: 40% Production Ready  
**Objetivo**: 93% (100% es utópico)  
**Gap**: 53 puntos porcentuales

---

## Executive Summary

AutoRenta está funcionalmente completo pero requiere trabajo significativo en seguridad, testing, e infraestructura antes de lanzar a producción. Los principales bloqueantes son:

1. **Secrets expuestos** - Requiere rotación inmediata
2. **Split payments no automáticos** - Locadores pueden no recibir pagos
3. **Tests golpean producción** - Riesgo de data corruption
4. **Sin ambiente de staging** - Deployments directos a producción

---

## Categorías Evaluadas

### 1. Seguridad y Secretos: 0% ❌ **BLOQUEANTE CRÍTICO**

**Estado Actual**:
- ✅ Scripts usan env vars (apply_migration.sh, verify-real-payments.sh)
- ✅ apps/web/public/env.js usa placeholders (no hardcoded)
- ❌ No hay `.env.local` template en repo
- ❌ Secrets no están en GitHub Actions
- ❌ Cloudflare Workers sin secrets configurados
- ❌ No hay documentación de rotación de secrets

**Para llegar a 100%**:
- [ ] Crear `.env.production.template` y `.env.test.template` ✅ **HECHO**
- [ ] Configurar GitHub Actions Secrets
- [ ] Configurar Cloudflare Workers Secrets  
- [ ] Configurar Supabase Edge Functions Secrets
- [ ] Documentar rotación de secrets ✅ **HECHO**
- [ ] Audit de código para secrets hardcodeados
- [ ] Rotar todos los secrets actualmente expuestos

**Bloqueante para producción**: ✅ **SÍ** - Credenciales expuestas son vulnerabilidad crítica

**ETA para 100%**: 2 días

---

### 2. Sistema de Cobro del Locador: 30% 🟡 **BLOQUEANTE CRÍTICO**

**Estado Actual**:
- ✅ Auto se publica con `status='active'`
- ❌ No valida si locador completó onboarding de Mercado Pago
- ❌ Split payment NO es automático
- ❌ Webhook no siempre se ejecuta
- ❌ No hay runbook para liberación manual de fondos

**Problemas Identificados**:

1. **`publish-car-v2.page.ts:1540-1563`**
   ```typescript
   // Auto queda activo aunque MP onboarding incompleto
   if (this.mercadoPagoOnboardingCompleted) {
     carData.status = 'active';
   }
   // PROBLEMA: Else no setea status='pending_onboarding'
   ```

2. **`mercadopago-create-booking-preference/index.ts:312-337`**
   - Split payment definido pero no se ejecuta consistentemente
   - Fondos quedan en wallet de plataforma

**Para llegar a 95%**:
- [ ] Validar MP onboarding antes de `status='active'`
- [ ] Implementar webhook resiliente con retries
- [ ] Agregar `payout_status` a tabla `bookings`
- [ ] Monitor automático de splits pendientes
- [ ] Runbook para liberación manual ✅ **HECHO**
- [ ] Dashboard admin para ver splits fallidos
- [ ] Tests E2E de split payments

**Bloqueante para producción**: ✅ **SÍ** - Locadores pueden no recibir su dinero

**ETA para 95%**: 1 semana

---

### 3. Checkout Locatario: 50% 🟡 **BLOQUEANTE PARCIAL**

**Estado Actual**:
- ✅ Flujo de reserva funciona end-to-end
- ✅ Integración con Mercado Pago funciona
- ❌ Bug: tabla `booking_risk_snapshots` (plural) no existe
- ❌ Bug: `getCarName()` retorna literal "Vehículo"
- ⚠️ sessionStorage para pending_booking_id inconsistente

**Problemas Identificados**:

1. **`risk.service.ts:114-139`**
   ```typescript
   // Inserta en: booking_risk_snapshot (singular)
   // Lee desde: booking_risk_snapshots (plural) ❌
   ```

2. **`booking-success.page.ts:143-149`**
   ```typescript
   getCarName(): string {
     return "Vehículo"; // Hardcoded ❌
   }
   ```

3. **`payment-card.spec.ts:188-204`**
   - Test depende de `sessionStorage.getItem('pending_booking_id')`
   - Código nunca setea este valor

**Para llegar a 95%**:
- [ ] Corregir nombre de tabla (singular/plural consistency)
- [ ] Implementar `getCarName()` con datos reales
- [ ] Setear `pending_booking_id` correctamente
- [ ] Tests E2E validados en ambiente limpio
- [ ] Manejo de errores en risk scoring
- [ ] Fallback si risk service falla

**Bloqueante para producción**: ⚠️ **PARCIAL** - Flujo funciona pero con bugs visuales

**ETA para 95%**: 3 días

---

### 4. Tests y CI/CD: 40% 🟡 **BLOQUEANTE CRÍTICO**

**Estado Actual**:
- ✅ 20 archivos de tests Playwright
- ✅ GitHub Actions workflows configurados
- ❌ Tests se autentican contra Supabase REAL
- ❌ Storage states no están en repo
- ❌ Mock de MP callbacks no funciona
- ❌ Tests pueden modificar datos de producción

**Problemas Identificados**:

1. **`tests/fixtures/auth.setup.ts:13-74`**
   ```typescript
   // Usa SUPABASE_URL y SUPABASE_ANON_KEY de producción
   // Si fork ejecuta CI, golpea producción ❌
   ```

2. **`tests/renter/booking/payment-card.spec.ts:188-204`**
   ```typescript
   await simulateMercadoPagoCallback(...);
   // Depende de sessionStorage que nunca se setea
   ```

3. **`.github/workflows/e2e-tests.yml`**
   - No separa test environment de producción

**Para llegar a 90%**:
- [ ] Crear test users en Supabase ✅ **HECHO** (documentado)
- [ ] Usar `.env.test` con test credentials
- [ ] Mock completo de Mercado Pago API
- [ ] Storage states en repo o regenerar en CI
- [ ] Tests no modifican datos de producción (RLS + test data)
- [ ] Coverage > 60%
- [ ] Tests de integración separados de E2E

**Bloqueante para producción**: ✅ **SÍ** - Tests no confiables = no podemos validar cambios

**ETA para 90%**: 1 semana

---

### 5. Infraestructura y Operación: 40% 🟡 **BLOQUEANTE PARCIAL**

**Estado Actual**:
- ✅ Supabase en plan Pro con backups automáticos
- ✅ Cloudflare Pages para web app
- ✅ Cloudflare Workers para webhooks
- ❌ Sin ambiente de staging
- ❌ Sin IaC (Infrastructure as Code)
- ❌ Deployments manuales via scripts
- ❌ Sin monitoreo/alertas
- ❌ Sin logs centralizados

**Problemas Identificados**:

1. **No hay staging real**
   - Cambios van directamente a producción
   - No hay lugar para validar antes de deploy

2. **Scripts manuales**
   - `apply_migration.sh` - manual
   - `verify-real-payments.sh` - manual
   - Worker deployment - manual con `wrangler deploy`

3. **Sin observabilidad**
   - No hay Sentry/Datadog/NewRelic
   - Logs solo en consolas de cada servicio
   - No hay dashboards de métricas

**Para llegar a 85%**:
- [ ] Crear proyecto Supabase de staging
- [ ] Cloudflare Pages preview branches (ya incluido)
- [ ] Terraform/Pulumi para IaC
- [ ] CI/CD automático para deploy
- [ ] Sentry para error tracking
- [ ] Supabase logs + análisis
- [ ] Runbooks operativos ✅ **HECHO** (3 runbooks)
- [ ] Alertas de métricas críticas
- [ ] Dashboard de salud del sistema

**Bloqueante para producción**: ⚠️ **PARCIAL** - Podemos lanzar sin staging, pero es riesgoso

**ETA para 85%**: 2 semanas

---

## Métricas Detalladas

| Categoría | Actual | Objetivo | Gap | Días ETA | Bloqueante |
|-----------|--------|----------|-----|----------|------------|
| Seguridad | 0% | 100% | 100% | 2 | ✅ SÍ |
| Cobro Locador | 30% | 95% | 65% | 7 | ✅ SÍ |
| Checkout | 50% | 95% | 45% | 3 | ⚠️ PARCIAL |
| Tests/CI | 40% | 90% | 50% | 7 | ✅ SÍ |
| Infraestructura | 40% | 85% | 45% | 14 | ⚠️ PARCIAL |
| **TOTAL** | **40%** | **93%** | **53%** | **~4 sem** | **SÍ** |

---

## Roadmap a Producción

### Fase 1: Fundamentos (Semana 1) - CRÍTICO

**Objetivo**: Resolver bloqueantes de seguridad

- [ ] Configurar GitHub Actions Secrets
- [ ] Configurar Cloudflare Workers Secrets
- [ ] Configurar Supabase Edge Functions Secrets
- [ ] Rotar secrets expuestos (si los hay)
- [ ] Crear usuarios de test en Supabase
- [ ] Documentación de runbooks operativos ✅ **HECHO**

**Responsable**: Claude Code + Copilot  
**Fecha límite**: 2025-11-04

---

### Fase 2: Fixes Críticos (Semana 2) - CRÍTICO

**Objetivo**: Resolver bugs bloqueantes

- [ ] Fix: `booking_risk_snapshots` table name
- [ ] Fix: `getCarName()` con datos reales
- [ ] Implementar validación MP onboarding antes de publicar
- [ ] Webhook resiliente con retries
- [ ] `payout_status` en bookings table
- [ ] Monitor de splits pendientes

**Responsable**: Copilot  
**Fecha límite**: 2025-11-11

---

### Fase 3: Tests y CI/CD (Semana 3) - CRÍTICO

**Objetivo**: Tests confiables

- [ ] Separar test environment
- [ ] Mock completo de Mercado Pago
- [ ] Tests no golpean producción
- [ ] Coverage > 60%
- [ ] CI pasa consistentemente
- [ ] Tests E2E de flujos críticos

**Responsable**: Ambos  
**Fecha límite**: 2025-11-18

---

### Fase 4: Staging e IaC (Semana 4) - MEDIO

**Objetivo**: Infraestructura productiva

- [ ] Proyecto Supabase staging
- [ ] IaC con Terraform
- [ ] CI/CD automático
- [ ] Sentry configurado
- [ ] Logs centralizados
- [ ] Dashboards básicos

**Responsable**: Ambos  
**Fecha límite**: 2025-11-25

---

## Criterios de Lanzamiento

Para considerar "production ready", TODOS estos deben cumplirse:

### Must-Have (Bloqueantes)
- [x] ✅ Secrets no expuestos en código
- [ ] ❌ Secrets rotados post-auditoría
- [ ] ❌ GitHub Actions Secrets configurados
- [ ] ❌ MP onboarding validation implementada
- [ ] ❌ Split payments funcionan automáticamente
- [ ] ❌ Runbook para split payment failures
- [ ] ❌ Tests no modifican producción
- [ ] ❌ Tests pasan en CI consistentemente
- [ ] ❌ Usuarios de test configurados
- [ ] ❌ Backup manual pre-deploy funciona

### Should-Have (Importantes)
- [ ] Ambiente de staging
- [ ] Monitoring básico (Sentry)
- [ ] Logs centralizados
- [ ] Coverage > 60%
- [ ] Documentación operativa completa ✅ **HECHO**
- [ ] CI/CD automático
- [ ] IaC básico

### Nice-to-Have (Mejoras continuas)
- [ ] Dashboards de métricas
- [ ] Alertas automáticas
- [ ] Load testing
- [ ] Security scanning automático
- [ ] Performance monitoring

---

## Riesgos Identificados

### Riesgo Alto 🔴

1. **Locador no recibe pago**
   - Probabilidad: Media
   - Impacto: Crítico (pérdida de confianza)
   - Mitigación: Validar MP onboarding + runbook manual

2. **Data corruption por tests**
   - Probabilidad: Media
   - Impacto: Alto (requiere restore desde backup)
   - Mitigación: Separar ambientes test/prod

3. **Secrets comprometidos**
   - Probabilidad: Baja (ya auditado)
   - Impacto: Crítico (acceso no autorizado)
   - Mitigación: Rotación inmediata + monitoring

### Riesgo Medio 🟡

4. **Deploy rompe producción**
   - Probabilidad: Media (sin staging)
   - Impacto: Medio (downtime)
   - Mitigación: Backup pre-deploy + staging environment

5. **Bug en checkout pierde conversiones**
   - Probabilidad: Baja
   - Impacto: Medio (pérdida de revenue)
   - Mitigación: Tests E2E + monitoring

---

## Notas y Observaciones

### Positivo ✅
- Arquitectura general está bien diseñada
- RLS policies bien implementadas
- Edge Functions son eficientes
- Integración MP funciona
- UI/UX está pulido

### A Mejorar 🔧
- Testing coverage es bajo
- Sin staging = deployments riesgosos
- Documentación operativa escasa (ahora mejorado ✅)
- Monitoring/observability ausente
- Split payments no son robustos

### Conclusión 📝

AutoRenta tiene un 40% de "production readiness". El código funciona, pero la infraestructura operativa, testing, y seguridad necesitan trabajo significativo. Con 4 semanas de esfuerzo enfocado podemos llegar a 93% y lanzar con confianza.

**El 60% restante NO es código nuevo**, es:
- 20% Configuración y secrets
- 15% Tests y separation de ambientes
- 15% Fixes de bugs conocidos
- 10% Infraestructura (staging, IaC, monitoring)

---

## Próximos Pasos Inmediatos

1. ✅ **HOY**: Crear documentación de secrets y runbooks (HECHO)
2. **HOY**: Configurar GitHub Actions Secrets
3. **HOY**: Crear usuarios de test en Supabase
4. **Mañana**: Implementar validación MP onboarding
5. **Mañana**: Fix bugs de checkout (risk snapshots, getCarName)
6. **Esta semana**: Separar test environment
7. **Próxima semana**: Split payments automáticos + monitoring

---

**Documento actualizado**: 2025-10-28  
**Próxima revisión**: 2025-11-04 (post Fase 1)
