# Configuración de Supabase Secrets

## Secrets Requeridos por Environment

### Development (Local)
```bash
FRONTEND_URL=http://localhost:4200
```

### Staging
```bash
FRONTEND_URL=https://staging.autorentar.com
```

### Production
```bash
FRONTEND_URL=https://autorentar.com
```

## Configuración Rápida

### Método 1: Script Automatizado (Recomendado)

```bash
# Desarrollo
./scripts/configure-supabase-secrets.sh development

# Staging
./scripts/configure-supabase-secrets.sh staging

# Producción
./scripts/configure-supabase-secrets.sh production
```

### Método 2: Manual

```bash
# 1. Login en Supabase CLI
npx supabase login

# 2. Configurar FRONTEND_URL
npx supabase secrets set FRONTEND_URL=http://localhost:4200

# 3. Verificar
npx supabase secrets list
```

## Secrets Completos por Edge Function

### google-calendar-oauth
```bash
FRONTEND_URL=http://localhost:4200
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### sync-booking-to-calendar
```bash
FRONTEND_URL=http://localhost:4200
```

### mercadopago-create-preference
```bash
MERCADOPAGO_ACCESS_TOKEN=your-mp-token
FRONTEND_URL=http://localhost:4200
```

### mercadopago-webhook
```bash
MERCADOPAGO_ACCESS_TOKEN=your-mp-token
FRONTEND_URL=http://localhost:4200
```

## Configurar Todos los Secrets

```bash
# Frontend URL (según environment)
npx supabase secrets set FRONTEND_URL=http://localhost:4200

# Google Calendar OAuth
npx supabase secrets set GOOGLE_CLIENT_ID=your-client-id
npx supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret

# MercadoPago
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=your-mp-token
```

## Verificación

```bash
# Listar todos los secrets (no muestra valores)
npx supabase secrets list

# Verificar que las edge functions arranquen
npx supabase functions serve

# Test de una función específica
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/your-function' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"test": true}'
```

## Troubleshooting

### Error: Secret not found
```bash
# Verificar que el secret esté configurado
npx supabase secrets list

# Si no aparece, configurarlo
npx supabase secrets set FRONTEND_URL=http://localhost:4200
```

### Error: Invalid URL
```bash
# Verificar el valor del secret
# El URL debe incluir el protocolo (http:// o https://)
# Sin barra final
✅ Correcto: http://localhost:4200
❌ Incorrecto: localhost:4200
❌ Incorrecto: http://localhost:4200/
```

### Secrets no se aplican
```bash
# Los secrets se aplican al deploar la función
npx supabase functions deploy your-function

# Para desarrollo local, usar .env.local
# Crear supabase/functions/.env.local:
FRONTEND_URL=http://localhost:4200
GOOGLE_CLIENT_ID=...
```

## Development con .env.local

Para desarrollo local, podés crear `supabase/functions/.env.local`:

```bash
# supabase/functions/.env.local
FRONTEND_URL=http://localhost:4200
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-client-secret
MERCADOPAGO_ACCESS_TOKEN=TEST-your-test-token
```

**⚠️ Importante:** No commitear `.env.local` al repositorio.

## URLs por Environment

| Environment | FRONTEND_URL | Uso |
|-------------|--------------|-----|
| Development | `http://localhost:4200` | Local development |
| Staging | `https://staging.autorentar.com` | Testing pre-production |
| Production | `https://autorentar.com` | Live production |

## Edge Functions que Usan FRONTEND_URL

1. **google-calendar-oauth** - Redirect después de OAuth
2. **sync-booking-to-calendar** - URLs en eventos de calendario
3. **mercadopago-create-preference** - Success/failure URLs
4. **mercadopago-webhook** - Notificaciones a frontend

## Comandos Útiles

```bash
# Ver secrets configurados
npx supabase secrets list

# Configurar un secret
npx supabase secrets set SECRET_NAME=value

# Eliminar un secret
npx supabase secrets unset SECRET_NAME

# Ver logs de una función (para debug)
npx supabase functions logs your-function

# Deploy de una función (aplica los secrets)
npx supabase functions deploy your-function
```

## Referencias

- [Supabase Edge Functions - Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI - Secrets Commands](https://supabase.com/docs/reference/cli/supabase-secrets)
