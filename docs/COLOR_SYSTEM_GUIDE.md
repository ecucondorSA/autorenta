# 🎨 Guía del Sistema de Colores - AutoRenta

**Última actualización**: 23 de octubre de 2025

---

## 📋 Paleta de Colores Principal

### Fondos (Backgrounds)

| Variable CSS | Tailwind Class | Valor Light | Valor Dark | Uso |
|--------------|----------------|-------------|------------|-----|
| `--bg-primary` | `bg-ivory-soft` | `#f8f6f3` | `#121212` | Fondo principal de la aplicación |
| `--bg-secondary` | `bg-sand-light` | `#edeae3` | `#1e1e1e` | Fondos secundarios, áreas destacadas |
| `--bg-elevated` | `bg-white-pure` | `#ffffff` | `#2a2a2a` | Tarjetas, modales, elementos elevados |

**Ejemplo de uso:**
```css
/* Opción 1: CSS Variables (recomendado para custom CSS) */
.container {
  background: var(--bg-primary);
}

/* Opción 2: Tailwind Classes (recomendado para templates HTML) */
<div class="bg-ivory-soft dark:bg-graphite-dark"></div>
```

---

### Textos (Typography)

| Variable CSS | Valor Light | Valor Dark | Uso |
|--------------|-------------|------------|-----|
| `--text-primary` | `#1a1a1a` | `#faf9f6` | Títulos, texto principal |
| `--text-secondary` | `#4b4b4b` | `#e5e3dd` | Subtítulos, texto secundario |
| `--text-disabled` | `#8e8e8e` | `#78716c` | Texto deshabilitado, placeholders |

**Ejemplo de uso:**
```css
h1 {
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
}

button:disabled {
  color: var(--text-disabled);
}
```

---

### Colores de Acento (Brand Colors)

| Variable CSS | Valor | Descripción |
|--------------|-------|-------------|
| `--accent-primary` | `#2c4a52` | **Verde azulado oscuro** - Botones primarios, CTAs importantes |
| `--accent-warm` | `#8b7355` | **Marrón cálido** - Acciones secundarias, elementos destacados |

**Jerarquía de uso:**
1. **Primary**: Acciones principales (Login, Reservar, Publicar)
2. **Warm**: Acciones secundarias (Editar, Ver detalles, Filtros)

**Ejemplo de uso:**
```css
/* Botón primario */
.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: #234047; /* 15% más oscuro */
}

/* Botón secundario cálido */
.btn-warm {
  background: var(--accent-warm);
  color: white;
}

.btn-warm:hover {
  background: #7a6349; /* 15% más oscuro */
}
```

---

### Bordes

| Variable CSS | Valor Light | Valor Dark |
|--------------|-------------|------------|
| `--border-color` | `#d9d6d0` | `#44403c` |

**Ejemplo de uso:**
```css
.card {
  border: 1px solid var(--border-color);
}

input {
  border: 1px solid var(--border-color);
}

input:focus {
  border-color: var(--accent-primary);
}
```

---

## 🎯 Colores Semánticos

### Estados del Sistema

Los colores semánticos están definidos en `tailwind.config.js` y se deben usar para estados del sistema (éxito, advertencia, error, información).

| Tipo | Tailwind Classes | Uso |
|------|------------------|-----|
| **Success** | `bg-success-{50,100,500,600,700,900}`, `text-success-{...}`, `border-success-{...}` | Operaciones exitosas, estados saludables, fondos disponibles |
| **Warning** | `bg-warning-{50,100,500,600,700,900}`, `text-warning-{...}`, `border-warning-{...}` | Advertencias, estados de atención, fondos bloqueados |
| **Error** | `bg-error-{50,100,500,600,700,900}`, `text-error-{...}`, `border-error-{...}` | Errores, estados críticos, operaciones fallidas |
| **Info** | `bg-info-{50,100,500,600,700,900}`, `text-info-{...}`, `border-info-{...}` | Información general, tooltips, ayuda |

**Valores de colores semánticos:**

```javascript
// Success (Verde)
success: {
  50: '#d1fae5',   // Fondo claro
  100: '#a7f3d0',
  500: '#10b981',  // Color principal
  600: '#059669',
  700: '#047857',  // Texto oscuro
  900: '#065f46',  // Texto muy oscuro
}

// Warning (Ámbar)
warning: {
  50: '#fef3c7',   // Fondo claro
  100: '#fde68a',
  500: '#f59e0b',  // Color principal
  600: '#d97706',
  700: '#b45309',  // Texto oscuro
  900: '#92400e',  // Texto muy oscuro
}

// Error (Rojo)
error: {
  50: '#fee2e2',   // Fondo claro
  100: '#fecaca',
  500: '#ef4444',  // Color principal
  600: '#dc2626',
  700: '#b91c1c',  // Texto oscuro
  900: '#991b1b',  // Texto muy oscuro
}

// Info (Azul)
info: {
  50: '#dbeafe',   // Fondo claro
  100: '#bfdbfe',
  500: '#3b82f6',  // Color principal
  600: '#2563eb',
  700: '#1d4ed8',  // Texto oscuro
  900: '#1e3a8a',  // Texto muy oscuro
}
```

**Ejemplo de uso en HTML:**
```html
<!-- Badge de éxito -->
<div class="bg-success-50 dark:bg-success-500/15 border border-success-500 dark:border-success-500/40 rounded-lg p-4">
  <p class="text-success-900 dark:text-success-100">Operación exitosa</p>
</div>

<!-- Badge de warning -->
<div class="bg-warning-50 dark:bg-warning-500/15 border border-warning-500 dark:border-warning-500/40 rounded-lg p-4">
  <p class="text-warning-900 dark:text-warning-100">Atención requerida</p>
</div>

<!-- Badge de error -->
<div class="bg-error-50 dark:bg-error-500/15 border border-error-500 dark:border-error-500/40 rounded-lg p-4">
  <p class="text-error-900 dark:text-error-100">Error crítico</p>
</div>

<!-- Badge de info -->
<div class="bg-info-50 dark:bg-info-500/15 border border-info-500 dark:border-info-500/40 rounded-lg p-4">
  <p class="text-info-900 dark:text-info-100">Información adicional</p>
</div>
```

**Patrón para dark mode:**
- Fondos: `bg-{semantic}-50 dark:bg-{semantic}-500/15` (15% de opacidad en dark)
- Bordes: `border-{semantic}-500 dark:border-{semantic}-500/40` (40% de opacidad en dark)
- Textos: `text-{semantic}-900 dark:text-{semantic}-100` (invertir tono)

---

### Estados FGO (Fondo de Garantía Operativa)

| Estado | Background | Border | Text |
|--------|------------|--------|------|
| **Healthy** | `#d1fae5` | `#10b981` | `#065f46` |
| **Warning** | `#fef3c7` | `#f59e0b` | `#92400e` |
| **Critical** | `#fee2e2` | `#ef4444` | `#991b1b` |

---

## 🌈 Colores de Subfondos FGO

| Subfondo | Color | Uso |
|----------|-------|-----|
| **Liquidez** | `#3b82f6` | Azul - Fondos disponibles |
| **Capitalización** | `#10b981` | Verde - Fondos de crecimiento |
| **Rentabilidad** | `#f59e0b` | Ámbar - Fondos de inversión |

**Ejemplo de uso:**
```typescript
getSubfundColor(type: string): string {
  const colors: Record<string, string> = {
    liquidity: '#3b82f6',
    capitalization: '#10b981',
    profitability: '#f59e0b',
  };
  return colors[type] || '#6b7280';
}
```

---

## ⚠️ IMPORTANTE: Evitar Colores por Defecto de Tailwind

**NUNCA uses los colores por defecto de Tailwind** como `bg-blue-500`, `bg-emerald-50`, `text-green-600`, etc.

❌ **INCORRECTO - Colores genéricos de Tailwind:**
```html
<div class="bg-emerald-50 border-emerald-100">
  <p class="text-emerald-900">Disponible</p>
</div>

<div class="bg-amber-50 border-amber-100">
  <p class="text-amber-900">Bloqueado</p>
</div>

<button class="bg-blue-500 hover:bg-blue-600">
  Depositar
</button>
```

✅ **CORRECTO - Colores del sistema AutoRenta:**
```html
<!-- Usa las clases Tailwind custom definidas en tailwind.config.js -->
<div class="bg-white-pure dark:bg-slate-deep border-pearl-gray dark:border-neutral-700">
  <p class="text-smoke-black dark:text-ivory-luminous">Disponible</p>
</div>

<button class="bg-accent-petrol hover:bg-accent-petrol/90 text-white-pure">
  Depositar
</button>

<!-- O usa variables CSS en archivos .css -->
<div class="custom-card">
  <p class="custom-text">Balance</p>
</div>
```

**Colores Tailwind personalizados disponibles:**

| Categoría | Clases Disponibles | Hex |
|-----------|-------------------|-----|
| **Fondos Light** | `bg-ivory-soft`, `bg-sand-light`, `bg-white-pure` | `#F8F6F3`, `#EDEAE3`, `#FFFFFF` |
| **Fondos Dark** | `bg-graphite-dark`, `bg-anthracite`, `bg-slate-deep` | `#121212`, `#1E1E1E`, `#2A2A2A` |
| **Textos Light** | `text-smoke-black`, `text-charcoal-medium`, `text-ash-gray` | `#1A1A1A`, `#4B4B4B`, `#8E8E8E` |
| **Textos Dark** | `text-ivory-luminous`, `text-pearl-light` | `#FAF9F6`, `#E5E3DD` |
| **Acentos** | `bg-accent-petrol`, `bg-accent-warm` | `#2C4A52`, `#8B7355` |
| **Bordes** | `border-pearl-gray` | `#D9D6D0` |
| **Neutrales** | `bg-neutral-50` a `bg-neutral-950` | Escala de grises |

**Para estados semánticos** (success, warning, error), usa los colores semánticos definidos más abajo, NO los colores Tailwind por defecto.

---

## 📐 Reglas de Consistencia

### 1. Siempre usar variables CSS o clases Tailwind personalizadas

❌ **INCORRECTO:**
```css
.button {
  background: #2c4a52;
  color: #1a1a1a;
}
```

✅ **CORRECTO:**
```css
.button {
  background: var(--accent-primary);
  color: var(--text-primary);
}
```

### 2. Fallbacks para navegadores antiguos

```css
background: var(--accent-primary, #2c4a52);
```

### 3. Hover states

Para hover states, oscurece el color base en **~15%**:

```css
/* Color base */
background: #2c4a52;

/* Hover (15% más oscuro) */
background: #234047;
```

**Fórmula**: Reducir cada componente RGB en ~15% manteniendo proporciones.

### 4. Sombras consistentes

| Nivel | Box Shadow |
|-------|------------|
| **Subtle** | `0 1px 3px 0 rgba(0, 0, 0, 0.05)` |
| **Normal** | `0 1px 3px 0 rgba(0, 0, 0, 0.1)` |
| **Elevated** | `0 4px 6px -1px rgba(0, 0, 0, 0.08)` |
| **Modal** | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` |

### 5. Contraste mínimo

- **Texto sobre fondo claro**: Ratio mínimo 4.5:1 (WCAG AA)
- **Texto sobre fondo oscuro**: Siempre usar blanco (#ffffff)
- **Botones**: Siempre texto blanco sobre accent colors

---

## 🛠️ Herramientas de Verificación

### Verificar contraste

```bash
# Usar herramienta online
https://webaim.org/resources/contrastchecker/

# Ejemplo
Foreground: #1a1a1a (--text-primary)
Background: #f8f6f3 (--bg-primary)
Ratio: 11.8:1 ✅ (AAA compliant)
```

### Generar variantes de color

```javascript
// Oscurecer 15%
function darken(hex, percent = 15) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
    (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
    .toString(16).slice(1);
}

// Ejemplo
darken('#2c4a52', 15) // → #234047
```

---

## 📱 Responsive & Dark Mode

### Activar Dark Mode

```typescript
// En Angular
document.documentElement.classList.toggle('dark');
```

### Detectar preferencia del sistema

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.documentElement.classList.add('dark');
}
```

---

## ✅ Checklist de Consistencia

Antes de hacer commit, verifica:

- [ ] ¿Usaste variables CSS en lugar de valores hardcodeados?
- [ ] ¿El contraste de texto cumple WCAG AA (4.5:1)?
- [ ] ¿Los hover states son ~15% más oscuros que el base?
- [ ] ¿Las sombras siguen los niveles definidos?
- [ ] ¿Los colores semánticos se usan correctamente (success/warning/error)?
- [ ] ¿Los botones primary usan `--accent-primary`?
- [ ] ¿Los botones secondary usan `--bg-secondary`?
- [ ] ¿Los fondos usan `--bg-*` apropiadamente?

---

## 📚 Referencias

- **Archivo de variables**: `/apps/web/src/styles.css` (líneas 23-84)
- **Documentación Tailwind**: https://tailwindcss.com/docs/customizing-colors
- **WCAG Contrast**: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

---

## 🎨 Ejemplos Completos

### Tarjeta de Producto

```css
.product-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
}

.product-title {
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.product-price {
  color: var(--accent-primary);
  font-size: 1.5rem;
  font-weight: 700;
}

.product-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
```

### Botón CTA

```css
.btn-cta {
  background: var(--accent-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-cta:hover {
  background: #234047;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(44, 74, 82, 0.3);
}

.btn-cta:disabled {
  background: var(--text-disabled);
  cursor: not-allowed;
  transform: none;
}
```

---

**Mantenido por**: Equipo AutoRenta
**Última revisión**: Octubre 2025
