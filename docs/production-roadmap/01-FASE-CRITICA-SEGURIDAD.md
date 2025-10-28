# 🔒 Fase 01: Seguridad Crítica - Eliminar Secretos Expuestos

**Prioridad:** 🔴 P0 (BLOCKER)
**Tiempo estimado:** 3-5 días
**Impacto:** 40% → 55%
**Estado:** ⏳ Por implementar

---

## 🎯 Objetivo

Eliminar TODOS los secretos y credenciales del repositorio y migrarlos a variables de entorno seguras.

## 🔴 Problema Actual - Análisis Detallado

### Archivos con secretos expuestos:

1. **apps/web/public/env.js (líneas 5-11)**
   - SUPABASE_URL expuesta
   - SUPABASE_ANON_KEY expuesta
   - Accesible públicamente en el navegador

2. **apply_migration.sh (líneas 8-19)**
   - Database credentials en texto plano
   - DB_PASSWORD hardcoded
   - DB_HOST hardcoded

3. **verify-real-payments.sh (línea 6)**
   - MERCADOPAGO_ACCESS_TOKEN expuesto
   - Token de producción en script

4. **Archivos adicionales a auditar:**
   - Buscar en: `supabase/functions/**/index.ts`
   - Buscar en: `functions/workers/**/*`
   - Buscar en: `.env.*` files
   - Buscar en: `wrangler.toml`

### Impacto del problema:

- 🔴 Cualquiera con acceso al repo puede:
  - Acceder a la base de datos
  - Operar contra producción
  - Leer/modificar datos de usuarios
  - Ejecutar transacciones de MercadoPago

- 🔴 Riesgo de seguridad: CRÍTICO
- 🔴 Compliance: FAIL (no cumple estándares)

---

## ✅ Solución Propuesta

### Arquitectura de Secretos

```
Desarrollo Local:
├─ .env.local (gitignored)
├─ .env.example (template público)
└─ Script de validación

GitHub Actions:
├─ GitHub Secrets (encrypted)
├─ Environment variables por workflow
└─ No secrets en logs

Cloudflare Workers:
├─ wrangler.toml (sin secrets)
├─ Secrets via CLI: wrangler secret put
└─ Variables en dashboard

Supabase Edge Functions:
├─ supabase secrets set
├─ Deno.env.get() en runtime
└─ No hardcoding
```

---

## 📝 Implementación Paso a Paso

### Paso 1: Crear .env.example (Template)

**Archivo:** `apps/web/.env.example`

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-mp-token-here
MERCADOPAGO_PUBLIC_KEY=your-public-key-here

# Database (for migrations)
DB_HOST=db.your-project.supabase.co
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_PORT=5432

# Mapbox
MAPBOX_ACCESS_TOKEN=your-mapbox-token

# App Configuration
APP_BASE_URL=http://localhost:4200
NODE_ENV=development
```

**Comandos:**
```bash
cd /home/edu/autorenta/apps/web
cp .env.example .env.local
# Editar .env.local con valores reales
```

---

### Paso 2: Actualizar .gitignore

**Archivo:** `.gitignore` (añadir al final)

```bash
# Environment variables
.env
.env.local
.env.*.local
.env.development
.env.production
*.env

# Supabase
supabase/.env
supabase/.env.local

# Worker secrets
functions/workers/**/*.env
wrangler.env

# Scripts con secretos
*-secrets.sh
*-credentials.sh
```

**Comandos:**
```bash
cd /home/edu/autorenta

echo "
# Environment variables - NEVER COMMIT
.env
.env.local
.env.*.local
*.env
supabase/.env
" >> .gitignore

git add .gitignore
git commit -m "security: update gitignore for secrets"
```

---

### Paso 3: Remover secretos de apps/web/public/env.js

**Problema actual:** Archivo expone credenciales en el cliente

**Archivo:** `apps/web/public/env.js`

**Antes (MAL ❌):**
```javascript
window.env = {
  SUPABASE_URL: 'https://obxvffplochgeiclibng.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...',
  // etc
};
```

**Después (BIEN ✅):**
```javascript
// apps/web/public/env.js
window.env = {
  // Variables públicas cargadas en build-time
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}',
  MAPBOX_ACCESS_TOKEN: '${MAPBOX_ACCESS_TOKEN}',
  APP_BASE_URL: '${APP_BASE_URL}',
};
```

**Script de reemplazo (build-time):**

Crear: `apps/web/scripts/inject-env.sh`

```bash
#!/bin/bash

# Script para inyectar variables de entorno en env.js durante build

ENV_FILE="dist/web/browser/env.js"

if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local no encontrado"
  exit 1
fi

# Cargar variables
source .env.local

# Reemplazar placeholders
sed -i "s|\${SUPABASE_URL}|${SUPABASE_URL}|g" $ENV_FILE
sed -i "s|\${SUPABASE_ANON_KEY}|${SUPABASE_ANON_KEY}|g" $ENV_FILE
sed -i "s|\${MAPBOX_ACCESS_TOKEN}|${MAPBOX_ACCESS_TOKEN}|g" $ENV_FILE
sed -i "s|\${APP_BASE_URL}|${APP_BASE_URL}|g" $ENV_FILE

echo "✅ Variables inyectadas en env.js"
```

**Comandos:**
```bash
cd /home/edu/autorenta/apps/web

# Crear script
mkdir -p scripts
cat > scripts/inject-env.sh << 'SCRIPT'
[contenido del script arriba]
SCRIPT

chmod +x scripts/inject-env.sh

# Actualizar package.json
# Añadir en scripts:
# "build": "ng build && ./scripts/inject-env.sh"
```

---

### Paso 4: Migrar apply_migration.sh

**Archivo:** `apply_migration.sh`

**Antes (MAL ❌):**
```bash
DB_HOST="db.obxvffplochgeiclibng.supabase.co"
DB_PASSWORD="hardcoded-password"
```

**Después (BIEN ✅):**
```bash
#!/bin/bash

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
else
  echo "❌ Error: .env.local no encontrado"
  echo "Copia .env.example a .env.local y configura tus credenciales"
  exit 1
fi

# Validar que existan las variables
if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: Variables DB_HOST o DB_PASSWORD no definidas"
  exit 1
fi

echo "✅ Conectando a: $DB_HOST"

# Usar variables en lugar de hardcoded
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  -f "$1"
```

**Comandos:**
```bash
cd /home/edu/autorenta

# Backup del archivo actual
cp apply_migration.sh apply_migration.sh.backup

# Reemplazar contenido
cat > apply_migration.sh << 'SCRIPT'
[contenido nuevo arriba]
SCRIPT

chmod +x apply_migration.sh
```

---

### Paso 5: Migrar verify-real-payments.sh

**Similar al paso anterior**

```bash
#!/bin/bash

# Cargar env
source .env.local

# Validar
if [ -z "$MERCADOPAGO_ACCESS_TOKEN" ]; then
  echo "❌ MERCADOPAGO_ACCESS_TOKEN no definido"
  exit 1
fi

# Usar variable
curl -X GET \
  "https://api.mercadopago.com/v1/payments/$1" \
  -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN"
```

---

### Paso 6: Configurar GitHub Secrets

**En GitHub UI:**

1. Ir a: `https://github.com/ecucondorSA/autorenta/settings/secrets/actions`
2. Click "New repository secret"
3. Agregar cada secret:

```
Name: SUPABASE_URL
Value: https://obxvffplochgeiclibng.supabase.co

Name: SUPABASE_ANON_KEY
Value: eyJhbGc...

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc...

Name: MERCADOPAGO_ACCESS_TOKEN
Value: 07405c436053...

Name: DB_HOST
Value: db.obxvffplochgeiclibng.supabase.co

Name: DB_PASSWORD
Value: [password real]
```

**Via CLI (alternativo):**

```bash
cd /home/edu/autorenta

# Desde .env.local
gh secret set SUPABASE_URL < <(grep SUPABASE_URL .env.local | cut -d '=' -f2)
gh secret set SUPABASE_ANON_KEY < <(grep SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
# ... repetir para cada secret
```

---

### Paso 7: Actualizar GitHub Workflows

**Archivo:** `.github/workflows/ci.yml` (ejemplo)

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  MERCADOPAGO_ACCESS_TOKEN: ${{ secrets.MERCADOPAGO_ACCESS_TOKEN }}

steps:
  - name: Build
    run: pnpm build
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

### Paso 8: Configurar Cloudflare Workers

```bash
# Para cada secret en el worker
cd functions/workers/payments_webhook

wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Te pedirá ingresar el valor

wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

**Actualizar wrangler.toml:**

```toml
# ANTES (MAL ❌)
[vars]
MERCADOPAGO_ACCESS_TOKEN = "hardcoded-value"

# DESPUÉS (BIEN ✅)
[vars]
# Variables públicas solamente
APP_NAME = "autorenta"
ENVIRONMENT = "production"

# Secrets se manejan con: wrangler secret put
# No se declaran aquí
```

---

### Paso 9: Configurar Supabase Edge Functions

```bash
cd /home/edu/autorenta

# Set secrets para edge functions
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=07405c436053...
supabase secrets set MAPBOX_ACCESS_TOKEN=pk....

# Listar secrets (sin ver valores)
supabase secrets list
```

**En el código (edge functions):**

```typescript
// ANTES (MAL ❌)
const MP_TOKEN = 'hardcoded-token';

// DESPUÉS (BIEN ✅)
const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

if (!MP_TOKEN) {
  return new Response(
    JSON.stringify({ error: 'MP token not configured' }),
    { status: 500 }
  );
}
```

---

### Paso 10: Script de Validación

**Crear:** `scripts/validate-no-secrets.sh`

```bash
#!/bin/bash

echo "🔍 Buscando secretos expuestos..."

FOUND=0

# Buscar patrones sospechosos
if grep -r "eyJhbG" apps/ supabase/ functions/ --exclude-dir=node_modules 2>/dev/null; then
  echo "❌ Encontrado JWT hardcoded"
  FOUND=1
fi

if grep -r "APP_USR-\|TEST-[0-9]" apps/ supabase/ functions/ 2>/dev/null; then
  echo "❌ Encontrado token de MercadoPago"
  FOUND=1
fi

if grep -r "pk\.[a-zA-Z0-9]{60}" apps/ supabase/ 2>/dev/null; then
  echo "❌ Posible Mapbox token hardcoded"
  FOUND=1
fi

if [ $FOUND -eq 0 ]; then
  echo "✅ No se encontraron secretos expuestos"
  exit 0
else
  echo "❌ Se encontraron secretos. Revisa arriba."
  exit 1
fi
```

---

## 🧪 Testing y Validación

### Checklist de validación:

```bash
# 1. Verificar que .env.local existe y tiene valores
cat apps/web/.env.local

# 2. Verificar que .gitignore incluye .env
grep ".env" .gitignore

# 3. Buscar secretos expuestos
./scripts/validate-no-secrets.sh

# 4. Verificar GitHub Secrets
gh secret list

# 5. Verificar Supabase secrets
supabase secrets list

# 6. Build local funciona
cd apps/web
pnpm build

# 7. Edge function local funciona
supabase functions serve mercadopago-webhook

# 8. Worker local funciona
cd functions/workers/payments_webhook
wrangler dev
```

---

## 🚨 Troubleshooting

### Problema 1: Build falla sin env.js

**Error:** `Cannot read property 'SUPABASE_URL' of undefined`

**Solución:**
```bash
# Asegurarse que inject-env.sh se ejecuta en build
cd apps/web
./scripts/inject-env.sh
```

### Problema 2: GitHub Action falla

**Error:** `SUPABASE_URL is not defined`

**Solución:**
```bash
# Verificar que el secret existe
gh secret list | grep SUPABASE_URL

# Si no existe, crearlo
gh secret set SUPABASE_URL --body "https://..."
```

### Problema 3: Edge function falla en producción

**Error:** `MERCADOPAGO_ACCESS_TOKEN not found`

**Solución:**
```bash
# Set el secret
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=valor

# Re-deploy
supabase functions deploy mercadopago-webhook
```

---

## ✅ Checklist de Completitud

### Antes de marcar como completo:

- [ ] .env.example creado
- [ ] .env.local configurado localmente
- [ ] .gitignore actualizado
- [ ] apps/web/public/env.js sin secretos
- [ ] apply_migration.sh usa variables
- [ ] verify-real-payments.sh usa variables
- [ ] GitHub Secrets configurados (5 secrets mínimo)
- [ ] Workflows actualizados
- [ ] Cloudflare Workers secrets configurados
- [ ] Supabase secrets configurados
- [ ] Script de validación pasa
- [ ] Build local funciona
- [ ] Deploy a staging funciona
- [ ] Auditoría de código limpia
- [ ] Documentación actualizada

---

## 📚 Referencias

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Supabase Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [12 Factor App - Config](https://12factor.net/config)

---

**Estimación de tiempo:** 3-5 días
**Prioridad:** 🔴 P0 (DEBE hacerse antes que nada)
**Blocker para:** Todas las demás fases
**Risk si no se hace:** Crítico - brecha de seguridad mayor
