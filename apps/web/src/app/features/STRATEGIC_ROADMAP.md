# 🗺️ AutoRenta Strategic Roadmap 2026: The "Fortress" Architecture

> **Resumen de Investigación:** Este documento consolida las mejores prácticas de seguridad, arquitectura y producto para marketplaces P2P de movilidad en 2025/2026.
> **Objetivo:** Transformar AutoRenta de un MVP funcional a una plataforma de clase mundial, segura y escalable.

---

## 1. 🛡️ Confianza y Seguridad (Trust & Safety)
*El activo más valioso en P2P no son los autos, es la confianza.*

### A. Verificación de Identidad "Liveness" (Recomendado)
**¿Qué falta?** Actualmente subimos fotos de DNI. Esto es vulnerable a deepfakes y fotos robadas.
**Recomendación:** Implementar **Prueba de Vida Activa (Liveness Detection)**.
**¿Por qué?**
- **Fraude de Identidad Sintética:** Los criminales crean perfiles con mix de datos reales y falsos.
- **Solución Técnica:** Usar la cámara para pedirle al usuario que "mire a la izquierda" o "sonría". Esto certifica que el humano está presente.
- **Implementación:** Integrar SDKs como **FaceTec** o **SumSub** (o construir uno ligero con **MediaPipe** en el frontend, ya tienes la dependencia).

### B. Huella Digital del Dispositivo (Device Fingerprinting)
**¿Qué falta?** Bloqueamos usuarios, pero no dispositivos.
**Recomendación:** Implementar fingerprinting persistente.
**¿Por qué?**
- **Multi-accounting:** Un estafador baneado crea otra cuenta en 5 minutos.
- **Solución:** Generar un hash único basado en hardware (GPU, Pantalla, Batería) que persista incluso si reinstalan la app. Si el *Dispositivo X* es fraudulento, se bloquean *todas* las cuentas que se logueen desde él.

---

## 2. 💰 Arquitectura Financiera (Escrow & Splits)
*El dinero nunca debe tocar tu cuenta bancaria operativa.*

### A. Modelo de "Bóveda" (Escrow Ledger)
**¿Qué falta?** El sistema actual (`wallet_ledger`) es bueno, pero necesitamos separar legalmente los fondos.
**Recomendación:** Arquitectura de **Cuentas Virtuales Segregadas**.
**¿Por qué?**
- **Compliance Legal:** En muchos países, tocar el dinero de terceros requiere licencia bancaria.
- **Solución:**
    1.  El dinero del Renter entra a una cuenta "Pasarela" (MercadoPago/Stripe).
    2.  Se crea un registro en `wallet_ledger` (como ya tienes).
    3.  **Cambio:** El dinero se mueve automáticamente a una "Sub-cuenta" a nombre del Owner en el proveedor de pagos (MercadoPago Split Payment), no a tu cuenta principal.
    4.  Tú solo cobras la comisión (`platform_fee`).

### B. Depósitos de Garantía Tokenizados (Pre-Auth)
**¿Qué falta?** Validar la solvencia real en tarjetas de crédito.
**Recomendación:** Uso estricto de **Two-Step Payments (Auth & Capture)**.
**¿Por qué?**
- **Riesgo:** Cobrar $500 de depósito y luego devolverlos cuesta comisiones y fricción.
- **Solución:**
    1.  **Auth:** "Reservar" el cupo en la tarjeta (sin cobrar). El banco garantiza el dinero por 7-30 días.
    2.  **Capture:** Solo si hay daños, "capturas" el monto exacto.
    3.  **Cancel:** Si todo sale bien, liberas el cupo. Costo $0.

---

## 3. ⚡ Rendimiento y UX (The 2026 Standard)
*La velocidad es una "feature" de seguridad. Una app lenta parece insegura.*

### A. Optimistic UI Updates (UI Optimista)
**¿Qué falta?** Esperamos a que el servidor responda para mostrar éxito.
**Recomendación:** Aplicar cambios visuales inmediatamente, revertir si falla.
**¿Por qué?**
- **Percepción:** Hace que la app se sienta "nativa" e instantánea.
- **Ejemplo:** Al dar "Like" a un auto, el corazón se pone rojo al instante (`signal.set(true)`). La petición HTTP va por detrás. Si falla, mostramos un Toast y revertimos el corazón.

### B. Angular Deferrable Views (`@defer`)
**¿Qué falta?** Cargamos mapas y componentes pesados de golpe.
**Recomendación:** Usar masivamente `@defer (on viewport)` para componentes costosos.
**¿Por qué?**
- **Core Web Vitals:** Mejora drástica en LCP (Largest Contentful Paint).
- **Ejemplo:** No cargar el mapa de ubicación del auto hasta que el usuario haga scroll hasta esa sección.

---

## 4. 🧠 Inteligencia Operativa (AI Defense)
*Usar la IA no solo para generar texto, sino para proteger.*

### A. Detección de Daños por Visión Computacional (Pre-entrenada)
**¿Qué falta?** Dependemos de fotos manuales y revisión humana lenta.
**Recomendación:** Analizar fotos de Check-in/Check-out en tiempo real.
**¿Por qué?**
- **Disputas:** El 80% de las quejas son "ese rayón ya estaba".
- **Solución:** Al subir la foto en el Check-in, una Edge Function con un modelo ligero (TensorFlow.js o API de Vision) detecta abolladuras y las marca en la imagen. Si hay un daño nuevo en el Check-out, la IA lo flaggea automáticamente.

### B. Scoring de Riesgo Dinámico (Dynamic Risk Pricing)
**¿Qué falta?** El precio del seguro/depósito es estático.
**Recomendación:** Ajustar la garantía según el perfil del usuario.
**¿Por qué?**
- **Justicia:** Un usuario de 40 años con 50 viajes perfectos no debería pagar el mismo depósito que uno nuevo de 18 años.
- **Algoritmo:**
    `Riesgo = (Edad < 25 * 1.5) + (Antigüedad_Cuenta) + (Historial_Siniestros)`
    Si `Riesgo` es bajo -> Depósito $200.
    Si `Riesgo` es alto -> Depósito $1000.

---

## 📝 Resumen del Plan de Implementación

| Prioridad | Iniciativa | Tecnología Sugerida | Impacto |
| :--- | :--- | :--- | :--- |
| 🔴 **Crítica** | **Device Fingerprinting** | FingerprintJS / ClientJS | Bloqueo efectivo de estafadores recurrentes. |
| 🟠 **Alta** | **Pagos Two-Step** | MercadoPago Reservas | Reduce costos de reembolso y asegura fondos. |
| 🟡 **Media** | **AI Damage Detection** | Google Cloud Vision / TensorFlow | Reduce disputas y carga de soporte. |
| 🟢 **Baja** | **Optimistic UI** | Angular Signals | Mejora la experiencia de usuario (UX). |

*Este roadmap posiciona a AutoRenta no solo como una app de alquiler, sino como una plataforma Fintech de movilidad segura.*
