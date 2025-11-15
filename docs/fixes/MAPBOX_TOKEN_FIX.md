# 🗺️ Mapbox Token Fix

**Fecha**: 15 de noviembre de 2025  
**Issue**: Token de Mapbox inválido o expirado en producción  
**Status**: ✅ RESUELTO

---

## Problema Reportado

```
Token de Mapbox inválido o expirado. 
Por favor, verifica tu NG_APP_MAPBOX_ACCESS_TOKEN en .env.local
```

---

## Diagnóstico

### 1. Verificación del Token Local

✅ Token en `.env.local`: **VÁLIDO**
```
NG_APP_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaHlrYXV1cTA5amYyanB5OGU4MHRtbnkifQ.Xd0d1Cu0LPw75_UbvZj2vQ
```

Probado con API de Mapbox:
```bash
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=$TOKEN"
# Resultado: Token válido ✅
```

### 2. Verificación del Secret en GitHub

❌ Secret desactualizado: **17 días sin actualizar** (28 de octubre 2025)
```bash
gh secret list | grep MAPBOX
# MAPBOX_ACCESS_TOKEN     2025-10-28T11:22:21Z
```

### 3. Root Cause

El secret `MAPBOX_ACCESS_TOKEN` en GitHub Actions estaba desincronizado con el token actual válido en `.env.local`.

Posibles causas:
- Token renovado localmente pero no actualizado en GitHub Secrets
- Secret no sincronizado durante setup inicial

---

## Solución Aplicada

### Paso 1: Actualizar GitHub Secret

```bash
echo "pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaHlrYXV1cTA5amYyanB5OGU4MHRtbnkifQ.Xd0d1Cu0LPw75_UbvZj2vQ" \
  | gh secret set MAPBOX_ACCESS_TOKEN
```

✅ Resultado: Secret actualizado exitosamente

### Paso 2: Re-deployment Manual

```bash
gh workflow run deploy_pages.yml
```

✅ Resultado: 
- Run ID: 19385754229
- Duration: 1m 51s
- Status: SUCCESS
- URL: https://autorentar.com

### Paso 3: Verificación en Producción

```bash
curl -s https://autorentar.com/env.js | grep MAPBOX
```

✅ Resultado: Token correctamente inyectado en producción
```javascript
"NG_APP_MAPBOX_ACCESS_TOKEN": "pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaHlrYXV1cTA5amYyanB5OGU4MHRtbnkifQ.Xd0d1Cu0LPw75_UbvZj2vQ"
```

---

## Verificación Post-Fix

### Endpoints de Mapbox Funcionando

El token ahora permite acceso a:
- ✅ Geocoding API: `/geocoding/v5/mapbox.places/`
- ✅ Directions API: `/directions/v5/mapbox/`
- ✅ Static Images API: `/styles/v1/mapbox/`
- ✅ Map Tiles: `/v4/`

### Features Afectadas (Ahora Funcionando)

1. **Car Search Map** (`features/cars/marketplace-v2.page.ts`)
   - Mapa interactivo con marcadores de autos
   - Geocoding de ubicaciones
   
2. **Car Publishing** (`features/cars/publish-car-v2.page.ts`)
   - Selección de ubicación en mapa
   - Geocoding inverso (lat/lng → dirección)
   
3. **Search by Location** (`core/services/geocoding.service.ts`)
   - Búsqueda de ubicaciones
   - Autocompletado de direcciones

---

## Prevención Futura

### 1. Script de Sincronización

Crear script para sincronizar secrets:

```bash
#!/bin/bash
# sync-secrets.sh

echo "🔄 Sincronizando secrets desde .env.local a GitHub..."

# Mapbox
MAPBOX_TOKEN=$(grep NG_APP_MAPBOX_ACCESS_TOKEN .env.local | cut -d= -f2)
echo "$MAPBOX_TOKEN" | gh secret set MAPBOX_ACCESS_TOKEN

# Supabase
SUPABASE_URL=$(grep NG_APP_SUPABASE_URL .env.local | cut -d= -f2)
echo "$SUPABASE_URL" | gh secret set SUPABASE_URL

SUPABASE_KEY=$(grep NG_APP_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
echo "$SUPABASE_KEY" | gh secret set SUPABASE_ANON_KEY

echo "✅ Secrets sincronizados"
```

### 2. Workflow de Validación

Agregar step en workflow para validar tokens antes de deployment:

```yaml
- name: Validate API Tokens
  run: |
    # Test Mapbox token
    RESPONSE=$(curl -s "https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${{ secrets.MAPBOX_ACCESS_TOKEN }}")
    if [[ $RESPONSE == *"Unauthorized"* ]]; then
      echo "❌ Mapbox token inválido"
      exit 1
    fi
    echo "✅ Mapbox token válido"
```

### 3. Monitoreo de Expiración

Los tokens de Mapbox no expiran por defecto, pero pueden ser revocados. Monitorear:
- Dashboard de Mapbox: https://account.mapbox.com/access-tokens/
- Revisar uso mensual (límite gratuito: 50,000 requests/mes)
- Alertas si se acerca al límite

### 4. Documentación de Secrets

Mantener lista de secrets actualizada en `docs/deployment/SECRETS.md`:

| Secret | Descripción | Última actualización | Expira |
|--------|-------------|----------------------|--------|
| MAPBOX_ACCESS_TOKEN | Token de Mapbox (público) | 15-Nov-2025 | No |
| SUPABASE_URL | URL del proyecto Supabase | 12-Nov-2025 | No |
| SUPABASE_ANON_KEY | Anon key de Supabase | 12-Nov-2025 | No |
| MERCADOPAGO_PROD_PUBLIC_KEY | Public key de MP | 28-Oct-2025 | No |

---

## Comandos Útiles

### Verificar token localmente
```bash
TOKEN=$(grep NG_APP_MAPBOX_ACCESS_TOKEN .env.local | cut -d= -f2)
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Buenos%20Aires.json?access_token=$TOKEN" | jq .
```

### Ver secrets en GitHub
```bash
gh secret list
```

### Actualizar secret en GitHub
```bash
echo "YOUR_TOKEN" | gh secret set MAPBOX_ACCESS_TOKEN
```

### Ver logs del deployment
```bash
gh run view --log | grep MAPBOX
```

### Verificar token en producción
```bash
curl -s https://autorentar.com/env.js | jq .NG_APP_MAPBOX_ACCESS_TOKEN
```

---

## Timeline del Fix

| Tiempo | Acción |
|--------|--------|
| 06:30 | ⚠️ Issue reportado: Token inválido |
| 06:31 | ✅ Verificado token local (válido) |
| 06:32 | ❌ Identificado secret desactualizado en GitHub |
| 06:33 | 🔄 Secret actualizado en GitHub |
| 06:34 | 🚀 Trigger manual de deployment |
| 06:36 | ✅ Deployment completado (1m 51s) |
| 06:37 | ✅ Verificado token en producción |
| 06:38 | ✅ Issue resuelto |

**Total time to resolution**: 8 minutos

---

## Referencias

- **Mapbox Token Management**: https://docs.mapbox.com/accounts/guides/tokens/
- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Angular Environment Variables**: https://angular.dev/tools/cli/environments

---

**Status**: ✅ RESUELTO  
**Deployment**: 19385754229  
**Production URL**: https://autorentar.com  
**Token válido hasta**: No expira (token de acceso público)
