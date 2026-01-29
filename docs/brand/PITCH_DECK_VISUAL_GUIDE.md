# AutoRentar - Guía de Identidad Visual (Pitch Deck V14)

> Referencia de colores y estilos extraídos del pitch deck para inversores.
> **Generado:** 2026-01-13 21:34

---

## Paleta de Colores Principal

### Verde Principal (Brand)
El color principal de la marca, usado en logo, CTAs y estados activos.

| Token | Hex | Uso |
|-------|-----|-----|
| `primary.DEFAULT` | `#22C55E` | Logo, botones primarios, estados activos |
| `primary.light` | `#4ADE80` | Hover states, backgrounds suaves |
| `primary.dark` | `#16A34A` | Hover de CTAs, énfasis |
| `primary.pressed` | `#15803D` | Estado pressed/active |

### Acentos
Colores de alto impacto para destacar información crítica.

| Token | Hex | Uso |
|-------|-----|-----|
| `accent.lime` | `#D4ED31` | Labels de sección ("EL GANCHO"), métricas destacadas |
| `accent.cyan` | `#2DD4BF` | Bordes de cards destacados, credenciales |
| `accent.cyanDark` | `#14B8A6` | Hover de elementos cyan |

### Fondos (Modo Pitch Deck)
Sistema de fondos para presentaciones y modo oscuro.

| Token | Hex | Uso |
|-------|-----|-----|
| `bg.dark` | `#0F172A` | Fondo principal de slides |
| `bg.card` | `#1E293B` | Cards, contenedores |
| `bg.elevated` | `#334155` | Elementos elevados, hover |
| `bg.hover` | `#475569` | Estados hover en fondos oscuros |

### Texto
Jerarquía tipográfica para pitch deck.

| Token | Hex | Uso |
|-------|-----|-----|
| `text.primary` | `#FFFFFF` | Títulos, texto principal |
| `text.secondary` | `#94A3B8` | Descripciones, subtexto |
| `text.muted` | `#64748B` | Texto terciario, footnotes |

### Semánticos
Colores para estados y feedback.

| Token | Hex | Uso |
|-------|-----|-----|
| `success` | `#22C55E` | Estados exitosos, checkmarks |
| `error` | `#EF4444` | Errores, "FAILURE MODES" labels |
| `warning` | `#F59E0B` | Advertencias |
| `info` | `#3B82F6` | Información neutral |

---

## Tipografía

### Familia de Fuentes
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Estilos Clave

| Estilo | Propiedades | Ejemplo |
|--------|-------------|---------|
| **Título Principal** | Bold, -0.02em tracking | "El Problema: 3 Barreras Reales" |
| **Label de Sección** | Medium, 0.1em tracking, UPPERCASE, color lime | "EL GANCHO" |
| **Métrica Grande** | Bold, color primary | "USD 989M" |
| **Descripción** | Normal, color secondary | Texto explicativo |

---

## Componentes

### Card Estándar
```css
.ar-card {
  background: #1E293B;
  border-radius: 8px;
  padding: 24px;
}
```

### Card Destacado (con borde cyan)
```css
.ar-card-highlighted {
  background: #1E293B;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #2DD4BF;
}
```

### Metric Box
```css
.ar-metric-box {
  background: #1E293B;
  border-radius: 8px;
  padding: 16px 24px;
}
```

---

## Patrones Visuales

### Layout 2 Columnas (Problema/Solución)
- Columna izquierda: Problema en rojo (`#EF4444`)
- Columna derecha: Solución en verde (`#22C55E`)

### Lista Numerada
1. Número en color secundario
2. Título en blanco bold
3. Descripción en gris claro

### Timeline Vertical
- Barra lateral en `#334155`
- Fases activas en `#22C55E`
- Fases pendientes en `#64748B`

---

## Uso en Código

### CSS Variables
```css
.pitch-deck-mode {
  --ar-primary: #22C55E;
  --ar-accent-lime: #D4ED31;
  --ar-bg-dark: #0F172A;
}
```

### Tailwind
```html
<div class="bg-pitchDeck-bg-dark text-pitchDeck-text-primary">
  <span class="text-pitchDeck-accent-lime">EL GANCHO</span>
</div>
```

### TypeScript
```typescript
import { pitchDeckColors } from './pitch-deck-tokens';
const primaryColor = pitchDeckColors.primary.DEFAULT; // #22C55E
```

---

## Archivos Generados

| Archivo | Propósito |
|---------|-----------|
| `pitch-deck-tokens.css` | Variables CSS para modo pitch deck |
| `pitch-deck-tokens.ts` | Tokens TypeScript |
| `pitch-deck-colors.json` | Datos estructurados |
| `PITCH_DECK_VISUAL_GUIDE.md` | Esta guía |

---

**AutoRentar 2026** | Pitch Deck V14 Engineering
