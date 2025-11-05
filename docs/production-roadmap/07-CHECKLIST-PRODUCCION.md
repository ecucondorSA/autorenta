# ✅ Checklist de Producción - AutoRenta

**Versión:** 1.0  
**Última actualización:** 2025-10-28  
**Objetivo:** Validar que TODOS los sistemas están listos para producción

---

## 🎯 Resumen Ejecutivo

Este checklist es la **última validación** antes de lanzar AutoRenta a producción.

**Criterio de aprobación:** ✅ en **TODOS** los items críticos (🔴)

---

## 📊 Estado General

```
Progreso:  ████████░░░░░░░░░░░░░░  40% (estimado)

Fases Completadas: 1/6
├─ Fase 01: Seguridad ✅
├─ Fase 02: Split Payment ⏳
├─ Fase 03: Bugs Críticos ⏳
├─ Fase 04: Testing Real ⏳
├─ Fase 05: Infraestructura ⏳
└─ Fase 06: Polish & Launch ⏳
```

---

## 🔴 FASE 01: Seguridad (CRÍTICO)

### Secrets Management
- [x] Credenciales removidas de código
- [x] .env.local configurado
- [x] .gitignore validado
- [x] GitHub Secrets configurados (7/7)
- [x] Supabase Secrets configurados (9/9)
- [x] Cloudflare Workers Secrets configurados (5/5)
- [x] Script de validación creado
- [x] Documentación completa

**Estado:** ✅ **COMPLETO** (100%)

---

## 🔴 FASE 02: Split Payment (CRÍTICO)

### MercadoPago Marketplace
- [ ] Cuenta Marketplace verificada
- [ ] Onboarding de locadores implementado
- [ ] Split payment configurado en preferences
- [ ] Platform fee (15%) configurado
- [ ] Testing con 10+ transacciones
- [ ] Webhook procesa splits correctamente
- [ ] Wallet actualiza balances correctamente

### Database
- [ ] Tabla `marketplace_accounts` creada
- [ ] Columnas MP en `user_profiles`
- [ ] Función `process_split_payment` implementada
- [ ] Transacciones atómicas validadas

### Frontend
- [ ] Flujo de onboarding MP en publish-car
- [ ] Validación de cuenta MP antes de activar auto
- [ ] Pantalla de estado de cuenta MP
- [ ] Mensajes de error claros

**Estado:** ⏳ **PENDIENTE** (0%)  
**Blocker:** Configuración Marketplace MP  
**ETA:** 5-7 días

---

## 🔴 FASE 03: Bugs Críticos (CRÍTICO)

### Bug 1: Tabla booking_risk_snapshots
- [ ] Corregir nombre de tabla (singular)
- [ ] Actualizar risk.service.ts
- [ ] Agregar manejo de errores
- [ ] Testing completo

### Bug 2: Pantalla de Éxito
- [ ] Implementar carga de datos reales
- [ ] Mostrar nombre del auto
- [ ] Mostrar detalles de reserva
- [ ] Loading states
- [ ] Error handling

### Bug 3: Publicación de Auto
- [ ] Validar MP onboarding ANTES de activar
- [ ] Implementar popup handler
- [ ] Rollback si onboarding falla
- [ ] Testing completo

### Bug 4: Geocodificación
- [ ] Servicio con fallback a Nominatim
- [ ] Testing sin token Mapbox
- [ ] Actualizar componentes
- [ ] Manejo de errores

**Estado:** ⏳ **PENDIENTE** (0%)  
**ETA:** 5 días

---

## 🟠 FASE 04: Testing Real (ALTA)

### Setup Sandbox
- [ ] Cuentas de prueba MP creadas
- [ ] Tarjetas de prueba documentadas
- [ ] Webhooks de test configurados
- [ ] Ambiente de test funcional

### Escenarios Validados
- [ ] Pago exitoso con split (10+ tests)
- [ ] Pago rechazado - fondos insuficientes
- [ ] Pago pendiente - medios offline
- [ ] Refund completo
- [ ] Webhook retry

### Automatización
- [ ] Suite E2E implementada
- [ ] Tests pasan consistentemente (>95%)
- [ ] CI/CD ejecuta tests automáticamente
- [ ] Script de validación automática

**Estado:** ⏳ **PENDIENTE** (0%)  
**Dependencias:** Fase 02 + 03  
**ETA:** 5 días

---

## 🟡 FASE 05: Infraestructura (MEDIA)

### Staging Environment
- [ ] Proyecto Supabase staging creado
- [ ] DB schema migrado
- [ ] Test data seeded
- [ ] Workers deployados a staging
- [ ] Frontend deployado a staging
- [ ] staging.autorenta.com.ar funcional

### CI/CD Pipelines
- [ ] PR checks configurados
- [ ] Deploy automático a staging
- [ ] Deploy a producción con aprobación
- [ ] Smoke tests post-deploy
- [ ] Notificaciones configuradas

### Monitoring
- [ ] Logs centralizados (Axiom/Datadog)
- [ ] Métricas en dashboard (Grafana)
- [ ] Alertas configuradas (Slack)
- [ ] Health checks automatizados
- [ ] Uptime monitoring (UptimeRobot)

### Backups
- [ ] Backups diarios automatizados
- [ ] Upload a R2/S3
- [ ] Retention 30 días
- [ ] Restore procedure probado
- [ ] DR plan documentado

### Performance
- [ ] Indexes creados en DB
- [ ] Queries optimizadas
- [ ] Caching implementado
- [ ] CDN configurado
- [ ] Images optimizadas

**Estado:** ⏳ **PENDIENTE** (0%)  
**ETA:** 7 días

---

## 🟢 FASE 06: Polish & Launch (FINAL)

### UX/UI
- [ ] Loading states en todos los botones
- [ ] Skeleton loaders implementados
- [ ] Empty states diseñados
- [ ] Error handling consistente
- [ ] Responsive design validado (mobile + desktop)
- [ ] Micro-interactions implementadas
- [ ] Accesibilidad validada (WCAG 2.1 AA)

### Documentación
- [ ] Guía de usuario (locatario)
- [ ] Guía de usuario (locador)
- [ ] FAQ (30+ preguntas)
- [ ] Términos y condiciones
- [ ] Política de privacidad
- [ ] Runbooks técnicos

### Legal
- [ ] Marca registrada
- [ ] Dominio registrado
- [ ] T&C revisados por abogado
- [ ] Compliance PDPA
- [ ] Cookies banner
- [ ] Alta en AFIP
- [ ] Marketplace MP verificado
- [ ] Seguro de responsabilidad

### Marketing
- [ ] Landing page optimizada
- [ ] Email templates (5+)
- [ ] Redes sociales creadas
- [ ] Plan de lanzamiento
- [ ] Materiales promocionales

### Launch Prep
- [ ] Beta privada (50 usuarios)
- [ ] Feedback incorporado
- [ ] Soft launch (sin marketing)
- [ ] Monitoring 24/7 activo
- [ ] Bug fixes críticos
- [ ] Team training completo

**Estado:** ⏳ **PENDIENTE** (0%)  
**ETA:** 5 días

---

## 📋 Checklist Técnico Final

### Frontend

#### Build & Deploy
- [ ] Build sin warnings
- [ ] Bundle size <2MB
- [ ] Tree-shaking configurado
- [ ] Source maps generados (staging)
- [ ] Source maps NO en producción
- [ ] env.js con placeholders
- [ ] inject-env.sh en build pipeline

#### Performance
- [ ] Lighthouse score >90 (todas métricas)
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Largest Contentful Paint <2.5s
- [ ] Cumulative Layout Shift <0.1
- [ ] Images lazy-loaded
- [ ] Fonts optimizados

#### SEO
- [ ] Meta tags en todas las páginas
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Sitemap.xml generado
- [ ] robots.txt configurado
- [ ] Structured data (JSON-LD)

#### PWA (Opcional)
- [ ] Service worker registrado
- [ ] manifest.json configurado
- [ ] Icons (192x192, 512x512)
- [ ] Splash screens
- [ ] Offline fallback

### Backend

#### Database
- [ ] Todas las migraciones aplicadas
- [ ] Indexes creados
- [ ] Foreign keys validadas
- [ ] RLS policies verificadas
- [ ] Functions optimizadas
- [ ] Views creadas
- [ ] Cron jobs configurados

#### Supabase Edge Functions
- [ ] Todas las functions deployadas
- [ ] Secrets configurados
- [ ] Testing completo
- [ ] Error handling robusto
- [ ] Logs estructurados
- [ ] Rate limiting implementado

#### Cloudflare Workers
- [ ] Todos los workers deployados
- [ ] wrangler.toml configurado
- [ ] Secrets configurados
- [ ] KV namespaces (si aplica)
- [ ] Durable Objects (si aplica)
- [ ] Cron triggers (si aplica)

### Security

#### SSL/TLS
- [ ] Certificados válidos
- [ ] HTTPS en todos los dominios
- [ ] HSTS headers
- [ ] Mixed content resuelto
- [ ] Subdominios seguros

#### Headers
```
✓ Content-Security-Policy
✓ X-Content-Type-Options: nosniff
✓ X-Frame-Options: DENY
✓ X-XSS-Protection: 1; mode=block
✓ Referrer-Policy: strict-origin-when-cross-origin
✓ Permissions-Policy
```

#### Authentication
- [ ] Supabase Auth configurado
- [ ] JWT verification implementada
- [ ] Password strength enforzado
- [ ] Rate limiting en login
- [ ] Account lockout después de intentos
- [ ] Email verification obligatoria
- [ ] Password reset funcionando

#### Datos Sensibles
- [ ] Zero secretos en código
- [ ] PII encriptado en DB
- [ ] Logs no contienen PII
- [ ] Tarjetas procesadas por MP (no por nosotros)
- [ ] GDPR/PDPA compliance

### Integrations

#### MercadoPago
- [ ] Credentials en secretos (no código)
- [ ] Sandbox testing completo (50+ pagos)
- [ ] Production credentials configuradas
- [ ] Webhooks funcionando
- [ ] Error handling robusto
- [ ] Retry logic implementado
- [ ] Idempotency verificada

#### Mapbox/Geocoding
- [ ] Token en secretos
- [ ] Fallback a Nominatim
- [ ] Rate limiting manejado
- [ ] Error handling
- [ ] Caching de resultados

#### Email (Supabase/SendGrid)
- [ ] Templates creados
- [ ] Variables funcionando
- [ ] Testing enviado
- [ ] Bounce handling
- [ ] Unsubscribe link

#### SMS (Opcional - Twilio)
- [ ] Credentials configuradas
- [ ] Templates creados
- [ ] Testing enviado
- [ ] Error handling

### Monitoring & Observability

#### Logs
- [ ] Logs centralizados (Axiom/Datadog)
- [ ] Structured logging
- [ ] Log levels apropiados
- [ ] Retention policy configurada
- [ ] Alertas en errors

#### Metrics
- [ ] Dashboard creado (Grafana)
- [ ] System metrics (CPU, RAM, DB)
- [ ] Business metrics (bookings, revenue)
- [ ] Performance metrics (latency, errors)
- [ ] Alertas configuradas

#### Uptime
- [ ] UptimeRobot configurado
- [ ] Checks cada 5 min
- [ ] Alertas por email/Slack
- [ ] Status page (opcional)

#### Error Tracking
- [ ] Sentry/Rollbar configurado
- [ ] Source maps uploaded
- [ ] User context incluido
- [ ] Breadcrumbs habilitados
- [ ] Alertas configuradas

### Testing

#### Unit Tests
- [ ] Coverage >60%
- [ ] Servicios críticos 100%
- [ ] Tests pasan en CI
- [ ] No tests skipped

#### Integration Tests
- [ ] API endpoints cubiertos
- [ ] Database operations validadas
- [ ] External services mockeados
- [ ] Tests pasan en CI

#### E2E Tests
- [ ] Flujo completo de reserva
- [ ] Flujo de publicación
- [ ] Flujo de pago
- [ ] Error scenarios
- [ ] Tests pasan en CI

#### Performance Tests
- [ ] Load testing (JMeter/k6)
- [ ] 100 usuarios concurrentes
- [ ] Response time <500ms p95
- [ ] No memory leaks

---

## 📊 Métricas de Producción

### Technical KPIs

**Availability:**
- Target: 99.9% uptime
- Max downtime: 43 min/mes

**Performance:**
- API response: <500ms p95
- Page load: <3s
- Database queries: <100ms p95

**Errors:**
- Error rate: <1%
- No critical errors
- Recovery time: <15 min

### Business KPIs (Month 1)

**Adoption:**
- Signups: 100+
- Active users: 50+
- Car listings: 20+

**Transactions:**
- Bookings: 10+
- GMV: ARS 50,000+
- Platform revenue: ARS 7,500+

**Engagement:**
- DAU/MAU ratio: >20%
- Session duration: >3 min
- Bounce rate: <60%

---

## 🚀 Launch Decision Matrix

### Go/No-Go Criteria

**MUST HAVE (Bloqueantes):**
- ✅ Fase 01: Seguridad completa
- ⏳ Fase 02: Split payments funcionando
- ⏳ Fase 03: Bugs críticos resueltos
- ⏳ Fase 04: 50+ pagos test exitosos

**SHOULD HAVE (Importantes):**
- ⏳ Fase 05: Staging + CI/CD
- ⏳ Monitoring y alertas
- ⏳ Backups automatizados

**NICE TO HAVE (Opcionales):**
- ⏳ Fase 06: Polish UI/UX
- ⏳ Documentación completa
- ⏳ Marketing materials

### Decision Rules

**GREEN LIGHT (Lanzar):**
- Todos los MUST HAVE ✅
- >80% SHOULD HAVE ✅
- Zero bugs críticos
- Equipo ready

**YELLOW LIGHT (Soft Launch):**
- Todos los MUST HAVE ✅
- 50-80% SHOULD HAVE ✅
- <3 bugs menores
- Beta privada OK

**RED LIGHT (Delay):**
- Algún MUST HAVE ⏳
- <50% SHOULD HAVE ✅
- Bugs críticos sin resolver
- Tests fallando

---

## 📅 Timeline Estimado

```
Semana 1-2: Fase 02 (Split Payment)
Semana 3: Fase 03 (Bugs Críticos)
Semana 4: Fase 04 (Testing Real)
Semana 5-6: Fase 05 (Infraestructura)
Semana 7: Fase 06 (Polish)
Semana 8: LANZAMIENTO 🚀
```

**ETA Lanzamiento:** 2 meses desde hoy

---

## ✅ Aprobación Final

### Checklist Pre-Launch (Última Hora)

```bash
#!/bin/bash
# scripts/pre-launch-check.sh

echo "🚀 PRE-LAUNCH CHECKLIST"
echo "======================="
echo ""

# 1. Backup
echo "1️⃣  Creating backup..."
./scripts/backup-production.sh

# 2. Health check
echo "2️⃣  Health check..."
./scripts/health-check-comprehensive.sh

# 3. Smoke tests
echo "3️⃣  Smoke tests..."
npm run test:e2e:smoke

# 4. Security scan
echo "4️⃣  Security scan..."
./scripts/validate-no-secrets.sh
npm audit --audit-level=high

# 5. Performance check
echo "5️⃣  Performance check..."
lighthouse https://autorentar.com.ar --output json

# 6. DNS propagation
echo "6️⃣  DNS check..."
dig autorenta.com.ar

# 7. SSL check
echo "7️⃣  SSL check..."
openssl s_client -connect autorenta.com.ar:443 -servername autorenta.com.ar

echo ""
echo "✅ PRE-LAUNCH CHECK COMPLETE"
echo "Ready to launch? (y/n)"
read -r response

if [ "$response" = "y" ]; then
  echo "🚀 LAUNCHING..."
  # Deploy trigger
else
  echo "❌ Launch aborted"
fi
```

### Sign-Off

**Technical Lead:** _________________ Fecha: _______

**Product Owner:** _________________ Fecha: _______

**CEO/Founder:** _________________ Fecha: _______

---

## 📞 Contacto de Emergencia

**On-Call Engineer:** [Tu número]  
**Backup Engineer:** [Número backup]  
**MercadoPago Support:** soporte@mercadopago.com.ar  
**Supabase Support:** support@supabase.com  
**Cloudflare Support:** [Tu contact]

---

## 🎉 Post-Launch

### Day 1 Checklist
- [ ] Monitor dashboards (cada 30 min)
- [ ] Responder usuarios (email/chat)
- [ ] Log review (cada hora)
- [ ] Fix bugs críticos inmediatamente

### Week 1 Checklist
- [ ] Retrospectiva de lanzamiento
- [ ] Analizar métricas vs targets
- [ ] User feedback analysis
- [ ] Priorizar next features

---

**Versión:** 1.0  
**Estado:** 🟡 En progreso (40%)  
**Próxima revisión:** Cada viernes hasta launch

---

**NOTA IMPORTANTE:**  
Este checklist debe actualizarse semanalmente conforme se completan fases. El estado de cada item debe reflejar la realidad actual del proyecto.
