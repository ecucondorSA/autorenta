# Análisis de Oportunidades y Recursos Externos: Autorenta

Este documento detalla mejoras estratégicas basadas en el análisis de la arquitectura actual (Angular v20 + Supabase) y sugiere recursos externos útiles (Open Source) para potenciar la plataforma.

## 1. Estado Actual de la Arquitectura

La plataforma demuestra una madurez técnica alta:
- **Frontend:** Angular v20 (Bleeding Edge) con Ionic 8 y PrimeNG. Uso de Signals inferido.
- **Backend:** Supabase con uso extensivo de Edge Functions (MercadoPago, PayPal, Cron Jobs).
- **Calidad:** Pruebas E2E con Playwright y CI/CD en GitHub Actions configurado.
- **Seguridad:** Políticas RLS implementadas (verificado en `admin_users.sql`) y funciones `SECURITY DEFINER`.

## 2. Recursos Externos Útiles (GitHub Raw / Open Source)

Aprovechando tu interés en recursos externos (`raw.githubusercontent.com`), aquí hay implementaciones específicas que aportarían valor inmediato:

### A. Datos de Vehículos (API Externa)
*   **Estado:** **Resuelto**. La plataforma ya consume una API externa para obtener datos actualizados de marcas y modelos. No se requiere importación manual desde GitHub.

### B. GeoJSON para Geofencing (Mapbox)
*   **Qué:** Polígonos de ciudades o zonas de riesgo/seguridad.
*   **Dónde:** `apps/web/src/assets/geo/`
*   **Recurso:** Repositorios de OpenStreetMap o [polygons.openstreetmap.fr](http://polygons.openstreetmap.fr/).
*   **Utilidad:** Tu integración de Mapbox puede usar estos archivos raw para delimitar zonas de entrega permitidas sin dibujar todo a mano.

### C. Listas de Seguridad (Blocklists)
*   **Qué:** Listas de IPs de VPNs, Tor, o emails desechables para prevenir fraude.
*   **Dónde:** Edge Function `verify-user-docs` o middleware de Auth.
*   **Recurso:** [Firehol IP Lists](https://github.com/firehol/blocklist-ipsets)
*   **Utilidad:** Bloquear intentos de registro/reserva desde fuentes sospechosas antes de procesar pagos.

## 3. Recomendaciones de Infraestructura & DX

### A. Documentación Viva (Compodoc) - ✅ IMPLEMENTADO
*   **Estado:** Instalado y configurado.
*   **Uso:**
    *   Generar: `npm run docs:build` (en `apps/web`)
    *   Servir: `npm run docs:serve` (en `apps/web`)
*   **Resultado:** Documentación técnica generada en `apps/web/documentation/`.
*   **Beneficio:** Visualización automática de módulos, componentes y dependencias de Angular.

### B. Optimización de Imágenes (Edge)
*   **Observación:** Usas `three.js`, lo que implica carga pesada.
*   **Mejora:** Asegurar que las fotos de los autos subidas a Supabase Storage pasen por una Edge Function de redimensionamiento (usando Sharp, que ya tienes en devDependencies) antes de servirse.

### C. Testing Visual (Regresión)
*   **Observación:** Tienes Playwright.
*   **Mejora:** Activar "Visual Comparisons" (snapshots) de Playwright en tus tests E2E.
*   **Dónde:** `tests/e2e/*.spec.ts`
*   **Comando:** `await expect(page).toHaveScreenshot();`
*   **Por qué:** Con PrimeNG + Ionic, una actualización de estilos puede romper layouts sutilmente.

## 4. Resumen de Acción Inmediata

1.  **Docs:** ¡Listo! Ejecuta `cd apps/web && npm run docs:serve` para ver tu arquitectura.
2.  **GeoJSON:** Buscar polígonos de zonas seguras en GitHub para Mapbox.
3.  **Visual Tests:** Agregar `toHaveScreenshot()` a un test crítico.

---
*Actualizado por Gemini CLI - 03/12/2025*