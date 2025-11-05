# Guía Optimizada de Cursor para AutoRenta

**Versión**: 1.0.0
**Fecha**: 2025-11-03
**Proyecto**: AutoRenta - Sistema Multi-Agente

---

## 🎯 Visión General

Después de analizar la documentación oficial de Cursor, esta guía te muestra cómo aprovechar **todas las capacidades avanzadas** de Cursor en tu workflow multi-agente con Claude Code.

### Capacidades Clave de Cursor 2.0

| Feature | Atajos | Casos de Uso en AutoRenta |
|---------|--------|---------------------------|
| **Agent Mode** | `Cmd+I` | Features completas, refactors multi-archivo |
| **Ask Mode** | `Cmd+L` | Preguntas rápidas, búsqueda de código |
| **Cmd+K Inline** | `Cmd+K` | Ediciones precisas en 1-2 líneas |
| **Autocomplete** | `Tab` | Código repetitivo, imports |
| **Multi-Agent (8x)** | `Cmd+T` | Comparar enfoques en paralelo |
| **Browser Integration** | En Agent | Testing UI, validación visual |
| **Terminal Sandbox** | En Agent | Comandos seguros automáticos |

---

## 🚀 Modos de Cursor Explicados

### 1️⃣ Agent Mode (Cmd+I) - El Más Poderoso

**¿Qué es?**: Agente autónomo que puede editar múltiples archivos, ejecutar comandos y usar navegador.

**Cuándo usar en AutoRenta**:
- ✅ Implementar features completas (3+ archivos)
- ✅ Refactors multi-archivo (ej: migrar a signals)
- ✅ Crear componentes + servicios + tests en una sola instrucción
- ✅ Testing de UI con browser integration
- ✅ Setup de configuraciones complejas

**Capacidades Especiales**:
```
┌──────────────────────────────────────────────────────┐
│  CURSOR AGENT MODE - Capacidades Únicas              │
├──────────────────────────────────────────────────────┤
│  🔧 Tools disponibles:                                │
│     • Semantic codebase search                       │
│     • Multi-file editing (diff view)                 │
│     • Terminal execution (sandboxed)                 │
│     • Browser interaction (UI testing)               │
│     • MCP integration                                │
│                                                       │
│  🧠 Reasoning:                                        │
│     • Hasta 25 tool calls antes de parar            │
│     • Planning automático con checkpoints            │
│     • Parallel agents (8x simultáneos)               │
│                                                       │
│  🔒 Safety:                                           │
│     • Review interface con diff coloreado           │
│     • Checkpoints para rollback                      │
│     • Sandboxed terminals                            │
└──────────────────────────────────────────────────────┘
```

**Ejemplo: Implementar Sistema de Reviews**

```typescript
// Presiona Cmd+I y escribe:

"Implementa un sistema de reviews para autos en AutoRenta:

1. Crea ReviewsService en apps/web/src/app/core/services/reviews.service.ts:
   - Usa signals para estado reactivo
   - Métodos: fetchReviews(carId), createReview(), canUserReview()
   - Integra con Supabase (tabla car_reviews)

2. Crea componente car-reviews-list en apps/web/src/app/shared/components/:
   - Standalone component con Tailwind
   - Muestra rating con estrellas SVG
   - Loading skeleton mientras carga
   - Usa ReviewsService

3. Integra en car-detail.page.ts:
   - Importa car-reviews-list
   - Botón 'Dejar review' (solo si canUserReview)
   - Modal para agregar review

4. Genera tests unitarios para ReviewsService

Sigue patterns de .cursorrules y CLAUDE.md"
```

**Cursor Agent hará**:
1. ✅ Crea 4 archivos nuevos
2. ✅ Modifica car-detail.page.ts
3. ✅ Genera tests con >80% coverage
4. ✅ Muestra diff view de todos los cambios
5. ✅ Espera tu "Accept" o ajustes

**Timeline**: 5-10 min (vs 60-90 min manual)

---

### 2️⃣ Ask Mode (Cmd+L) - Búsqueda y Consultas

**¿Qué es?**: Chat rápido para preguntas sobre tu codebase sin hacer ediciones.

**Cuándo usar en AutoRenta**:
- ✅ "¿Dónde se manejan los errores de MercadoPago?"
- ✅ "Explica cómo funciona el sistema de wallet"
- ✅ "¿Qué archivos usan BehaviorSubject?" (antes de refactor)
- ✅ "Muéstrame ejemplos de RLS policies"
- ✅ Debugging rápido de errores de compilación

**Uso de @-mentions para Contexto**:

```typescript
// Cmd+L → Abre Ask Mode

// Opción 1: Menciona archivos específicos
"@bookings.service.ts ¿Cómo funciona el método requestBooking()?"

// Opción 2: Menciona carpetas completas
"@app/core/services ¿Qué servicios usan signals?"

// Opción 3: Busca con @-search
"@payment ¿Dónde se procesan los pagos de MercadoPago?"
// Cursor busca todos los archivos relacionados con "payment"

// Opción 4: Drag & drop de archivos
// Arrastra profile.service.ts al chat
"Explica la lógica de uploadAvatar()"
```

**3 Maneras de Dar Contexto** (de más fácil a más control):

| Método | Cómo | Cuándo Usar |
|--------|------|-------------|
| **1. Highlight + Cmd+L** | Selecciona código → `Cmd+L` | Preguntas sobre snippet específico |
| **2. Drag & Drop** | Arrastra archivo al chat | Preguntas sobre archivo completo |
| **3. @-mention** | Escribe `@filename` | Control preciso de contexto |

**Ejemplo: Debugging de RLS Policy**

```typescript
// Selecciona el error en console:
// "new row violates row-level security policy"

// Cmd+L
"@setup-profiles.sql @profile.service.ts
¿Por qué falla el upload de avatar con RLS policy error?
El error dice: new row violates row-level security policy"

// Cursor analiza:
// - RLS policy en setup-profiles.sql
// - Código de uploadAvatar() en profile.service.ts
// - Identifica mismatch de path

// Response:
"El problema está en profile.service.ts:97
La policy espera path: user-id/file.jpg
Pero tu código usa: avatars/user-id/file.jpg
Remueve el prefix 'avatars/'"
```

---

### 3️⃣ Cmd+K Inline Editing - Ultra Rápido

**¿Qué es?**: Edición inline precisa en el código que estás viendo.

**Cuándo usar en AutoRenta**:
- ✅ Fix de typos o errores simples
- ✅ Renombrar variables/métodos en scope pequeño
- ✅ Agregar validación a una función
- ✅ Convertir código síncrono a async
- ✅ Agregar tipos TypeScript

**Ejemplo 1: Agregar Validación**

```typescript
// ANTES - Selecciona esta función:
async uploadAvatar(file: File): Promise<string> {
  const user = await this.supabase.auth.getUser();
  const filePath = `${user.id}/${file.name}`;
  await this.supabase.storage.from('avatars').upload(filePath, file);
}

// Cmd+K → Escribe:
"Agrega validación de tipo de archivo (solo imágenes) y tamaño máximo 2MB"

// DESPUÉS - Cursor genera:
async uploadAvatar(file: File): Promise<string> {
  // Validaciones
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 2MB');
  }

  const user = await this.supabase.auth.getUser();
  const filePath = `${user.id}/${file.name}`;
  await this.supabase.storage.from('avatars').upload(filePath, file);
}
```

**Ejemplo 2: Fix de TypeScript Error**

```typescript
// Error: Property 'brand' does not exist on type 'Car | null'

// Selecciona la línea con error
const carName = car.brand; // ❌ Error aquí

// Cmd+K → Escribe:
"Fix this TypeScript error with optional chaining"

// Cursor genera:
const carName = car?.brand ?? 'Unknown';
```

**Velocidad**: 10-30 segundos (instantáneo)

---

### 4️⃣ Autocomplete con Tab - Código Repetitivo

**¿Qué es?**: Sugerencias mientras escribes, completa con `Tab`.

**Casos de Uso en AutoRenta**:

**1. Imports Automáticos**:
```typescript
// Empiezas a escribir:
import { Component } from '@angular/core';
import { CommonModule } fr
// Tab → Cursor completa:
import { CommonModule } from '@angular/common';
```

**2. Código Repetitivo**:
```typescript
// Tienes este método:
async getCar(id: string): Promise<Car> { ... }

// Empiezas a escribir el siguiente:
async getBook
// Tab → Cursor sugiere pattern similar:
async getBooking(id: string): Promise<Booking> {
  const { data, error } = await this.supabase
    .from('bookings')
    .select()
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Booking;
}
```

**3. Tailwind Classes**:
```html
<!-- Empiezas: -->
<div class="flex items-
<!-- Tab → Cursor sugiere basado en patterns existentes: -->
<div class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-md">
```

**Pro Tip**: Cursor aprende de tu código existente. Cuanto más consistentes sean tus patterns, mejor autocompleta.

---

## 🎨 Feature Avanzada: Multi-Agent (8 Agentes en Paralelo)

**¿Qué es?**: Ejecuta hasta **8 agentes simultáneos** para comparar enfoques.

**Uso**: `Cmd+T` abre nueva tab de Agent

### Caso de Uso: Comparar Implementaciones de State Management

**Escenario**: Quieres decidir entre signals vs BehaviorSubject para un nuevo servicio.

```typescript
// Agent 1 (Tab 1) - Cmd+I:
"Implementa NotificationsService usando signals de Angular"

// Agent 2 (Tab 2) - Cmd+T → Cmd+I:
"Implementa NotificationsService usando BehaviorSubject de RxJS"

// Ambos agentes trabajan en paralelo (workspaces aislados)
// Después de 3-5 min:

// COMPARAS:
// - Complejidad de código
// - Performance
// - Bundle size impact
// - Ease of testing
// - Compatibilidad con codebase

// Eliges el mejor approach y descartas el otro
```

**Ventajas**:
- ⏱️ 2x más rápido que hacerlos secuencialmente
- 🔍 Comparación objetiva de enfoques
- 🧪 A/B testing de arquitecturas
- 🚫 Sin riesgo (workspaces aislados)

**Otros Casos de Uso**:
1. **Testing de librerías alternativas** (Mapbox vs Leaflet)
2. **Estilos diferentes** (CSS-in-JS vs Tailwind)
3. **Algoritmos** (sorting strategies)
4. **UI variations** (layout options)

---

## 🌐 Browser Integration (GA) - Testing UI en Cursor

**¿Qué es?**: Agent puede abrir navegador, interactuar con tu app y validar UI.

**Casos de Uso en AutoRenta**:

### 1. Testing de Flujo de Booking

```typescript
// Cmd+I (Agent Mode):

"Abre http://localhost:4200 en el browser y prueba el flujo de booking:
1. Navega a /cars
2. Selecciona el primer auto
3. Click en 'Reservar'
4. Completa formulario de fechas
5. Verifica que el precio se calcule correctamente
6. Captura screenshot del resumen

Documenta cualquier error visual o de UX que encuentres"
```

**Agent ejecutará**:
1. ✅ Abre browser integrado
2. ✅ Navega por la app
3. ✅ Interactúa con DOM
4. ✅ Extrae elementos y valida
5. ✅ Reporta issues encontrados
6. ✅ Toma screenshots

### 2. Validación de Responsive Design

```typescript
// Cmd+I:

"Abre /cars/list en browser y verifica responsive design:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

Identifica elementos que se vean mal y sugiere fixes CSS"
```

### 3. Testing de Integración con MercadoPago

```typescript
// Cmd+I:

"Simula flujo de depósito a wallet:
1. Login como usuario test
2. Navega a wallet
3. Click en 'Depositar'
4. Verifica que se abra MercadoPago checkout
5. Valida que el monto sea correcto (ARS)
6. Reporta cualquier error de redirección"
```

**Ventajas**:
- 🚀 No sales de Cursor para testing manual
- 📸 Screenshots automáticos
- 🐛 Detecta bugs visuales
- ✅ Valida flujos E2E

---

## 🔒 Terminal Sandbox - Comandos Seguros

**¿Qué es?**: Agent puede ejecutar comandos en terminal sandboxed.

**Configuración de Seguridad**:

```json
// .cursor/settings.json (Cursor settings)
{
  "agent.terminal.autoRun": false,  // ❌ Requiere confirmación
  "agent.terminal.allowlist": [     // ✅ Comandos seguros automáticos
    "npm run test",
    "npm run lint",
    "git status",
    "git diff"
  ]
}
```

**Casos de Uso en AutoRenta**:

### 1. Testing Automático

```typescript
// Cmd+I:

"Ejecuta los tests del BookingsService y analiza los errores si hay.
Si fallan, sugiere fixes"
```

**Agent ejecuta**:
```bash
# Terminal sandbox (auto-confirmado si está en allowlist)
npm run test -- bookings.service.spec.ts

# Analiza output:
# FAIL: Expected 5 bookings, got 3
# ✅ Agent sugiere: "El mock data solo tiene 3 bookings, agregar 2 más"
```

### 2. Dependency Management

```typescript
// Cmd+I:

"Necesito agregar date-fns para manejo de fechas.
Instala la librería y actualiza BookingsService para usarla"
```

**Agent ejecuta**:
```bash
# Pide confirmación (comando de instalación)
npm install date-fns

# Espera tu aprobación
# Después de aprobar:
# - Actualiza package.json
# - Modifica BookingsService
# - Importa y usa date-fns
```

### 3. Build y Análisis

```typescript
// Cmd+I:

"Ejecuta production build y analiza bundle size.
Si algún chunk es >500KB, sugiere optimizaciones"
```

**Agent ejecuta**:
```bash
npm run build -- --stats-json

# Analiza dist/stats.json
# Identifica: "main.js es 732KB debido a mapbox-gl"
# ✅ Sugiere: "Lazy load mapbox solo en cars-map component"
```

---

## 📋 Checkpoints y Review - Control Total

**¿Qué son?**: Snapshots automáticos de cambios para rollback fácil.

### Checkpoints Automáticos

Cursor crea checkpoints antes de cambios grandes:

```
┌─────────────────────────────────────────────────┐
│  CHECKPOINT 1: Initial state                    │
│  Time: 14:23:15                                 │
│  Files: 0 changed                               │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  CHECKPOINT 2: Added ReviewsService             │
│  Time: 14:25:42                                 │
│  Files: 1 added (reviews.service.ts)            │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  CHECKPOINT 3: Added car-reviews-list component │
│  Time: 14:28:19                                 │
│  Files: 3 added (component + template + css)    │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  CHECKPOINT 4: Integrated in car-detail         │
│  Time: 14:31:04                                 │
│  Files: 1 modified (car-detail.page.ts)         │
└─────────────────────────────────────────────────┘
```

**Rollback a cualquier checkpoint**:
- Click en checkpoint anterior
- "Restore to this point"
- Cursor revierte cambios instantáneamente

### Review Interface (Diff View)

**Color-Coded Diffs**:

```typescript
// ✅ Verde = Agregado
+ import { ReviewsService } from '@core/services/reviews.service';
+ private reviewsService = inject(ReviewsService);

// ❌ Rojo = Eliminado
- private oldService = inject(OldService);

// 🟡 Modificado = Rojo + Verde
- const price = car.price_per_day;
+ const price = car.price_per_day * days;
```

**Opciones de Review**:
1. **Accept All** - Acepta todos los cambios
2. **Accept File** - Acepta solo un archivo
3. **Reject** - Descarta cambios
4. **Edit Inline** - Ajusta manualmente antes de aceptar

---

## 🎓 Best Practices para AutoRenta

### 1. Prompts Claros y Específicos

**❌ MAL (vago)**:
```
"Agrega reviews"
```

**✅ BIEN (específico)**:
```
"Implementa sistema de reviews para autos:
- Tabla car_reviews con RLS (solo locatarios con booking completado)
- ReviewsService con signals
- Componente car-reviews-list (Tailwind, rating stars SVG)
- Integración en car-detail.page.ts
- Tests unitarios con >80% coverage
- Sigue patterns de .cursorrules"
```

### 2. Aprovecha .cursorrules

Tu archivo `.cursorrules` ya está configurado. Cursor lo lee automáticamente.

**Menciona en prompts**:
```typescript
// Cmd+I:
"Crea FavoritesService siguiendo patterns de .cursorrules:
- Usa signals (no BehaviorSubject)
- Storage paths sin bucket prefix
- Error handling explícito de Supabase
- Return types explícitos"
```

### 3. Confirma Requirements Antes de Codear

**Pattern de 2 fases**:

```typescript
// FASE 1 - Planning (Cmd+L Ask Mode):
"Quiero agregar notificaciones push.
Antes de implementar, analiza:
1. ¿Qué servicio usar? (Firebase, Supabase Realtime, etc)
2. ¿Cómo integrar con arquitectura actual?
3. ¿Impacto en bundle size?
4. Dame 2-3 opciones con pros/cons"

// Cursor responde con análisis
// TÚ decides la opción

// FASE 2 - Implementation (Cmd+I Agent Mode):
"Implementa notificaciones push usando [opción elegida]..."
```

**Beneficio**: Evita que Agent tome decisiones arquitectónicas incorrectas.

### 4. Combina Modos Estratégicamente

**Workflow Óptimo**:

```
1. ASK MODE (Cmd+L) - Entender problema
   "¿Por qué falla el webhook de MercadoPago?"

2. AGENT MODE (Cmd+I) - Implementar solución
   "Fix webhook signature validation según análisis anterior"

3. CMD+K - Ajustes finales
   Pequeños tweaks inline

4. AUTOCOMPLETE - Código repetitivo
   Tab para completar patterns
```

### 5. Usa @-mentions para Contexto Preciso

**Evita Alucinaciones**:

```typescript
// ❌ SIN contexto (puede alucinar):
"¿Cómo funciona el sistema de pagos?"
// Cursor puede inventar detalles

// ✅ CON contexto específico:
"@payments.service.ts @mercadopago-webhook
¿Cómo funciona el flujo de pagos desde frontend hasta webhook?"
// Cursor analiza archivos reales
```

### 6. Mantén .cursorrules Actualizado

**Ciclo de Mejora**:

```typescript
// 1. Agent comete un error (ej: usa BehaviorSubject en vez de signals)

// 2. Cmd+L:
"Acabas de usar BehaviorSubject pero debías usar signals.
Sugiere una regla para .cursorrules que prevenga esto"

// 3. Cursor sugiere:
"Agrega a .cursorrules:
- SIEMPRE usa signals para estado reactivo
- NUNCA uses BehaviorSubject en servicios nuevos"

// 4. Actualizas .cursorrules
// 5. Futuras implementaciones ya no cometen ese error
```

### 7. Aprovecha Browser Integration para UX

**Testing de Conversión**:

```typescript
// Cmd+I:

"Abre http://localhost:4200/cars y analiza UX del flujo de booking:
1. ¿Hay fricción en el formulario?
2. ¿CTA (Call-to-Action) son claros?
3. ¿Responsive funciona en mobile?
4. Sugiere mejoras de conversión basadas en best practices"
```

**Cursor analiza**:
- Tiempo de carga
- Visibilidad de CTAs
- Friction points
- Responsive issues

**Genera reporte** con screenshots y sugerencias.

### 8. Iteración Continua

**No Esperes Perfección en Primer Intento**:

```typescript
// Intento 1 (Cmd+I):
"Implementa FavoritesService"

// Review → Detectas problema con RLS

// Intento 2 (siguiente mensaje en MISMO chat):
"El método addFavorite() necesita verificar RLS policy.
Agrega check de auth.uid() antes de insert"

// Agent itera sobre código anterior
// No necesitas empezar de cero
```

**Cursor es conversacional**: Cada mensaje refina el anterior.

---

## 🔥 Workflows Avanzados Multi-Agente

### Workflow 1: Claude Code (Arquitectura) → Cursor (Implementación)

**Caso**: Nueva feature de chat en tiempo real

```bash
# PASO 1: Claude Code (Terminal) - 15 min
$ claude
> "Diseña sistema de chat en tiempo real para AutoRenta:
   - Usa Supabase Realtime
   - Schema de mensajes, rooms, participantes
   - RLS policies
   - Plan de implementación para Cursor"

# Claude genera:
# - CHAT_IMPLEMENTATION_PLAN.md
# - supabase/migrations/setup-chat.sql
# - TODO list (8 items)

# PASO 2: Cursor Agent (Cmd+I) - 45 min
"@CHAT_IMPLEMENTATION_PLAN.md
Implementa el sistema de chat según este plan:
- ChatService con Supabase Realtime
- Componentes chat-room, message-list, message-input
- Integración en booking-detail
- Tests unitarios

Sigue .cursorrules y CLAUDE.md patterns"

# Cursor implementa todo en una sesión
# Review → Accept → Done

# PASO 3: Claude Code (Validación) - 10 min
$ claude
> "Ejecuta npm run ci y despliega a staging"
```

**Total**: 70 min (vs 4-6 horas manual)

### Workflow 2: Cursor Multi-Agent (Comparación)

**Caso**: Decidir entre Mapbox vs Leaflet para mapas

```typescript
// Tab 1 (Cmd+I):
"Implementa cars-map component usando Mapbox GL JS:
- Markers para autos
- Clustering
- Popup con car-card
- Análisis de bundle size impact"

// Tab 2 (Cmd+T → Cmd+I):
"Implementa cars-map component usando Leaflet:
- Markers para autos
- Clustering
- Popup con car-card
- Análisis de bundle size impact"

// Ambos corren en paralelo (5-8 min)

// COMPARAS:
// Mapbox: 450KB bundle, mejor UX, más features
// Leaflet: 150KB bundle, UX básica, lightweight

// DECIDES: Mapbox (ya está en uso)
// DELETE: Tab 2 (Leaflet)
// ACCEPT: Tab 1 (Mapbox)
```

### Workflow 3: Cursor (Desarrollo) → Claude Code (Security Audit)

**Caso**: Implementaste wallet feature, necesitas validar seguridad

```typescript
// PASO 1: Cursor Agent (1 hora)
// Cmd+I:
"Implementa WalletService con:
- deposit(), withdraw(), getBalance()
- RLS policies
- Integración con MercadoPago"

// Implementas y funciona ✅

// PASO 2: Claude Code (30 min)
$ claude
> "Audita WalletService y RLS policies de wallet.
   Busca vulnerabilidades de seguridad:
   - Data leaks
   - RLS bypass
   - Race conditions
   - SQL injection

   Genera WALLET_SECURITY_AUDIT.md con findings"

// Claude encuentra:
// ❌ CRITICAL: wallet_transactions permite SELECT sin auth
// ⚠️ WARNING: Falta rate limiting en deposit()

// PASO 3: Cursor Fix (15 min)
// Cmd+I:
"@WALLET_SECURITY_AUDIT.md
Fix las 2 issues críticas identificadas en el audit"

// Cursor aplica fixes
// Review → Accept
```

---

## 📊 Comparación: Cursor vs Claude Code

| Criterio | Cursor | Claude Code | Ganador |
|----------|--------|-------------|---------|
| **Velocidad de edición** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ | Cursor |
| **Contexto visual (IDE)** | ✅ Nativo | ❌ Terminal | Cursor |
| **Multi-file editing** | ✅ Diff view | ✅ Batch | Empate |
| **Browser integration** | ✅ Built-in | ❌ No | Cursor |
| **Vertical debugging** | ⚠️ Limitado | ✅ Profundo | Claude Code |
| **CI/CD automation** | ⚠️ Manual | ✅ Workflows | Claude Code |
| **Security audits** | ⚠️ Básico | ✅ Completo | Claude Code |
| **Refactor global (10+ files)** | ⚠️ Lento | ✅ Batch | Claude Code |
| **Autocomplete** | ✅ Excelente | ❌ No | Cursor |
| **Inline editing (Cmd+K)** | ✅ Instantáneo | ❌ No | Cursor |
| **Deployment** | ⚠️ Manual | ✅ Auto | Claude Code |
| **Documentation** | ⚠️ Básica | ✅ Completa | Claude Code |
| **Learning curve** | ⚡ Fácil | ⚡⚡ Medio | Cursor |
| **Cost** | $ Paid | $ Paid | Empate |

**Conclusión**: Son **complementarios**, no competidores.

---

## 🎯 Cuándo Usar Cada Uno (Guía Rápida)

### Usa CURSOR para:

✅ Implementación rápida de features (con plan existente)
✅ Ediciones inline y ajustes precisos (Cmd+K)
✅ Debugging visual en tiempo real
✅ Testing de UI con browser integration
✅ Refactoring local (1-3 archivos)
✅ Autocompletado mientras codeas
✅ Comparar múltiples enfoques (multi-agent 8x)
✅ Generar tests unitarios específicos

### Usa CLAUDE CODE para:

✅ Planificación de arquitectura y features
✅ Análisis vertical (UI → Service → DB → RLS)
✅ Refactoring global (10+ archivos)
✅ CI/CD automation (lint + test + build + deploy)
✅ Security audits completos
✅ Generación de documentación técnica
✅ Setup de infraestructura (Supabase, Cloudflare)
✅ Comandos largos con auto-background (>2 min)

---

## 🚀 Quick Start: Tu Primer Día con Cursor Agent

### Setup (5 min)

```bash
# 1. Verifica que .cursorrules existe
cat .cursorrules

# 2. Abre Cursor en proyecto
cd /home/edu/autorenta
cursor .

# 3. Prueba cada modo:
# - Cmd+L (Ask Mode)
# - Cmd+I (Agent Mode)
# - Cmd+K (Inline editing)
```

### Primer Task: Agregar Botón de Compartir en Car Card (15 min)

**1. Ask Mode (Cmd+L) - Entender código actual**:
```
"@car-card.component.ts
¿Cómo está estructurado este componente?
¿Dónde debería agregar un botón de compartir?"
```

**2. Agent Mode (Cmd+I) - Implementar**:
```
"@car-card.component.ts
Agrega botón de 'Compartir' en car-card:
- Icono SVG de share (Tailwind Heroicons)
- Click abre Web Share API (navigator.share)
- Comparte: título, descripción, URL del auto
- Fallback: copia URL al clipboard si Share API no disponible
- Toast notification después de compartir

Sigue patterns de .cursorrules"
```

**3. Review**:
- Cursor muestra diff
- Verificas cambios
- Click "Accept"

**4. Test**:
```bash
npm run start
# Abre http://localhost:4200/cars
# Prueba botón de compartir
```

**✅ Done!** En 15 min agregaste feature completa.

---

## 📚 Recursos y Documentación

### Cursor Oficial

- **Docs**: https://docs.cursor.com
- **Features**: https://cursor.com/features
- **Changelog**: https://cursor.com/changelog
- **Community**: https://forum.cursor.com

### AutoRenta Multi-Agente

- **CLAUDE.md**: Arquitectura del proyecto
- **.cursorrules**: Reglas de Cursor (este archivo las lee automáticamente)
- **MULTI_AGENT_WORKFLOW.md**: Workflows Claude Code + Cursor
- **CURSOR_OPTIMIZED_GUIDE.md**: Esta guía

### Atajos de Teclado (Memoriza Estos 4)

| Atajo | Acción | Uso Frecuencia |
|-------|--------|----------------|
| **Cmd+I** | Agent Mode | ⭐⭐⭐⭐⭐ Diario |
| **Cmd+L** | Ask Mode | ⭐⭐⭐⭐⭐ Diario |
| **Cmd+K** | Inline Edit | ⭐⭐⭐⭐ Muy frecuente |
| **Cmd+T** | New Agent Tab | ⭐⭐ Ocasional |

---

## 🎓 Mejoras Sugeridas a .cursorrules

Tu `.cursorrules` actual es excelente. Aquí hay mejoras opcionales:

### Agregar Sección de Prompts Pre-definidos

```yaml
# Agregar al final de .cursorrules:

## Common Prompts for AutoRenta

### Feature Implementation
"Implementa [FeatureName]Service en core/services/:
- Usa signals para estado reactivo
- Métodos: [list methods]
- Integración con Supabase
- Error handling explícito
- Return types explícitos
- Tests unitarios con >80% coverage"

### Component Creation
"Crea componente [name] en shared/components/:
- Standalone component
- Imports: CommonModule + [otros]
- Tailwind CSS (no CSS custom)
- Props con @Input()
- Events con @Output()
- Loading states y error handling"

### RLS Debugging
"@setup-[table].sql @[service].service.ts
Analiza RLS policy error:
- Verifica storage paths (sin bucket prefix)
- Valida auth.uid() checks
- Compara expected vs actual paths"
```

### Agregar Checklist de Review

```yaml
## Review Checklist (antes de Accept)

Antes de aceptar cambios de Agent, verifica:
- [ ] No hay `console.log` (usa `console.error` para errores)
- [ ] Storage paths sin bucket prefix
- [ ] Imports ordenados alfabéticamente
- [ ] Return types explícitos en funciones públicas
- [ ] Error handling de Supabase
- [ ] Tests agregados/actualizados
- [ ] Tailwind CSS (no CSS custom)
- [ ] Standalone components (no NgModules)
```

---

## 🔮 Próximas Features de Cursor (2025)

Según changelog y roadmap:

1. **Voice Control** (✅ Ya disponible)
   - Speech-to-text para Agent
   - Custom keywords para submit

2. **Improved Steering** (✅ Ya disponible)
   - Mensajes mientras Agent trabaja
   - Alt+Enter: Queue message
   - Cmd+Enter: Interrupt agent

3. **MCP Expansion** (En desarrollo)
   - Más integraciones MCP
   - Custom MCP servers

4. **Agent Observability** (Planeado)
   - Logs detallados de tool calls
   - Performance metrics
   - Cost tracking

Mantente actualizado en https://cursor.com/changelog

---

## ✅ Checklist: Estás Listo para Usar Cursor

- [x] `.cursorrules` configurado
- [x] `CLAUDE.md` documentado
- [x] `MULTI_AGENT_WORKFLOW.md` leído
- [x] Esta guía (`CURSOR_OPTIMIZED_GUIDE.md`) revisada
- [ ] Probaste Cmd+L (Ask Mode)
- [ ] Probaste Cmd+I (Agent Mode)
- [ ] Probaste Cmd+K (Inline)
- [ ] Implementaste tu primera feature con Agent
- [ ] Usaste multi-agent (Cmd+T) para comparar
- [ ] Integraste Cursor + Claude Code workflow

**Siguiente paso**: Implementa una feature pequeña usando Cursor Agent (15-30 min) para familiarizarte.

---

**Versión**: 1.0.0
**Última actualización**: 2025-11-03
**Mantenedor**: @ecucondorSA
**Proyecto**: AutoRenta - Car Rental Marketplace (Argentina)

**Feedback**: Si descubres workflows optimizados, documenta en este archivo.
