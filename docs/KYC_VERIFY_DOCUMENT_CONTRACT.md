# KYC Verify Document Contract

## Edge Function
- Nombre: `verify-document`
- Ruta: `POST /functions/v1/verify-document`
- Dominio activo: `https://aceacpaockyxgogxsfyc.supabase.co`

## Auth Context
- Requiere JWT de usuario válido en `Authorization: Bearer <access_token>`.
- No usar service role para llamadas desde UI.
- Si el token está expirado o inválido, responde `401`.

## Request Payload
```json
{
  "image_base64": "<base64_sin_prefijo_data_url>",
  "document_type": "dni | license",
  "side": "front | back",
  "country": "AR | EC | ..."
}
```

## Response (Success)
```json
{
  "success": true,
  "ocr_confidence": 91,
  "validation": {
    "isValid": true,
    "confidence": 91,
    "extracted": {},
    "errors": [],
    "warnings": []
  },
  "extracted_data": {},
  "errors": [],
  "warnings": []
}
```

## Error Contract
- `400 OCR_REQUEST_INVALID`: payload/formato inválido.
- `400 OCR_NO_TEXT`: imagen sin texto legible.
- `400 OCR_FAILED`: OCR agotó reintentos o no pudo procesar.
- `401 AUTH_REQUIRED | AUTH_INVALID`: JWT ausente o inválido.
- `403 FORBIDDEN`: sin permisos para operar.
- `503 OCR_PROVIDER_UNAVAILABLE`: proveedor OCR no disponible.

## Frontend Handling Rules
- `401`: refrescar sesión 1 vez y reintentar.
- `4xx` esperables (`400/401/403`): mostrar mensaje usuario, no marcar como error técnico crítico.
- `429/5xx/network`: retry con backoff exponencial + jitter.
- Si OCR falla pero upload fue exitoso:
  - mantener documento subido,
  - devolver `ocrWarning`,
  - permitir continuar con revisión manual.

## Observability
- Enviar header `x-kyc-trace-id` por request para correlación.
- Registrar `status`, `code`, `message`, `country`, `document_type`, `side`.
