# 🩺 Monitoring Strategy: AutoRenta Defense Grid

> **Objetivo:** Observabilidad total (Frontend + Backend + Business) con cero impacto en performance.

## 1. Frontend Monitoring (Sentry + Performance)

Ya tenemos Sentry básico. Vamos a llevarlo al nivel "SRE" configurando reglas de filtrado y contextos ricos.

### Configuración Avanzada (`sentry.config.ts`)
- **Noise Reduction:** Ignorar errores de red transitorios (Offline/Timeout) que no son bugs.
- **Enrichment:** Añadir tags críticos: `plan_type` (Free/Premium), `user_role` (Owner/Renter).
- **Performance:** Alertas automáticas si LCP > 2.5s en rutas críticas (`/checkout`, `/cars/:id`).

## 2. Backend Health Check (Supabase Edge Function)

Crearemos un "policía interno" que vive en el borde.

- **Function:** `check-system-health`
- **Checks:**
  1.  **Database:** ¿Responde un `SELECT 1` en < 100ms?
  2.  **Auth:** ¿Podemos validar un token de prueba?
  3.  **Storage:** ¿Es accesible el bucket de imágenes?
  4.  **Integrations:** ¿Responde la API de MercadoPago? (Ping ligero)

### Respuesta JSON Standard (RFC 7807)
```json
{
  "status": "healthy",
  "latency_ms": 45,
  "checks": {
    "db": "up",
    "auth": "up",
    "storage": "up",
    "mercadopago": "degraded"
  }
}
```

## 3. Business Critical Logging

No es lo mismo un error de JS que un pago fallido. Vamos a estandarizar los logs de negocio.

- **LoggerService:** Crear métodos tipados para eventos críticos.
  - `logBusinessError('payment_failed', { amount: 5000, reason: 'insufficient_funds' })`
  - `logSecurityEvent('brute_force_login', { ip: '...' })`

---

## 📝 Plan de Ejecución

1.  **Backend:** Crear Edge Function `check-system-health`.
2.  **Frontend:** Refactorizar `GlobalErrorHandler` y `LoggerService` para filtrado inteligente.
3.  **Automation:** Script de validación `tools/monitor-health.ts`.
