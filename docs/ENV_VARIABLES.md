# 🔐 Diccionario Maestro de Configuración y Secretos

> **Gestión de Identidad de la Infraestructura**
> Este documento cataloga cada variable de entorno, su propósito, su nivel de sensibilidad y el procedimiento para obtenerla y rotarla.

---

## 🛡️ Política de Seguridad de Secretos

1.  **Principio de Menor Privilegio:** El frontend (`NG_APP_`) solo recibe llaves públicas (`ANON_KEY`, `PUBLIC_KEY`). **NUNCA** exponer llaves privadas (`SERVICE_ROLE`, `ACCESS_TOKEN`) en el código cliente.
2.  **Inyección en Tiempo de Construcción:** Las variables de Angular se "queman" en el JS al hacer build. Si cambias una variable, debes **reconstruir y redesplegar**.
3.  **Rotación de Emergencia:** Si una llave se compromete (ej. `SUPABASE_SERVICE_ROLE_KEY`), se debe rotar inmediatamente en el proveedor y actualizar todos los entornos (Downtime requerido).

---

## 🌍 Frontend (Angular / Ionic) - `apps/web/.env`

Estas variables son visibles para cualquier usuario que inspeccione el código fuente.

| Variable | Descripción Técnica | Cómo obtenerla |
| :--- | :--- | :--- |
| `NG_APP_SUPABASE_URL` | Endpoint HTTPS de la API REST/Realtime. | Supabase > Project Settings > API. |
| `NG_APP_SUPABASE_ANON_KEY` | JWT válido para firmar peticiones públicas. | Supabase > Project Settings > API. |
| `NG_APP_MERCADOPAGO_PUBLIC_KEY` | Llave para tokenizar tarjetas en el navegador. | MP Dev Panel > Credenciales > Producción > Public Key. |
| `NG_APP_MAPBOX_ACCESS_TOKEN` | Token para renderizar tiles vectoriales. | Mapbox Studio > Account > Tokens (Default Public). |
| `NG_APP_DEFAULT_CURRENCY` | Código ISO 4217 (`ARS`, `USD`, `MXN`). | Definido por negocio. |
| `NG_APP_SENTRY_DSN` | URL de ingestión de errores. | Sentry > Project Settings > Client Keys (DSN). |
| `NG_APP_TIKTOK_CLIENT_ID` | App ID para Login con TikTok. | TikTok for Developers > App Info. |
| `NG_APP_GOOGLE_CALENDAR_CLIENT_ID` | OAuth 2.0 Client ID para sincronizar agenda. | Google Cloud Console > APIs & Services > Credentials. |
| `NG_APP_PAYMENTS_WEBHOOK_URL` | URL pública donde MP enviará IPNs. | Apunta a tu Edge Function: `https://<ref>.supabase.co/functions/v1/mercadopago-webhook`. |

---

## ⚡ Backend (Supabase Edge Functions) - Vault

Estos secretos se inyectan en el runtime de Deno. Son invisibles al exterior.

### Core & Infraestructura
*   **`SUPABASE_SERVICE_ROLE_KEY`**: La llave maestra. Permite bypass de RLS.
    *   *Uso:* Tareas administrativas, cron jobs, webhooks privilegiados.
    *   *Riesgo:* 🔴 CRÍTICO. Si se filtra, tienen control total de la DB.
*   **`SUPABASE_DB_URL`**: String de conexión PostgreSQL directo (`postgres://...`).
    *   *Uso:* Migraciones, Drizzle/Prisma (si se usa), conexiones directas.

### Pasarela de Pagos (MercadoPago)
*   **`MERCADOPAGO_ACCESS_TOKEN`**: Llave privada de producción (`APP_USR-...`).
    *   *Permisos:* Cobros, Devoluciones, Gestión de Clientes.
    *   *Rotación:* MP permite rotar sin romper la anterior por X horas.
*   **`MERCADOPAGO_WEBHOOK_SECRET`**: Clave de firma HMAC-SHA256.
    *   *Uso:* Validar que el webhook realmente viene de MercadoPago y no es un ataque fake.
    *   *Obtención:* Al configurar el webhook en el panel de MP, se muestra una vez.

### Inteligencia Artificial
*   **`GEMINI_API_KEY`**: API Key de Google AI Studio.
    *   *Uso:* OCR de documentos, análisis de daños en fotos.
    *   *Quota:* Verificar límites de RPM (Requests Per Minute) en Google Cloud.
*   **`OPENAI_API_KEY`**: (Legacy) Usada en versiones anteriores para chat.

### Comunicaciones
*   **`WHATSAPP_API_TOKEN`**: Token permanente (System User) de Meta Business.
    *   *Uso:* Envío de OTPs y alertas críticas.
    *   *Config:* Requiere template aprobado por Meta.
*   **`RESEND_API_KEY`**: API Key para envío de emails.
    *   *Dominio:* Debe estar verificado (DKIM/SPF) en el panel de Resend para evitar SPAM folder.

---

## 🤖 CI/CD (GitHub Secrets)

Variables usadas por los GitHub Actions Runners.

| Secreto | Ámbito | Descripción |
| :--- | :--- | :--- |
| `CF_API_TOKEN` | Cloudflare | Token con permisos "Pages:Edit". |
| `CF_ACCOUNT_ID` | Cloudflare | ID numérico de la cuenta Cloudflare. |
| `KEYSTORE_BASE64` | Android | Archivo `.keystore` binario convertido a texto Base64. |
| `KEYSTORE_PASSWORD` | Android | Contraseña del almacén de llaves. |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Android | JSON completo de la cuenta de servicio de Google Play API. Permite subir APKs automáticamente. |

---

## 🔄 Procedimiento de Rotación de Secretos

Si sospechas que una llave fue comprometida:

1.  **MercadoPago:**
    *   Generar nuevas credenciales en panel MP.
    *   Actualizar en Supabase: `supabase secrets set MERCADOPAGO_ACCESS_TOKEN=nuevo_token`.
    *   **Impacto:** Los pagos fallarán durante el tiempo que tardes en actualizar. Planificar mantenimiento.
2.  **Supabase Service Role:**
    *   Regenerar en Supabase Dashboard > Settings > API.
    *   Actualizar en todas las Edge Functions y servicios externos (GitHub Actions).
    *   **Impacto:** Todas las Edge Functions dejarán de funcionar hasta que se actualicen.
3.  **Frontend Keys (Anon Key, MP Public):**
    *   Cambiar valores en GitHub Secrets.
    *   Disparar un nuevo deploy (`git commit --allow-empty -m "chore: rotate keys"`).
    *   **Impacto:** Los usuarios con la versión vieja de la web (caché) tendrán errores. Forzar recarga (Service Worker update).

---

**© 2026 Autorenta Security Ops**
