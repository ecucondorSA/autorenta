# 🔧 Guía Maestra de Solución de Problemas (Troubleshooting)

> **Enciclopedia de Errores y Diagnóstico Avanzado**
> Esta guía no solo lista errores; explica la anatomía de los fallos en una arquitectura distribuida y provee árboles de decisión para resolver incidentes complejos en Autorenta.

---

## 🧭 Metodología de Diagnóstico

Antes de actuar, sigue el protocolo **O.D.A.** (Observar, Diagnosticar, Actuar):

1.  **Observar:** ¿Afecta a un usuario, a una región o a todos? ¿Es frontend (UI) o backend (API)?
2.  **Diagnosticar:** Revisa los logs en este orden: Consola Navegador -> Sentry -> Supabase Logs -> MercadoPago Logs.
3.  **Actuar:** Aplica la solución de menor impacto primero.

---

## 🔐 Autenticación y Seguridad (Auth)

### Caso: "Refresh Token Loop" (Bucle de Login)
*   **Síntoma:** La app recarga infinitamente o pide login cada 5 segundos.
*   **Anatomía del fallo:**
    *   El cliente envía un `refresh_token` antiguo.
    *   Supabase detecta reutilización de token (Replay Attack).
    *   Por seguridad, Supabase **revoca toda la familia de tokens** de ese usuario.
*   **Solución Raíz:**
    *   Limpiar LocalStorage: `localStorage.clear()` (instruir al usuario).
    *   Verificar si hay dos pestañas abiertas compitiendo por el refresh.

### Caso: RLS Policy Violation (Error 403 Silencioso)
*   **Síntoma:** Una lista aparece vacía o una acción falla sin mensaje de error claro.
*   **Diagnóstico SQL:**
    Ejecutar la consulta como el usuario (impersonation):
    ```sql
    -- En Supabase SQL Editor
    SET request.jwt.claim.sub = 'uuid-del-usuario';
    SET request.jwt.claim.role = 'authenticated';
    SELECT * FROM bookings; -- ¿Devuelve filas?
    ```
*   **Causa Común:** La política RLS usa `auth.uid()` pero el usuario no tiene la sesión correctamente establecida en el contexto de la query.

---

## 💳 Pagos y Transacciones (Financial Core)

### Error `cc_rejected_high_risk` (Fraude)
*   **Contexto:** MercadoPago rechazó el pago por scoring de fraude.
*   **Acción:**
    1.  No reintentar inmediatamente (bloqueará la tarjeta).
    2.  Pedir al usuario que llame a su banco para autorizar "compra online inusual".
    3.  Intentar con otro medio de pago.

### Error `cc_rejected_insufficient_amount` (Fondos)
*   **Contexto:** El usuario jura que tiene fondos.
*   **Causa Técnica:**
    *   En tarjetas de **Débito**, el banco a veces bloquea pre-autorizaciones (holds) porque no son compras finales.
    *   El monto incluye la garantía, que puede ser alto.
*   **Solución:** Sugerir usar tarjeta de **Crédito** real, no prepaga/débito.

### Incidente: "Dinero Desaparecido" (Race Condition)
*   **Síntoma:** El renter pagó, se debitó, pero la reserva dice "Pendiente de Pago".
*   **Análisis Forense:**
    1.  Buscar el `payment_intent_id` en la tabla `bookings`.
    2.  Buscar ese ID en el Dashboard de MercadoPago.
    3.  Si está `approved` en MP pero no en DB: **Fallo de Webhook**.
*   **Recuperación (Script):**
    Correr script de reconciliación manual:
    `pnpm run script:reconcile-payment --booking=uuid`

---

## 🚗 Disponibilidad y Calendario (Concurrency)

### El Problema del "Booking Fantasma"
*   **Síntoma:** El calendario muestra fechas bloqueadas pero no hay reserva visible.
*   **Causa:** Una reserva entró en estado `pending_payment`, bloqueó fechas, pero el usuario abandonó el checkout. El job de limpieza (`expire-pending-deposits`) falló o aún no corrió.
*   **Solución Inmediata:**
    *   Buscar en `car_blocked_dates` donde `reason = 'booking'` y `booking_id` es una reserva expirada.
    *   Borrar manualmente el bloqueo o correr el cron job manualmente desde Supabase Dashboard.

---

## ⚡ Edge Functions y Performance

### "504 Gateway Time-out" en Generación de Contratos
*   **Contexto:** `generate-booking-contract-pdf` falla.
*   **Causa:** Puppeteer (la librería que genera el PDF) consume mucha RAM y CPU. Si el contrato es muy largo o incluye muchas fotos de alta resolución, el contenedor de Deno se queda sin memoria (OOM).
*   **Optimización:**
    *   Reducir calidad de imágenes antes de incrustarlas en el PDF.
    *   Aumentar el tamaño de la instancia de la función en Supabase (requiere plan Pro/Enterprise).

### Cold Starts (Latencia inicial)
*   **Síntoma:** La primera petición tarda 2-3 segundos.
*   **Mitigación:** Usar un "Keep-Alive" cron job que invoca las funciones críticas (`pinger`) cada 5 minutos para mantener el contenedor caliente.

---

## 📱 Mobile (Android/Capacitor)

### Deep Links Rotos
*   **Síntoma:** El email de "Confirmar Email" abre el navegador en vez de la App.
*   **Diagnóstico:** Verificar archivo `assetlinks.json` en el dominio web (`.well-known/assetlinks.json`). Debe coincidir exactamente con el hash SHA-256 del certificado de firma de la App Android.
*   **Herramienta:** Usar [Google Digital Asset Links Tools](https://developers.google.com/digital-asset-links/tools/generator).

### Geolocalización Imprecisa
*   **Causa:** El modo "Ahorro de batería" de Android mata el proceso de GPS en segundo plano.
*   **Solución:** No hay solución técnica perfecta. Mostrar aviso al usuario: "Para mejor experiencia, desactiva el ahorro de energía".

---

## 🚨 Árbol de Decisión: Sistema Caído

**¿La web carga (`autorentar.com`)?**
*   **NO:**
    *   ¿Es DNS? (`nslookup autorentar.com`)
    *   ¿Es Cloudflare? (Ver status.cloudflare.com)
*   **SÍ, pero da error de conexión:**
    *   ¿Supabase está caído? (Verificar conexión DB desde local).
    *   ¿Las Edge Functions responden? (Probar `curl` a healthcheck).

**¿Los pagos fallan masivamente?**
*   **SÍ:**
    *   ¿Expiraron las credenciales de MP? (Rotarlas inmediatamente).
    *   ¿Cambió la API de MP? (Revisar changelog).

---

## 🧰 Kit de Herramientas del Operador

### Scripts de Mantenimiento (`/tools/ops/`)
*   `cleanup.sh`: Borra usuarios de prueba y datos basura.
*   `monitor-health.sh`: Verifica endpoints críticos y envía alerta a Slack/Discord.
*   `db-snapshot.sh`: Crea un dump rápido de la estructura (no datos) para análisis local.

### Consultas SQL Salvavidas

**Desbloquear una Wallet manualmente (Emergency Unlock):**
```sql
UPDATE wallets 
SET locked_balance = locked_balance - 50000, 
    available_balance = available_balance + 50000 
WHERE user_id = '...' AND locked_balance >= 50000;
-- ¡CUIDADO! Esto debe ir acompañado de un registro de auditoría manual.
```

**Verificar integridad de FGO:**
```sql
SELECT 
  (SELECT SUM(amount) FROM fgo_transactions) as ledger_sum,
  (SELECT balance FROM fgo_accounts WHERE id = 'main') as account_balance;
-- Si difieren, hay corrupción de datos o race condition.
```

---

**© 2026 Autorenta Reliability Engineering**
