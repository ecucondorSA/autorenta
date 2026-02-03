# Auditoría de Migración Supabase

**Fecha:** 2026-02-03
**Proyecto Antiguo:** `pisqjmoklivzpwufhscx`
**Proyecto Nuevo:** `aceacpaockyxgogxsfyc`

---

## 1. GitHub Secrets - Estado Actual

### ✅ Configurados Correctamente
| Secret | Estado | Fecha |
|--------|--------|-------|
| SUPABASE_ACCESS_TOKEN | ✅ Nuevo token | 2026-02-03 |
| SUPABASE_PROJECT_ID | ✅ `aceacpaockyxgogxsfyc` | 2026-02-03 |
| SUPABASE_ANON_KEY | ✅ Actualizado | 2026-02-03 |
| SUPABASE_DB_PASSWORD | ✅ | 2026-02-03 |
| NG_APP_SUPABASE_URL | ✅ | 2026-02-03 |
| NG_APP_SUPABASE_ANON_KEY | ✅ | 2026-02-03 |
| MERCADOPAGO_ACCESS_TOKEN | ✅ | 2026-02-02 |

### ⚠️ Verificar en GitHub Secrets
Estos secrets deben tener los valores del NUEVO proyecto:
- `SUPABASE_SERVICE_ROLE_KEY` → Debe ser el del nuevo proyecto

---

## 2. Supabase Edge Functions Secrets

**Estado actual del nuevo proyecto (aceacpaockyxgogxsfyc):**
- SUPABASE_URL ✅
- SUPABASE_ANON_KEY ✅
- SUPABASE_SERVICE_ROLE_KEY ✅
- SUPABASE_DB_URL ✅

**ACCIÓN REQUERIDA:** Configurar estos secrets en:
https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/settings/functions

### Secrets Encontrados en Archivos Locales (VALORES DISPONIBLES)

```bash
# Google Cloud (de .env)
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0858183694
GOOGLE_CLOUD_LOCATION=global

# Gemini API Key (de tools/stagehand-poc/.env)
GEMINI_API_KEY=AIzaSyBZX0Tx8qu8PTEfIbdhsicsjmpSqWLTNYw

# Mapbox (de apps/.env.local)
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaXltdHhqMDBoNGQzZXEwNW9idDBhMDUifQ.rY_vmPzdGQiUksrSMuXrhg
```

### Secrets que REQUIEREN VALORES MANUALES (No encontrados localmente)

**Estos secrets están en GitHub pero son write-only. Necesitas copiarlos desde donde los tengas guardados:**

```bash
# MercadoPago (CRÍTICO - requerido para pagos)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...  # Obtener de: https://www.mercadopago.com.ar/developers/panel/app
MERCADOPAGO_CLIENT_ID=...
MERCADOPAGO_CLIENT_SECRET=...

# Twilio WhatsApp (requerido para OTP)
TWILIO_ACCOUNT_SID=...  # Obtener de: https://console.twilio.com
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...

# Resend Email
RESEND_API_KEY=...  # Obtener de: https://resend.com/api-keys

# N8N Webhooks
N8N_OTP_WEBHOOK_URL=...
N8N_WEBHOOK_SECRET=...

# PayPal (si se usa)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# FIPE (si se usa)
FIPE_API_KEY=...

# Stability AI (si se usa)
STABILITY_API_KEY=...
```

---

## 3. Base de Datos - Estado

### ⚠️ Problema CRÍTICO: Objetos Faltantes
El frontend muestra múltiples errores 400/404 porque faltan:

| Objeto | Tipo | Error | Estado |
|--------|------|-------|--------|
| `wallet_get_balance` | RPC Function | 400 Bad Request | ⚠️ Falta |
| `v_wallet_history` | View | 404 Not Found | ⚠️ Falta |
| `cars_owner_id_fkey` | FK Constraint | "Could not find relationship" | ⚠️ Falta |
| `my_bookings` | View | 400 Bad Request | ⚠️ Falta |
| `user_verifications` | Table | 400 Bad Request | ⚠️ Falta |

### ✅ SOLUCIÓN: Aplicar Script Completo

**Archivo creado:** `/home/edu/autorenta/APPLY_TO_NEW_PROJECT.sql`

**Instrucciones:**
1. Abrir SQL Editor: https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/sql/new
2. Copiar contenido de `APPLY_TO_NEW_PROJECT.sql`
3. Ejecutar el script
4. Verificar que aparezca `✅ Schema fix script completed!`

**El script crea:**
- FK `cars_owner_id_fkey` → Habilita joins `cars(*,owner:profiles!cars_owner_id_fkey(*))`
- FK `bookings_renter_id_fkey` → Habilita joins con profiles
- FK `bookings_owner_id_fkey` → Habilita joins con profiles
- View `v_wallet_history` → Historial de transacciones de wallet
- Function `wallet_get_balance(UUID)` → RPC para balance de wallet
- View `my_bookings` → Reservas del usuario actual
- View `owner_bookings` → Reservas como propietario
- Table `user_verifications` → Verificaciones de usuario
- Table `risk_assessments` → Evaluaciones de riesgo
- Table `wallets` + `wallet_transactions` → Sistema de wallet
- Trigger `ensure_wallet_on_profile` → Crea wallet automática para nuevos usuarios

### ✅ Funciones Ya Corregidas
- `get_available_cars` - Ejecutada manualmente en SQL Editor

---

## 4. Edge Functions - Deploy Pendiente

Las Edge Functions NO se deployaron porque el paso de migraciones falló.

**ACCIÓN:** Después de configurar secrets, ejecutar:
```bash
supabase functions deploy --project-ref aceacpaockyxgogxsfyc
```

### Funciones Críticas a Verificar
1. `mercadopago-webhook` - Recepción de pagos
2. `mercadopago-process-booking-payment` - Procesar pagos
3. `send-push-notification` - Notificaciones
4. `release-expired-deposits` - Cron de depósitos
5. `renew-preauthorizations` - Cron de pre-auth

---

## 5. Storage Buckets

**VERIFICAR** que existan estos buckets en el nuevo proyecto:
- `cars` - Fotos de vehículos
- `documents` - Documentos de verificación
- `inspections` - Videos/fotos de inspección
- `avatars` - Fotos de perfil
- `identity-documents` - Documentos de identidad

**URL:** https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/storage/buckets

---

## 6. Auth Providers

**VERIFICAR** configuración en:
https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/auth/providers

- [ ] Email habilitado
- [ ] Google OAuth configurado
- [ ] Apple OAuth configurado (si aplica)
- [ ] Facebook OAuth configurado (si aplica)

---

## 7. Cron Jobs (pg_cron)

**VERIFICAR** en SQL Editor:
```sql
SELECT * FROM cron.job;
```

Jobs críticos:
- `release-expired-deposits` - Cada hora
- `renew-preauthorizations` - Cada 6 horas
- `process-payment-queue` - Cada 5 minutos

---

## 8. Webhooks Externos

**ACTUALIZAR** URLs en servicios externos:
- MercadoPago webhook → `https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/mercadopago-webhook`
- PayPal webhook → `https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/paypal-webhook`

---

## Checklist de Migración

- [x] GitHub Secrets actualizados
- [x] Access Token generado
- [x] `get_available_cars` corregido
- [ ] **⚡ CRÍTICO: Ejecutar `APPLY_TO_NEW_PROJECT.sql` en SQL Editor**
- [ ] **Secrets de Edge Functions configurados**
- [ ] **Edge Functions deployadas**
- [ ] Storage buckets verificados
- [ ] Auth providers configurados
- [ ] Cron jobs verificados
- [ ] Webhooks externos actualizados

---

## Comandos Útiles

```bash
# Ver secrets del proyecto Supabase
supabase secrets list --project-ref aceacpaockyxgogxsfyc

# Deploy edge functions
supabase functions deploy --project-ref aceacpaockyxgogxsfyc

# Ver logs de edge functions
supabase functions logs <function-name> --project-ref aceacpaockyxgogxsfyc
```
