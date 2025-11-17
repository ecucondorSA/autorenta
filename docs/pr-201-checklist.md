## PR #201 — Checklist de verificación antes de promote a staging/production

Resumen: PR que contiene cambios en `supabase/functions/mercadopago-webhook` y migraciones relacionadas con `mp_webhook_logs`.

Staging (obligatorio antes de prod)
- [ ] Confirmar que la migración `event_id` está aplicada en la base de staging (columna + índice único).
- [ ] Deploy de la función a STAGING.
- [ ] Ejecutar `scripts/test_mp_webhook_concurrency.mjs` en `mode=duplicate` con `--count 10 --concurrency 5`. Resultado esperado:
  - 1 request procesada correctamente y el resto devuelven `duplicate` o 200 con mensaje de ignore.
- [ ] Ejecutar pruebas con modos `approved`, `cancelled` y validar efectos en ledger/reservas.
- [ ] Validar latencias: llamadas al SDK deben fallar rápidamente si exceden 3s y deben ser manejadas por el webhook.
- [ ] Revisar logs y métricas (errores, duplicados, rate-limit hits) durante las pruebas.

Production (post-staging)
- [ ] Canonical snapshot/backups previos al deploy (si la infra lo permite).
- [ ] Canary 10% (o despliegue en ventana de baja actividad). Monitoreo por 24–48h.
- [ ] Verificar ausencias de duplicados en ledger y reconciliación contable.

Rollback / contingencia
- [ ] Redeploy versión anterior de la función (guardar SHA/artefacto antes de promover).
- [ ] Si se detecta comportamiento indeseado: deshabilitar endpoint de webhook (Cloudflare/Supabase) y confirmar pasos de corrección.

Notas técnicas
- La deduplicación se basa en `event_id` con índice único; asegúrate que las requests de prueba usan el mismo `event_id` cuando el objetivo es probar idempotencia.
