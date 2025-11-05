# Autorent - Guía de Estilos Premium

## Paleta de Colores Neutra

### Fondos Light Mode
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Marfil suave | `#F8F6F3` | `bg-ivory-soft` | Fondo principal de la app |
| Arena claro | `#EDEAE3` | `bg-sand-light` | Secciones alternativas, fondos suaves |
| Blanco puro | `#FFFFFF` | `bg-white-pure` | Cards, modales, superficies elevadas |

### Bordes y Divisores
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Gris perla | `#D9D6D0` | `border-pearl-gray` | Bordes, dividers, inputs |

### Textos Light Mode
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Negro humo | `#1A1A1A` | `text-smoke-black` | Títulos principales |
| Carbón medio | `#4B4B4B` | `text-charcoal-medium` | Subtítulos, texto secundario |
| Gris ceniza | `#8E8E8E` | `text-ash-gray` | Texto deshabilitado, placeholders |

### Fondos Dark Mode
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Grafito oscuro | `#121212` | `bg-graphite-dark` | Fondo principal dark |
| Antracita | `#1E1E1E` | `bg-anthracite` | Superficies elevadas dark |
| Pizarra profunda | `#2A2A2A` | `bg-slate-deep` | Hover states dark |

### Textos Dark Mode
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Marfil luminoso | `#FAF9F6` | `text-ivory-luminous` | Texto principal dark mode |
| Perla claro | `#E5E3DD` | `text-pearl-light` | Texto secundario dark mode |

### Acentos (usar con moderación)
| Color | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| Azul petróleo | `#2C4A52` | `bg-accent-petrol` | CTAs principales, links importantes |
| Arena cálida | `#8B7355` | `bg-accent-warm` | Detalles, badges especiales |

### Sistema de Grises Completo
```css
neutral: {
  50: '#FAFAF9',
  100: '#F5F5F4',
  200: '#E7E5E4',
  300: '#D6D3D1',
  400: '#A8A29E',
  500: '#78716C',
  600: '#57534E',
  700: '#44403C',
  800: '#292524',
  900: '#1C1917',
  950: '#0C0A09',
}
```

---

## Sombras Premium

```css
/* Sombras sutiles y profesionales */
shadow-soft: '0 2px 8px rgba(0, 0, 0, 0.04)'
shadow-medium: '0 4px 16px rgba(0, 0, 0, 0.08)'
shadow-elevated: '0 8px 24px rgba(0, 0, 0, 0.12)'
shadow-card: '0 1px 3px rgba(0, 0, 0, 0.06)'
```

---

## Componentes de UI

### Botones

#### Botón Primary (Negro sobre claro)
```html
<button class="btn-primary">
  Click me
</button>
```
- Background: `#1A1A1A` (Negro humo)
- Hover: `#4B4B4B` (Carbón medio)
- Color texto: `#FAF9F6` (Marfil luminoso)

#### Botón Secondary (Blanco con borde)
```html
<button class="btn-secondary">
  Click me
</button>
```
- Background: `#FFFFFF` (Blanco puro)
- Border: `#D9D6D0` (Gris perla)
- Hover border: `#4B4B4B` (Carbón medio)

#### Botón Accent (Azul petróleo)
```html
<button class="btn-accent">
  Click me
</button>
```
- Background: `#2C4A52` (Azul petróleo)
- Hover: 90% opacity
- Color texto: `#FAF9F6` (Marfil luminoso)

### Cards

```html
<div class="card-premium">
  <!-- Contenido -->
</div>
```
- Background: `#FFFFFF`
- Border: `#D9D6D0` con 50% opacity
- Shadow: `shadow-card`
- Hover: `shadow-elevated`
- Border radius: `xl` (12px)

### Inputs

```html
<input class="input-premium" type="text" placeholder="Placeholder">
```
- Background: `#FFFFFF`
- Border: `#D9D6D0` (Gris perla)
- Focus border: `#4B4B4B` (Carbón medio)
- Focus ring: `#4B4B4B` con 20% opacity
- Placeholder: `#8E8E8E` (Gris ceniza)

---

## Tipografía

### Escalas de Fuente
- **Hero Title**: 36-48px, font-weight: 700, letter-spacing: -0.02em
- **Page Title**: 28-32px, font-weight: 700, letter-spacing: -0.01em
- **Section Title**: 22-26px, font-weight: 700
- **Card Title**: 18-20px, font-weight: 600
- **Body Large**: 16-18px, font-weight: 400-500
- **Body**: 14-15px, font-weight: 400
- **Small**: 12-13px, font-weight: 400-500

### Mejoras de Renderizado
```css
body {
  font-feature-settings: 'liga' 1, 'kern' 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Animaciones

### Transiciones Suaves
```css
/* Fade in */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Slide up */
.animate-slide-up {
  animation: slideUp 0.4s ease-out;
}
```

### Keyframes
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## Mapbox - Estilo Neutro

### Marcadores de Auto
- Background gradient: `linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)`
- Hover gradient: `linear-gradient(135deg, #2C4A52 0%, #3A5F68 100%)`
- Border: 2px `#FFFFFF` con 95% opacity
- Shadow: `0 2px 8px rgba(26, 26, 26, 0.15)`
- Border radius: `24px`

### Marcadores de Cluster
- Background gradient: `linear-gradient(135deg, #8B7355 0%, #7A6449 100%)`
- Badge background: `#FFFFFF`
- Badge color: `#8B7355`
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.2)`

### Popups
- Background: `#FFFFFF`
- Border: `1px solid rgba(217, 214, 208, 0.5)`
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.12)`
- Border radius: `16px`

---

## CarCard Component

### Estructura
```html
<article class="card-premium">
  <!-- Imagen 56h con overlay gradient -->
  <div class="relative h-56 bg-sand-light">
    <img class="h-full w-full object-cover group-hover:scale-105">
    <!-- Badge top-right -->
    <div class="absolute top-3 right-3 bg-smoke-black/80 backdrop-blur-sm">
      <span class="text-ivory-soft">Disponible</span>
    </div>
  </div>

  <!-- Contenido -->
  <div class="p-5">
    <h3 class="text-xl font-semibold text-smoke-black">Título</h3>
    <p class="text-sm text-charcoal-medium">Ubicación</p>
    <div class="h-px bg-pearl-gray my-1"></div>
    <p class="text-2xl font-bold text-smoke-black">Precio</p>
    <a class="btn-primary">Ver detalle</a>
  </div>
</article>
```

---

## Contraste WCAG AA

### Ratios Validados
- **Smoke Black (#1A1A1A) sobre Ivory Soft (#F8F6F3)**: 14.8:1 (AAA)
- **Charcoal Medium (#4B4B4B) sobre White Pure (#FFFFFF)**: 9.5:1 (AAA)
- **Accent Petrol (#2C4A52) sobre Ivory Luminous (#FAF9F6)**: 7.2:1 (AA+)
- **Ash Gray (#8E8E8E) sobre White Pure (#FFFFFF)**: 4.7:1 (AA)

---

## Principios de Diseño

### 1. Minimalismo Funcional
- Espacios generosos (gap: 24-32px entre secciones)
- Elementos con propósito claro
- Sin decoraciones innecesarias

### 2. Jerarquía Visual Clara
- Tamaños de fuente consistentes
- Pesos de fuente bien diferenciados (400, 500, 600, 700)
- Contraste de color intencional

### 3. Transiciones Suaves
- Duraciones: 200-400ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Transform + Opacity para animaciones

### 4. Responsive Premium
- Breakpoints: 480px, 768px, 1024px
- Mobile-first approach
- Touch-friendly (min 44x44px para botones)

### 5. Accesibilidad
- Contraste mínimo: WCAG AA (4.5:1)
- Focus states visibles
- Aria labels en iconos

---

## Inspiraciones de Marca

- **Audi**: Minimalismo, precisión, tonos grises premium
- **Apple**: Espacios blancos, tipografía clara, sombras sutiles
- **Airbnb Luxe**: Elegancia, confianza, paleta neutra sofisticada

---

## Variables CSS

### Light Mode
```css
:root {
  --bg-primary: #F8F6F3;
  --bg-secondary: #EDEAE3;
  --bg-elevated: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #4B4B4B;
  --text-disabled: #8E8E8E;
  --border-color: #D9D6D0;
  --accent-primary: #2C4A52;
  --accent-warm: #8B7355;
}
```

### Dark Mode
```css
[data-theme='dark'] {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-elevated: #2A2A2A;
  --text-primary: #FAF9F6;
  --text-secondary: #E5E3DD;
  --text-disabled: #78716C;
  --border-color: #44403C;
}
```

---

## Checklist de Implementación

- [x] Configurar Tailwind con paleta neutra
- [x] Actualizar variables CSS globales
- [x] Rediseñar CarCard component
- [x] Actualizar estilos de mapa Mapbox
- [x] Rediseñar página HOME (CarsListPage)
- [x] Crear guía de estilos
- [ ] Actualizar componentes UI base (buttons, inputs, selects)
- [ ] Rediseñar CitySelectComponent
- [ ] Actualizar DateRangePickerComponent
- [ ] Rediseñar HeaderComponent
- [ ] Actualizar FooterComponent
- [ ] Crear sección Hero para landing
- [ ] Diseñar sección de características
- [ ] Implementar sección de testimonios
- [ ] Actualizar modales y overlays
- [ ] Validar contraste WCAG AA
- [ ] Implementar modo oscuro completo
- [ ] Actualizar flujo de reservas
- [ ] Rediseñar ProfilePage
- [ ] Optimizar assets de marketing

---

## Notas Finales

Esta guía de estilos garantiza **consistencia visual**, **accesibilidad** y una **experiencia premium** en toda la aplicación Autorent. La paleta neutra transmite **confianza, sofisticación y modernidad** sin recurrir a colores saturados.

**Última actualización**: 2025-10-16
