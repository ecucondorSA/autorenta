# 🚀 CHECKLIST DE LANZAMIENTO - AutoRenta

**Desarrollador**: Solo dev con 0 usuarios
**Timeline**: 2-3 días
**Objetivo**: Lanzar MVP con seguridad mínima garantizada

---

## 📅 DÍA 1: SEGURIDAD Y DEPLOYMENT CRÍTICO

**Tiempo estimado**: 6-8 horas

---

### ☑️ 1. DEPLOY PII ENCRYPTION (2-3 horas)

#### 1.1 Generar Encryption Key

```bash
# Generar key de 256 bits
openssl rand -base64 32

# Ejemplo output:
# 3Hf8K9mN2pQ7rS5tU1vW3xY6zA4bC8dE9fG2hI5jK7lM0nO3pR6sT8uV1wX4yZ7
```

**Guardar esta key**: La necesitarás en paso 1.2

---

#### 1.2 Almacenar Key en Supabase Vault

**Opción A: Via Dashboard (Recomendado para primera vez)**

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng
2. Menú lateral: **Settings** → **Vault**
3. Click: **New Secret**
4. Configurar:
   ```
   Name: pii_encryption_key
   Secret: [pegar la key del paso 1.1]
   ```
5. Click: **Add Secret**

**Opción B: Via SQL (Alternativa)**

```sql
-- Ejecutar en SQL Editor de Supabase
SELECT vault.create_secret(
  'pii_encryption_key',
  '3Hf8K9mN2pQ7rS5tU1vW3xY6zA4bC8dE9fG2hI5jK7lM0nO3pR6sT8uV1wX4yZ7', -- TU KEY AQUÍ
  'PII encryption key for GDPR compliance'
);
```

**✅ Verificación**:
```sql
-- Debe retornar la key (encriptada en vault)
SELECT * FROM vault.secrets WHERE name = 'pii_encryption_key';
```

---

#### 1.3 Configurar Database Setting

```sql
-- Ejecutar en SQL Editor de Supabase
-- Esto permite que las funciones de encryption accedan a la key

ALTER DATABASE postgres SET app.pii_encryption_key TO 'vault://pii_encryption_key';

-- ✅ Verificación
SHOW app.pii_encryption_key;
-- Debe mostrar: vault://pii_encryption_key
```

---

#### 1.4 Deploy Migrations (EN ORDEN)

**⚠️ IMPORTANTE**: Ejecutar en orden, uno por uno.

**Migration 1: Enable pgcrypto y funciones**

```bash
# Copiar contenido del archivo
cat supabase/migrations/20251109_enable_pgcrypto_and_pii_encryption_functions.sql

# Ejecutar en SQL Editor de Supabase Dashboard
# O via CLI:
supabase db push --db-url "postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres"
```

**✅ Verificación**:
```sql
-- Verificar que pgcrypto está habilitado
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Verificar funciones creadas
SELECT proname FROM pg_proc WHERE proname IN ('encrypt_pii', 'decrypt_pii');
-- Debe retornar 2 filas

-- Probar encriptación
SELECT encrypt_pii('test data');
-- Debe retornar string base64

SELECT decrypt_pii(encrypt_pii('test data'));
-- Debe retornar: test data
```

**Migration 2: Add encrypted columns**

```bash
# Ejecutar en SQL Editor
# Contenido de: 20251109_add_encrypted_pii_columns.sql
```

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

**Migration 3: Encrypt existing data**

⚠️ **BACKUP PRIMERO**:
```sql
-- Crear snapshot manual en Supabase Dashboard
-- Settings → Database → Backups → Create backup
```

```bash
# Ejecutar migration
# Contenido de: 20251109_encrypt_existing_pii_data.sql
```

**✅ Verificación**:
```sql
-- Contar registros con PII
SELECT
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as phone_count,
  COUNT(*) FILTER (WHERE phone_encrypted IS NOT NULL) as phone_encrypted_count,
  COUNT(*) FILTER (WHERE dni IS NOT NULL) as dni_count,
  COUNT(*) FILTER (WHERE dni_encrypted IS NOT NULL) as dni_encrypted_count
FROM profiles;

-- phone_count DEBE IGUALAR phone_encrypted_count
-- dni_count DEBE IGUALAR dni_encrypted_count
```

**Migration 4: Create views y RPC functions**

```bash
# Ejecutar en SQL Editor
# Contenido de: 20251109_create_decrypted_views_and_rpc_functions.sql
```

**✅ Verificación**:
```sql
-- Verificar views creadas
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE '%decrypted%';
-- Debe retornar: profiles_decrypted, bank_accounts_decrypted

-- Verificar RPC functions
SELECT proname
FROM pg_proc
WHERE proname LIKE '%encryption%';
-- Debe retornar: update_profile_with_encryption, add_bank_account_with_encryption

-- Probar view
SELECT phone, dni FROM profiles_decrypted LIMIT 1;
-- Debe retornar datos desencriptados
```

---

#### 1.5 Deploy Angular App con Encryption

```bash
# 1. Asegurar que los cambios están en el branch
git status

# 2. Build production
cd apps/web
npm run build

# 3. Deploy a Cloudflare Pages (automático via GitHub Actions)
git push origin claude/production-readiness-check-011CUwvGQNvqsB46TrbvbfSe

# O manual:
npx wrangler pages deploy dist/browser --project-name autorenta-web
```

**✅ Verificación**:
```bash
# Abrir app en browser
open https://autorenta-web.pages.dev

# Probar:
# 1. Login/Register
# 2. Editar perfil con teléfono/DNI
# 3. Verificar en DB que datos están encriptados
```

---

### ☑️ 2. CONFIGURAR RATE LIMITING (1 hora)

#### 2.1 Upgrade Cloudflare Pro

1. Ir a: https://dash.cloudflare.com/
2. Seleccionar tu dominio o Pages project
3. **Billing** → **Plans**
4. **Upgrade to Pro** ($20/mes)
5. Confirmar pago

**✅ Verificación**: Plan badge muestra "Pro"

---

#### 2.2 Crear Rate Limiting Rules

**Navegar**: **Security** → **WAF** → **Rate limiting rules**

**Rule 1: Login Brute Force**

```
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

Rate:
  Requests: 5
  Period: 10 minutes
  Counting: By IP address

Action: Block
Duration: 1 hour
Response: 429 Too Many Requests
```

Click: **Deploy rule**

**Rule 2: API Protection**

```
Name: API General Protection

Match:
  Field: Request URL
  Operator: contains
  Value: /rest/v1/

Rate:
  Requests: 100
  Period: 1 minute
  Counting: By IP address

Action: Managed Challenge
Duration: 10 minutes
```

Click: **Deploy rule**

**Rule 3: Password Reset**

```
Name: Password Reset Protection

Match:
  Field: Request URL
  Operator: contains
  Value: /auth/v1/recover

  AND

  Field: HTTP Method
  Operator: equals
  Value: POST

Rate:
  Requests: 3
  Period: 1 hour
  Counting: By IP address

Action: Block
Duration: 2 hours
```

Click: **Deploy rule**

**✅ Verificación**: Ver las 3 reglas activas en dashboard

---

#### 2.3 Enable Security Features

**Navegar**: **Security** → **Settings**

```
☑ Bot Fight Mode: ON
☑ Browser Integrity Check: ON
☑ Security Level: Medium
☑ Challenge Passage: 30 minutes
☐ I'm Under Attack Mode: OFF (solo en emergencia)
```

**Save**

---

### ☑️ 3. CONFIGURAR SENTRY (30 min)

#### 3.1 Get Sentry DSN

1. Ir a: https://sentry.io/
2. Login / Create account (Free tier)
3. **Create Project**:
   ```
   Platform: Angular
   Project name: autorenta-web
   Team: Default
   ```
4. Copiar DSN: `https://xxxxx@o123456.ingest.sentry.io/7890123`

---

#### 3.2 Add DSN to Environment

**Local development** (`apps/web/.env.development.local`):
```bash
NG_APP_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7890123
NG_APP_SENTRY_ENVIRONMENT=development
```

**Production** (Cloudflare Pages):

1. Ir a: Cloudflare Dashboard → Pages → autorenta-web
2. **Settings** → **Environment variables**
3. Add:
   ```
   NG_APP_SENTRY_DSN = https://xxxxx@o123456.ingest.sentry.io/7890123
   NG_APP_SENTRY_ENVIRONMENT = production
   ```
4. **Save** → **Redeploy**

---

#### 3.3 Verificar Sentry Funciona

```typescript
// En browser console de tu app
throw new Error('Sentry test error');
```

**✅ Verificación**:
- Ir a Sentry Dashboard
- Ver el error en **Issues**
- Debe aparecer en <5 minutos

---

### ☑️ 4. CONFIGURAR BACKUPS (15 min)

#### 4.1 Enable Automatic Backups

**Supabase Dashboard**:

1. **Settings** → **Database** → **Backups**
2. Verificar que **Daily backups** estén habilitados
3. **Point-in-time Recovery (PITR)**: Enable si plan lo permite
4. **Backup retention**: 7 days (mínimo)

---

#### 4.2 Create Manual Backup NOW

```
Settings → Database → Backups → Create backup

Name: pre-launch-backup
Description: Backup before production launch
```

**✅ Verificación**: Ver backup en lista con status "completed"

---

#### 4.3 Test Backup Download

1. Click en el backup creado
2. **Download** (guarda copia local por si acaso)
3. Guarda en lugar seguro (ej: Google Drive)

---

### ☑️ 5. LIMPIAR CONSOLE.LOGS CRÍTICOS (2 horas)

#### 5.1 Identificar Logs Sensibles

```bash
# Buscar logs con datos sensibles
cd apps/web/src

# Phone numbers
grep -r "console.log.*phone" --include="*.ts" | grep -v "//.*console.log"

# DNI/IDs
grep -r "console.log.*dni\|gov_id" --include="*.ts" | grep -v "//.*console.log"

# User data
grep -r "console.log.*user\|profile" --include="*.ts" | grep -v "//.*console.log"

# Payment data
grep -r "console.log.*payment\|wallet\|transaction" --include="*.ts" | grep -v "//.*console.log"
```

---

#### 5.2 Reemplazar en Archivos Críticos

**Archivos prioritarios** (revisar manualmente):

```bash
# Services críticos
apps/web/src/app/core/services/auth.service.ts
apps/web/src/app/core/services/profile.service.ts
apps/web/src/app/core/services/wallet.service.ts
apps/web/src/app/core/services/payments.service.ts
apps/web/src/app/core/services/bookings.service.ts
```

**Pattern de reemplazo**:

```typescript
// ❌ ANTES
console.log('User data:', user);
console.error('Payment failed:', error, paymentData);

// ✅ DESPUÉS
this.logger.info('User logged in', { userId: user.id });
this.logger.error('Payment failed', error, { paymentId: paymentData.id });

// NO logear:
// - phone, dni, email, address
// - account_number, card_number
// - passwords, tokens
// - access_token, refresh_token
```

---

#### 5.3 Script de Reemplazo Automatizado

Crear `tools/remove-sensitive-logs.sh`:

```bash
#!/bin/bash

echo "🔍 Buscando console.logs con datos sensibles..."

# Array de archivos críticos
files=(
  "apps/web/src/app/core/services/auth.service.ts"
  "apps/web/src/app/core/services/profile.service.ts"
  "apps/web/src/app/core/services/wallet.service.ts"
  "apps/web/src/app/core/services/withdrawal.service.ts"
  "apps/web/src/app/core/services/payments.service.ts"
  "apps/web/src/app/core/services/bookings.service.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Revisando: $file"

    # Comentar console.logs (no eliminar por seguridad)
    sed -i.bak 's/^\(\s*\)console\.log/\1\/\/ console.log/g' "$file"
    sed -i.bak 's/^\(\s*\)console\.error/\1\/\/ console.error/g' "$file"
    sed -i.bak 's/^\(\s*\)console\.warn/\1\/\/ console.warn/g' "$file"

    echo "✅ $file procesado"
  fi
done

echo "✨ Proceso completado. Revisa los cambios antes de commitear."
```

**Ejecutar**:
```bash
chmod +x tools/remove-sensitive-logs.sh
./tools/remove-sensitive-logs.sh

# Revisar cambios
git diff

# Si están bien:
git add -A
git commit -m "fix: remove sensitive data from console.logs"
git push
```

---

### ☑️ 6. CONFIGURAR MONITORING BÁSICO (1 hora)

#### 6.1 UptimeRobot (Free)

1. Ir a: https://uptimerobot.com/
2. **Sign up** (Free tier - 50 monitors)
3. **Add New Monitor**:
   ```
   Monitor Type: HTTPS
   Friendly Name: AutoRenta Web App
   URL: https://autorenta-web.pages.dev
   Monitoring Interval: 5 minutes
   ```
4. **Alert Contacts**:
   ```
   Email: tu-email@gmail.com
   Alert When Down: 2 times
   ```
5. **Create Monitor**

---

#### 6.2 Health Check Endpoint Monitor

```
Monitor Type: HTTPS
Friendly Name: AutoRenta API Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Monitoring Interval: 5 minutes
Success Criteria: Status Code 200
```

---

#### 6.3 Supabase Database Alerts

**Supabase Dashboard**:

1. **Settings** → **Notifications**
2. Enable:
   ```
   ☑ Database CPU > 80% (5 min)
   ☑ Database Memory > 85% (5 min)
   ☑ Storage > 80% of limit
   ```
3. Email: tu-email@gmail.com

---

### ☑️ 7. TESTING MANUAL END-TO-END (2 horas)

#### 7.1 User Journey: Locador (Publicar Auto)

```
□ 1. Register como locador
   Email: test-owner@test.com
   Password: Test1234!

□ 2. Complete onboarding
   Rol: Locador

□ 3. Upload documentos
   DNI, Licencia

□ 4. Esperar verificación (aprobar manualmente en admin)

□ 5. Publicar auto
   Marca: Toyota
   Modelo: Corolla
   Año: 2020
   Precio: 15000 ARS/día
   Fotos: 5 fotos
   Ubicación: Buenos Aires

□ 6. Verificar auto aparece en mapa

□ 7. Configurar disponibilidad en calendario
```

**✅ Verificación**:
- Auto visible en `/cars`
- Datos encriptados en DB
- Fotos cargadas correctamente

---

#### 7.2 User Journey: Locatario (Rentar Auto)

```
□ 1. Register como locatario
   Email: test-renter@test.com
   Password: Test1234!

□ 2. Complete onboarding
   Rol: Locatario

□ 3. Upload documentos
   DNI, Licencia

□ 4. Esperar verificación

□ 5. Buscar auto en mapa
   Filtrar por fecha
   Seleccionar auto publicado

□ 6. Crear booking
   Fechas: Próxima semana (3 días)
   Extras: Seguro básico

□ 7. Depositar fondos en wallet
   Método: MercadoPago (usar cuenta de prueba)
   Monto: 50000 ARS

□ 8. Aprobar booking (como locador en otra sesión)

□ 9. Check-in del auto
   Upload fotos
   Firmar FGO

□ 10. Check-out del auto
   Upload fotos
   Firmar FGO

□ 11. Completar booking

□ 12. Leave review
```

**✅ Verificación**:
- Booking completo sin errores
- Pago procesado correctamente
- Wallet balances correctos
- FGO persistido en DB
- Emails enviados en cada paso

---

#### 7.3 Admin Journey

```
□ 1. Login como admin
   (Crear admin user en DB si no existe)

□ 2. Panel de verificaciones
   Aprobar documentos de test users

□ 3. Panel de bookings
   Ver todos los bookings

□ 4. Panel de refunds
   Procesar un refund de prueba

□ 5. Panel de usuarios
   Ver lista de usuarios

□ 6. Panel de reviews
   Ver reviews pendientes
```

---

## ✅ VERIFICACIÓN FINAL DÍA 1

```bash
# Checklist de cierre

□ PII Encryption deployado y funcionando
□ Rate limiting activo (3 reglas mínimo)
□ Sentry capturando errores
□ Backups automáticos habilitados
□ Console.logs sensibles eliminados
□ Monitoring activo (UptimeRobot)
□ Testing end-to-end completo SIN errores

# Si todos ✅ → Día 1 COMPLETO
```

---

## 📅 DÍA 2: DOCUMENTACIÓN Y PREPARACIÓN

**Tiempo estimado**: 4-6 horas

---

### ☑️ 8. DOCUMENTACIÓN DE USUARIO (2 horas)

#### 8.1 Crear FAQ Básico

Archivo: `docs/user-guide/FAQ.md`

```markdown
# Preguntas Frecuentes

## ¿Qué es AutoRenta?
Plataforma de renta de autos entre particulares en Argentina.

## ¿Cómo publico mi auto?
1. Registrarte como Locador
2. Verificar tu identidad (DNI + Licencia)
3. Publicar auto con fotos y precio
4. Esperar aprobación (24-48hs)

## ¿Cómo rento un auto?
1. Registrarte como Locatario
2. Verificar tu identidad
3. Buscar auto en mapa
4. Crear booking y depositar fondos
5. Retirar auto (check-in con locador)

## ¿Cómo funcionan los pagos?
- Depósitos: MercadoPago (tarjeta, débito, efectivo)
- Wallet interno: Fondos disponibles y bloqueados
- Retiros: 85% para locador, 15% comisión plataforma

## ¿Qué pasa si hay daños?
- Check-in: Se registra estado del auto (fotos + firma)
- Check-out: Se compara con check-in
- Seguro opcional cubre daños menores
- Locador puede abrir disputa si hay daños

## Soporte
Email: soporte@autorenta.com
WhatsApp: [tu número]
```

---

#### 8.2 Guía Rápida Locador

Archivo: `docs/user-guide/GUIA_LOCADOR.md`

```markdown
# Guía Rápida - Locador

## 1. Registro y Verificación
1. Registrarte en autorenta.com
2. Elegir rol: "Quiero rentar mi auto"
3. Subir documentos:
   - DNI (frente y dorso)
   - Licencia de conducir
   - Foto de perfil
4. Esperar verificación (24-48hs)

## 2. Publicar Auto
1. Ir a "Mis Autos" → "Publicar Auto"
2. Completar datos:
   - Marca, modelo, año
   - Matrícula
   - Precio por día (ARS)
   - Ubicación exacta
3. Subir fotos (mínimo 5):
   - Frente
   - Lateral
   - Interior
   - Odómetro
   - Defectos existentes
4. Configurar disponibilidad en calendario
5. Publicar

## 3. Recibir Bookings
1. Recibirás notificación de nueva solicitud
2. Revisar perfil del locatario
3. Aprobar o rechazar booking
4. Coordinar lugar de entrega

## 4. Check-in (Entregar Auto)
1. Reunirte con locatario
2. Verificar identidad
3. Abrir app → "Check-in"
4. Tomar fotos del auto
5. Registrar odómetro y combustible
6. Firmar FGO digital
7. Entregar llaves

## 5. Check-out (Recibir Auto)
1. Reunirte con locatario
2. Abrir app → "Check-out"
3. Tomar fotos del auto
4. Registrar odómetro y combustible
5. Comparar con check-in
6. Firmar FGO digital
7. Si hay daños → Abrir disputa

## 6. Recibir Pago
1. Pago se libera automáticamente después de check-out
2. Fondos disponibles en tu wallet (85% del total)
3. Retirar a tu cuenta bancaria:
   - Ir a "Wallet" → "Retirar"
   - Agregar cuenta bancaria (CBU/CVU)
   - Solicitar retiro
   - Recibir en 24-48hs
```

---

#### 8.3 Guía Rápida Locatario

Archivo: `docs/user-guide/GUIA_LOCATARIO.md`

```markdown
# Guía Rápida - Locatario

## 1. Registro y Verificación
[Similar a locador...]

## 2. Buscar Auto
1. Ir a mapa principal
2. Filtrar por:
   - Fechas necesarias
   - Rango de precio
   - Ubicación
3. Ver detalles del auto
4. Revisar perfil del locador

## 3. Crear Booking
1. Seleccionar fechas
2. Agregar extras (seguros, GPS, etc)
3. Ver precio total
4. Crear solicitud
5. Esperar aprobación del locador

## 4. Depositar Fondos
1. Ir a "Wallet" → "Depositar"
2. Elegir método:
   - Tarjeta de crédito
   - Tarjeta de débito
   - Efectivo (Rapipago, PagoFácil)
3. Ingresar monto
4. Completar pago
5. Fondos disponibles en 24-48hs (efectivo)

## 5. Check-in (Retirar Auto)
[Similar a locador...]

## 6. Durante la Renta
- Cuidar el auto
- Respetar términos del booking
- Contactar al locador si hay problemas

## 7. Check-out (Devolver Auto)
[Similar a locador...]

## 8. Dejar Review
1. Calificar experiencia (1-5 estrellas)
2. Comentario sobre el auto
3. Comentario sobre el locador
4. Publicar review
```

---

### ☑️ 9. TÉRMINOS Y CONDICIONES (1 hora)

**IMPORTANTE**: Consultar con abogado para versión final.

Archivo: `docs/legal/TERMS_AND_CONDITIONS.md`

Template básico (adaptar para Argentina):

```markdown
# Términos y Condiciones - AutoRenta

Última actualización: [FECHA]

## 1. Aceptación de Términos
Al usar AutoRenta, aceptas estos términos...

## 2. Definiciones
- Locador: Persona que renta su auto
- Locatario: Persona que renta un auto
- Booking: Reserva de auto
- FGO: Fine Grained Observation (inspección detallada)

## 3. Servicios
AutoRenta es una plataforma que conecta locadores y locatarios...

## 4. Registro y Verificación
- Debes ser mayor de 21 años
- Licencia de conducir vigente
- DNI/CUIT válido
- Verificación de identidad requerida

## 5. Publicación de Autos
- El auto debe estar en condiciones legales
- Seguro vigente requerido
- Fotos reales y actuales
- Precio en ARS

## 6. Bookings
- Mínimo 24hs de anticipación
- Depósito de seguridad requerido
- Cancelación: [política de cancelación]

## 7. Pagos y Comisiones
- Comisión plataforma: 15%
- Pago al locador: 85%
- Métodos: MercadoPago
- Retiros: 24-48hs hábiles

## 8. Seguros
- Seguro básico incluido
- Seguros premium opcionales
- Cobertura de daños: [detalles]

## 9. Responsabilidades
- Locador: Mantener auto en buenas condiciones
- Locatario: Cuidar el auto, respetar términos

## 10. Disputas
- Proceso de resolución de disputas
- Mediación por plataforma
- Escalación si necesario

## 11. Privacidad
Ver Política de Privacidad

## 12. Limitación de Responsabilidad
AutoRenta no se hace responsable...

## 13. Modificaciones
Nos reservamos el derecho de modificar estos términos...

## 14. Ley Aplicable
Ley Argentina. Jurisdicción: Buenos Aires.

## 15. Contacto
Email: legal@autorenta.com
```

---

### ☑️ 10. POLÍTICA DE PRIVACIDAD (1 hora)

Archivo: `docs/legal/PRIVACY_POLICY.md`

```markdown
# Política de Privacidad - AutoRenta

**GDPR Compliant** ✅

## 1. Información que Recopilamos

### Datos Personales
- Nombre completo
- Email
- Teléfono
- Dirección
- DNI/CUIT
- Licencia de conducir
- Foto de perfil

### Datos Financieros
- CBU/CVU (encriptado ✅)
- Historial de transacciones
- Saldo de wallet

### Datos de Uso
- Navegación en la plataforma
- Bookings realizados
- Reviews publicadas

## 2. Cómo Usamos tu Información
- Verificar identidad
- Procesar bookings
- Procesar pagos
- Mejorar la plataforma
- Comunicaciones importantes

## 3. Encriptación de Datos Sensibles
✅ **TODOS los datos personales están encriptados** con AES-256.

Datos encriptados:
- Teléfono
- Dirección
- DNI
- Licencia de conducir
- Datos bancarios (CBU/CVU/alias)

## 4. Compartir Información
NO compartimos tu información con terceros, excepto:
- MercadoPago (para procesar pagos)
- Servicios de verificación de identidad
- Autoridades (si requerido por ley)

## 5. Tus Derechos (GDPR)
- ✅ Derecho de acceso
- ✅ Derecho de rectificación
- ✅ Derecho al olvido (eliminación)
- ✅ Derecho de portabilidad
- ✅ Derecho de oposición

Para ejercer: privacy@autorenta.com

## 6. Cookies
Usamos cookies para:
- Mantener sesión
- Mejorar experiencia
- Analytics (Google Analytics)

Puedes deshabilitarlas en tu browser.

## 7. Retención de Datos
- Datos activos: Mientras uses la plataforma
- Datos inactivos: 2 años después de última actividad
- Eliminación: A pedido del usuario

## 8. Seguridad
- Encriptación AES-256 ✅
- HTTPS obligatorio ✅
- Backups diarios ✅
- Monitoreo 24/7 ✅

## 9. Menores de Edad
No aceptamos usuarios menores de 21 años.

## 10. Cambios a esta Política
Notificaremos cambios por email.

## 11. Contacto
Email: privacy@autorenta.com
DPO: [Nombre del responsable]

Última actualización: [FECHA]
```

---

### ☑️ 11. MATERIALES DE MARKETING (1-2 horas)

#### 11.1 Landing Page Copy

```markdown
# AutoRenta - Rentá o Rentá tu Auto

## Hero Section
**Rentá el auto perfecto**
Miles de autos disponibles en toda Argentina.
Desde $5,000/día.

[Buscar Auto] [Publicar mi Auto]

## Cómo Funciona

### Para Locatarios
1. 🔍 Buscá el auto perfecto
2. 💳 Reservá y pagá seguro
3. 🚗 Retirá y disfrutá
4. ⭐ Dejá tu review

### Para Locadores
1. 📸 Publicá tu auto
2. 📅 Configurá disponibilidad
3. 💰 Recibí bookings
4. 🏦 Cobrá automáticamente

## Por qué AutoRenta

✅ Verificación de identidad
✅ Seguro incluido
✅ Pago seguro (MercadoPago)
✅ Soporte 24/7
✅ Sin comisiones ocultas (15% flat)

## Testimonios
[Por agregar después de primeros usuarios]

## FAQ
[Link a FAQ]

## Footer
Términos | Privacidad | Contacto
© 2025 AutoRenta
```

---

#### 11.2 Redes Sociales - Posts de Lanzamiento

**Post 1 - Anuncio**:
```
🚀 LANZAMIENTO: AutoRenta está aquí!

La plataforma de renta de autos entre particulares
ya está disponible en Argentina.

✅ Miles de autos disponibles
✅ Precios desde $5,000/día
✅ Verificación de identidad
✅ Pago 100% seguro

¿Tenés un auto? ¡Ganá dinero extra rentándolo!
¿Necesitás un auto? ¡Encontrá el perfecto para vos!

👉 [LINK]

#AutoRenta #RentaDeAutos #Argentina #Startup
```

**Post 2 - Locadores**:
```
💰 Tu auto puede generar $50,000+ por mes

¿Usás tu auto solo los fines de semana?
Rentalo el resto de la semana y ganá dinero.

Con AutoRenta:
• Publicás en 5 minutos
• Configurás tu disponibilidad
• Aprobás bookings
• Cobrás automáticamente (85% para vos)

Sin comisiones ocultas. Sin sorpresas.

👉 Empezá a ganar: [LINK]
```

**Post 3 - Locatarios**:
```
🚗 El auto perfecto para tu próximo viaje

¿Necesitás un auto?
No pagues fortunas en rent-a-cars tradicionales.

AutoRenta te conecta con dueños locales:
• Precios hasta 50% más baratos
• Más opciones (Toyota, Honda, Ford, etc)
• Dueños verificados
• Seguro incluido

Tu próximo road trip empieza acá 👇
[LINK]
```

---

## ✅ VERIFICACIÓN FINAL DÍA 2

```bash
□ FAQ creado
□ Guía de locador completa
□ Guía de locatario completa
□ Términos y condiciones (draft)
□ Política de privacidad (GDPR compliant)
□ Landing page copy
□ Posts para redes sociales preparados

# Si todos ✅ → Día 2 COMPLETO
```

---

## 📅 DÍA 3: LANZAMIENTO 🚀

**Tiempo estimado**: 4-6 horas

---

### ☑️ 12. PRE-FLIGHT CHECK (1 hora)

#### 12.1 Verificación Técnica Final

```bash
# 1. App funcionando
curl -I https://autorenta-web.pages.dev
# Debe retornar: HTTP/2 200

# 2. API funcionando
curl -I https://obxvffplochgeiclibng.supabase.co/rest/v1/cars?limit=1
# Debe retornar: HTTP/2 200

# 3. Health check
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
# Debe retornar: {"status":"healthy",...}

# 4. Rate limiting activo
for i in {1..6}; do
  curl -X POST https://obxvffplochgeiclibng.supabase.co/auth/v1/token \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
# 6ta request debe retornar: 429

# 5. Sentry capturando errores
# Ir a dashboard.sentry.io
# Verificar últimos errores

# 6. Monitoring activo
# Ir a uptimerobot.com
# Verificar monitors "Up"
```

---

#### 12.2 Checklist de Funcionalidades

```bash
# User Registration & Auth
□ Sign up funciona
□ Login funciona
□ Magic link funciona
□ Password reset funciona
□ Logout funciona

# Profile Management
□ Upload avatar
□ Edit profile (phone, address, DNI)
□ Verificar datos encriptados en DB
□ Upload documents (DNI, licencia)

# Cars (Locador)
□ Publicar auto
□ Upload fotos (mínimo 5)
□ Configurar disponibilidad
□ Editar auto
□ Pausar/despausar auto

# Bookings (Locatario)
□ Buscar autos en mapa
□ Filtrar por fecha, precio
□ Ver detalle de auto
□ Crear booking
□ Ver bookings activos

# Wallet
□ Depositar fondos (MercadoPago test)
□ Ver balance
□ Ver transacciones
□ Agregar cuenta bancaria (encriptado)
□ Solicitar retiro

# FGO
□ Check-in: Upload fotos + firma
□ Check-out: Upload fotos + firma
□ Verificar datos persistidos en DB

# Admin
□ Login como admin
□ Aprobar verificaciones
□ Ver bookings
□ Procesar refunds

# Notifications
□ Email de bienvenida
□ Email de booking creado
□ Email de booking aprobado
□ Email de check-in/out
```

---

### ☑️ 13. CONFIGURAR DOMINIO (Opcional, 30 min)

Si tienes dominio propio (ej: `autorenta.com`):

```bash
# 1. Cloudflare DNS
# Agregar registros:
Type: CNAME
Name: @
Target: autorenta-web.pages.dev

Type: CNAME
Name: www
Target: autorenta-web.pages.dev

# 2. Cloudflare Pages
# Settings → Custom domains → Add domain
# Dominio: autorenta.com
# Wait for DNS propagation (5-30 min)

# 3. Verificar
curl -I https://autorenta.com
# Debe retornar: HTTP/2 200

# 4. Actualizar environment variables
NG_APP_BASE_URL=https://autorenta.com
```

---

### ☑️ 14. CREAR USUARIOS DE PRUEBA (30 min)

Para mostrar a primeros usuarios:

```sql
-- Usuario Locador de ejemplo
INSERT INTO profiles (id, full_name, email, role, verified)
VALUES (
  gen_random_uuid(),
  'Juan Pérez',
  'demo-owner@autorenta.com',
  'owner',
  true
);

-- Auto de ejemplo
INSERT INTO cars (owner_id, brand_id, model_id, year, price_per_day, status)
VALUES (
  [id del usuario de arriba],
  [Toyota brand_id],
  [Corolla model_id],
  2020,
  15000,
  'active'
);
```

O crear manualmente via app.

---

### ☑️ 15. LANZAMIENTO 🚀 (2 horas)

#### 15.1 Publicar en Redes Sociales

**Instagram**:
```
[Imagen del hero de tu app]

🚀 LANZAMIENTO OFICIAL

AutoRenta ya está VIVO! 🎉

La forma más fácil de rentar autos en Argentina.

✅ Verificación de identidad
✅ Pago 100% seguro
✅ Seguro incluido
✅ Sin sorpresas

¿Tenés un auto? Ganá $50k+ por mes
¿Necesitás un auto? Desde $5k/día

Link en bio 👆

#AutoRenta #RentaDeAutos #Argentina
#CarRental #Startup #Emprendimiento
```

**Facebook**:
[Same content]

**Twitter/X**:
```
🚀 Lanzamos AutoRenta!

Rentá o rentá tu auto en Argentina.

✅ Seguro
✅ Verificado
✅ Fácil

👉 autorenta.com

#AutoRenta #RentaDeAutos
```

**LinkedIn**:
```
Estoy emocionado de anunciar el lanzamiento de AutoRenta 🚀

Después de [X] meses de desarrollo, hoy lanzamos la plataforma
que conecta propietarios de autos con personas que los necesitan.

¿Por qué AutoRenta?
• Verificación de identidad obligatoria
• Pagos 100% seguros con MercadoPago
• Seguro incluido en cada booking
• Comisión transparente (15% flat)

Si conocés a alguien que:
- Tiene un auto que usa poco → Puede ganar $50k+ por mes
- Necesita un auto por días → Puede rentar desde $5k/día

Compartí este post 🙏

👉 autorenta.com

#Startup #Argentina #CarSharing #Emprendimiento
```

---

#### 15.2 Email a Early Adopters

Si tienes lista de espera:

```
Asunto: 🚀 AutoRenta ya está VIVO!

Hola [Nombre],

Te registraste en nuestra lista de espera y hoy es el día:
AutoRenta está oficialmente disponible! 🎉

Qué puedes hacer ahora:
• Si tenés un auto: Publicalo y empezá a ganar
• Si necesitás un auto: Buscá el perfecto para vos

Beneficio de early adopter:
🎁 50% OFF en comisión los primeros 3 meses
   (7.5% en vez de 15%)

Código: EARLY2025

👉 Entrá acá: [LINK]

Cualquier duda, respondé este email.

¡Gracias por creer en nosotros!

[Tu nombre]
Founder, AutoRenta

PD: Si conocés a alguien que le sirva, compartí 🙏
```

---

#### 15.3 Product Hunt (Opcional)

Si quieres lanzar en Product Hunt:

1. Ir a: https://www.producthunt.com/
2. **Submit** → **Product**
3. Completar:
   ```
   Name: AutoRenta
   Tagline: Peer-to-peer car rental in Argentina
   Description: [Tu descripción]
   Link: autorenta.com
   Topics: Travel, Marketplace, SaaS
   ```
4. Lanzar un martes o miércoles (mejor engagement)

---

#### 15.4 Grupos de Facebook/WhatsApp

Publicar en grupos relevantes:
- Grupos de emprendedores argentinos
- Grupos de autos/mecánica
- Grupos de viajes
- Grupos de tu ciudad

Mensaje:
```
Hola! Quería compartirles un proyecto que lancé hoy:

AutoRenta - Plataforma de renta de autos entre particulares

Si tenés un auto que usás poco, podés rentarlo y ganar plata.
Si necesitás un auto por días, podés rentarlo más barato que tradicional.

Todo con verificación de identidad y pago seguro.

👉 [LINK]

Feedback bienvenido!
```

---

### ☑️ 16. MONITOREO POST-LANZAMIENTO (continuo)

#### 16.1 Dashboard de Monitoreo (tener abierto)

**Tabs a tener abiertos**:

1. **Sentry**: dashboard.sentry.io
   - Ver errores en tiempo real

2. **UptimeRobot**: uptimerobot.com/dashboard
   - Ver uptime de la app

3. **Supabase**: supabase.com/dashboard
   - Ver Database Performance
   - Ver Real-time queries

4. **Cloudflare**: dash.cloudflare.com
   - Ver Analytics
   - Ver Rate Limit triggers

5. **Google Analytics** (si configuraste):
   - Ver usuarios activos en tiempo real

---

#### 16.2 Métricas Clave (Primeras 24hs)

```bash
# Registros
SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '24 hours';

# Autos publicados
SELECT COUNT(*) FROM cars WHERE created_at > NOW() - INTERVAL '24 hours';

# Bookings creados
SELECT COUNT(*) FROM bookings WHERE created_at > NOW() - INTERVAL '24 hours';

# Errores en Sentry
# Ver dashboard

# Uptime
# Ver UptimeRobot (debe ser 100%)

# Rate limit triggers
# Ver Cloudflare Analytics
```

---

#### 16.3 Plan de Respuesta a Incidentes

**Si la app se cae**:
```
1. Verificar Sentry → Ver último error
2. Verificar UptimeRobot → Confirmar down
3. Verificar Supabase → Database status
4. Verificar Cloudflare → CDN status

5. Si es bug de código:
   - Revertir último deploy
   - Investigar y arreglar
   - Redeploy

6. Si es Supabase/Cloudflare down:
   - Esperar a que se recupere
   - Comunicar en redes sociales

7. Notificar usuarios vía:
   - Post en redes sociales
   - Email si es largo (>1 hora)
```

**Si hay bug crítico**:
```
1. Identificar en Sentry
2. Reproducir localmente
3. Arreglar
4. Test manual
5. Deploy
6. Verificar fix en producción
7. Monitorear por 30 min
```

---

## ✅ VERIFICACIÓN FINAL - GO LIVE

```bash
□ App deployada y funcionando
□ PII encryption activo
□ Rate limiting activo
□ Sentry capturando errores
□ Backups configurados
□ Monitoring activo
□ Documentación de usuario creada
□ Términos y privacidad publicados
□ Posts en redes sociales publicados
□ Monitoreo activo (dashboards abiertos)

# Si todos ✅ → LANZAMIENTO COMPLETO 🎉
```

---

## 📊 CHECKLIST POST-LANZAMIENTO

### Primera Semana

```bash
□ Día 1: Monitoreo intensivo (todo el día)
□ Día 2: Review errores en Sentry, arreglar bugs
□ Día 3: Hablar con primeros usuarios, feedback
□ Día 4: Iterar features basado en feedback
□ Día 5: Optimizar basado en métricas reales
□ Día 6-7: Plan para próxima semana
```

---

### Primera Mes

```bash
□ Semana 1: Lanzamiento + monitoreo + hotfixes
□ Semana 2: Agregar tests a servicios críticos
□ Semana 3: Refactoring de archivos grandes
□ Semana 4: Features más solicitadas por usuarios
```

---

## 🎯 MÉTRICAS DE ÉXITO

### Semana 1
- ✅ 0 errores críticos (app no se cae)
- 🎯 10+ registros
- 🎯 3+ autos publicados
- 🎯 1+ booking completado

### Mes 1
- 🎯 100+ usuarios registrados
- 🎯 20+ autos publicados
- 🎯 10+ bookings completados
- 🎯 Uptime > 99%
- 🎯 Primeros reviews positivos

### Mes 3
- 🎯 500+ usuarios
- 🎯 100+ autos
- 🎯 50+ bookings/mes
- 🎯 Test coverage > 60%
- 🎯 Código refactorizado (archivos < 600 líneas)

---

## 📞 RECURSOS DE EMERGENCIA

### Contactos Críticos

```
Supabase Support: support@supabase.com
Cloudflare Support: https://support.cloudflare.com/
MercadoPago Dev: https://www.mercadopago.com.ar/developers

Sentry: support@sentry.io
```

### Rollback Plan

```bash
# Si necesitas revertir deploy
# Cloudflare Pages
1. Ir a: Cloudflare Dashboard → Pages → autorenta-web
2. Deployments → Ver lista de deployments
3. Click en deployment anterior → Rollback to this deployment

# Supabase Migrations
1. Restore backup
2. Settings → Database → Backups
3. Select backup → Restore

# Código
git revert [commit-hash]
git push origin main
```

---

## 🎉 CELEBRACIÓN

```
Si llegaste acá y completaste TODO el checklist:

🎊 FELICITACIONES! 🎊

Lanzaste tu startup!

Ahora lo importante:
1. Escuchar a tus usuarios
2. Iterar rápido
3. No perseguir perfección
4. Disfrutar el proceso

El código mejora con el tiempo.
Lo crítico es tener usuarios reales.

¡ÉXITO! 🚀
```

---

**Checklist creado**: 2025-11-09
**Última actualización**: 2025-11-09
**Versión**: 1.0
**Status**: Ready to execute
