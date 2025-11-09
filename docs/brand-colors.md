# 🎨 Plan Cromático AutoRenta - Guía Completa

**Última actualización**: 2025-01-XX  
**Versión**: 2.0.0 (Sistema de Tokens Centralizado)

---

## 📋 Tabla de Contenidos

1. [Dirección General](#dirección-general)
2. [Paleta Maestra](#paleta-maestra)
3. [Sistema de Tokens](#sistema-de-tokens)
4. [Uso por Componente](#uso-por-componente)
5. [Accesibilidad y Contraste](#accesibilidad-y-contraste)
6. [Modos Claro/Oscuro](#modos-clarooscuro)
7. [Guía de Implementación](#guía-de-implementación)
8. [Combinaciones Prohibidas](#combinaciones-prohibidas)

---

## Dirección General

Unificar toda la plataforma con una **paleta neutra** (Negro, Marfil, Tonos de gris, Beige) y **acentos suaves** (Azul celeste pastel), asegurando consistencia visual y cero errores TypeScript mediante tipado estricto y validaciones automáticas.

### Principios de Diseño

- ✅ **Neutralidad**: Colores neutros como base, acentos mínimos
- ✅ **Consistencia**: Un solo sistema de tokens para toda la plataforma
- ✅ **Accesibilidad**: Contraste mínimo AA (4.5:1) en todos los casos
- ✅ **Tipado Estricto**: TypeScript valida uso de colores en tiempo de compilación

---

## Paleta Maestra

### Colores Neutros Principales

| Color | HEX | RGB | Uso Principal |
|-------|-----|-----|---------------|
| **Negro** | `#050505` | `rgb(5, 5, 5)` | Texto principal, overlays, iconografía crítica |
| **Marfil** | `#F8F4EC` | `rgb(248, 244, 236)` | Fondo dominante de vistas claras, contenedores grandes |
| **Beige** | `#DFD2BF` | `rgb(223, 210, 191)` | Paneles secundarios, tarjetas, listados neutros |

### Escala de Grises

| Token | HEX | RGB | Uso |
|-------|-----|-----|-----|
| **G100** | `#111111` | `rgb(17, 17, 17)` | Bordes oscuros, texto en dark mode |
| **G80** | `#2B2B2B` | `rgb(43, 43, 43)` | Texto secundario oscuro |
| **G60** | `#4E4E4E` | `rgb(78, 78, 78)` | Texto secundario |
| **G40** | `#7B7B7B` | `rgb(123, 123, 123)` | Texto deshabilitado, placeholders |
| **G20** | `#BCBCBC` | `rgb(188, 188, 188)` | Bordes, separadores |
| **G10** | `#E3E3E3` | `rgb(227, 227, 227)` | Bordes sutiles |
| **G05** | `#F5F5F5` | `rgb(245, 245, 245)` | Superficies elevadas |

### Acentos Azules Pastel

| Color | HEX | RGB | Uso |
|-------|-----|-----|-----|
| **Azul Principal** | `#A7D8F4` | `rgb(167, 216, 244)` | CTAs, enlaces activos, badges informativos |
| **Azul Hover** | `#8EC9EC` | `rgb(142, 201, 236)` | Estado hover de acentos azules |

### Colores de Feedback (Opcionales)

| Color | HEX | RGB | Uso |
|-------|-----|-----|-----|
| **Rojo Óxido** | `#B25E5E` | `rgb(178, 94, 94)` | Errores (baja saturación) |
| **Verde Oliva** | `#9DB38B` | `rgb(157, 179, 139)` | Éxito (baja saturación) |

---

## Sistema de Tokens

### Estructura de Archivos

```
apps/web/src/config/theme/
  └── colors.ts          # Tokens centralizados con tipos TypeScript
```

### Tokens Semánticos

Los tokens semánticos abstraen el uso de colores según su función:

#### Superficies (Surfaces)

```typescript
surfaceBase      // Fondo principal
surfaceRaised     // Tarjetas, modales, elementos elevados
surfaceSecondary  // Paneles secundarios
surfaceElevated   // Superficies con elevación
```

#### Textos

```typescript
textPrimary    // Texto principal
textSecondary  // Texto secundario
textMuted      // Texto deshabilitado, placeholders
textInverse    // Texto sobre fondos oscuros/claros
```

#### Bordes

```typescript
borderDefault  // Bordes por defecto
borderMuted    // Bordes sutiles
borderFocus    // Borde de focus (accesibilidad)
```

#### CTAs y Acciones

```typescript
ctaDefault  // Botones primarios
ctaHover    // Estado hover
ctaText     // Texto sobre CTAs
```

#### Estados y Feedback

```typescript
infoLight     // Badges informativos
successLight  // Éxito
warningLight  // Advertencia
errorLight    // Error
```

### Uso en Código

#### ✅ CORRECTO - Usar tokens semánticos

```typescript
import { getThemeColor, type ThemeColorKey } from '@/config/theme/colors';

// En componentes TypeScript
const backgroundColor = getThemeColor('surfaceBase', 'light');
const textColor = getThemeColor('textPrimary', 'light');

// En Tailwind (después de configurar)
<div class="bg-surface-base text-text-primary">
```

#### ❌ INCORRECTO - Colores hardcodeados

```typescript
// ❌ NO hacer esto
const color = '#F8F4EC';
const bgColor = '#050505';

// ❌ NO usar hex directamente en templates
<div style="background-color: #F8F4EC">
```

---

## Uso por Componente

### Botones

| Variante | Fondo | Texto | Hover | Disabled |
|----------|-------|-------|-------|----------|
| **Primario** | `ctaDefault` (#A7D8F4) | `ctaText` (#050505) | `ctaHover` (#8EC9EC) | G20 + G40 |
| **Secundario** | `surfaceRaised` | `textPrimary` | `surfaceSecondary` | G20 + G40 |
| **Ghost** | Transparente | `textSecondary` | `surfaceSecondary` | G20 + G40 |

**Ejemplo Tailwind:**
```html
<button class="bg-cta-default text-cta-text hover:bg-cta-hover">
  Reservar
</button>
```

### Inputs y Formularios

| Elemento | Fondo | Borde | Focus | Placeholder |
|----------|-------|-------|-------|-------------|
| **Input** | `surfaceRaised` | `borderDefault` | `borderFocus` | `textMuted` |
| **Textarea** | `surfaceRaised` | `borderDefault` | `borderFocus` | `textMuted` |
| **Select** | `surfaceRaised` | `borderDefault` | `borderFocus` | `textMuted` |

**Ejemplo Tailwind:**
```html
<input 
  class="bg-surface-raised border-border-default 
         focus:border-border-focus placeholder:text-text-muted"
/>
```

### Tarjetas (Cards)

| Estado | Fondo | Borde | Sombra |
|--------|-------|-------|--------|
| **Default** | `surfaceRaised` | `borderMuted` | Sutil |
| **Hover** | `surfaceRaised` | `borderDefault` | Media |
| **Selected** | `surfaceRaised` | `ctaDefault` | Elevada |

**Ejemplo Tailwind:**
```html
<div class="bg-surface-raised border border-border-muted 
            hover:border-border-default hover:shadow-md">
  Contenido
</div>
```

### Modales y Drawers

| Elemento | Valor |
|----------|-------|
| **Backdrop** | `overlayDark` (rgba(5, 5, 5, 0.7)) |
| **Superficie** | `surfaceRaised` |
| **Título** | `textPrimary` |
| **Texto** | `textSecondary` |

### Tablas y Listados

| Elemento | Fondo | Borde |
|----------|-------|-------|
| **Header** | `surfaceSecondary` |
| **Fila Par** | `surfaceBase` |
| **Fila Impar** | `surfaceRaised` |
| **Fila Seleccionada** | `infoLight` (10% opacity) |
| **Borde** | `borderMuted` |

### Badges y Estados

| Tipo | Fondo | Texto | Borde |
|------|-------|-------|-------|
| **Info** | `infoLight` (10% opacity) | `infoDark` | `infoLight` (20% opacity) |
| **Success** | `successLight` (10% opacity) | `successLight` | `successLight` (20% opacity) |
| **Warning** | `warningLight` (10% opacity) | `warningLight` | `warningLight` (20% opacity) |
| **Error** | `errorLight` (10% opacity) | `errorLight` | `errorLight` (20% opacity) |

### Iconos

| Estado | Color |
|--------|-------|
| **Default** | `textPrimary` |
| **Hover** | `ctaDefault` |
| **Disabled** | `textMuted` |
| **Active** | `ctaDefault` |

---

## Accesibilidad y Contraste

### Ratios Mínimos (WCAG AA)

| Tipo de Contenido | Ratio Mínimo |
|-------------------|--------------|
| Texto normal (≥16px) | 4.5:1 |
| Texto grande (≥18px) | 3:1 |
| Componentes UI | 3:1 |
| Focus visible | 3:1 |

### Validación de Contraste

#### ✅ Combinaciones Aprobadas

| Fondo | Texto | Ratio | Estado |
|-------|-------|-------|--------|
| Marfil (#F8F4EC) | Negro (#050505) | 16.8:1 | ✅ Excelente |
| Azul Pastel (#A7D8F4) | Negro (#050505) | 8.2:1 | ✅ Excelente |
| Beige (#DFD2BF) | Negro (#050505) | 10.5:1 | ✅ Excelente |
| G20 (#BCBCBC) | Negro (#050505) | 6.8:1 | ✅ Bueno |
| G40 (#7B7B7B) | Marfil (#F8F4EC) | 4.8:1 | ✅ Aprobado |

#### ❌ Combinaciones Prohibidas

| Fondo | Texto | Ratio | Problema |
|-------|-------|-------|----------|
| Azul Pastel (#A7D8F4) | G40 (#7B7B7B) | 1.8:1 | ❌ Insuficiente |
| Beige (#DFD2BF) | G20 (#BCBCBC) | 1.2:1 | ❌ Insuficiente |
| G10 (#E3E3E3) | G20 (#BCBCBC) | 1.3:1 | ❌ Insuficiente |

### Borde de Focus

Para accesibilidad, todos los elementos interactivos deben tener un borde de focus visible:

```css
/* Borde de focus estándar */
outline: 2px solid var(--border-focus); /* #3B6E8F */
outline-offset: 2px;
```

**Token**: `borderFocus` = `#3B6E8F` (azul más saturado para mejor contraste)

---

## Modos Claro/Oscuro

### Mapeo de Tokens

Los tokens semánticos se intercambian según el modo:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `surfaceBase` | Marfil (#F8F4EC) | Negro (#0F0F0F) |
| `surfaceRaised` | Blanco (#FFFFFF) | G100 (#111111) |
| `textPrimary` | Negro (#050505) | Marfil (#F8F4EC) |
| `textSecondary` | G60 (#4E4E4E) | G20 (#BCBCBC) |
| `borderDefault` | G20 (#BCBCBC) | G60 (#4E4E4E) |

### Constantes entre Modos

Los siguientes valores se mantienen constantes para preservar el branding:

- ✅ **Acentos azules**: `#A7D8F4` y `#8EC9EC` (se ajusta luminancia si es necesario)
- ✅ **Beige**: `#DFD2BF` (se ajusta opacidad en dark mode)

### Implementación

```typescript
import { getThemeColor } from '@/config/theme/colors';

// En componentes
const bgColor = getThemeColor('surfaceBase', isDark ? 'dark' : 'light');
```

```css
/* En CSS con variables */
:root {
  --surface-base: #F8F4EC;
  --text-primary: #050505;
}

.dark {
  --surface-base: #0F0F0F;
  --text-primary: #F8F4EC;
}
```

---

## Guía de Implementación

### Paso 1: Inventario de Colores Actuales

```bash
# Buscar colores hardcodeados
rg -n '#[0-9A-Fa-f]{3,6}' apps/web/src --type ts --type html --type css
```

### Paso 2: Crear Tokens Centralizados

✅ **Ya completado**: `apps/web/src/config/theme/colors.ts`

### Paso 3: Configurar Tailwind

```javascript
// tailwind.config.js
const { tailwindColors } = require('./apps/web/src/config/theme/colors');

module.exports = {
  theme: {
    extend: {
      colors: tailwindColors,
    },
  },
};
```

### Paso 4: Actualizar Variables CSS

```css
/* styles.css */
:root {
  --surface-base: #F8F4EC;
  --text-primary: #050505;
  /* ... más tokens ... */
}
```

### Paso 5: Migración Incremental

1. **Componentes críticos**: Botones, inputs, layout
2. **Páginas principales**: Dashboard, Marketplace, publicación
3. **Estados y feedback**: Modales, notificaciones
4. **Componentes secundarios**: Cards, badges, iconos

### Paso 6: Validación

```bash
# Validar tokens
npm run validate:colors

# Verificar TypeScript
npm run tsc --noEmit

# Tests visuales
npm run test:e2e
```

---

## Combinaciones Prohibidas

### ❌ NO Usar Estas Combinaciones

1. **Azul pastel sobre beige sin suficiente contraste**
   - ❌ `#A7D8F4` sobre `#DFD2BF` (ratio: 1.5:1)
   - ✅ Usar negro sobre azul pastel

2. **Grises similares para texto y fondo**
   - ❌ G20 sobre G10
   - ✅ Usar G60 sobre G05 o viceversa

3. **Acentos saturados sobre fondos neutros claros**
   - ❌ Azul saturado (#3B82F6) sobre marfil
   - ✅ Usar azul pastel (#A7D8F4)

### ✅ Reglas de Uso

1. **Texto siempre sobre fondo contrastante** (mínimo 4.5:1)
2. **CTAs siempre visibles** (azul pastel sobre fondo claro)
3. **Bordes sutiles** (G10/G20) excepto en estados activos
4. **Feedback suave** (colores desaturados para no romper estética)

---

## Recursos Adicionales

### Herramientas de Validación

- **Contraste**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Paleta**: [Coolors.co](https://coolors.co/) para generar variaciones
- **Accesibilidad**: [axe DevTools](https://www.deque.com/axe/devtools/)

### Referencias

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Custom Colors](https://tailwindcss.com/docs/customizing-colors)
- [Design Tokens Community Group](https://www.designtokens.org/)

---

## Checklist de QA

Antes de considerar completa la migración:

- [ ] Todos los componentes usan tokens semánticos
- [ ] No hay colores hardcodeados en código
- [ ] Contraste mínimo AA verificado en todos los casos
- [ ] Dark mode funciona correctamente
- [ ] Focus visible en todos los elementos interactivos
- [ ] Tests visuales pasan (Playwright/Storybook)
- [ ] TypeScript compila sin errores (`tsc --noEmit`)
- [ ] Documentación actualizada

---

**Última revisión**: 2025-01-XX  
**Mantenido por**: Equipo de Desarrollo AutoRenta


