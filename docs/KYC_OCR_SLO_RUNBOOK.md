# KYC OCR SLO Runbook

## SLO
- Objetivo: tasa de éxito OCR (2xx) >= `98%` en ventana de 24h.
- P95 de `verify-document` <= `3s`.
- Tasa de `401 AUTH_INVALID` <= `1%` de requests OCR.

## Métricas Clave
- `ocr_total_requests`
- `ocr_success_total`
- `ocr_error_total{status,code}`
- `ocr_latency_ms{p50,p95,p99}`
- `auth_refresh_attempts_total`
- `auth_refresh_failures_total`

## Alertas
- `ocr_error_rate_5m > 5%`
- `ocr_5xx_rate_5m > 1%`
- `ocr_401_rate_15m > 3%`
- `ocr_p95_latency_15m > 5000ms`

## Triage Rápido
1. Confirmar tipo de error dominante (`401`, `400 OCR_FAILED`, `5xx`).
2. Revisar `x-kyc-trace-id` en logs frontend y edge.
3. Si predomina `401`:
   - validar refresh de sesión en cliente,
   - validar reloj/sesión del usuario.
4. Si predomina `400 OCR_FAILED`:
   - validar calidad de imagen de entrada,
   - verificar país/tipo de documento soportado.
5. Si predomina `5xx/503`:
   - revisar proveedor OCR y quota,
   - activar fallback manual.

## Mitigación
- `401`: forzar refresh de sesión 1 vez, luego pedir re-login.
- `400 OCR_FAILED`: mostrar guía de captura (luz, enfoque, documento completo).
- `503/5xx`: reintentos con backoff+jitter y fallback manual.

## Criterio de Escalación
- Incidente P1 si:
  - `ocr_success_rate < 95%` por 30 min, o
  - `ocr_5xx_rate > 3%` por 10 min.

## Postmortem Checklist
- Línea de tiempo (inicio, mitigación, resolución).
- Impacto (#usuarios, #intentos fallidos).
- Causa raíz (auth, payload, proveedor OCR, regresión UI).
- Acción preventiva (tests, alertas, hardening).
