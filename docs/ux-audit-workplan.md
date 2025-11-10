# 📋 Plan de Trabajo: Auditoría UX y Mejoras de Diseño

**Fecha de Creación**: 2025-11-10
**Branch**: `claude/ux-audit-design-flows-011CUyvN7pCWTNpzTmH5M9TZ`
**Issues**: #183, #184, #185, #186, #187

---

## 🎯 Objetivo General

Realizar una auditoría UX completa de los flujos críticos de AutoRenta (booking, publicación, wallet, dashboard) y proponer e implementar mejoras de diseño que optimicen la experiencia de usuario, mantengan consistencia visual y mejoren la accesibilidad.

---

## 📊 Estado Actual del Sistema de Diseño

### Fortalezas Identificadas

✅ **Sistema de colores bien documentado**
- `COLOR_SYSTEM_GUIDE.md` completo con paleta, semántica y ejemplos
- Variables CSS centralizadas en `/apps/web/src/styles.css`
- Tokens centralizados en `/apps/web/src/config/theme/tailwind-colors.js`
- Soporte para dark mode (`darkMode: 'class'`)

✅ **Tipografía consistente**
- Sistema Inter con escala modular 1.250 (Major Third)
- Line heights definidos para cada tamaño
- Font weights estandarizados (400, 500, 600, 700, 800)

✅ **Componentes compartidos**
- `apps/web/src/app/shared/components/` con +20 componentes reutilizables
- Componentes especializados por feature

### Áreas de Oportunidad

⚠️ **Inconsistencias visuales**
- Mezcla de colores legacy y nuevos tokens semánticos
- Algunos componentes usan colores Tailwind por defecto (prohibido según guía)
- Falta de patrones unificados para estados (loading, empty, error)

⚠️ **UX de flujos complejos**
- Flujo de booking con múltiples pasos (checkout, pago, confirmación)
- Flujo de publicación con wizard extenso
- Wallet con múltiples estados (disponible, bloqueado, pendiente)

⚠️ **Documentación fragmentada**
- Guías de estilo dispersas en `/docs`
- Sin wireframes o mockups de referencia
- Falta de design system vivo (Storybook, Figma, etc.)

---

## 🗺️ Roadmap de Issues

### Issue #183: Auditoría UX de Flujos
**Objetivo**: Mapear y documentar los flujos actuales de booking, publicación, wallet y dashboard

**Entregable**: `docs/ux-audit.md` (Sección 1: Auditoría de Flujos)

**Tareas**:
1. **Flujo de Booking** (apps/web/src/app/features/bookings/)
   - [ ] Mapear journey completo: búsqueda → selección → checkout → pago → confirmación
   - [ ] Identificar pain points (pasos innecesarios, confusión, fricción)
   - [ ] Documentar componentes involucrados y dependencias
   - [ ] Capturar screenshots de cada paso

2. **Flujo de Publicación** (apps/web/src/app/features/cars/publish/)
   - [ ] Mapear wizard de publicación paso a paso
   - [ ] Identificar drop-off points (dónde abandonan los usuarios)
   - [ ] Documentar validaciones y mensajes de error
   - [ ] Evaluar UX de subida de fotos y documentos

3. **Flujo de Wallet** (apps/web/src/app/features/wallet/)
   - [ ] Mapear operaciones: depósito → visualización balance → retiro
   - [ ] Documentar estados del balance (disponible, bloqueado, pendiente)
   - [ ] Evaluar claridad de transacciones y ledger
   - [ ] Identificar confusiones sobre fondos withdrawable vs non-withdrawable

4. **Dashboard del Locador** (apps/web/src/app/features/dashboard/)
   - [ ] Mapear información presentada y jerarquía visual
   - [ ] Evaluar densidad de información y priorización
   - [ ] Identificar acciones rápidas faltantes
   - [ ] Documentar componentes (multi-car-calendar, payouts-history, etc.)

**Dependencias**: Ninguna

**Estimación**: 1 día

---

### Issue #184: Auditoría Visual
**Objetivo**: Auditar colores, tipografías, espaciados, y estados visuales en los componentes

**Entregable**: `docs/ux-audit.md` (Sección 2: Auditoría Visual)

**Tareas**:
1. **Auditoría de Colores**
   - [ ] Identificar uso de colores Tailwind por defecto (prohibido)
   - [ ] Verificar consistencia de colores semánticos (success, warning, error)
   - [ ] Listar colores legacy que deben migrarse a tokens
   - [ ] Verificar contraste WCAG AA (4.5:1) en componentes críticos

2. **Auditoría de Tipografía**
   - [ ] Verificar uso consistente de escala tipográfica
   - [ ] Identificar textos con font-sizes hardcoded
   - [ ] Evaluar line-heights y spacing vertical
   - [ ] Documentar inconsistencias en font-weights

3. **Auditoría de Espaciados**
   - [ ] Verificar uso de variables de spacing vs valores hardcoded
   - [ ] Evaluar padding/margin inconsistentes
   - [ ] Documentar problemas de responsive spacing

4. **Auditoría de Estados**
   - [ ] Documentar patrones de loading states (spinners, skeletons)
   - [ ] Identificar empty states (sin datos, sin resultados)
   - [ ] Revisar error states y mensajes de feedback
   - [ ] Evaluar disabled states y accesibilidad

5. **Auditoría de Componentes Críticos**
   - [ ] Botones (primarios, secundarios, outlined, disabled)
   - [ ] Tarjetas (elevación, sombras, bordes)
   - [ ] Formularios (inputs, selects, validación)
   - [ ] Modales (overlay, tamaño, posición)
   - [ ] Navegación (mobile, desktop, breadcrumbs)

**Dependencias**: Issue #183 (para tener contexto de flujos)

**Estimación**: 1-2 días

---

### Issue #185: Propuestas de Diseño
**Objetivo**: Proponer mejoras concretas basadas en los hallazgos de las auditorías

**Entregables**:
- `docs/ux-audit.md` (Sección 3: Propuestas de Mejora)
- `docs/design-tokens-v2.md` (sistema de tokens refinado)
- `docs/wireframes/` (opcional: wireframes/mockups de flujos rediseñados)

**Tareas**:
1. **Sistema de Tokens Unificado**
   - [ ] Proponer migración completa de colores legacy a tokens semánticos
   - [ ] Definir tokens de spacing consistentes
   - [ ] Crear tokens de sombras (elevation system)
   - [ ] Proponer tokens de border-radius y transiciones

2. **Paleta Refinada**
   - [ ] Validar paleta actual contra accesibilidad (WCAG AA)
   - [ ] Proponer ajustes si es necesario
   - [ ] Definir paleta de estados (loading, success, warning, error, info)
   - [ ] Crear guía visual de uso de colores

3. **Wireframes de Flujos Clave**
   - [ ] Booking flow optimizado (menos pasos, más claridad)
   - [ ] Publish flow mejorado (wizard más intuitivo)
   - [ ] Wallet dashboard rediseñado (info clara, acciones rápidas)
   - [ ] Owner dashboard optimizado (KPIs prioritarios)

4. **Patrones de Componentes**
   - [ ] Documentar patrones de loading (spinner, skeleton, progressive)
   - [ ] Definir patrones de empty states
   - [ ] Estandarizar error messages y feedback
   - [ ] Crear guía de uso de modales vs pages

5. **Mejoras de Accesibilidad**
   - [ ] Proponer mejoras de contraste
   - [ ] Definir estados de focus consistentes
   - [ ] Mejorar labels y ARIA attributes
   - [ ] Proponer mejoras de keyboard navigation

**Dependencias**: Issues #183 y #184 (auditorías completadas)

**Estimación**: 2-3 días

---

### Issue #186: Implementación UI
**Objetivo**: Implementar las mejoras propuestas en componentes compartidos y features

**Entregables**:
- Componentes actualizados con nuevos tokens
- Flujos refactorizados según wireframes
- Tests actualizados

**Tareas**:
1. **Migración de Tokens**
   - [ ] Actualizar `tailwind.config.js` con nuevos tokens
   - [ ] Actualizar `styles.css` con variables CSS refinadas
   - [ ] Migrar componentes compartidos a nuevos tokens
   - [ ] Buscar y reemplazar colores Tailwind por defecto

2. **Componentes Compartidos**
   - [ ] Actualizar botones (variantes, estados, accesibilidad)
   - [ ] Actualizar cards (elevación consistente, spacing)
   - [ ] Actualizar form inputs (validación visual, estados)
   - [ ] Actualizar modales (overlay, tamaño responsive)
   - [ ] Crear/actualizar loading states (spinner, skeleton)
   - [ ] Crear/actualizar empty states
   - [ ] Crear/actualizar error states

3. **Flujo de Booking**
   - [ ] Refactorizar checkout (simplificar pasos)
   - [ ] Mejorar payment summary (claridad de costos)
   - [ ] Actualizar booking-detail (info clara, acciones visibles)
   - [ ] Optimizar mobile UX

4. **Flujo de Publicación**
   - [ ] Mejorar wizard de publish (pasos claros, progreso visible)
   - [ ] Optimizar upload de fotos (drag & drop, preview)
   - [ ] Mejorar validación de formularios (feedback claro)

5. **Wallet**
   - [ ] Rediseñar wallet page (balance destacado, acciones rápidas)
   - [ ] Mejorar ledger history (filtros, búsqueda, paginación)
   - [ ] Clarificar estados de fondos (disponible, bloqueado, pendiente)
   - [ ] Optimizar deposit flow (menos pasos)

6. **Dashboard**
   - [ ] Optimizar owner-dashboard (KPIs prioritarios, layout claro)
   - [ ] Mejorar multi-car-calendar (visualización clara)
   - [ ] Actualizar payouts-history (info relevante, acciones rápidas)

**Dependencias**: Issue #185 (propuestas definidas y aprobadas)

**Estimación**: 3-5 días

---

### Issue #187: Validación UX Final
**Objetivo**: Validar las mejoras implementadas mediante QA visual, accesibilidad y checklist

**Entregables**:
- `docs/ux-audit.md` (Sección 4: Validación y Resultados)
- Checklist de estilos completado
- Reporte de accesibilidad (WCAG AA)

**Tareas**:
1. **QA Visual**
   - [ ] Verificar consistencia de colores en todos los flujos
   - [ ] Verificar tipografía consistente (tamaños, weights, line-heights)
   - [ ] Verificar espaciados consistentes (padding, margin)
   - [ ] Verificar estados consistentes (hover, focus, disabled, loading, error)
   - [ ] Verificar responsive design (mobile, tablet, desktop)
   - [ ] Verificar dark mode (si aplica)

2. **QA de Accesibilidad**
   - [ ] Verificar contraste WCAG AA (4.5:1) en todos los componentes
   - [ ] Verificar keyboard navigation (tab order, focus visible)
   - [ ] Verificar screen reader compatibility (ARIA labels, roles)
   - [ ] Verificar form accessibility (labels, error messages)
   - [ ] Ejecutar Lighthouse audit (score 90+ en accesibilidad)

3. **QA de Flujos**
   - [ ] Testear flujo de booking completo (happy path + edge cases)
   - [ ] Testear flujo de publicación completo
   - [ ] Testear operaciones de wallet (depósito, retiro, ledger)
   - [ ] Testear dashboard (navegación, acciones, responsiveness)

4. **Checklist de Estilos**
   - [ ] ¿Se usan variables CSS en lugar de valores hardcoded? ✅/❌
   - [ ] ¿Se usan tokens semánticos en lugar de colores legacy? ✅/❌
   - [ ] ¿El contraste cumple WCAG AA? ✅/❌
   - [ ] ¿Los hover states son consistentes? ✅/❌
   - [ ] ¿Los loading/empty/error states son consistentes? ✅/❌
   - [ ] ¿Los espaciados usan variables de spacing? ✅/❌
   - [ ] ¿La tipografía usa la escala modular? ✅/❌

5. **Documentación Final**
   - [ ] Actualizar `COLOR_SYSTEM_GUIDE.md` con cambios
   - [ ] Crear/actualizar `DESIGN_PATTERNS.md` con patrones documentados
   - [ ] Crear guía de migración para futuros componentes
   - [ ] Documentar mejoras de accesibilidad implementadas
   - [ ] Crear before/after comparisons (screenshots)

**Dependencias**: Issue #186 (implementación completada)

**Estimación**: 1-2 días

---

## 📅 Timeline Estimado

| Issue | Descripción | Estimación | Dependencias |
|-------|-------------|------------|--------------|
| #183 | Auditoría UX de flujos | 1 día | - |
| #184 | Auditoría visual | 1-2 días | #183 |
| #185 | Propuestas de diseño | 2-3 días | #183, #184 |
| #186 | Implementación UI | 3-5 días | #185 |
| #187 | Validación UX final | 1-2 días | #186 |
| **TOTAL** | **Proyecto completo** | **8-13 días** | - |

**Nota**: Los tiempos son estimaciones conservadoras. Se puede trabajar en paralelo en algunas tareas (ej: auditoría visual mientras se completa auditoría de flujos).

---

## 🛠️ Herramientas y Recursos

### Herramientas de Auditoría
- **Contraste**: https://webaim.org/resources/contrastchecker/
- **Lighthouse**: DevTools > Lighthouse (Accessibility audit)
- **axe DevTools**: Extension para auditoría de accesibilidad
- **Wave**: Extension para WCAG compliance

### Herramientas de Diseño
- **Figma** (opcional): Para wireframes y mockups
- **Excalidraw** (alternativa): Para wireframes rápidos
- **Storybook** (futuro): Para design system vivo

### Referencias
- **Material Design**: https://m3.material.io/ (patrones de UX)
- **Tailwind UI**: https://tailwindui.com/ (componentes de referencia)
- **Inclusive Components**: https://inclusive-components.design/ (accesibilidad)

---

## 🎯 Criterios de Éxito

### Auditorías (#183, #184)
- ✅ Documento `docs/ux-audit.md` completo con hallazgos detallados
- ✅ Pain points identificados con evidencia (screenshots, ejemplos de código)
- ✅ Priorización de mejoras (crítico, alto, medio, bajo)

### Propuestas (#185)
- ✅ Sistema de tokens refinado y documentado
- ✅ Wireframes de flujos clave (al menos: booking, publish, wallet)
- ✅ Patrones de componentes documentados
- ✅ Roadmap de implementación claro

### Implementación (#186)
- ✅ Todos los componentes usan tokens semánticos (sin hardcoded colors)
- ✅ Flujos refactorizados según wireframes aprobados
- ✅ Tests pasando (unit + e2e)
- ✅ Build exitoso sin errores de TypeScript

### Validación (#187)
- ✅ Lighthouse Accessibility Score: 90+
- ✅ Contraste WCAG AA: 100% de componentes críticos
- ✅ QA manual: 0 issues críticos, < 5 issues menores
- ✅ Documentación actualizada y completa

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Cambios rompen funcionalidad existente
**Mitigación**:
- Trabajar en branch dedicada (`claude/ux-audit-design-flows-*`)
- Ejecutar tests frecuentemente (`npm run test:quick`)
- Hacer commits pequeños y frecuentes
- Testear manualmente cada flujo después de cambios

### Riesgo 2: Scope creep (scope se expande demasiado)
**Mitigación**:
- Seguir estrictamente el plan de issues
- Priorizar mejoras críticas primero
- Documentar mejoras "nice to have" para futuro
- Hacer checkpoints de progreso cada issue

### Riesgo 3: Inconsistencias en la implementación
**Mitigación**:
- Crear guía de migración antes de empezar implementación
- Usar search & replace global para colores legacy
- Peer review de cambios (si hay otro dev en equipo)
- Ejecutar linter frecuentemente (`npm run lint:fix`)

### Riesgo 4: Problemas de accesibilidad no detectados
**Mitigación**:
- Ejecutar Lighthouse en cada componente modificado
- Testear con keyboard navigation
- Usar screen reader para verificar (VoiceOver, NVDA)
- Revisar contra checklist WCAG AA

---

## 📝 Notas de Implementación

### Comandos Útiles

```bash
# Iniciar dev environment
npm run dev

# Tests rápidos (sin coverage)
npm run test:quick

# Lint + format
npm run lint:fix

# Build para verificar no hay errores
npm run build

# Sincronizar tipos de DB (si se tocan schemas)
npm run sync:types

# Ver estado del proyecto
npm run status
```

### Convenciones de Commits

```
feat(ux): add new loading skeleton for booking cards
fix(ux): improve contrast in wallet balance display
refactor(ux): migrate dashboard to semantic tokens
docs(ux): add booking flow wireframes
test(ux): add accessibility tests for forms
```

### Checklist Pre-Commit

- [ ] `npm run lint:fix` ejecutado
- [ ] `npm run test:quick` pasa
- [ ] Cambios testeados manualmente en browser
- [ ] Responsive verificado (mobile + desktop)
- [ ] Commit message descriptivo

---

## 📚 Referencias del Proyecto

- **Arquitectura**: [CLAUDE_ARCHITECTURE.md](../CLAUDE_ARCHITECTURE.md)
- **Workflows**: [CLAUDE_WORKFLOWS.md](../CLAUDE_WORKFLOWS.md)
- **Sistema de colores**: [COLOR_SYSTEM_GUIDE.md](./COLOR_SYSTEM_GUIDE.md)
- **Troubleshooting**: [docs/runbooks/troubleshooting.md](./runbooks/troubleshooting.md)

---

**Última actualización**: 2025-11-10
**Autor**: Claude Code
**Revisión**: Pendiente
