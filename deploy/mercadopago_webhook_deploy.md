# Despliegue y runbook — mercadopago-webhook

Este documento contiene pasos reproducibles para desplegar la función de webhook a staging y producción usando Supabase CLI (u otra herramienta si es el caso).

Pre-requisitos
- Tener `supabase` CLI configurado y autenticado en el entorno.
- Variables de entorno en el proyecto: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HMAC_SECRET` (solo si se usa en env) y otros secretos necesarios.

Despliegue a STAGING (recomendado primero)

```bash
# desde la raíz del repo
supabase functions deploy mercadopago-webhook --project-ref <STAGING_PROJECT_REF> --env .env.staging
```

Verificaciones post-deploy
- Confirmar función lista: `supabase functions list --project-ref <STAGING_PROJECT_REF>`
- Llamar health endpoint o enviar 1 webhook de smoke test (puede ser desde `scripts/test_mp_webhook_concurrency.mjs` con `--count 1`).

Promoción a PRODUCCIÓN

1. Asegurarse backups/snapshot.
2. Desplegar con project-ref de prod:

```bash
supabase functions deploy mercadopago-webhook --project-ref <PROD_PROJECT_REF> --env .env.production
```

Rollback rápido
- Si detectás fallo grave: redeploy la versión anterior (guardar la referencia del commit que desplegaste) o deshabilitá el endpoint en la consola de Cloud provider.

Observability y alertas
- Asegurar que logs de la función se envíen a sistema central (Stackdriver/LogDNA/Datadog) y crear alertas para: tasa de errores elevada, número de duplicados detectados, latencia anómala.
