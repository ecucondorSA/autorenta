# ⚡ AUTORENTA: DESIGN SYSTEM & MASTERPLAN (V2.1)

> **Documento de Especificación Técnica de UI/UX**
> **Estilo:** Secure Energy (Tech + Human Connection)
> **Plataforma:** Angular + Ionic (Web & Mobile)
> **Versión:** 2.1 - "Community & Trust"

---

## 1. 🧬 FILOSOFÍA DE DISEÑO: "SECURE ENERGY"

AutoRenta equilibra la velocidad de una startup tecnológica con la calidez de una comunidad segura.

*   **Core Values:** Confianza, Comunidad, Seguridad Familiar, Tecnología Transparente.
*   **Visual Key:** Estructura Limpia (Confianza) + Acentos Neón (Energía).
*   **Equilibrio:** "Se ve moderno, se siente seguro".
*   **Factor Humano:** La tecnología es el "esqueleto", pero las fotos de personas reales y familias son el "alma".

---

## 2. 🎨 SISTEMA DE COLOR (PALETA "TRUST & VOLTAGE")

El color tiene una doble función: El **Blanco** vende seguridad/limpieza, el **Neón** vende oportunidad/acción.

### 2.1 Colores Primarios (Action & Brand)

| Token | Valor Hex | Variable CSS | Uso Estricto |
|:---|:---|:---|:---|
| `Primary Neon` | `#39FF14` | `--ion-color-primary` | **Acciones de Crecimiento**, Badges de "Verificado", Indicadores de Ganancia. |
| `Primary Shade` | `#2ecc11` | `--ion-color-primary-shade` | Estado Hover/Active del Neón. |
| `Safety Blue` | `#0066FF` | `--color-safety` | **Elementos de Seguro**, Escudos de Protección, Enlaces de soporte. |
| `Accent Voltage` | `#FAFF00` | `--ion-color-accent` | Destacados de Marketing, Alertas importantes. |

### 2.2 Colores Neutros (Structure & Peace)

| Token | Valor Hex | Variable CSS | Uso Estricto |
|:---|:---|:---|:---|
| `Pure Black` | `#000000` | `--color-black` | Textos de alto contraste. |
| `Soft Dark` | `#1A1A1A` | `--color-soft-dark` | Elementos de UI secundarios (menos agresivo que el negro puro). |
| `Warm Gray` | `#F9FAFB` | `--color-gray-50` | Fondos de secciones de testimonios o comunidad. |
| `Pure White` | `#FFFFFF` | `--color-white` | **DOMINANTE.** Fondo principal para transmitir limpieza y transparencia. |

### 2.3 Semántica de Estado (Feedback)

*   **Error:** `#FF2A2A` (Rojo Digital).
*   **Verified/Safe:** `#39FF14` (Verde Neón) o `#00A86B` (Verde Jade para textos legales).
*   **Family Friendly:** Uso de bordes redondeados en fotos de perfil vs bordes duros en botones.

---

## 3. ✒️ TIPOGRAFÍA Y TONO (CLARITY FIRST)

Fuente Principal: **`Satoshi`** o **`Inter`** (Legibilidad máxima).
Fuente Monospaced: **`JetBrains Mono`** (Solo para datos financieros/técnicos).

### 3.1 Escala Tipográfica

Igual a v2.0, pero aumentando el `line-height` en párrafos largos (testimonios, descripciones de seguros) para dar "aire" y tranquilidad visual.

---

## 4. 🧱 LIBRERÍA DE COMPONENTES (HYBRID UI)

Mezcla de "Tech Brutalism" (para controles) con "Soft Human" (para contenido).

### 4.1 Botones (Action)
*   Se mantienen los botones rectangulares "Tech" para acciones transaccionales (Pagar, Reservar).
*   Se introducen botones "Ghost" con bordes más suaves para acciones sociales (Ver perfil, Contactar host).

### 4.2 Cards de Vehículos (The "Safe" Card)
*   **Layout:** Foto 16:9.
*   **Info:** Precio destacado, pero *siempre* acompañado de la valoración del Host (Estrellas) y el badge de "Seguro Incluido".
*   **Trust Signal:** Si el auto tiene sillas de bebé o isofix, se destaca con un icono prioritario.

### 4.3 Elementos de Confianza (Trust UI)
*   **Avatar Rings:** Los avatares de usuarios verificados tienen un anillo Verde Neón constante.
*   **Shield Icon:** Presente en todo el flujo de checkout. No agresivo, sino protector.

---

## 5. ⚡ UX WRITING (COMUNIDAD Y SEGURIDAD)

| Contexto UI | Texto "Agresivo" (v2.0) | Texto "Comunidad/Seguro" (v2.1) | Objetivo |
|:---|:---|:---|:---|
| **Landing Hero** | "Tu auto puede pagarse solo" | **"Ganá dinero compartiendo con seguridad"** | Balance Beneficio + Confianza. |
| **Seguros** | "Estás cubierto hasta $50k" | **"Tu familia y tu auto, protegidos al 100%"** | Enfoque emocional. |
| **Registro** | "Empezar a ganar dinero" | **"Unite a la comunidad de Hosts"** | Pertenencia > Transacción. |
| **Perfil** | "Usuario #4023" | **"Vecino Verificado"** | Humanización. |

---

## 6. 📱 LAYOUT & RESPONSIVE RULES

### 6.1 Fotografía (Nueva Regla Crítica)
*   No usar fotos de autos en estudios oscuros o neón.
*   **Usar:** Autos en uso real, con luz natural, personas sonriendo, familias cargando equipaje.
*   La UI es "Tech", las fotos son "Humanas".

### 6.2 Navegación
*   Se mantiene la estructura v2.0.

---

### 6.2 Patrones Móviles Obligatorios
1.  **Bottom Sheets:** Para filtros, selectores de fecha y detalles técnicos. NO usar modales a pantalla completa para interacciones cortas.
2.  **Sticky Footer CTAs:** El botón principal ("Reservar", "Continuar") siempre debe estar visible flotando en la parte inferior con un `backdrop-blur` detrás.
3.  **Horizontal Scroll (Snap):** Para galerías de fotos de autos y listas de categorías ("SUVs", "Deportivos").

### 6.3 Grilla Brutalista (Spacing)
*   **Base Unit:** 4px.
*   **Margins Mobile:** 16px (estricto).
*   **Margins Desktop:** Max-width 1200px centrado.
*   **Gaps:**
    *   Componentes relacionados: 8px.
    *   Grupos de datos: 24px.
    *   Secciones: 64px.

---

## 7. 🛠️ COMPONENTES COMPLEJOS (ESPECIFICACIONES)

### 7.1 Calendario de Precios (Host Dashboard)
*   **Visualización:** Grid mensual.
*   **Celdas:**
    *   Día base: Blanco.
    *   Día alquilado: Trama diagonal Gris/Negro.
    *   Día seleccionado: Borde Neón grueso.
*   **Data:** Precio en el centro de la celda. Demanda (Alta/Baja) indicada con un punto de color (Rojo/Verde) en la esquina.

### 7.2 Mapa de Búsqueda (Mapbox/Google)
*   **Pines:** No usar el pin rojo estándar.
    *   Usar "Price Pills": Pastillas negras con el precio en blanco (`$45`).
    *   Estado Hover/Active: La pastilla se vuelve Amarillo Vivo (`$45`) y crece 1.2x.

### 7.3 Verificación de Identidad (KYC UI)
*   Fondo: Blanco limpio (para transmitir seriedad).
*   Guías de cámara: Marco Verde Neón con esquinas gruesas (estilo visor de cámara HUD).
*   Feedback: Vibración háptica (Haptics) al capturar correctamente.

---

## 8. 🚀 TAILWIND CONFIGURATION (READY-TO-COPY)

Configuración técnica para implementar este sistema inmediatamente.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          neon: '#39FF14',    // Primary Action
          yellow: '#FAFF00',  // Attention / Hazard
          black: '#000000',   // Deep Contrast
          dark: '#111111',    // Surfaces Dark
        },
        state: {
          error: '#FF2A2A',
          success: '#39FF14',
          warning: '#FAFF00',
        }
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px #000000',     // La sombra brutalista
        'hard-sm': '2px 2px 0px 0px #000000',  // Para elementos pequeños
        'neon-glow': '0 0 15px rgba(57, 255, 20, 0.4)', // Para estados activos
      },
      borderRadius: {
        'tech': '4px', // Radio "Sharp" por defecto
      },
      borderWidth: {
        '3': '3px', // Para bordes de foco muy visibles
      }
    }
  }
}
```

---

## 9. 📈 CONVERSION UI ELEMENTS (CRO)

Elementos diseñados específicamente para aumentar métricas (basado en análisis Turo).

1.  **The "Urgency" Badge:**
    *   UI: Etiqueta amarilla con icono de fuego 🔥.
    *   Texto: "3 personas viendo este auto".
    *   Ubicación: Sticky footer o encima del precio.

2.  **The "Trust" Shield:**
    *   UI: Icono de escudo con check verde neón.
    *   Texto: "Garantía AutoRenta".
    *   Ubicación: Justo debajo del botón de pago (Microcopy).

3.  **The "Profit" Simulator:**
    *   UI: Slider interactivo en la landing de hosts.
    *   Feedback: Al mover el slider, el número de ganancia ($) crece y cambia de tamaño/color dinámicamente.

---

**FIN DEL MASTERPLAN v2.0**
Este documento debe residir en la raíz del proyecto y ser la fuente de verdad para cualquier decisión de Frontend.
