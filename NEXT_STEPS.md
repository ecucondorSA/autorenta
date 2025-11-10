# Próximos Pasos - Marketplace Page Enhancement

## Estado Actual ✅

- ✅ FloatingActionFabComponent integrado
- ✅ PersonalizedLocationComponent integrado
- ✅ NotificationToastComponent integrado
- ✅ StatsStripComponent integrado
- ✅ InfoBannerComponent integrado
- ✅ AvailabilityAlertComponent integrado
- ✅ Servidor corriendo sin errores
- ✅ Build exitoso

## Tareas Pendientes

### 1. Mejorar CarsMapComponent con Clustering 🗺️

**Prioridad:** Alta
**Tiempo estimado:** 3-4 horas

**Objetivos:**
- Implementar Mapbox GL ClusterLayer para agrupar marcadores cercanos
- Mejorar performance cuando hay muchos autos en el mapa
- Mostrar contador de autos en cada cluster
- Zoom automático al hacer click en cluster

**Archivos a modificar:**
```
apps/web/src/app/shared/components/cars-map/
  ├── cars-map.component.ts      # Agregar lógica de clustering
  ├── cars-map.component.html    # (Sin cambios)
  └── cars-map.component.css     # Estilos para clusters
```

**Implementación:**

```typescript
// cars-map.component.ts - Agregar clustering
private setupClusterLayer(): void {
  if (!this.map) return;

  // Add source with clustering enabled
  this.map.addSource('cars-cluster', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: this.cars().map(car => ({
        type: 'Feature',
        properties: {
          carId: car.carId,
          price: car.pricePerDay,
        },
        geometry: {
          type: 'Point',
          coordinates: [car.lng, car.lat]
        }
      }))
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });

  // Cluster circle layer
  this.map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'cars-cluster',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#3A6D7C',  // < 10 cars
        10,
        '#2B5A67',  // 10-30 cars
        30,
        '#1C4752'   // > 30 cars
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,  // < 10 cars
        10,
        30,  // 10-30 cars
        30,
        40   // > 30 cars
      ]
    }
  });

  // Cluster count label
  this.map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'cars-cluster',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    }
  });

  // Individual car markers (unclustered points)
  this.map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'cars-cluster',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#3A6D7C',
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff'
    }
  });

  // Click handlers
  this.map.on('click', 'clusters', (e) => {
    const features = this.map!.queryRenderedFeatures(e.point, {
      layers: ['clusters']
    });
    const clusterId = features[0].properties.cluster_id;
    (this.map!.getSource('cars-cluster') as any).getClusterExpansionZoom(
      clusterId,
      (err: any, zoom: number) => {
        if (err) return;
        this.map!.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom
        });
      }
    );
  });

  this.map.on('click', 'unclustered-point', (e) => {
    const carId = e.features![0].properties.carId;
    this.carSelected.emit(carId);
  });
}
```

**Testing:**
```bash
# 1. Agregar 50+ autos de prueba
# 2. Verificar que se crean clusters
# 3. Verificar zoom al click en cluster
# 4. Verificar selección de auto individual
```

---

### 2. Crear BottomSheet para Mobile 📱

**Prioridad:** Alta
**Tiempo estimado:** 2-3 horas

**Objetivos:**
- Drawer deslizable desde abajo en mobile
- Drag handle visual
- 3 estados: peek (30%), half (60%), full (90%)
- Swipe down para cerrar
- Backdrop semi-transparente

**Crear nuevos archivos:**
```
apps/web/src/app/shared/components/bottom-sheet/
  ├── bottom-sheet.component.ts
  ├── bottom-sheet.component.html
  ├── bottom-sheet.component.css
  └── bottom-sheet.component.spec.ts
```

**Implementación:**

```typescript
// bottom-sheet.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type BottomSheetState = 'closed' | 'peek' | 'half' | 'full';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent implements OnInit, OnDestroy {
  @Input() initialState: BottomSheetState = 'peek';
  @Input() peekHeight = 30; // percentage
  @Input() halfHeight = 60; // percentage
  @Input() fullHeight = 90; // percentage
  @Input() showBackdrop = true;

  @Output() stateChange = new EventEmitter<BottomSheetState>();
  @Output() dismiss = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly currentState = signal<BottomSheetState>('closed');
  readonly isDragging = signal(false);

  private startY = 0;
  private currentY = 0;
  private sheetElement?: HTMLElement;

  readonly heightPercentage = computed(() => {
    switch (this.currentState()) {
      case 'peek':
        return this.peekHeight;
      case 'half':
        return this.halfHeight;
      case 'full':
        return this.fullHeight;
      default:
        return 0;
    }
  });

  ngOnInit(): void {
    if (this.isBrowser) {
      this.currentState.set(this.initialState);
    }
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  onDragHandleMouseDown(event: MouseEvent): void {
    this.startDrag(event.clientY);
  }

  onDragHandleTouchStart(event: TouchEvent): void {
    this.startDrag(event.touches[0].clientY);
  }

  private startDrag(y: number): void {
    this.isDragging.set(true);
    this.startY = y;
    this.currentY = y;
    this.addEventListeners();
  }

  private onMouseMove = (event: MouseEvent): void => {
    this.onDragMove(event.clientY);
  };

  private onTouchMove = (event: TouchEvent): void => {
    this.onDragMove(event.touches[0].clientY);
  };

  private onDragMove(y: number): void {
    if (!this.isDragging()) return;
    this.currentY = y;
    const deltaY = this.currentY - this.startY;

    // Apply transform based on drag distance
    if (this.sheetElement) {
      this.sheetElement.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
    }
  }

  private onMouseUp = (): void => {
    this.endDrag();
  };

  private onTouchEnd = (): void => {
    this.endDrag();
  };

  private endDrag(): void {
    if (!this.isDragging()) return;

    const deltaY = this.currentY - this.startY;
    const threshold = window.innerHeight * 0.1; // 10% threshold

    // Determine new state based on drag direction and distance
    if (deltaY > threshold) {
      // Dragged down
      this.snapToNextLowerState();
    } else if (deltaY < -threshold) {
      // Dragged up
      this.snapToNextHigherState();
    } else {
      // Return to current state
      this.snapToState(this.currentState());
    }

    this.isDragging.set(false);
    this.removeEventListeners();

    // Reset transform
    if (this.sheetElement) {
      this.sheetElement.style.transform = '';
    }
  }

  private snapToNextLowerState(): void {
    const current = this.currentState();
    if (current === 'full') {
      this.snapToState('half');
    } else if (current === 'half') {
      this.snapToState('peek');
    } else if (current === 'peek') {
      this.snapToState('closed');
      this.dismiss.emit();
    }
  }

  private snapToNextHigherState(): void {
    const current = this.currentState();
    if (current === 'peek') {
      this.snapToState('half');
    } else if (current === 'half') {
      this.snapToState('full');
    }
  }

  private snapToState(state: BottomSheetState): void {
    this.currentState.set(state);
    this.stateChange.emit(state);
  }

  private addEventListeners(): void {
    if (!this.isBrowser) return;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('touchmove', this.onTouchMove);
    document.addEventListener('touchend', this.onTouchEnd);
  }

  private removeEventListeners(): void {
    if (!this.isBrowser) return;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  }

  onBackdropClick(): void {
    if (this.showBackdrop) {
      this.snapToState('closed');
      this.dismiss.emit();
    }
  }
}
```

```html
<!-- bottom-sheet.component.html -->
<div
  *ngIf="currentState() !== 'closed'"
  class="bottom-sheet-container fixed inset-0 z-50"
>
  <!-- Backdrop -->
  <div
    *ngIf="showBackdrop"
    class="backdrop fixed inset-0 bg-black transition-opacity duration-300"
    [class.opacity-50]="currentState() === 'full'"
    [class.opacity-30]="currentState() === 'half'"
    [class.opacity-10]="currentState() === 'peek'"
    (click)="onBackdropClick()"
  ></div>

  <!-- Sheet -->
  <div
    #sheet
    class="bottom-sheet fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-deep rounded-t-2xl shadow-2xl transition-all duration-300 ease-out"
    [style.height.vh]="heightPercentage()"
    [class.dragging]="isDragging()"
  >
    <!-- Drag Handle -->
    <div
      class="drag-handle-area flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
      (mousedown)="onDragHandleMouseDown($event)"
      (touchstart)="onDragHandleTouchStart($event)"
    >
      <div class="drag-handle w-12 h-1.5 bg-charcoal-light dark:bg-pearl-light/30 rounded-full"></div>
    </div>

    <!-- Content -->
    <div class="sheet-content overflow-y-auto h-[calc(100%-3rem)] px-4 pb-4">
      <ng-content></ng-content>
    </div>
  </div>
</div>
```

```css
/* bottom-sheet.component.css */
.bottom-sheet {
  will-change: transform, height;
}

.bottom-sheet.dragging {
  transition: none;
}

.drag-handle-area {
  touch-action: none;
}

/* Prevent body scroll when sheet is open */
:host-context(body.bottom-sheet-open) {
  overflow: hidden;
}
```

**Uso en marketplace.page.html:**
```html
<!-- Reemplazar drawer actual con BottomSheet en mobile -->
<app-bottom-sheet
  *ngIf="isMobile()"
  [initialState]="drawerOpen() ? 'half' : 'closed'"
  [peekHeight]="30"
  [halfHeight]="60"
  [fullHeight]="90"
  (stateChange)="onBottomSheetStateChange($event)"
  (dismiss)="onDrawerClose()"
>
  <!-- Car cards content aquí -->
  <div *ngFor="let car of carsWithDistance(); trackBy: trackByCarId">
    <app-car-card [car]="car" [selected]="selectedCarId() === car.id" />
  </div>
</app-bottom-sheet>
```

---

### 3. Mejorar StepperModal para Reserva Rápida 🚀

**Prioridad:** Media
**Tiempo estimado:** 2 horas

**Estado actual:** Ya existe en `stepper-modal.component.ts` pero necesita mejoras

**Mejoras necesarias:**
- ✅ Validación mejorada en cada paso
- ✅ Animaciones entre pasos
- ✅ Progress bar mejorado
- ✅ Integración con LocationService para pickup
- ✅ Integración con PaymentsService
- ✅ Confirmación visual final

**Archivos a modificar:**
```
apps/web/src/app/shared/components/stepper-modal/
  ├── stepper-modal.component.ts      # Mejorar validaciones
  ├── stepper-modal.component.html    # Mejorar UI
  └── stepper-modal.component.css     # Agregar animaciones
```

**Mejoras a implementar:**

```typescript
// stepper-modal.component.ts - Agregar validaciones avanzadas

readonly step1Validation = computed(() => {
  const data = this.step1Data();
  return {
    nameValid: data.name.length >= 3,
    licenseValid: /^[A-Z0-9]{6,10}$/.test(data.license),
    isValid: data.name.length >= 3 && /^[A-Z0-9]{6,10}$/.test(data.license)
  };
});

readonly step2Validation = computed(() => {
  const data = this.step2Data();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return {
    datesValid: data.startDate >= now && data.endDate > data.startDate,
    durationValid: this.calculateDays() >= 1 && this.calculateDays() <= 90,
    pickupModeValid: !!data.pickupMode,
    isValid:
      data.startDate >= now &&
      data.endDate > data.startDate &&
      this.calculateDays() >= 1 &&
      this.calculateDays() <= 90 &&
      !!data.pickupMode
  };
});

private calculateDays(): number {
  const data = this.step2Data();
  return Math.ceil(
    (data.endDate.getTime() - data.startDate.getTime()) / (24 * 60 * 60 * 1000)
  );
}

// Agregar animaciones de transición
readonly stepTransition = signal<'forward' | 'backward' | 'none'>('none');

onStep1Next(): void {
  if (this.step1Validation().isValid) {
    this.stepTransition.set('forward');
    setTimeout(() => {
      this.currentStep.set(2);
      this.stepTransition.set('none');
    }, 200);
  }
}
```

```css
/* stepper-modal.component.css - Agregar animaciones */

.step-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-content.backward {
  animation: fadeInBackward 0.3s ease-in-out;
}

@keyframes fadeInBackward {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Validación visual */
.form-input.invalid {
  border-color: #ef4444;
}

.form-input.valid {
  border-color: #10b981;
}

.validation-message {
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.validation-message.error {
  color: #ef4444;
}

.validation-message.success {
  color: #10b981;
}
```

---

### 4. Crear Componentes de Confianza y Conversión 🎯

**Prioridad:** Media-Baja
**Tiempo estimado:** 3-4 horas

**Componentes a crear:**

#### 4.1 TrustBadgesComponent
```
apps/web/src/app/shared/components/trust-badges/
  ├── trust-badges.component.ts
  ├── trust-badges.component.html
  └── trust-badges.component.css
```

**Features:**
- ✓ Verificación de identidad
- ✓ Pago seguro
- ✓ Seguro incluido
- ✓ Cancelación gratis
- ✓ Soporte 24/7

#### 4.2 SocialProofStreamComponent
```
apps/web/src/app/shared/components/social-proof-stream/
  ├── social-proof-stream.component.ts
  ├── social-proof-stream.component.html
  └── social-proof-stream.component.css
```

**Features:**
- Notificaciones en tiempo real de reservas
- "Juan reservó un auto hace 5 minutos"
- Animación de entrada/salida
- Máximo 1 notificación cada 30 segundos

#### 4.3 UrgencyIndicatorComponent
```
apps/web/src/app/shared/components/urgency-indicator/
  ├── urgency-indicator.component.ts
  ├── urgency-indicator.component.html
  └── urgency-indicator.component.css
```

**Features:**
- "Solo quedan 2 autos disponibles"
- "12 personas viendo este auto"
- Countdown timer para ofertas limitadas

#### 4.4 PriceComparisonTooltipComponent
```
apps/web/src/app/shared/components/price-comparison-tooltip/
  ├── price-comparison-tooltip.component.ts
  ├── price-comparison-tooltip.component.html
  └── price-comparison-tooltip.component.css
```

**Features:**
- Comparación con precio promedio del mercado
- "35% más barato que competidores"
- Breakdown de precio (base + extras)

---

## Orden de Implementación Recomendado

### Sprint 1: Performance & UX Mobile (Semana 1)
1. ✅ **Día 1-2**: CarsMapComponent con clustering
2. ✅ **Día 3-4**: BottomSheet para mobile
3. ✅ **Día 5**: Testing e integración

### Sprint 2: Conversión (Semana 2)
1. ✅ **Día 1-2**: Mejorar StepperModal
2. ✅ **Día 3**: TrustBadgesComponent
3. ✅ **Día 4**: SocialProofStreamComponent
4. ✅ **Día 5**: UrgencyIndicatorComponent y PriceComparisonTooltipComponent

---

## Testing Checklist

### CarsMapComponent Clustering
- [ ] Clusters se forman correctamente con 10+ autos
- [ ] Zoom funciona al click en cluster
- [ ] Autos individuales son seleccionables
- [ ] Performance es fluida con 100+ autos
- [ ] Colores cambian según cantidad en cluster

### BottomSheet Mobile
- [ ] Drag funciona suavemente
- [ ] 3 estados (peek/half/full) funcionan
- [ ] Swipe down cierra el sheet
- [ ] Backdrop funciona correctamente
- [ ] No hay scroll issues en body

### StepperModal
- [ ] Validaciones funcionan en tiempo real
- [ ] No se puede avanzar con datos inválidos
- [ ] Animaciones son suaves
- [ ] Precio total se calcula correctamente
- [ ] Confirmación final funciona

### Componentes de Conversión
- [ ] TrustBadges son visibles y claros
- [ ] SocialProofStream no es molesto
- [ ] UrgencyIndicator muestra datos reales
- [ ] PriceComparison es preciso

---

## Métricas de Éxito

### Performance
- [ ] Map render < 1s con 100 autos
- [ ] BottomSheet drag < 16ms (60fps)
- [ ] StepperModal transition < 300ms

### Conversión
- [ ] Tasa de completación de reserva > 60%
- [ ] Tiempo promedio de reserva < 3 min
- [ ] Bounce rate en mobile < 40%

### UX
- [ ] Mobile usability score > 90
- [ ] Accesibilidad WCAG AA
- [ ] Lighthouse performance > 85

---

## Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Tests específicos
npm run test -- --include="**/bottom-sheet.component.spec.ts"
npm run test -- --include="**/cars-map.component.spec.ts"

# Build de producción
npm run build

# Análisis de bundle
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

---

## Referencias y Documentación

- [Mapbox GL Clustering](https://docs.mapbox.com/mapbox-gl-js/example/cluster/)
- [Angular Drag & Drop](https://material.angular.io/cdk/drag-drop/overview)
- [Conversion Optimization Best Practices](https://cxl.com/blog/conversion-optimization/)
- [Mobile UX Patterns](https://mobbin.com/browse/ios/apps)

---

**Última actualización:** 2025-11-08
**Próxima revisión:** Después de completar Sprint 1
