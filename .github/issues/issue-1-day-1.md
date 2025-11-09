# 🔒 DÍA 1: SEGURIDAD Y DEPLOYMENT CRÍTICO

**Tiempo estimado**: 6-8 horas

**Prioridad**: P0 CRÍTICO

**Objetivo**: Deployar features de seguridad esenciales antes de lanzar

**Documentación completa**: [LAUNCH_CHECKLIST.md](../blob/main/LAUNCH_CHECKLIST.md)

---

## ☑️ 1. DEPLOY PII ENCRYPTION (2-3 horas)

### 1.1 Generar Encryption Key

```bash
# Generar key de 256 bits
openssl rand -base64 32
```

- [ ] Key generada (guardar en lugar seguro temporalmente)

### 1.2 Almacenar Key en Supabase Vault

**Via Dashboard**:
1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng
2. Settings → Vault → New Secret
3. Name: `pii_encryption_key`
4. Secret: [pegar key del paso 1.1]

- [ ] Key almacenada en Supabase Vault

**✅ Verificación**:
```sql
SELECT * FROM vault.secrets WHERE name = 'pii_encryption_key';
```

### 1.3 Configurar Database Setting

```sql
ALTER DATABASE postgres SET app.pii_encryption_key TO 'vault://pii_encryption_key';

-- ✅ Verificación
SHOW app.pii_encryption_key;
-- Debe mostrar: vault://pii_encryption_key
```

- [ ] Database setting configurado

### 1.4 Deploy Migrations (EN ORDEN)

**Migration 1**: Enable pgcrypto
```bash
# Ejecutar en SQL Editor de Supabase
# Archivo: supabase/migrations/20251109_enable_pgcrypto_and_pii_encryption_functions.sql
```

- [ ] Migration 1 ejecutada

**✅ Verificación**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
SELECT proname FROM pg_proc WHERE proname IN ('encrypt_pii', 'decrypt_pii');
SELECT decrypt_pii(encrypt_pii('test data')); -- Debe retornar: test data
```

**Migration 2**: Add encrypted columns
```bash
# Ejecutar: 20251109_add_encrypted_pii_columns.sql
```

- [ ] Migration 2 ejecutada

**✅ Verificación**:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE '%encrypted%';
-- Debe retornar 8 columnas
```

**Migration 3**: Encrypt existing data
```bash
# BACKUP PRIMERO: Settings → Database → Backups → Create backup
# Ejecutar: 20251109_encrypt_existing_pii_data.sql
```

- [ ] Backup creado
- [ ] Migration 3 ejecutada

**✅ Verificación**:
```sql
SELECT
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as phone_count,
  COUNT(*) FILTER (WHERE phone_encrypted IS NOT NULL) as phone_encrypted_count
FROM profiles;
-- phone_count DEBE IGUALAR phone_encrypted_count
```

**Migration 4**: Create views y RPC
```bash
# Ejecutar: 20251109_create_decrypted_views_and_rpc_functions.sql
```

- [ ] Migration 4 ejecutada

**✅ Verificación**:
```sql
SELECT table_name FROM information_schema.views WHERE table_name LIKE '%decrypted%';
-- Debe retornar: profiles_decrypted, bank_accounts_decrypted
```

### 1.5 Deploy Angular App

```bash
cd apps/web
npm run build
git push origin claude/production-readiness-check-011CUwvGQNvqsB46TrbvbfSe
```

- [ ] App deployada a Cloudflare Pages

**✅ Verificación**: Probar login, editar perfil con teléfono/DNI, verificar en DB que está encriptado

---

## ☑️ 2. RATE LIMITING (1 hora)

### 2.1 Upgrade Cloudflare Pro

1. https://dash.cloudflare.com/
2. Billing → Upgrade to Pro ($20/mes)

- [ ] Cloudflare Pro activo

### 2.2 Crear Rate Limiting Rules

**Security** → **WAF** → **Rate limiting rules**

**Rule 1: Login Brute Force**
- Match: URL contains `/auth/v1/token` AND Method = POST
- Rate: 5 requests / 10 minutes / IP
- Action: Block 1 hour

- [ ] Rule 1: Login Brute Force creada

**Rule 2: API Protection**
- Match: URL contains `/rest/v1/`
- Rate: 100 requests / 1 minute / IP
- Action: Managed Challenge 10 min

- [ ] Rule 2: API Protection creada

**Rule 3: Password Reset**
- Match: URL contains `/auth/v1/recover` AND Method = POST
- Rate: 3 requests / 1 hour / IP
- Action: Block 2 hours

- [ ] Rule 3: Password Reset creada

### 2.3 Security Settings

**Security** → **Settings**
- Bot Fight Mode: ON
- Browser Integrity Check: ON
- Security Level: Medium

- [ ] Security settings configuradas

**✅ Verificación**: Ver 3 reglas activas en dashboard

---

## ☑️ 3. SENTRY (30 min)

### 3.1 Get Sentry DSN

1. https://sentry.io/ → Create Project
2. Platform: Angular
3. Copiar DSN

- [ ] Proyecto Sentry creado
- [ ] DSN obtenido

### 3.2 Add DSN to Environment

**Cloudflare Pages**:
- Settings → Environment variables
- Add: `NG_APP_SENTRY_DSN` = [tu DSN]
- Add: `NG_APP_SENTRY_ENVIRONMENT` = production

- [ ] DSN configurado en Cloudflare
- [ ] App redeployada

**✅ Verificación**: Lanzar error en console, ver en Sentry dashboard

---

## ☑️ 4. BACKUPS (15 min)

### 4.1 Verify Automatic Backups

Supabase → Settings → Database → Backups

- [ ] Daily backups habilitados
- [ ] Retention: 7 days mínimo

### 4.2 Create Manual Backup

- Name: `pre-launch-backup`
- Description: Backup before production launch

- [ ] Manual backup creado
- [ ] Backup descargado localmente

---

## ☑️ 5. LIMPIAR CONSOLE.LOGS (2 horas)

### 5.1 Identificar Logs Sensibles

```bash
cd apps/web/src
grep -r "console.log.*phone\|dni\|user\|payment" --include="*.ts" | grep -v "//"
```

- [ ] Logs sensibles identificados

### 5.2 Archivos Críticos a Revisar

- [ ] `auth.service.ts`
- [ ] `profile.service.ts`
- [ ] `wallet.service.ts`
- [ ] `withdrawal.service.ts`
- [ ] `payments.service.ts`
- [ ] `bookings.service.ts`

**Patrón de reemplazo**:
```typescript
// ❌ console.log('User data:', user);
// ✅ this.logger.info('User logged in', { userId: user.id });
```

- [ ] Console.logs sensibles eliminados/comentados
- [ ] Cambios commiteados

---

## ☑️ 6. MONITORING (1 hora)

### 6.1 UptimeRobot

1. https://uptimerobot.com/ → Sign up
2. Add Monitor:
   - Type: HTTPS
   - URL: https://autorenta-web.pages.dev
   - Interval: 5 minutes

- [ ] Monitor creado para Web App
- [ ] Monitor creado para API Health Check
- [ ] Alert email configurado

### 6.2 Supabase Alerts

Settings → Notifications:
- Database CPU > 80%
- Database Memory > 85%
- Storage > 80%

- [ ] Alerts de Supabase configurados

---

## ☑️ 7. TESTING E2E (2 horas)

### 7.1 User Journey: Locador

- [ ] Register como locador
- [ ] Complete onboarding
- [ ] Upload documentos (DNI, Licencia)
- [ ] Aprobar verificación (admin)
- [ ] Publicar auto (con 5 fotos)
- [ ] Auto visible en mapa
- [ ] Configurar disponibilidad

### 7.2 User Journey: Locatario

- [ ] Register como locatario
- [ ] Complete onboarding
- [ ] Upload documentos
- [ ] Buscar auto en mapa
- [ ] Crear booking
- [ ] Depositar fondos (MercadoPago test)
- [ ] Aprobar booking (como locador)
- [ ] Check-in completo (fotos + firma)
- [ ] Check-out completo
- [ ] Review creada

### 7.3 User Journey: Admin

- [ ] Login como admin
- [ ] Aprobar verificaciones
- [ ] Ver bookings
- [ ] Procesar refund de prueba

---

## ✅ VERIFICACIÓN FINAL DÍA 1

- [ ] PII Encryption deployado y funcionando
- [ ] Rate limiting activo (3 reglas)
- [ ] Sentry capturando errores
- [ ] Backups automáticos habilitados
- [ ] Console.logs sensibles eliminados
- [ ] Monitoring activo (UptimeRobot)
- [ ] Testing E2E completo SIN errores

**Si todos ✅ → Día 1 COMPLETO** 🎉

Cerrar este issue y abrir Issue #2 (Día 2)
