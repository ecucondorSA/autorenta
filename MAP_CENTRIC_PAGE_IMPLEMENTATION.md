# Implementación de Página Map-Centric - AutoRenta

## Resumen de Componentes Creados

### ✅ Componentes Completados

1. **MapCardTooltipComponent** (`apps/web/src/app/shared/components/map-card-tooltip/`)
   - Tooltip personalizado para markers del mapa
   - Muestra foto, precio dinámico, distancia, badges de confianza
   - CTA "Ver detalles rápidos"
   - Delay de 150ms para hover
   - Integrado con `DistanceBadgeComponent` y `MoneyPipe`

2. **MapFiltersComponent** (`apps/web/src/app/shared/components/map-filters/`)
   - Panel flotante de filtros contextuales
   - Filtros: fechas, rango de precio, transmisión, disponibilidad inmediata
   - Chips de filtros activos con contador
   - Botón "Limpiar todo"
   - Feedback visual inmediato con `priceRangeText`

## Próximos Pasos de Implementación

### 1. Modificar `cars-map.component.ts`

El componente necesita integrar:
- Estilo de mapa neutro (`mapbox://styles/mapbox/light-v11`)
- Tooltips personalizados usando `MapCardTooltipComponent`
- Agrupación de markers por disponibilidad y precio
- Marker personalizado para ubicación del usuario (círculo doble + halo)
- Overlay para "autos con respuesta inmediata"

**Ejemplo de integración de tooltip:**

```typescript
import { MapCardTooltipComponent } from '../map-card-tooltip/map-card-tooltip.component';

// En el método que crea markers:
private createCustomMarker(car: CarMapLocation): mapboxgl.Marker {
  const tooltipElement = document.createElement('div');
  const tooltipRef = this.createComponentRef(MapCardTooltipComponent);
  
  // Configurar tooltip
  tooltipRef.setInput('car', car);
  tooltipRef.setInput('userLocation', this.userLocation());
  tooltipRef.setInput('onViewDetailsClick', (carId: string) => {
    this.carSelected.emit(carId);
  });
  
  // Montar componente Angular en el elemento
  this.applicationRef.attachView(tooltipRef.hostView);
  tooltipElement.appendChild(tooltipRef.location.nativeElement);
  
  // Crear popup Mapbox con delay
  const popup = new mapboxgl.Popup({
    offset: 25,
    closeButton: false,
    closeOnClick: false,
  }).setDOMContent(tooltipElement);
  
  // Crear marker con popup
  const marker = new mapboxgl.Marker({
    element: this.createMarkerElement(car),
  })
    .setLngLat([car.lng, car.lat])
    .setPopup(popup);
  
  // Delay de 150ms para mostrar tooltip
  let hoverTimeout: ReturnType<typeof setTimeout>;
  marker.getElement().addEventListener('mouseenter', () => {
    hoverTimeout = setTimeout(() => {
      popup.addTo(this.map!);
    }, 150);
  });
  
  marker.getElement().addEventListener('mouseleave', () => {
    clearTimeout(hoverTimeout);
    popup.remove();
  });
  
  return marker;
}
```

### 2. Crear Drawer Lateral (70/30 split desktop, tabs mobile)

**Archivo:** `apps/web/src/app/shared/components/cars-drawer/cars-drawer.component.ts`

```typescript
@Component({
  selector: 'app-cars-drawer',
  standalone: true,
  imports: [CommonModule, CarCardComponent, SocialProofIndicatorsComponent, ReviewSummaryComponent],
  template: `
    <div class="cars-drawer" [class.cars-drawer--open]="isOpen()">
      <!-- Header con CTA -->
      <div class="drawer-header">
        <h2>Autos disponibles</h2>
        <button (click)="onClose()">Cerrar</button>
      </div>
      
      <!-- Lista de autos -->
      <div class="drawer-content">
        <ng-container *ngFor="let car of cars(); trackBy: trackByCarId">
          <app-car-card
            [car]="car"
            [selected]="selectedCarId() === car.id"
            [distance]="car.distanceText"
            (click)="onCarSelected(car.id)"
          />
          <app-social-proof-indicators [car]="car" />
        </ng-container>
      </div>
      
      <!-- CTA sticky en desktop -->
      <div class="drawer-footer">
        <app-sticky-cta-mobile
          [pricePerDay]="selectedCarPrice()"
          [ctaText]="'Reservar sin tarjeta'"
          (ctaClick)="onReserveClick()"
        />
      </div>
    </div>
  `,
  styles: [`
    .cars-drawer {
      position: fixed;
      top: 0;
      right: -100%;
      width: 30%;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
      transition: right 0.3s ease;
      z-index: 1000;
    }
    
    .cars-drawer--open {
      right: 0;
    }
    
    @media (max-width: 1024px) {
      .cars-drawer {
        width: 100%;
        bottom: 0;
        top: auto;
        height: 60vh;
        right: 0;
        transform: translateY(100%);
      }
      
      .cars-drawer--open {
        transform: translateY(0);
      }
    }
  `]
})
export class CarsDrawerComponent {
  // Implementation
}
```

### 3. Modificar `cars-list.page.ts` y `cars-list.page.html`

**Cambios necesarios:**

1. **Layout 70/30 split:**
```html
<section class="cars-map-page">
  <!-- Barra superior fija -->
  <app-pwa-titlebar />
  
  <!-- Región principal split -->
  <div class="map-page-layout">
    <!-- Mapa 70% -->
    <div class="map-section">
      <app-cars-map
        [cars]="carMapLocations()"
        [selectedCarId]="selectedCarId()"
        (carSelected)="onMapCarSelected($event)"
      />
      
      <!-- Filtros flotantes sobre el mapa -->
      <div class="map-filters-overlay">
        <app-map-filters
          [filters]="mapFilters()"
          (filtersChange)="onFiltersChange($event)"
        />
      </div>
    </div>
    
    <!-- Drawer 30% (desktop) / Tabs (mobile) -->
    <app-cars-drawer
      [cars]="filteredCars()"
      [selectedCarId]="selectedCarId()"
      [isOpen]="drawerOpen()"
      (carSelected)="onCarSelected($event)"
      (close)="drawerOpen.set(false)"
    />
  </div>
  
  <!-- Sticky CTA Mobile -->
  <app-sticky-cta-mobile
    *ngIf="selectedCarId()"
    [pricePerDay]="selectedCarPrice()"
    [ctaText]="'Rentar ahora'"
    (ctaClick)="onReserveClick()"
  />
  
  <!-- WhatsApp FAB -->
  <app-whatsapp-fab />
  
  <!-- Mobile Bottom Nav -->
  <app-mobile-bottom-nav />
</section>
```

2. **Agregar signals para filtros:**
```typescript
readonly mapFilters = signal<MapFilters>({
  dateRange: { from: null, to: null },
  minPrice: null,
  maxPrice: null,
  transmission: null,
  immediateAvailability: false,
});

readonly drawerOpen = signal(false);

onFiltersChange(filters: MapFilters): void {
  this.mapFilters.set(filters);
  // Aplicar filtros y recargar autos
  void this.loadCars();
}
```

### 4. Integrar Geolocalización con Marker Personalizado

**En `cars-map.component.ts`:**

```typescript
private addUserLocationMarker(location: { lat: number; lng: number }): void {
  const el = document.createElement('div');
  el.className = 'user-location-marker';
  el.innerHTML = `
    <div class="user-marker-circle"></div>
    <div class="user-marker-halo"></div>
  `;
  
  const marker = new mapboxgl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([location.lng, location.lat])
    .addTo(this.map!);
  
  // Mensaje contextual
  const popup = new mapboxgl.Popup({ offset: 25 })
    .setHTML(`
      <div class="user-location-popup">
        <p class="font-semibold">Estás aquí</p>
        <p class="text-sm text-gray-600">Verifica autos cerca</p>
      </div>
    `);
  
  marker.setPopup(popup);
  marker.togglePopup();
}
```

**CSS para marker personalizado:**

```css
.user-location-marker {
  position: relative;
  width: 20px;
  height: 20px;
}

.user-marker-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2c7a7b;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  position: relative;
  z-index: 2;
}

.user-marker-halo {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(44, 122, 123, 0.2);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 0.3; }
}
```

### 5. Integrar Wallet y Payment Methods

**En el drawer o modal de reserva:**

```html
<!-- Mostrar wallet balance card -->
<app-wallet-balance-card />

<!-- Métodos de pago destacando "sin tarjeta obligatoria" -->
<app-payment-method-buttons
  [rentalAmount]="totalPrice()"
  [depositAmount]="depositAmount()"
  (methodSelected)="onPaymentMethodSelected($event)"
/>

<!-- Mensaje destacado -->
<div class="payment-message">
  <p class="font-semibold">💳 Sin tarjeta obligatoria</p>
  <p class="text-sm">Paga con saldo, transferencia o efectivo</p>
</div>
```

### 6. Integrar Urgent Rental Banner

**En `cars-list.page.html`:**

```html
<app-urgent-rental-banner
  *ngIf="selectedCarId() && urgentAvailability()"
  [carId]="selectedCarId()!"
  [available]="urgentAvailability()!.available"
  [distance]="urgentAvailability()!.distance"
  [eta]="urgentAvailability()!.eta"
/>
```

## Estilos Necesarios

### Paleta de Colores (Neutro + Acentos)

```css
:root {
  /* Base gris cálido */
  --color-base-50: #faf9f7;
  --color-base-100: #f5f3f0;
  --color-base-200: #e8e6e1;
  --color-base-300: #d4d1ca;
  
  /* Acentos azul petróleo (solo para estados activos/CTA) */
  --color-accent-petrol: #2c7a7b;
  --color-accent-petrol-light: #4a9fa0;
  --color-accent-petrol-dark: #1a5a5b;
  
  /* Estados */
  --color-active: var(--color-accent-petrol);
  --color-hover: var(--color-accent-petrol-light);
}
```

### Layout Responsive

```css
.map-page-layout {
  display: flex;
  height: calc(100vh - 60px); /* Restar altura de titlebar */
}

.map-section {
  flex: 0 0 70%;
  position: relative;
}

@media (max-width: 1024px) {
  .map-page-layout {
    flex-direction: column;
  }
  
  .map-section {
    flex: 1 1 auto;
    height: 40vh;
  }
}
```

## Checklist de Implementación

- [x] MapCardTooltipComponent creado
- [x] MapFiltersComponent creado
- [ ] Modificar cars-map.component para integrar tooltips
- [ ] Crear CarsDrawerComponent
- [ ] Modificar cars-list.page con layout 70/30
- [ ] Integrar geolocalización con marker personalizado
- [ ] Integrar wallet-balance-card y payment-method-buttons
- [ ] Integrar urgent-rental-banner
- [ ] Integrar sticky-cta-mobile
- [ ] Agregar estilos neutros (gris cálido + acentos azul petróleo)
- [ ] Testing en desktop y mobile

## Notas Importantes

1. **Tooltip Delay**: Implementar delay de 150ms antes de mostrar tooltip para evitar spam visual
2. **Mapbox Style**: Usar `mapbox://styles/mapbox/light-v11` para estilo neutro
3. **Mobile First**: Drawer se convierte en tabs en mobile (< 1024px)
4. **P2P Messaging**: Integrar `booking-chat` accesible desde tooltip y card
5. **Social Proof**: Mostrar `social-proof-indicators` bajo cada auto en el drawer
6. **Payment Flow**: Destacar opciones "sin tarjeta" antes que tarjeta en el selector

## Referencias

- Componentes existentes: `car-card`, `sticky-cta-mobile`, `wallet-balance-card`, `payment-method-buttons`
- Servicios: `DynamicPricingService`, `UrgentRentalService`, `WalletService`
- Tipos: `CarMapLocation` en `car-locations.service.ts`



