# AutoRenta Brand Guidelines

> Sistema de identidad visual premium para AutoRenta
> Última actualización: 2025-12-03

---

## 1. Logo System

### 1.1 Variantes Disponibles

| Variante | Archivo | Uso |
|----------|---------|-----|
| **Full Logo** | `autorentar-logo-pro.svg` | Páginas principales, marketing |
| **Compact Logo** | `autorentar-logo-compact.svg` | Headers, espacios reducidos |
| **Icon Only** | `autorentar-icon-pro.svg` | Favicon, app icons, avatars |
| **White Version** | `autorentar-logo-white.svg` | Fondos oscuros |
| **Monochrome** | `autorentar-logo-mono.svg` | Fax, bordado, sellos |

### 1.2 Estructura del Logo

```
┌──────────────────────────────────────────────┐
│  ┌─────┐                                     │
│  │ 🔑  │  Auto Renta                        │
│  │ 🚗  │  ──────────────                     │
│  └─────┘  ALQUILER ENTRE PERSONAS           │
│  ICONMARK        WORDMARK                    │
└──────────────────────────────────────────────┘
```

**Elementos del Iconmark:**
- **Llave circular**: Representa compartir, acceso, confianza
- **Silueta de auto**: Perfil moderno de sedán
- **Ventana en gradiente**: Transparencia, tecnología
- **Ruedas con acento azul**: Detalle premium

### 1.3 Espaciado y Área de Protección

```
         ┌───────────────────────┐
    X    │                       │    X
   ┌─┐   │      LOGO AREA        │   ┌─┐
   │ │   │                       │   │ │
   └─┘   └───────────────────────┘   └─┘
    X              X                  X

X = Altura del iconmark
```

### 1.4 Tamaños Mínimos

| Formato | Mínimo |
|---------|--------|
| Digital (Full) | 120px width |
| Digital (Icon) | 24px |
| Print (Full) | 30mm width |
| Print (Icon) | 10mm |

---

## 2. Paleta de Colores

### 2.1 Colores Primarios

| Nombre | Hex | RGB | Uso |
|--------|-----|-----|-----|
| **Rich Black** | `#0A0A0A` | 10, 10, 10 | Texto principal, iconmark |
| **Electric Blue** | `#3B82F6` | 59, 130, 246 | Acento primario, CTAs |
| **Sky Blue** | `#60A5FA` | 96, 165, 250 | Gradientes, hover states |
| **Light Blue** | `#93C5FD` | 147, 197, 253 | Highlights, fondos suaves |

### 2.2 Colores Secundarios

| Nombre | Hex | Uso |
|--------|-----|-----|
| **Slate 600** | `#475569` | Texto secundario |
| **Slate 400** | `#94A3B8` | Texto muted |
| **Red 500** | `#EF4444` | Errores, luz trasera |
| **Green 500** | `#22C55E` | Éxito, disponible |
| **Amber 500** | `#F59E0B` | Warnings, pendiente |

### 2.3 Gradiente Principal

```css
background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
```

---

## 3. Tipografía

### 3.1 Fuentes

| Uso | Fuente | Fallback |
|-----|--------|----------|
| **Display** | Inter | SF Pro Display, -apple-system |
| **Body** | Inter | SF Pro Text, system-ui |
| **Monospace** | JetBrains Mono | Monaco, Consolas |

### 3.2 Escala Tipográfica

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### 3.3 Pesos

- **Regular (400)**: Cuerpo de texto
- **Medium (500)**: Labels, subtítulos
- **Semibold (600)**: Headings secundarios
- **Bold (700)**: Headings, wordmark

---

## 4. Uso Correcto vs Incorrecto

### ✅ Correcto

- Usar sobre fondos sólidos (blanco, negro, gris neutro)
- Mantener proporciones originales
- Respetar área de protección
- Usar variante apropiada según contexto

### ❌ Incorrecto

- Estirar o comprimir el logo
- Rotar el logo
- Cambiar colores del gradiente
- Agregar efectos (sombras, outlines)
- Usar sobre fondos con patrones complejos
- Separar iconmark del wordmark (excepto icon-only)

---

## 5. Aplicaciones

### 5.1 Header Web

```html
<svg class="h-10 w-auto" viewBox="0 0 180 48">
  <!-- Usar autorentar-logo-compact inline -->
</svg>
```

### 5.2 Favicon

```html
<link rel="icon" type="image/svg+xml" href="/autorentar-icon-pro.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
```

### 5.3 Open Graph / Social

```html
<meta property="og:image" content="/autorentar-og.png">
<!-- Usar PNG 1200x630 con logo centrado -->
```

### 5.4 App Icon

| Plataforma | Tamaño | Formato |
|------------|--------|---------|
| iOS | 1024x1024 | PNG (sin transparencia) |
| Android | 512x512 | PNG (con transparencia) |
| PWA | 192x192, 512x512 | PNG |

---

## 6. Archivos Disponibles

```
apps/web/src/assets/images/
├── autorentar-logo-pro.svg      # Full logo (320x80)
├── autorentar-logo-compact.svg  # Compact (180x48)
├── autorentar-logo-white.svg    # White version
├── autorentar-logo-mono.svg     # Monochrome
├── autorentar-icon-pro.svg      # Icon only (64x64)
├── autorentar-logo.svg          # Legacy (deprecated)
└── autorentar-logo.png          # PNG for social
```

---

## 7. Contacto

Para solicitar archivos adicionales o consultas sobre uso de marca:
- Repositorio: `autorenta/docs/BRAND_GUIDELINES.md`

---

*Diseño inspirado en las mejores prácticas de Airbnb, Uber, Tesla y líderes de la industria.*
