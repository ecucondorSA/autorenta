#!/usr/bin/env python3
"""
AutoRentar Pitch Deck Visual Identity Generator

Genera archivos de tokens de diseño basados en el análisis del pitch deck V14.
Mantiene consistencia visual entre el producto y materiales de inversores.

Uso: python scripts/generate_pitchdeck_tokens.py
"""

import json
import os
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# PALETA DE COLORES EXTRAÍDA DEL PITCH DECK V14 ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════════

PITCH_DECK_COLORS = {
    "primary": {
        "name": "Verde AutoRentar",
        "description": "Color principal de marca para CTAs, logo y estados activos",
        "colors": {
            "DEFAULT": "#22C55E",  # Verde brillante del logo
            "light": "#4ADE80",
            "dark": "#16A34A",
            "hover": "#16A34A",
            "pressed": "#15803D",
        }
    },
    "accent": {
        "name": "Verde Lima/Acento",
        "description": "Usado para subtítulos de sección, labels destacados, métricas importantes",
        "colors": {
            "lime": "#D4ED31",      # Verde lima para 'EL GANCHO', métricas
            "lime_alt": "#CDFF00",  # Variante más brillante
            "cyan": "#2DD4BF",      # Turquesa para bordes destacados
            "cyan_dark": "#14B8A6",
        }
    },
    "backgrounds": {
        "name": "Fondos Oscuros",
        "description": "Sistema de fondos para modo pitch deck (dark)",
        "colors": {
            "dark_primary": "#0F172A",   # Fondo principal oscuro (Slate 900)
            "dark_card": "#1E293B",      # Cards y contenedores (Slate 800)
            "dark_elevated": "#334155",  # Elementos elevados (Slate 700)
            "dark_hover": "#475569",     # Estado hover
        }
    },
    "text": {
        "name": "Colores de Texto",
        "description": "Sistema tipográfico para pitch deck",
        "colors": {
            "primary": "#FFFFFF",        # Títulos principales
            "secondary": "#94A3B8",      # Descripciones (Slate 400)
            "muted": "#64748B",          # Texto terciario (Slate 500)
            "inverse": "#0F172A",        # Texto sobre fondos claros
        }
    },
    "semantic": {
        "name": "Colores Semánticos",
        "description": "Estados y feedback visual",
        "colors": {
            "success": "#22C55E",        # Verde éxito
            "error": "#EF4444",          # Rojo error
            "error_light": "#F87171",    # Rojo claro
            "warning": "#F59E0B",        # Amarillo warning
            "info": "#3B82F6",           # Azul info
        }
    },
    "failure_modes": {
        "name": "Modos de Falla (Slide Comparativo)",
        "description": "Colores usados en slides de comparación error/solución",
        "colors": {
            "failure_label": "#EF4444",  # Rojo para 'FAILURE MODES'
            "solution_label": "#22C55E", # Verde para 'REQUISITOS DE DISEÑO'
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# TIPOGRAFÍA DEL PITCH DECK
# ═══════════════════════════════════════════════════════════════════════════════

PITCH_DECK_TYPOGRAPHY = {
    "fonts": {
        "primary": ["Inter", "system-ui", "sans-serif"],
        "display": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
    },
    "weights": {
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700,
        "black": 900,
    },
    "styles": {
        "title": {
            "description": "Títulos de slide principales",
            "weight": "bold",
            "tracking": "-0.02em",
            "example": "El Problema: 3 Barreras Reales"
        },
        "subtitle_label": {
            "description": "Labels de sección en uppercase",
            "weight": "medium",
            "tracking": "0.1em",
            "transform": "uppercase",
            "color": "accent.lime",
            "example": "EL GANCHO, PRUEBA DE EJECUCION"
        },
        "metric_large": {
            "description": "Números grandes de métricas",
            "weight": "bold",
            "example": "USD 989M, 300+, < 150ms"
        },
        "body": {
            "description": "Texto de párrafos y descripciones",
            "weight": "normal",
            "color": "text.secondary"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENTES UI DEL PITCH DECK
# ═══════════════════════════════════════════════════════════════════════════════

PITCH_DECK_COMPONENTS = {
    "card": {
        "description": "Cards estándar del pitch deck",
        "styles": {
            "background": "#1E293B",
            "border_radius": "8px",
            "padding": "24px",
            "border": "none",
        }
    },
    "card_highlighted": {
        "description": "Cards con borde destacado (credenciales, CTAs)",
        "styles": {
            "background": "#1E293B",
            "border_radius": "8px",
            "padding": "24px",
            "border": "1px solid #2DD4BF",
        }
    },
    "metric_box": {
        "description": "Contenedores de métricas numéricas",
        "styles": {
            "background": "#1E293B",
            "border_radius": "8px",
            "padding": "16px 24px",
        }
    },
    "timeline_phase": {
        "description": "Fases del timeline vertical",
        "styles": {
            "active_color": "#22C55E",
            "pending_color": "#64748B",
            "bar_color": "#334155",
        }
    }
}


def generate_css_variables():
    """Genera variables CSS para el pitch deck mode."""
    css = """/* ═══════════════════════════════════════════════════════════════════════════════
   AUTORENTA PITCH DECK VISUAL TOKENS
   Generated: {timestamp}
   Source: AutoRentar-PitchDeck-STRATEGIC-V14-ENGINEERING.pdf
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Pitch Deck Mode - Dark Theme para presentaciones y materiales de inversores */
.pitch-deck-mode,
[data-theme="pitch-deck"] {{
  /* ─── Colores Primarios ─── */
  --ar-primary: #22C55E;
  --ar-primary-light: #4ADE80;
  --ar-primary-dark: #16A34A;
  --ar-primary-hover: #16A34A;

  /* ─── Acentos ─── */
  --ar-accent-lime: #D4ED31;
  --ar-accent-cyan: #2DD4BF;
  --ar-accent-cyan-dark: #14B8A6;

  /* ─── Fondos ─── */
  --ar-bg-dark: #0F172A;
  --ar-bg-card: #1E293B;
  --ar-bg-elevated: #334155;
  --ar-bg-hover: #475569;

  /* ─── Texto ─── */
  --ar-text-primary: #FFFFFF;
  --ar-text-secondary: #94A3B8;
  --ar-text-muted: #64748B;
  --ar-text-inverse: #0F172A;

  /* ─── Semánticos ─── */
  --ar-success: #22C55E;
  --ar-error: #EF4444;
  --ar-error-light: #F87171;
  --ar-warning: #F59E0B;
  --ar-info: #3B82F6;

  /* ─── Espaciado ─── */
  --ar-radius-sm: 6px;
  --ar-radius-md: 8px;
  --ar-radius-lg: 12px;
  --ar-radius-xl: 16px;

  /* ─── Shadows ─── */
  --ar-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --ar-shadow-elevated: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
}}

/* ─── Utility Classes para Pitch Deck ─── */
.ar-bg-primary {{ background-color: var(--ar-primary); }}
.ar-bg-primary-dark {{ background-color: var(--ar-primary-dark); }}
.ar-bg-dark {{ background-color: var(--ar-bg-dark); }}
.ar-bg-card {{ background-color: var(--ar-bg-card); }}
.ar-bg-elevated {{ background-color: var(--ar-bg-elevated); }}

.ar-text-primary {{ color: var(--ar-text-primary); }}
.ar-text-secondary {{ color: var(--ar-text-secondary); }}
.ar-text-muted {{ color: var(--ar-text-muted); }}
.ar-text-lime {{ color: var(--ar-accent-lime); }}
.ar-text-cyan {{ color: var(--ar-accent-cyan); }}

.ar-text-success {{ color: var(--ar-success); }}
.ar-text-error {{ color: var(--ar-error); }}
.ar-text-warning {{ color: var(--ar-warning); }}

.ar-border-cyan {{ border-color: var(--ar-accent-cyan); }}
.ar-border-primary {{ border-color: var(--ar-primary); }}

/* ─── Componentes Pitch Deck ─── */
.ar-card {{
  background-color: var(--ar-bg-card);
  border-radius: var(--ar-radius-md);
  padding: 24px;
}}

.ar-card-highlighted {{
  background-color: var(--ar-bg-card);
  border-radius: var(--ar-radius-md);
  padding: 24px;
  border: 1px solid var(--ar-accent-cyan);
}}

.ar-metric-box {{
  background-color: var(--ar-bg-card);
  border-radius: var(--ar-radius-md);
  padding: 16px 24px;
}}

.ar-label-section {{
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ar-accent-lime);
}}

.ar-metric-value {{
  font-size: 2rem;
  font-weight: 700;
  color: var(--ar-primary);
}}
"""
    return css.format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"))


def generate_tailwind_extension():
    """Genera extensión de Tailwind para pitch deck colors."""
    extension = {
        "pitchDeck": {
            "primary": {
                "DEFAULT": "#22C55E",
                "light": "#4ADE80",
                "dark": "#16A34A",
            },
            "accent": {
                "lime": "#D4ED31",
                "cyan": "#2DD4BF",
            },
            "bg": {
                "dark": "#0F172A",
                "card": "#1E293B",
                "elevated": "#334155",
            },
            "text": {
                "primary": "#FFFFFF",
                "secondary": "#94A3B8",
                "muted": "#64748B",
            }
        }
    }
    return extension


def generate_typescript_tokens():
    """Genera tokens TypeScript para uso en la aplicación."""
    ts_content = '''/**
 * AutoRentar Pitch Deck Visual Tokens
 *
 * Tokens de diseño extraídos del pitch deck V14 para mantener
 * consistencia visual entre producto y materiales de inversores.
 *
 * Generated: {timestamp}
 * Source: AutoRentar-PitchDeck-STRATEGIC-V14-ENGINEERING.pdf
 */

export const pitchDeckColors = {{
  // Colores Primarios
  primary: {{
    DEFAULT: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
    hover: '#16A34A',
    pressed: '#15803D',
  }},

  // Acentos
  accent: {{
    lime: '#D4ED31',
    limeAlt: '#CDFF00',
    cyan: '#2DD4BF',
    cyanDark: '#14B8A6',
  }},

  // Fondos (Dark Mode)
  background: {{
    dark: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
    hover: '#475569',
  }},

  // Texto
  text: {{
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#0F172A',
  }},

  // Semánticos
  semantic: {{
    success: '#22C55E',
    error: '#EF4444',
    errorLight: '#F87171',
    warning: '#F59E0B',
    info: '#3B82F6',
  }},
}} as const;

export type PitchDeckColor = keyof typeof pitchDeckColors;

/**
 * Helper para obtener un color del pitch deck
 */
export function getPitchDeckColor(
  category: keyof typeof pitchDeckColors,
  shade: string = 'DEFAULT'
): string {{
  const categoryColors = pitchDeckColors[category] as Record<string, string>;
  return categoryColors[shade] || categoryColors['DEFAULT'] || '#000000';
}}
'''
    return ts_content.format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"))


def generate_markdown_guide():
    """Genera guía de referencia visual en Markdown."""
    guide = '''# AutoRentar - Guía de Identidad Visual (Pitch Deck V14)

> Referencia de colores y estilos extraídos del pitch deck para inversores.
> **Generado:** {timestamp}

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
.ar-card {{
  background: #1E293B;
  border-radius: 8px;
  padding: 24px;
}}
```

### Card Destacado (con borde cyan)
```css
.ar-card-highlighted {{
  background: #1E293B;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #2DD4BF;
}}
```

### Metric Box
```css
.ar-metric-box {{
  background: #1E293B;
  border-radius: 8px;
  padding: 16px 24px;
}}
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
.pitch-deck-mode {{
  --ar-primary: #22C55E;
  --ar-accent-lime: #D4ED31;
  --ar-bg-dark: #0F172A;
}}
```

### Tailwind
```html
<div class="bg-pitchDeck-bg-dark text-pitchDeck-text-primary">
  <span class="text-pitchDeck-accent-lime">EL GANCHO</span>
</div>
```

### TypeScript
```typescript
import {{ pitchDeckColors }} from './pitch-deck-tokens';
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
'''
    return guide.format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"))


def main():
    """Genera todos los archivos de tokens del pitch deck."""

    # Directorio de salida
    output_dir = Path("/home/edu/autorenta/docs/brand")
    output_dir.mkdir(parents=True, exist_ok=True)

    # También generar en el directorio de config del tema
    theme_dir = Path("/home/edu/autorenta/apps/web/src/config/theme")

    print("=" * 60)
    print("  AutoRentar Pitch Deck Visual Identity Generator")
    print("=" * 60)
    print()

    # 1. Generar CSS Variables
    css_content = generate_css_variables()
    css_path = output_dir / "pitch-deck-tokens.css"
    css_path.write_text(css_content)
    print(f"[OK] CSS Variables: {css_path}")

    # 2. Generar TypeScript Tokens
    ts_content = generate_typescript_tokens()
    ts_path = theme_dir / "pitch-deck-tokens.ts"
    ts_path.write_text(ts_content)
    print(f"[OK] TypeScript Tokens: {ts_path}")

    # 3. Generar JSON con datos estructurados
    json_data = {
        "version": "1.0.0",
        "source": "AutoRentar-PitchDeck-STRATEGIC-V14-ENGINEERING.pdf",
        "generated": datetime.now().isoformat(),
        "colors": PITCH_DECK_COLORS,
        "typography": PITCH_DECK_TYPOGRAPHY,
        "components": PITCH_DECK_COMPONENTS,
        "tailwindExtension": generate_tailwind_extension(),
    }
    json_path = output_dir / "pitch-deck-colors.json"
    json_path.write_text(json.dumps(json_data, indent=2, ensure_ascii=False))
    print(f"[OK] JSON Data: {json_path}")

    # 4. Generar guía Markdown
    md_content = generate_markdown_guide()
    md_path = output_dir / "PITCH_DECK_VISUAL_GUIDE.md"
    md_path.write_text(md_content)
    print(f"[OK] Visual Guide: {md_path}")

    print()
    print("-" * 60)
    print("  Resumen de Colores Principales")
    print("-" * 60)
    print(f"  Verde Principal:  #22C55E")
    print(f"  Acento Lima:      #D4ED31")
    print(f"  Acento Cyan:      #2DD4BF")
    print(f"  Fondo Oscuro:     #0F172A")
    print(f"  Card Background:  #1E293B")
    print(f"  Texto Principal:  #FFFFFF")
    print(f"  Texto Secundario: #94A3B8")
    print("-" * 60)
    print()
    print("Archivos generados exitosamente.")
    print()


if __name__ == "__main__":
    main()
