# ✅ Tour System - Implementation Checklist

## 📋 Pre-Implementation

- [x] ✅ Arquitectura diseñada (TOUR_GUIADO_REWRITE.md)
- [x] ✅ Sistema implementado (apps/web/src/app/core/guided-tour/)
- [x] ✅ Documentación creada (README.md + TOUR_MIGRATION_GUIDE.md)
- [x] ✅ Tests básicos creados (guided-tour.service.spec.ts)
- [x] ✅ Script de verificación (verify-tour-system.sh)

---

## 🚀 Phase 0: Setup (Day 1)

### Dependencies
- [ ] Instalar Shepherd.js: `npm install shepherd.js`
- [ ] Verificar versión Angular compatible (>= 16)
- [ ] Ejecutar script de verificación: `./verify-tour-system.sh`

### Environment
- [ ] Verificar que sistema se compila sin errores
- [ ] Verificar imports funcionan correctamente
- [ ] Habilitar debug mode en dev: `guidedTour.enableDebug()`

---

## 🏗️ Phase 1: Infrastructure (Week 1)

### Core Integration
- [ ] Actualizar `AppComponent`:
  - [ ] Importar `GuidedTourService`
  - [ ] Remover código de inicialización manual de tours
  - [ ] (Opcional) Habilitar debug en dev mode

- [ ] Actualizar `HelpButtonComponent`:
  - [ ] Cambiar `TourService` → `GuidedTourService`
  - [ ] Usar método `.request()` en lugar de `.startXTour()`
  - [ ] Actualizar template si es necesario

### HTML Markers
- [ ] Agregar `data-tour-step` attributes en templates:
  - [ ] Homepage/Hero: `data-tour-step="welcome-hero"`
  - [ ] Navigation: `data-tour-step="welcome-nav"`
  - [ ] Help button: `data-tour-step="welcome-help"`
  - [ ] Search bar: `data-tour-step="guided-search"`
  - [ ] Car cards: `data-tour-step="guided-select-car"`

### Testing
- [ ] Probar Welcome Tour en homepage
- [ ] Verificar que no se repite después de completar
- [ ] Probar "Dismiss" functionality (24h cooldown)
- [ ] Verificar debug logs en consola

---

## 🧩 Phase 2: Tour Migration (Week 2)

### Welcome Tour
- [x] ✅ Ya migrado en TourRegistry (3 pasos)
- [ ] Validar contenido de los pasos
- [ ] Ajustar posiciones según diseño actual
- [ ] Testing en mobile/desktop

### GuidedBooking Tour
- [ ] Extender definición con todos los pasos:
  - [ ] `guided-search`
  - [ ] `guided-select-car`
  - [ ] `guided-car-detail`
  - [ ] `guided-dates`
  - [ ] `guided-price`
  - [ ] `guided-book-button`
  - [ ] `guided-booking-detail`
  - [ ] `guided-chat`
  - [ ] `guided-payment`
  - [ ] `guided-complete`

- [ ] Agregar guards:
  - [ ] `hasInventory`: Verificar que hay autos disponibles
  - [ ] `isSearchRoute`: Verificar ruta correcta

- [ ] Agregar triggers:
  - [ ] Route trigger: `/cars`
  - [ ] Custom event: `inventory-ready`

- [ ] Testing flujo completo de reserva

### Renter/Owner/CarDetail Tours
- [ ] Revisar y actualizar contenido
- [ ] Agregar `data-tour-step` markers
- [ ] Testing básico de cada tour

---

## 📊 Phase 3: Analytics (Week 3)

### Telemetry Integration
- [ ] Conectar `TelemetryBridge` con analytics provider:
  - [ ] Google Analytics
  - [ ] Mixpanel
  - [ ] Segment
  - [ ] Custom analytics service

- [ ] Verificar eventos se envían correctamente:
  - [ ] `tour_started`
  - [ ] `tour_step_shown`
  - [ ] `tour_step_completed`
  - [ ] `tour_completed`
  - [ ] `tour_cancelled`
  - [ ] `tour_error`

- [ ] Crear dashboard de métricas:
  - [ ] Tour completion rate
  - [ ] Most skipped steps
  - [ ] Average time per tour
  - [ ] Drop-off analysis

---

## 🧪 Phase 4: Testing & QA (Week 3-4)

### Unit Tests
- [ ] Completar tests de `GuidedTourService`
- [ ] Tests de `TourOrchestratorService`
- [ ] Tests de `StepResolverService`
- [ ] Tests de `TelemetryBridgeService`
- [ ] Coverage objetivo: >80%

### E2E Tests
- [ ] Welcome tour: First visit
- [ ] Welcome tour: Completion
- [ ] Welcome tour: Dismissal
- [ ] GuidedBooking: Full flow
- [ ] Help button: Tour selection
- [ ] Mobile responsive tests

### Manual QA
- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Tablet (iPad, Android tablet)
- [ ] Different screen sizes: 320px, 768px, 1024px, 1920px
- [ ] Slow network conditions
- [ ] DOM elements loading delayed

---

## 🎨 Phase 5: UX Refinement (Week 4)

### Content Review
- [ ] Revisar textos con equipo de producto
- [ ] Verificar tono y lenguaje
- [ ] Traducir a otros idiomas (si aplica)
- [ ] Ajustar longitud de textos para mobile

### Visual Polish
- [ ] Personalizar estilos de Shepherd:
  - [ ] Colores de marca
  - [ ] Tipografía
  - [ ] Animaciones
  - [ ] Botones

- [ ] Agregar iconos/emojis donde corresponda
- [ ] Verificar contraste de colores (accesibilidad)

### Timing & Flow
- [ ] Ajustar throttle periods según feedback
- [ ] Revisar orden de pasos
- [ ] Optimizar transiciones entre pasos
- [ ] Verificar timing de auto-start tours

---

## 🧹 Phase 6: Cleanup (Week 4)

### Code Cleanup
- [ ] Deprecar `TourService` antiguo
- [ ] Agregar warnings de deprecation
- [ ] (Opcional) Crear compatibility layer temporal
- [ ] Actualizar todos los imports en el codebase

### Documentation
- [ ] Actualizar docs internos
- [ ] Crear guía de onboarding para nuevos devs
- [ ] Documentar proceso de agregar nuevos tours
- [ ] Crear video tutorial (opcional)

### Performance
- [ ] Medir bundle size impact
- [ ] Implementar lazy loading si es necesario
- [ ] Optimizar MutationObserver usage
- [ ] Profile de memoria en mobile

---

## 🚢 Phase 7: Deployment (Week 5)

### Pre-Deployment
- [ ] Code review completo
- [ ] Merge a staging branch
- [ ] Deploy a staging environment
- [ ] QA final en staging
- [ ] Smoke tests

### Deployment Strategy
- [ ] Opción A: Full deployment (todos los tours a la vez)
  - [ ] Pros: Consistencia, simplificado
  - [ ] Cons: Mayor riesgo

- [ ] Opción B: Gradual rollout (feature flag por tour)
  - [ ] Welcome tour: 100% usuarios
  - [ ] GuidedBooking: 25% → 50% → 100%
  - [ ] Other tours: 10% → 50% → 100%

- [ ] Opción C: Canary deployment
  - [ ] 5% usuarios → monitoring → 100%

### Monitoring
- [ ] Configurar alertas:
  - [ ] Error rate > 1%
  - [ ] Completion rate < 50%
  - [ ] Page load time increase > 10%

- [ ] Dashboard en tiempo real:
  - [ ] Tours activos
  - [ ] Completion rate por tour
  - [ ] Errores recientes

---

## 📈 Post-Deployment

### Week 1 After Launch
- [ ] Monitor analytics diariamente
- [ ] Responder a feedback de usuarios
- [ ] Hotfix de bugs críticos
- [ ] Ajustar tours según data

### Week 2-4 After Launch
- [ ] Análisis de datos completo
- [ ] Identificar mejoras
- [ ] A/B tests de variaciones
- [ ] Optimizaciones de performance

### Long-term
- [ ] Supabase integration (tours remotos)
- [ ] Feature flags por usuario/región
- [ ] Contenido dinámico
- [ ] Multi-idioma (i18n)
- [ ] Video/GIF support en steps

---

## 🎯 Success Criteria

### Metrics Goals
- [ ] **Tour Completion Rate**: >60% (target: 70%)
- [ ] **Error Rate**: <1% (target: 0.5%)
- [ ] **User Satisfaction**: >4/5 stars
- [ ] **Time to First Interaction**: <3 seconds
- [ ] **Bundle Size Increase**: <60KB (target: <50KB)

### Quality Gates
- [ ] Zero console errors
- [ ] No layout shifts (CLS < 0.1)
- [ ] Mobile performance: LCP < 2.5s
- [ ] Accessibility score: >90
- [ ] Code coverage: >80%

---

## 🆘 Rollback Plan

### Triggers
- Error rate >5%
- Completion rate <30%
- Critical bug reported
- Performance degradation >20%

### Steps
1. [ ] Disable tours via feature flag
2. [ ] Revert to old `TourService` (if kept)
3. [ ] Deploy hotfix
4. [ ] Post-mortem analysis
5. [ ] Plan remediation

---

## 📞 Contacts & Resources

- **Tech Lead**: [Name]
- **Product Owner**: [Name]
- **QA Lead**: [Name]
- **Documentation**: `apps/web/src/app/core/guided-tour/README.md`
- **Migration Guide**: `TOUR_MIGRATION_GUIDE.md`
- **Examples**: `apps/web/src/app/core/guided-tour/EXAMPLES.ts`

---

## 🎉 Sign-off

- [ ] Dev Lead approved
- [ ] Product Owner approved
- [ ] QA Lead approved
- [ ] Security review completed
- [ ] Performance review completed
- [ ] Ready for production ✅

---

**Last Updated**: 2025-10-24  
**Version**: 1.0.0  
**Status**: READY FOR IMPLEMENTATION
