# 🤖 Sistema de Comunicación: Copilot ↔ Claude Code

**Fecha inicio:** 2025-10-28  
**Estado:** ACTIVO  
**Última actualización:** 2025-10-28 09:46 UTC

---

## 🎯 MISIÓN ACTUAL

**Objetivo:** Generar 6 documentos técnicos detallados para roadmap de producción (01-06)

**Documentos a crear:**
1. ✅ `00-RESUMEN-EJECUTIVO.md` - Ya creado por Copilot
2. ⏳ `01-FASE-CRITICA-SEGURIDAD.md` - TU TAREA ACTUAL
3. ⏳ `02-FASE-CRITICA-SPLIT-PAYMENT.md` - Pendiente
4. ⏳ `03-FASE-ALTA-BUGS-CRITICOS.md` - Pendiente
5. ⏳ `04-FASE-ALTA-TESTING-REAL.md` - Pendiente
6. ⏳ `05-FASE-MEDIA-INFRAESTRUCTURA.md` - Pendiente
7. ⏳ `06-FASE-FINAL-POLISH.md` - Pendiente
8. ⏳ `07-CHECKLIST-PRODUCCION.md` - Pendiente

---

## 📝 INSTRUCCIONES PARA CLAUDE CODE

### TAREA 1: Documento 01-FASE-CRITICA-SEGURIDAD.md

**Crear archivo:** `01-FASE-CRITICA-SEGURIDAD.md`

**Estructura requerida:**

```markdown
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
```

**Comandos para crear el archivo:**

```bash
cd /home/edu/autorenta/docs/production-roadmap

# Crear archivo completo
cat > 01-FASE-CRITICA-SEGURIDAD.md << 'DOC'
[TODO EL CONTENIDO DE ARRIBA]
DOC

# Verificar
ls -lh 01-FASE-CRITICA-SEGURIDAD.md
wc -l 01-FASE-CRITICA-SEGURIDAD.md
```

---

## 🎯 DESPUÉS DE CREAR ESTE DOCUMENTO

**Reportar en:** `copilot-claudecode.md`

Añadir al final del archivo:

```markdown
## 📊 PROGRESO

- [x] Documento 01 creado
- [ ] Documento 02 pendiente
- [ ] Documento 03 pendiente
...

## 🐛 ISSUES ENCONTRADOS

Ninguno aún.

## 💬 NOTAS

Documento 01 completado exitosamente.
Listo para comenzar implementación.
```

---

**FIN DE INSTRUCCIONES PARA DOCUMENTO 01**

---

## 📊 PROGRESO

**Última actualización:** 2025-10-28 10:15 UTC

### Documentos completados:

- [x] `00-RESUMEN-EJECUTIVO.md` - ✅ Creado por Copilot
- [x] `01-FASE-CRITICA-SEGURIDAD.md` - ✅ Creado por Claude Code
- [x] `02-FASE-CRITICA-SPLIT-PAYMENT.md` - ✅ Creado por Claude Code
- [ ] `03-FASE-ALTA-BUGS-CRITICOS.md` - ⏳ Pendiente
- [ ] `04-FASE-ALTA-TESTING-REAL.md` - ⏳ Pendiente
- [ ] `05-FASE-MEDIA-INFRAESTRUCTURA.md` - ⏳ Pendiente
- [ ] `06-FASE-FINAL-POLISH.md` - ⏳ Pendiente
- [ ] `07-CHECKLIST-PRODUCCION.md` - ⏳ Pendiente

### Estadísticas:

- **Total documentos:** 8
- **Completados:** 3 (37.5%)
- **Pendientes:** 5 (62.5%)
- **Tiempo estimado restante:** ~15-20 días

---

## 🐛 ISSUES ENCONTRADOS

Ninguno hasta el momento. Todos los documentos creados sin problemas.

---

## 💬 NOTAS DE CLAUDE CODE

### Documento 01 - Seguridad Crítica

**Creado:** 2025-10-28 10:15 UTC
**Archivo:** `/home/edu/autorenta/docs/production-roadmap/01-FASE-CRITICA-SEGURIDAD.md`
**Tamaño:** ~620 líneas
**Estado:** ✅ Completado exitosamente

**Contenido incluido:**
- ✅ Análisis detallado de archivos con secretos expuestos
- ✅ Arquitectura propuesta de manejo de secretos
- ✅ 10 pasos de implementación completos
- ✅ Scripts de validación y troubleshooting
- ✅ Checklist de completitud (14 items)
- ✅ Referencias y documentación

**Listo para:** Comenzar implementación o proceder con documento 02.

---

### Documento 02 - Split Payment Automático

**Creado:** 2025-10-28 10:30 UTC
**Archivo:** `/home/edu/autorenta/docs/production-roadmap/02-FASE-CRITICA-SPLIT-PAYMENT.md`
**Tamaño:** 671 líneas
**Estado:** ✅ Completado exitosamente

**Contenido incluido:**
- ✅ Análisis detallado del flujo de pagos roto actual
- ✅ Arquitectura de split payment con MercadoPago
- ✅ 10 pasos de implementación completos con código
- ✅ Migraciones SQL para tracking de splits
- ✅ Edge functions para refunds
- ✅ Tests E2E del flujo completo
- ✅ Testing en sandbox de MP
- ✅ Troubleshooting (3 escenarios)
- ✅ Checklist de completitud (13 items)
- ✅ Referencias de MercadoPago

**Listo para:** Comenzar implementación o proceder con documento 03.

---

## 🎯 SIGUIENTE TAREA

**Documento 03:** `03-FASE-ALTA-BUGS-CRITICOS.md`

Esperando instrucciones de Copilot para crear el siguiente documento del roadmap.


---

## 🎯 ACTUALIZACIÓN - 2025-10-28 09:54 UTC

### ✅ Documento 01 COMPLETADO Y APROBADO

**Estado:** Excelente trabajo, documento perfecto
**Líneas:** 587 líneas
**Calidad:** 5/5 estrellas

---

## 📝 NUEVA TAREA: Documento 02-FASE-CRITICA-SPLIT-PAYMENT.md

**Crear archivo:** `02-FASE-CRITICA-SPLIT-PAYMENT.md`

**Prioridad:** 🔴 P0 (BLOCKER)
**Tiempo estimado:** 10-15 minutos

### Estructura requerida:

```markdown
# 💳 Fase 02: Split Payment Automático con MercadoPago

**Prioridad:** 🔴 P0 (BLOCKER)
**Tiempo estimado:** 5-7 días
**Impacto:** 55% → 70%
**Estado:** ⏳ Por implementar

---

## 🎯 Objetivo

Implementar split payment automático para que los locadores reciban su dinero directamente al confirmar una reserva.

## 🔴 Problema Actual - Análisis Detallado

### Estado actual del flujo de pagos:

1. **Usuario hace reserva y paga**
   - Dinero va 100% a la cuenta de la plataforma
   - No hay split automático

2. **Auto queda activo sin validar onboarding MP**
   - Archivo: `publish-car-v2.page.ts` líneas 1540-1563
   - Auto se marca como 'active' aunque locador no tenga cuenta MP
   - Resultado: Reservas generadas pero locador no puede cobrar

3. **Split manual en edge function**
   - Archivo: `mercadopago-create-booking-preference/index.ts` líneas 312-337
   - Código comentado o no funcional
   - No hay transferencia automática

### Impacto del problema:

- 🔴 Locadores NO reciben dinero automáticamente
- 🔴 Plataforma acumula fondos que debe distribuir manualmente
- 🔴 Riesgo legal y de compliance
- 🔴 Operación NO escalable
- 🔴 Modelo de negocio ROTO

### Ejemplo del flujo roto:

```
1. Locador publica auto ✅
2. Locador NO completa onboarding MP ❌
3. Auto queda 'active' ✅ (MAL)
4. Usuario reserva y paga $1000 ✅
5. Dinero va a plataforma 100% ❌
6. Locador espera su $900 (90%) ⏳
7. Split manual necesario ❌
8. Proceso NO escalable ❌
```

---

## ✅ Solución Propuesta

### Arquitectura del Split Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE SPLIT PAYMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario paga reserva ($1000)                                │
│          ↓                                                       │
│  2. MercadoPago recibe pago                                     │
│          ↓                                                       │
│  3. Split automático:                                           │
│     ├─ Locador: $900 (90%) → Su cuenta MP                      │
│     └─ Plataforma: $100 (10%) → Cuenta principal               │
│          ↓                                                       │
│  4. Webhook confirma splits                                     │
│          ↓                                                       │
│  5. DB actualiza: booking.payment_status = 'completed'          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes necesarios:

1. **Onboarding MP obligatorio antes de activar auto**
2. **Marketplace de MercadoPago configurado**
3. **Split payment en preference creation**
4. **Webhook para confirmar transfers**
5. **Rollback en caso de error**

---

## 📝 Implementación Paso a Paso

### Paso 1: Validar Onboarding MP antes de activar auto

**Archivo:** `apps/web/src/app/features/cars/publish-car-v2.page.ts`

**ANTES (MAL ❌):**
```typescript
// Líneas 1540-1563
async publishCar() {
  // ... validaciones ...
  
  // Marca auto como activo SIN validar MP
  await this.supabase
    .from('cars')
    .update({ status: 'active' })
    .eq('id', carId);
    
  this.router.navigate(['/success']);
}
```

**DESPUÉS (BIEN ✅):**
```typescript
async publishCar() {
  // 1. Verificar onboarding MP
  const { data: ownerProfile } = await this.supabase
    .from('user_profiles')
    .select('mercadopago_collector_id, mp_onboarding_completed')
    .eq('user_id', this.userId)
    .single();
  
  if (!ownerProfile?.mp_onboarding_completed) {
    // Redirigir a completar onboarding
    this.showMPOnboardingModal();
    return;
  }
  
  if (!ownerProfile.mercadopago_collector_id) {
    throw new Error('Collector ID no encontrado');
  }
  
  // 2. Ahora sí, activar auto
  await this.supabase
    .from('cars')
    .update({ 
      status: 'active',
      owner_mp_collector_id: ownerProfile.mercadopago_collector_id
    })
    .eq('id', carId);
    
  this.router.navigate(['/success']);
}

private showMPOnboardingModal() {
  const modal = {
    title: '¡Casi listo!',
    message: 'Para recibir pagos, necesitas completar tu perfil de MercadoPago',
    buttons: [
      {
        text: 'Completar ahora',
        handler: () => this.startMPOnboarding()
      },
      {
        text: 'Después',
        role: 'cancel'
      }
    ]
  };
  // Mostrar modal...
}
```

**Migración DB necesaria:**
```sql
-- Agregar columna para collector_id en cars
ALTER TABLE cars 
ADD COLUMN owner_mp_collector_id VARCHAR(255);

-- Agregar índice
CREATE INDEX idx_cars_mp_collector 
ON cars(owner_mp_collector_id);
```

---

### Paso 2: Configurar Marketplace en MercadoPago

**Documentación:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments/split-payments-marketplace

**Pasos en dashboard MP:**

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Configuración" → "Marketplace"
4. Activar "Split de pagos"
5. Configurar:
   - Comisión de plataforma: 10%
   - Modo: Automático
   - Transferencia: Inmediata

**Guardar credenciales:**
```bash
# En .env.local
MERCADOPAGO_MARKETPLACE_ID=tu-marketplace-id
MERCADOPAGO_APPLICATION_ID=tu-app-id
```

---

### Paso 3: Implementar Split en Preference Creation

**Archivo:** `supabase/functions/mercadopago-create-booking-preference/index.ts`

**ANTES (MAL ❌):**
```typescript
// Líneas 312-337
const preference = {
  items: [{
    title: `Reserva ${car.brand} ${car.model}`,
    quantity: 1,
    unit_price: totalAmount
  }],
  back_urls: {
    success: `${frontendUrl}/booking-success`,
    failure: `${frontendUrl}/booking-failure`
  }
  // NO HAY SPLIT ❌
};
```

**DESPUÉS (BIEN ✅):**
```typescript
// Obtener collector_id del dueño del auto
const { data: car } = await supabaseAdmin
  .from('cars')
  .select(`
    *,
    owner:user_profiles!owner_id(
      mercadopago_collector_id,
      mp_onboarding_completed
    )
  `)
  .eq('id', carId)
  .single();

if (!car.owner?.mp_onboarding_completed) {
  return new Response(
    JSON.stringify({ error: 'Owner must complete MP onboarding' }),
    { status: 400 }
  );
}

const collectorId = car.owner.mercadopago_collector_id;
const platformFee = totalAmount * 0.10; // 10%
const ownerAmount = totalAmount - platformFee;

const preference = {
  items: [{
    title: `Reserva ${car.brand} ${car.model}`,
    quantity: 1,
    unit_price: totalAmount
  }],
  back_urls: {
    success: `${frontendUrl}/booking-success`,
    failure: `${frontendUrl}/booking-failure`
  },
  
  // ✅ SPLIT PAYMENT
  marketplace: Deno.env.get('MERCADOPAGO_MARKETPLACE_ID'),
  marketplace_fee: platformFee,
  
  // ✅ DINERO VA AL LOCADOR
  collector_id: collectorId,
  
  // ✅ METADATA para tracking
  metadata: {
    booking_id: bookingId,
    car_id: carId,
    owner_id: car.owner_id,
    split_amount_owner: ownerAmount,
    split_amount_platform: platformFee
  },
  
  notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
};

console.log('Split payment preference:', {
  total: totalAmount,
  owner: ownerAmount,
  platform: platformFee,
  collector: collectorId
});

const mpClient = new MercadoPagoConfig({ 
  accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
});
const preferenceClient = new Preference(mpClient);

const response = await preferenceClient.create({ body: preference });
```

---

### Paso 4: Webhook para Confirmar Splits

**Archivo:** `supabase/functions/mercadopago-webhook/index.ts`

**Agregar validación de split:**

```typescript
async function handlePaymentNotification(paymentId: string) {
  // ... código existente ...
  
  // ✅ Verificar que el split se ejecutó
  const mpClient = new MercadoPagoConfig({ 
    accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')! 
  });
  const paymentClient = new Payment(mpClient);
  
  const payment = await paymentClient.get({ id: paymentId });
  
  // Validar split
  if (payment.collector_id !== expectedCollectorId) {
    console.error('Split payment error: wrong collector', {
      expected: expectedCollectorId,
      received: payment.collector_id
    });
    
    // Marcar para revisión manual
    await supabaseAdmin
      .from('payment_issues')
      .insert({
        booking_id: bookingId,
        payment_id: paymentId,
        issue_type: 'split_collector_mismatch',
        details: { expected: expectedCollectorId, received: payment.collector_id }
      });
  }
  
  // Validar monto del split
  const platformFee = payment.transaction_details?.total_paid_amount! * 0.10;
  const ownerAmount = payment.transaction_details?.total_paid_amount! - platformFee;
  
  console.log('Split validated:', {
    total: payment.transaction_details?.total_paid_amount,
    owner: ownerAmount,
    platform: platformFee
  });
  
  // Actualizar booking con info de split
  await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'completed',
      payment_split_owner: ownerAmount,
      payment_split_platform: platformFee,
      payment_split_validated_at: new Date().toISOString()
    })
    .eq('id', bookingId);
}
```

---

### Paso 5: Tabla para Tracking de Splits

**Migración:** `supabase/migrations/[timestamp]_add_payment_splits.sql`

```sql
-- Tabla para tracking de splits
CREATE TABLE payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  payment_id VARCHAR(255) NOT NULL,
  
  -- Montos
  total_amount DECIMAL(10,2) NOT NULL,
  owner_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  
  -- IDs de MercadoPago
  collector_id VARCHAR(255) NOT NULL,
  marketplace_id VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'pending',
  validated_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payment_splits_booking ON payment_splits(booking_id);
CREATE INDEX idx_payment_splits_payment ON payment_splits(payment_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);

-- Trigger para updated_at
CREATE TRIGGER update_payment_splits_updated_at 
BEFORE UPDATE ON payment_splits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla para issues
CREATE TABLE payment_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  payment_id VARCHAR(255),
  
  issue_type VARCHAR(100) NOT NULL,
  details JSONB,
  
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_issues_unresolved 
ON payment_issues(booking_id) 
WHERE resolved = FALSE;
```

---

### Paso 6: Agregar Columnas a Bookings

```sql
-- Agregar tracking de splits a bookings
ALTER TABLE bookings
ADD COLUMN payment_split_owner DECIMAL(10,2),
ADD COLUMN payment_split_platform DECIMAL(10,2),
ADD COLUMN payment_split_validated_at TIMESTAMPTZ;
```

---

### Paso 7: Script de Validación de Splits

**Crear:** `scripts/validate-splits.sh`

```bash
#!/bin/bash

echo "🔍 Validando splits de pagos..."

# Buscar bookings pagados sin split validado
psql "$DATABASE_URL" << 'SQL'
SELECT 
  b.id,
  b.total_price,
  b.payment_status,
  b.payment_split_validated_at,
  c.owner_mp_collector_id,
  up.email as owner_email
FROM bookings b
JOIN cars c ON b.car_id = c.id
JOIN user_profiles up ON c.owner_id = up.user_id
WHERE b.payment_status = 'completed'
  AND b.payment_split_validated_at IS NULL
ORDER BY b.created_at DESC
LIMIT 10;
SQL

echo ""
echo "⚠️  Bookings sin split validado encontrados arriba"
```

---

### Paso 8: Dashboard para Monitoreo de Splits

**Crear vista en Supabase:**

```sql
-- Vista para dashboard de splits
CREATE VIEW payment_splits_dashboard AS
SELECT 
  DATE(ps.created_at) as date,
  COUNT(*) as total_splits,
  COUNT(*) FILTER (WHERE ps.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE ps.status = 'pending') as pending,
  COUNT(*) FILTER (WHERE ps.status = 'failed') as failed,
  SUM(ps.total_amount) as total_amount,
  SUM(ps.owner_amount) as total_to_owners,
  SUM(ps.platform_fee) as total_platform_fees
FROM payment_splits ps
GROUP BY DATE(ps.created_at)
ORDER BY date DESC;
```

---

### Paso 9: Rollback en Caso de Error

**Edge function:** `supabase/functions/mercadopago-refund/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MercadoPagoConfig, Refund } from 'mercadopago';

serve(async (req) => {
  const { paymentId, reason } = await req.json();
  
  const mpClient = new MercadoPagoConfig({ 
    accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')! 
  });
  const refundClient = new Refund(mpClient);
  
  try {
    // Crear refund
    const refund = await refundClient.create({
      body: { payment_id: paymentId }
    });
    
    console.log('Refund created:', refund.id);
    
    // Actualizar booking
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_id: refund.id,
        refund_reason: reason
      })
      .eq('payment_id', paymentId);
    
    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Refund error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

---

### Paso 10: Tests del Flujo Completo

**Crear:** `apps/web/src/app/features/bookings/__tests__/split-payment.spec.ts`

```typescript
describe('Split Payment Flow', () => {
  it('should not allow publishing car without MP onboarding', async () => {
    // Mock user without MP onboarding
    const result = await publishCar(carId);
    expect(result.error).toContain('complete MP onboarding');
  });
  
  it('should create preference with split', async () => {
    const preference = await createBookingPreference({
      carId: 'test-car',
      totalAmount: 1000
    });
    
    expect(preference.marketplace_fee).toBe(100); // 10%
    expect(preference.collector_id).toBeDefined();
  });
  
  it('should validate split in webhook', async () => {
    const webhook = await handleMPWebhook({
      type: 'payment',
      data: { id: 'test-payment' }
    });
    
    expect(webhook.split_validated).toBe(true);
  });
});
```

---

## 🧪 Testing y Validación

### Test en Sandbox de MercadoPago

```bash
# 1. Configurar credenciales de TEST
MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-xxxxx

# 2. Crear preference de test
curl -X POST "http://localhost:54321/functions/v1/mercadopago-create-booking-preference" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "test-123",
    "carId": "test-car",
    "totalAmount": 1000
  }'

# 3. Usar tarjeta de test
# Tarjeta: 5031 7557 3453 0604
# CVV: 123
# Fecha: 11/25

# 4. Verificar split en MP dashboard
# https://www.mercadopago.com.ar/developers/panel/credentials/test
```

---

## 🚨 Troubleshooting

### Problema 1: Collector ID inválido

**Error:** `Invalid collector_id`

**Solución:**
```sql
-- Verificar collector IDs
SELECT 
  up.email,
  up.mercadopago_collector_id,
  up.mp_onboarding_completed
FROM user_profiles up
WHERE mp_onboarding_completed = TRUE
  AND (mercadopago_collector_id IS NULL 
       OR mercadopago_collector_id = '');
```

### Problema 2: Split no se ejecuta

**Error:** Dinero va 100% a plataforma

**Solución:**
```typescript
// Verificar en logs de edge function
console.log('Preference body:', JSON.stringify(preference, null, 2));

// Verificar respuesta de MP
console.log('MP response:', JSON.stringify(response, null, 2));
```

### Problema 3: Webhook no confirma split

**Solución:**
```bash
# Ver logs de webhook
supabase functions logs mercadopago-webhook --tail

# Verificar notificationURL está configurada
# En MP dashboard → Webhooks
```

---

## ✅ Checklist de Completitud

- [ ] Validación de onboarding MP antes de activar auto
- [ ] Migración DB con owner_mp_collector_id
- [ ] Marketplace configurado en MP dashboard
- [ ] Split implementado en preference creation
- [ ] Webhook validando splits
- [ ] Tabla payment_splits creada
- [ ] Columnas agregadas a bookings
- [ ] Script de validación funciona
- [ ] Dashboard de monitoreo creado
- [ ] Refund edge function implementada
- [ ] Tests E2E pasando
- [ ] Test en sandbox exitoso
- [ ] Documentación actualizada

---

## 📚 Referencias

- [MP Split Payments](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments)
- [MP Marketplace](https://www.mercadopago.com.ar/developers/es/docs/marketplace/checkout-pro/introduction)
- [MP Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

---

**Estimación:** 5-7 días  
**Prioridad:** 🔴 P0  
**Risk:** Crítico - modelo de negocio
```

**Después de crear este documento, actualiza MONITOREO-CLAUDE-CODE.md con:**

```markdown
### 2025-10-28 10:00 - Documento 02 Completado
**Estado:** ✅ Completado
**Líneas:** [contar líneas]
**Próxima tarea:** Documento 03
```

