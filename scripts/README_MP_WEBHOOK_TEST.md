# Test de concurrencia para `mercadopago-webhook`

Este directorio contiene un script ligero para simular webhooks concurrentes hacia el endpoint de MercadoPago que maneja la aplicación.

Archivo principal
- `scripts/test_mp_webhook_concurrency.mjs` — script Node (ESM) que envía N requests concurrentes y resume respuestas.

Uso rápido

1. Exportá la URL del webhook y el secreto HMAC (si aplica):

```bash
export WEBHOOK_URL="https://staging.example.com/.netlify/functions/mercadopago-webhook"
export HMAC_SECRET="mi_secreto_hmac"
```

2. Ejecutá el script:

```bash
node scripts/test_mp_webhook_concurrency.mjs --count 20 --concurrency 5 --mode duplicate
```

Opciones
- `--count`: número total de requests (default 10)
- `--concurrency`: nivel de concurrencia (default 5)
- `--mode`: `unique` (payloads con eventId distintos) o `duplicate` (envía todos con el mismo eventId)

Notas
- El script firma el body con HMAC-SHA256 si `HMAC_SECRET` está presente y añade `x-hmac-signature`.
- No modifica datos en la base; sólo prueba la recepción del webhook y la respuesta del endpoint.
