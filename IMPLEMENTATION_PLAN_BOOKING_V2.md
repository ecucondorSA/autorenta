# 🚀 Implementation Plan: Booking System V2 (Professional & Dollarized)

> **Objetivo:** Transformar el flujo de reservas de AutoRenta en una experiencia de clase mundial. UI "Dark Ivory", transacciones en USD (visual/lógico), y una arquitectura a prueba de balas que simplifica la complejidad interna.

## 1. 🧠 UX Vision & Philosophy

*   **Invisible Complexity:** El usuario no debe saber que hay una máquina de estados de 20 pasos detrás. Solo ve: *Seleccionar -> Revisar -> Pagar -> Viajar*.
*   **Dollar First:** La moneda principal de visualización será **USD**. Esto aporta estabilidad mental al usuario frente a la inflación local.
*   **Trust by Design:** Desglose de precios cristalino. Sin sorpresas en el último paso.
*   **Contextual Actions:** El botón principal siempre debe decirme qué hacer ahora (ej: "Realizar Check-in" en lugar de un menú genérico).

---

## 2. 🏗️ Architecture Upgrades

### A. Data Models (Refinement)
Necesitamos asegurar que el modelo `Booking` y `BookingWizard` soporten explícitamente la dualidad de moneda.

```typescript
// Proposed addition to booking.model.ts
interface BookingPrice {
  totalAmountUsd: number;      // Valor canónico
  totalAmountLocal: number;    // Valor de cobro real (si aplica)
  exchangeRate: number;        // Tasa del momento de la reserva
  breakdown: {
    dailyRateUsd: number;
    insuranceUsd: number;
    serviceFeeUsd: number;
    extrasUsd: number;
  }
}
```

### B. Signal Store (`booking-flow.store.ts`)
Migraremos el estado del wizard a un **Signal Store** para reactividad granular y performance.

*   **State:** `currentStep`, `draftBooking`, `validationErrors`, `pricingCalculation`.
*   **Computed:** `canProceed`, `totalPriceUsd`, `progressPercentage`.

### C. Services Layer
*   **`CurrencyService`:** Servicio centralizado para manejar tasas de cambio (USD <-> ARS/BRL) en tiempo real.
*   **`BookingFlowFacade`:** Unificará `BookingFlowService` (lógica de negocio) con `BookingWizardData` (estado UI) para que los componentes sean "tontos" (dumb).

---

## 3. 🎨 UI/UX Components Strategy

### 1. The "Smart" Hero Search (Home)
*   **Component:** `smart-search-bar`
*   **Behavior:**
    *   Selector de rango de fechas con precios *dentro* del calendario (ej: "desde $45").
    *   Detección automática de ubicación.
    *   Animación fluida (View Transitions) hacia resultados.

### 2. Booking Review (The "One-Page" Feel)
En lugar de un wizard de 5 pasos desconectados, usaremos un **Layout de 2 Columnas** (Desktop) o **Bottom Sheet Stack** (Mobile).

*   **Left/Top:** Resumen del auto (Fotos, Specs).
*   **Right/Bottom:** Configuración dinámica.
    *   *Protección:* Selector de seguros tipo "Tarjetas" (Basic, Standard, Premium).
    *   *Extras:* Toggles simples.
    *   *Driver:* Si ya está verificado, mostrar "Verified Badge". Si no, botón "Verificar ahora" (modal/sheet).

### 3. Transparent Checkout
*   **Visual:** "Receipt" style breakdown.
*   **Logic:** Actualización en tiempo real al cambiar seguros/fechas.
*   **Payment:** Integración P2P/Card con visualización clara de totales en USD.

### 4. Active Booking Dashboard
*   **Component:** `booking-timeline-card`
*   **Visual:** Línea de tiempo vertical u horizontal que muestra *exactamente* dónde estoy (ej: "Esperando aprobación del dueño").
*   **Action:** Botón flotante (FAB) o Sticky Footer con la `nextStep` action del `BookingFlowService`.

---

## 4. 📝 Execution Steps

### Phase 1: Foundation & Currency (The "Backbone")
- [x] **Step 1:** Implementar/Refinar `CurrencyService` con hardcoded rates (o API real si existe).
- [x] **Step 2:** Actualizar `BookingWizardData` para usar Signals y soportar cálculos en USD.
- [x] **Step 3:** Crear `BookingFlowFacade` para aislar la lógica de estado.

### Phase 2: The "Smart Search" & List (The "Hook")
- [ ] **Step 4:** Rediseñar `car-card` para mostrar precio en USD con tipografía "Premium".
- [ ] **Step 5:** Implementar el `date-range-picker` mejorado (UI limpia, sin modales nativos feos).

### Phase 3: The Booking Experience (The "Flow")
- [ ] **Step 6:** Construir la página `booking-request` (Review & Pay).
    - [ ] Implementar selector de Seguros visual.
    - [ ] Implementar desglose de precios dinámico.
- [ ] **Step 7:** Integrar validación de Licencia/Identidad en el flujo (si falta).

### Phase 4: Status & Polish (The "Safety")
- [ ] **Step 8:** Crear `active-booking-status` component usando la lógica de estados de `BookingFlowService`.
- [ ] **Step 9:** Añadir micro-interacciones (loading states, success animations).
- [ ] **Step 10:** QA Intensivo: Probar flujos de borde (Cancelación, Pago fallido, Timeout).

---

## 5. 🛡️ Verification Plan
*   **Unit Tests:** Validar cálculos de precios en USD.
*   **E2E:** Simular flujo completo: Search -> Book -> Pay (Mock) -> Confirm.
*   **Visual Regression:** Asegurar que el tema "Dark Ivory" se mantenga consistente.

---
**Status:** 🟢 Ready for Execution
**Lead:** Gemini Agent
