# 🛡️ Análisis de Riesgos Latentes - Lanzamiento v1.0

> **Fecha:** 2026-02-02
> **Auditor:** Antigravity (Tech Lead AI)
> **Estado:** 3 Riesgos Detectados

Como Tech Lead, he analizado la arquitectura actual post-hardening y detectado 3 vectores de riesgo que no aparecen en Sentry pero podrían afectar el lanzamiento bajo carga.

---

## 🚨 Riesgo 1: Costos de Egress y Latencia en Imágenes (Bandwidth)
**Nivel de Riesgo:** Alto (Económico/Performance)

**El Problema:**
Aunque comprimimos los *uploads* a ~1MB, estamos sirviendo las imágenes "crudas" en el `CarDetailPage`.
- Código actual: `supabase.storage.from('car-images').getPublicUrl(path)`
- **Impacto:** Si un auto tiene 5 fotos de 800KB = **4MB por vista**.
- **Escenario Viral:** 1,000 usuarios viendo 10 autos = **40GB de transferencia** en un día. Esto quemará la cuota de ancho de banda o costo de Supabase rápidamente y será lento en 3G/4G.

**Mitigación Rápida:**
1.  **Usar Supabase Image Transformations:**
    Cambiar la llamada en `resolveCarPhotoUrl` para solicitar versiones redimensionadas.
    ```typescript
    // Antes
    getPublicUrl(path)
    
    // Después (Mitigación)
    getPublicUrl(path, { transform: { width: 800, quality: 80, format: 'webp' } })
    ```
2.  **Implementar en `ui-core`:** Crear un pipe o utilitario centralizado `optimizeImage(url, width)`.

---

## ⚡ Riesgo 2: Tiempos de Ejecución en Edge Functions (Timeouts)
**Nivel de Riesgo:** Medio/Alto (Funcional)

**El Problema:**
El webhook de MercadoPago (`mercadopago-webhook`) realiza operaciones sincrónicas en cadena:
1. `fetch` a API de MP (puede tardar 2-3s).
2. `supabase.rpc` para lógica de negocio (ledger, updates).
Si la base de datos tiene latencia alta o MP responde lento, la función puede superar el límite de tiempo (wall-clock limit) o la conexión HTTP. Si MP recibe timeout, reenvía el webhook, causando posibles duplicados o "baneo" del endpoint si falla mucho.

**Mitigación Rápida:**
1.  **Arquitectura Async (Queue):**
    El webhook solo debe:
    - Insertar el payload en una tabla `webhook_queue`.
    - Responder `200 OK` inmediatamente a MP.
    - Un Trigger o Cron procesa la cola separadamente.
2.  **Aumentar Timeout (Patch):** Si no hay tiempo para refactorizar a Queue, asegurar que la función tenga el timeout máximo configurado en `config.toml` de Supabase Functions.

---

## 🔌 Riesgo 3: Saturación de Conexiones Realtime
**Nivel de Riesgo:** Medio (Escalabilidad)

**El Problema:**
Cada usuario en el Dashboard (`pending-approval.page.ts`, etc.) abre una suscripción Realtime a su tabla de bookings.
- Plan Pro de Supabase: ~500 conexiones concurrentes (depende del tier, pero no es infinito).
- Si 600 usuarios entran al mismo tiempo tras una notificación Push masiva, las conexiones nuevas fallarán o tumbarán el servicio de realtime.

**Mitigación Rápida:**
1.  **Lazy Connection:** Solo conectar Realtime cuando la app está en primer plano (usar Page Visibility API).
2.  **Fallback a Polling Inteligente:** El código actual ya tiene un fallback, pero asegúrate que si Realtime falla, el polling sea suave (ej. cada 60s con jitter) para no DDOSear la API REST.

---

## 📝 Recomendación Final
Priorizar **Riesgo 1 (Imágenes)** para el día 1, ya que es un cambio de frontend de bajo riesgo con alto impacto en costos y UX.
El Riesgo 2 y 3 pueden monitorearse post-lanzamiento si el volumen inicial es controlado.
