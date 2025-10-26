# Plan de Acción: Corrección de Deficiencias Críticas - Flujo Locatario

**Fecha:** 26 de Octubre, 2025  
**Basado en:** ANALISIS_E2E_LOCATARIO.md

## Priorización de Tareas

### 🔴 PRIORIDAD CRÍTICA 1: Atomicidad en Creación de Reservas
**Archivo afectado:** `src/app/bookings/booking-detail-payment/booking-detail-payment.page.ts`  
**Riesgo:** Alto - Posibles reservas fantasma y pérdidas económicas  
**Esfuerzo:** Medio (3-4 horas)

#### Plan de implementación:
1. Crear función RPC en Supabase: `create_booking_with_details`
2. La función debe recibir todos los parámetros y ejecutar en una transacción:
   - INSERT en `bookings`
   - INSERT en `risk_snapshots`
   - UPDATE en `bookings` con `risk_snapshot_id`
3. Refactorizar `createNewBooking()` para usar la nueva RPC
4. Añadir manejo de errores robusto con rollback automático

#### Archivos a modificar:
- SQL: Nueva función RPC en Supabase
- `booking-detail-payment.page.ts`: Refactor método `createNewBooking()`
- Opcional: Actualizar tipos TypeScript generados

---

### 🔴 PRIORIDAD CRÍTICA 2: Consolidar Flujo de Pago en Una Página
**Archivos afectados:** 
- `src/app/bookings/booking-detail-payment/booking-detail-payment.page.ts`
- `src/app/bookings/checkout/checkout.page.ts`

**Riesgo:** Alto - Abandono de usuarios en el flujo de pago  
**Esfuerzo:** Alto (5-6 horas)

#### Plan de implementación:
1. **Fase 1: Mover lógica de pago final a `booking-detail-payment.page.ts`**
   - Integrar el método `processPayment()` de `checkout.page.ts`
   - El botón "Confirmar y Pagar" debe ejecutar el pago completo
   - Eliminar la redirección a `/bookings/checkout/:bookingId`

2. **Fase 2: Crear página de éxito dedicada**
   - Nueva ruta: `/bookings/success/:bookingId`
   - Componente: `booking-success.page.ts`
   - Mostrar:
     * Mensaje de confirmación claro
     * Resumen de la reserva
     * Próximos pasos accionables
     * CTAs: "Ver mis reservas" / "Volver al inicio"

3. **Fase 3: Actualizar navegación**
   - Después de pago exitoso → redirigir a `/bookings/success/:bookingId`
   - Considerar deprecar `/bookings/checkout/:bookingId`

#### Archivos a crear/modificar:
- `booking-detail-payment.page.ts`: Integrar lógica de pago final
- `booking-success.page.ts` (NUEVO)
- `booking-success.page.html` (NUEVO)
- `app-routing.module.ts`: Nueva ruta
- Opcional: Migrar/eliminar `checkout.page.ts`

---

### 🟡 PRIORIDAD MEDIA: Campo `value_usd` en Tabla Cars
**Archivo afectado:** `src/app/cars/car-detail/car-detail.page.ts`  
**Riesgo:** Medio - Cálculos de riesgo/seguro incorrectos  
**Esfuerzo:** Bajo (1-2 horas)

#### Plan de implementación:
1. **Base de datos:**
   - Añadir columna `value_usd` a tabla `cars` (NUMERIC, nullable)
   - Script de migración para estimar valores iniciales (fórmula actual)

2. **Backend/Admin:**
   - Actualizar formularios de creación/edición de autos
   - Validar que `value_usd` sea obligatorio para nuevos autos

3. **Frontend:**
   - Modificar `car-detail.page.ts`:
     * Eliminar cálculo hardcodeado
     * Usar `car.value_usd` directamente
   - Añadir fallback temporal para autos sin `value_usd`

#### Archivos a modificar:
- SQL: Migración para añadir columna
- `car-detail.page.ts`: Eliminar fórmula, usar campo DB
- Admin panel: Formularios de autos
- Tipos TypeScript: Actualizar interfaz `Car`

---

## Tareas Adicionales (Mejoras No Críticas)

### 🟢 Baja Prioridad: Unificar Componente de Tarjeta de Auto
**Archivo:** `src/app/cars/cars.page.ts`  
**Esfuerzo:** Bajo (1 hora)

- Refactorizar carrusel de "autos económicos" para usar `<app-car-card>`
- Eliminar template personalizado `#carouselCard`
- Garantizar precios dinámicos en todas las vistas

### 🟢 Baja Prioridad: Modal de Reserva en Lugar de Navegación
**Archivo:** `car-detail.page.ts`  
**Esfuerzo:** Medio (3 horas)

- Considerar mostrar `booking-detail-payment` como modal
- Mejorar percepción de velocidad del flujo

### 🟢 Baja Prioridad: Mensaje en Fallback a Wallet
**Archivo:** `booking-detail-payment.page.ts`  
**Esfuerzo:** Bajo (30 minutos)

- Añadir mensaje explicativo cuando falla pre-autorización con tarjeta
- Mejorar UX del cambio a wallet

---

## Orden de Ejecución Recomendado

**Sprint 1 (Esta semana):**
1. ✅ Prioridad Crítica 1: Atomicidad en reservas
2. ✅ Prioridad Media: Campo `value_usd` en cars

**Sprint 2 (Próxima semana):**
3. ✅ Prioridad Crítica 2: Consolidar flujo de pago
4. ✅ Mejoras adicionales de baja prioridad

---

## Métricas de Éxito

- **Reservas fantasma:** Debería reducirse a 0
- **Tasa de abandono:** Esperamos reducción del 20-30% al consolidar el flujo
- **Precisión de cálculos:** 100% de autos con valor real en DB
- **Tiempo promedio de checkout:** Reducción esperada del 30-40%

