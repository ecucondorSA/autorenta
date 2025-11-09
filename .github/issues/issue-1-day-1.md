# 🔒 DÍA 1: SEGURIDAD Y DEPLOYMENT CRÍTICO

**Tiempo estimado**: 6-8 horas
**Prioridad**: P0 CRÍTICO
**Objetivo**: Deployar features de seguridad esenciales antes de lanzar

**Documentación completa**: [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md)

---

## ☑️ 1. DEPLOY PII ENCRYPTION (2-3 horas)

### 1.1 Generar Encryption Key

```bash
# Generar key de 256 bits
openssl rand -base64 32
```

- [ ] Key generada (guardar en lugar seguro temporalmente)

---

### 1.2 Almacenar Key en Supabase Vault

**Via Dashboard**:
1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng
2. **Settings** → **Vault** → **New Secret**
3. Name: `pii_encryption_key`
4. Secret: [pegar key del paso 1.1]
5. Click: **Add Secret**

- [ ] Key almacenada en Supabase Vault

**✅ Verificación**:
```sql
SELECT * FROM vault.secrets WHERE name = 'pii_encryption_key';
-- Debe retornar 1 fila
```

---

### 1.3 Configurar Database Setting

```sql
-- Ejecutar en SQL Editor de Supabase
ALTER DATABASE postgres SET app.pii_encryption_key TO 'vault://pii_encryption_key';

-- ✅ Verificación
SHOW app.pii_encryption_key;
-- Debe mostrar: vault://pii_encryption_key
```

- [ ] Database setting configurado

---

### 1.4 Deploy Migrations (EN ORDEN)

⚠️ **IMPORTANTE**: Ejecutar EN ORDEN, uno por uno.

#### Migration 1: Enable pgcrypto

```bash
# Copiar contenido de:
# supabase/migrations/20251109_enable_pgcrypto_and_pii_encryption_functions.sql
# Ejecutar en SQL Editor de Supabase
```

- [ ] Migration 1 ejecutada

**✅ Verificación**:
```sql
-- 1. Verificar extension
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 2. Verificar funciones
SELECT proname FROM pg_proc WHERE proname IN ('encrypt_pii', 'decrypt_pii');
-- Debe retornar 2 filas

-- 3. Probar encryption
SELECT encrypt_pii('test data');
-- Debe retornar string base64

-- 4. Probar decryption
SELECT decrypt_pii(encrypt_pii('test data'));
-- Debe retornar: test data
```

---

#### Migration 2: Add encrypted columns

```bash
# Ejecutar archivo:
# supabase/migrations/20251109_add_encrypted_pii_columns.sql
```

- [ ] Migration 2 ejecutada

**✅ Verificación**:
```sql
-- Verificar columnas encrypted en profiles
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%encrypted%';
-- Debe retornar: 8 columnas

-- Verificar triggers
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name LIKE '%encrypt%';
-- Debe retornar: encrypt_profile_pii_on_write
```

---

#### Migration 3: Encrypt existing data

⚠️ **BACKUP PRIMERO**:

1. Supabase Dashboard → **Settings** → **Database** → **Backups**
2. Click: **Create backup**
3. Name: `pre-encryption-backup`
4. Wait for completion

- [ ] Backup pre-encryption creado

```bash
# Ejecutar archivo:
# supabase/migrations/20251109_encrypt_existing_pii_data.sql
```

- [ ] Migration 3 ejecutada

**✅ Verificación**:
```sql
-- Verificar que datos fueron encriptados
SELECT
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as phone_count,
  COUNT(*) FILTER (WHERE phone_encrypted IS NOT NULL) as phone_encrypted_count,
  COUNT(*) FILTER (WHERE dni IS NOT NULL) as dni_count,
  COUNT(*) FILTER (WHERE dni_encrypted IS NOT NULL) as dni_encrypted_count
FROM profiles;

-- phone_count DEBE IGUALAR phone_encrypted_count
-- dni_count DEBE IGUALAR dni_encrypted_count

-- Ver ejemplo de dato encriptado
SELECT phone_encrypted FROM profiles WHERE phone_encrypted IS NOT NULL LIMIT 1;
-- Debe verse como base64 largo
```

---

#### Migration 4: Create views y RPC functions

```bash
# Ejecutar archivo:
# supabase/migrations/20251109_create_decrypted_views_and_rpc_functions.sql
```

- [ ] Migration 4 ejecutada

**✅ Verificación**:
```sql
-- 1. Verificar views creadas
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE '%decrypted%';
-- Debe retornar: profiles_decrypted, bank_accounts_decrypted

-- 2. Verificar RPC functions
SELECT proname
FROM pg_proc
WHERE proname LIKE '%encryption%';
-- Debe retornar: update_profile_with_encryption, add_bank_account_with_encryption

-- 3. Probar view (debe mostrar datos desencriptados)
SELECT phone, dni FROM profiles_decrypted LIMIT 1;
```

---

### 1.5 Deploy Angular App

```bash
# Verificar cambios en git
git status

# Build production
cd apps/web
npm run build

# Deploy a Cloudflare Pages (push trigger auto-deploy)
git push origin claude/production-readiness-check-011CUwvGQNvqsB46TrbvbfSe
```

- [ ] App buildeada exitosamente
- [ ] Push a GitHub realizado
- [ ] Deploy a Cloudflare Pages completado

**✅ Verificación End-to-End**:

1. Abrir: https://autorenta-web.pages.dev
2. Login/Register
3. Editar perfil → Agregar teléfono/DNI
4. Guardar
5. Verificar en Supabase SQL Editor:
   ```sql
   SELECT phone, phone_encrypted, dni, dni_encrypted
   FROM profiles
   WHERE id = '[tu-user-id]';
   -- phone_encrypted y dni_encrypted deben tener valores base64
   ```

- [ ] Encryption funciona end-to-end

---

## ☑️ 2. RATE LIMITING (1 hora)

### 2.1 Upgrade Cloudflare Pro

1. Ir a: https://dash.cloudflare.com/
2. Seleccionar account
3. **Billing** → **Plans**
4. **Upgrade to Pro** ($20/mes)
5. Confirmar pago

- [ ] Cloudflare Pro activo

**✅ Verificación**: Badge muestra "Pro"

---

### 2.2 Crear Rate Limiting Rules

**Navegar**: **Security** → **WAF** → **Rate limiting rules**

#### Rule 1: Login Brute Force Protection

```yaml
Name: Login Brute Force Protection
Description: Prevent credential stuffing attacks

Match:
  Field: Request URL
  Operator: contains
  Value: /auth/v1/token

  AND

  Field: HTTP Method
  Operator: equals
  Value: POST

Rate Limit:
  Requests: 5
  Period: 10 minutes
  Counting: By IP address

Action: Block
Duration: 1 hour
Response: 429 Too Many Requests
```

- [ ] Rule 1: Login Brute Force creada

---

#### Rule 2: API General Protection

```yaml
Name: API General Protection

Match:
  Field: Request URL
  Operator: contains
  Value: /rest/v1/

Rate Limit:
  Requests: 100
  Period: 1 minute
  Counting: By IP address

Action: Managed Challenge
Duration: 10 minutes
```

- [ ] Rule 2: API Protection creada

---

#### Rule 3: Password Reset Protection

```yaml
Name: Password Reset Protection

Match:
  Field: Request URL
  Operator: contains
  Value: /auth/v1/recover

  AND

  Field: HTTP Method
  Operator: equals
  Value: POST

Rate Limit:
  Requests: 3
  Period: 1 hour
  Counting: By IP address

Action: Block
Duration: 2 hours
```

- [ ] Rule 3: Password Reset creada

---

### 2.3 Enable Security Features

**Navegar**: **Security** → **Settings**

```
☑ Bot Fight Mode: ON
☑ Browser Integrity Check: ON
☑ Security Level: Medium
☑ Challenge Passage: 30 minutes
☐ I'm Under Attack Mode: OFF (solo en emergencia)
```

- [ ] Security features habilitadas

**Save**

**✅ Verificación**: Ver 3 reglas activas en WAF dashboard

---

## ☑️ 3. SENTRY ERROR TRACKING (30 min)

### 3.1 Create Sentry Project

1. Ir a: https://sentry.io/
2. **Sign up** / Login (Free tier)
3. **Create Project**:
   - Platform: Angular
   - Project name: `autorenta-web`
   - Team: Default
4. **Copiar DSN**: `https://xxxxx@o123456.ingest.sentry.io/7890123`

- [ ] Proyecto Sentry creado
- [ ] DSN copiado

---

### 3.2 Configure Sentry in Production

**Cloudflare Pages**:

1. Dashboard → **Pages** → **autorenta-web**
2. **Settings** → **Environment variables**
3. **Add variable**:
   ```
   Variable name: NG_APP_SENTRY_DSN
   Value: https://xxxxx@o123456.ingest.sentry.io/7890123
   ```
4. **Add variable**:
   ```
   Variable name: NG_APP_SENTRY_ENVIRONMENT
   Value: production
   ```
5. **Save**
6. **Redeploy** (trigger nuevo deploy)

- [ ] Variables configuradas en Cloudflare
- [ ] App redeployada

---

### 3.3 Verify Sentry Working

```typescript
// Abrir browser console en tu app
throw new Error('Sentry test error');
```

**✅ Verificación**:
1. Ir a: Sentry Dashboard → **Issues**
2. Ver el error "Sentry test error" (aparece en <5 min)

- [ ] Sentry capturando errores correctamente

---

## ☑️ 4. CONFIGURE BACKUPS (15 min)

### 4.1 Verify Automatic Backups

**Supabase Dashboard**:

1. **Settings** → **Database** → **Backups**
2. Verificar:
   - Daily backups: **Enabled**
   - Backup retention: **7 days** (mínimo)
   - Point-in-time Recovery (PITR): Enable si disponible

- [ ] Automatic daily backups habilitados
- [ ] Retention: 7 days mínimo

---

### 4.2 Create Manual Pre-Launch Backup

```
Settings → Database → Backups → Create backup

Name: pre-launch-backup
Description: Backup before production launch
```

- [ ] Manual backup creado
- [ ] Status: Completed

---

### 4.3 Download Backup Locally

1. Click en backup creado
2. **Download** → Guardar archivo
3. Almacenar en lugar seguro (Google Drive, Dropbox, etc)

- [ ] Backup descargado localmente
- [ ] Backup almacenado de forma segura

---

## ☑️ 5. REMOVE SENSITIVE CONSOLE.LOGS (2 horas)

### 5.1 Identify Sensitive Logs

```bash
cd apps/web/src

# Buscar logs con datos sensibles
grep -r "console.log.*phone" --include="*.ts" | grep -v "//"
grep -r "console.log.*dni\|gov_id" --include="*.ts" | grep -v "//"
grep -r "console.log.*user\|profile" --include="*.ts" | grep -v "//"
grep -r "console.log.*payment\|wallet\|transaction" --include="*.ts" | grep -v "//"
```

- [ ] Logs sensibles identificados
- [ ] Lista creada de archivos a modificar

---

### 5.2 Review Critical Services

Revisar y limpiar estos archivos manualmente:

- [ ] `app/core/services/auth.service.ts`
- [ ] `app/core/services/profile.service.ts`
- [ ] `app/core/services/wallet.service.ts`
- [ ] `app/core/services/withdrawal.service.ts`
- [ ] `app/core/services/payments.service.ts`
- [ ] `app/core/services/bookings.service.ts`

**Patrón de reemplazo**:
```typescript
// ❌ ANTES
console.log('User data:', user);
console.error('Payment failed:', error, paymentData);

// ✅ DESPUÉS
this.logger.info('User logged in', { userId: user.id });
this.logger.error('Payment failed', error, { paymentId: paymentData.id });

// NO logear NUNCA:
// - phone, dni, email, address
// - account_number, card_number
// - passwords, tokens
// - access_token, refresh_token
```

---

### 5.3 Commit Changes

```bash
# Ver cambios
git diff

# Si están bien:
git add -A
git commit -m "fix: remove sensitive data from console.logs"
git push
```

- [ ] Console.logs sensibles eliminados/comentados
- [ ] Cambios commiteados y pusheados
- [ ] Cloudflare auto-deploy completado

---

## ☑️ 6. SETUP MONITORING (1 hora)

### 6.1 UptimeRobot - Basic Uptime Monitoring

1. Ir a: https://uptimerobot.com/
2. **Sign up** (Free tier - 50 monitors)
3. **Add New Monitor**:

**Monitor 1: Web App**
```
Monitor Type: HTTPS
Friendly Name: AutoRenta Web App
URL: https://autorenta-web.pages.dev
Monitoring Interval: 5 minutes
Alert Contacts: [tu-email]
Alert When Down: 2 times
```

- [ ] Monitor Web App creado

**Monitor 2: API Health Check**
```
Monitor Type: HTTPS
Friendly Name: AutoRenta API Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Monitoring Interval: 5 minutes
Success Criteria: Status Code 200
```

- [ ] Monitor API Health creado
- [ ] Email alerts configurados

---

### 6.2 Supabase Database Alerts

**Supabase Dashboard**:

1. **Settings** → **Notifications**
2. Enable alerts:
   ```
   ☑ Database CPU > 80% (5 min)
   ☑ Database Memory > 85% (5 min)
   ☑ Storage > 80% of limit
   ```
3. Email: [tu-email]

- [ ] Database performance alerts configurados
- [ ] Email de notificaciones configurado

---

## ☑️ 7. END-TO-END TESTING (2 horas)

### 7.1 User Journey: Locador (Publicar Auto)

- [ ] Register nuevo usuario (email: test-owner@test.com)
- [ ] Seleccionar rol: Locador
- [ ] Complete onboarding
- [ ] Upload documentos (DNI frente/dorso, Licencia)
- [ ] Admin: Aprobar verificación manualmente
- [ ] Publicar auto:
  - Marca: Toyota
  - Modelo: Corolla
  - Año: 2020
  - Precio: 15000 ARS/día
  - Upload 5 fotos mínimo
  - Ubicación: Buenos Aires (con coordenadas)
- [ ] Verificar auto visible en mapa `/cars`
- [ ] Configurar disponibilidad en calendario

**✅ Verificación**:
```sql
-- Verificar auto en DB
SELECT * FROM cars WHERE owner_id = '[test-owner-id]';

-- Verificar fotos
SELECT COUNT(*) FROM car_photos WHERE car_id = '[car-id]';
-- Debe ser >= 5
```

---

### 7.2 User Journey: Locatario (Rentar Auto)

- [ ] Register nuevo usuario (email: test-renter@test.com)
- [ ] Seleccionar rol: Locatario
- [ ] Complete onboarding
- [ ] Upload documentos (DNI, Licencia)
- [ ] Admin: Aprobar verificación
- [ ] Buscar auto en mapa
- [ ] Filtrar por fechas (próxima semana, 3 días)
- [ ] Seleccionar auto publicado en 7.1
- [ ] Ver detalle de auto
- [ ] Crear booking:
  - Fechas: [próxima semana]
  - Extras: Seguro básico
  - Confirmar
- [ ] Depositar fondos en wallet:
  - Ir a Wallet → Depositar
  - Método: MercadoPago (cuenta de prueba)
  - Monto: 50000 ARS
  - Completar pago
- [ ] Como locador: Aprobar booking
- [ ] Como locatario: Ver booking aprobado
- [ ] Check-in (como locador):
  - Upload 5 fotos del auto
  - Registrar odómetro: 50000 km
  - Registrar combustible: 80%
  - Firmar FGO digital
- [ ] Check-out (3 días después, como locador):
  - Upload fotos del auto
  - Registrar odómetro: 50300 km
  - Registrar combustible: 20%
  - Comparar con check-in
  - Firmar FGO digital
- [ ] Completar booking
- [ ] Dejar review (como locatario):
  - Calificación: 5 estrellas
  - Comentario positivo

**✅ Verificación**:
```sql
-- Verificar booking completo
SELECT * FROM bookings WHERE id = '[booking-id]';
-- status debe ser 'completed'

-- Verificar FGO persistido
SELECT * FROM booking_inspections WHERE booking_id = '[booking-id]';
-- Debe tener 2 filas (check-in y check-out)

-- Verificar wallet balances correctos
SELECT balance, locked_balance FROM wallets WHERE user_id = '[renter-id]';
```

---

### 7.3 User Journey: Admin

- [ ] Login como admin (crear admin user en DB si no existe):
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = '[tu-email]';
  ```
- [ ] Ir a `/admin/verifications`
- [ ] Ver documentos pendientes
- [ ] Aprobar documentos de test users
- [ ] Ir a `/admin/bookings`
- [ ] Ver lista de bookings
- [ ] Filtrar por estado
- [ ] Ver detalle de booking
- [ ] Ir a `/admin/refunds`
- [ ] Procesar refund de prueba (si aplica)
- [ ] Ir a `/admin/users`
- [ ] Ver lista de usuarios
- [ ] Buscar test users creados

**✅ Verificación**: Admin dashboard funciona sin errores

---

## ✅ VERIFICACIÓN FINAL DÍA 1

**Checklist final antes de cerrar este issue**:

- [ ] ✅ PII Encryption deployado y funcionando
  - [ ] 4 migrations ejecutadas exitosamente
  - [ ] Datos existentes encriptados
  - [ ] Views y RPC functions creadas
  - [ ] App Angular usando encryption
  - [ ] Testing E2E confirma encryption

- [ ] ✅ Rate limiting activo
  - [ ] Cloudflare Pro activo
  - [ ] 3 reglas configuradas
  - [ ] Security features habilitadas

- [ ] ✅ Sentry capturando errores
  - [ ] Proyecto creado
  - [ ] DSN configurado
  - [ ] Test error capturado

- [ ] ✅ Backups configurados
  - [ ] Daily backups habilitados
  - [ ] Pre-launch backup creado
  - [ ] Backup descargado localmente

- [ ] ✅ Console.logs sensibles eliminados
  - [ ] 6 servicios críticos revisados
  - [ ] Logs eliminados/comentados
  - [ ] Cambios commiteados

- [ ] ✅ Monitoring activo
  - [ ] UptimeRobot configurado (2 monitors)
  - [ ] Supabase alerts configurados
  - [ ] Email alerts testeados

- [ ] ✅ Testing E2E completo
  - [ ] Journey locador completado
  - [ ] Journey locatario completado
  - [ ] Journey admin completado
  - [ ] **0 errores críticos encontrados**

---

## 🎉 DÍA 1 COMPLETADO

**Si TODOS los checkboxes están ✅**:

1. Cerrar este issue
2. Crear/Abrir Issue #2: Día 2 - Documentación
3. Celebrar 🎊 - La parte más difícil está hecha!

**Si hay algún ❌**:

1. Revisar sección con problema
2. Consultar documentación: [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md)
3. Revisar: [PII_ENCRYPTION_DEPLOYMENT_GUIDE.md](../../PII_ENCRYPTION_DEPLOYMENT_GUIDE.md)
4. Si sigue sin funcionar, abrir nuevo issue de bug

---

**Tiempo invertido**: _____ horas
**Fecha de completado**: _____
