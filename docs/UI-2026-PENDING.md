# UI 2026 - Páginas Pendientes de Modernización

> **Última actualización:** 2026-01-11
> **Fase actual:** Fase 3 en progreso

---

## Estado del Proyecto

### Completadas (Fase 1 + Fase 2 + Fase 3 parcial)

| Página | Archivo | Mejoras Aplicadas |
|--------|---------|-------------------|
| **Fundamentos** | `tailwind.config.js` | Bento Grid utilities |
| **Fundamentos** | `styles/glass.css` | Sistema glassmorphism |
| **Fundamentos** | `styles/fluid-design.css` | Tipografía fluida extendida |
| **Directivas** | `shared/directives/` | 4 directivas de micro-interacción |
| **Booking Checkout** | `booking-checkout.page.html` | Bento Grid + Glass + Directivas |
| **Booking Detail** | `booking-detail.page.html` | Timeline moderno + Glass cards |
| **Car Detail** | `car-detail.page.html` | Glass cards + Hover effects |
| **My Bookings** | `my-bookings.page.html` | Bento Grid + Glass cards + Spring collapse + Filter pills animados |
| **Wallet** | `wallet.page.html` | Glass panels + Balance cards con HoverLift + Tabs animados + Tipografía fluida |

---

## Fase 3: Páginas Secundarias (Pendientes)

### 4. My Bookings `/bookings` ✅ COMPLETADO
**Archivo:** `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html`

**Mejoras aplicadas:**
- [x] Bento Grid summary con 3 cards (Acción, Activas, Historial)
- [x] Filter chips animados con `appPressScale`
- [x] Spring animations en collapse/expand con `appSpringCollapse`
- [x] Glass navbar sticky con efecto translúcido
- [x] Glass cards en secciones colapsables
- [x] Booking cards con `appHoverLift`
- [x] Stagger enter animations
- [x] Skeleton loaders con glass effect
- [x] Tipografía fluida (`text-hero-md`, `text-balance-lg`)

---

### 5. Owner Dashboard `/dashboard`
**Archivo:** `apps/web/src/app/features/dashboard/owner-dashboard.page.html`

**Problemas actuales:**
- Balance cards sin jerarquía visual fuerte
- Stats widgets planos
- Sin animaciones de datos

**Mejoras a aplicar:**
- [ ] Bento Grid con hero balance card (`.bento-grid-hero`)
- [ ] Glassmorphism en widgets de income (`.glass-panel`)
- [ ] Contadores animados con easing
- [ ] `appStaggerEnter` en quick actions
- [ ] Tipografía fluida para balances (`.text-balance-xl`)

**Estimación:** Alta complejidad (muchos widgets)

---

### 6. Wallet `/wallet` ✅ COMPLETADO
**Archivo:** `apps/web/src/app/features/wallet/wallet.page.html`

**Mejoras aplicadas:**
- [x] Glass panels en secciones principales
- [x] Balance cards con `appHoverLift` y gradient borders
- [x] Hero balance card con ring-2 success
- [x] Bento layout 4 columnas para balances
- [x] Tipografía fluida (`text-hero-md`, `text-balance-xl`, `text-balance-lg`)
- [x] Tabs animados con `appPressScale`
- [x] Withdrawal mode toggles con `appPressScale`
- [x] Stagger enter en todas las secciones
- [x] Progress bar mejorado con gradient

---

### 7. Profile Expanded `/profile`
**Archivo:** `apps/web/src/app/features/profile/profile-expanded.page.html`

**Problemas actuales:**
- Stats sin jerarquía visual
- Quick actions planas
- Badges estáticos

**Mejoras a aplicar:**
- [ ] Bento Grid para stats y quick actions
- [ ] Badges de verificación con animación sutil
- [ ] Micro-interacciones en level progress
- [ ] `appHoverLift` en cards de stats
- [ ] Glass effect en header de perfil

**Estimación:** Media complejidad

---

### 8. Check-in Flow `/bookings/:id/check-in`
**Archivo:** `apps/web/src/app/features/bookings/check-in/check-in.page.html`

**Problemas actuales:**
- Mode selector sin feedback visual
- Upload de fotos básico
- Sin celebración al completar

**Mejoras a aplicar:**
- [ ] Mode selector visual con iconos y `appPressScale`
- [ ] Drag-and-drop upload con preview
- [ ] Progress stepper con conectores animados
- [ ] Celebración confetti/success animation en completion
- [ ] `appSpringCollapse` en secciones expandibles

**Estimación:** Alta complejidad (muchos pasos)

---

### 9. Check-out Flow `/bookings/:id/check-out`
**Archivo:** `apps/web/src/app/features/bookings/check-out/check-out.page.html`

**Problemas actuales:**
- Similar a check-in
- Comparación de daños sin highlight visual

**Mejoras a aplicar:**
- [ ] Similar a check-in
- [ ] Progress stepper con spring animations
- [ ] Highlight visual en comparación de daños
- [ ] `appHoverLift` en cards de inspección

**Estimación:** Alta complejidad

---

### 10. Disputes/Claims `/bookings/:id/disputes`
**Archivo:** `apps/web/src/app/features/disputes/`

**Problemas actuales:**
- Formularios tradicionales
- Timeline básico
- Sin asistencia visual

**Mejoras a aplicar:**
- [ ] Diseño conversacional de formularios
- [ ] Timeline animado de progreso
- [ ] AI-assisted explanations con glassmorphism
- [ ] `appStaggerEnter` en steps del proceso

**Estimación:** Media complejidad

---

## Fase 4: Polish (Pendiente)

### View Transitions API
**Archivos a modificar:** `app.routes.ts`, páginas principales

- [ ] Configurar `withViewTransitions()` en router
- [ ] Añadir `view-transition-name` a elementos hero
- [ ] Animaciones cross-page para imágenes de autos
- [ ] Transiciones suaves entre booking states

---

### GenUI (Interfaces Adaptativas)
**Concepto:** Priorización visual según contexto del usuario

- [ ] Acciones urgentes prominentes (pagos pendientes, check-in próximo)
- [ ] Reordenamiento de cards según relevancia
- [ ] Badges dinámicos según estado
- [ ] CTAs contextuales según rol (owner vs renter)

---

### Auditoría de Performance
- [ ] Lighthouse score > 90 en todas las páginas modificadas
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Verificar que glassmorphism no afecte performance en móviles

---

### Auditoría de Accesibilidad
- [ ] Contraste WCAG AA en todos los elementos glass
- [ ] Touch targets mínimo 44x44px
- [ ] Focus visible en elementos interactivos
- [ ] `prefers-reduced-motion` respetado en todas las animaciones

---

## Directivas Disponibles

```typescript
// Ya creadas y listas para usar:
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { StaggerEnterDirective } from '@shared/directives/stagger-enter.directive';
import { SpringCollapseDirective } from '@shared/directives/spring-collapse.directive';
```

### Uso en templates:
```html
<!-- Elevación en hover -->
<div appHoverLift [liftAmount]="6">...</div>

<!-- Escala al presionar -->
<button appPressScale [haptic]="true">...</button>

<!-- Entrada escalonada -->
<div appStaggerEnter [staggerIndex]="0">...</div>
<div appStaggerEnter [staggerIndex]="1">...</div>

<!-- Colapso animado -->
<div appSpringCollapse [collapsed]="isCollapsed()">...</div>
```

---

## Clases CSS Disponibles

### Glassmorphism (`styles/glass.css`)
```css
.glass           /* Superficie translúcida básica */
.glass-subtle    /* Blur sutil */
.glass-strong    /* Blur fuerte */
.glass-dark      /* Overlay oscuro */
.glass-card      /* Card con hover effect */
.glass-card-elevated  /* Card prominente */
.glass-panel     /* Panel modal/sheet */
.glass-navbar    /* Navegación translúcida */
.glass-button    /* Botón glass */
.glass-badge     /* Badge translúcido */
.glass-input     /* Input field */
```

### Bento Grid (`tailwind.config.js`)
```css
.grid-cols-bento-2      /* 2 columnas responsive */
.grid-cols-bento-3      /* 3 columnas responsive */
.grid-cols-bento-hero-2 /* Hero + sidebar */
.grid-cols-bento-hero-3 /* Hero grande + 2 cards */
.grid-cols-bento-sidebar /* Main + sidebar fijo */
```

### Tipografía Fluida (`styles/fluid-design.css`)
```css
.text-hero-xl    /* 40px - 80px */
.text-hero-lg    /* 32px - 64px */
.text-hero-md    /* 24px - 40px */
.text-balance-xl /* 32px - 56px (números) */
.text-balance-lg /* 24px - 40px */
.text-balance-md /* 20px - 28px */
```

---

## Prioridad Sugerida (Actualizada)

| Prioridad | Página | Estado |
|-----------|--------|--------|
| ~~2~~ | ~~My Bookings~~ | ✅ COMPLETADO |
| ~~3~~ | ~~Wallet~~ | ✅ COMPLETADO |
| 1 | Owner Dashboard | 🔴 PENDIENTE - Alto impacto en retención de owners |
| 2 | Check-in Flow | 🟡 PENDIENTE - UX crítica en momento de entrega |
| 3 | Check-out Flow | 🟡 PENDIENTE - UX crítica en devolución |
| 4 | Profile | 🟡 PENDIENTE - Impacto medio en engagement |
| 5 | Disputes | 🟡 PENDIENTE - Bajo tráfico pero alta importancia |

---

## Notas de Implementación

1. **Mantener consistencia**: Usar los mismos patrones aplicados en Fase 2
2. **Respetar reduced-motion**: Todas las animaciones deben ser opcionales
3. **Mobile-first**: Probar en 375px antes de desktop
4. **No over-engineer**: Aplicar mejoras donde agreguen valor real
5. **Tokens semánticos**: Nunca usar colores hardcodeados

---

**Próximo paso recomendado:** Continuar con Owner Dashboard (prioridad 1) o Check-in/Check-out flows
