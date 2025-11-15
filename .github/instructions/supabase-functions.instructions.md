---
applyTo: "**/supabase/functions/**/*.ts"
---

# Supabase Edge Functions - Copilot Instructions

## Requirements

Cuando trabajes en Supabase Edge Functions (Deno), sigue estas guías:

### 1. Deno Runtime
- Usar imports de URLs (no NPM)
- Deno standard library: `https://deno.land/std@0.177.0/`
- Supabase client: `https://esm.sh/@supabase/supabase-js@2`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

### 2. CORS Headers
- SIEMPRE incluir CORS headers
- Manejar OPTIONS request

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### 3. Error Handling
- Usar try/catch
- Retornar JSON con status apropiado
- Loguear errores con contexto

```typescript
try {
  // lógica
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
} catch (error) {
  console.error('Error en function:', error);
  return new Response(JSON.stringify({ error: error.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 500,
  });
}
```

### 4. Autenticación
- Verificar JWT token cuando sea necesario
- Usar service role key para operaciones admin

```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: `Bearer ${token}` } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error) throw error;
```

### 5. Secrets
- Usar `Deno.env.get()` para secrets
- NUNCA hardcodear secrets
- Validar que existen

```typescript
const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
if (!mercadopagoToken) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
}
```

### 6. Testing Local
- Usar `supabase functions serve` para testing local
- Mock external APIs en desarrollo

```bash
supabase functions serve function-name --env-file .env.local
```
