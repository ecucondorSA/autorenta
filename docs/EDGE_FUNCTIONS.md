# ⚡ Edge Functions Reference

> **Catálogo Técnico de Lógica Serverless**
> Documentación exhaustiva de las 69 funciones desplegadas en Supabase Edge Runtime (Deno). Estas funciones manejan la lógica crítica de negocio que requiere seguridad, integraciones externas o procesamiento pesado.

---

## 📊 Resumen Ejecutivo

| Categoría | Cantidad | Descripción |
| :--- | :---: | :--- |
| **MercadoPago** | 15 | Procesamiento de pagos, webhooks, OAuth y splits. |
| **PayPal** | 4 | Pagos internacionales. |
| **Wallet** | 2 | Gestión de saldo interno y transferencias. |
| **IA & Verificación** | 6 | Análisis de documentos, biometría y daños con Gemini. |
| **Notificaciones** | 6 | WhatsApp, Email y Push. |
| **Operaciones** | 12 | Cron jobs, reportes y mantenimiento. |
| **Social** | 2 | TikTok Events y OAuth. |

---

## 🛠️ Configuración Global

### Variables de Entorno (Secrets)
Estas variables son críticas para el funcionamiento y deben configurarse en el Dashboard de Supabase.

| Variable | Uso | Funciones Afectadas |
| :--- | :--- | :--- |
| `MERCADOPAGO_ACCESS_TOKEN` | API Key Prod | `mercadopago-*`, `mp-*` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Validación IPN | `mercadopago-webhook` |
| `PAYPAL_CLIENT_ID` | API PayPal | `paypal-*` |
| `OPENAI_API_KEY` | IA (Legacy) | `analyze-damage-images` |
| `GEMINI_API_KEY` | IA (Vision) | `gemini3-document-analyzer` |
| `WHATSAPP_API_TOKEN` | Meta API | `send-whatsapp-otp` |
| `SERVICE_ROLE_KEY` | Admin DB Access | Todas (operaciones privilegiadas) |

### Utilidades Compartidas (`_shared/`)
Código reutilizable para mantener consistencia.
*   `cors.ts`: Headers estándar para permitir llamadas desde el frontend.
*   `supabaseClient.ts`: Cliente instanciado con `SERVICE_ROLE_KEY`.
*   `validation.ts`: Schemas Zod para validar inputs.

---

## 💳 Categoría: MercadoPago (Core Financiero)

El núcleo transaccional de la plataforma.

### `mercadopago-create-booking-preference`
Genera el checkout para pagar una reserva.
*   **Trigger:** HTTP POST (Auth requerida).
*   **Input:**
    ```json
    {
      "booking_id": "uuid",
      "payer_email": "user@example.com"
    }
    ```
*   **Lógica:**
    1.  Verifica estado de la reserva (`pending`).
    2.  Calcula montos (Alquiler + Garantía + Comisión).
    3.  Configura Split Payment (dinero directo al Owner).
    4.  Crea Preferencia en MP con `external_reference = booking_id`.
*   **Output:** `{ "preference_id": "...", "init_point": "https://..." }`

### `mercadopago-webhook`
**CRÍTICA.** Recibe notificaciones de pago (IPN).
*   **Trigger:** HTTP POST (Pública, validada por firma).
*   **Input:** Payload estándar de MercadoPago (`type`, `data.id`).
*   **Lógica:**
    1.  Verifica firma HMAC.
    2.  Consulta estado del pago en API MP.
    3.  Si `approved`:
        *   Actualiza `bookings.status` a `confirmed`.
        *   Registra `payments`.
        *   Dispara emails de confirmación.
    4.  Si `rejected`: Notifica al usuario.

### `mercadopago-oauth-connect`
Inicia el flujo para que los dueños conecten su cuenta MP.
*   **Output:** URL de redirección a MercadoPago OAuth.

---

## 🧠 Categoría: IA & Verificación

### `gemini3-document-analyzer`
Analiza documentos KYC usando Gemini Pro Vision.
*   **Trigger:** DB Trigger (al subir archivo a `user_documents`).
*   **Input:** `{ "document_id": "uuid", "bucket_path": "..." }`
*   **Lógica:**
    1.  Descarga imagen de Storage.
    2.  Envía a Gemini con prompt: "Extraer datos JSON: nombre, dni, fecha_vencimiento".
    3.  Compara datos extraídos con `profiles`.
    4.  Aprueba o rechaza documento automáticamente.

### `analyze-damage-images`
Compara fotos de Check-in vs Check-out para detectar daños.
*   **Input:** `{ "booking_id": "uuid" }`
*   **Lógica:**
    1.  Obtiene fotos de `booking_inspections`.
    2.  Usa IA para detectar anomalías (rayones, abolladuras).
    3.  Genera reporte de daños preliminar en `accident_reports`.

---

## 🔔 Categoría: Notificaciones

### `send-whatsapp-otp`
Envía código de verificación por WhatsApp.
*   **Input:** `{ "phone": "+54911...", "otp": "123456" }`
*   **Provider:** Meta Cloud API (WhatsApp Business).

### `send-booking-confirmation-email`
Notifica confirmación de reserva.
*   **Provider:** Resend / SMTP.
*   **Template:** HTML dinámico con detalles del auto y ubicación.

---

## ⚙️ Categoría: Operaciones & Cron Jobs

Funciones programadas que mantienen la salud del sistema.

### `expire-pending-deposits`
*   **Schedule:** Cada hora.
*   **Acción:** Busca reservas en `pending_payment` con >24h de antigüedad y las pasa a `expired`. Libera fechas del calendario.

### `monitor-pending-payouts`
*   **Schedule:** Diario.
*   **Acción:** Verifica retiros bancarios atascados y alerta a los administradores.

### `return-protocol-scheduler`
*   **Schedule:** Cada 15 min.
*   **Acción:** Envía recordatorios de devolución a reservas que terminan pronto.

---

## 🔒 Autenticación & Seguridad

### Niveles de Acceso
1.  **Public:** `mercadopago-webhook`, `paypal-webhook`. (Protegidas por firma criptográfica).
2.  **Authenticated:** `create-booking`, `wallet-withdraw`. (Requieren JWT de usuario válido).
3.  **Service Role:** Cron jobs y webhooks internos. (Bypass RLS).

### Rate Limiting
No implementado a nivel de Edge Function (delegado a Supabase API Gateway).

---

## 🐛 Debugging & Logs

### Ver Logs en Producción
Desde el Dashboard de Supabase:
1.  Ir a **Edge Functions**.
2.  Seleccionar función.
3.  Pestaña **Logs**.

### CLI Local
```bash
# Ver logs de función local
supabase functions logs --no-verify-jwt
```

### Errores Comunes
*   **504 Gateway Timeout:** La función tardó más de 60s (límite hard). Solución: Mover lógica a background job.
*   **401 Unauthorized:** JWT expirado o mal formado.
*   **Error: Deno is not defined:** Asegurarse de desarrollar en entorno Deno, no Node.js.

---

## 🧪 Testing Local

### Invocar Función
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/mp-create-preference' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"booking_id":"..."}'
```

### Servir Localmente
```bash
supabase start
supabase functions serve
```

---

**© 2026 Autorenta Backend Team**