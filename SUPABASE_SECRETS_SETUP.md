# ⚙️ Configuración de Supabase Secrets - Quick Reference

## 🚀 Configuración Rápida

### Opción 1: Script Automatizado (Recomendado)

```bash
# Desarrollo local
./scripts/configure-supabase-secrets.sh development

# Staging
./scripts/configure-supabase-secrets.sh staging

# Producción
./scripts/configure-supabase-secrets.sh production
```

### Opción 2: Manual

```bash
# 1. Login
npx supabase login

# 2. Configurar FRONTEND_URL (cambiar según environment)
npx supabase secrets set FRONTEND_URL=http://localhost:4200

# 3. Verificar
npx supabase secrets list
```

## 📋 FRONTEND_URL por Environment

| Environment | URL |
|-------------|-----|
| **Development** | `http://localhost:4200` |
| **Staging** | `https://staging.autorentar.com` |
| **Production** | `https://autorentar.com` |

## ✅ Verificación

```bash
# Listar secrets configurados
npx supabase secrets list

# Debe mostrar:
# FRONTEND_URL
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
# MERCADOPAGO_ACCESS_TOKEN
```

## 📚 Documentación Completa

Ver [`docs/supabase-secrets-configuration.md`](./docs/supabase-secrets-configuration.md) para:
- Configuración de todos los secrets
- Troubleshooting
- Uso de `.env.local` para desarrollo
- Referencias a documentación de Supabase

## 🔧 Configurar Otros Secrets

```bash
# Google Calendar OAuth
npx supabase secrets set GOOGLE_CLIENT_ID=your-client-id
npx supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret

# MercadoPago
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=your-mp-token
```

---

**⚠️ Importante:** Después de configurar secrets, deployá las edge functions:

```bash
npx supabase functions deploy google-calendar-oauth
npx supabase functions deploy sync-booking-to-calendar
```
