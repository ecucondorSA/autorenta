# Price Transparency Modal - Ejemplos de Uso

## 🎯 Propósito

Modal informativo estilo Airbnb que comunica al usuario que los precios mostrados incluyen **TODAS** las tarifas, sin sorpresas.

---

## 📦 Importación

```typescript
import { PriceTransparencyModalComponent } from '@/shared/components/price-transparency-modal/price-transparency-modal.component';

@Component({
  imports: [PriceTransparencyModalComponent],
  // ...
})
```

---

## 🚀 Uso Básico

### Opción 1: Mostrar al entrar al Marketplace

```typescript
// marketplace-v2.page.ts
import { Component, signal } from '@angular/core';
import { PriceTransparencyModalComponent } from '@/shared/components/price-transparency-modal/price-transparency-modal.component';

@Component({
  selector: 'app-marketplace-v2',
  standalone: true,
  imports: [CommonModule, PriceTransparencyModalComponent],
  template: `
    <!-- Tu contenido del marketplace -->
    <div class="marketplace-content">
      <!-- ... autos, filtros, etc ... -->
    </div>

    <!-- Modal de transparencia -->
    @if (showPriceModal()) {
      <app-price-transparency-modal
         (closed)="onPriceModalClose()"
      />
    }
  `,
})
export class MarketplaceV2Page {
  showPriceModal = signal(false);

  ngOnInit() {
    // Mostrar modal solo la primera vez (usando localStorage)
    const hasSeenPriceModal = localStorage.getItem('hasSeenPriceModal');

    if (!hasSeenPriceModal) {
      // Delay de 1 segundo para mejor UX
      setTimeout(() => {
        this.showPriceModal.set(true);
      }, 1000);
    }
  }

  onPriceModalClose() {
    this.showPriceModal.set(false);
    localStorage.setItem('hasSeenPriceModal', 'true');
  }
}
```

---

### Opción 2: Mostrar al hacer hover en precio

```typescript
// car-card.component.ts
@Component({
  template: `
    <div class="car-card">
      <!-- Precio con icono info -->
      <div class="flex items-center gap-2">
        <span class="h4">\${{ car.price }}</span>
        <button
          (click)="showPriceInfoModal.set(true)"
          class="text-cta-default hover:text-cta-hover"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Modal -->
    @if (showPriceInfoModal()) {
      <app-price-transparency-modal
         (closed)="showPriceInfoModal.set(false)"
      />
    }
  `,
})
export class CarCardComponent {
  showPriceInfoModal = signal(false);
}
```

---

### Opción 3: Botón informativo en filtros de precio

```typescript
// map-filters.component.ts
@Component({
  template: `
    <div class="filters">
      <!-- Filtro de precio -->
      <div class="price-filter">
        <label>Precio por día</label>
        <div class="flex items-center gap-2">
          <input type="range" [(ngModel)]="priceRange" />
          <button
            (click)="showPriceInfo.set(true)"
            class="text-xs text-cta-default underline"
          >
            ¿Qué incluye el precio?
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    @if (showPriceInfo()) {
      <app-price-transparency-modal
         (closed)="showPriceInfo.set(false)"
      />
    }
  `,
})
export class MapFiltersComponent {
  showPriceInfo = signal(false);
}
```

---

## 🎨 Personalización (Opcional)

Si necesitas cambiar el contenido del modal:

```typescript
// Crear variant para diferentes contextos
@Component({
  selector: 'app-price-transparency-modal',
  template: `
    <!-- ... mismo template ... -->
    <h2 class="h4 text-text-primary mb-4">
      {{ title() }}
    </h2>
    <p class="text-text-secondary text-base leading-relaxed">
      {{ description() }}
    </p>
  `,
})
export class PriceTransparencyModalComponent {
  // Inputs opcionales para personalizar
  title = input('El precio que ves incluye todo');
  description = input(
    'En AutoRenta, el precio que te mostramos para tu alquiler incluye todas las tarifas. Sin sorpresas al finalizar la reserva.'
  );
}
```

---

## 📊 Cuándo Mostrarlo

### ✅ Recomendado:
- **Primera visita al marketplace** (localStorage check)
- **Al hacer clic en "¿Qué incluye?"** junto al precio
- **Antes de iniciar booking** (opcional, si el usuario no lo vio antes)

### ❌ No recomendado:
- En cada carga de página (molesto)
- Durante el onboarding (ya tienen mucha info)
- En páginas que no muestran precios

---

## 🎯 Tracking de Analytics (Opcional)

```typescript
onPriceModalClose() {
  this.showPriceModal.set(false);
  localStorage.setItem('hasSeenPriceModal', 'true');

  // Track evento
  this.analyticsService.trackEvent('price_transparency_modal_viewed', {
    context: 'marketplace_first_visit',
    timestamp: new Date().toISOString(),
  });
}
```

---

## 🎨 Preview Visual

```
┌─────────────────────────────────────┐
│         [X]                         │
│                                     │
│     [🚗]  ← Auto icon               │
│       ✓  ← Checkmark badge          │
│                                     │
│   El precio que ves incluye todo   │
│                                     │
│   En AutoRenta, el precio que te   │
│   mostramos incluye todas las      │
│   tarifas. Sin sorpresas.          │
│                                     │
│   ✓ Precio del alquiler completo   │
│   ✓ Tarifas de servicio             │
│   ✓ Impuestos incluidos             │
│   ✓ Seguro básico (si aplica)       │
│                                     │
│   ┌─────────────────────┐          │
│   │    Entendido        │          │
│   └─────────────────────┘          │
│                                     │
│   Los extras opcionales se         │
│   cobran por separado              │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start

**Agregar al Marketplace en 3 pasos:**

1. **Importar** en `marketplace-v2.page.ts`:
```typescript
import { PriceTransparencyModalComponent } from '@/shared/components/price-transparency-modal/price-transparency-modal.component';
```

2. **Agregar al template**:
```html
@if (showPriceModal()) {
  <app-price-transparency-modal (closed)="onPriceModalClose()" />
}
```

3. **Configurar lógica**:
```typescript
showPriceModal = signal(false);

ngOnInit() {
  if (!localStorage.getItem('hasSeenPriceModal')) {
    setTimeout(() => this.showPriceModal.set(true), 1000);
  }
}

onPriceModalClose() {
  this.showPriceModal.set(false);
  localStorage.setItem('hasSeenPriceModal', 'true');
}
```

---

**¡Listo!** Modal de transparencia de precios estilo Airbnb adaptado para AutoRenta.
