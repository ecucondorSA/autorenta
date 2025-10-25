# Guía rápida para lanzar AutoRenta

Esta guía resume los pasos mínimos para levantar el frontend de AutoRenta (`apps/web`) y probar el flujo de reservas conectado a Supabase y Mercado Pago.

## 1. Requisitos previos
- Node.js 20.x y npm 10.x (verifica con `node -v` y `npm -v`).
- Acceso a un proyecto Supabase con las tablas y funciones ya desplegadas (se puede reutilizar `obxvffplochgeiclibng`).
- Clave pública de Mercado Pago (para sandbox basta con la de pruebas).
- Opcional: Wrangler/Cloudflare para probar el worker de webhooks (`functions/workers/payments_webhook`).

## 2. Configurar variables de entorno
1. Copia los ejemplos en la raíz del repo:
   ```bash
   cp .env.example .env
   ```
   Completa `NG_APP_SUPABASE_URL` y `NG_APP_SUPABASE_ANON_KEY` con las credenciales de tu proyecto.

2. Configura el entorno local del frontend:
   ```bash
   cd apps/web
   cp .env.development.local.example .env.development.local
   ```
   - `NG_APP_SUPABASE_URL` y `NG_APP_SUPABASE_ANON_KEY` deben coincidir con el proyecto Supabase.
   - Si probás el webhook de pagos en local, apunta `NG_APP_PAYMENTS_WEBHOOK_URL` al puerto donde corra el worker (por defecto `http://localhost:8787/webhooks/payments`).
   - Para la key pública de Mercado Pago podés definir `NG_APP_MERCADOPAGO_PUBLIC_KEY` (o usar `MERCADOPAGO_PUBLIC_KEY` a nivel sistema).

> Nota: `npm start` ejecuta `tools/start-with-env.mjs`, que carga automáticamente `.env.development.local`, y `npm run build` genera `public/env.js` con `scripts/generate-env.js`. No es necesario correr esos scripts manualmente.

## 3. Instalar dependencias
Desde la raíz del monorepo:
```bash
npm install
```
El `postinstall` ya ejecuta `npm install` dentro de `apps/web`. Si preferís hacerlo manualmente:
```bash
cd apps/web
npm install
```

## 4. Levantar el frontend
Desde `apps/web` (o usando `npm run dev:web` desde la raíz):
```bash
npm run start
```
El script lanza `ng serve --configuration development` y expone la app en `http://localhost:4200/`.

## 5. Servicios complementarios
- **Webhook de pagos (opcional):**
  ```bash
  cd functions/workers/payments_webhook
  npm install
  npm run dev
  ```
  Esto levanta Wrangler en `http://localhost:8787/webhooks/payments`. Asegúrate de que `NG_APP_PAYMENTS_WEBHOOK_URL` apunte a esa URL.
- **Supabase Edge Functions:** si modificás funciones, despliega con `supabase functions deploy <nombre>` o usa los scripts definidos en `/supabase`.

## 6. Validaciones rápidas
- Ingresa con un usuario de pruebas (debe existir en Supabase Auth).
- Publica un auto y verifica que aparezca en el listado.
- Reserva el auto, completa el flujo de pago (hold o wallet) y confirma que la reserva quede en `Mis Reservas`.
- Si usas wallet, valida los movimientos en `wallet_transactions`.

## 7. Scripts útiles
- `npm run test` (desde `apps/web`) ejecuta Karma.
- `npm run build` genera `dist/web/browser` listo para Cloudflare Pages.
- `npm run deploy:pages` despliega al proyecto configurado (`autorenta-web`).

Con estos pasos deberías poder lanzar la app localmente y comprobar los principales flujos end-to-end.
