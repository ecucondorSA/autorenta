# AutoRenta - Team Commands para Cursor Dashboard

Este archivo contiene los Team Commands que debes copiar y pegar en el **Cursor Dashboard** (web) para configurar reglas automáticas para todo tu equipo.

## Cómo Configurar

1. Ve a [Cursor Dashboard](https://cursor.sh/dashboard) → Team Settings → Commands
2. Copia cada sección de comandos y pégalos como nuevos Team Commands
3. Los comandos se aplicarán automáticamente a todos los miembros del equipo

---

## 📋 AutoRenta - Angular Patterns

**Nombre del Command**: `autorenta-angular-patterns`

**Descripción**: Reglas fundamentales para desarrollo Angular en AutoRenta

**Contenido**:
```
# AutoRenta - Angular Patterns

## Componentes
- SIEMPRE usa standalone components (Angular 17+)
- NUNCA uses NgModules (están deprecados en nuestro stack)
- Usa signals para estado reactivo (preferido sobre BehaviorSubject)
- Paths de Storage SIN bucket prefix (ej: `userId/filename`, NO `avatars/userId/filename`)

## Estructura
- Componentes: `{feature}-{type}.component.ts` (ej: `car-card.component.ts`)
- Páginas: `{feature}.page.ts` (ej: `cars-list.page.ts`)
- Servicios: `{domain}.service.ts` (ej: `bookings.service.ts`)
- Guards: `{purpose}.guard.ts` (ej: `auth.guard.ts`)
- Modelos: `{entity}.model.ts` (ej: `car.model.ts`)

## TypeScript
- Tipado estricto siempre
- No usar 'any' sin justificación
- Preferir interfaces sobre types
- Tipos de retorno explícitos en funciones públicas

## Lazy Loading
- Features se cargan lazy con `loadComponent`
- No usar `loadChildren` con módulos
```

---

## 📋 AutoRenta - Supabase Patterns

**Nombre del Command**: `autorenta-supabase-patterns`

**Descripción**: Reglas para trabajar con Supabase (Auth, Database, Storage)

**Contenido**:
```
# AutoRenta - Supabase Patterns

## Manejo de Errores
- SIEMPRE valida errores de Supabase explícitamente
- Usa destructuring: `const { data, error } = await supabase.from('table').select()`
- Si hay error, lanza excepción con mensaje descriptivo
- NUNCA ignores errores silenciosamente

## Storage Paths
- Paths SIN bucket prefix: `{userId}/{filename}`
- Ejemplo CORRECTO: `const filePath = \`${userId}/${filename}\``
- Ejemplo INCORRECTO: `const filePath = \`avatars/${userId}/${filename}\`` (falla RLS)
- RLS policies verifican `(storage.foldername(name))[1] = auth.uid()::text`

## RLS Policies
- RLS policies en TODAS las tablas
- NUNCA deshabilites RLS sin justificación
- Verifica permisos antes de queries sensibles

## Autenticación
- Usa `AuthGuard` para rutas protegidas
- Verifica `isAuthenticated()` antes de operaciones sensibles
- Roles: `locador`, `locatario`, `ambos`, `admin`
- Admin check: `profile.is_admin === true`

## Edge Functions
- Producción: MercadoPago via Supabase Edge Functions
- Desarrollo: Mock webhooks (Cloudflare Worker local)
- NUNCA uses `SUPABASE_SERVICE_ROLE_KEY` en frontend
```

---

## 📋 AutoRenta - Testing Standards

**Nombre del Command**: `autorenta-testing-standards`

**Descripción**: Estándares de testing y cobertura

**Contenido**:
```
# AutoRenta - Testing Standards

## Cobertura Mínima
- Cobertura mínima requerida: 80% por módulo
- No disminuir cobertura existente
- Nuevas features deben incluir tests

## Tests Unitarios
- Framework: Karma + Jasmine
- Ubicación: `*.spec.ts` junto al archivo fuente
- Mock de Supabase: Usa `SupabaseClientService` mock
- Tests de servicios: Verifica lógica de negocio
- Tests de componentes: Verifica renderizado y eventos

## Tests E2E
- Framework: Playwright
- Ubicación: `tests/e2e/`
- Flujos completos: Login → Acción → Verificación
- Helpers: Usa `tests/helpers/` para setup común

## Comandos
- Tests rápidos: `npm run test:quick` (sin coverage)
- Tests completos: `npm run test` (con coverage)
- E2E: `npm run test:e2e`
- CI: `npm run ci` (lint + test + build)

## Buenas Prácticas
- Tests deben ser independientes (no dependencias entre tests)
- Usa `beforeEach` para setup común
- Mock de servicios externos (MercadoPago, Mapbox)
- Verifica tanto casos exitosos como errores
```

---

## 📋 AutoRenta - Security & Performance

**Nombre del Command**: `autorenta-security-performance`

**Descripción**: Reglas de seguridad y performance

**Contenido**:
```
# AutoRenta - Security & Performance

## Seguridad

### ⚠️ NUNCA hagas:
- Commitear secrets o tokens (usa `.env.development.local`)
- Deshabilitar RLS en tablas de Supabase
- Usar `SUPABASE_SERVICE_ROLE_KEY` en frontend
- Inyección SQL directa (siempre usa Supabase SDK)
- Deshabilitar CSP o CORS sin justificación

### ✅ SIEMPRE:
- Valida input del usuario (archivos, formularios)
- Usa RLS policies para proteger datos
- Sanitiza URLs y paths antes de storage
- Verifica autenticación en routes protegidas
- Limita tamaño de uploads (2MB para imágenes)

## Performance

### Optimizaciones
- Lazy loading de features
- OnPush change detection cuando sea posible
- Signals para estado reactivo (más eficiente que BehaviorSubject)
- Bundle analysis: `npm run build -- --stats-json`
- Limita queries a Supabase (usa select específicos, no `*`)

### Recursos
- Imágenes: Optimiza antes de upload (max 2MB)
- Lazy load de imágenes: Usa `loading="lazy"`
- Code splitting: Features cargados bajo demanda
```

---

## 📋 AutoRenta - Code Style

**Nombre del Command**: `autorenta-code-style`

**Descripción**: Estilo de código y formato

**Contenido**:
```
# AutoRenta - Code Style

## Prettier
- Single quotes: `'string'`
- Print width: 100 caracteres
- No semicolons opcionales
- Trailing commas: ES5

## ESLint
- Import order: alfabético, agrupado por tipo
- Return types explícitos en funciones públicas
- No `console.log` en producción (usa `console.error` para errores)
- Auto-fix: `npm run lint:fix`

## Tailwind CSS
- Usa utility classes, evita CSS custom
- Ejemplo:
  ```html
  <div class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-md">
    <img class="h-16 w-16 rounded-full object-cover" [src]="car.imageUrl" />
  </div>
  ```

## Git
- Feature branches: `feature/nombre-descriptivo`
- Audit branches: `audit/feature-name` (para debugging complejo)
- Commit messages: Descriptivos y en español
- Pre-commit hooks: Husky ejecuta lint + format automáticamente
```

---

## 📋 AutoRenta - Payment System

**Nombre del Command**: `autorenta-payment-system`

**Descripción**: Reglas críticas del sistema de pagos

**Contenido**:
```
# AutoRenta - Payment System (CRÍTICO)

## Producción
- MercadoPago via Supabase Edge Functions
- Webhook: `supabase/functions/mercadopago-webhook/`
- NUNCA uses Cloudflare Worker mock en producción

## Desarrollo
- Mock webhook opcional (Cloudflare Worker local)
- Solo para testing rápido sin MercadoPago
- Protegido por guards de `environment.production`

## Wallet System
- Depósitos vía MercadoPago (tarjeta, débito, efectivo)
- Wallet interno con `balance` y `locked_balance`
- Efectivo marcado como `non_withdrawable`
- Split payments: locador (85%) + plataforma (15%)

## Validaciones
- Verifica estado de pago antes de confirmar booking
- Lock de fondos durante booking activo
- Validación de disponibilidad antes de procesar pago
```

---

## 📋 AutoRenta - Architecture Overview

**Nombre del Command**: `autorenta-architecture`

**Descripción**: Resumen de arquitectura del proyecto

**Contenido**:
```
# AutoRenta - Architecture Overview

## Stack Tecnológico
- Frontend: Angular 17 (standalone components) + Tailwind CSS
- Backend: Supabase (PostgreSQL + Edge Functions)
- Hosting: Cloudflare Pages (web) + Workers (webhooks)
- Payments: MercadoPago (producción) via Supabase Edge Functions
- Maps: Mapbox GL JS

## Estructura de Directorios
```
apps/web/src/app/
├── core/                    # Servicios core, guards, interceptors
│   ├── guards/              # AuthGuard (CanMatchFn)
│   ├── interceptors/        # supabaseAuthInterceptor (JWT)
│   ├── models/              # Interfaces TypeScript
│   └── services/            # Business logic
├── features/                # Features lazy-loaded
│   ├── auth/                # Login, register, reset
│   ├── cars/                # List, detail, publish
│   ├── bookings/            # Booking management
│   └── admin/               # Admin dashboard
└── shared/                  # Componentes compartidos
    ├── components/          # car-card, date-picker, etc
    ├── pipes/
    └── utils/
```

## Documentación
- CLAUDE.md: Documentación completa del proyecto
- CLAUDE_ARCHITECTURE.md: Arquitectura técnica detallada
- CLAUDE_PAYMENTS.md: Sistema de pagos
- CLAUDE_STORAGE.md: Supabase Storage y RLS
```

---

## 📝 Notas de Configuración

### Orden Recomendado de Configuración

1. **autorenta-architecture** (primero, para contexto general)
2. **autorenta-angular-patterns** (patrones fundamentales)
3. **autorenta-supabase-patterns** (backend)
4. **autorenta-code-style** (formato y estilo)
5. **autorenta-testing-standards** (calidad)
6. **autorenta-security-performance** (seguridad)
7. **autorenta-payment-system** (sistema crítico)

### Actualización

Cuando actualices estos comandos:
1. Edita este archivo localmente
2. Copia el contenido actualizado al Dashboard
3. Notifica al equipo sobre cambios importantes

### Verificación

Para verificar que los comandos están activos:
- Abre Cursor
- Inicia un nuevo chat con Agent
- Menciona "Angular" o "Supabase"
- El agente debería seguir automáticamente los patrones definidos

---

**Última actualización**: 2025-01-XX
**Versión**: 1.0.0
**Proyecto**: AutoRenta - Plataforma de alquiler de autos (Argentina)

