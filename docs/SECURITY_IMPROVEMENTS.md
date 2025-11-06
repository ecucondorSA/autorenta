# 🔒 Mejoras de Seguridad Implementadas

**Fecha**: 2025-11-03  
**Problemas Resueltos**: Rate limiting, Headers de seguridad, Validación de IP en webhooks

---

## ✅ 1. Headers de Seguridad (HSTS, CSP)

### Implementación

**Archivo**: `apps/web/public/_headers`

Agregados headers de seguridad completos:

- ✅ **HSTS (Strict-Transport-Security)**: Fuerza HTTPS por 1 año, incluye subdominios y preload
- ✅ **CSP (Content-Security-Policy)**: Política completa de seguridad de contenido
- ✅ **X-Frame-Options**: DENY (previene clickjacking)
- ✅ **X-Content-Type-Options**: nosniff
- ✅ **X-XSS-Protection**: 1; mode=block
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin
- ✅ **Permissions-Policy**: Restricciones de geolocalización, cámara, micrófono

### Configuración

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://sdk.mercadopago.com; ...
```

### Script de Build Actualizado

**Archivo**: `apps/web/scripts/create-cloudflare-config.js`

El script ahora genera automáticamente los headers completos incluyendo HSTS.

---

## ✅ 2. Rate Limiting en Webhook

### Implementación

**Archivo**: `supabase/functions/mercadopago-webhook/index.ts`

Agregado rate limiting por IP con las siguientes características:

- **Límite**: 100 requests por minuto por IP
- **Window**: 60 segundos (1 minuto)
- **Headers de respuesta**: Incluye `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Status code**: 429 (Too Many Requests) cuando se excede el límite
- **Retry-After**: Header con segundos hasta el reset

### Código Clave

```typescript
const RATE_LIMIT_MAX_REQUESTS = 100; // Máximo 100 requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Por minuto

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetAt: number } {
  // Implementación de token bucket
}
```

### Headers de Respuesta

Todas las respuestas exitosas (200) incluyen headers de rate limit:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456000
```

### Protección DDoS

- ✅ Previene ataques de fuerza bruta
- ✅ Limita requests por IP
- ✅ Logs de intentos excedidos
- ✅ Respuestas informativas con `Retry-After`

---

## ✅ 3. Validación de IP en Webhooks

### Implementación

**Archivo**: `supabase/functions/mercadopago-webhook/index.ts`

Agregada validación de IPs autorizadas de MercadoPago:

### IPs Autorizadas

Rangos CIDR de MercadoPago documentados:
- `209.225.49.0/24`
- `216.33.197.0/24`
- `216.33.196.0/24`

### Código Clave

```typescript
const MERCADOPAGO_IP_RANGES = [
  { start: ipToNumber('209.225.49.0'), end: ipToNumber('209.225.49.255') },
  { start: ipToNumber('216.33.197.0'), end: ipToNumber('216.33.197.255') },
  { start: ipToNumber('216.33.196.0'), end: ipToNumber('216.33.196.255') },
];

function isMercadoPagoIP(clientIP: string): boolean {
  // Valida si la IP está en los rangos autorizados
}
```

### Comportamiento

- **Producción**: Rechaza IPs no autorizadas con 403 (Forbidden)
- **Desarrollo**: Permite si HMAC es válido (fallback)
- **Logging**: Registra intentos no autorizados con IP y User-Agent

### Validación en Cascada

1. ✅ Validación de IP (si está disponible)
2. ✅ Validación HMAC (siempre)
3. ✅ Rate limiting (siempre)

Si la IP no está autorizada **Y** estamos en producción, se rechaza el webhook antes de validar HMAC.

---

## 📊 Resumen de Mejoras

| Mejora | Estado | Impacto | Archivos Modificados |
|--------|--------|---------|---------------------|
| **HSTS Header** | ✅ Completo | Alto | `apps/web/public/_headers`, `apps/web/scripts/create-cloudflare-config.js` |
| **CSP Mejorado** | ✅ Completo | Alto | `apps/web/public/_headers` |
| **Rate Limiting** | ✅ Completo | Crítico | `supabase/functions/mercadopago-webhook/index.ts` |
| **Validación de IP** | ✅ Completo | Crítico | `supabase/functions/mercadopago-webhook/index.ts` |

---

## 🚀 Próximos Pasos (Opcional)

### Rate Limiting en Cloudflare Pages

Para rate limiting a nivel de infraestructura (más eficiente que en Edge Function):

1. **Cloudflare WAF Rules** (Plan Pro+):
   - Configurar rate limiting rules en Cloudflare Dashboard
   - Aplicar a todas las rutas de la aplicación
   - Límites recomendados: 100 req/min por IP

2. **Cloudflare Workers** (Alternativa):
   - Crear Worker middleware que intercepte requests
   - Usar KV namespace para tracking de rate limits
   - Más flexible pero requiere deployment adicional

### Mejoras Adicionales

- [ ] Remover `unsafe-inline` y `unsafe-eval` del CSP (requiere refactor de Angular)
- [ ] Implementar rate limiting diferenciado por ruta (auth más restrictivo)
- [ ] Agregar alertas de seguridad (email/Slack cuando se bloquean IPs)
- [ ] Dashboard de monitoreo de rate limits
- [ ] Whitelist de IPs para desarrollo/testing

---

## 🧪 Testing

### Verificar Headers

```bash
curl -I https://autorenta-web.pages.dev
```

Deberías ver:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: ...`
- `X-Frame-Options: DENY`

### Verificar Rate Limiting

```bash
# Hacer 101 requests rápidas
for i in {1..101}; do
  curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
    -H "Content-Type: application/json" \
    -d '{"type":"test"}'
done
```

La request #101 debería retornar `429 Too Many Requests` con header `Retry-After`.

### Verificar Validación de IP

```bash
# Simular request desde IP no autorizada
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"type":"payment","data":{"id":"test"}}'
```

En producción debería retornar `403 Forbidden` con mensaje `Unauthorized IP address`.

---

## 📚 Referencias

- [MercadoPago IP Whitelist](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/ipn)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/tools/rate-limiting-rules/)
- [HSTS Preload List](https://hstspreload.org/)

---

**Última actualización**: 2025-11-03







