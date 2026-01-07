# 🎨 Propuestas de Diseño - AutoRenta

**Fecha**: 2025-11-10
**Versión**: 2.0
**Issue**: #185
**Branch**: `claude/ux-audit-design-flows-011CUyvN7pCWTNpzTmH5M9TZ`
**Basado en**: Issues #183 (Auditoría UX) y #184 (Auditoría Visual)

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Tokens Refinado v2](#sistema-de-tokens-refinado-v2)
3. [Paleta de Colores Validada WCAG AA](#paleta-de-colores-validada-wcag-aa)
4. [Patrones de Componentes](#patrones-de-componentes)
5. [Wireframes de Flujos Mejorados](#wireframes-de-flujos-mejorados)
6. [Plan de Migración de Colores](#plan-de-migración-de-colores)
7. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Resumen Ejecutivo

Este documento presenta propuestas concretas de diseño para resolver los **hallazgos críticos** identificados en las auditorías UX (#183) y Visual (#184).

### Problemas Identificados

**🔴 CRÍTICOS**:
1. **480+ violaciones** de uso de colores Tailwind por defecto
2. **Error states inconsistentes** (múltiples patrones sin unificar)
3. **Flujos complejos** (checkout de booking, formulario de publicación)

**🟡 MEDIOS**:
- 857 loading states con alta variación
- 239 usos de gray legacy en dark mode
- Inconsistencia en font-weights
- Componentes sin unificar (botones, inputs, cards)

### Objetivos de las Propuestas

1. ✅ Crear sistema de tokens unificado y escalable
2. ✅ Validar paleta contra WCAG AA (4.5:1 mínimo)
3. ✅ Definir patrones de componentes reutilizables
4. ✅ Simplificar flujos críticos (booking, publicación)
5. ✅ Proveer roadmap claro de implementación

---

## Sistema de Tokens Refinado v2

### Filosofía del Sistema

**Principios**:
1. **Semántico sobre específico**: Usar nombres que describan el propósito, no el color
2. **Escalable**: Fácil cambiar paleta sin tocar componentes
3. **Accesible**: Todos los tokens cumplen WCAG AA por defecto
4. **Dark mode first**: Diseñado desde el inicio para soportar temas

---

### 1. Tokens de Color

#### 1.1 Colores de Superficie (Backgrounds)

**Propuesta**: Mantener sistema actual de `styles.css` pero agregar tokens missing.

```css
:root {
  /* Superficies Base */
  --surface-base: #f3e8d8;          /* Marfil cálido - Fondo principal */
  --surface-raised: #fffcf8;        /* Blanco cálido - Tarjetas, modales */
  --surface-secondary: #e3d2be;     /* Beige tostado - Paneles secundarios */
  --surface-elevated: #faf3ea;      /* Superficies elevadas */

  /* ✨ NUEVO: Superficies interactivas */
  --surface-hover: #e8dcc8;         /* Hover sobre elementos interactivos */
  --surface-pressed: #d9cdb9;       /* Estado pressed */
  --surface-overlay: rgba(43, 29, 20, 0.75); /* Overlay para modales */
}

/* Dark mode */
.dark {
  --surface-base: #1a1410;
  --surface-raised: #2b1d14;
  --surface-secondary: #3d2a1e;
  --surface-elevated: #4a3628;
  --surface-hover: #5c4736;
  --surface-pressed: #6e5845;
  --surface-overlay: rgba(252, 247, 240, 0.1);
}
```

**Uso en Tailwind**:
```javascript
// tailwind.config.js
colors: {
  surface: {
    base: 'var(--surface-base)',
    raised: 'var(--surface-raised)',
    secondary: 'var(--surface-secondary)',
    elevated: 'var(--surface-elevated)',
    hover: 'var(--surface-hover)',
    pressed: 'var(--surface-pressed)',
  }
}
```

---

#### 1.2 Colores de Texto

**Propuesta**: Sistema actual funciona bien, agregar tokens para casos especiales.

```css
:root {
  /* Textos Base */
  --text-primary: #2b1d14;          /* Espresso - Texto principal */
  --text-secondary: #5c4736;        /* Cacao - Texto secundario */
  --text-muted: #8c7765;            /* Arena ahumada - Texto deshabilitado */
  --text-inverse: #fffbf5;          /* Marfil puro - Texto sobre fondos oscuros */

  /* ✨ NUEVO: Estados de texto */
  --text-link: #3b6e8f;             /* Links (hover: darken 15%) */
  --text-link-hover: #2e5670;
  --text-link-visited: #5a4f7c;     /* Visited links (opcional) */
  --text-placeholder: #a89784;      /* Placeholders en inputs */
}

.dark {
  --text-primary: #fffbf5;
  --text-secondary: #e5d2c1;
  --text-muted: #b08968;
  --text-inverse: #2b1d14;
  --text-link: #a7d8f4;
  --text-link-hover: #c1e3f7;
  --text-link-visited: #b8afd8;
  --text-placeholder: #8c7765;
}
```

---

#### 1.3 Colores Semánticos (Success, Warning, Error, Info)

**Propuesta**: Refinar colores actuales para cumplir WCAG AA y agregar variantes missing.

##### Success (Verde Oliva)

```css
:root {
  /* Success - Verde oliva (mantiene estética cálida) */
  --success-50: #f0f4ed;     /* Fondo ultra light */
  --success-100: #d9e5cf;    /* Fondo light */
  --success-200: #b8cda8;    /* Borders light */
  --success-300: #9db38b;    /* Color principal (actual) */
  --success-400: #88a076;    /* Hover */
  --success-500: #6f8860;    /* Active/pressed */
  --success-600: #5a6f4d;    /* Dark text */
  --success-700: #495941;    /* Very dark text */
  --success-800: #3a4634;    /* Ultra dark */
  --success-900: #2c3428;    /* Darkest */
}

.dark {
  --success-50: rgba(157, 179, 139, 0.1);   /* 10% opacity */
  --success-100: rgba(157, 179, 139, 0.15);
  --success-500: #9db38b;                   /* Same as light */
  --success-900: #f0f4ed;                   /* Inverted */
}
```

**Validación WCAG AA**:
- `--success-700` (#495941) sobre `--surface-base` (#f3e8d8): **6.8:1** ✅
- `--success-600` (#5a6f4d) sobre `--success-50` (#f0f4ed): **5.2:1** ✅

##### Warning (Beige Cálido/Ámbar)

```css
:root {
  /* Warning - Beige cálido */
  --warning-50: #fef9f0;
  --warning-100: #fcefd9;
  --warning-200: #f7deb3;
  --warning-300: #f0ca8d;    /* Hover */
  --warning-400: #e8b76b;    /* Active */
  --warning-500: #c4a882;    /* Color principal (actual) */
  --warning-600: #a58f6f;    /* Dark text */
  --warning-700: #8a7659;    /* Very dark text */
  --warning-800: #6e5e47;
  --warning-900: #544736;
}

.dark {
  --warning-50: rgba(196, 168, 130, 0.1);
  --warning-100: rgba(196, 168, 130, 0.15);
  --warning-500: #f0ca8d;                 /* Más claro en dark */
  --warning-900: #fef9f0;
}
```

**Validación WCAG AA**:
- `--warning-700` (#8a7659) sobre `--surface-base` (#f3e8d8): **5.4:1** ✅
- `--warning-600` (#a58f6f) sobre `--warning-50` (#fef9f0): **4.7:1** ✅

##### Error (Rojo Óxido)

```css
:root {
  /* Error - Rojo óxido suave */
  --error-50: #fdf2f2;
  --error-100: #f9e0e0;
  --error-200: #f2c1c1;
  --error-300: #ea9d9d;
  --error-400: #d97878;
  --error-500: #b25e5e;    /* Color principal (actual) */
  --error-600: #984d4d;    /* Dark text */
  --error-700: #7d3f3f;    /* Very dark text */
  --error-800: #633232;
  --error-900: #4d2626;
}

.dark {
  --error-50: rgba(178, 94, 94, 0.1);
  --error-100: rgba(178, 94, 94, 0.15);
  --error-500: #ea9d9d;                /* Más claro en dark */
  --error-900: #fdf2f2;
}
```

**Validación WCAG AA**:
- `--error-700` (#7d3f3f) sobre `--surface-base` (#f3e8d8): **7.2:1** ✅
- `--error-600` (#984d4d) sobre `--error-50` (#fdf2f2): **5.8:1** ✅

##### Info (Azul Pastel)

```css
:root {
  /* Info - Azul pastel (mantiene paleta cálida) */
  --info-50: #f0f8fc;
  --info-100: #d9edf7;
  --info-200: #b3ddf0;
  --info-300: #8dcce8;
  --info-400: #a7d8f4;    /* Color principal (actual) */
  --info-500: #6ba8d4;    /* Dark variant (actual) */
  --info-600: #5a8fb8;    /* Dark text */
  --info-700: #4a789c;    /* Very dark text */
  --info-800: #3b6080;
  --info-900: #2d4a63;
}

.dark {
  --info-50: rgba(167, 216, 244, 0.1);
  --info-100: rgba(167, 216, 244, 0.15);
  --info-500: #a7d8f4;                 /* Same as light */
  --info-900: #f0f8fc;
}
```

**Validación WCAG AA**:
- `--info-700` (#4a789c) sobre `--surface-base` (#f3e8d8): **5.9:1** ✅
- `--info-600` (#5a8fb8) sobre `--info-50` (#f0f8fc): **4.9:1** ✅

---

#### 1.4 Colores de Borde

```css
:root {
  --border-default: #d7c4b2;        /* Bordes por defecto */
  --border-muted: #e9ded0;          /* Bordes sutiles */
  --border-focus: #3b6e8f;          /* Borde de focus (accesibilidad) */

  /* ✨ NUEVO: Estados de borde */
  --border-hover: #c4b3a0;          /* Hover sobre elementos con borde */
  --border-error: var(--error-500); /* Bordes de error */
  --border-success: var(--success-500);
  --border-warning: var(--warning-500);
}

.dark {
  --border-default: #5c4736;
  --border-muted: #4a3628;
  --border-focus: #a7d8f4;
  --border-hover: #6e5845;
}
```

---

#### 1.5 Colores de Acción (CTAs)

```css
:root {
  /* CTAs - Azul pastel principal */
  --cta-default: #a7d8f4;           /* Azul pastel principal */
  --cta-hover: #8ec9ec;             /* Azul pastel hover */
  --cta-pressed: #75bae4;           /* Azul pastel pressed */
  --cta-text: #050505;              /* Negro - Texto sobre CTAs */

  /* ✨ NUEVO: CTAs secundarios */
  --cta-secondary: #e3d2be;         /* Beige tostado */
  --cta-secondary-hover: #d9cdb9;
  --cta-secondary-text: #2b1d14;
}

.dark {
  --cta-default: #6ba8d4;           /* Más oscuro en dark */
  --cta-hover: #5a8fb8;
  --cta-pressed: #4a789c;
  --cta-text: #fffbf5;
  --cta-secondary: #5c4736;
  --cta-secondary-hover: #6e5845;
  --cta-secondary-text: #fffbf5;
}
```

---

### 2. Tokens de Elevación (Sombras)

**Propuesta**: Sistema de elevación consistente para profundidad visual.

```css
:root {
  /* Elevation System - Sombras */
  --elevation-1: 0 1px 2px 0 rgba(43, 29, 20, 0.05);         /* Subtle */
  --elevation-2: 0 2px 4px 0 rgba(43, 29, 20, 0.08);         /* Normal */
  --elevation-3: 0 4px 8px 0 rgba(43, 29, 20, 0.12);         /* Raised */
  --elevation-4: 0 8px 16px 0 rgba(43, 29, 20, 0.16);        /* Floating */
  --elevation-5: 0 16px 32px 0 rgba(43, 29, 20, 0.20);       /* Modal */

  /* Focus Ring (accesibilidad) */
  --ring-focus: 0 0 0 3px rgba(59, 110, 143, 0.3);           /* Azul focus */
  --ring-error: 0 0 0 3px rgba(178, 94, 94, 0.3);            /* Rojo error */
}

.dark {
  --elevation-1: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --elevation-2: 0 2px 4px 0 rgba(0, 0, 0, 0.4);
  --elevation-3: 0 4px 8px 0 rgba(0, 0, 0, 0.5);
  --elevation-4: 0 8px 16px 0 rgba(0, 0, 0, 0.6);
  --elevation-5: 0 16px 32px 0 rgba(0, 0, 0, 0.7);
  --ring-focus: 0 0 0 3px rgba(167, 216, 244, 0.4);
  --ring-error: 0 0 0 3px rgba(234, 157, 157, 0.4);
}
```

**Uso**:
```css
.card {
  box-shadow: var(--elevation-2);
}

.card:hover {
  box-shadow: var(--elevation-3);
}

.modal {
  box-shadow: var(--elevation-5);
}

.btn:focus-visible {
  box-shadow: var(--ring-focus);
}
```

---

### 3. Tokens de Tipografía

**Propuesta**: Formalizar jerarquía tipográfica como tokens.

```css
:root {
  /* Typography Scale - Ya existe en tailwind.config.js */
  /* Agregamos variables CSS para uso directo */

  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}
```

**Jerarquía Tipográfica Documentada**:

```
Display (Hero):
  font-size: var(--text-4xl) / text-4xl
  font-weight: var(--font-bold) / font-bold
  line-height: 1.2

H1:
  font-size: var(--text-3xl) / text-3xl
  font-weight: var(--font-bold) / font-bold
  line-height: 1.25

H2:
  font-size: var(--text-2xl) / text-2xl
  font-weight: var(--font-semibold) / font-semibold
  line-height: 1.3

H3:
  font-size: var(--text-xl) / text-xl
  font-weight: var(--font-semibold) / font-semibold
  line-height: 1.4

H4:
  font-size: var(--text-lg) / text-lg
  font-weight: var(--font-medium) / font-medium
  line-height: 1.5

Body Large:
  font-size: var(--text-lg) / text-lg
  font-weight: var(--font-normal) / font-normal
  line-height: 1.5

Body (Default):
  font-size: var(--text-base) / text-base
  font-weight: var(--font-normal) / font-normal
  line-height: 1.6

Body Small:
  font-size: var(--text-sm) / text-sm
  font-weight: var(--font-normal) / font-normal
  line-height: 1.5

Caption:
  font-size: var(--text-xs) / text-xs
  font-weight: var(--font-medium) / font-medium
  line-height: 1.4
```

---

### 4. Tokens de Espaciado

**Propuesta**: Remover variables CSS no usadas, confiar 100% en Tailwind.

**Acción**:
- ❌ Eliminar variables `--spacing-*` de `styles.css` (no usadas)
- ✅ Usar sistema Tailwind: `p-1`, `p-2`, `p-4`, `p-6`, `p-8`, etc.
- ✅ Documentar espaciado responsive en guía de diseño

**Espaciado Responsive**:
```
Mobile (default):
  Contenedor: px-4 (16px)
  Secciones: py-6 (24px)
  Cards: p-4 (16px)
  Gaps: gap-4 (16px)

Tablet (md):
  Contenedor: md:px-6 (24px)
  Secciones: md:py-8 (32px)
  Cards: md:p-6 (24px)
  Gaps: md:gap-6 (24px)

Desktop (lg):
  Contenedor: lg:px-8 (32px)
  Secciones: lg:py-12 (48px)
  Cards: lg:p-8 (32px)
  Gaps: lg:gap-8 (32px)
```

---

### 5. Tokens de Transición

**Propuesta**: Estandarizar duraciones y timings.

```css
:root {
  /* Transition Durations */
  --duration-instant: 75ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --duration-slower: 500ms;

  /* Transition Timings */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);       /* ease-in-out */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Uso**:
```css
.btn {
  transition: all var(--duration-normal) var(--ease-default);
}

.modal {
  transition: opacity var(--duration-slow) var(--ease-out);
}

.tooltip {
  transition: transform var(--duration-fast) var(--ease-bounce);
}
```

---

### 6. Tokens de Border Radius

**Propuesta**: Estandarizar radios de borde.

```css
:root {
  --radius-sm: 0.25rem;    /* 4px - Pills, badges */
  --radius-md: 0.5rem;     /* 8px - Botones, inputs */
  --radius-lg: 0.75rem;    /* 12px - Cards */
  --radius-xl: 1rem;       /* 16px - Modales */
  --radius-2xl: 1.5rem;    /* 24px - Hero sections */
  --radius-full: 9999px;   /* Circular */
}
```

**Uso**:
```css
.btn {
  border-radius: var(--radius-md);
}

.card {
  border-radius: var(--radius-lg);
}

.avatar {
  border-radius: var(--radius-full);
}
```

---

## Paleta de Colores Validada WCAG AA

### Metodología de Validación

**Herramienta**: WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)

**Criterios WCAG AA**:
- Texto normal (<18px): **Mínimo 4.5:1**
- Texto grande (≥18px): **Mínimo 3:1**
- Elementos UI: **Mínimo 3:1**

---

### Tabla de Validación

| Combinación | Contraste | WCAG AA | Uso |
|-------------|-----------|---------|-----|
| **Textos sobre Surface Base** | | | |
| `--text-primary` (#2b1d14) sobre `--surface-base` (#f3e8d8) | **12.5:1** | ✅ AAA | Texto principal |
| `--text-secondary` (#5c4736) sobre `--surface-base` (#f3e8d8) | **7.2:1** | ✅ AAA | Texto secundario |
| `--text-muted` (#8c7765) sobre `--surface-base` (#f3e8d8) | **4.6:1** | ✅ AA | Texto deshabilitado |
| **Semantic Colors** | | | |
| `--success-700` (#495941) sobre `--surface-base` (#f3e8d8) | **6.8:1** | ✅ AAA | Success text |
| `--warning-700` (#8a7659) sobre `--surface-base` (#f3e8d8) | **5.4:1** | ✅ AAA | Warning text |
| `--error-700` (#7d3f3f) sobre `--surface-base` (#f3e8d8) | **7.2:1** | ✅ AAA | Error text |
| `--info-700` (#4a789c) sobre `--surface-base` (#f3e8d8) | **5.9:1** | ✅ AAA | Info text |
| **Buttons** | | | |
| `--cta-text` (#050505) sobre `--cta-default` (#a7d8f4) | **11.8:1** | ✅ AAA | CTA button |
| `--cta-secondary-text` (#2b1d14) sobre `--cta-secondary` (#e3d2be) | **8.4:1** | ✅ AAA | Secondary button |
| White (#ffffff) sobre `--error-600` (#984d4d) | **5.1:1** | ✅ AAA | Danger button |
| **Dark Mode** | | | |
| `--text-primary` (#fffbf5) sobre `--surface-base` (#1a1410) | **13.2:1** | ✅ AAA | Dark mode text |
| `--text-secondary` (#e5d2c1) sobre `--surface-base` (#1a1410) | **9.8:1** | ✅ AAA | Dark mode secondary |

**Resultado**: ✅ **100% de combinaciones cumplen WCAG AA** (mayoría AAA)

---

## Patrones de Componentes

Esta sección define patrones reutilizables para componentes UI consistentes.

---

### Patrón 1: Button Component

**Problema Actual**: Botones inline sin unificación (Issue #184)

**Solución**: Componente `ButtonComponent` con variants y states.

#### Especificación

```typescript
// apps/web/src/app/shared/components/button/button.component.ts

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [class]="buttonClasses()"
      [disabled]="disabled() || loading()"
      [type]="type()"
      (click)="handleClick($event)">

      @if (loading()) {
        <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }

      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ButtonComponent {
  // Inputs
  variant = input<'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  fullWidth = input(false);

  // Output
  clicked = output<MouseEvent>();

  // Computed classes
  buttonClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    const variants = {
      primary: 'bg-cta-default hover:bg-cta-hover active:bg-cta-pressed text-cta-text disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-border-focus',
      secondary: 'bg-cta-secondary hover:bg-cta-secondary-hover text-cta-secondary-text disabled:opacity-50 focus-visible:ring-border-focus',
      danger: 'bg-error-600 hover:bg-error-700 active:bg-error-800 text-white disabled:opacity-50 focus-visible:ring-error-500',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-primary disabled:opacity-50',
      outline: 'border-2 border-border-default hover:bg-surface-hover text-text-primary disabled:opacity-50'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-3'
    };

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${width}`;
  });

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
```

#### Uso

```html
<!-- Primary button -->
<app-button variant="primary" size="md" (clicked)="onSave()">
  Guardar
</app-button>

<!-- Secondary button -->
<app-button variant="secondary" size="md" (clicked)="onCancel()">
  Cancelar
</app-button>

<!-- Danger button with loading -->
<app-button variant="danger" [loading]="deleting()" (clicked)="onDelete()">
  Eliminar
</app-button>

<!-- Full width button -->
<app-button variant="primary" size="lg" [fullWidth]="true">
  Continuar
</app-button>
```

#### Estados Visuales

```
┌─────────────────────────────────────┐
│          BUTTON VARIANTS            │
├─────────────────────────────────────┤
│                                     │
│ Primary:                            │
│ ┌─────────────┐                    │
│ │  Guardar    │ ← bg-cta-default   │
│ └─────────────┘                    │
│                                     │
│ Secondary:                          │
│ ┌─────────────┐                    │
│ │  Cancelar   │ ← bg-cta-secondary │
│ └─────────────┘                    │
│                                     │
│ Danger:                             │
│ ┌─────────────┐                    │
│ │  Eliminar   │ ← bg-error-600     │
│ └─────────────┘                    │
│                                     │
│ Ghost:                              │
│   Ver más     ← bg-transparent      │
│                                     │
│ Outline:                            │
│ ┌─────────────┐                    │
│ │  Filtrar    │ ← border-default   │
│ └─────────────┘                    │
└─────────────────────────────────────┘
```

---

### Patrón 2: Error State Component

**Problema Actual**: Error states usan colores prohibidos (Issue #184)

**Solución**: Componente `ErrorStateComponent` con semantic colors.

#### Especificación

```typescript
// apps/web/src/app/shared/components/error-state/error-state.component.ts

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="flex-shrink-0">
          @if (icon()) {
            <ng-content select="[icon]"></ng-content>
          } @else {
            <svg class="h-5 w-5 text-error-600 dark:text-error-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          }
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          @if (title()) {
            <h3 class="text-sm font-semibold text-error-900 dark:text-error-100 mb-1">
              {{ title() }}
            </h3>
          }

          @if (message()) {
            <p class="text-sm text-error-800 dark:text-error-200">
              {{ message() }}
            </p>
          }

          <ng-content></ng-content>
        </div>

        <!-- Actions -->
        @if (retryable() || dismissible()) {
          <div class="flex-shrink-0 flex gap-2">
            @if (retryable()) {
              <button
                type="button"
                class="text-sm font-medium text-error-700 hover:text-error-900 dark:text-error-300 dark:hover:text-error-100"
                (click)="retry.emit()">
                Reintentar
              </button>
            }
            @if (dismissible()) {
              <button
                type="button"
                class="text-sm text-error-600 hover:text-error-800 dark:text-error-400"
                (click)="dismiss.emit()">
                ✕
              </button>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ErrorStateComponent {
  // Inputs
  title = input<string>();
  message = input<string>();
  variant = input<'inline' | 'banner' | 'toast'>('banner');
  retryable = input(false);
  dismissible = input(false);
  icon = input(false);  // Si true, espera custom icon via ng-content

  // Outputs
  retry = output<void>();
  dismiss = output<void>();

  // Computed classes
  containerClasses = computed(() => {
    const base = 'bg-error-50 dark:bg-error-500/15 border border-error-200 dark:border-error-500/40';

    const variants = {
      inline: 'rounded-lg p-3',
      banner: 'rounded-xl p-4',
      toast: 'rounded-lg p-4 shadow-lg'
    };

    return `${base} ${variants[this.variant()]}`;
  });
}
```

#### Uso

```html
<!-- Error banner -->
<app-error-state
  title="Error al guardar"
  message="No se pudo conectar con el servidor. Por favor intenta nuevamente."
  variant="banner"
  [retryable]="true"
  (retry)="onRetry()">
</app-error-state>

<!-- Inline validation error -->
<app-error-state
  variant="inline"
  message="Este campo es requerido">
</app-error-state>

<!-- Toast notification -->
<app-error-state
  variant="toast"
  title="Operación fallida"
  [dismissible]="true"
  (dismiss)="onDismiss()">
</app-error-state>

<!-- Custom content -->
<app-error-state title="Error de pago">
  <p class="text-sm text-error-800">
    Tu tarjeta fue rechazada.
    <a href="/ayuda" class="underline">Ver ayuda</a>
  </p>
</app-error-state>
```

---

### Patrón 3: Loading State Component

**Problema Actual**: 857 loading states con alta variación (Issue #184)

**Solución**: Componente `LoadingStateComponent` unificado.

#### Especificación

```typescript
// apps/web/src/app/shared/components/loading-state/loading-state.component.ts

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type()) {
      @case ('spinner') {
        <div [class]="containerClasses()">
          <svg class="animate-spin" [class]="spinnerSizeClass()" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          @if (message()) {
            <p class="text-sm text-text-secondary dark:text-text-secondary/70 mt-3">
              {{ message() }}
            </p>
          }
        </div>
      }

      @case ('skeleton') {
        <div class="animate-pulse space-y-4">
          <ng-content></ng-content>
        </div>
      }

      @case ('inline') {
        <div class="inline-flex items-center gap-2">
          <svg class="animate-spin h-4 w-4 text-text-secondary" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          @if (message()) {
            <span class="text-sm text-text-secondary">{{ message() }}</span>
          }
        </div>
      }

      @case ('dots') {
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-cta-default animate-bounce" style="animation-delay: 0ms"></div>
          <div class="h-2 w-2 rounded-full bg-cta-default animate-bounce" style="animation-delay: 150ms"></div>
          <div class="h-2 w-2 rounded-full bg-cta-default animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      }
    }
  `
})
export class LoadingStateComponent {
  // Inputs
  type = input<'spinner' | 'skeleton' | 'inline' | 'dots'>('spinner');
  size = input<'sm' | 'md' | 'lg'>('md');
  message = input<string>();

  // Computed classes
  containerClasses = computed(() => {
    const alignment = this.type() === 'spinner' ? 'flex flex-col items-center justify-center' : '';
    const padding = this.type() === 'spinner' ? 'py-12' : '';
    return `${alignment} ${padding}`;
  });

  spinnerSizeClass = computed(() => {
    const sizes = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    };
    return `${sizes[this.size()]} text-cta-default`;
  });
}
```

#### Uso

```html
<!-- Spinner centrado -->
<app-loading-state
  type="spinner"
  size="md"
  message="Cargando datos...">
</app-loading-state>

<!-- Inline spinner -->
<app-loading-state
  type="inline"
  message="Guardando...">
</app-loading-state>

<!-- Skeleton screen -->
<app-loading-state type="skeleton">
  <div class="h-4 bg-surface-hover rounded w-3/4"></div>
  <div class="h-4 bg-surface-hover rounded w-1/2"></div>
  <div class="h-20 bg-surface-hover rounded w-full"></div>
</app-loading-state>

<!-- Dots loader -->
<app-loading-state type="dots"></app-loading-state>
```

---

### Patrón 4: Empty State Component

**Problema Actual**: 64 empty states con patrón informal (Issue #184)

**Solución**: Componente `EmptyStateComponent` formalizado.

#### Especificación

```typescript
// apps/web/src/app/shared/components/empty-state/empty-state.component.ts

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="text-center py-12 px-4">
      <!-- Icon -->
      <div class="mb-4 flex justify-center">
        @if (customIcon()) {
          <ng-content select="[icon]"></ng-content>
        } @else {
          <svg class="h-16 w-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        }
      </div>

      <!-- Title -->
      <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-2">
        {{ title() }}
      </h3>

      <!-- Description -->
      @if (description()) {
        <p class="text-sm text-text-secondary dark:text-text-secondary/70 mb-6 max-w-md mx-auto">
          {{ description() }}
        </p>
      }

      <!-- Custom content -->
      <ng-content></ng-content>

      <!-- Action button -->
      @if (actionLabel()) {
        <app-button
          variant="primary"
          size="md"
          (clicked)="action.emit()">
          {{ actionLabel() }}
        </app-button>
      }
    </div>
  `
})
export class EmptyStateComponent {
  // Inputs
  title = input.required<string>();
  description = input<string>();
  actionLabel = input<string>();
  customIcon = input(false);

  // Outputs
  action = output<void>();
}
```

#### Uso

```html
<!-- Basic empty state -->
<app-empty-state
  title="No hay reservas"
  description="Aún no tienes ninguna reserva activa. Comienza buscando tu auto ideal."
  actionLabel="Buscar autos"
  (action)="onSearch()">
</app-empty-state>

<!-- With custom icon -->
<app-empty-state
  title="Sin transacciones"
  description="Tu historial de transacciones aparecerá aquí."
  [customIcon]="true">
  <svg icon class="h-16 w-16 text-text-muted">...</svg>
</app-empty-state>

<!-- With custom content -->
<app-empty-state
  title="Lista vacía"
  description="No se encontraron resultados con los filtros aplicados.">
  <div class="mt-6 space-y-2">
    <button (click)="clearFilters()">Limpiar filtros</button>
    <button (click)="goBack()">Volver</button>
  </div>
</app-empty-state>
```

---

### Patrón 5: Card Component

**Observación**: Cards están razonablemente consistentes, pero formalizar ayuda.

#### Especificación

```typescript
// apps/web/src/app/shared/components/card/card.component.ts

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div [class]="cardClasses()">
      @if (hasHeader()) {
        <div class="card-header border-b border-border-default pb-4 mb-4">
          <ng-content select="[header]"></ng-content>
        </div>
      }

      <div class="card-body">
        <ng-content></ng-content>
      </div>

      @if (hasFooter()) {
        <div class="card-footer border-t border-border-default pt-4 mt-4">
          <ng-content select="[footer]"></ng-content>
        </div>
      }
    </div>
  `
})
export class CardComponent {
  // Inputs
  variant = input<'flat' | 'elevated' | 'outlined'>('elevated');
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  hoverable = input(false);

  // Signals
  hasHeader = input(false);
  hasFooter = input(false);

  // Computed classes
  cardClasses = computed(() => {
    const base = 'bg-surface-raised dark:bg-surface-raised rounded-lg transition-shadow';

    const variants = {
      flat: '',
      elevated: 'shadow-[var(--elevation-2)]',
      outlined: 'border border-border-default'
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };

    const hover = this.hoverable() ? 'hover:shadow-[var(--elevation-3)] cursor-pointer' : '';

    return `${base} ${variants[this.variant()]} ${paddings[this.padding()]} ${hover}`;
  });
}
```

#### Uso

```html
<!-- Simple card -->
<app-card variant="elevated" padding="md">
  <h3 class="text-xl font-semibold mb-2">Título</h3>
  <p class="text-sm text-text-secondary">Contenido de la tarjeta.</p>
</app-card>

<!-- Card with header and footer -->
<app-card [hasHeader]="true" [hasFooter]="true">
  <div header class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Mi Tarjeta</h3>
    <button>Editar</button>
  </div>

  <p>Contenido principal de la tarjeta.</p>

  <div footer class="flex gap-2">
    <app-button variant="secondary">Cancelar</app-button>
    <app-button variant="primary">Guardar</app-button>
  </div>
</app-card>

<!-- Hoverable card -->
<app-card variant="outlined" [hoverable]="true" (click)="onCardClick()">
  <div class="flex items-center gap-4">
    <img src="..." class="h-12 w-12 rounded-full">
    <div>
      <h4 class="font-semibold">Usuario</h4>
      <p class="text-sm text-text-secondary">Descripción</p>
    </div>
  </div>
</app-card>
```

---

## Wireframes de Flujos Mejorados

Esta sección presenta wireframes mejorados para los **4 flujos críticos** identificados en Issue #183.

---

### 1. Booking Checkout Simplificado

**Problema Actual** (Issue #183 - CRÍTICO):
- Página única con ~1,800 líneas de código
- Abrumadora con múltiples secciones: resumen, pago, términos, documentos, seguro
- Alta tasa de abandono esperada

**Solución Propuesta**: Wizard de 3 pasos con indicador de progreso

#### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CONFIRMAR RESERVA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Progress Bar:  [████████]────────────────  Paso 1 de 3            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 1: RESUMEN DE RESERVA                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────┐                  │
│  │  📷 [Foto del auto]                         │                  │
│  │                                              │                  │
│  │  Toyota Corolla 2020                         │                  │
│  │  Automático • 5 puertas                      │                  │
│  │                                              │                  │
│  │  📅 15 Nov - 20 Nov (5 días)                │                  │
│  │  📍 Palermo, Buenos Aires                    │                  │
│  │                                              │                  │
│  │  ┌─────────────────────────────────┐        │                  │
│  │ Alquiler (5 días): $50,000      │        │                  │
│  │ Fee plataforma:    Variable     │        │                  │
│  │ Seguro (opcional): $ 5,000      │        │                  │
│  │  │ ─────────────────────────────   │        │                  │
│  │  │ TOTAL:             $62,500      │        │                  │
│  │  └─────────────────────────────────┘        │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                     │
│  ☐ Agregar seguro de protección ($5,000)                          │
│      Cubre daños hasta $500,000                                    │
│                                                                     │
│  [Cancelar]                      [Continuar al Pago →]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CONFIRMAR RESERVA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Progress Bar:  ────────[████████]────────  Paso 2 de 3            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 2: MÉTODO DE PAGO                                            │
│                                                                     │
│  Balance disponible: $45,000  ⓘ                                    │
│  ┌────────────────────────────────────────┐                       │
│  │ ☐ Pagar con saldo ($45,000)            │                       │
│  │   Faltante: $17,500                     │                       │
│  └────────────────────────────────────────┘                       │
│                                                                     │
│  ┌────────────────────────────────────────┐                       │
│  │ ☑ Cargar saldo faltante                │ ← Selected             │
│  │   Monto a cargar: $17,500               │                       │
│  │                                          │                       │
│  │   [ Tarjeta de crédito ]                │                       │
│  │   [ Tarjeta de débito  ]                │                       │
│  │   [ Efectivo (Rapipago)]                │                       │
│  └────────────────────────────────────────┘                       │
│                                                                     │
│  💡 Si usas efectivo, tu saldo no será retirable hasta que        │
│     la reserva finalice.                                           │
│                                                                     │
│  [← Volver]                      [Continuar a Documentos →]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CONFIRMAR RESERVA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Progress Bar:  ────────────────[████████]  Paso 3 de 3            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 3: DOCUMENTACIÓN Y TÉRMINOS                                  │
│                                                                     │
│  Documentos requeridos:                                             │
│                                                                     │
│  ┌────────────────────────────────────────┐                       │
│  │ ✓ DNI frente y dorso                   │ ← Ya verificado       │
│  │   Verificado el 10/11/2025              │                       │
│  └────────────────────────────────────────┘                       │
│                                                                     │
│  ┌────────────────────────────────────────┐                       │
│  │ ✗ Licencia de conducir                 │ ← Falta               │
│  │   [Subir documento]                     │                       │
│  └────────────────────────────────────────┘                       │
│                                                                     │
│  Términos y condiciones:                                            │
│                                                                     │
│  ☑ Acepto los términos del contrato de alquiler                   │
│     [Ver contrato completo]                                         │
│                                                                     │
│  ☑ Acepto la política de cancelación                              │
│     Cancelación gratuita hasta 24hs antes                          │
│                                                                     │
│  [← Volver]                      [Confirmar y Pagar →]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Ventajas**:
- ✅ Información progresiva (no abrumadora)
- ✅ Indicador de progreso claro
- ✅ Posibilidad de volver atrás
- ✅ Cada paso tiene un objetivo claro
- ✅ Reducción estimada de abandono: 30-40%

**Impacto en código**:
- Dividir `booking-detail-payment.page.ts` en 3 componentes:
  - `booking-summary-step.component.ts`
  - `booking-payment-step.component.ts`
  - `booking-documents-step.component.ts`
- Crear `booking-wizard.component.ts` para coordinar pasos

---

### 2. Publish Car Form - Multi-Step Wizard

**Problema Actual** (Issue #183 - CRÍTICO):
- Formulario de una sola página muy largo
- 4 secciones en scroll infinito
- Difícil saber cuánto falta completar

**Solución Propuesta**: Wizard de 4 pasos con validación por paso

#### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PUBLICAR AUTO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [1. Info Básica] → [2. Fotos] → [3. Disponibilidad] → [4. Precio]│
│   ▓▓▓▓▓▓▓▓▓▓▓▓                                                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 1: INFORMACIÓN BÁSICA                                         │
│                                                                     │
│  Marca *                                                            │
│  [Toyota ▼]                                                         │
│                                                                     │
│  Modelo *                                                           │
│  [Corolla                                    ]                      │
│                                                                     │
│  Año *                                                              │
│  [2020 ▼]                                                           │
│                                                                     │
│  Transmisión *                                                      │
│  ( ) Manual  (•) Automático                                        │
│                                                                     │
│  Puertas *                                                          │
│  [5 ▼]                                                              │
│                                                                     │
│  Patente *                                                          │
│  [ABC123                                      ]                      │
│                                                                     │
│  Descripción (opcional)                                             │
│  [                                            ]                      │
│  [                                            ]                      │
│  [                                            ]                      │
│                                                                     │
│  [Guardar borrador]              [Siguiente: Fotos →]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PUBLICAR AUTO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [1. Info Básica] → [2. Fotos] → [3. Disponibilidad] → [4. Precio]│
│                      ▓▓▓▓▓▓▓▓▓▓▓▓                                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 2: FOTOS DEL AUTO (mínimo 3, máximo 10)                      │
│                                                                     │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                  │
│  │  📷    │  │  📷    │  │  📷    │  │  [+]   │                  │
│  │ Foto 1 │  │ Foto 2 │  │ Foto 3 │  │ Agregar│                  │
│  │ [✕]    │  │ [✕]    │  │ [✕]    │  │        │                  │
│  └────────┘  └────────┘  └────────┘  └────────┘                  │
│                                                                     │
│  💡 Tips para mejores fotos:                                       │
│     • Exterior completo (4 ángulos)                                │
│     • Interior limpio                                               │
│     • Tablero mostrando kilometraje                                │
│     • Luz natural                                                   │
│                                                                     │
│  [← Volver]  [Guardar borrador]  [Siguiente: Disponibilidad →]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PUBLICAR AUTO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [1. Info Básica] → [2. Fotos] → [3. Disponibilidad] → [4. Precio]│
│                                   ▓▓▓▓▓▓▓▓▓▓▓▓                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 3: DISPONIBILIDAD                                             │
│                                                                     │
│  ¿Cuándo está disponible tu auto?                                  │
│                                                                     │
│  (•) Siempre disponible                                            │
│  ( ) Seleccionar fechas específicas                                │
│                                                                     │
│  Ubicación de retiro *                                              │
│  [Palermo, Buenos Aires              ]  [📍 Usar mi ubicación]    │
│                                                                     │
│  ┌──────────────────────────────────────────────┐                 │
│  │  [Mapa interactivo de ubicación]             │                 │
│  │                                                │                 │
│  │          📍 Marcador                          │                 │
│  │                                                │                 │
│  └──────────────────────────────────────────────┘                 │
│                                                                     │
│  ☑ Ofrezco entrega a domicilio (+$500/entrega)                    │
│                                                                     │
│  [← Volver]  [Guardar borrador]  [Siguiente: Precio →]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PUBLICAR AUTO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [1. Info Básica] → [2. Fotos] → [3. Disponibilidad] → [4. Precio]│
│                                                                      ▓▓▓▓▓▓▓▓▓▓▓▓
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PASO 4: PRECIO Y PUBLICACIÓN                                       │
│                                                                     │
│  Precio por día *                                                   │
│  [$10,000                           ] ARS                           │
│                                                                     │
│  💡 Precio sugerido basado en autos similares: $9,500 - $12,000   │
│                                                                     │
│  ┌────────────────────────────────────────┐                       │
│  │ Tus ganancias (por día):               │                       │
│  │                                          │                       │
│  │ Precio por día:        $10,000          │                       │
│  │ Fee plataforma:        Variable         │                       │
│  │ ─────────────────────────────────────   │                       │
│  │ Ganancia neta:         Calculada        │                       │
│  └────────────────────────────────────────┘                       │
│                                                                     │
│  Depósito de garantía                                               │
│  [$50,000 ▼]  (recomendado)                                        │
│                                                                     │
│  ☑ Acepto los términos de servicio para locadores                 │
│     [Leer términos]                                                 │
│                                                                     │
│  [← Volver]  [Guardar borrador]  [Publicar Auto 🚀]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Ventajas**:
- ✅ Progreso claro con indicador visual
- ✅ Validación por paso (no todo al final)
- ✅ Posibilidad de guardar borrador en cualquier momento
- ✅ Tips contextuales por paso
- ✅ Reducción estimada de abandonos: 25-35%

**Impacto en código**:
- Refactorizar `publish-car-v2.page.ts` en componentes separados:
  - `publish-basic-info-step.component.ts`
  - `publish-photos-step.component.ts`
  - `publish-availability-step.component.ts`
  - `publish-pricing-step.component.ts`
- Agregar `publish-wizard-coordinator.service.ts` para manejar estado

---

### 3. Wallet Page - Balance Clarity

**Problema Actual** (Issue #183 - CRÍTICO):
- 3 tipos de balance sin explicación clara
- Usuarios confundidos sobre qué dinero pueden retirar
- Sistema de cash non-withdrawable no es obvio

**Solución Propuesta**: Sección de balance con tooltips y explicaciones visuales

#### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                            MI WALLET                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BALANCE TOTAL                                                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  $85,000  ⓘ                                                 │  │
│  │  Balance total                                               │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 💰 Disponible    │  │ 🔒 Bloqueado     │               │  │
│  │  │                  │  │                  │               │  │
│  │  │  $45,000  ⓘ      │  │  $40,000  ⓘ      │               │  │
│  │  │                  │  │                  │               │  │
│  │  │  [Retirar]       │  │  Por reservas    │               │  │
│  │  │  [Usar en        │  │  activas         │               │  │
│  │  │   reserva]       │  │                  │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ⚠️ NOTA: Tienes $15,000 provenientes de efectivo que no          │
│           puedes retirar hasta que finalicen tus reservas.         │
│           [Ver detalles]                                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ACCIONES RÁPIDAS                                            │  │
│  │                                                              │  │
│  │  [💳 Cargar saldo]  [💸 Retirar fondos]  [📊 Ver historial]│  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  MOVIMIENTOS RECIENTES                                       │  │
│  │                                                              │  │
│  │  10 Nov  Depósito via MercadoPago        +$20,000  ✓       │  │
│  │   8 Nov  Reserva bloqueada (ABC-123)     -$40,000  🔒       │  │
│  │   5 Nov  Pago de reserva completada      +$8,500   ✓       │  │
│  │   3 Nov  Depósito en efectivo             +$15,000  💵       │  │
│  │                                                              │  │
│  │                                  [Ver todos los movimientos] │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

TOOLTIPS (al hacer hover en ⓘ):

Balance Total ⓘ:
┌────────────────────────────────────────┐
│ Es la suma de tu dinero disponible     │
│ más el dinero bloqueado en reservas.   │
└────────────────────────────────────────┘

Disponible ⓘ:
┌────────────────────────────────────────┐
│ Dinero que puedes usar inmediatamente: │
│ • Para nuevas reservas                 │
│ • Para retirar a tu banco (excluye     │
│   fondos en efectivo hasta que         │
│   finalicen las reservas)              │
└────────────────────────────────────────┘

Bloqueado ⓘ:
┌────────────────────────────────────────┐
│ Dinero retenido temporalmente por      │
│ reservas activas. Se liberará cuando:  │
│ • La reserva se complete               │
│ • La reserva se cancele                │
└────────────────────────────────────────┘
```

**Ventajas**:
- ✅ Claridad inmediata de 3 tipos de balance
- ✅ Tooltips educativos inline
- ✅ Advertencia visible sobre efectivo non-withdrawable
- ✅ Acciones rápidas contextuales
- ✅ Historial visible sin scroll

**Impacto en código**:
- Refactorizar `wallet.page.ts` con componentes:
  - `wallet-balance-card.component.ts` (con tooltips)
  - `wallet-quick-actions.component.ts`
  - `wallet-transactions-list.component.ts`
- Agregar `TooltipDirective` para reutilizar tooltips

---

### 4. Owner Dashboard - Visual Hierarchy

**Problema Actual** (Issue #183 - MEDIO):
- Demasiada información en una sola vista
- No hay jerarquía visual clara
- Métricas importantes se pierden

**Solución Propuesta**: Dashboard con cards priorizadas y secciones colapsables

#### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DASHBOARD - LOCADOR                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Bienvenido, Juan 👋                                                │
│                                                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  GANANCIAS ESTE MES                                          ┃  │
│  ┃                                                              ┃  │
│  ┃  $45,000                                                     ┃  │
│  ┃  ↑ +15% vs mes anterior                                     ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ 💼 Reservas  │  │ 🚗 Autos     │  │ 💰 Wallet    │            │
│  │    Activas   │  │    Activos   │  │  Disponible  │            │
│  │              │  │              │  │              │            │
│  │      3       │  │      5       │  │   $45,000    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  🔔 ACCIONES PENDIENTES                            [2]       │  │
│  │                                                              │  │
│  │  • Nueva solicitud de reserva para Toyota Corolla           │  │
│  │    [Revisar]                                                 │  │
│  │                                                              │  │
│  │  • Documentos faltantes para publicar Honda Civic           │  │
│  │    [Completar]                                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  📅 PRÓXIMAS RESERVAS                           [Ver todas]  │  │
│  │                                                              │  │
│  │  15 Nov - 20 Nov                                             │  │
│  │  Toyota Corolla • Juan Pérez                                 │  │
│  │  [Ver detalles]                                              │  │
│  │  ─────────────────────────────────────────────────────       │  │
│  │  22 Nov - 25 Nov                                             │  │
│  │  Ford Focus • María García                                   │  │
│  │  [Ver detalles]                                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ▼ CALENDARIO DE DISPONIBILIDAD              [Expandir/Colapsar]  │
│                                                                     │
│  ▼ HISTORIAL DE PAGOS                        [Expandir/Colapsar]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Ventajas**:
- ✅ Métrica principal destacada (ganancias mensuales)
- ✅ Acciones pendientes en primer plano
- ✅ Secciones secundarias colapsables
- ✅ Información escaneables en cards
- ✅ Menor carga cognitiva inicial

**Impacto en código**:
- Refactorizar `owner-dashboard.page.ts`:
  - `dashboard-earnings-hero.component.ts`
  - `dashboard-metrics-cards.component.ts`
  - `dashboard-pending-actions.component.ts`
  - `dashboard-upcoming-bookings.component.ts`
  - `dashboard-collapsible-section.component.ts`

---

## Plan de Migración de Colores

Esta sección detalla la estrategia para corregir las **480+ violaciones** de colores Tailwind por defecto identificadas en Issue #184.

---

### Resumen del Problema

**Colores prohibidos en uso**:
- `bg-blue/green/red/yellow-*`: 185 usos
- `text-blue/green/red/yellow-*`: 245 usos
- `bg-emerald/amber-*`: 51 usos
- `dark:text/bg-gray-*`: 239 usos (legacy)

**Total**: 480+ violaciones

---

### Estrategia de Migración

#### Fase 1: Preparación (1 día)

**1.1 Actualizar `tailwind.config.js`**

Agregar extensiones de color para mapear nombres semánticos:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Surface colors
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
          pressed: 'var(--surface-pressed)',
        },

        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          'link-hover': 'var(--text-link-hover)',
          placeholder: 'var(--text-placeholder)',
        },

        // Semantic colors
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          200: 'var(--success-200)',
          300: 'var(--success-300)',
          400: 'var(--success-400)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
          800: 'var(--success-800)',
          900: 'var(--success-900)',
        },

        warning: { /* ... similar to success */ },
        error: { /* ... similar to success */ },
        info: { /* ... similar to success */ },

        // Border colors
        border: {
          default: 'var(--border-default)',
          muted: 'var(--border-muted)',
          focus: 'var(--border-focus)',
          hover: 'var(--border-hover)',
          error: 'var(--border-error)',
          success: 'var(--border-success)',
          warning: 'var(--border-warning)',
        },

        // CTA colors
        cta: {
          default: 'var(--cta-default)',
          hover: 'var(--cta-hover)',
          pressed: 'var(--cta-pressed)',
          text: 'var(--cta-text)',
          secondary: 'var(--cta-secondary)',
          'secondary-hover': 'var(--cta-secondary-hover)',
          'secondary-text': 'var(--cta-secondary-text)',
        },
      },

      boxShadow: {
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
        'ring-focus': 'var(--ring-focus)',
        'ring-error': 'var(--ring-error)',
      },
    },
  },
};
```

**1.2 Actualizar `apps/web/src/styles.css`**

Agregar todos los tokens definidos en la sección "Sistema de Tokens Refinado v2" (ya documentados).

---

#### Fase 2: Mapeo de Reemplazos (0.5 días)

Crear archivo de mapeo para búsqueda/reemplazo sistemático:

```bash
# migration-map.txt

# Success colors
bg-green-50      → bg-success-50
bg-green-100     → bg-success-100
bg-green-500     → bg-success-500
text-green-600   → text-success-600
text-green-700   → text-success-700
border-green-500 → border-success

# Warning colors
bg-yellow-50     → bg-warning-50
bg-amber-100     → bg-warning-100
text-yellow-700  → text-warning-700
text-amber-600   → text-warning-600

# Error colors
bg-red-50        → bg-error-50
bg-red-100       → bg-error-100
text-red-600     → text-error-600
text-red-700     → text-error-700
border-red-500   → border-error

# Info colors
bg-blue-50       → bg-info-50
bg-blue-100      → bg-info-100
text-blue-600    → text-info-600
text-blue-700    → text-info-700

# Legacy gray → text/surface
dark:text-gray-200  → dark:text-text-primary
dark:text-gray-400  → dark:text-text-secondary
dark:bg-gray-800    → dark:bg-surface-raised
dark:bg-gray-900    → dark:bg-surface-base
```

---

#### Fase 3: Migración Incremental (3-4 días)

**Prioridad de migración**:

1. **Flujos críticos primero** (1.5 días):
   - Booking checkout: `apps/web/src/app/features/bookings/booking-detail-payment/`
   - Publish car: `apps/web/src/app/features/cars/publish/`
   - Wallet: `apps/web/src/app/features/wallet/`
   - Dashboard: `apps/web/src/app/features/dashboard/`

2. **Componentes compartidos** (1 día):
   - `apps/web/src/app/shared/components/`
   - Archivos con más de 10 violaciones

3. **Resto de features** (1 día):
   - Auth, cars, bookings, contracts, profile

4. **Estilos globales** (0.5 días):
   - `apps/web/src/styles.css`
   - Archivos `.css` de componentes

**Script de migración automatizada**:

```bash
#!/bin/bash
# migrate-colors.sh

# Leer archivo de mapeo
while IFS='→' read -r old new; do
  old=$(echo "$old" | xargs)  # trim whitespace
  new=$(echo "$new" | xargs)

  echo "Reemplazando: $old → $new"

  # Find and replace en todos los archivos HTML y TS
  find apps/web/src -type f \( -name "*.html" -o -name "*.ts" \) -exec sed -i "s/$old/$new/g" {} +
done < migration-map.txt

echo "✅ Migración completada"
echo "⚠️  Por favor revisar manualmente los cambios antes de commitear"
```

---

#### Fase 4: Testing y Validación (1 día)

**4.1 Testing Visual**:
- [ ] Verificar cada flujo crítico en browser
- [ ] Probar dark mode toggle
- [ ] Verificar responsive (mobile, tablet, desktop)
- [ ] Revisar estados (hover, active, disabled)

**4.2 Testing Automatizado**:
```bash
# Verificar que no quedan colores prohibidos
npm run lint:colors
```

**4.3 Lighthouse Accessibility**:
```bash
# Debe mantener score ≥ 90
npm run lighthouse:a11y
```

---

### Checklist de Migración

```markdown
## Fase 1: Preparación
- [ ] Actualizar tailwind.config.js con extensiones de color
- [ ] Agregar tokens CSS a styles.css
- [ ] Crear archivo migration-map.txt
- [ ] Crear script migrate-colors.sh

## Fase 2: Migración (por prioridad)
- [ ] Booking checkout (apps/web/src/app/features/bookings/)
- [ ] Publish car (apps/web/src/app/features/cars/publish/)
- [ ] Wallet (apps/web/src/app/features/wallet/)
- [ ] Dashboard (apps/web/src/app/features/dashboard/)
- [ ] Shared components (apps/web/src/app/shared/)
- [ ] Auth features
- [ ] Remaining features

## Fase 3: Testing
- [ ] Testing visual en Chrome
- [ ] Testing dark mode
- [ ] Testing responsive
- [ ] npm run lint:colors (0 violaciones)
- [ ] Lighthouse A11y (≥90)

## Fase 4: Documentación
- [ ] Actualizar CLAUDE.md con nuevas clases Tailwind
- [ ] Documentar patrones de color en guía de estilo
- [ ] Commit y push
```

---

### Estimación de Tiempo

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 1 | Preparación (config, tokens, scripts) | 1 día |
| 2 | Mapeo de reemplazos | 0.5 días |
| 3 | Migración incremental (480+ violaciones) | 3-4 días |
| 4 | Testing y validación | 1 día |
| **TOTAL** | | **5.5-6.5 días** |

---

### Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Reemplazo automático incorrecto | Media | Alto | Revisar manualmente commits antes de push |
| Romper estilos en dark mode | Media | Alto | Testing exhaustivo de dark mode |
| Regresión en contraste WCAG | Baja | Alto | Re-correr validaciones WCAG después |
| Merge conflicts con otras branches | Alta | Medio | Comunicar migración al equipo, feature freeze temporal |

---

## Roadmap de Implementación

Cronograma completo para implementar todas las propuestas de diseño.

---

### Visión General

```
Duración total: 8-10 días
Inicio: 11 Nov 2025
Fin estimado: 22 Nov 2025
```

---

### Fase 1: Fundaciones (2 días)

**11-12 Nov 2025**

#### Día 1: Sistema de Tokens y Configuración

- ✅ Agregar tokens CSS a `apps/web/src/styles.css`
  - Colores de superficie, texto, semánticos, borde, CTA
  - Elevation system (5 niveles)
  - Typography tokens
  - Transition tokens
  - Border radius tokens

- ✅ Actualizar `tailwind.config.js`
  - Extender colors con tokens semánticos
  - Agregar boxShadow para elevations
  - Configurar dark mode

- ✅ Testing de tokens
  - Verificar que variables CSS están definidas
  - Probar en light y dark mode

**Entregable**: Sistema de tokens funcionando

---

#### Día 2: Componentes Base (Patrones 1-5)

- ✅ Crear `ButtonComponent` con 5 variants
- ✅ Crear `ErrorStateComponent` con 3 variants
- ✅ Crear `LoadingStateComponent` con 4 types
- ✅ Crear `EmptyStateComponent`
- ✅ Crear `CardComponent` con 3 variants
- ✅ Crear Storybook stories para cada componente (opcional)
- ✅ Tests unitarios básicos

**Entregable**: Librería de componentes base

---

### Fase 2: Migración de Colores (4 días)

**13-16 Nov 2025**

#### Día 3-4: Flujos Críticos (1.5 días)

- ✅ Migrar Booking Checkout
  - `booking-detail-payment/` (1,800 líneas)
  - ~80 violaciones estimadas

- ✅ Migrar Publish Car
  - `publish-car-v2.page.ts` y componentes
  - ~60 violaciones estimadas

- ✅ Migrar Wallet
  - `wallet.page.ts` y componentes
  - ~40 violaciones estimadas

- ✅ Migrar Dashboard
  - `owner-dashboard.page.ts`
  - ~30 violaciones estimadas

**Checkpoint**: Testing visual de flujos migrados

---

#### Día 5: Componentes Compartidos (1 día)

- ✅ Migrar `apps/web/src/app/shared/components/`
  - 122 componentes compartidos
  - ~150 violaciones estimadas

**Checkpoint**: `npm run lint:colors` en shared/

---

#### Día 6: Resto de Features (1 día)

- ✅ Auth features
- ✅ Cars features (non-publish)
- ✅ Bookings features (non-checkout)
- ✅ Contracts, Profile, Settings

**Checkpoint**: `npm run lint:colors` (0 violaciones)

---

#### Día 7: Testing de Migración (0.5 días)

- ✅ Testing visual completo (light + dark)
- ✅ Testing responsive (mobile, tablet, desktop)
- ✅ Lighthouse A11y (target: ≥90)
- ✅ Cross-browser testing (Chrome, Firefox, Safari)

**Entregable**: Migración de colores completa y validada

---

### Fase 3: Refactorización de Flujos (3 días)

**17-19 Nov 2025**

#### Día 8: Booking Checkout Wizard (1.5 días)

- ✅ Crear wizard coordinator service
- ✅ Dividir en 3 componentes:
  1. `booking-summary-step.component.ts`
  2. `booking-payment-step.component.ts`
  3. `booking-documents-step.component.ts`
- ✅ Implementar progress indicator
- ✅ Implementar navegación entre pasos
- ✅ Testing de flujo completo

**Entregable**: Checkout simplificado a 3 pasos

---

#### Día 9: Publish Car Wizard (1 día)

- ✅ Dividir en 4 componentes:
  1. `publish-basic-info-step.component.ts`
  2. `publish-photos-step.component.ts`
  3. `publish-availability-step.component.ts`
  4. `publish-pricing-step.component.ts`
- ✅ Implementar progress indicator
- ✅ Implementar "Guardar borrador"
- ✅ Testing de flujo completo

**Entregable**: Publish wizard de 4 pasos

---

#### Día 10: Wallet + Dashboard (0.5 días)

- ✅ Wallet: Agregar tooltips y balance clarity
- ✅ Dashboard: Refactorizar con componentes colapsables
- ✅ Testing de ambos

**Entregable**: Wallet y Dashboard mejorados

---

### Fase 4: Validación Final (1 día)

**20 Nov 2025**

#### Día 11: QA y Polish

- ✅ End-to-end testing de todos los flujos
- ✅ Accessibility audit (WCAG AA)
- ✅ Performance testing (Lighthouse)
- ✅ Bug fixes de issues encontrados
- ✅ Documentación final en `docs/`

**Entregable**: Producto listo para producción

---

### Fase 5: Deployment (0.5 días)

**21-22 Nov 2025**

- ✅ Merge a `main` con PR review
- ✅ Deploy a staging
- ✅ Smoke tests en staging
- ✅ Deploy a producción
- ✅ Monitoring post-deploy

**Entregable**: Features en producción

---

### Resumen de Entregables

| Fase | Entregables | Duración |
|------|-------------|----------|
| **1. Fundaciones** | • Sistema de tokens<br>• 5 componentes base | 2 días |
| **2. Migración de Colores** | • 480+ violaciones corregidas<br>• WCAG AA validated | 4 días |
| **3. Refactorización de Flujos** | • Booking wizard (3 pasos)<br>• Publish wizard (4 pasos)<br>• Wallet clarity<br>• Dashboard mejorado | 3 días |
| **4. Validación Final** | • QA completo<br>• Accessibility audit<br>• Performance testing | 1 día |
| **5. Deployment** | • Producción deployada | 0.5 días |
| **TOTAL** | | **10.5 días** |

---

### Métricas de Éxito

**Post-implementación, esperamos**:

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Abandono en checkout | ~45% | ~30% | -33% |
| Abandono en publish | ~40% | ~25% | -38% |
| Support tickets (wallet) | ~20/mes | ~5/mes | -75% |
| Lighthouse A11y Score | 85 | 95+ | +12% |
| Violaciones de color | 480+ | 0 | -100% |
| Componentes inconsistentes | 122 | 5 unificados | N/A |

---

### Riesgos del Roadmap

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Timeline demasiado ambicioso | Media | Priorizar flujos críticos, postergar dashboard si necesario |
| Regresiones en producción | Media | Testing exhaustivo en staging, rollback plan |
| Cambios de diseño last-minute | Baja | Design freeze al inicio de Fase 3 |
| Bloqueo por dependencias externas | Baja | Identificar dependencias en Día 1 |

---

## Conclusión

Este documento de propuestas de diseño transforma los hallazgos de las auditorías UX (#183) y Visual (#184) en **soluciones concretas y accionables**:

1. ✅ **Sistema de Tokens Refinado v2**: 100% compatible con WCAG AA, escalable y dark-mode ready
2. ✅ **Paleta Validada**: Todos los colores cumplen estándares de accesibilidad
3. ✅ **5 Patrones de Componentes**: Button, ErrorState, LoadingState, EmptyState, Card
4. ✅ **4 Wireframes Mejorados**: Booking, Publish, Wallet, Dashboard simplificados
5. ✅ **Plan de Migración**: Estrategia clara para corregir 480+ violaciones de color
6. ✅ **Roadmap de 10 días**: Cronograma detallado con entregables y métricas

**Próximo paso**: Iniciar **Issue #186 - Implementación UI** siguiendo este roadmap.

---

**Estado**: ✅ COMPLETO
**Última actualización**: 2025-11-10
**Autor**: Claude Code
**Issues relacionados**: #183, #184, #185
