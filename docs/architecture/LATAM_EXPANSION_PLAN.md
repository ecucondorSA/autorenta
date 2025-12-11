# Plan de Expansión LATAM y Optimización (Argentina, Brasil, Uruguay, Ecuador)

Este documento detalla la estrategia técnica para abordar los objetivos de prevención de fraude, conversión de hosts, performance y expansión regional.

## 1. Prevención de Fraude (Colusión y Franquicias)

**Objetivo:** Mitigar el riesgo de usuarios conspirando para simular siniestros y cobrar seguros/franquicias.

**Estrategia:**
1.  **Matriz de Riesgo Social (Social Graph Risk):**
    *   Implementar función `analyze_user_relationship(user_a, user_b)` en base de datos.
    *   Alertar si:
        *   Han completado > 3 reservas entre ellos en < 6 meses.
        *   Comparten el mismo dispositivo (Device Fingerprint) o IP frecuentemente.
        *   Tienen apellidos coincidentes (básico).
2.  **Validación de Siniestros:**
    *   Requerir telemetría (si disponible) o fotos con metadatos verificables (GPS/Timestamp) al momento del reporte.
    *   Bloquear pagos automáticos de garantías si el "Risk Score" de la reserva es alto.

## 2. Conversión de Usuarios a Locadores (Hosts)

**Objetivo:** Aumentar la oferta de vehículos simplificando el onboarding.

**Análisis Actual:**
*   Dependencia fuerte de FIPE (Brasil) para valoraciones, lo cual es bueno para expansión pero requiere ajustes para Ecuador (USD) y Uruguay.
*   Proceso de carga de autos puede ser largo.

**Acciones:**
*   **"One-Click List":** Permitir guardar un borrador del auto con solo la patente/placa (usando APIs de info vehicular si existen, o FIPE).
*   **Gamificación:** Mostrar ingresos estimados potenciales basados en la ubicación del usuario (GEO IP) y modelos similares cercanos.

## 3. Performance de la Aplicación

**Objetivo:** Mejorar tiempos de carga y respuesta, crucial para redes móviles en LATAM.

**Acciones:**
*   **Auditoría Lighthouse:** Ejecutar análisis en flujos críticos (Home, Search, Booking).
*   **Optimización de Imágenes:** Verificar que las imágenes de autos se sirvan en WebP/AVIF y con tamaño adecuado (Cloudflare Image Resizing).
*   **Lazy Loading:** Revisar estrategias de carga de módulos en Angular.

## 4. Internacionalización (Argentina, Brasil, Uruguay, Ecuador)

**Estado Actual:**
*   Fuertemente acoplado a Argentina (`ARS`, `+54`, `MercadoPago MLA`).
*   Soporte parcial de idiomas (`pt.json` existe).

**Plan de Refactorización:**
1.  **Moneda Dinámica:** Migrar de `currency_id: 'ARS'` hardcodeado a `booking.currency_id` basado en la región del auto.
    *   Ecuador: `USD`.
    *   Brasil: `BRL`.
    *   Uruguay: `UYU` (o USD).
2.  **Pasarelas de Pago:**
    *   MercadoPago: Configurar credenciales condicionales (MP Argentina vs MP Brasil vs MP Uruguay/Ecuador si aplica, o usar alternativa como Kushki/PayPhone para Ecuador).
3.  **Validación de Teléfonos:** Actualizar `phone-verification.service.ts` para aceptar formatos de BR (+55), UY (+598), EC (+593).

---

## Próximos Pasos Inmediatos

1.  Crear función SQL `detect_suspicious_activity`.
2.  Auditar flujo de `add-car` para simplificación.
3.  Ejecutar auditoría de performance.
