# ✅ Semana 3-4 - Tours Extendidos con Features Avanzados

## Fecha: 2025-10-24

---

## 🎯 GuidedBooking Tour - Extendido a 10 Pasos

### ✅ Cambios Implementados

**Archivo**: `apps/web/src/app/core/guided-tour/registry/tour-registry.service.ts`

**Versión**: 1.0.0 → 2.0.0 (Extended)

### Nuevos Pasos Agregados:

| Paso | ID | Descripción | Marcador HTML Requerido |
|------|-----|-------------|------------------------|
| 1 | `guided-search` | ✅ Ya existe | `[data-tour-step="guided-search"]` |
| 2 | `guided-select-car` | ✅ Ya existe | `[data-tour-step="guided-select-car"]` |
| 3 | `guided-map` | 🆕 Mapa interactivo | `#map-container` |
| 4 | `guided-car-detail` | 🆕 Detalles del auto | `[data-tour-step="car-detail-gallery"]` |
| 5 | `guided-dates` | 🆕 Selección de fechas | `[data-tour-step="booking-dates"]` |
| 6 | `guided-price` | 🆕 Desglose de precio | `[data-tour-step="price-breakdown"]` |
| 7 | `guided-book-button` | 🆕 Botón de reserva | `[data-tour-step="book-button"]` |
| 8 | `guided-booking-detail` | 🆕 Confirmación | `[data-tour-step="booking-summary"]` |
| 9 | `guided-chat` | 🆕 Chat con dueño | `[data-tour-step="booking-chat"]` |
| 10 | `guided-payment` | 🆕 Pago seguro | `[data-tour-step="payment-section"]` |

---

## 🆕 Features Avanzados Implementados

### 1. Guards Condicionales

```typescript
guards: [
  {
    name: 'hasInventory',
    check: async () => {
      const cars = document.querySelectorAll('[data-tour-step="guided-select-car"]');
      return cars.length > 0;
    },
  },
  {
    name: 'isOnCarsPage',
    check: () => {
      return window.location.pathname === '/cars' || 
             window.location.pathname.startsWith('/cars');
    },
  },
]
```

**Beneficio**: Tour solo se inicia si hay autos disponibles y usuario está en página correcta.

---

### 2. Triggers Basados en Rutas

```typescript
triggers: [
  {
    type: 'route',
    routePattern: /^\/cars$/,
  },
]
```

**Beneficio**: Tour se puede auto-iniciar cuando usuario navega a `/cars`.

---

### 3. Hooks Async (onBefore/onAfter)

```typescript
{
  id: 'guided-select-car',
  onBefore: async () => {
    // Ensure carousel is visible
    const carousel = document.querySelector('[data-tour-step="guided-select-car"]');
    if (carousel) {
      carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  },
}
```

**Beneficio**: Prepara UI antes de mostrar el paso (scroll, expand panels, etc).

---

### 4. Responsive Configuration

```typescript
{
  id: 'guided-search',
  position: 'right', // Desktop
  responsive: {
    mobile: {
      position: 'bottom',
      content: {
        title: '🔍 Buscar',
        text: 'Versión corta para mobile',
      },
    },
  },
}
```

**Beneficio**: Diferentes posiciones y contenido según dispositivo.

---

### 5. Alternative Selectors

```typescript
target: {
  selector: '[data-tour-step="guided-search"]',
  required: true,
  altSelectors: ['#filters', '.map-controls__filters'],
}
```

**Beneficio**: Fallback si el selector principal no existe.

---

### 6. Analytics Tracking

```typescript
analytics: {
  step_name: 'car_selection',
  step_order: 2,
}
```

**Beneficio**: Metadata adicional para reportes de telemetría.

---

## 📋 Marcadores HTML Adicionales Requeridos

### Páginas de Cars

#### 1. Mapa (Ya existe)
```html
<!-- apps/web/src/app/features/cars/list/cars-list.page.html -->
<div id="map-container" class="map-wrapper">
  <app-cars-map ...></app-cars-map>
</div>
```
✅ No requiere cambios

---

### Página de Car Detail

#### 2. Galería de Fotos
```html
<!-- apps/web/src/app/features/cars/detail/car-detail.page.html -->
<div class="car-gallery" data-tour-step="car-detail-gallery">
  <app-image-carousel [images]="car.photos"></app-image-carousel>
</div>
```

#### 3. Selector de Fechas
```html
<div class="booking-form" data-tour-step="booking-dates">
  <app-date-range-picker
    [(startDate)]="startDate"
    [(endDate)]="endDate"
  ></app-date-range-picker>
</div>
```

#### 4. Desglose de Precio
```html
<div class="pricing-summary" data-tour-step="price-breakdown">
  <div class="price-item">
    <span>Precio por día</span>
    <span>{{ pricePerDay | money }}</span>
  </div>
  <div class="price-item">
    <span>Total</span>
    <span>{{ totalPrice | money }}</span>
  </div>
</div>
```

#### 5. Botón de Reserva
```html
<button 
  type="submit"
  data-tour-step="book-button"
  class="btn-primary"
  (click)="onBook()"
>
  Reservar Ahora
</button>
```

---

### Página de Booking Detail

#### 6. Resumen de Reserva
```html
<!-- apps/web/src/app/features/bookings/detail/booking-detail.page.html -->
<div class="booking-summary" data-tour-step="booking-summary">
  <h2>Confirmación de Reserva #{{ booking.id }}</h2>
  <!-- Booking details -->
</div>
```

#### 7. Chat con Dueño
```html
<div class="chat-section" data-tour-step="booking-chat">
  <button (click)="openChat()">
    💬 Chatear con {{ owner.name }}
  </button>
</div>
```

#### 8. Sección de Pago
```html
<div class="payment-section" data-tour-step="payment-section">
  <app-mercadopago-checkout></app-mercadopago-checkout>
</div>
```

---

## 🎨 Ejemplo: Implementación Completa de un Paso

### Paso con Todas las Features

```typescript
{
  id: 'guided-select-car',
  content: {
    title: '🚗 Paso 2: Elegir un Auto',
    text: 'Explora los autos cercanos y económicos.',
  },
  position: 'top',
  
  // Target con fallbacks
  target: {
    selector: '[data-tour-step="guided-select-car"]',
    required: false,
    altSelectors: ['.map-carousel', '.map-carousel-mobile'],
  },
  
  // Hook pre-ejecución
  onBefore: async () => {
    const carousel = document.querySelector('[data-tour-step="guided-select-car"]');
    if (carousel) {
      carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  },
  
  // Hook post-ejecución
  onAfter: async () => {
    console.log('✅ User completed car selection step');
  },
  
  // Responsive override
  responsive: {
    mobile: {
      position: 'bottom',
      target: {
        selector: '.map-carousel-mobile',
      },
      content: {
        title: '🚗 Elegir',
        text: 'Versión móvil del texto.',
      },
    },
  },
  
  // Botones personalizados
  buttons: [
    { 
      text: '← Atrás', 
      action: 'back', 
      classes: 'shepherd-button-secondary' 
    },
    { 
      text: 'Continuar →', 
      action: 'next', 
      classes: 'shepherd-button-primary' 
    },
  ],
  
  // Analytics metadata
  analytics: {
    step_name: 'car_selection',
    step_order: 2,
    feature_area: 'booking',
  },
}
```

---

## 🧪 Testing de Features Avanzados

### Test 1: Guards

```javascript
// En console del navegador:

// 1. Verificar guard de inventory
const cars = document.querySelectorAll('[data-tour-step="guided-select-car"]');
console.log('Cars available:', cars.length);

// 2. Verificar guard de route
console.log('On /cars page?', window.location.pathname === '/cars');

// 3. Forzar tour ignorando guards
guidedTour.request({ 
  id: TourId.GuidedBooking, 
  force: true // Bypass guards
});
```

---

### Test 2: Hooks

```javascript
// Modificar temporalmente un hook para debugging:

// En tour-registry.service.ts, agregar logs:
onBefore: async () => {
  console.log('🔵 onBefore: Preparing carousel');
  const carousel = document.querySelector('[data-tour-step="guided-select-car"]');
  if (carousel) {
    console.log('✅ Carousel found, scrolling...');
    carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Scroll complete');
  } else {
    console.warn('⚠️ Carousel not found');
  }
},

onAfter: async () => {
  console.log('🟢 onAfter: Step completed');
},
```

---

### Test 3: Responsive

```javascript
// 1. Abrir DevTools
// 2. Toggle device toolbar (Ctrl+Shift+M)
// 3. Seleccionar iPhone 12 Pro (390x844)
// 4. Iniciar tour:
guidedTour.request({ id: TourId.GuidedBooking, force: true });

// 5. Verificar:
// - Position cambia de 'top' a 'bottom' en mobile
// - Content se adapta (título más corto)
// - Target selector usa versión mobile
```

---

### Test 4: Alternative Selectors

```javascript
// Simular que selector principal no existe:

// 1. Remover temporalmente data-tour-step:
const el = document.querySelector('[data-tour-step="guided-search"]');
if (el) el.removeAttribute('data-tour-step');

// 2. Iniciar tour:
guidedTour.request({ id: TourId.GuidedBooking, force: true });

// 3. Verificar console:
// "[StepResolver] Primary selector not found, trying alternatives..."
// "[StepResolver] Found element with alternative: #filters"

// 4. Restaurar:
if (el) el.setAttribute('data-tour-step', 'guided-search');
```

---

### Test 5: Analytics

```javascript
// Verificar que eventos incluyen analytics metadata:

// 1. Habilitar debug:
guidedTour.enableDebug();

// 2. Iniciar tour:
guidedTour.request({ id: TourId.GuidedBooking, force: true });

// 3. Completar un paso

// 4. Verificar console:
// [TourTelemetry] step_shown: {
//   tourId: 'guided-booking',
//   stepId: 'guided-select-car',
//   metadata: {
//     step_name: 'car_selection',
//     step_order: 2,
//     index: 1,
//     total: 10
//   }
// }

// 5. Ver historial completo:
guidedTour.getEventHistory()
```

---

## 📊 Comparación: Antes vs Ahora

| Feature | V1.0 (Básico) | V2.0 (Extendido) |
|---------|---------------|------------------|
| Pasos | 2 | 10 |
| Guards | 1 | 2 |
| Triggers | 0 | 1 |
| Hooks | 0 | 2 (onBefore/onAfter) |
| Responsive | ❌ | ✅ |
| Alt Selectors | ❌ | ✅ |
| Analytics | Básico | Avanzado |
| Version | 1.0.0 | 2.0.0 |

---

## 🎯 Próximos Pasos Opcionales

### 1. Personalizar Estilos de Shepherd

```css
/* apps/web/src/styles.css */

/* Custom theme */
.shepherd-theme-custom {
  --shepherd-color-primary: #007AFF;
  --shepherd-color-secondary: #6C757D;
}

.shepherd-element {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.shepherd-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

---

### 2. Agregar Animaciones Personalizadas

```typescript
// En step definition:
{
  id: 'guided-search',
  // ... other config
  onBefore: async () => {
    const element = document.querySelector('[data-tour-step="guided-search"]');
    if (element) {
      // Add pulse animation
      element.classList.add('tour-highlight-pulse');
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  onAfter: async () => {
    const element = document.querySelector('[data-tour-step="guided-search"]');
    if (element) {
      element.classList.remove('tour-highlight-pulse');
    }
  },
}
```

---

### 3. Tests E2E con Playwright

```typescript
// e2e/guided-booking-tour.spec.ts
import { test, expect } from '@playwright/test';

test('GuidedBooking tour completes successfully', async ({ page }) => {
  await page.goto('/cars');
  
  // Wait for tour to auto-start
  await page.waitForSelector('[data-shepherd-step]', { timeout: 5000 });
  
  // Step 1: Search
  await expect(page.locator('.shepherd-text')).toContainText('Buscar Autos');
  await page.click('button:has-text("Siguiente")');
  
  // Step 2: Select Car
  await expect(page.locator('.shepherd-text')).toContainText('Elegir un Auto');
  await page.click('button:has-text("Continuar")');
  
  // ... continue for all 10 steps
  
  // Final step
  await page.click('button:has-text("¡Entendido!")');
  
  // Verify completion
  const completed = await page.evaluate(() => {
    return localStorage.getItem('autorenta:tour:guided-booking') === 'completed';
  });
  expect(completed).toBe(true);
});
```

---

## ✅ Checklist de Implementación

### Código
- [x] GuidedBooking tour extendido a 10 pasos
- [x] Guards condicionales agregados
- [x] Triggers basados en rutas
- [x] Hooks onBefore/onAfter
- [x] Configuración responsive
- [x] Alternative selectors
- [x] Analytics metadata

### HTML Markers Pendientes
- [ ] `car-detail-gallery` en car-detail.page.html
- [ ] `booking-dates` en car-detail.page.html
- [ ] `price-breakdown` en car-detail.page.html
- [ ] `book-button` en car-detail.page.html
- [ ] `booking-summary` en booking-detail.page.html
- [ ] `booking-chat` en booking-detail.page.html
- [ ] `payment-section` en booking-detail.page.html

### Testing
- [ ] Verificar guards funcionan correctamente
- [ ] Probar hooks en cada paso
- [ ] Validar responsive en mobile
- [ ] Testing de alternative selectors
- [ ] Revisar analytics events
- [ ] E2E tests con Playwright (opcional)

---

## 📞 Ayuda Rápida

**Ver definición del tour:**
```typescript
const tourDef = tourRegistry.getDefinition(TourId.GuidedBooking);
console.log(tourDef);
```

**Forzar inicio ignorando guards:**
```typescript
guidedTour.request({ 
  id: TourId.GuidedBooking, 
  force: true 
});
```

**Debug hooks:**
```typescript
// Temporalmente agregar console.logs en tour-registry.service.ts
onBefore: async () => {
  console.log('🔵 BEFORE hook executing');
  // ... hook logic
},
```

---

✅ **Semana 3-4 - Tours Extendidos completados**

Ahora necesitas agregar los marcadores HTML faltantes en las páginas correspondientes.

