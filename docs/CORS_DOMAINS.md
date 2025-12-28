# AutoRenta - Dominios CORS Permitidos

**Última actualización:** 2025-12-28
**Archivo de configuración:** `supabase/functions/_shared/cors.ts`

---

## Dominios Autorizados

### Producción

| Dominio | Descripción |
|---------|-------------|
| `https://autorenta.com` | Dominio principal (futuro) |
| `https://www.autorenta.com` | Con www |
| `https://autorentar.com` | Dominio principal actual |
| `https://www.autorentar.com` | Con www |
| `https://autorentar.pages.dev` | Cloudflare Pages principal |

### Desarrollo/Preview

| Dominio | Descripción |
|---------|-------------|
| `https://*.autorentar.pages.dev` | Preview deployments (regex pattern) |
| `https://autorenta-web.pages.dev` | Cloudflare Pages legacy |
| `http://localhost:4200` | Angular dev server |
| `http://localhost:8787` | Wrangler local worker |

---

## Configuración CORS

```typescript
// Dominios explícitos
const ALLOWED_ORIGINS = [
  'https://autorenta.com',
  'https://www.autorenta.com',
  'https://autorentar.com',
  'https://www.autorentar.com',
  'https://autorenta-web.pages.dev',
  'https://autorentar.pages.dev',
  'http://localhost:4200',
  'http://localhost:8787',
];

// Pattern para preview deployments de Cloudflare
const CLOUDFLARE_PAGES_PATTERN = /^https:\/\/[a-z0-9]+\.autorentar\.pages\.dev$/;
```

---

## Headers CORS Permitidos

| Header | Uso |
|--------|-----|
| `authorization` | Bearer token de Supabase Auth |
| `x-client-info` | Información del cliente Supabase |
| `apikey` | API key de Supabase |
| `content-type` | Tipo de contenido (application/json) |
| `x-signature` | Firma de webhooks MercadoPago |
| `x-request-id` | ID de correlación para debugging |

---

## Métodos HTTP Permitidos

- `GET` - Lectura
- `POST` - Creación/Acciones
- `PUT` - Actualización completa
- `DELETE` - Eliminación
- `OPTIONS` - Preflight CORS

---

## Seguridad

### ✅ Buenas Prácticas Implementadas

1. **NO usar wildcard `*`** - Previene ataques CSRF
2. **Whitelist explícita** - Solo dominios conocidos
3. **Regex para previews** - Permite Cloudflare Pages deployments
4. **Credentials habilitados** - Para cookies de sesión
5. **Max-Age de 24h** - Cache de preflight requests

### ⚠️ Consideraciones

1. Al agregar un nuevo dominio, actualizar `_shared/cors.ts`
2. Los subdominios de Cloudflare Pages se validan con regex
3. El dominio por defecto (si Origin no está en whitelist) es `https://autorentar.com`

---

## Agregar un Nuevo Dominio

1. Editar `supabase/functions/_shared/cors.ts`
2. Agregar al array `ALLOWED_ORIGINS`
3. Deploy todas las Edge Functions: `supabase functions deploy`
4. Actualizar esta documentación

```typescript
const ALLOWED_ORIGINS = [
  // ... existentes ...
  'https://nuevo-dominio.com', // NUEVO
];
```

---

## Testing CORS

```bash
# Test preflight request
curl -X OPTIONS https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/health \
  -H "Origin: https://autorentar.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Verificar headers de respuesta
< Access-Control-Allow-Origin: https://autorentar.com
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
< Access-Control-Allow-Credentials: true
```

---

*Documentación generada por Claude Code*
