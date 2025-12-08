# 🚀 Guía de Despliegue - AutoRenta

## Despliegue Automático con GitHub Actions

El proyecto está configurado para desplegarse automáticamente a Cloudflare Pages cuando se hace push a la rama `main`.

### Workflow: `.github/workflows/build-and-deploy.yml`

El workflow ejecuta los siguientes pasos:

1. **Deploy DB Migrations** (opcional)
   - Aplica migraciones de Supabase
   - Requiere: `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`

2. **Build Application**
   - Instala dependencias con pnpm
   - Construye la aplicación Angular
   - Sube source maps a Sentry (opcional)
   - Genera artifacts para el despliegue

3. **Deploy to Cloudflare Pages**
   - Descarga los artifacts del build
   - Despliega a Cloudflare Pages usando Wrangler
   - Proyecto: `autorenta-web`
   - Branch: `main`

4. **Deploy Payment Worker** (opcional, legacy)
   - Despliega el worker de pagos mock (solo desarrollo)

5. **Smoke Tests**
   - Verifica que la aplicación esté funcionando
   - Prueba homepage, rutas SPA, y manifest PWA

### Secrets Requeridos en GitHub

Configurar en: `https://github.com/[TU_REPO]/settings/secrets/actions`

#### Cloudflare
- `CF_API_TOKEN` o `CLOUDFLARE_API_TOKEN` - Token de API de Cloudflare
- `CF_ACCOUNT_ID` o `CLOUDFLARE_ACCOUNT_ID` - ID de cuenta de Cloudflare

#### Supabase (para migraciones)
- `SUPABASE_PROJECT_ID` - ID del proyecto Supabase
- `SUPABASE_ACCESS_TOKEN` - Token de acceso de Supabase
- `SUPABASE_DB_PASSWORD` - Contraseña de la base de datos

#### Variables de Entorno de la App
- `NG_APP_SUPABASE_URL` - URL de Supabase
- `NG_APP_SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `NG_APP_MAPBOX_ACCESS_TOKEN` - Token de Mapbox
- `NG_APP_MERCADOPAGO_PUBLIC_KEY` - Clave pública de MercadoPago
- `NG_APP_PAYMENTS_WEBHOOK_URL` - URL del webhook de pagos
- `NG_APP_CLOUDFLARE_WORKER_URL` - URL del worker de Cloudflare
- `NG_APP_CAR_LOCATIONS_EDGE_FUNCTION` - URL de la función edge de ubicaciones
- `NG_APP_TIKTOK_CLIENT_ID` - Client ID de TikTok (opcional)
- `NG_APP_GOOGLE_CALENDAR_ID` - ID de Google Calendar
- `NG_APP_GOOGLE_CALENDAR_API_KEY` - API Key de Google Calendar
- `NG_APP_GOOGLE_CALENDAR_CLIENT_ID` - Client ID de Google Calendar
- `NG_APP_PAYPAL_CLIENT_ID` - Client ID de PayPal (opcional)
- `NG_APP_SENTRY_DSN` - DSN de Sentry (opcional)
- `SENTRY_AUTH_TOKEN` - Token de autenticación de Sentry (opcional)

### Cómo Ejecutar el Despliegue

#### Opción 1: Despliegue Automático (Recomendado)
1. Hacer push a la rama `main`:
   ```bash
   git add .
   git commit -m "feat: actualizar aplicación"
   git push origin main
   ```
2. El workflow se ejecutará automáticamente
3. Ver progreso en: `https://github.com/[TU_REPO]/actions`

#### Opción 2: Despliegue Manual desde GitHub Actions
1. Ir a: `https://github.com/[TU_REPO]/actions`
2. Seleccionar workflow "🚀 Build and Deploy"
3. Click en "Run workflow"
4. Seleccionar branch `main`
5. Click en "Run workflow"

#### Opción 3: Despliegue Manual desde Terminal
```bash
# 1. Build
npm run build:web

# 2. Deploy
npm run deploy:web
```

O usando wrangler directamente:
```bash
cd apps/web
wrangler pages deploy dist/web/browser --project-name=autorenta-web --branch=main
```

### Verificar Despliegue

Después del despliegue, verificar:
- URL de producción: `https://autorenta-web.pages.dev`
- Smoke tests se ejecutan automáticamente
- Verificar logs en GitHub Actions

### Troubleshooting

#### Error: "Missing API Token"
- Verificar que `CF_API_TOKEN` esté configurado en GitHub Secrets
- Obtener token en: https://dash.cloudflare.com/profile/api-tokens

#### Error: "Missing Account ID"
- Verificar que `CF_ACCOUNT_ID` esté configurado
- Encontrar Account ID en: https://dash.cloudflare.com/ (sidebar derecho)

#### Error: "Build failed"
- Verificar que todas las variables de entorno estén configuradas
- Revisar logs del build en GitHub Actions

#### Error: "Deploy failed"
- Verificar que el proyecto `autorenta-web` exista en Cloudflare Pages
- Crear proyecto si no existe:
  ```bash
  wrangler pages project create autorenta-web
  ```

### Estructura del Build

El build genera:
```
apps/web/dist/web/
├── browser/          # Archivos para Cloudflare Pages
│   ├── index.html
│   ├── _redirects    # SPA routing
│   ├── _headers      # Security headers
│   └── ...
└── ...
```

### Configuración de Cloudflare Pages

El proyecto está configurado con:
- **SPA Routing**: `_redirects` redirige todas las rutas a `index.html`
- **Security Headers**: `_headers` configura CSP, HSTS, etc.
- **Cache**: Assets con hash tienen cache de 1 año

### Monitoreo

- **GitHub Actions**: Ver logs de despliegue
- **Cloudflare Dashboard**: Ver analytics y logs
- **Sentry**: Ver errores en producción (si está configurado)


