# INIT MercadoPago - AutoRenta

> Guía integral sobre el estado actual, configuración y operación de todos los flujos relacionados con MercadoPago en AutoRenta. Última actualización generada por Codex (2025-10-24).

## 1. Estado general

- **Depósitos en wallet**: 100% operativos con webhook activo y polling de respaldo (`mercadopago-webhook`, `mercadopago-poll-pending-payments`). Referencia: `SISTEMA_COMPLETO_MERCADOPAGO.md`.
- **Preautorizaciones (card holds)**: Implementación completa con captura/cancelación y ledger contable. Referencia: `MERCADOPAGO_PREAUTH_IMPLEMENTATION.md`.
- **Pagos con SDK**: Frontend migrado al SDK oficial (`@mercadopago/sdk-react`) y Edge Functions usan `mercadopago@2` via `esm.sh`. Referencia: `MERCADOPAGO_SDK_INTEGRATION.md`, `MERCADOPAGO_SDK_MIGRATION.md`.
- **Retiros**: Automatización bloqueada por falta de API pública de money-out. Operación debe ser manual o con proveedor alternativo. Referencia: `MERCADOPAGO_WITHDRAWAL_API_FINDINGS.md`.
- **Calidad y tasas de aprobación**: Puntaje actual 31/100; hay mejoras rápidas en datos de payer/items para alcanzar 50+. Referencia: `MEJORAS_MERCADOPAGO_CALIDAD.md`.

## 2. Componentes clave

| Área | Componente | Ubicación / Identificador | Estado |
|------|------------|---------------------------|--------|
| Edge Functions | `mercadopago-create-preference` | `supabase/functions/mercadopago-create-preference/index.ts` | ✅ Activo (creación de preferencias de depósito)
| Edge Functions | `mercadopago-webhook` | `supabase/functions/mercadopago-webhook/index.ts` | ✅ Activo (pagos + preauth)
| Edge Functions | `mercadopago-poll-pending-payments` | `supabase/functions/mercadopago-poll-pending-payments/index.ts` | ✅ Activo (cron cada 3 min)
| Edge Functions | `mp-create-preauth` / `mp-capture-preauth` / `mp-cancel-preauth` | `supabase/functions/mp-*/index.ts` | ✅ Operativos (preautorizaciones)
| Cron Jobs | Supabase `cron.job` id=2 | `mercadopago-poll-pending-payments` | ✅ Cada 3 min
| Frontend | `apps/web` Angular + SDK | `apps/web/src/app/core/services/*` | ✅ Migrado al SDK oficial
| Secrets | `MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Configurados en Supabase | ✅

## 3. Configuración esencial

### Credenciales
- **País**: Argentina (`ARS`).
- **Public Key**: `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd` (`apps/web/MERCADOPAGO_SETUP.md`).
- **Access Token**: `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd` (en Supabase secrets y `.env` locales cuando aplique).
- **Webhook URL oficial**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook` (configurar en panel MP > Developers > Webhooks).

### Frontend (Angular)
1. Instalar dependencias: `npm install @mercadopago/sdk-react` en `apps/web`.
2. Incluir `<script src="https://sdk.mercadopago.com/js/v2"></script>` en `apps/web/src/index.html`.
3. Configurar `environment.ts` con `mercadoPagoPublicKey`.
4. Usar `MercadoPagoService` para crear tokens reales (`mp.createCardToken`) y poblar `first_name`, `last_name`, identificación, etc. (ver `MERCADOPAGO_SDK_INTEGRATION.md`).

### Edge Functions / Supabase
- Mantener `mercadopago@2` importado vía `https://esm.sh/mercadopago@2` para Deno.
- Deploy desde supabase dashboard o `npx supabase functions deploy <nombre>`.
- Secrets mediante `npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="..."`.

## 4. Flujos operativos

### 4.1 Depósitos a wallet
1. `walletService.initiateDeposit()` crea registro `wallet_transactions` (status `pending`).
2. Frontend llama a `mercadopago-create-preference` con `transaction_id` y monto.
3. Usuario completa pago en MercadoPago (`init_point`).
4. `mercadopago-webhook` recibe notificación `payment` → valida HMAC → llama RPC `wallet_confirm_deposit_admin()`.
5. Cron `mercadopago-poll-pending-payments` actúa como respaldo (consulta `/v1/payments/search` con `external_reference`) y confirma en ~3 min si webhook no llegó.
6. Balance se acredita; metadata (`provider_metadata.polled_at`, `confirmed_at`) permite auditoría.

### 4.2 Preautorizaciones (card hold)
1. `PaymentAuthorizationService.authorizePayment()` → RPC `create_payment_authorization()`.
2. Edge Function `mp-create-preauth` llama `POST /v1/payments` con `capture=false`.
3. Webhook marca estados `authorized` / `approved` / `cancelled` según evento.
4. Captura: `mp-capture-preauth` (`capture=true`) → ledger `wallet_ledger` (double-entry).
5. Cancelación: `mp-cancel-preauth` → libera fondos y actualiza booking. Ver detalle en `MERCADOPAGO_PREAUTH_IMPLEMENTATION.md`.

### 4.3 Retiros (estado actual)
- Base de datos y lógica interna (`withdrawal_requests`, aprobación admin, ledger) están listas.
- **Bloqueante**: MercadoPago no expone API pública para transferencias (`/v1/money_requests` arroja 404). Operación debe ser manual o integrarse con proveedor alternativo (EBANX, Wise, etc.).
- Recomendado documentar proceso manual y deshabilitar automatización hasta definir proveedor. Fuente: `MERCADOPAGO_WITHDRAWAL_API_FINDINGS.md`.

## 5. Operaciones y monitoreo

- Ver cron jobs: `psql ... -c "SELECT * FROM cron.job;"` (consultar `SISTEMA_COMPLETO_MERCADOPAGO.md` para string completo).
- Historial cron: consultar `cron.job_run_details` por `jobid = 2`.
- Logs Edge Functions: `npx supabase functions logs mercadopago-webhook --tail`.
- Transacciones pendientes: query `wallet_transactions` filtrando `status = 'pending'`.
- Scripts útiles: `test-poll-function.sh`, `verify-real-payments.sh`, `test-webhook.sh`.

## 6. Testing y QA

- Tarjetas sandbox: Mastercard `5031 7557 3453 0604` (CVV 123, venc 11/25, titular APRO), Visa `4509 9535 6623 3704`.
- Montos recomendados en TEST: $100, $1,000, $10,000 ARS. Montos > $100,000 generan `cc_rejected_high_risk`. Referencia: `MERCADOPAGO_TEST_AMOUNTS.md`.
- Simular webhook: `curl -X POST 'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook?topic=payment&id=<payment_id>'`.
- Confirmar fallback: ejecutar `bash autorenta/test-poll-function.sh`.

## 7. Calidad y mejoras pendientes

- **Payer**: dividir `full_name` en `first_name` + `last_name`, agregar `identification`, `phone`, dirección (`MEJORAS_MERCADOPAGO_CALIDAD.md`).
- **Items**: completar `id`, `description`, `category_id` para subir puntaje y tasa de aprobación.
- **Mensajes de error**: documentar rechazo `cc_rejected_high_risk` y ofrecer retry con montos menores.
- **UI**: confirmar que el formulario utiliza el token real y muestra estados (ver `IMPLEMENTACION_MEJORAS_UI.md`).

## 8. Riesgos y próximos pasos sugeridos

1. Formalizar proceso manual de retiros y comunicarlo en UX hasta elegir proveedor automático.
2. Revisar caducidad de preautorizaciones (7 días) y notificar a operaciones antes de expirar.
3. Auditar configuraciones en panel MP (webhooks, credenciales) tras cada rotación de token.
4. Completar checklist de `MEJORAS_MERCADOPAGO_CALIDAD.md` para optimizar aprobaciones.
5. Programar pruebas periódicas (quincenales) de webhook + polling para detectar fallas tempranas.

## 9. Documentos relacionados

- `SISTEMA_COMPLETO_MERCADOPAGO.md` — Operación integral de depósitos y monitoreo.
- `CONFIGURAR_WEBHOOK_MERCADOPAGO.md` — Pasos detallados para habilitar webhook en MP.
- `MERCADOPAGO_PREAUTH_IMPLEMENTATION.md` — Diseño completo de preautorizaciones.
- `MERCADOPAGO_SDK_INTEGRATION.md` — Guía de integración del SDK en frontend Angular.
- `MERCADOPAGO_SDK_MIGRATION.md` — Migración de Edge Functions al SDK oficial.
- `MERCADOPAGO_WITHDRAWAL_API_FINDINGS.md` — Investigación sobre ausencia de API de retiros.
- `MERCADOPAGO_TEST_AMOUNTS.md` — Monto seguro y tarjetas sandbox.
- `MEJORAS_MERCADOPAGO_CALIDAD.md` — Checklist de calidad para subir puntaje.
- `INVESTIGACION_REAL_MERCADOPAGO.md` — Hallazgos con datos reales en producción.
- `SOLUCION_WEBHOOK_MERCADOPAGO.md` y `SOLUCION_FINAL_WEBHOOK.md` — Historial de fixes.

---

✅ **Con este INIT tienes un punto único de referencia para operar, dar soporte y seguir iterando sobre MercadoPago en AutoRenta.**
