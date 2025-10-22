# 🔍 ANÁLISIS COMPLETO DEL ERROR "Failed to fetch"

## Diagnóstico Final

El error "TypeError: Failed to fetch" ocurre en la llamada RPC a `wallet_initiate_deposit`, NO en la Edge Function.

### Flujo del error:
1. Usuario hace clic en "Depositar fondos" ✅
2. Modal se abre (no hay fetch aquí) ✅
3. Usuario ingresa monto y hace clic en "Iniciar depósito"
4. **AQUÍ FALLA** → `await this.supabase.getClient().rpc('wallet_initiate_deposit')`
5. Nunca llega a la Edge Function

## Root Cause

El problema está en cómo se inicializa el cliente Supabase:

1. **wallet.service.ts línea 217**:
   ```typescript
   await this.supabase.getClient().rpc('wallet_initiate_deposit', {...})
   ```

2. **supabase-client.service.ts línea 67**:
   ```typescript
   this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {...})
   ```

3. **environment.base.ts línea 45**:
   ```typescript
   supabaseUrl: resolve('NG_APP_SUPABASE_URL', defaults.supabaseUrl)
   ```

4. **El problema**: `environment.supabaseUrl` podría estar undefined o con URL incorrecta

## Solución Definitiva

### Opción 1: Fix en supabase-client.service.ts (RECOMENDADA)
```typescript
// Línea 67 de supabase-client.service.ts
const HARDCODED_URL = 'https://obxvffplochgeiclibng.supabase.co';
this.client = createClient(
  environment.supabaseUrl || HARDCODED_URL,
  environment.supabaseAnonKey,
  {...}
);
```

### Opción 2: Fix en environment.ts
```typescript
export const environment = buildEnvironment({
  production: true,
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU'
});
```

### Opción 3: Fix en scripts/generate-env.js
Verificar que el script genera correctamente env.js con las URLs

## Verificación

1. **Verificar qué URL está usando el cliente**:
   ```javascript
   // En console del navegador
   console.log(window.__env);
   ```

2. **Verificar si el RPC responde**:
   ```bash
   curl -X POST https://obxvffplochgeiclibng.supabase.co/rest/v1/rpc/wallet_initiate_deposit \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     -H "Authorization: Bearer TOKEN_DEL_USUARIO" \
     -H "Content-Type: application/json" \
     -d '{"p_amount": 100, "p_provider": "mercadopago", "p_description": "Test", "p_allow_withdrawal": false}'
   ```

## Archivos a modificar

1. `/home/edu/autorenta/apps/web/src/app/core/services/supabase-client.service.ts`
2. `/home/edu/autorenta/apps/web/src/environments/environment.ts`
3. `/home/edu/autorenta/apps/web/scripts/generate-env.js` (si existe)

## Test Local

```bash
# 1. Aplicar fix
# 2. Build
npm run build

# 3. Verificar que el fix está en el build
grep -r "obxvffplochgeiclibng" dist/

# 4. Servir localmente
npx http-server dist/web/browser -p 8080

# 5. Probar en http://localhost:8080
```

## Deploy

```bash
# Build y deploy
npm run build && \
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
npx wrangler pages deploy dist/web/browser \
  --project-name=autorenta-web \
  --branch=main
```