# 📱 Sistema Responsive Profesional - Guía de Uso

## 🎯 Introducción

Este sistema responsive profesional y moderno está diseñado para proporcionar una experiencia óptima en todos los dispositivos y tamaños de pantalla.

## 📦 Archivos del Sistema

### 1. **`responsive-tokens.css`**
Tokens básicos y breakpoints semánticos.

### 2. **`fluid-design.css`**
Sistema de diseño fluido con tipografía y espaciado adaptativos usando `clamp()`.

### 3. **`responsive-utilities.css`**
Utilidades responsive listas para usar en toda la aplicación.

### 4. **`container-queries.css`**
Container queries para componentes auto-adaptativos.

### 5. **`mobile-optimizations.css`**
Optimizaciones específicas para dispositivos móviles.

---

## 🎨 Tipografía Fluida

### Uso de Tokens

```css
/* En tu componente */
h1 {
  font-size: var(--font-display-large); /* 48px - 80px */
}

h2 {
  font-size: var(--font-display-medium); /* 36px - 64px */
}

p {
  font-size: var(--font-body-large); /* 16px - 20px */
}
```

### Clases Utility

```html
<h1 class="text-display-large">Título Principal</h1>
<h2 class="text-headline-medium">Subtítulo</h2>
<p class="text-body-large">Párrafo de contenido</p>
```

---

## 📏 Espaciado Fluido

### Tokens CSS

```css
.mi-componente {
  padding: var(--spacing-md); /* 16px - 24px */
  margin: var(--spacing-lg); /* 24px - 40px */
  gap: var(--gap-md); /* 16px - 24px */
}
```

### Clases Utility

```html
<div class="p-fluid-md">Padding adaptativo</div>
<div class="m-fluid-lg">Margin adaptativo</div>
<div class="gap-fluid-sm">Gap adaptativo</div>
```

---

## 🎭 Grids Responsive

### Auto-fit y Auto-fill

```html
<!-- Grid que se adapta automáticamente -->
<div class="grid-auto-fit">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>

<!-- Grid con mínimo 280px por columna -->
<div class="grid-auto-fill">
  <!-- contenido -->
</div>
```

### Grids Predefinidos

```html
<!-- 1 columna mobile, 2 desktop -->
<div class="grid-responsive-2">
  <!-- contenido -->
</div>

<!-- 1 col mobile, 2 tablet, 3 desktop -->
<div class="grid-responsive-3">
  <!-- contenido -->
</div>

<!-- 1 col mobile, 2 tablet, 3 desktop, 4 XL -->
<div class="grid-responsive-4">
  <!-- contenido -->
</div>
```

---

## 👁️ Visibilidad por Breakpoint

```html
<!-- Solo visible en mobile -->
<div class="show-mobile hide-tablet hide-desktop">
  Contenido mobile
</div>

<!-- Solo visible en tablet -->
<div class="hide-mobile show-tablet hide-desktop">
  Contenido tablet
</div>

<!-- Solo visible en desktop -->
<div class="hide-mobile hide-tablet show-desktop">
  Contenido desktop
</div>
```

---

## 📱 Orientación

```html
<!-- Solo en landscape -->
<div class="show-landscape hide-portrait">
  Contenido horizontal
</div>

<!-- Solo en portrait -->
<div class="hide-landscape show-portrait">
  Contenido vertical
</div>
```

---

## 🖼️ Imágenes Responsive

```html
<!-- Imagen responsive con aspect ratio -->
<div class="img-responsive-container aspect-video">
  <img src="..." alt="..." class="img-responsive">
</div>

<!-- Aspect ratios disponibles -->
<div class="aspect-square">1:1</div>
<div class="aspect-video">16:9</div>
<div class="aspect-photo">4:3</div>
<div class="aspect-portrait">3:4</div>
```

---

## 🎴 Cards Responsive

```html
<!-- Card con padding y border radius adaptativos -->
<div class="card-responsive">
  <h3>Título</h3>
  <p>Contenido</p>
</div>

<!-- Card más compacto -->
<div class="card-responsive-compact">
  <h3>Título</h3>
  <p>Contenido</p>
</div>
```

---

## 🔘 Botones Responsive

```html
<!-- Full width en mobile, auto en desktop -->
<button class="btn-responsive">
  Click aquí
</button>

<!-- Tamaño adaptativo -->
<button class="btn-size-responsive">
  Click aquí
</button>
```

---

## 📦 Container Queries

Los container queries permiten que los componentes se adapten según su contenedor, no el viewport.

### Activar en un contenedor

```html
<div class="container-inline">
  <div class="card-content">
    <!-- El contenido se adapta según el ancho del contenedor -->
  </div>
</div>
```

### Componentes Auto-adaptativos

```html
<!-- Car card que se adapta automáticamente -->
<div class="car-card">
  <div class="car-image"></div>
  <div class="car-specs">
    <!-- Visible solo si el card tiene >280px -->
  </div>
  <div class="car-features">
    <!-- Visible solo si el card tiene >400px -->
  </div>
</div>
```

---

## 📐 Aspect Ratios

```html
<div class="aspect-video">
  <!-- Contenido mantendrá 16:9 -->
</div>

<div class="aspect-square">
  <!-- Contenido mantendrá 1:1 -->
</div>
```

---

## 🎯 Touch Optimizations

### Detección Automática

En dispositivos táctiles, automáticamente se aplican:
- Touch targets mínimos de 44x44px
- Eliminación de estados hover
- Tap highlight personalizado

### Forzar en un elemento

```html
<button class="touch-target">
  <!-- Tendrá mínimo 44x44px en touch devices -->
</button>

<div class="tap-highlight">
  <!-- Tap highlight con color de marca -->
</div>
```

---

## 🎨 Border Radius Fluido

```html
<div class="rounded-fluid-sm">Border radius pequeño adaptativo</div>
<div class="rounded-fluid-md">Border radius mediano adaptativo</div>
<div class="rounded-fluid-lg">Border radius grande adaptativo</div>
<div class="rounded-fluid-xl">Border radius XL adaptativo</div>
```

---

## 🔍 High DPI Support

```css
/* Automático en pantallas retina */
.mi-elemento {
  border-width: 1px; /* Se convierte en 0.5px en retina */
}

/* Forzar en un elemento */
.mi-borde {
  @extend .border-retina;
}

.mi-texto {
  @extend .text-sharp;
}
```

---

## 📊 Modales Responsive

```html
<!-- Modal que se adapta al tamaño de pantalla -->
<div class="modal-responsive">
  <div class="modal-header">
    <!-- Se adapta en mobile vs desktop -->
  </div>
  <div class="modal-body">
    <!-- Contenido -->
  </div>
  <div class="modal-footer">
    <!-- Botones -->
  </div>
</div>
```

---

## 🎯 Stack Layout

```html
<!-- Vertical en mobile, horizontal en desktop -->
<div class="stack-responsive">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Siempre vertical -->
<div class="stack-vertical">
  <!-- contenido -->
</div>

<!-- Siempre horizontal con wrap -->
<div class="stack-horizontal">
  <!-- contenido -->
</div>
```

---

## 🎪 Posicionamiento Responsive

```html
<!-- Header pegajoso con safe area -->
<header class="sticky-header">
  <!-- Contenido -->
</header>

<!-- Footer fijo con safe area -->
<footer class="fixed-bottom">
  <!-- Contenido -->
</footer>
```

---

## 📱 Safe Areas (iPhone X+)

```css
/* Automático en sticky-header y fixed-bottom */

/* Manual */
.mi-elemento {
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}
```

---

## 🎨 Breakpoints Disponibles

```
Mobile pequeño: max-width: 375px
Mobile: 376px - 640px
Tablet Portrait: 641px - 768px
Tablet Landscape: 769px - 1024px
Desktop Small: 1025px - 1280px
Desktop Large: 1281px+
Ultra Wide: 1920px+
```

---

## 🚀 Best Practices

### 1. **Mobile-First**
Siempre diseña primero para móvil y luego agrega mejoras para pantallas más grandes.

```css
/* ✅ Correcto */
.elemento {
  font-size: 1rem; /* mobile */
}

@media (min-width: 768px) {
  .elemento {
    font-size: 1.25rem; /* desktop */
  }
}

/* ❌ Incorrecto */
.elemento {
  font-size: 1.25rem; /* desktop */
}

@media (max-width: 767px) {
  .elemento {
    font-size: 1rem; /* mobile */
  }
}
```

### 2. **Usar clamp() para Escalado Fluido**

```css
/* ✅ Mejor */
font-size: clamp(1rem, 2vw, 1.5rem);

/* ❌ Menos flexible */
font-size: 1rem;
@media (min-width: 768px) {
  font-size: 1.25rem;
}
@media (min-width: 1024px) {
  font-size: 1.5rem;
}
```

### 3. **Container Queries para Componentes**

```css
/* ✅ El componente se adapta a su contenedor */
@container (min-width: 400px) {
  .card-content {
    grid-template-columns: 1fr 1fr;
  }
}

/* ❌ Se adapta al viewport completo */
@media (min-width: 400px) {
  .card-content {
    grid-template-columns: 1fr 1fr;
  }
}
```

### 4. **Touch Targets Mínimos**

```html
<!-- ✅ Correcto - mínimo 44x44px -->
<button class="touch-target">Click</button>

<!-- ❌ Incorrecto - demasiado pequeño -->
<button style="padding: 2px 4px;">Click</button>
```

### 5. **Prevenir Zoom en iOS**

```html
<!-- ✅ Font size mínimo 16px en inputs -->
<input type="text" style="font-size: 16px;">

<!-- ❌ iOS hará zoom -->
<input type="text" style="font-size: 12px;">
```

---

## 🎯 Ejemplos Completos

### Card Responsive Completo

```html
<div class="card-responsive rounded-fluid-lg">
  <div class="aspect-video img-responsive-container">
    <img src="..." class="img-responsive" alt="...">
  </div>
  <div class="p-fluid-md">
    <h3 class="text-headline-medium mb-fluid-sm">Título</h3>
    <p class="text-body-large">Descripción</p>
    <button class="btn-responsive mt-fluid-md">
      Ver más
    </button>
  </div>
</div>
```

### Grid de Cards Responsive

```html
<div class="grid-auto-fit gap-fluid-md">
  <div class="card-responsive">Card 1</div>
  <div class="card-responsive">Card 2</div>
  <div class="card-responsive">Card 3</div>
  <div class="card-responsive">Card 4</div>
</div>
```

### Hero Section Responsive

```html
<section class="py-section-fluid px-container-fluid">
  <div class="stack-responsive">
    <div class="flex-1">
      <h1 class="text-display-large mb-fluid-md">
        Título Hero
      </h1>
      <p class="text-body-large mb-fluid-lg">
        Descripción del hero
      </p>
      <button class="btn-size-responsive">
        Call to Action
      </button>
    </div>
    <div class="hide-mobile">
      <div class="aspect-square">
        <!-- Imagen o ilustración -->
      </div>
    </div>
  </div>
</section>
```

---

## 📚 Referencias

- [CSS clamp() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
- [Container Queries - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Touch Target Sizes](https://web.dev/accessible-tap-targets/)

---

## 🤝 Contribuir

Para agregar nuevas utilidades o mejorar el sistema, edita los archivos en `/src/styles/`:
- `fluid-design.css`
- `responsive-utilities.css`
- `container-queries.css`
