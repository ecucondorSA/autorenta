# AutorentA

Marketplace MVP para alquiler de autos en Argentina desarrollado con Angular 17, Supabase y Cloudflare Workers/Pages. Este repositorio incluye la aplicación web, el worker para webhooks de pagos simulados y la estructura base para integraciones futuras.

## Estructura principal

```
autorenta/
  apps/
    web/                # Aplicación Angular standalone + Tailwind
  functions/
    workers/
      payments_webhook/ # Worker de Cloudflare para webhooks de pago
  supabase/
    README.md           # Documentación de esquemas/migraciones aplicadas
  .env.example
```

## Requisitos previos

- Node.js 20+
- npm 10+
- Cuenta Supabase con las tablas `profiles`, `cars`, `car_photos`, `bookings`, `payments`, `payment_intents`
- Cuenta Cloudflare con Pages y Workers habilitados

## Configuración inicial

1. Copiá las variables de entorno y completalas con tus credenciales:

   ```bash
   cp .env.example .env
   cp apps/web/.env.development.local.example apps/web/.env.development.local
   ```

   > Para la aplicación Angular usá las variables prefijadas con `NG_APP_`. El Worker debe recibir sus secretos con `wrangler secret put` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

2. Instalá las dependencias:

   ```bash
   cd apps/web
   npm install
   ```

3. Verificá que Husky esté instalado (se ejecuta automáticamente vía `npm run prepare`).

## Desarrollo local

- **Aplicación Angular**

  ```bash
  cd apps/web
  npm run start
  ```

  La app queda disponible en `http://localhost:4200`.

- **Worker de pagos (mock)**

  ```bash
  cd functions/workers/payments_webhook
  npm install
  npm run dev
  ```

  Wrangler expone el endpoint en `http://localhost:8787/webhooks/payments` (puenteado en la app vía `NG_APP_PAYMENTS_WEBHOOK_URL`).

## Scripts útiles (Angular)

- `npm run start` – servidor de desarrollo
- `npm run build` – build optimizada (dist/autorenta-web)
- `npm run lint` – ESLint + Angular ESLint con flat config
- `npm run format` – Prettier con cache
- `npm run test` – Karma/Jasmine en modo CLI
- `npm run deploy:pages` – build + despliegue a Cloudflare Pages (requiere autenticación de Wrangler)
- `npm run worker:dev` – atajo para levantar el worker desde la raíz del repo
- `npm run worker:deploy` – atajo para desplegar el worker

## Integración con Supabase

- `SupabaseClientService` centraliza la inicialización del SDK con Signals.
- `AuthService`, `CarsService`, `BookingsService`, `PaymentsService` y `AdminService` encapsulan las operaciones frecuentes (ver `apps/web/src/app/core/services`).
- El guard `AuthGuard` protege rutas de locadores/locatarios/admin.
- El interceptor `supabaseAuthInterceptor` adjunta el JWT en peticiones HTTP salientes.

Consulta `supabase/README.md` para detalles del esquema y funciones RPC (`request_booking`, etc.).

## Despliegue en Cloudflare Pages

1. Autenticá Wrangler:

   ```bash
   npm create cloudflare@latest
   wrangler login
   ```

2. Desde `apps/web` ejecutá:

   ```bash
   npm run build
   wrangler pages deploy dist/autorenta-web --project-name=autorenta
   ```

3. Configurá las variables de entorno en el proyecto Pages (`NG_APP_*`).

## Despliegue del Worker

1. En `functions/workers/payments_webhook` seteá los secretos:

   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

2. Ejecutá el despliegue:

   ```bash
   npm run deploy
   ```

3. Asigná la URL del worker a `NG_APP_PAYMENTS_WEBHOOK_URL` en Pages.

## Próximos pasos sugeridos

1. Agregar KV Namespace al Worker para idempotencia real.
2. Integrar proveedor de pagos (ej. Mercado Pago) reemplazando el flujo mock.
3. Añadir tests unitarios/E2E por módulo (Auth, Cars, Bookings).
4. Implementar notificaciones en tiempo real (Supabase Realtime) para reservas.
5. Añadir una sección de perfil con verificación de identidad de locadores.
