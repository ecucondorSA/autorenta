# 🎨 Gu\u00eda del Sistema de Diseño - AutoRentA

## 📋 Índice Rápido

- [Paleta de Colores](#paleta-de-colores)
- [Tipografía](#tipografía)
- [Componentes](#componentes)
- [Espaciados](#espaciados)
- [Animaciones](#animaciones)
- [Patrones Comunes](#patrones-comunes)

---

## 🎨 Paleta de Colores

### Fondos Light Mode
```css
bg-ivory-soft      /* #F8F6F3 - Fondo principal */
bg-sand-light      /* #EDEAE3 - Fondo secundario */
bg-white-pure      /* #FFFFFF - Fondo elevado (cards) */
```

### Fondos Dark Mode
```css
bg-graphite-dark   /* #121212 - Fondo principal */
bg-anthracite      /* #1E1E1E - Fondo secundario */
bg-slate-deep      /* #2A2A2A - Fondo elevado */
```

### Textos Light Mode
```css
text-smoke-black       /* #1A1A1A - Texto principal */
text-charcoal-medium   /* #4B4B4B - Texto secundario */
text-ash-gray          /* #8E8E8E - Texto deshabilitado */
```

### Textos Dark Mode
```css
text-ivory-luminous    /* #FAF9F6 - Texto principal */
text-pearl-light       /* #E5E3DD - Texto secundario */
```

### Acentos
```css
accent-petrol      /* #2C4A52 - Acento principal (botones, links) */
accent-warm        /* #8B7355 - Acento cálido (warnings, secundario) */
```

### Bordes
```css
border-pearl-gray     /* #D9D6D0 - Bordes light */
border-slate-deep     /* Dark mode borders */
```

---

## 📝 Tipografía

### Sistema de Tamaños (Escala Modular 1.250)
```css
text-xs      /* 12px - Labels pequeños */
text-sm      /* 14px - Texto secundario */
text-base    /* 16px - Texto body principal */
text-lg      /* 18px - Texto destacado */
text-xl      /* 20px - Subtítulos */
text-2xl     /* 24px - H3 */
text-3xl     /* 30px - H2 */
text-4xl     /* 36px - H1 */
text-5xl     /* 48px - Display */
```

### Pesos de Fuente
```css
font-normal      /* 400 - Texto normal */
font-medium      /* 500 - Texto medio */
font-semibold    /* 600 - Subtítulos */
font-bold        /* 700 - Títulos */
font-extrabold   /* 800 - Display */
```

### Clases Útiles
```html
<h1 class="text-4xl font-bold tracking-tight text-smoke-black">Título Principal</h1>
<p class="text-lead">Texto destacado (xl, normal, charcoal-medium)</p>
<p class="text-body">Texto normal (base, charcoal-medium)</p>
<p class="text-caption">Texto pequeño (sm, ash-gray)</p>
<span class="text-overline">ETIQUETA (xs, uppercase, semibold)</span>
```

---

## 🧩 Componentes

### Botones

#### Primario (Negro)
```html
<button class="btn-primary">
  Botón Principal
</button>
```

#### Secundario (Outline)
```html
<button class="btn-secondary">
  Botón Secundario
</button>
```

#### Acento (Petrol)
```html
<button class="btn-accent">
  Acción Importante
</button>
```

#### Ghost (Transparente)
```html
<button class="btn-ghost">
  Acción Terciaria
</button>
```

#### Botón con Ícono
```html
<button class="icon-button" aria-label="Cerrar">
  <svg class="w-5 h-5">...</svg>
</button>
```

**Estados Especiales**:
```html
<button class="btn-primary" disabled>Deshabilitado</button>
<button class="btn-primary btn-loading">Cargando...</button>
```

---

### Cards

#### Card Premium (Estándar)
```html
<div class="card-premium p-6">
  <h3 class="h3 mb-4">Título del Card</h3>
  <p class="text-body">Contenido del card...</p>
</div>
```

#### Card con Hover
```html
<div class="card-premium hover:shadow-elevated hover:-translate-y-1 transition-all p-6">
  Card con efecto hover
</div>
```

#### Card Seleccionado
```html
<div class="card-premium selected p-6">
  Card actualmente seleccionado
</div>
```

---

### Inputs

#### Input Premium
```html
<div>
  <label class="block text-sm font-semibold text-smoke-black dark:text-ivory-luminous mb-2">
    Nombre completo
  </label>
  <input
    type="text"
    class="input-premium"
    placeholder="Ej: Juan Pérez"
  />
</div>
```

#### Input con Error
```html
<input type="email" class="input-premium border-red-500 focus:border-red-500 focus:ring-red-500/20" />
<p class="mt-1 text-sm text-red-600">El email no es válido</p>
```

---

### Badges y Status

```html
<!-- Info (Petrol claro) -->
<span class="badge-info">
  <svg>...</svg>
  Información
</span>

<!-- Éxito (Petrol medio) -->
<span class="badge-success">Completado</span>

<!-- Advertencia (Warm) -->
<span class="badge-warning">Pendiente</span>

<!-- Peligro (Warm oscuro) -->
<span class="badge-danger">Rechazado</span>

<!-- Neutral (Gris) -->
<span class="badge-neutral">Draft</span>
```

---

### Info Cards

```html
<!-- Card básico -->
<div class="info-card">
  <h4 class="font-semibold mb-2">Título</h4>
  <p class="text-sm">Contenido del info card...</p>
</div>

<!-- Variante Petrol -->
<div class="info-card-petrol">
  <p class="text-sm text-accent-petrol">
    Información importante con acento petrol
  </p>
</div>

<!-- Variante Warm -->
<div class="info-card-warm">
  <p class="text-sm text-accent-warm">
    Advertencia con acento cálido
  </p>
</div>
```

---

### Alertas y Notificaciones

#### Alert Estándar
```html
<div class="rounded-xl bg-accent-petrol/10 border-l-4 border-accent-petrol p-4">
  <div class="flex items-start">
    <svg class="w-5 h-5 text-accent-petrol mt-0.5 flex-shrink-0">...</svg>
    <div class="ml-3">
      <h3 class="text-sm font-medium text-accent-petrol">Título del Alert</h3>
      <p class="text-sm text-charcoal-medium mt-1">Mensaje del alert...</p>
    </div>
  </div>
</div>
```

#### Toast Notification (Auto-dismiss)
```html
<div class="rounded-xl bg-amber-50 dark:bg-amber-500/15 border-l-4 border-amber-400 p-4 shadow-lg animate-slide-in-right">
  <div class="flex items-start">
    <svg class="w-6 h-6 text-amber-600 animate-pulse">...</svg>
    <div class="ml-3 flex-1">
      <h3 class="text-sm font-medium text-amber-800">Notificación</h3>
      <p class="text-sm text-amber-700 mt-1">Mensaje...</p>
    </div>
    <button (click)="dismiss()" class="ml-2 text-amber-600 hover:text-amber-800">
      <svg class="w-5 h-5">...</svg>
    </button>
  </div>
</div>
```

---

## 📏 Espaciados

### Sistema de Contenedores
```html
<!-- Contenedor página (max-w-7xl) -->
<div class="container-page px-container">
  Contenido...
</div>

<!-- Contenedor estrecho (max-w-5xl) -->
<div class="container-narrow px-container">
  Formularios, artículos...
</div>

<!-- Contenedor ancho (max-w-1440px) -->
<div class="container-wide px-container">
  Galerías, grids...
</div>
```

### Padding Responsivo
```html
<!-- Padding horizontal del contenedor (16px mobile → 24px tablet → 32px desktop) -->
<div class="px-container">...</div>

<!-- Padding vertical de sección (24px mobile → 32px tablet → 48px desktop) -->
<div class="py-section">...</div>

<!-- Padding vertical pequeño -->
<div class="py-section-sm">...</div>
```

### Escala de Espaciados
```css
gap-2        /* 8px */
gap-3        /* 12px */
gap-4        /* 16px */
gap-6        /* 24px */
gap-8        /* 32px */

p-2          /* 8px */
p-4          /* 16px */
p-6          /* 24px */
p-8          /* 32px */
```

---

## 🎬 Animaciones

### Duración
```css
transition-duration-instant   /* 100ms - Micro-interacciones */
transition-duration-fast      /* 200ms - Hover, focus */
transition-duration-normal    /* 300ms - Default */
transition-duration-slow      /* 400ms - Transiciones suaves */
transition-duration-slower    /* 600ms - Animaciones complejas */
```

### Easing
```css
ease-standard      /* cubic-bezier(0.4, 0, 0.2, 1) - Default */
ease-decelerate    /* cubic-bezier(0, 0, 0.2, 1) - Entrada */
ease-accelerate    /* cubic-bezier(0.4, 0, 1, 1) - Salida */
ease-sharp         /* cubic-bezier(0.4, 0, 0.6, 1) - Énfasis */
```

### Animaciones Predefinidas
```html
<!-- Fade -->
<div class="animate-fade-in">Fade in</div>
<div class="animate-fade-in-up">Fade in desde abajo</div>
<div class="animate-fade-in-down">Fade in desde arriba</div>

<!-- Slide -->
<div class="animate-slide-in-right">Slide desde derecha</div>
<div class="animate-slide-in-left">Slide desde izquierda</div>
<div class="animate-slide-up">Slide hacia arriba</div>

<!-- Scale -->
<div class="animate-scale-in">Scale in rápido</div>
<div class="animate-scale-in-slow">Scale in lento</div>

<!-- Loading -->
<div class="animate-pulse">Pulse</div>
<div class="animate-pulse-slow">Pulse lento</div>
<div class="animate-spin">Spin</div>
<div class="animate-skeleton-loading">Skeleton loader</div>
```

### Hover Effects
```html
<!-- Lift al hacer hover -->
<div class="hover-lift">Sube 4px al hover</div>
<div class="hover-lift-sm">Sube 2px al hover</div>

<!-- Card con hover -->
<div class="card-premium hover:shadow-elevated hover:-translate-y-1 transition-all">
  Card con efecto hover
</div>
```

---

## 🎯 Patrones Comunes

### Loading States

#### Spinner
```html
<div class="flex items-center justify-center py-8">
  <div class="spinner"></div>
  <!-- o -->
  <div class="spinner-sm"></div>
</div>
```

#### Skeleton Loader
```html
<div class="skeleton h-4 w-full rounded"></div>
<div class="skeleton h-4 w-3/4 rounded mt-2"></div>
```

#### Loading Button
```html
<button class="btn-primary btn-loading" disabled>
  <svg class="animate-spin h-5 w-5 mr-2">...</svg>
  Cargando...
</button>
```

---

### Form Patterns

#### Campo de Formulario Completo
```html
<div class="space-y-4">
  <div>
    <label class="block text-sm font-semibold text-smoke-black dark:text-ivory-luminous mb-2">
      Email
    </label>
    <input
      type="email"
      class="input-premium"
      placeholder="tu@email.com"
    />
    <p class="mt-1 text-xs text-charcoal-medium dark:text-pearl-light/60">
      Te enviaremos un código de verificación
    </p>
  </div>
</div>
```

#### Campo con Error
```html
<div>
  <label class="block text-sm font-semibold text-smoke-black mb-2">
    Contraseña
  </label>
  <input
    type="password"
    class="input-premium border-red-500 focus:border-red-500 focus:ring-red-500/20"
  />
  <p class="mt-1 text-sm text-red-600">
    La contraseña debe tener al menos 8 caracteres
  </p>
</div>
```

---

### Lista de Elementos

```html
<div class="space-y-2">
  <div *ngFor="let item of items" class="flex items-center justify-between p-4 rounded-lg border border-pearl-gray dark:border-slate-deep hover:border-accent-petrol dark:hover:border-accent-petrol/60 transition-colors">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-accent-petrol/10 flex items-center justify-center">
        <svg class="w-5 h-5 text-accent-petrol">...</svg>
      </div>
      <div>
        <p class="font-medium text-smoke-black dark:text-ivory-luminous">{{ item.title }}</p>
        <p class="text-sm text-charcoal-medium dark:text-pearl-light/70">{{ item.subtitle }}</p>
      </div>
    </div>
    <button class="icon-button">
      <svg class="w-5 h-5">...</svg>
    </button>
  </div>
</div>
```

---

### Grid Responsivo

```html
<!-- 1 columna → 2 columnas (md) → 3 columnas (lg) -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="card-premium p-4">Card 1</div>
  <div class="card-premium p-4">Card 2</div>
  <div class="card-premium p-4">Card 3</div>
</div>

<!-- 1 columna → 2 columnas (sm) → 4 columnas (lg) -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

---

### Modal / Dialog Pattern

```html
<!-- Backdrop -->
<div class="fixed inset-0 bg-smoke-black/60 z-modal-backdrop" (click)="close()"></div>

<!-- Modal -->
<div class="fixed inset-0 z-modal flex items-center justify-center p-4">
  <div class="card-premium max-w-md w-full p-6 animate-scale-in">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="h3">Título del Modal</h3>
      <button class="icon-button" (click)="close()">
        <svg class="w-5 h-5">...</svg>
      </button>
    </div>

    <!-- Content -->
    <div class="mb-6">
      <p class="text-body">Contenido del modal...</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3 justify-end">
      <button class="btn-ghost" (click)="close()">Cancelar</button>
      <button class="btn-primary" (click)="confirm()">Confirmar</button>
    </div>
  </div>
</div>
```

---

## 🌓 Dark Mode

### Activación
```html
<!-- Toggle en el root element -->
<html class="dark">
```

### Clases Dark Mode Aware
Todos los componentes del sistema ya incluyen variantes dark mode automáticas.

### Texto
```html
<!-- Se adapta automáticamente -->
<p class="text-smoke-black dark:text-ivory-luminous">
  Texto que cambia en dark mode
</p>

<p class="text-charcoal-medium dark:text-pearl-light/80">
  Texto secundario adaptable
</p>
```

### Fondos
```html
<div class="bg-white-pure dark:bg-anthracite">
  Fondo adaptable
</div>
```

---

## ✅ Checklist de Consistencia

Antes de implementar un nuevo componente, verifica:

- [ ] ¿Usas colores de la paleta oficial? (`accent-petrol`, `smoke-black`, etc.)
- [ ] ¿Usas clases de espaciado consistentes? (`gap-4`, `p-6`, etc.)
- [ ] ¿Los botones usan clases predefinidas? (`btn-primary`, `btn-accent`)
- [ ] ¿Los inputs usan `input-premium`?
- [ ] ¿Las cards usan `card-premium`?
- [ ] ¿Las animaciones usan duraciones estándar? (`transition-fast`, `animate-fade-in`)
- [ ] ¿El componente tiene soporte dark mode? (`dark:...`)
- [ ] ¿Los textos usan la escala tipográfica? (`text-base`, `text-lg`)
- [ ] ¿Los estados de hover/focus son accesibles?
- [ ] ¿Los tamaños de toque cumplen WCAG? (mínimo 44x44px)

---

## 🚀 Recursos Adicionales

### Archivos de Referencia
- **Tailwind Config**: `tailwind.config.js`
- **CSS Global**: `src/styles.css`
- **Variables CSS**: `:root` en `styles.css`

### Inspección Rápida
```bash
# Ver todas las clases disponibles
grep "@apply" src/styles.css

# Ver paleta de colores
grep "colors:" tailwind.config.js -A 50
```

---

## 📞 Preguntas Frecuentes

### ¿Cuándo usar `accent-petrol` vs `accent-warm`?
- **`accent-petrol`**: Acciones principales, botones, links, estados activos
- **`accent-warm`**: Warnings, estados pendientes, acentos secundarios

### ¿Cuándo usar `btn-primary` vs `btn-accent`?
- **`btn-primary`**: Acción más importante de la página (negro)
- **`btn-accent`**: Acción secundaria importante (petrol)
- **`btn-secondary`**: Acción alternativa (outline)
- **`btn-ghost`**: Acción terciaria (transparente)

### ¿Cómo personalizar un componente manteniendo consistencia?
Siempre parte de las clases base y extiende:
```html
<!-- ✅ CORRECTO -->
<button class="btn-primary hover:scale-105">
  Personalizado
</button>

<!-- ❌ INCORRECTO - Redefine todo -->
<button class="px-6 py-3 bg-blue-500 text-white rounded-lg">
  Inconsistente
</button>
```

---

**Última actualización**: 2025-10-22
**Versión**: 1.0.0
**Mantenedor**: Claude Code AI Assistant
