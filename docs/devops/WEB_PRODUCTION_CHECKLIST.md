# Web Production Checklist (Cloudflare Pages)

Última actualización: 2025-12-15

## Pre-flight (local)

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm test:quick`
- [ ] `pnpm build:web`

## Configuración (secrets / env)

Ver `.env.local.example` y `docs/devops/SECRETS_SETUP.md`.

- [ ] `NG_APP_SUPABASE_URL`
- [ ] `NG_APP_SUPABASE_ANON_KEY`
- [ ] `NG_APP_MAPBOX_ACCESS_TOKEN`
- [ ] `NG_APP_MERCADOPAGO_PUBLIC_KEY`
- [ ] `NG_APP_CLOUDFLARE_WORKER_URL` (si aplica)
- [ ] `NG_APP_SENTRY_DSN` y `NG_APP_SENTRY_ENVIRONMENT` (producción)

## Seguridad (headers)

- [ ] Verificar `_headers` en `apps/web/dist/web/browser/_headers` tras build
- [ ] Confirmar `Content-Security-Policy` permite:
  - Mapbox + MercadoPago
  - Supabase (`https://*.supabase.co` + `wss://*.supabase.co`)
  - Sentry (`https://*.sentry.io` + `https://*.ingest.sentry.io`) si está habilitado

## Smoke tests (manual)

- [ ] Home carga sin errores de consola
- [ ] `/cars/list`:
  - [ ] carga lista/grilla
  - [ ] toggle a mapa (no crashea)
  - [ ] búsqueda + sugerencias
  - [ ] empty state y error state se ven correctamente
- [ ] Login / logout (si aplica)
- [ ] Pago / wallet (si aplica)

## Observabilidad

- [ ] Confirmar Sentry recibe eventos (activar `NG_APP_SENTRY_DSN`)
- [ ] Revisar Cloudflare Pages logs + errores SSR si están habilitados

## Deploy

- [ ] `pnpm run deploy:web`
- [ ] Verificar URL de producción y rutas SPA (redirecciones)

