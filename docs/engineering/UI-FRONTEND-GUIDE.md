# Guia de UI/Frontend - Autorenta

> **Documento de referencia para desarrolladores**
> Ultima actualizacion: Enero 2026
> Versión: 1.0

Este documento detalla los estándares, patrones y especificaciones técnicas implementadas en las páginas de Login y Home (Marketplace) de Autorenta. Es fundamental seguir estas guías para mantener la consistencia visual y la experiencia de usuario premium en todas las páginas.

---

## Tabla de Contenidos

1. [Arquitectura de Estilos](#1-arquitectura-de-estilos)
2. [Viewports y Breakpoints](#2-viewports-y-breakpoints)
3. [Navegacion Inferior (Bottom Nav)](#3-navegacion-inferior-bottom-nav)
4. [Headers Inmersivos](#4-headers-inmersivos)
5. [Modales y Bottom Sheets](#5-modales-y-bottom-sheets)
6. [Safe Areas (iPhone)](#6-safe-areas-iphone)
7. [Touch Targets y Accesibilidad](#7-touch-targets-y-accesibilidad)
8. [Tipografia](#8-tipografia)
9. [Scrollbars y Overflow](#9-scrollbars-y-overflow)
10. [Design Tokens (CSS Variables)](#10-design-tokens-css-variables)
11. [Patrones de Paginas Especificas](#11-patrones-de-paginas-especificas)
12. [Técnicas CSS Avanzadas](#12-tecnicas-css-avanzadas)
13. [Checklist de Implementacion](#13-checklist-de-implementacion)

---

## 1. Arquitectura de Estilos

### Estructura de Archivos

```
apps/web/src/
├── styles/
│   ├── styles.css              # Estilos globales + Tailwind
│   └── mobile-optimizations.css # Optimizaciones móviles (CRITICO)
├── app/
│   └── shared/
│       └── components/
│           └── mobile-bottom-nav/
│               └── mobile-bottom-nav.component.css  # Estilos bottom nav
```

### Archivo Principal: `mobile-optimizations.css`

Este archivo contiene TODAS las optimizaciones móviles globales. Es el archivo más importante para la experiencia móvil.

**Responsabilidades:**
- Ocultar scrollbars globalmente
- Deshabilitar hyphens (cortes de palabras)
- Headers condicionales (transparentes, ocultos)
- Touch targets mínimos
- Tipografía responsive
- Safe areas
- Landscape mode
- Dark mode

### Importancia del Orden de Carga

```css
/* En styles.css, el orden es: */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
@import './mobile-optimizations.css'; /* SIEMPRE al final */
```

---

## 2. Viewports y Breakpoints

### Breakpoints Estándar

| Nombre | Ancho | Uso Principal |
|--------|-------|---------------|
| `xs` | < 360px | Móviles muy pequeños (SE, Mini) |
| `sm` | ≥ 640px | Móviles grandes / Landscape |
| `md` | ≥ 768px | Tablets |
| `lg` | ≥ 1024px | Laptops |
| `xl` | ≥ 1280px | Desktop |
| `2xl` | ≥ 1536px | Pantallas grandes |

### Viewport de Referencia para Desarrollo Móvil

```
iPhone 14 Pro: 393 x 852px
iPhone SE: 375 x 667px (viewport crítico de pruebas)
Samsung Galaxy: 360 x 800px
```

**IMPORTANTE:** Siempre probar en **375px de ancho** como mínimo. Es el viewport más restrictivo común.

### Media Queries Usadas

```css
/* Móvil (default) - Mobile First */
/* No necesita media query, es el base */

/* Tablet y superior */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Móviles muy pequeños */
@media (max-width: 360px) { }

/* Landscape móvil */
@media (max-width: 768px) and (orientation: landscape) { }

/* Preferencias de usuario */
@media (prefers-reduced-motion: reduce) { }
@media (prefers-color-scheme: dark) { }
```

### Unidades de Viewport

```css
/* PREFERIR estas unidades modernas: */
height: 100svh;  /* Small Viewport Height - respeta UI del navegador */
height: 100dvh;  /* Dynamic Viewport Height - se ajusta al scroll */
height: 100lvh;  /* Large Viewport Height - máximo posible */

/* EVITAR: */
height: 100vh;   /* Problemático en iOS Safari */
```

---

## 3. Navegacion Inferior (Bottom Nav)

### Especificaciones de la Barra

```css
/* Archivo: mobile-bottom-nav.component.css */

:host {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 50 !important;
  overflow: hidden !important;
  isolation: isolate !important;
}
```

### Dimensiones Críticas

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| Altura total | ~80px + safe-area | Incluye FAB y padding |
| Altura nav-container | ~72px | Sin safe area |
| Min-height nav-item | 60px | Touch target iOS |
| Tamaño icono | 28x28px | Visible pero no invasivo |
| Tamaño label | 12px | Legible en móvil |
| Grid columns | `1fr 1fr 72px 1fr 1fr` | 4 items + espacio FAB |
| Gap entre items | 4px | Compacto pero separado |

### Padding del Container

```css
.nav-container {
  /* CRITICO: Este padding evita que labels queden cortados */
  padding: 8px 8px max(8px, env(safe-area-inset-bottom, 8px));

  /* Desglose:
   * top: 8px
   * left/right: 8px
   * bottom: máximo entre 8px y safe-area
   */
}
```

### FAB Central (RentarFast)

```css
.rentarfast-fab {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  z-index: 10;
}
```

### Comportamiento Auto-hide

```css
/* La barra se oculta al hacer scroll hacia abajo */
.mobile-bottom-nav--hidden {
  transform: translateY(100%);
  pointer-events: none;
}
```

### Z-Index Stack

```
z-index: 100+ → Modales, overlays
z-index: 50   → Bottom nav
z-index: 45   → Floating action buttons
z-index: 40   → Headers fijos
z-index: 10   → Contenido elevado
z-index: 1    → Contenido base
```

---

## 4. Headers Inmersivos

### Header Transparente (Login Page)

Cuando el usuario está en la página de login, el header se vuelve transparente para mostrar el fondo HDRI completo.

```css
/* Selector condicional usando :has() */
body:has(app-login-page) header,
body:has(app-login-page) #main-header {
  background: transparent !important;
  border-bottom: none !important;
  backdrop-filter: none !important;
}

/* Logo en blanco para contraste */
body:has(app-login-page) header img {
  filter: brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)) !important;
}

/* Iconos en blanco */
body:has(app-login-page) header svg,
body:has(app-login-page) header button {
  color: white !important;
}

/* Gradiente sutil para legibilidad */
body:has(app-login-page) header::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 100%);
  pointer-events: none;
  z-index: -1;
}
```

### Header Oculto (Marketplace)

La página de marketplace tiene su propio header flotante en el hero, por lo que ocultamos el header principal.

```css
body:has(app-marketplace-v2-page) > app-root > div > header,
body:has(.hero-minimal) > app-root > div > header {
  display: none !important;
}
```

### Header Móvil Estándar

```css
@media (max-width: 768px) {
  #main-header {
    min-height: calc(56px + var(--safe-area-top));
    padding-top: var(--safe-area-top);
  }

  #main-header img {
    height: 36px !important;
  }

  /* Móviles muy pequeños */
  @media (max-width: 360px) {
    #main-header img {
      height: 28px !important;
    }
  }
}
```

---

## 5. Modales y Bottom Sheets

### Patrón Bottom Sheet (Login Modal)

En móvil, los modales deben comportarse como "bottom sheets" que suben desde abajo.

```html
<div
  class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center
         bg-black/50 backdrop-blur-md pb-[88px] sm:pb-0"
>
  <div
    class="w-full max-w-md max-h-[calc(100dvh-100px)] sm:max-h-[90dvh]
           overflow-y-auto bg-surface-base/95 backdrop-blur-2xl
           rounded-t-3xl sm:rounded-3xl"
  >
    <!-- Contenido del modal -->
  </div>
</div>
```

### Especificaciones del Modal

| Propiedad | Móvil | Desktop |
|-----------|-------|---------|
| Posición | `items-end` (abajo) | `items-center` |
| Padding bottom | `pb-[88px]` | `pb-0` |
| Border radius | `rounded-t-3xl` (solo arriba) | `rounded-3xl` |
| Max height | `calc(100dvh - 100px)` | `90dvh` |
| Animación | `animate-slideUp` | `animate-scaleIn` |

### Dimensiones Críticas

```css
/* IMPORTANTE: El pb-[88px] deja espacio para la bottom nav */
/* 88px = ~80px de nav + 8px de margen */

/* Max height calculado para no cubrir el header */
max-h-[calc(100dvh-100px)]
/* 100px = header (~56px) + espacio visual (~44px) */
```

### Z-Index del Modal

```css
z-index: 100  /* Por encima de todo, incluida la bottom nav (z-50) */
```

---

## 6. Safe Areas (iPhone)

### Qué son las Safe Areas

Los iPhone con notch/Dynamic Island tienen áreas de la pantalla que no deben contener contenido interactivo.

```
┌─────────────────────────┐
│   ▓▓▓ (notch/island)    │ ← safe-area-inset-top
│                         │
│    CONTENIDO SEGURO     │
│                         │
│                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← safe-area-inset-bottom (home indicator)
└─────────────────────────┘
```

### CSS Variables de Safe Area

```css
:root {
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-top: env(safe-area-inset-top, 0px);
}
```

### Uso Correcto

```css
/* CORRECTO: usar max() para garantizar mínimo */
padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));

/* INCORRECTO: solo safe-area puede ser 0 en algunos dispositivos */
padding-bottom: env(safe-area-inset-bottom);
```

### Aplicación en Componentes

```css
/* Bottom Nav */
.nav-container {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Header */
#main-header {
  padding-top: var(--safe-area-top);
  min-height: calc(56px + var(--safe-area-top));
}

/* Contenido Principal */
.app-main {
  padding-bottom: calc(80px + var(--safe-area-bottom)) !important;
}
```

### Feature Query para Safe Area

```css
@supports (padding: max(0px)) {
  @media (max-width: 768px) {
    .app-main {
      padding-left: max(16px, env(safe-area-inset-left));
      padding-right: max(16px, env(safe-area-inset-right));
    }
  }
}
```

---

## 7. Touch Targets y Accesibilidad

### Tamaños Mínimos (WCAG 2.5.5)

| Elemento | Tamaño Mínimo | Recomendado |
|----------|---------------|-------------|
| Botones | 44x44px | 48x48px |
| Links | 44x44px (área táctil) | - |
| Inputs | 44px altura | 48px altura |
| Checkboxes | 24x24px | - |
| Nav items | 60px altura | - |

### Implementación

```css
@media (max-width: 768px) {
  button,
  a.btn,
  .nav-link {
    min-height: 44px;
    min-width: 44px;
  }

  input, textarea, select {
    min-height: 44px;
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
    touch-action: manipulation;
  }

  input[type='checkbox'],
  input[type='radio'] {
    width: 24px;
    height: 24px;
  }
}
```

### Prevenir Zoom en Inputs (iOS)

```css
/* CRÍTICO: font-size mínimo de 16px evita zoom automático */
input[type='text'],
input[type='email'],
input[type='tel'],
textarea,
select {
  font-size: 16px !important;
}
```

### Optimizaciones Táctiles

```css
body {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

html {
  -webkit-overflow-scrolling: touch;
}
```

---

## 8. Tipografia

### Escala Móvil

```css
@media (max-width: 768px) {
  h1, .h1 { font-size: 1.75rem !important; line-height: 1.2 !important; }
  h2, .h2 { font-size: 1.5rem !important;  line-height: 1.3 !important; }
  h3, .h3 { font-size: 1.25rem !important; line-height: 1.4 !important; }
  h4, .h4 { font-size: 1.125rem !important; }
  h5, .h5 { font-size: 1rem !important; }

  body { font-size: 15px; line-height: 1.6; }
  .text-sm { font-size: 13px !important; }
  .text-xs { font-size: 12px !important; }
}
```

### Comparación Desktop vs Móvil

| Elemento | Desktop | Móvil |
|----------|---------|-------|
| H1 | 2.25rem (36px) | 1.75rem (28px) |
| H2 | 1.875rem (30px) | 1.5rem (24px) |
| H3 | 1.5rem (24px) | 1.25rem (20px) |
| Body | 16px | 15px |
| Small | 14px | 13px |
| XSmall | 12px | 12px |

### Deshabilitar Hyphens Globalmente

**CRÍTICO:** Evitar que el navegador corte palabras como "estacio-nados".

```css
p, h1, h2, h3, h4, h5, h6, span, a, li, blockquote {
  hyphens: none !important;
  -webkit-hyphens: none !important;
  -ms-hyphens: none !important;
  word-break: normal !important;
  overflow-wrap: break-word;
}
```

---

## 9. Scrollbars y Overflow

### Ocultar Scrollbars Globalmente

```css
/* Firefox */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* Chrome, Safari, Opera */
*::-webkit-scrollbar {
  display: none;
}

/* Asegurar en contenedores principales */
html, body, #app-scroller, .app-main, main {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
```

### Prevenir Overflow Horizontal

```css
@media (max-width: 768px) {
  html, body {
    max-width: 100vw;
    overflow-x: hidden;
    position: relative;
  }

  body > *, main, section {
    max-width: 100vw;
    overflow-x: hidden;
  }

  img, video, iframe, svg {
    max-width: 100%;
    height: auto;
  }
}
```

### Scroll Behavior

```css
@media (max-width: 768px) {
  html {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  body {
    overscroll-behavior-y: contain; /* Evita "bounce" en iOS */
  }
}
```

---

## 10. Design Tokens (CSS Variables)

### Variables Globales Definidas

```css
:root {
  /* Layout */
  --hero-min-height-mobile: 85svh;
  --hero-min-height-desktop: 100svh;
  --content-max-width: 80rem; /* 1280px */

  /* Touch */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;

  /* Safe Areas */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-top: env(safe-area-inset-top, 0px);
}
```

### Colores del Sistema (Ejemplos)

```css
/* Estos vienen de Tailwind config, usar los tokens definidos */
--cta-default: #a7d8f4;        /* Azul pastel principal */
--surface-base: #ffffff;        /* Fondo base light */
--surface-dark: #1e1e1e;        /* Fondo base dark */
--text-primary: ...;            /* Texto principal */
--error-default: #ef4444;       /* Rojo para errores */
```

---

## 11. Patrones de Paginas Especificas

### Login Page

#### Estructura HTML

```html
<div class="fixed inset-0 top-0 bottom-0 overflow-hidden bg-black z-10">
  <!-- Fallback estático -->
  <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('...');"></div>

  <!-- HDRI WebGL -->
  <div class="absolute inset-0 z-[1]">
    <app-hdri-background ...></app-hdri-background>
  </div>

  <!-- Gradient overlay -->
  <div class="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

  <!-- Card de CTAs - NOTA: bottom-[88px] para no tapar con bottom nav -->
  <div class="absolute bottom-[88px] left-0 right-0 z-10 px-4 sm:bottom-12 sm:px-6">
    <!-- Glass Card -->
  </div>

  <!-- Modal (cuando showForm=true) -->
</div>
```

#### Posicionamiento de la Card

```css
/* Móvil: 88px desde abajo para la bottom nav */
bottom-[88px]

/* Desktop: 48px (3rem) desde abajo */
sm:bottom-12
```

#### Glassmorphism Card

```css
backdrop-blur-xl
bg-white/10
rounded-3xl
border border-white/20
shadow-2xl shadow-black/20
```

### Marketplace (Home) Page

#### Hero Section

```html
<section class="hero-minimal relative min-h-[85svh] lg:min-h-screen">
  <!-- Header flotante propio -->
  <header class="absolute top-0 left-0 right-0 z-50">
    <!-- Logo + botón Ingresar -->
  </header>

  <!-- Contenido del hero -->
</section>
```

#### Secciones con Padding Reducido

```html
<!-- Antes: py-16 lg:py-24 -->
<!-- Ahora: py-8 sm:py-12 lg:py-24 -->
<section class="py-8 sm:py-12 lg:py-24 px-container">
```

---

## 12. Tecnicas CSS Avanzadas

### Selector `:has()` (Parent Selector)

Permite estilar elementos padre basándose en sus hijos.

```css
/* Si el body contiene app-login-page, hacer header transparente */
body:has(app-login-page) header {
  background: transparent !important;
}

/* Si el body contiene marketplace, ocultar header */
body:has(app-marketplace-v2-page) header {
  display: none !important;
}

/* Si .app-main contiene app-login-page, quitar min-height */
.app-main:has(app-login-page) {
  min-height: 0 !important;
}
```

**Compatibilidad:** Chrome 105+, Safari 15.4+, Firefox 121+

### Filter para Invertir Colores

```css
/* Convertir imagen oscura a blanca */
filter: brightness(0) invert(1);

/* Con sombra para legibilidad */
filter: brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
```

### CSS Container Isolation

```css
:host {
  contain: layout style paint !important;
  isolation: isolate !important;
}
```

Esto:
- `contain`: Optimiza rendering, evita que estilos afecten al resto
- `isolation`: Crea nuevo stacking context, evita conflictos de z-index

### Animaciones con GPU Acceleration

```css
.nav-item {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### CSS Logical Properties

```css
/* Preferir propiedades lógicas para i18n */
padding-inline: 16px;  /* en vez de padding-left + padding-right */
margin-block: 8px;     /* en vez de margin-top + margin-bottom */
```

---

## 13. Checklist de Implementacion

### Pre-Desarrollo

- [ ] Identificar si la página necesita header especial (transparente, oculto)
- [ ] Determinar si hay elementos flotantes que interfieran con bottom nav
- [ ] Verificar si hay modales/overlays y cómo se posicionan

### Durante Desarrollo

- [ ] Usar unidades `svh`/`dvh` en vez de `vh` para heights
- [ ] Agregar `pb-[88px]` a elementos fixed que no deben quedar bajo bottom nav
- [ ] Usar `max(X, env(safe-area-inset-Y))` para safe areas
- [ ] Touch targets mínimos de 44x44px
- [ ] Font-size mínimo 16px en inputs

### Post-Desarrollo (Testing)

- [ ] Probar en viewport 375px de ancho
- [ ] Verificar que no hay scroll horizontal
- [ ] Verificar que no hay palabras cortadas (hyphens)
- [ ] Verificar que la bottom nav no tapa contenido
- [ ] Verificar modales en móvil (bottom sheet behavior)
- [ ] Probar en landscape mode
- [ ] Verificar contraste WCAG AA mínimo
- [ ] Probar con `prefers-reduced-motion`

### Viewports de Test Obligatorios

| Dispositivo | Dimensiones |
|-------------|-------------|
| iPhone SE | 375 x 667 |
| iPhone 14 Pro | 393 x 852 |
| Samsung Galaxy | 360 x 800 |
| iPad Mini | 768 x 1024 |
| Laptop | 1366 x 768 |
| Desktop | 1920 x 1080 |

---

## Anexo A: Referencia Rápida de Valores

### Espaciados Estándar (Tailwind)

```
px-4  = 16px (padding horizontal móvil)
px-6  = 24px (padding horizontal desktop)
py-8  = 32px (padding vertical secciones móvil)
py-12 = 48px (padding vertical secciones tablet)
py-16 = 64px (padding vertical secciones desktop)
py-24 = 96px (padding vertical secciones desktop grande)
```

### Border Radius

```
rounded-xl   = 12px
rounded-2xl  = 16px
rounded-3xl  = 24px
rounded-full = 9999px
```

### Sombras Glassmorphism

```css
/* Card glass */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
backdrop-filter: blur(20px) saturate(180%);
background: rgba(255, 255, 255, 0.1);
border: 1px solid rgba(255, 255, 255, 0.2);
```

### Z-Index Reference

```
z-[100] = Modales, overlays críticos
z-50    = Bottom navigation
z-45    = FABs, floating buttons
z-40    = Headers fijos
z-10    = Contenido elevado, cards
z-[2]   = Overlays de gradiente
z-[1]   = Contenido secundario
z-0     = Base
```

---

## Anexo B: Problemas Comunes y Soluciones

### Problema: Labels de bottom nav cortados

**Causa:** Padding bottom insuficiente
**Solución:**
```css
padding: 8px 8px max(8px, env(safe-area-inset-bottom, 8px));
```

### Problema: Palabras cortadas con guiones (estacio-nados)

**Causa:** CSS `hyphens: auto` por defecto
**Solución:**
```css
hyphens: none !important;
word-break: normal !important;
```

### Problema: Modal tapado por bottom nav

**Causa:** Modal no considera altura de bottom nav
**Solución:**
```html
<div class="pb-[88px] sm:pb-0">
```

### Problema: Scroll horizontal en móvil

**Causa:** Elementos con width fijo o overflow
**Solución:**
```css
max-width: 100vw;
overflow-x: hidden;
```

### Problema: Zoom al enfocar inputs en iOS

**Causa:** Font-size menor a 16px
**Solución:**
```css
input { font-size: 16px !important; }
```

### Problema: Header no transparente en login

**Causa:** Selector :has() no soportado o selector incorrecto
**Solución:** Verificar que `app-login-page` esté en el DOM y usar el selector correcto.

---

**Documento mantenido por el equipo de Frontend de Autorenta**
**Para dudas o actualizaciones, contactar al tech lead**
