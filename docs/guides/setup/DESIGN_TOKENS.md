# 🎨 Guía de Tokens de Diseño - AutoRenta

Esta guía documenta todos los colores, espaciados y estilos disponibles en AutoRenta para mantener la consistencia visual en toda la plataforma.

**Última actualización**: 2025-11-06

---

## 📋 Tabla de Contenidos

1. [Sistema de Colores](#sistema-de-colores)
2. [Colores Personalizados (Custom)](#colores-personalizados-custom)
3. [Colores Semánticos](#colores-semánticos)
4. [Colores de Compatibilidad](#colores-de-compatibilidad)
5. [WhatsApp Brand Colors](#whatsapp-brand-colors)
6. [Diseño Responsive](#diseño-responsive)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Migración de Código Legacy](#migración-de-código-legacy)

---

## Sistema de Colores

AutoRenta utiliza un sistema de diseño **Premium Neutra** con colores definidos en `tailwind.config.js`. Todos los componentes deben usar estos colores en lugar de valores hexadecimales hardcodeados.

### ✅ Correcto vs ❌ Incorrecto

```html
<!-- ✅ CORRECTO: Usar colores del config -->
<div class="bg-ivory-soft text-smoke-black border-pearl-gray">
  <h1 class="text-accent-petrol">Título</h1>
  <p class="text-ash-gray">Descripción</p>
</div>

<!-- ❌ INCORRECTO: Colores hardcodeados -->
<div class="bg-[#F8F6F3] text-[#1A1A1A] border-[#D9D6D0]">
  <h1 class="text-[#2C4A52]">Título</h1>
  <p style="color: #8E8E8E">Descripción</p>
</div>
```

---

## Colores Personalizados (Custom)

### 🌅 Light Mode

| Nombre Clase | Hex | Uso Principal |
|--------------|-----|---------------|
| `ivory-soft` | `#F8F6F3` | Fondos principales, páginas |
| `sand-light` | `#EDEAE3` | Fondos secundarios, cards |
| `white-pure` | `#FFFFFF` | Cards, modales, overlays |
| `pearl-gray` | `#D9D6D0` | Bordes, divisores |

**Ejemplo de uso**:
```html
<div class="bg-ivory-soft min-h-screen">
  <div class="bg-white-pure rounded-lg border border-pearl-gray p-6">
    <h2 class="text-smoke-black">Card Title</h2>
  </div>
</div>
```

### 🌃 Dark Mode

| Nombre Clase | Hex | Uso Principal |
|--------------|-----|---------------|
| `graphite-dark` | `#121212` | Fondo principal dark |
| `anthracite` | `#1E1E1E` | Fondo secundario dark |
| `slate-deep` | `#2A2A2A` | Cards en dark mode |
| `ivory-luminous` | `#FAF9F6` | Texto principal dark |
| `pearl-light` | `#E5E3DD` | Texto secundario dark |

**Ejemplo de uso**:
```html
<div class="bg-ivory-soft dark:bg-graphite-dark min-h-screen">
  <div class="bg-white dark:bg-slate-deep rounded-lg p-6">
    <h2 class="text-smoke-black dark:text-ivory-luminous">Título</h2>
    <p class="text-ash-gray dark:text-pearl-light">Descripción</p>
  </div>
</div>
```

### ✍️ Colores de Texto

| Nombre Clase | Hex | Uso Principal | Peso Visual |
|--------------|-----|---------------|-------------|
| `smoke-black` | `#1A1A1A` | Títulos, texto principal | Alto contraste |
| `charcoal-medium` | `#4B4B4B` | Subtítulos, texto importante | Medio contraste |
| `ash-gray` | `#8E8E8E` | Texto secundario, descripciones | Bajo contraste |

**Ejemplo de jerarquía tipográfica**:
```html
<article class="space-y-4">
  <h1 class="text-3xl font-bold text-smoke-black dark:text-ivory-luminous">
    Título Principal
  </h1>
  <h2 class="text-xl font-semibold text-charcoal-medium dark:text-pearl-light">
    Subtítulo
  </h2>
  <p class="text-base text-ash-gray dark:text-neutral-400">
    Texto secundario o descripción.
  </p>
</article>
```

### 🎯 Colores de Acento

| Nombre Clase | Hex | Uso Principal |
|--------------|-----|---------------|
| `accent-petrol` | `#2C4A52` | Botones primarios, links, highlights |
| `accent-warm` | `#8B7355` | Botones secundarios, badges |

**Ejemplo de uso**:
```html
<!-- Botón primario -->
<button class="bg-accent-petrol hover:bg-accent-petrol/90 text-white px-6 py-3 rounded-lg transition-colors">
  Reservar Ahora
</button>

<!-- Botón secundario -->
<button class="bg-accent-warm hover:bg-accent-warm/90 text-white px-6 py-3 rounded-lg transition-colors">
  Ver Detalles
</button>

<!-- Badge -->
<span class="bg-accent-warm/10 text-accent-warm px-3 py-1 rounded-full text-sm font-medium">
  Nuevo
</span>
```

### 🌫️ Sistema de Grises Neutral (Preferido)

**Preferir `neutral-{shade}` sobre `gray-{shade}` para nuevo código.**

| Clase | Hex | Uso |
|-------|-----|-----|
| `neutral-50` | `#FAFAF9` | Fondos muy claros |
| `neutral-100` | `#F5F5F4` | Fondos claros alternativos |
| `neutral-200` | `#E7E5E4` | Bordes suaves |
| `neutral-300` | `#D6D3D1` | Bordes medios |
| `neutral-400` | `#A8A29E` | Texto deshabilitado |
| `neutral-500` | `#78716C` | Texto secundario |
| `neutral-600` | `#57534E` | Texto principal |
| `neutral-700` | `#44403C` | Texto enfático |
| `neutral-800` | `#292524` | Fondos oscuros |
| `neutral-900` | `#1C1917` | Fondos muy oscuros |
| `neutral-950` | `#0C0A09` | Negro profundo |

**Ejemplo de uso**:
```html
<div class="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
  <p class="text-neutral-700">Texto principal</p>
  <p class="text-neutral-500">Texto secundario</p>
  <p class="text-neutral-400">Texto deshabilitado</p>
</div>
```

---

## Colores Semánticos

### ✅ Success (Éxito)

| Clase | Hex | Uso |
|-------|-----|-----|
| `success-50` | `#d1fae5` | Fondos de mensajes exitosos |
| `success-100` | `#a7f3d0` | Fondos alternativos |
| `success-500` | `#10b981` | **Primario** - Botones, iconos |
| `success-600` | `#059669` | Hover states |
| `success-700` | `#047857` | Estados pressed |

**Ejemplo de uso**:
```html
<!-- Mensaje de éxito -->
<div class="bg-success-50 border border-success-500 text-success-700 rounded-lg p-4">
  <p class="font-medium">✅ Reserva confirmada exitosamente</p>
</div>

<!-- Botón de éxito -->
<button class="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg">
  Confirmar
</button>

<!-- Badge de estado -->
<span class="bg-success-500/10 text-success-700 px-3 py-1 rounded-full text-sm">
  Activo
</span>
```

### ⚠️ Warning (Advertencia)

| Clase | Hex | Uso |
|-------|-----|-----|
| `warning-50` | `#fef3c7` | Fondos de mensajes de advertencia |
| `warning-100` | `#fde68a` | Fondos alternativos |
| `warning-500` | `#f59e0b` | **Primario** - Botones, iconos |
| `warning-600` | `#d97706` | Hover states |
| `warning-700` | `#b45309` | Estados pressed |

**Ejemplo de uso**:
```html
<!-- Mensaje de advertencia -->
<div class="bg-warning-50 border border-warning-500 text-warning-700 rounded-lg p-4">
  <p class="font-medium">⚠️ Tu sesión expirará en 5 minutos</p>
</div>

<!-- Badge de pendiente -->
<span class="bg-warning-500/10 text-warning-700 px-3 py-1 rounded-full text-sm">
  Pendiente
</span>
```

### 🚨 Error (Error)

| Clase | Hex | Uso |
|-------|-----|-----|
| `error-50` | `#fee2e2` | Fondos de mensajes de error |
| `error-100` | `#fecaca` | Fondos alternativos |
| `error-500` | `#ef4444` | **Primario** - Botones, iconos |
| `error-600` | `#dc2626` | Hover states |
| `error-700` | `#b91c1c` | Estados pressed |

**Ejemplo de uso**:
```html
<!-- Mensaje de error -->
<div class="bg-error-50 border border-error-500 text-error-700 rounded-lg p-4">
  <p class="font-medium">❌ Error al procesar el pago</p>
</div>

<!-- Input con error -->
<div class="space-y-1">
  <input
    type="email"
    class="border-error-500 focus:ring-error-500 rounded-lg px-4 py-2 w-full"
    placeholder="Email"
  />
  <p class="text-error-600 text-sm">Email inválido</p>
</div>

<!-- Badge de rechazado -->
<span class="bg-error-500/10 text-error-700 px-3 py-1 rounded-full text-sm">
  Rechazado
</span>
```

### ℹ️ Info (Información)

| Clase | Hex | Uso |
|-------|-----|-----|
| `info-50` | `#dbeafe` | Fondos de mensajes informativos |
| `info-100` | `#bfdbfe` | Fondos alternativos |
| `info-500` | `#3b82f6` | **Primario** - Botones, iconos |
| `info-600` | `#2563eb` | Hover states |
| `info-700` | `#1d4ed8` | Estados pressed |

**Ejemplo de uso**:
```html
<!-- Mensaje informativo -->
<div class="bg-info-50 border border-info-500 text-info-700 rounded-lg p-4">
  <p class="font-medium">ℹ️ Nueva función disponible</p>
</div>

<!-- Badge de información -->
<span class="bg-info-500/10 text-info-700 px-3 py-1 rounded-full text-sm">
  Beta
</span>
```

---

## Colores de Compatibilidad

Estos colores están disponibles para mantener compatibilidad con código existente. **Preferir colores custom o neutral para nuevo código.**

### Gray (Compatibilidad)

| Clase | Hex | Migrar a |
|-------|-----|----------|
| `gray-50` | `#f9fafb` | `neutral-50` o `ivory-soft` |
| `gray-100` | `#f3f4f6` | `neutral-100` o `sand-light` |
| `gray-200` | `#e5e7eb` | `neutral-200` o `pearl-gray` |
| `gray-300` | `#d1d5db` | `neutral-300` |
| `gray-400` | `#9ca3af` | `neutral-400` o `ash-gray` |
| `gray-500` | `#6b7280` | `neutral-500` |
| `gray-600` | `#4b5563` | `neutral-600` o `charcoal-medium` |
| `gray-700` | `#374151` | `neutral-700` |
| `gray-800` | `#1f2937` | `neutral-800` o `anthracite` |
| `gray-900` | `#111827` | `neutral-900` o `graphite-dark` |

### Blue, Green, Red (Compatibilidad)

Disponibles escalas completas (50-950) para `blue`, `green`, `red`, `yellow`, `indigo`, `purple`, `pink`.

**⚠️ TODO**: Migrar gradualmente a colores semánticos:
- `green-*` → `success-*`
- `red-*` → `error-*`
- `yellow-*` → `warning-*`
- `blue-*` → `info-*`

---

## WhatsApp Brand Colors

Colores específicos para componentes relacionados con WhatsApp (`booking-chat`, `whatsapp-fab`).

| Clase | Hex | Uso |
|-------|-----|-----|
| `whatsapp-teal` | `#075E54` | Header, botones primarios |
| `whatsapp-teal-light` | `#128C7E` | Hover states, notificaciones |
| `whatsapp-teal-darker` | `#005C4B` | Mensajes enviados (dark mode) |
| `whatsapp-green` | `#25D366` | FAB, iconos |
| `whatsapp-green-modern` | `#00A884` | Botones (dark mode) |
| `whatsapp-green-modern-dark` | `#008069` | Hover (dark mode) |
| `whatsapp-green-light` | `#DCF8C6` | Fondo mensajes enviados |
| `whatsapp-green-sent` | `#D9FDD3` | Burbujas de mensajes enviados |
| `whatsapp-bg` | `#ECE5DD` | Fondo de chat (light) |
| `whatsapp-bg-light` | `#F0F2F5` | Input background (light) |
| `whatsapp-bg-dark` | `#0B141A` | Fondo de chat (dark) |
| `whatsapp-bg-header-dark` | `#1F2C33` | Header (dark) |
| `whatsapp-bg-message-dark` | `#202C33` | Mensajes recibidos (dark) |
| `whatsapp-bg-input-dark` | `#2A3942` | Input background (dark) |

**Ejemplo de uso**:
```html
<!-- WhatsApp FAB -->
<button class="bg-whatsapp-green hover:bg-whatsapp-green-modern-dark text-white rounded-full p-4">
  <svg><!-- WhatsApp icon --></svg>
</button>

<!-- Chat header -->
<div class="bg-whatsapp-teal dark:bg-whatsapp-bg-header-dark text-white px-4 py-3">
  <h3>Chat con el propietario</h3>
</div>

<!-- Mensaje enviado -->
<div class="bg-whatsapp-green-sent dark:bg-whatsapp-teal-darker rounded-lg px-3 py-2">
  <p class="text-sm">Hola, estoy interesado en el auto</p>
</div>
```

---

## Diseño Responsive

AutoRenta usa **Tailwind CSS breakpoints** para diseño responsive. Todos los componentes nuevos deben ser responsive.

### 📱 Breakpoints

| Prefix | Min Width | Dispositivo |
|--------|-----------|-------------|
| `sm:` | 640px | Móvil landscape |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop grande |
| `2xl:` | 1536px | Desktop extra grande |

### ✅ Ejemplos de Diseño Responsive

```html
<!-- Grid responsive: 1 col móvil, 2 cols tablet, 3 cols desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="bg-white rounded-lg p-4">Card 1</div>
  <div class="bg-white rounded-lg p-4">Card 2</div>
  <div class="bg-white rounded-lg p-4">Card 3</div>
</div>

<!-- Padding responsive: menor en móvil, mayor en desktop -->
<div class="px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
  <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">Título</h1>
</div>

<!-- Ocultar en móvil, mostrar en desktop -->
<nav class="hidden lg:flex gap-6">
  <a href="/cars">Autos</a>
  <a href="/bookings">Reservas</a>
</nav>

<!-- Mostrar solo en móvil -->
<button class="lg:hidden">
  <svg><!-- Hamburger menu --></svg>
</button>

<!-- Stack vertical en móvil, horizontal en desktop -->
<div class="flex flex-col lg:flex-row gap-4 lg:gap-6">
  <div class="flex-1">Contenido 1</div>
  <div class="flex-1">Contenido 2</div>
</div>

<!-- Texto centrado en móvil, alineado a la izquierda en desktop -->
<p class="text-center lg:text-left">
  Descripción del producto
</p>
```

### 🎯 Patrones Responsive Comunes

#### Container con max-width responsive
```html
<div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
  <!-- Contenido -->
</div>
```

#### Cards responsivas con gap dinámico
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
  <!-- Cards -->
</div>
```

#### Sidebar responsive (oculto en móvil)
```html
<div class="flex flex-col lg:flex-row gap-6">
  <!-- Sidebar -->
  <aside class="hidden lg:block w-64 flex-shrink-0">
    <!-- Navegación lateral -->
  </aside>

  <!-- Contenido principal -->
  <main class="flex-1">
    <!-- Contenido -->
  </main>
</div>
```

#### Tipografía responsive
```html
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Título Principal
</h1>

<p class="text-sm sm:text-base lg:text-lg">
  Párrafo con tamaño responsive
</p>
```

---

## Mejores Prácticas

### ✅ DO (Hacer)

1. **Usar colores del config de Tailwind**
   ```html
   <div class="bg-ivory-soft text-smoke-black">Contenido</div>
   ```

2. **Usar colores semánticos para estados**
   ```html
   <div class="bg-success-50 text-success-700">✅ Éxito</div>
   <div class="bg-error-50 text-error-700">❌ Error</div>
   ```

3. **Implementar dark mode desde el inicio**
   ```html
   <div class="bg-white dark:bg-slate-deep">
     <p class="text-smoke-black dark:text-ivory-luminous">Texto</p>
   </div>
   ```

4. **Usar responsive design con breakpoints**
   ```html
   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
     <!-- Grid responsive -->
   </div>
   ```

5. **Preferir `neutral-*` sobre `gray-*` para nuevo código**
   ```html
   <div class="text-neutral-600 dark:text-neutral-400">Texto</div>
   ```

6. **Usar opacidades de Tailwind para variantes**
   ```html
   <div class="bg-accent-petrol/10">Fondo con 10% opacidad</div>
   <button class="bg-accent-petrol hover:bg-accent-petrol/90">Botón</button>
   ```

### ❌ DON'T (Evitar)

1. **Colores hardcodeados en hex**
   ```html
   <!-- ❌ Evitar -->
   <div class="bg-[#F8F6F3] text-[#1A1A1A]">Contenido</div>
   ```

2. **Estilos inline con colores**
   ```html
   <!-- ❌ Evitar -->
   <div style="background-color: #F8F6F3; color: #1A1A1A">Contenido</div>
   ```

3. **CSS custom con colores que ya existen en el config**
   ```css
   /* ❌ Evitar */
   .my-component {
     background-color: #F8F6F3;
     color: #1A1A1A;
   }
   ```

4. **Usar `gray-*` en lugar de `neutral-*` en nuevo código**
   ```html
   <!-- ❌ Evitar en nuevo código -->
   <div class="text-gray-600">Texto</div>

   <!-- ✅ Preferir -->
   <div class="text-neutral-600">Texto</div>
   ```

5. **Olvidar dark mode**
   ```html
   <!-- ❌ Evitar -->
   <div class="bg-white text-black">Contenido</div>

   <!-- ✅ Incluir dark mode -->
   <div class="bg-white dark:bg-slate-deep text-smoke-black dark:text-ivory-luminous">Contenido</div>
   ```

6. **No usar breakpoints responsive**
   ```html
   <!-- ❌ Evitar -->
   <div class="grid grid-cols-3 gap-4">Cards</div>

   <!-- ✅ Responsive -->
   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">Cards</div>
   ```

---

## Migración de Código Legacy

### 📊 Estado Actual (2025-11-06)

- **403 instancias** de colores Tailwind estándar que deben migrarse
- **54 archivos** sin diseño responsive
- **76 archivos CSS/SCSS** con estilos custom

### 🔄 Plan de Migración

#### Fase 1: Colores (Prioridad Alta)
```bash
# Buscar colores hardcodeados
grep -r "bg-\[#" apps/web/src/
grep -r "text-\[#" apps/web/src/

# Reemplazar con colores del config
# Ejemplo:
# bg-[#F8F6F3] → bg-ivory-soft
# text-[#1A1A1A] → text-smoke-black
```

#### Fase 2: Responsive Design (Prioridad Alta)
```bash
# Buscar componentes sin breakpoints
grep -rL "sm:\|md:\|lg:\|xl:" apps/web/src/app/features/
grep -rL "sm:\|md:\|lg:\|xl:" apps/web/src/app/shared/components/

# Agregar breakpoints según diseño
# Ejemplo:
# grid-cols-3 → grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

#### Fase 3: CSS Custom → Tailwind (Prioridad Media)
```bash
# Identificar CSS custom que puede migrar a Tailwind
find apps/web/src -name "*.css" -o -name "*.scss"

# Refactorizar BEM a Tailwind utilities
# Ejemplo:
# .nav-item { color: #9ca3af } → class="text-gray-400"
```

### 🎯 Archivos Críticos para Migrar

1. **mobile-bottom-nav.component** (312 líneas CSS custom)
   - Colores hardcodeados: `#9ca3af`, `#7aa2aa`, `#f7f5ee`
   - Sin breakpoints Tailwind, usa media queries custom

2. **personalized-dashboard.component** (598 líneas CSS custom)
   - Grid custom en lugar de Tailwind grid
   - Colores hardcodeados en gradientes

3. **Otros 50+ componentes** sin responsive design

### 📝 Checklist de Migración por Componente

```markdown
## Checklist para [Componente Name]

- [ ] ✅ Reemplazar colores hardcodeados con colores del config
- [ ] ✅ Migrar CSS custom a Tailwind utilities
- [ ] ✅ Agregar breakpoints responsive (sm:, md:, lg:, xl:)
- [ ] ✅ Implementar dark mode (dark:)
- [ ] ✅ Verificar accesibilidad (contrast ratios)
- [ ] ✅ Probar en móvil, tablet, desktop
- [ ] ✅ Documentar cambios en commit message
```

---

## 🔗 Referencias

- **Tailwind Config**: `apps/web/tailwind.config.js`
- **Documentación Tailwind CSS**: https://tailwindcss.com/docs
- **Sistema de Diseño AutoRenta**: `CLAUDE.md`
- **Auditoría de Colores**: Ver análisis en task description

---

## 📞 Soporte

Para preguntas sobre el sistema de diseño:
1. Consultar esta guía primero
2. Revisar `tailwind.config.js` para colores disponibles
3. Ver ejemplos en componentes ya migrados:
   - `booking-chat.component.html` (✅ WhatsApp colors)
   - `whatsapp-fab.component.html` (✅ Brand colors)

---

**Última actualización**: 2025-11-06
**Versión**: 1.0
**Mantenedor**: Equipo AutoRenta
