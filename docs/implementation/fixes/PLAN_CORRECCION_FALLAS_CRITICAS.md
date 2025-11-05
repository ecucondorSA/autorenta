# Plan de Corrección: Fallas Críticas Identificadas

## Estado Actual del Análisis

### ✅ PROBLEMA 1: ATOMICIDAD EN RESERVAS - **YA RESUELTO**

**Hallazgo:** La función `create_booking_atomic` ya está implementada correctamente.

**Evidencia:**
- ✅ Función SQL en: `/database/fix-atomic-booking.sql`
- ✅ Servicio TypeScript: `bookings.service.ts` línea 886
- ✅ Uso en página: `booking-detail-payment.page.ts` línea 693
- ✅ Manejo de transacciones con rollback automático
- ✅ Validación de disponibilidad incluida
- ✅ Creación de booking + risk_snapshot en una sola operación

**Conclusión:** ✅ No requiere acción. Sistema robusto implementado.

---

## 🔴 PROBLEMA 2: FALLBACK A WALLET SIN MENSAJE EXPLICATIVO

**Ubicación:** `booking-detail-payment.page.ts` línea 598

**Código actual:**
```typescript
protected onFallbackToWallet(): void {
  this.paymentMode.set('wallet');
}
```

**Problema:** Cambio abrupto sin feedback al usuario.

**Solución propuesta:**
1. Agregar signal para mensaje de fallback
2. Mostrar toast/modal explicativo
3. Dar opción de reintentar con tarjeta

**Impacto:** 🟡 Medio - Afecta UX pero no funcionalidad

---

## 🔴 PROBLEMA 3: PRECIOS INCONSISTENTES EN CARRUSEL

**Ubicación:** `cars-list.page.html` líneas 2-61

**Código actual:**
```html
<ng-template #carouselCard let-car>
  <!-- ... -->
  <span class="map-carousel-card__price">{{ car.price_per_day | money }}</span>
  <!-- ... -->
</ng-template>
```

**Problema:** 
- Usa `price_per_day` directamente (estático)
- La lista principal usa `<app-car-card>` con precios dinámicos
- Mismo auto puede mostrar 2 precios diferentes

**Solución propuesta:**
1. Reemplazar template personalizado por `<app-car-card>`
2. Unificar toda la lógica de presentación
3. Aplicar estilos del carrusel al componente

**Impacto:** 🔴 Alto - Afecta confianza del usuario y coherencia de datos

---

## 🟡 PROBLEMA 4: COMPLEJIDAD DEL COMPONENTE DE PAGO

**Ubicación:** `booking-detail-payment.page.ts` (componente completo)

**Problema:** 
- Componente maneja múltiples dominios (pricing, risk, payment, wallet)
- Dificulta mantenimiento y testing
- Violación del principio de responsabilidad única

**Solución propuesta:**
1. Crear `BookingOrchestratorService`
2. Mover lógica de negocio al servicio
3. Componente solo maneja presentación

**Impacto:** 🟢 Bajo (deuda técnica) - No afecta funcionalidad actual

---

## Priorización de Correcciones

### 🔥 CRÍTICO (Hacer ahora)
1. **Problema 3:** Inconsistencia de precios en carrusel

### ⚡ IMPORTANTE (Esta semana)
2. **Problema 2:** Mejorar UX del fallback a wallet

### 📋 MEJORA (Próximo sprint)
3. **Problema 4:** Refactorizar componente de pago

---

## Próximos Pasos

1. ✅ Verificar función atómica en DB (ya completado)
2. 🔧 Corregir carrusel con precios dinámicos
3. 🎨 Implementar mensaje de fallback
4. 📊 Testing de regresión
5. 🚀 Deploy a staging
