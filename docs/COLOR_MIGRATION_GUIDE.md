# 🎨 Guía de Migración a Tokens de Color - AutoRenta

**Estado**: Los tokens están disponibles ✅, migración gradual en progreso

---

## 📊 Estado Actual

### ✅ Ya Disponible

Los nuevos tokens semánticos están **disponibles AHORA** en:

1. **Tailwind CSS**: Puedes usar clases como `bg-surface-base`, `text-text-primary`, `bg-cta-default`
2. **Variables CSS**: `var(--surface-base)`, `var(--text-primary)`, `var(--cta-default)`
3. **TypeScript**: `getThemeColor('surfaceBase', 'light')`

### 🔄 En Progreso

Los componentes existentes aún usan clases legacy. La migración es **gradual** para no romper nada.

---

## 🚀 Cómo Empezar a Usar los Nuevos Tokens

### Opción 1: En Templates HTML (Tailwind)

**ANTES (Legacy):**
```html
<div class="bg-ivory-soft text-smoke-black border-pearl-gray">
  <button class="bg-accent-petrol text-white">Reservar</button>
</div>
```

**DESPUÉS (Nuevos Tokens):**
```html
<div class="bg-surface-base text-text-primary border-border-default">
  <button class="bg-cta-default text-cta-text">Reservar</button>
</div>
```

### Opción 2: En Archivos CSS

**ANTES:**
```css
.card {
  background: #F8F6F3;
  color: #1A1A1A;
  border: 1px solid #D9D6D0;
}
```

**DESPUÉS:**
```css
.card {
  background: var(--surface-base);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
```

### Opción 3: En TypeScript

```typescript
import { getThemeColor } from '@/config/theme/colors';

const bgColor = getThemeColor('surfaceBase', isDark ? 'dark' : 'light');
const textColor = getThemeColor('textPrimary', isDark ? 'dark' : 'light');
```

---

## 📋 Tabla de Migración

### Fondos

| Legacy | Nuevo Token | Clase Tailwind |
|--------|-------------|----------------|
| `bg-ivory-soft` | `surfaceBase` | `bg-surface-base` |
| `bg-white-pure` | `surfaceRaised` | `bg-surface-raised` |
| `bg-sand-light` | `surfaceSecondary` | `bg-surface-secondary` |

### Textos

| Legacy | Nuevo Token | Clase Tailwind |
|--------|-------------|----------------|
| `text-smoke-black` | `textPrimary` | `text-text-primary` |
| `text-charcoal-medium` | `textSecondary` | `text-text-secondary` |
| `text-ash-gray` | `textMuted` | `text-text-muted` |

### Bordes

| Legacy | Nuevo Token | Clase Tailwind |
|--------|-------------|----------------|
| `border-pearl-gray` | `borderDefault` | `border-border-default` |
| - | `borderMuted` | `border-border-muted` |
| - | `borderFocus` | `border-border-focus` |

### CTAs y Botones

| Legacy | Nuevo Token | Clase Tailwind |
|--------|-------------|----------------|
| `bg-accent-petrol` | `ctaDefault` | `bg-cta-default` |
| - | `ctaHover` | `bg-cta-hover` |
| - | `ctaText` | `text-cta-text` |

---

## 🎯 Plan de Migración Recomendado

### Fase 1: Componentes Nuevos (Inmediato)

**✅ Usa los nuevos tokens en todos los componentes nuevos:**

```html
<!-- Nuevo componente -->
<div class="bg-surface-base text-text-primary p-6 rounded-lg border border-border-default">
  <h2 class="text-text-primary font-semibold">Título</h2>
  <p class="text-text-secondary">Descripción</p>
  <button class="bg-cta-default text-cta-text hover:bg-cta-hover px-4 py-2 rounded">
    Acción
  </button>
</div>
```

### Fase 2: Componentes Críticos (Esta Semana)

Migrar componentes principales uno por uno:

1. **Layout Principal** (`app.component.html`)
2. **Botones** (componentes de botones)
3. **Cards** (tarjetas de autos, bookings, etc.)
4. **Inputs** (formularios)

### Fase 3: Componentes Secundarios (Próximas Semanas)

Migrar el resto gradualmente.

---

## 📝 Ejemplo Práctico: Migrar un Componente

### ANTES: `car-card.component.html`

```html
<div class="bg-white-pure rounded-xl shadow-card border border-pearl-gray">
  <h3 class="text-smoke-black font-semibold">{{ car.brand }}</h3>
  <p class="text-charcoal-medium">{{ car.model }}</p>
  <button class="bg-accent-petrol text-white hover:bg-accent-petrol/90">
    Ver detalles
  </button>
</div>
```

### DESPUÉS: `car-card.component.html`

```html
<div class="bg-surface-raised rounded-xl shadow-card border border-border-default">
  <h3 class="text-text-primary font-semibold">{{ car.brand }}</h3>
  <p class="text-text-secondary">{{ car.model }}</p>
  <button class="bg-cta-default text-cta-text hover:bg-cta-hover">
    Ver detalles
  </button>
</div>
```

---

## ⚠️ Compatibilidad Durante la Migración

**IMPORTANTE**: Los colores legacy siguen funcionando durante la migración:

- ✅ `bg-ivory-soft` sigue funcionando (mapeado a `surfaceBase`)
- ✅ `text-smoke-black` sigue funcionando (mapeado a `textPrimary`)
- ✅ `accent-petrol` sigue funcionando (pero usa `cta-default` en su lugar)

**Puedes migrar gradualmente sin romper nada.**

---

## 🔍 Cómo Encontrar Componentes para Migrar

```bash
# Buscar componentes que usan clases legacy
grep -r "bg-ivory-soft\|text-smoke-black\|accent-petrol" apps/web/src/app --include="*.html"

# Buscar colores hardcodeados
grep -r "#[0-9A-Fa-f]\{6\}" apps/web/src/app --include="*.html" --include="*.css"
```

---

## ✅ Checklist de Migración

Para cada componente que migres:

- [ ] Reemplazar clases legacy por tokens semánticos
- [ ] Verificar que funciona en light mode
- [ ] Verificar que funciona en dark mode
- [ ] Probar estados hover/focus
- [ ] Verificar contraste de accesibilidad
- [ ] Actualizar tests si existen

---

## 🎨 Recursos

- **Documentación completa**: `docs/brand-colors.md`
- **Tokens TypeScript**: `apps/web/src/config/theme/colors.ts`
- **Validación**: `npm run validate:colors`

---

**Última actualización**: 2025-01-XX  
**Próximo paso**: Migrar `app.component.html` como ejemplo piloto






