# Container Queries Implementation Guide

## 🎯 Overview

Container queries permiten que los componentes respondan al tamaño de su contenedor padre en lugar del viewport. Esto es ideal para componentes reusables que aparecen en diferentes contextos (sidebar, modal, grid, lista, etc.).

## 📊 Browser Support (2025)

- ✅ Chrome/Edge 105+ (Sept 2022)
- ✅ Safari 16+ (Sept 2022)
- ✅ Firefox 110+ (Feb 2023)
- ✅ **Coverage: >95% de usuarios**
- ⚠️ Fallback automático a media queries para navegadores legacy

## 🚀 Usage

### 1. Basic Setup

Define un contenedor:

```html
<div class="card-container">
  <div class="card-content">
    <h3 class="card-title">Título</h3>
    <p class="card-description">Descripción...</p>
  </div>
</div>
```

### 2. Automatic Containers

Estos elementos **ya son containers automáticamente**:

```css
.card-container
.booking-card
.car-card
.sidebar
.panel
.modal-content
```

### 3. Manual Container Definition

Para elementos custom:

```html
<!-- Inline size (ancho) -->
<div class="container-inline">...</div>

<!-- Size (ancho + alto) -->
<div class="container-size">...</div>

<!-- Named container -->
<div class="container-card">...</div>
```

O en CSS:

```css
.my-component {
  container-type: inline-size;
  container-name: my-component;
}
```

## 📐 Breakpoints por Componente

### Car Cards

| Ancho     | Layout                          | Clases visibles                           |
| --------- | ------------------------------- | ----------------------------------------- |
| <280px    | Ultra-compacto                  | imagen + título + precio                  |
| 280-400px | Compacto                        | + specs básicos, sin features             |
| >400px    | Completo                        | + features grid, specs completos          |

### Booking Cards

| Ancho     | Layout                          | Grid columns |
| --------- | ------------------------------- | ------------ |
| <350px    | Vertical                        | 1 column     |
| 350-600px | Semi-horizontal                 | 2 columns    |
| >600px    | Horizontal completo + timeline  | 3 columns    |

### Modals

| Ancho     | Layout                          |
| --------- | ------------------------------- |
| <400px    | Mobile (vertical stacking)      |
| >600px    | Desktop (horizontal layout)     |

### Sidebars

| Ancho     | Estado                          |
| --------- | ------------------------------- |
| <250px    | Colapsado (solo iconos)         |
| >250px    | Expandido (iconos + labels)     |

## 💡 Examples

### Car Card con Container Query

```html
<article class="car-card">
  <!-- Imagen siempre visible -->
  <img src="..." class="car-image" />
  
  <!-- Título + precio siempre visibles -->
  <h3 class="car-title">Toyota Corolla</h3>
  <p class="car-price">$50/día</p>
  
  <!-- Specs: visibles >280px -->
  <div class="car-specs">
    <span>2024</span>
    <span>Automático</span>
  </div>
  
  <!-- Features: visibles solo >400px -->
  <div class="car-features">
    <span>5 pasajeros</span>
    <span>A/C</span>
  </div>
</article>
```

**CSS automático según ancho del card:**
- <280px: solo imagen + título + precio
- 280-400px: + specs básicos
- >400px: todo visible + features grid

### Modal Responsivo

```html
<div class="modal-content">
  <header class="modal-header">
    <h2>Título</h2>
    <button>×</button>
  </header>
  
  <div class="modal-body">
    Contenido...
  </div>
  
  <footer class="modal-actions">
    <button>Cancelar</button>
    <button>Confirmar</button>
  </footer>
</div>
```

**Cambios automáticos:**
- <400px: layout vertical, botones stacked
- >600px: layout horizontal, botones en fila

## 🔧 Debugging Container Queries

### Chrome DevTools

1. Inspecciona elemento con `container-type`
2. En **Styles** panel, busca `@container` rules
3. Ver tamaño actual del container en **Computed** tab

### CSS Logging

```css
@container card (max-width: 300px) {
  .card::before {
    content: 'Small card (<300px)';
    background: red;
  }
}

@container card (min-width: 500px) {
  .card::before {
    content: 'Large card (>500px)';
    background: green;
  }
}
```

## ⚠️ Common Pitfalls

### 1. Container sin `container-type`

```css
/* ❌ NO funciona */
.my-card {
  /* Falta container-type */
}

@container (max-width: 300px) {
  .my-card { ... }
}

/* ✅ Correcto */
.my-card {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .my-card { ... }
}
```

### 2. Container queries en el mismo elemento

```css
/* ❌ NO funciona */
.card {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .card { /* No puede query a sí mismo */ }
}

/* ✅ Correcto */
.card-container {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .card { /* Query al hijo */ }
}
```

### 3. Container type incorrecto

```css
/* inline-size: solo ancho (recomendado) */
container-type: inline-size;

/* size: ancho + alto (puede causar layout shifts) */
container-type: size;

/* normal: sin queries (default) */
container-type: normal;
```

## 🎨 Best Practices

1. **Usa `inline-size` (ancho) en lugar de `size`** para evitar layout shifts
2. **Aplica container-type al padre**, no al elemento que cambia
3. **Combina con media queries** para casos donde ambos son necesarios
4. **Usa named containers** cuando tengas queries específicas
5. **Testea en diferentes anchos** de contenedor, no solo viewport

## 🔄 Migration from Media Queries

**Antes (media queries):**
```css
@media (max-width: 768px) {
  .card { /* Depende del viewport */ }
}
```

**Después (container queries):**
```css
.card-container {
  container-type: inline-size;
}

@container (max-width: 400px) {
  .card { /* Depende del contenedor */ }
}
```

**Ventajas:**
- ✅ Componente funciona igual en sidebar, modal, grid
- ✅ No depende del tamaño del viewport
- ✅ Más reutilizable y predecible
- ✅ Mejor para design systems

## 📚 Resources

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Can I Use: Container Queries](https://caniuse.com/css-container-queries)
- [Web.dev: Container Queries Guide](https://web.dev/css-container-queries/)
