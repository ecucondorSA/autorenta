# COPILOT_BEST_PRACTICES.md

Guía de mejores prácticas para usar GitHub Copilot en AutoRenta.

> **Nota**: Esta guía está específicamente adaptada para el stack técnico de AutoRenta (Angular 17 + Supabase + Cloudflare) y complementa las custom instructions existentes en el proyecto.

## Tabla de Contenidos

- [Introducción](#introducción)
- [Preparando Issues para Copilot](#preparando-issues-para-copilot)
- [Tipos de Tareas Ideales](#tipos-de-tareas-ideales)
- [Tipos de Tareas a Evitar](#tipos-de-tareas-a-evitar)
- [Iterando en Pull Requests](#iterando-en-pull-requests)
- [Custom Instructions](#custom-instructions)
- [Mejores Prácticas Específicas de AutoRenta](#mejores-prácticas-específicas-de-autorenta)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Troubleshooting](#troubleshooting)

---

## Introducción

GitHub Copilot funciona mejor cuando se le asignan tareas claras y bien definidas. Esta guía te ayudará a obtener los mejores resultados al trabajar con Copilot en el proyecto AutoRenta.

### ¿Quién puede usar esta feature?

Copilot coding agent está disponible con GitHub Copilot Pro, Pro+, Business y Enterprise. El agente funciona en todos los repositorios de GitHub, excepto donde haya sido explícitamente deshabilitado.

---

## Preparando Issues para Copilot

Copilot proporciona mejores resultados cuando se le asignan tareas claras y bien delimitadas. Un issue ideal incluye:

### 1. Descripción Clara del Problema

```markdown
## Problema
Los usuarios no pueden ver el estado de verificación de su perfil de locador en el dashboard.

## Contexto
- La verificación se completa en el backend (Supabase Edge Function)
- El estado se guarda en `profiles.verified_at`
- Falta el componente UI para mostrar este estado
```

### 2. Criterios de Aceptación Completos

```markdown
## Criterios de Aceptación
- [ ] Mostrar badge de verificación en el perfil si `verified_at` no es null
- [ ] Badge debe ser visible en `/profile` y `/dashboard`
- [ ] Agregar tests unitarios para el componente de badge
- [ ] Seguir el design system de Tailwind CSS del proyecto
- [ ] Actualizar documentación si es necesario
```

### 3. Direcciones sobre Archivos a Modificar

```markdown
## Archivos Relacionados
- `apps/web/src/app/features/profile/profile.component.ts` - Agregar lógica de verificación
- `apps/web/src/app/features/profile/profile.component.html` - Agregar badge UI
- `apps/web/src/app/core/services/auth.service.ts` - Ya tiene método para verificar estado
- `apps/web/src/app/shared/components/` - Posiblemente crear `verification-badge.component.ts`
```

### 4. Información Técnica del Stack

```markdown
## Stack Técnico Relevante
- **Frontend**: Angular 17 standalone components
- **Estado**: Signal `verified = signal<boolean>(false)`
- **Estilos**: Tailwind CSS (clases utility)
- **Datos**: Supabase client via `injectSupabase()`
```

### Plantilla de Issue para Copilot

```markdown
---
title: "[Feature/Bug/Refactor] Título descriptivo"
labels: copilot-ready
assignees: @copilot
---

## 📋 Descripción
[Descripción clara del problema o feature]

## 🎯 Criterios de Aceptación
- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Tests incluidos
- [ ] Documentación actualizada (si aplica)

## 📁 Archivos Relacionados
- `path/to/file1.ts` - [Descripción de qué cambiar]
- `path/to/file2.html` - [Descripción de qué cambiar]

## 🛠 Stack Técnico
- **Framework**: [Angular/Supabase/Cloudflare]
- **Tipo**: [Component/Service/Edge Function/Worker]
- **Dependencias**: [Librerías relevantes]

## 🔗 Contexto Adicional
- Links a issues relacionados
- Screenshots o mockups (si aplica)
- Consideraciones de performance o seguridad
```

---

## Tipos de Tareas Ideales

Estas son las tareas donde Copilot generalmente brinda los mejores resultados en AutoRenta:

### ✅ Tareas Recomendadas

#### 1. **Bugs Específicos y Acotados**

```markdown
**Ejemplo**: Fix: Error al subir más de 5 fotos de auto

**Por qué funciona bien**:
- Scope limitado (file upload component)
- Criterio de éxito claro (subir 5+ fotos sin error)
- Stack conocido (Angular + Supabase Storage)

**Archivos**:
- `apps/web/src/app/features/cars/car-photo-upload.component.ts`
- `apps/web/src/app/core/services/storage.service.ts`
```

#### 2. **Features UI Nuevas**

```markdown
**Ejemplo**: Agregar filtro de precio en búsqueda de autos

**Por qué funciona bien**:
- Componente autocontenido
- Patrón establecido (ya existen otros filtros)
- Directrices claras de UI (Tailwind + design system)

**Archivos**:
- `apps/web/src/app/features/search/search-filters.component.ts`
- `apps/web/src/app/features/search/search-filters.component.html`
```

#### 3. **Mejora de Cobertura de Tests**

```markdown
**Ejemplo**: Agregar tests unitarios para BookingService

**Por qué funciona bien**:
- Scope claro (un solo servicio)
- Patrones establecidos (otros *.spec.ts como referencia)
- Criterio objetivo (coverage %)

**Archivos**:
- `apps/web/src/app/core/services/bookings.service.spec.ts` (crear)
```

#### 4. **Actualización de Documentación**

```markdown
**Ejemplo**: Documentar el flujo de MercadoPago webhooks

**Por qué funciona bien**:
- Información disponible en código
- Formato establecido (otros archivos .md)
- No requiere cambios de lógica

**Archivos**:
- `CLAUDE_PAYMENTS.md` (actualizar)
- `docs/guides/features/MERCADOPAGO_WEBHOOKS.md` (crear)
```

#### 5. **Mejoras de Accesibilidad**

```markdown
**Ejemplo**: Agregar ARIA labels a componente de búsqueda

**Por qué funciona bien**:
- Cambios incrementales
- Best practices bien definidas
- No afecta lógica existente

**Archivos**:
- `apps/web/src/app/features/search/*.component.html`
```

#### 6. **Refactoring de Deuda Técnica**

```markdown
**Ejemplo**: Convertir CarComponent a usar Signals en vez de Observables

**Por qué funciona bien**:
- Scope limitado (un componente)
- Patrón claro (Angular Signals)
- Tests existentes validan comportamiento

**Archivos**:
- `apps/web/src/app/features/cars/car-detail.component.ts`
```

---

## Tipos de Tareas a Evitar

Estas tareas son mejor manejadas por desarrolladores humanos:

### ❌ Tareas No Recomendadas

#### 1. **Tareas Complejas y de Scope Amplio**

```markdown
**Ejemplo**: ❌ Refactorizar todo el sistema de autenticación para soportar OAuth de Google

**Por qué evitarlo**:
- Afecta múltiples capas (UI, Backend, DB)
- Requiere entendimiento profundo de security
- Cambios en muchos archivos interdependientes
- Requiere testing extensivo

**Mejor enfoque**: Dividir en subtareas más pequeñas
```

#### 2. **Problemas que Requieren Conocimiento del Dominio**

```markdown
**Ejemplo**: ❌ Implementar cálculo de tarifas dinámicas basado en demanda

**Por qué evitarlo**:
- Requiere entender lógica de negocio específica
- Decisiones de pricing son estratégicas
- Necesita validación de stakeholders

**Mejor enfoque**: Definir la lógica primero, luego asignar implementación
```

#### 3. **Incidentes de Producción Críticos**

```markdown
**Ejemplo**: ❌ Los pagos no están procesándose en producción

**Por qué evitarlo**:
- Requiere debugging en tiempo real
- Puede involucrar datos sensibles
- Necesita acceso a logs y monitoring
- Tiempo de respuesta crítico

**Mejor enfoque**: Investigar manualmente, luego crear issue para fix
```

#### 4. **Tareas de Seguridad Sensibles**

```markdown
**Ejemplo**: ❌ Implementar encriptación de datos sensibles de usuarios

**Por qué evitarlo**:
- Implicaciones de seguridad y compliance
- Requiere expertise en cryptography
- Puede involucrar PII (Personally Identifiable Information)

**Mejor enfoque**: Consultar con security expert primero
```

#### 5. **Cambios de Arquitectura Mayores**

```markdown
**Ejemplo**: ❌ Migrar de Supabase Storage a AWS S3

**Por qué evitarlo**:
- Afecta toda la aplicación
- Requiere decisiones de diseño
- Necesita testing exhaustivo
- Impacto en costos e infraestructura

**Mejor enfoque**: Planificación detallada primero
```

#### 6. **Tareas Ambiguas sin Definición Clara**

```markdown
**Ejemplo**: ❌ "Mejorar la experiencia de usuario del flujo de booking"

**Por qué evitarlo**:
- Scope indefinido
- No hay criterios de éxito claros
- Requiere investigación y decisiones de UX

**Mejor enfoque**: Definir mejoras específicas primero
```

---

## Iterando en Pull Requests

Trabajar con Copilot en un PR es como trabajar con un desarrollador humano: es común que el PR necesite trabajo adicional antes de poder mergearse.

### Usando @copilot en Comentarios

Puedes mencionar `@copilot` en comentarios del PR para iterar sobre cambios:

```markdown
@copilot El componente se ve bien, pero necesito que:
1. Agregues validación de que `price` sea mayor a 0
2. Cambies el botón de "Enviar" a "Publicar Auto"
3. Agregues un test para el caso de precio inválido
```

### Best Practices para Reviews

#### 1. **Batch Comments con "Start a Review"**

❌ **Evitar**: Comentarios individuales uno por uno
```
// Comentario 1: Falta validación
// Comentario 2: Error de tipado
// Comentario 3: Falta test
// → Copilot trabaja en cada uno por separado
```

✅ **Mejor**: Batch todos los comentarios
```markdown
**Start a Review** → Agregar todos los comentarios → **Submit Review**
→ Copilot trabaja en todos a la vez
```

#### 2. **Comentarios Específicos y Accionables**

❌ **Vago**: "Este código no se ve bien"

✅ **Específico**:
```markdown
@copilot En car-detail.component.ts:45, el método `calculateTotal()`
debería usar el precio diario del auto (`car.daily_price`) multiplicado
por la cantidad de días, no un valor hardcodeado.
```

#### 3. **Referenciar Archivos y Líneas**

```markdown
@copilot En `apps/web/src/app/features/bookings/booking-form.component.ts:67`:
- Cambiar `this.http.post()` a usar `this.bookingsService.createBooking()`
- El servicio ya tiene la lógica de validación implementada
```

### Ejemplo de Review Completo

```markdown
## General
Buen trabajo con la implementación del componente de booking!
Necesito algunos ajustes antes de mergear.

## Cambios Requeridos

**1. Validación de Fechas**
- `booking-form.component.ts:45` - Agregar validación de que end_date > start_date
- Usar `DateValidator.validateRange()` que ya existe en `shared/validators/`

**2. Manejo de Errores**
- `booking-form.component.ts:78` - El catch block está vacío
- Mostrar error al usuario con `this.toastService.error()`
- Ver ejemplo en `car-publish.component.ts:92`

**3. Tests Faltantes**
- Agregar test case para fecha de fin anterior a fecha de inicio
- Agregar test case para manejo de error del API
- Ver patrón en `booking-list.component.spec.ts`

**4. Estilos**
- `booking-form.component.html:23` - Usar clase `btn-primary` en vez de estilos inline
- Seguir design system en `tailwind.config.js`

@copilot Por favor implementa estos cambios.
```

---

## Custom Instructions

AutoRenta ya tiene custom instructions configuradas que guían a Copilot automáticamente. Familiarízate con ellas para entender cómo Copilot interpretará tus tareas.

### Archivos de Custom Instructions Existentes

```
autorenta/
├── CLAUDE.md                          # Guía principal (este archivo)
├── CLAUDE_ARCHITECTURE.md             # Arquitectura técnica
├── CLAUDE_WORKFLOWS.md                # Comandos y CI/CD
├── CLAUDE_STORAGE.md                  # Supabase Storage
├── CLAUDE_PAYMENTS.md                 # Sistema de pagos
└── .github/
    ├── copilot-instructions.md        # ⚠️ Crear este archivo
    └── instructions/
        ├── angular-components.instructions.md    # ⚠️ Crear
        ├── supabase-functions.instructions.md    # ⚠️ Crear
        └── playwright-tests.instructions.md      # ⚠️ Crear
```

### Crear `.github/copilot-instructions.md`

Este archivo proporciona instrucciones generales a Copilot para todo el repositorio:

```markdown
# AutoRenta - GitHub Copilot Instructions

Este es un marketplace de renta de autos para Argentina construido con Angular 17 + Supabase + Cloudflare.

## Stack Tecnológico

- **Frontend**: Angular 17 (standalone components) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Cloudflare Pages
- **Workers**: Cloudflare Workers para webhooks
- **Payments**: MercadoPago (producción) + Mock (desarrollo)

## Estándares de Código

### Antes de Cada Commit
- Run `npm run lint:fix` para formatear código
- Husky ejecuta automáticamente en pre-commit

### Flujo de Desarrollo
- Build: `npm run build`
- Test: `npm run test:quick`
- CI completo: `npm run ci`

## Estructura del Repositorio

- `apps/web/`: Angular 17 app
  - `src/app/core/`: Services, guards, interceptors
  - `src/app/features/`: Feature modules (lazy-loaded)
  - `src/app/shared/`: Shared components
- `functions/workers/`: Cloudflare Workers
- `supabase/functions/`: Supabase Edge Functions (Deno)
- `supabase/migrations/`: SQL migrations
- `docs/`: Documentación

## Guías Clave

### 1. Componentes Angular
- Usar **standalone components** (no NgModules)
- Preferir **Signals** sobre Observables cuando sea posible
- Lazy loading con `loadComponent()` o `loadChildren()`
- Inyectar Supabase con `injectSupabase()`

### 2. Supabase
- Todas las tablas usan RLS (Row Level Security)
- Usar RPC functions para lógica compleja: `rpc('function_name', params)`
- Storage paths: `{user_id}/{resource_id}/{filename}` (SIN nombre de bucket)

### 3. Testing
- Unit tests: Karma + Jasmine
- E2E tests: Playwright
- Coverage goal: 80%+ por módulo
- Usar table-driven tests cuando sea posible

### 4. Pagos
- **Producción**: MercadoPago via Supabase Edge Functions
- **Desarrollo**: Mock webhooks via Cloudflare Worker local
- NUNCA llamar `markAsPaid()` en producción directamente

### 5. Seguridad
- No commitear secrets (están en `.env.local`, que está en `.gitignore`)
- Validar input del usuario en frontend Y backend
- Seguir OWASP top 10 (SQL injection, XSS, etc.)

## Comandos Útiles

```bash
npm run dev              # Desarrollo
npm run test:quick       # Tests rápidos
npm run ci               # Pipeline completo
npm run sync:types       # Sincronizar tipos de Supabase
npm run status           # Estado del proyecto
```

## Documentación

Para información detallada, consulta:
- `CLAUDE_ARCHITECTURE.md` - Arquitectura técnica
- `CLAUDE_WORKFLOWS.md` - Comandos y CI/CD
- `CLAUDE_STORAGE.md` - Supabase Storage
- `CLAUDE_PAYMENTS.md` - Sistema de pagos
- `docs/runbooks/troubleshooting.md` - Troubleshooting

## Anti-Patterns a Evitar

❌ NO incluir bucket name en storage paths
❌ NO usar `any` type en TypeScript
❌ NO crear archivos .md para cada cambio rutinario
❌ NO eliminar componentes del template para "arreglar" errores
❌ NO commitear directamente a `main` (usar feature branches)

## Patterns a Seguir

✅ Usar tipos específicos de Supabase: `import { Database } from '@/types/supabase'`
✅ Manejar errores con try/catch y mostrar al usuario
✅ Agregar tests para nuevo código
✅ Documentar cambios arquitectónicos significativos
✅ Seguir convención de nombres existente
```

### Crear Instructions Específicas por Tipo de Archivo

#### `.github/instructions/angular-components.instructions.md`

```markdown
---
applyTo: "**/src/app/**/*.component.ts"
---

# Angular Components - Copilot Instructions

## Requirements

Cuando trabajes en componentes Angular en AutoRenta, sigue estas guías:

### 1. Standalone Components
- SIEMPRE usar standalone components (NO NgModules)
- Declarar imports en el decorator del componente

```typescript
@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './car-card.component.html',
})
export class CarCardComponent {}
```

### 2. Signals sobre Observables
- Preferir Signals para estado local
- Usar Observables solo cuando sea necesario (HTTP, eventos)

```typescript
// ✅ Preferir Signals
const count = signal(0);
const doubled = computed(() => count() * 2);

// ⚠️ Solo si es necesario
users$ = this.http.get<User[]>('/users');
```

### 3. Dependency Injection
- Usar `inject()` en lugar de constructor injection cuando sea posible
- Usar `injectSupabase()` para acceder al cliente Supabase

```typescript
export class CarListComponent {
  private supabase = injectSupabase();
  private router = inject(Router);
}
```

### 4. Estilos con Tailwind
- Usar utility classes de Tailwind CSS
- NO usar estilos inline
- Seguir design system en `tailwind.config.js`

```html
<!-- ✅ Correcto -->
<button class="btn-primary">Guardar</button>

<!-- ❌ Incorrecto -->
<button style="background: blue; color: white;">Guardar</button>
```

### 5. Template Syntax
- NO usar spread operator en templates (no soportado)
- Mover lógica compleja a métodos del componente

```typescript
// ❌ Incorrecto - Spread en template
(change)="data.set({...data(), field: $event})"

// ✅ Correcto - Método helper
onFieldChange(event: Event) {
  this.data.set({ ...this.data(), field: event });
}
```

### 6. Error Handling
- Usar ToastService para mostrar errores
- Siempre manejar errores de HTTP

```typescript
try {
  const result = await this.carsService.publishCar(car);
  this.toastService.success('Auto publicado!');
} catch (error) {
  this.toastService.error('Error al publicar auto');
  console.error(error);
}
```

### 7. Tests
- Crear archivo `.spec.ts` para cada componente
- Testear inputs, outputs y métodos públicos
- Mock dependencies con Jasmine

```typescript
describe('CarCardComponent', () => {
  it('should display car name', () => {
    component.car = mockCar;
    fixture.detectChanges();
    expect(compiled.querySelector('h2')?.textContent).toContain(mockCar.name);
  });
});
```
```

#### `.github/instructions/supabase-functions.instructions.md`

```markdown
---
applyTo: "**/supabase/functions/**/*.ts"
---

# Supabase Edge Functions - Copilot Instructions

## Requirements

Cuando trabajes en Supabase Edge Functions (Deno), sigue estas guías:

### 1. Deno Runtime
- Usar imports de URLs (no NPM)
- Deno standard library: `https://deno.land/std@0.177.0/`
- Supabase client: `https://esm.sh/@supabase/supabase-js@2`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

### 2. CORS Headers
- SIEMPRE incluir CORS headers
- Manejar OPTIONS request

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### 3. Error Handling
- Usar try/catch
- Retornar JSON con status apropiado
- Loguear errores con contexto

```typescript
try {
  // lógica
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
} catch (error) {
  console.error('Error en function:', error);
  return new Response(JSON.stringify({ error: error.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 500,
  });
}
```

### 4. Autenticación
- Verificar JWT token cuando sea necesario
- Usar service role key para operaciones admin

```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: `Bearer ${token}` } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error) throw error;
```

### 5. Secrets
- Usar `Deno.env.get()` para secrets
- NUNCA hardcodear secrets
- Validar que existen

```typescript
const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
if (!mercadopagoToken) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
}
```

### 6. Testing Local
- Usar `supabase functions serve` para testing local
- Mock external APIs en desarrollo

```bash
supabase functions serve function-name --env-file .env.local
```
```

#### `.github/instructions/playwright-tests.instructions.md`

```markdown
---
applyTo: "**/tests/**/*.spec.ts"
---

# Playwright E2E Tests - Copilot Instructions

## Requirements

Cuando escribas tests E2E con Playwright para AutoRenta, sigue estas guías:

### 1. Locators Estables
- Preferir `getByRole()`, `getByText()`, `getByTestId()`
- Evitar CSS selectors o XPath

```typescript
// ✅ Correcto
await page.getByRole('button', { name: 'Publicar Auto' }).click();
await page.getByTestId('car-card-title').click();

// ❌ Evitar
await page.locator('.btn-primary').click();
await page.locator('div > button:nth-child(2)').click();
```

### 2. Tests Aislados
- Cada test debe ser independiente
- No depender de estado de otros tests
- Usar `beforeEach` para setup

```typescript
test.describe('Car Publication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsLocador(page);
  });

  test('should publish car successfully', async ({ page }) => {
    // Test aislado
  });
});
```

### 3. Naming Conventions
- Nombres descriptivos
- Archivos: `*.spec.ts` o `*.e2e.ts`

```typescript
test.describe('Booking Flow', () => {
  test('should create booking when car is available', async ({ page }) => {
    // ...
  });

  test('should show error when car is unavailable', async ({ page }) => {
    // ...
  });
});
```

### 4. Assertions Específicas
- Usar matchers de Playwright
- Ser específico con lo que esperas

```typescript
// ✅ Correcto
await expect(page.getByRole('heading')).toHaveText('Mis Autos');
await expect(page.getByTestId('car-status')).toBeVisible();
await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled();

// ❌ Evitar
await expect(page.locator('h1')).toBeTruthy();
```

### 5. Auto-wait (No Manual Sleeps)
- Confiar en auto-waiting de Playwright
- NO usar `setTimeout()` o `sleep()`

```typescript
// ✅ Correcto - Playwright espera automáticamente
await page.getByRole('button').click();
await expect(page.getByText('Éxito')).toBeVisible();

// ❌ Evitar
await page.getByRole('button').click();
await page.waitForTimeout(3000);
```

### 6. Cross-browser Testing
- Tests deben pasar en Chromium, Firefox y WebKit
- Configurar en `playwright.config.ts`

```typescript
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### 7. Page Object Model
- Organizar selectors en page classes
- Reutilizar lógica común

```typescript
// pages/car-publish.page.ts
export class CarPublishPage {
  constructor(private page: Page) {}

  async fillCarDetails(car: CarDetails) {
    await this.page.getByLabel('Marca').fill(car.brand);
    await this.page.getByLabel('Modelo').fill(car.model);
    await this.page.getByLabel('Año').fill(car.year.toString());
  }

  async submitForm() {
    await this.page.getByRole('button', { name: 'Publicar' }).click();
  }
}

// En test:
test('should publish car', async ({ page }) => {
  const publishPage = new CarPublishPage(page);
  await publishPage.fillCarDetails(mockCar);
  await publishPage.submitForm();
});
```

### 8. Manejo de Contenido Dinámico
- Esperar elementos correctamente
- Manejar estados de carga

```typescript
// Esperar que se cargue la lista
await page.waitForSelector('[data-testid="car-list"]');
await expect(page.getByTestId('car-card')).toHaveCount(5);

// Esperar navegación
await Promise.all([
  page.waitForNavigation(),
  page.getByRole('link', { name: 'Mis Autos' }).click(),
]);
```

### 9. Setup y Cleanup
- Usar hooks para preparar estado
- Limpiar después de tests

```typescript
test.describe('Wallet Tests', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser();
    await seedWalletBalance(100);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData();
  });
});
```

### 10. CI/CD Integration
- Configurar modo headless
- Guardar screenshots en fallas
- Ejecución paralela

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    headless: process.env.CI === 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  workers: process.env.CI ? 2 : undefined,
});
```
```

---

## Mejores Prácticas Específicas de AutoRenta

### 1. Sincronizar Tipos de Supabase

Después de cambios en la base de datos, SIEMPRE sincronizar tipos:

```bash
npm run sync:types
```

Esto actualiza `apps/web/src/types/supabase.ts` con los tipos más recientes.

### 2. Storage Path Convention

❌ **NUNCA incluir nombre de bucket en path**

```typescript
// ❌ INCORRECTO
const path = `car-images/${userId}/${carId}/${filename}`;

// ✅ CORRECTO
const path = `${userId}/${carId}/${filename}`;
```

**Por qué**: Las RLS policies verifican `(storage.foldername(name))[1] = auth.uid()::text`

### 3. Payments: Producción vs Desarrollo

```typescript
// ✅ Producción: Supabase Edge Functions
const { data } = await supabase.functions.invoke('mercadopago-create-preference', {
  body: { amount, description }
});

// ✅ Desarrollo: Mock Webhook (Cloudflare Worker)
// Automáticamente configurado en dev environment
```

❌ **NUNCA** llamar `markAsPaid()` en producción manualmente

### 4. Manejo de Errores con Supabase

```typescript
const { data, error } = await supabase
  .from('cars')
  .select('*')
  .eq('id', carId)
  .single();

if (error) {
  // Loguear error
  console.error('Error fetching car:', error);

  // Mostrar al usuario
  this.toastService.error('Error al cargar el auto');

  // NO continuar ejecución
  return;
}

// Usar data con seguridad
console.log(data);
```

### 5. RLS Debugging

Si encuentras errores de permisos:

```sql
-- Ejecutar en SQL Editor de Supabase
SET LOCAL "request.jwt.claims" = '{"sub": "your-user-uuid"}';

-- Verificar path
SELECT (storage.foldername('user-uuid/car-id/photo.jpg'))[1] = 'user-uuid';
```

### 6. Limpiar Cache de Angular

Si hay errores extraños de compilación:

```bash
rm -rf apps/web/.angular
npm run build
```

---

## Ejemplos Prácticos

### Ejemplo 1: Bug Fix de Validación

**Issue Original:**

```markdown
### Bug: Validación de Precio en Publicación de Auto

**Descripción**
Los usuarios pueden publicar autos con precio $0 o negativo.

**Pasos para Reproducir**
1. Ir a /cars/publish
2. Llenar formulario
3. Poner precio = -100
4. Click en "Publicar"
5. El auto se publica sin error

**Comportamiento Esperado**
- Debe validar que precio sea > 0
- Mostrar mensaje de error si no es válido
- No permitir submit del form

**Archivos Relacionados**
- `apps/web/src/app/features/cars/publish/car-publish-form.component.ts`
- `apps/web/src/app/features/cars/publish/car-publish-form.component.html`

**Criterios de Aceptación**
- [ ] Validación en frontend (FormControl validator)
- [ ] Mensaje de error claro al usuario
- [ ] Test unitario para validación
- [ ] (Opcional) Validación en backend también
```

**Issue Optimizado para Copilot:**

```markdown
---
title: "Bug: Validación de precio debe rechazar valores <= 0 en car-publish-form"
labels: bug, copilot-ready, validation
assignees: @copilot
---

## 🐛 Descripción del Bug
El formulario de publicación de autos (`/cars/publish`) permite enviar precios $0 o negativos, lo cual debe ser rechazado.

## 📋 Pasos para Reproducir
1. Navigate to `/cars/publish`
2. Fill form with `daily_price = -100`
3. Submit form
4. ❌ Car publishes successfully (expected: validation error)

## ✅ Solución Requerida

### 1. Frontend Validation
**File**: `apps/web/src/app/features/cars/publish/car-publish-form.component.ts`

- Agregar validator a FormControl de `daily_price`:
```typescript
daily_price: [null, [Validators.required, Validators.min(1)]]
```

- Mostrar mensaje de error en template:
```html
<span *ngIf="form.get('daily_price')?.errors?.['min']" class="text-red-500 text-sm">
  El precio debe ser mayor a $0
</span>
```

### 2. Unit Test
**File**: `apps/web/src/app/features/cars/publish/car-publish-form.component.spec.ts`

Agregar test case:
```typescript
it('should invalidate form when daily_price is 0 or negative', () => {
  component.form.patchValue({ daily_price: -100 });
  expect(component.form.valid).toBe(false);
  expect(component.form.get('daily_price')?.errors?.['min']).toBeTruthy();
});
```

## 🎯 Criterios de Aceptación
- [ ] FormControl tiene validator `Validators.min(1)`
- [ ] Template muestra mensaje de error cuando precio <= 0
- [ ] Form no puede ser submitted si precio es inválido
- [ ] Test unitario pasa exitosamente

## 🛠 Stack
- **Component**: Angular Reactive Forms
- **Validation**: Angular Validators
- **Styling**: Tailwind CSS (`.text-red-500`)
- **Testing**: Jasmine

## 📚 Referencias
- Similar validation pattern: `booking-form.component.ts:34` (date range validation)
- Error styling: `shared/components/form-error.component.html`
```

**¿Por qué este issue es mejor?**
1. ✅ Título específico menciona archivo y acción
2. ✅ Incluye código ejemplo exacto
3. ✅ Criterios de aceptación medibles
4. ✅ Referencias a patrones existentes en el código
5. ✅ Stack técnico específico

---

### Ejemplo 2: Nueva Feature UI

**Issue Original:**

```markdown
Agregar badge de verificación en el perfil
```

**Issue Optimizado para Copilot:**

```markdown
---
title: "Feature: Mostrar badge de verificación de locador en profile y dashboard"
labels: feature, copilot-ready, ui
assignees: @copilot
---

## 📋 Descripción
Los locadores verificados deben ver un badge visual que indique su estado de verificación en su perfil y dashboard.

## 🎯 Criterios de Aceptación
- [ ] Badge visible en `/profile` si `profile.verified_at !== null`
- [ ] Badge visible en `/dashboard` junto al nombre del usuario
- [ ] Diseño: Checkmark verde con texto "Verificado"
- [ ] Tooltip al hover: "Locador verificado por AutoRenta"
- [ ] Component reutilizable `VerificationBadgeComponent`
- [ ] Tests unitarios incluidos

## 🛠 Implementación Técnica

### 1. Crear Componente Standalone
**File**: `apps/web/src/app/shared/components/verification-badge/verification-badge.component.ts`

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVerified"
         class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
         title="Locador verificado por AutoRenta">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      <span>Verificado</span>
    </div>
  `,
})
export class VerificationBadgeComponent {
  @Input() isVerified = false;
}
```

### 2. Usar en ProfileComponent
**File**: `apps/web/src/app/features/profile/profile.component.ts`

```typescript
import { VerificationBadgeComponent } from '@/shared/components/verification-badge/verification-badge.component';

@Component({
  // ...
  imports: [CommonModule, VerificationBadgeComponent],
})
export class ProfileComponent {
  profile = signal<Profile | null>(null);

  get isVerified(): boolean {
    return this.profile()?.verified_at !== null;
  }
}
```

**Template**: `apps/web/src/app/features/profile/profile.component.html`

```html
<div class="flex items-center gap-2">
  <h1>{{ profile()?.full_name }}</h1>
  <app-verification-badge [isVerified]="isVerified" />
</div>
```

### 3. Usar en DashboardComponent
**File**: `apps/web/src/app/features/dashboard/dashboard.component.ts`

(Similar al ProfileComponent)

### 4. Tests
**File**: `apps/web/src/app/shared/components/verification-badge/verification-badge.component.spec.ts`

```typescript
describe('VerificationBadgeComponent', () => {
  it('should display badge when isVerified is true', () => {
    component.isVerified = true;
    fixture.detectChanges();
    expect(compiled.querySelector('.bg-green-100')).toBeTruthy();
  });

  it('should NOT display badge when isVerified is false', () => {
    component.isVerified = false;
    fixture.detectChanges();
    expect(compiled.querySelector('.bg-green-100')).toBeNull();
  });
});
```

## 🎨 Design
- Color: Green (`bg-green-100`, `text-green-800`)
- Icon: Heroicons checkmark circle
- Tooltip con `title` attribute
- Seguir spacing de design system

## 📚 Referencias
- Similar badge pattern: `apps/web/src/app/shared/components/role-badge/role-badge.component.ts`
- Profile data: `profile.verified_at` (timestamp | null)
- Auth service: `apps/web/src/app/core/services/auth.service.ts` (ya tiene `getProfile()`)

## Stack
- **Framework**: Angular 17 standalone component
- **Styling**: Tailwind CSS utility classes
- **Icons**: Heroicons (inline SVG)
- **Testing**: Jasmine + Karma
```

---

### Ejemplo 3: Mejora de Tests

**Issue Original:**

```markdown
Agregar tests a BookingService
```

**Issue Optimizado para Copilot:**

```markdown
---
title: "Tests: Aumentar coverage de BookingService a 80%+"
labels: tests, copilot-ready
assignees: @copilot
---

## 📋 Objetivo
Crear tests unitarios completos para `BookingService` para alcanzar 80%+ de cobertura.

## 📁 Archivos
- **Service**: `apps/web/src/app/core/services/bookings.service.ts`
- **Tests**: `apps/web/src/app/core/services/bookings.service.spec.ts` (crear)
- **Reference**: `apps/web/src/app/core/services/cars.service.spec.ts` (patrón similar)

## ✅ Test Cases Requeridos

### 1. Setup y Dependencies
```typescript
describe('BookingsService', () => {
  let service: BookingsService;
  let supabase: SupabaseClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingsService],
    });
    service = TestBed.inject(BookingsService);
    supabase = TestBed.inject(SupabaseClient);
  });
});
```

### 2. Test: createBooking() - Success
```typescript
it('should create booking successfully', async () => {
  const mockBooking = { car_id: '123', start_date: '2024-01-01', end_date: '2024-01-05' };
  spyOn(supabase.from('bookings'), 'insert').and.returnValue({ data: mockBooking, error: null });

  const result = await service.createBooking(mockBooking);

  expect(result.data).toEqual(mockBooking);
  expect(result.error).toBeNull();
});
```

### 3. Test: createBooking() - Error
```typescript
it('should handle error when creating booking', async () => {
  const mockError = { message: 'Car not available' };
  spyOn(supabase.from('bookings'), 'insert').and.returnValue({ data: null, error: mockError });

  const result = await service.createBooking({});

  expect(result.error).toEqual(mockError);
});
```

### 4. Test: getMyBookings()
```typescript
it('should fetch user bookings', async () => {
  const mockBookings = [{ id: '1' }, { id: '2' }];
  spyOn(supabase.from('bookings'), 'select').and.returnValue({ data: mockBookings, error: null });

  const result = await service.getMyBookings();

  expect(result.data).toEqual(mockBookings);
  expect(result.data?.length).toBe(2);
});
```

### 5. Test: approveBooking()
```typescript
it('should approve booking and lock funds', async () => {
  const bookingId = '123';
  spyOn(supabase.rpc).and.returnValue({ data: true, error: null });

  const result = await service.approveBooking(bookingId);

  expect(supabase.rpc).toHaveBeenCalledWith('approve_booking_and_lock_funds', { p_booking_id: bookingId });
  expect(result.error).toBeNull();
});
```

### 6. Test: cancelBooking()
```typescript
it('should cancel booking and release funds', async () => {
  const bookingId = '123';
  spyOn(supabase.rpc).and.returnValue({ data: true, error: null });

  const result = await service.cancelBooking(bookingId);

  expect(supabase.rpc).toHaveBeenCalledWith('cancel_booking_and_release_funds', { p_booking_id: bookingId });
});
```

## 🎯 Criterios de Aceptación
- [ ] Archivo `bookings.service.spec.ts` creado
- [ ] Tests para todos los métodos públicos del servicio
- [ ] Coverage >= 80% (verificar con `npm run test:coverage`)
- [ ] Todos los tests pasan exitosamente
- [ ] Mock de Supabase client correcto

## 🛠 Stack
- **Testing**: Jasmine + Karma
- **Mocking**: Jasmine spies (`spyOn`)
- **Pattern**: Ver `cars.service.spec.ts` para estructura similar

## 📊 Coverage Goal
```bash
# Verificar coverage después de implementar
npm run test:coverage

# Buscar en reporte:
# bookings.service.ts | 80%+ | 80%+ | 80%+ | 80%+
```
```

---

## Troubleshooting

### Copilot No Responde a Comentarios

**Problema**: Mencionaste `@copilot` pero no hizo cambios

**Soluciones**:
1. Verifica que tienes **write access** al repositorio
2. Asegúrate de que Copilot esté **enabled** en el repo
3. Usa **"Start a Review"** en vez de comentarios individuales
4. Verifica que el comentario sea **específico y accionable**

### Copilot Hace Cambios Incorrectos

**Problema**: Los cambios de Copilot no son los esperados

**Soluciones**:
1. **Itera en el PR**: Deja comentarios específicos explicando qué cambiar
2. **Mejora el issue original**: Agrega más contexto y ejemplos de código
3. **Revisa custom instructions**: Asegúrate de que estén actualizadas
4. **Trabaja manualmente**: Algunas tareas son mejor manejadas por humanos

### Copilot Rompe Tests Existentes

**Problema**: El PR de Copilot causa que tests fallen

**Soluciones**:
1. **Menciona @copilot**: `@copilot Los tests están fallando. Por favor arregla los errores en booking.service.spec.ts`
2. **Provee logs**: Copia el error del CI y pégalo en un comentario
3. **Referencia tests similares**: `@copilot Usa el mismo patrón de mocking que en cars.service.spec.ts:25`

### Copilot No Encuentra Archivos

**Problema**: Copilot dice que no puede encontrar un archivo

**Soluciones**:
1. **Usa paths absolutos**: `apps/web/src/app/core/services/bookings.service.ts`
2. **Verifica que el archivo exista**: Puede ser que el path sea incorrecto
3. **Menciona archivos relacionados**: "Está cerca de `cars.service.ts` en el mismo directorio"

### Build Failures en CI

**Problema**: El PR de Copilot no pasa CI

**Soluciones**:
1. **Sincronizar tipos**: Puede que falten tipos de Supabase actualizados
   ```markdown
   @copilot El build falló porque falta sincronizar tipos de Supabase.
   Por favor ejecuta `npm run sync:types` antes de commitear.
   ```

2. **Lint errors**:
   ```markdown
   @copilot Hay errores de lint. Por favor ejecuta `npm run lint:fix` y commitea los cambios.
   ```

3. **Test failures**:
   ```markdown
   @copilot Los tests fallan con este error:
   ```
   [Error] Expected null but got undefined in booking.service.spec.ts:45
   ```
   Por favor arregla el mock para que retorne el valor correcto.
   ```

---

## Pre-instalación de Dependencias

Para que Copilot pueda ejecutar builds y tests en su environment, necesitas configurar `copilot-setup-steps.yml`.

### Crear `.github/copilot-setup-steps.yml`

```yaml
# Copilot development environment setup
name: Setup AutoRenta Development Environment

steps:
  - name: Install pnpm
    run: npm install -g pnpm@9

  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Setup Supabase CLI
    run: |
      # Install Supabase CLI
      npm install -g supabase

  - name: Generate Supabase types
    run: pnpm run sync:types
    env:
      SUPABASE_PROJECT_ID: obxvffplochgeiclibng

  - name: Verify setup
    run: |
      node --version
      pnpm --version
      supabase --version
```

### ¿Por Qué Es Importante?

Sin este archivo, Copilot tiene que instalar dependencias mediante trial-and-error, lo cual:
- ❌ Es lento (puede tomar varios minutos)
- ❌ Es poco confiable (LLMs son no-deterministas)
- ❌ Puede fallar en dependencias complejas

Con el archivo:
- ✅ Dependencias pre-instaladas antes de que Copilot comience
- ✅ Build y tests funcionan de inmediato
- ✅ PRs de mejor calidad que pueden mergearse rápidamente

---

## Checklist: ¿Tu Issue Está Listo para Copilot?

Antes de asignar un issue a `@copilot`, verifica:

- [ ] **Título descriptivo** - Menciona acción, archivo/componente y objetivo
- [ ] **Problema claramente definido** - Explica qué está mal o qué falta
- [ ] **Criterios de aceptación específicos** - Checkboxes con requisitos medibles
- [ ] **Archivos mencionados con paths absolutos** - `apps/web/src/...`
- [ ] **Código de ejemplo incluido** - Muestra cómo debería verse la solución
- [ ] **Stack técnico especificado** - Angular/Supabase/Cloudflare/etc
- [ ] **Tests requeridos** - Si aplica, especifica qué testear
- [ ] **Referencias a código existente** - Patrones similares en el codebase
- [ ] **Labels apropiados** - `copilot-ready`, `bug`, `feature`, `tests`, etc

---

## Recursos Adicionales

### Documentación de AutoRenta
- [CLAUDE.md](./CLAUDE.md) - Guía principal
- [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md) - Arquitectura técnica
- [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) - Comandos y CI/CD
- [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md) - Supabase Storage
- [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) - Sistema de pagos

### Documentación de GitHub Copilot
- [About GitHub Copilot coding agent](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-coding-agent)
- [Repository custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [MCP Integration](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat)

---

## Conclusión

GitHub Copilot es una herramienta poderosa que puede acelerar significativamente el desarrollo en AutoRenta cuando se usa correctamente. La clave es:

1. ✅ **Issues bien definidos** - Scope claro, criterios específicos
2. ✅ **Custom instructions configuradas** - Guían a Copilot automáticamente
3. ✅ **Iteración en PRs** - Usar @copilot para ajustes
4. ✅ **Elegir tareas apropiadas** - Features acotadas, bugs específicos, tests

Con estas prácticas, Copilot puede convertirse en un miembro productivo del equipo AutoRenta.

---

**Última actualización**: 2025-11-15
**Versión**: 1.0
**Maintainer**: AutoRenta Team
