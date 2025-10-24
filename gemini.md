# GEMINI.md

Este archivo proporciona guías específicas para Gemini AI cuando trabaja con el código de este repositorio.

## Visión General del Proyecto

**AutoRenta** es un marketplace MVP de alquiler de autos para Argentina, construido con Angular 17 (componentes standalone), Supabase y Cloudflare Workers/Pages. El proyecto consiste en una aplicación web y un worker de webhooks de pagos.

## Configuración de Gemini

### ⏱️ Timeouts Configurados
```bash
# Timeout por defecto configurado
export BASH_DEFAULT_TIMEOUT_MS=900000  # 15 minutos (900 segundos)
```

### 🎯 Modo de Trabajo
- **Análisis profundo**: Usa el modelo con mayor capacidad de razonamiento cuando sea necesario
- **Ejecución de comandos largos**: Todos los comandos aprovechan el timeout de 900s
- **No crear deuda técnica**: Prioridad absoluta en mantener calidad del código

## Estructura del Repositorio

```
autorenta/
├── apps/
│   └── web/                         # Angular 17 standalone app con Tailwind
│       └── src/app/
│           ├── core/                # Servicios core, guards, interceptors, models
│           │   ├── guards/          # AuthGuard para protección de rutas
│           │   ├── interceptors/    # supabaseAuthInterceptor para JWT
│           │   ├── models/          # Interfaces TypeScript (User, Car, Booking, Payment)
│           │   └── services/        # Lógica de negocio
│           │       ├── supabase-client.service.ts  # Cliente Supabase centralizado
│           │       ├── auth.service.ts             # Operaciones de autenticación
│           │       ├── cars.service.ts             # Operaciones CRUD de autos
│           │       ├── bookings.service.ts         # Gestión de reservas
│           │       ├── payments.service.ts         # Manejo de intenciones de pago
│           │       └── admin.service.ts            # Operaciones de admin
│           ├── features/            # Módulos de funcionalidades (lazy-loaded)
│           │   ├── auth/            # Login, register, reset-password
│           │   ├── cars/            # List, detail, publish, my-cars
│           │   ├── bookings/        # Gestión de reservas
│           │   └── admin/           # Dashboard de admin
│           └── shared/              # Componentes compartidos, pipes, utils
│               ├── components/      # car-card, city-select, date-range-picker, upload-image
│               ├── pipes/
│               └── utils/
├── functions/
│   └── workers/
│       └── payments_webhook/        # Cloudflare Worker para webhooks de pago
│           └── src/index.ts         # Handler de webhook de pagos
├── supabase/
│   └── migrations/                  # Migraciones de base de datos
└── database/                        # Scripts SQL de setup
```

## Comandos Principales

### 🚀 Comandos Raíz del Proyecto

**Workflows Automatizados:**
```bash
npm run workflows          # Ver ayuda de todos los workflows
npm run ci                 # Pipeline CI/CD completo (lint + test + build)
npm run dev                # Inicia entorno completo (web + worker)
npm run deploy             # Deploy completo a producción
npm run test:quick         # Tests rápidos sin coverage
npm run test:coverage      # Tests completos con coverage
npm run lint:fix           # Auto-fix de linting issues
npm run install:all        # Instala todas las dependencias
```

### 📱 Aplicación Web Angular (desde `apps/web/`)

**Desarrollo:**
```bash
npm run start              # Dev server en http://localhost:4200
npm run build              # Build de producción a dist/autorenta-web
npm run lint               # ESLint con Angular ESLint (flat config)
npm run format             # Prettier con cache
npm run test               # Tests unitarios Karma/Jasmine
```

**Deployment:**
```bash
npm run deploy:pages       # Build + deploy a Cloudflare Pages
```

**Shortcuts del Worker (desde raíz de web app):**
```bash
npm run worker:dev         # Inicia worker de webhooks localmente
npm run worker:deploy      # Deploy de worker de webhooks
```

### ⚡ Payment Webhook Worker (desde `functions/workers/payments_webhook/`)

```bash
npm install                # Instalar dependencias
npm run dev                # Wrangler dev en http://localhost:8787/webhooks/payments
npm run build              # Build TypeScript a dist/
npm run deploy             # Deploy a Cloudflare Workers
```

**Configurar secretos del worker:**
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Patrones de Arquitectura

### Arquitectura Angular

- **Componentes Standalone**: Todos los componentes son standalone, sin NgModules
- **Lazy Loading**: Features cargadas de forma lazy vía configuración de rutas (`loadComponent`, `loadChildren`)
- **Route Guards**: `AuthGuard` (CanMatchFn) protege rutas autenticadas (`/cars/publish`, `/bookings`, `/admin`)
- **HTTP Interceptor**: `supabaseAuthInterceptor` adjunta tokens JWT a requests HTTP salientes
- **Dependency Injection**: `injectSupabase()` proporciona acceso directo al cliente Supabase

### Gestión de Estado

- **Cliente Supabase**: Centralizado en `SupabaseClientService` con persistencia de sesión y auto-refresh
- **Servicios**: Lógica de negocio encapsulada en servicios dedicados (Auth, Cars, Bookings, Payments, Admin)
- **Sin librería de estado**: Usa observables RxJS y signals de Angular para reactividad

### Flujo de Autenticación

1. Usuario hace login vía `AuthService.login()` → Supabase Auth
2. Sesión persistida automáticamente por cliente Supabase
3. `AuthGuard` verifica `AuthService.isAuthenticated()` en rutas protegidas
4. `supabaseAuthInterceptor` agrega JWT a requests de API

### Roles de Usuario

- **locador**: Dueño de auto (puede publicar autos)
- **locatario**: Arrendatario (puede reservar autos)
- **ambos**: Tanto dueño como arrendatario
- **Admin**: Flag `is_admin` en perfil (acceso a `/admin`)

## Integración con Supabase

### Tablas Principales

- `profiles`: Perfil de usuario con rol y flag de admin
- `cars`: Listados de autos con status (draft, pending, active, suspended)
- `car_photos`: Imágenes de autos almacenadas en Supabase Storage
- `bookings`: Reservas de alquiler con seguimiento de status
- `payments`: Registros de pago vinculados a reservas
- `payment_intents`: Intenciones de pago del proveedor

### Funciones RPC

- `request_booking`: Crea reserva con validación
- `wallet_initiate_deposit`: Crea transacción de depósito pendiente
- `wallet_confirm_deposit`: Confirma depósito y acredita fondos (llamada por webhook)
- `wallet_get_balance`: Retorna balance de wallet del usuario
- `wallet_lock_funds`: Bloquea fondos para reserva
- `wallet_unlock_funds`: Desbloquea fondos después de reserva

## Sistema de Wallet

### Tablas del Wallet

- `user_wallets`: Balance de usuario y fondos bloqueados (una fila por usuario)
- `wallet_transactions`: Todas las operaciones de wallet (depósitos, retiros, pagos, bloqueos, desbloqueos)

### Edge Functions

- `mercadopago-create-preference`: Crea preferencia de pago MercadoPago para depósitos
- `mercadopago-webhook`: Procesa notificaciones IPN de MercadoPago

### Flujo de Depósito

1. Usuario hace clic en "Depositar" → Frontend llama `wallet_initiate_deposit()`
2. RPC crea transacción pendiente → Retorna transaction_id
3. Frontend llama Edge Function `mercadopago-create-preference` con transaction_id
4. Edge Function crea preferencia → Retorna init_point (URL de checkout)
5. Usuario redirigido a MercadoPago → Completa pago
6. MercadoPago envía IPN → Llama Edge Function `mercadopago-webhook`
7. Webhook verifica pago → Llama `wallet_confirm_deposit()`
8. RPC actualiza status de transacción → Acredita fondos a wallet de usuario
9. Usuario redirigido de vuelta → Balance actualizado

### Detalles Clave de Implementación

- ✅ **Moneda**: Siempre ARS (requerido por MercadoPago Argentina)
- ✅ **Idempotencia**: Webhook maneja notificaciones duplicadas de forma segura
- ✅ **Limpieza de token**: Access token es trimmed y sanitized
- ✅ **Sin auto_return**: No funciona con localhost HTTP
- ✅ **Logging**: Logs de debug extensivos para troubleshooting
- ✅ **Fallback hardcoded**: Token tiene fallback para desarrollo local
- ✅ **RLS**: Todas las operaciones protegidas por Row Level Security

**Documentación completa**: Ver `WALLET_SYSTEM_DOCUMENTATION.md`

## Arquitectura de Supabase Storage

### Buckets de Storage

| Bucket | Propósito | Público | Patrón de Path |
|--------|-----------|---------|----------------|
| `avatars` | Fotos de perfil de usuario | ✅ Sí | `{user_id}/{filename}` |
| `car-images` | Fotos de listados de autos | ✅ Sí | `{user_id}/{car_id}/{filename}` |
| `documents` | Documentos de verificación | ❌ No | `{user_id}/{document_type}/{filename}` |

### Convenciones de Path de Storage

**CRÍTICO**: Los paths de storage NO deben incluir el nombre del bucket como prefijo.

```typescript
// ✅ CORRECTO - Path sin prefijo de bucket
const filePath = `${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);

// ❌ INCORRECTO - Incluyendo nombre de bucket en path
const filePath = `avatars/${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);
```

**¿Por qué?** Las políticas RLS validan que la primera carpeta en el path coincida con `auth.uid()`:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Si incluyes el prefijo del bucket, la verificación de política falla:
- Con `avatars/user-id/file.jpg`: `foldername()[1]` = `'avatars'` ❌
- Con `user-id/file.jpg`: `foldername()[1]` = `user-id` ✅

### Políticas RLS para Storage

Ejemplo de políticas para avatares:

```sql
-- Usuarios pueden subir a su propia carpeta
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuarios pueden actualizar sus propios archivos
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuarios pueden eliminar sus propios archivos
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Cualquiera puede ver (bucket público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

## Herramientas de Calidad de Código

### Configuración de ESLint (Flat Config)

- **Angular ESLint**: Reglas para componentes y templates
- **TypeScript ESLint**: Verificación de tipos estricta
- **Plugin de Import**: Fuerza orden de imports (alfabetizado, agrupado por tipo)
- **Tipos de retorno explícitos**: Requeridos en todas las funciones
- **Variables no usadas**: Errores excepto args con prefijo `_`

### Prettier

- **Print width**: 100
- **Single quotes**: Habilitado
- **Angular HTML**: Parser customizado para templates
- **Plugin**: `prettier-plugin-organize-imports` para auto-ordenamiento de imports

### Husky + lint-staged

- **Pre-commit**: Ejecuta Prettier y ESLint en archivos staged
- **Setup**: `npm run prepare` instala hooks de Husky

## Variables de Entorno

**Angular (`.env.development.local`):**
```bash
NG_APP_SUPABASE_URL=            # URL del proyecto Supabase
NG_APP_SUPABASE_ANON_KEY=       # Key anon/public de Supabase
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
```

**Cloudflare Worker (vía `wrangler secret`):**
```bash
SUPABASE_URL=                   # URL del proyecto Supabase
SUPABASE_SERVICE_ROLE_KEY=      # Key service role de Supabase (admin)
```

## Decisiones de Diseño Clave

1. **Componentes Standalone**: Simplifica arquitectura, alineado con dirección moderna de Angular
2. **Flat ESLint Config**: Usa nuevo formato de flat config (eslint.config.mjs)
3. **Mock Payment Provider**: Simplifica desarrollo MVP, listo para integración con Mercado Pago
4. **Acceso basado en roles**: Tabla única de usuarios con campo de rol en vez de tablas separadas
5. **Cloudflare Pages**: Hosting estático con rendimiento edge
6. **Cloudflare Workers**: Manejo de webhooks serverless sin servidor backend

## Workflow de Debugging Vertical Stack

Cuando debugueas issues complejos que abarcan múltiples capas de la aplicación, usa el enfoque **Vertical Stack Debugging**.

### Cuándo Usar

- Violaciones de políticas RLS
- Fallos de upload de storage
- Issues de autenticación
- Problemas de flujo de datos entre capas
- Bugs de integración entre frontend y backend

### Proceso

1. **Crear rama de auditoría**
   ```bash
   git checkout -b audit/nombre-feature
   ```

2. **Mapear el Stack Completo**
   Trazar la feature a través de todas las capas:
   ```
   Componente UI → Service → SDK → Storage/DB → RLS → Schema
   ```

3. **Documentar Hallazgos**
   Crear documento de auditoría detallado (ej: `PHOTO_UPLOAD_AUDIT.md`):
   - Análisis de schema de base de datos
   - Políticas RLS
   - Código de capa de servicio
   - Integración de componente
   - Identificación de causa raíz
   - Plan de implementación de fix

4. **Implementar y Testear**
   - Aplicar fixes a todas las capas afectadas
   - Verificar políticas RLS
   - Testear flujo end-to-end
   - Documentar solución

5. **Merge y Limpieza**
   ```bash
   git checkout main
   git merge audit/nombre-feature --no-ff
   git branch -d audit/nombre-feature
   ```

## Errores Comunes a Evitar

### 1. Errores de Path de Storage

**Problema**: Incluir nombre de bucket en path de storage
```typescript
// ❌ INCORRECTO
const filePath = `avatars/${userId}/${filename}`;
```

**Solución**: Omitir nombre de bucket
```typescript
// ✅ CORRECTO
const filePath = `${userId}/${filename}`;
```

### 2. Violaciones de Políticas RLS

**Problema**: `new row violates row-level security policy`

**Pasos de Debug**:
1. Verificar si usuario está autenticado: `await supabase.auth.getUser()`
2. Verificar que estructura de path coincida con expectativas de política
3. Testear política en editor SQL de Supabase con UUID de tu usuario
4. Comparar con ejemplos funcionando (ej: `CarsService.uploadPhoto()`)

### 3. Desajustes de Tipos TypeScript

**Problema**: Tipos de base de datos no coinciden con código

**Solución**: Mantener `database.types.ts` en sync con schema de base de datos

### 4. Límites de Tamaño de Archivo

**Problema**: Archivos muy grandes para Supabase Storage

**Solución**: Validar antes de upload
```typescript
if (file.size > 2 * 1024 * 1024) {
  throw new Error('El archivo no debe superar 2MB');
}
```

## Integración Model Context Protocol (MCP)

### Servidores MCP Configurados

AutoRenta usa los servidores MCP oficiales de Cloudflare para workflows mejorados de desarrollo y deployment. Configuración ubicada en `.claude/config.json`.

**Servidores Activos (Tier Gratuito)**:

| Servidor | URL | Propósito |
|----------|-----|-----------|
| **cloudflare-builds** | `https://builds.mcp.cloudflare.com/mcp` | Deploy y gestión de builds de Pages/Workers |
| **cloudflare-docs** | `https://docs.mcp.cloudflare.com/mcp` | Referencia rápida de documentación Cloudflare |
| **cloudflare-bindings** | `https://bindings.mcp.cloudflare.com/mcp` | Gestión de bindings de Workers (R2, KV, D1, AI) |

## Prioridades del Proyecto

### ✅ Objetivos Actuales

1. **No crear deuda técnica nueva**: Prioridad ABSOLUTA
2. **Mantener arquitectura standalone**: Seguir patrones establecidos
3. **Optimizar Web Vitals**: Lighthouse 95+ en todas las métricas
4. **100% Type coverage**: TypeScript estricto
5. **85%+ Test coverage**: Mantener calidad de tests

### 🚫 Anti-Patrones a Evitar

- Duplicar componentes existentes
- Crear archivos innecesarios
- Ignorar configuraciones de timeout (siempre 900s)
- Romper convenciones de naming establecidas
- Ignorar políticas RLS

### 📈 Métricas a Mantener

- **Bundle size**: <2MB
- **Lighthouse**: 95+ en todas las métricas
- **Type coverage**: 100%
- **Test coverage**: 85%+
- **Build time**: <90s

## Recursos de Documentación

### Documentos Clave

- `CLAUDE.md` - Guía principal del proyecto (referencia)
- `README.md` - Información general del proyecto
- `PATTERNS.md` - Patrones de código y templates
- `WALLET_SYSTEM_DOCUMENTATION.md` - Sistema de wallet completo
- `DATABASE_STRUCTURE.md` - Estructura de base de datos
- `DEPLOYMENT_GUIDE.md` - Guía de deployment

### Scripts de Utilidad

- `tools/claude-workflows.sh` - Scripts automatizados de workflow
- `tools/sync-types.sh` - Sincronización de tipos de base de datos
- `tools/check-skills.sh` - Verificación de skills disponibles

## Recordatorios para Gemini

1. **Timeout**: Siempre 900 segundos para comandos largos
2. **No crear deuda técnica**: Este momento es para resolver deuda técnica, no crearla
3. **Seguir patrones**: Siempre seguir los patrones establecidos en PATTERNS.md
4. **Storage paths**: NUNCA incluir nombre de bucket en paths
5. **RLS policies**: Siempre verificar políticas antes de implementar features de storage
6. **TypeScript estricto**: Tipos de retorno explícitos en todas las funciones
7. **Tests**: Escribir tests para nueva funcionalidad
8. **Documentación**: Actualizar documentación relevante después de cambios

---

**Última actualización**: Octubre 2025
**Versión del proyecto**: 0.1.0
**Arquitectura**: Angular 17 Standalone + Supabase + Cloudflare
