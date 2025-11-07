# 🚀 Estado Actual - ¿Qué Falta para Producción?

**Fecha de Evaluación:** 2025-11-04  
**Estado General:** 40% Production Ready  
**Objetivo:** 93% (100% es utópico)  
**Gap:** 53 puntos porcentuales

---

## 📊 Resumen Ejecutivo

AutoRenta está **funcionalmente completo** pero requiere trabajo significativo en:
- **Split payments** (locadores no cobran automáticamente)
- **Bugs críticos** (flujos rotos)
- **Testing** (tests golpean producción)
- **Infraestructura** (sin staging, sin monitoring)

**Estimación de tiempo:** 4-6 semanas para llegar a 93% production-ready

---

## 🔴 BLOQUEANTES CRÍTICOS (Must-Have)

### 1. Fase 02: Split Payment (0% completado) 🔴 CRÍTICO

**Problema:** Los locadores (dueños de autos) no reciben sus pagos automáticamente.

**Estado Actual:**
- ❌ Auto se publica aunque MP onboarding incompleto
- ❌ Split payment NO es automático
- ❌ Webhook no siempre se ejecuta
- ❌ No hay validación de cuenta MP antes de activar auto

**Impacto:** 
- Locadores pueden no recibir su dinero
- Pérdida de confianza en la plataforma
- Riesgo legal

**Solución Requerida:**
- [ ] Validar onboarding MP antes de `status='active'`
- [ ] Implementar split automático en MercadoPago
- [ ] Webhook resiliente con retries
- [ ] Agregar `payout_status` a tabla `bookings`
- [ ] Monitor automático de splits pendientes
- [ ] Dashboard admin para ver splits fallidos
- [ ] Tests E2E de split payments

**ETA:** 5-7 días  
**Prioridad:** P0 (Bloqueante)

**Documentación:**
- `docs/production-roadmap/07-CHECKLIST-PRODUCCION.md` (Fase 02)
- `docs/production-roadmap/02-FASE-SPLIT-PAYMENT.md`

---

### 2. Fase 03: Bugs Críticos (0% completado) 🔴 CRÍTICO

#### Bug 1: Tabla `booking_risk_snapshots` (Plural vs Singular)

**Archivo:** `apps/web/src/app/core/services/risk.service.ts:114-139`

**Problema:**
```typescript
// Código intenta leer de:
.from('booking_risk_snapshots')  // ❌ PLURAL (no existe)

// Pero la tabla real es:
CREATE TABLE booking_risk_snapshot (  // ✅ SINGULAR
```

**Impacto:**
- ❌ Query falla en producción
- ❌ Usuario no puede ver confirmación de reserva
- ❌ Booking queda en estado inconsistente

**Solución:**
- [ ] Corregir nombre de tabla a singular
- [ ] Actualizar `risk.service.ts`
- [ ] Agregar manejo de errores
- [ ] Testing completo

**ETA:** 1 día

---

#### Bug 2: `getCarName()` devuelve literal "Vehículo"

**Archivo:** `apps/web/src/app/features/bookings/success/booking-success.page.ts:143-149`

**Problema:**
```typescript
getCarName(): string {
  return "Vehículo"; // ❌ Hardcoded
}
```

**Impacto:**
- Pantalla de éxito muestra "Vehículo" en lugar del nombre real del auto
- Mala experiencia de usuario

**Solución:**
- [ ] Implementar carga de datos reales del booking
- [ ] Mostrar nombre del auto desde `bookings.car_id`
- [ ] Loading states
- [ ] Error handling

**ETA:** 1 día

---

#### Bug 3: Validación MP Onboarding antes de publicar

**Archivo:** `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts:1540-1563`

**Problema:**
```typescript
// Auto queda activo aunque MP onboarding incompleto
if (this.mercadoPagoOnboardingCompleted) {
  carData.status = 'active';
}
// PROBLEMA: Else no setea status='pending_onboarding'
```

**Impacto:**
- Autos activos sin capacidad de recibir pagos
- Split payments fallan

**Solución:**
- [ ] Validar MP onboarding ANTES de activar
- [ ] Implementar popup handler
- [ ] Rollback si onboarding falla
- [ ] Testing completo

**ETA:** 2 días

---

#### Bug 4: Geocodificación sin fallback

**Problema:**
- Mapbox es obligatorio sin fallback
- Si token falla, toda la app se rompe

**Solución:**
- [ ] Servicio con fallback a Nominatim
- [ ] Testing sin token Mapbox
- [ ] Actualizar componentes
- [ ] Manejo de errores

**ETA:** 1 día

**Total Fase 03 ETA:** 5 días

---

### 3. Fase 04: Testing Real (0% completado) 🔴 CRÍTICO

**Problema:** Tests golpean base de datos de producción.

**Estado Actual:**
- ❌ Tests se autentican contra Supabase REAL
- ❌ Tests pueden modificar datos de producción
- ❌ No hay ambiente de testing separado
- ❌ Mock de MP callbacks no funciona

**Impacto:**
- Riesgo de data corruption
- Tests no confiables
- No podemos validar cambios con confianza

**Solución Requerida:**
- [ ] Crear proyecto Supabase de staging/testing
- [ ] Separar test environment de producción
- [ ] Mock completo de Mercado Pago API
- [ ] Tests no modifican datos de producción (RLS + test data)
- [ ] Suite E2E implementada
- [ ] Coverage > 60%
- [ ] CI/CD ejecuta tests automáticamente

**ETA:** 5-7 días  
**Prioridad:** P0 (Bloqueante)

**Documentación:**
- `docs/production-roadmap/04-FASE-TESTING-REAL.md`

---

## 🟡 IMPORTANTE (Should-Have)

### 4. Fase 05: Infraestructura (0% completado) 🟡 MEDIO

#### Staging Environment

**Estado Actual:**
- ❌ Sin ambiente de staging
- ❌ Deployments directos a producción
- ❌ No hay lugar para validar antes de deploy

**Solución:**
- [ ] Proyecto Supabase staging creado
- [ ] DB schema migrado
- [ ] Test data seeded
- [ ] Workers deployados a staging
- [ ] Frontend deployado a staging
- [ ] `staging.autorenta.com.ar` funcional

**ETA:** 3-5 días

---

#### CI/CD Pipelines

**Estado Actual:**
- ✅ GitHub Actions configurado (build-and-deploy.yml)
- ❌ PR checks no configurados completamente
- ❌ Deploy automático a staging pendiente
- ❌ Smoke tests básicos (mejorar)

**Solución:**
- [ ] PR checks configurados
- [ ] Deploy automático a staging
- [ ] Deploy a producción con aprobación
- [ ] Smoke tests post-deploy mejorados
- [ ] Notificaciones configuradas

**ETA:** 2-3 días

---

#### Monitoring y Observabilidad

**Estado Actual:**
- ❌ Sin logs centralizados
- ❌ Sin métricas en dashboard
- ❌ Sin alertas configuradas
- ❌ Sin health checks automatizados

**Solución:**
- [ ] Logs centralizados (Axiom/Datadog/Sentry)
- [ ] Métricas en dashboard (Grafana/Supabase Analytics)
- [ ] Alertas configuradas (Slack/Email)
- [ ] Health checks automatizados
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Error tracking (Sentry)

**ETA:** 3-5 días

---

#### Backups

**Estado Actual:**
- ✅ Supabase tiene backups automáticos (plan Pro)
- ❌ No hay backup manual pre-deploy
- ❌ No hay retention policy documentada
- ❌ No hay restore procedure probado

**Solución:**
- [ ] Backups diarios automatizados (ya existe en Supabase)
- [ ] Backup manual pre-deploy funciona
- [ ] Upload a R2/S3 (opcional)
- [ ] Retention 30 días
- [ ] Restore procedure probado
- [ ] DR plan documentado ✅ (ya existe)

**ETA:** 1-2 días

---

#### Performance

**Estado Actual:**
- ⚠️ Indexes pueden faltar en algunas queries
- ⚠️ Queries no optimizadas completamente
- ⚠️ Caching no implementado

**Solución:**
- [ ] Indexes creados en DB
- [ ] Queries optimizadas
- [ ] Caching implementado (Redis/Supabase Edge Cache)
- [ ] CDN configurado (Cloudflare Pages ya lo hace)
- [ ] Images optimizadas

**ETA:** 2-3 días

**Total Fase 05 ETA:** 7-10 días

---

## 🟢 NICE-TO-HAVE (Polish & Launch)

### 5. Fase 06: Polish & Launch (0% completado) 🟢 OPCIONAL

**UX/UI:**
- [ ] Loading states en todos los botones
- [ ] Skeleton loaders implementados
- [ ] Empty states diseñados
- [ ] Error handling consistente
- [ ] Responsive design validado (mobile + desktop)
- [ ] Accesibilidad validada (WCAG 2.1 AA)

**Documentación:**
- [ ] Guía de usuario (locatario)
- [ ] Guía de usuario (locador)
- [ ] FAQ (30+ preguntas)
- [ ] Términos y condiciones
- [ ] Política de privacidad

**Legal:**
- [ ] Marca registrada
- [ ] Dominio registrado ✅ (autorentar.com)
- [ ] T&C revisados por abogado
- [ ] Compliance PDPA
- [ ] Cookies banner
- [ ] Alta en AFIP
- [ ] Marketplace MP verificado
- [ ] Seguro de responsabilidad

**Marketing:**
- [ ] Landing page optimizada
- [ ] Email templates (5+)
- [ ] Redes sociales creadas
- [ ] Plan de lanzamiento

**ETA:** 5 días (no bloqueante)

---

## ✅ Lo que YA está listo

### Seguridad (Fase 01: ✅ COMPLETO - 100%)

- ✅ Credenciales removidas de código
- ✅ .env.local configurado
- ✅ .gitignore validado
- ✅ GitHub Secrets configurados (7/7)
- ✅ Supabase Secrets configurados (9/9)
- ✅ Cloudflare Workers Secrets configurados (5/5)
- ✅ Script de validación creado
- ✅ Documentación completa

### Infraestructura Base

- ✅ Supabase en plan Pro con backups automáticos
- ✅ Cloudflare Pages para web app
- ✅ Cloudflare Workers para webhooks
- ✅ Edge Functions deployadas (20+ funciones)
- ✅ Database migrations (62 migraciones)
- ✅ RLS policies implementadas

### Features Implementadas

- ✅ Sistema de autenticación
- ✅ Publicación de autos
- ✅ Búsqueda y filtros
- ✅ Reservas (checkout)
- ✅ Wallet system
- ✅ Pagos con MercadoPago
- ✅ Webhooks de pagos
- ✅ Admin dashboard

---

## 📅 Timeline Estimado

```
Semana 1-2: Fase 02 (Split Payment) - 5-7 días
Semana 3:   Fase 03 (Bugs Críticos) - 5 días
Semana 4:   Fase 04 (Testing Real) - 5-7 días
Semana 5-6: Fase 05 (Infraestructura) - 7-10 días
Semana 7:   Fase 06 (Polish) - 5 días (opcional)
Semana 8:   LANZAMIENTO 🚀
```

**ETA Lanzamiento:** 6-8 semanas desde hoy

---

## 🚦 Decision Matrix: Go/No-Go

### MUST HAVE (Bloqueantes)

- ✅ Fase 01: Seguridad completa ✅ COMPLETO
- ⏳ Fase 02: Split payments funcionando ❌ PENDIENTE
- ⏳ Fase 03: Bugs críticos resueltos ❌ PENDIENTE
- ⏳ Fase 04: Testing separado de producción ❌ PENDIENTE

### SHOULD HAVE (Importantes)

- ⏳ Fase 05: Staging + CI/CD ❌ PENDIENTE
- ⏳ Monitoring y alertas ❌ PENDIENTE
- ⏳ Backups automatizados ✅ PARCIAL (Supabase automático)

### NICE TO HAVE (Opcionales)

- ⏳ Fase 06: Polish UI/UX ❌ PENDIENTE
- ⏳ Documentación completa ⚠️ PARCIAL
- ⏳ Marketing materials ❌ PENDIENTE

### Decision Rules

**RED LIGHT (Delay):** ⚠️ **ESTADO ACTUAL**
- Algún MUST HAVE ⏳ → 3 bloqueantes pendientes
- <50% SHOULD HAVE ✅
- Bugs críticos sin resolver

**YELLOW LIGHT (Soft Launch):**
- Todos los MUST HAVE ✅
- 50-80% SHOULD HAVE ✅
- <3 bugs menores
- Beta privada OK

**GREEN LIGHT (Lanzar):**
- Todos los MUST HAVE ✅
- >80% SHOULD HAVE ✅
- Zero bugs críticos
- Equipo ready

---

## 🎯 Priorización de Tareas

### Esta Semana (Crítico)

1. **Fase 02: Split Payment** (5-7 días)
   - Validar onboarding MP antes de activar auto
   - Implementar split automático
   - Webhook resiliente

2. **Fase 03: Bug 1 y 2** (2 días)
   - Fix `booking_risk_snapshots`
   - Fix `getCarName()`

### Próxima Semana

3. **Fase 03: Bug 3 y 4** (3 días)
   - Validación MP onboarding
   - Geocodificación con fallback

4. **Fase 04: Testing** (5-7 días)
   - Separar ambiente de testing
   - Mock de MercadoPago

### Semanas 3-4

5. **Fase 05: Infraestructura** (7-10 días)
   - Staging environment
   - Monitoring
   - CI/CD mejorado

---

## 📊 Métricas de Progreso

| Categoría | Actual | Objetivo | Gap | Estado |
|----------|--------|----------|-----|--------|
| Seguridad | 100% | 100% | 0% | ✅ COMPLETO |
| Split Payment | 0% | 95% | 95% | ❌ BLOQUEANTE |
| Bugs Críticos | 0% | 95% | 95% | ❌ BLOQUEANTE |
| Testing | 0% | 90% | 90% | ❌ BLOQUEANTE |
| Infraestructura | 40% | 85% | 45% | ⚠️ PARCIAL |
| **TOTAL** | **40%** | **93%** | **53%** | ❌ **NO LISTO** |

---

## 🚨 Riesgos Identificados

### Riesgo Alto 🔴

1. **Locador no recibe pago**
   - Probabilidad: Media
   - Impacto: Crítico
   - Mitigación: Implementar Fase 02

2. **Data corruption por tests**
   - Probabilidad: Media
   - Impacto: Alto
   - Mitigación: Separar ambiente testing (Fase 04)

3. **Bug en checkout pierde conversiones**
   - Probabilidad: Media
   - Impacto: Medio
   - Mitigación: Fix bugs críticos (Fase 03)

---

## 📞 Recursos y Documentación

### Documentos Clave

- **Checklist Completo:** `docs/production-roadmap/07-CHECKLIST-PRODUCCION.md`
- **Roadmap Ejecutivo:** `docs/production-roadmap/00-RESUMEN-EJECUTIVO.md`
- **Baseline Assessment:** `docs/PRODUCTION_READINESS_BASELINE.md`
- **Guía de Deployment:** `docs/deployment-guide.md`

### Especificaciones Técnicas

- **Split Payment:** `docs/production-roadmap/02-FASE-SPLIT-PAYMENT.md`
- **Bugs Críticos:** `docs/production-roadmap/03-FASE-ALTA-BUGS-CRITICOS.md`
- **Testing:** `docs/production-roadmap/04-FASE-TESTING-REAL.md`
- **Infraestructura:** `docs/production-roadmap/05-FASE-INFRAESTRUCTURA.md`

---

## ✅ Próximos Pasos Inmediatos

1. **HOY:** Iniciar Fase 02 (Split Payment)
   - Validar onboarding MP antes de activar auto
   - Implementar split automático

2. **HOY:** Fix Bug 1 (booking_risk_snapshots)
   - Corregir nombre de tabla

3. **Mañana:** Fix Bug 2 (getCarName)
   - Cargar datos reales del booking

4. **Esta semana:** Separar ambiente de testing
   - Crear proyecto Supabase de staging

---

**Última actualización:** 2025-11-04  
**Próxima revisión:** Diaria hasta completar bloqueantes críticos

