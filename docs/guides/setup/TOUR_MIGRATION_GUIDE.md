# Migration Guide: Old TourService → New GuidedTour System

## Overview

This guide helps you migrate from the monolithic `TourService` to the new modular `GuidedTour` system.

## Phase 1: Setup (Week 1)

### 1.1 Install New System

The new system is already created in:
```
apps/web/src/app/core/guided-tour/
```

### 1.2 Update Imports in AppComponent

**Before:**
```typescript
// apps/web/src/app/app.component.ts
import { TourService } from './core/services/tour.service';

export class AppComponent implements OnInit {
  private tourService = inject(TourService);

  ngOnInit() {
    this.initializeWelcomeTour();
  }

  private initializeWelcomeTour() {
    // Auto-start logic
    setTimeout(() => {
      this.tourService.startWelcomeTour();
    }, 1000);
  }
}
```

**After:**
```typescript
// apps/web/src/app/app.component.ts
import { GuidedTourService } from './core/guided-tour';

export class AppComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    // Auto-start tours are handled automatically by TourOrchestrator
    // No manual initialization needed!
    
    // Optional: Enable debug mode in development
    if (!environment.production) {
      this.guidedTour.enableDebug();
    }
  }
}
```

### 1.3 Update HelpButtonComponent

**Before:**
```typescript
// apps/web/src/app/shared/components/help-button/help-button.component.ts
import { TourService, TourId } from '@core/services/tour.service';

export class HelpButtonComponent {
  private tourService = inject(TourService);
  availableTours = this.tourService.getAvailableTours();

  startTour(tourId: TourId) {
    switch (tourId) {
      case TourId.Welcome:
        this.tourService.startWelcomeTour();
        break;
      case TourId.GuidedBooking:
        this.tourService.startGuidedBookingTour();
        break;
      // ... etc
    }
  }
}
```

**After:**
```typescript
// apps/web/src/app/shared/components/help-button/help-button.component.ts
import { GuidedTourService, TourId } from '@core/guided-tour';

export class HelpButtonComponent {
  private guidedTour = inject(GuidedTourService);
  availableTours = this.guidedTour.getAvailableTours();

  startTour(tourId: TourId) {
    this.guidedTour.request({ 
      id: tourId, 
      mode: 'user-triggered' 
    });
  }
}
```

### 1.4 Update CarsListPage

**Before:**
```typescript
// apps/web/src/app/features/cars/list/cars-list.page.ts
import { TourService } from '@core/services/tour.service';

export class CarsListPage implements OnInit {
  private tourService = inject(TourService);

  ngOnInit() {
    this.loadCars();
    
    // Start tour after data loads
    setTimeout(() => {
      this.tourService.startGuidedBookingTour();
    }, 2000);
  }

  private loadCars() {
    // Load premium and economy cars
    this.premiumCars$ = this.carsService.getPremiumCars();
    this.economyCars$ = this.carsService.getEconomyCars();
  }
}
```

**After:**
```typescript
// apps/web/src/app/features/cars/list/cars-list.page.ts
import { GuidedTourService, TourId } from '@core/guided-tour';

export class CarsListPage implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    this.loadCars();
  }

  private async loadCars() {
    // Load premium and economy cars
    this.premiumCars$ = this.carsService.getPremiumCars();
    this.economyCars$ = this.carsService.getEconomyCars();

    // Wait for data to be ready
    await firstValueFrom(
      combineLatest([this.premiumCars$, this.economyCars$])
    );

    // Emit custom event for tour system
    this.emitInventoryReady();
  }

  private emitInventoryReady() {
    // Tours with guards listening for inventory will now start
    window.dispatchEvent(new CustomEvent('inventory-ready'));
  }
}
```

## Phase 2: Update Tour Definitions (Week 2)

### 2.1 Move Welcome Tour to Registry

The Welcome tour is **already migrated** in `TourRegistryService`.

### 2.2 Migrate GuidedBooking Tour

Update the tour definition in `tour-registry.service.ts`:

```typescript
// Add more steps to GuidedBooking tour
private loadDefaultTours() {
  // ... existing tours ...

  this.register({
    id: TourId.GuidedBooking,
    name: 'Cómo Reservar un Auto',
    priority: TourPriority.Normal,
    throttleHours: 72,
    guards: [
      {
        name: 'hasInventory',
        check: () => {
          return new Promise((resolve) => {
            // Wait for inventory-ready event
            const handler = () => {
              window.removeEventListener('inventory-ready', handler);
              resolve(true);
            };
            window.addEventListener('inventory-ready', handler);
            
            // Timeout after 5 seconds
            setTimeout(() => {
              window.removeEventListener('inventory-ready', handler);
              resolve(false);
            }, 5000);
          });
        },
      },
    ],
    triggers: [
      {
        type: 'route',
        routePattern: /^\/cars$/,
      },
    ],
    steps: [
      // All 10 steps from original GuidedBookingStep enum
      {
        id: 'guided-search',
        content: {
          title: 'Paso 1: Buscar',
          text: 'Ingresa tu ubicación y fechas para encontrar autos disponibles.',
        },
        position: 'right',
        target: {
          selector: '[data-tour-step="guided-search"]',
          required: true,
        },
      },
      {
        id: 'guided-select-car',
        content: {
          title: 'Paso 2: Seleccionar Auto',
          text: 'Explora los autos disponibles y haz clic en el que te interese.',
        },
        position: 'top',
        target: {
          selector: '[data-tour-step="guided-select-car"]',
          required: true,
        },
      },
      // ... add remaining 8 steps
    ],
  });
}
```

### 2.3 Add data-tour-step Attributes to HTML

Update templates to include tour markers:

```html
<!-- cars-list.page.html -->
<div class="search-bar" data-tour-step="guided-search">
  <!-- Search form -->
</div>

<div class="car-card" 
     data-tour-step="guided-select-car"
     *ngFor="let car of premiumCars$ | async">
  <!-- Car details -->
</div>

<!-- car-detail.page.html -->
<div class="price-section" data-tour-step="guided-price">
  <!-- Price breakdown -->
</div>

<button class="book-button" data-tour-step="guided-book-button">
  Reservar Ahora
</button>
```

## Phase 3: Testing (Week 3)

### 3.1 Manual Testing Checklist

- [ ] Welcome tour starts on homepage (first visit)
- [ ] Welcome tour doesn't repeat after completion
- [ ] Help button shows available tours
- [ ] Tours can be dismissed and resume after throttle period
- [ ] Mobile responsive: tours adapt to small screens
- [ ] No console errors during tours
- [ ] Analytics events are tracked

### 3.2 Automated Tests

```typescript
// guided-tour-e2e.spec.ts
describe('Guided Tours E2E', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
  });

  it('should show welcome tour on first visit', () => {
    cy.get('[data-shepherd-step]').should('be.visible');
    cy.contains('¡Bienvenido a AutoRenta!').should('exist');
  });

  it('should not show tour if already completed', () => {
    localStorage.setItem('autorenta:tour:welcome', 'completed');
    cy.visit('/');
    cy.get('[data-shepherd-step]').should('not.exist');
  });

  it('should allow tour restart from help button', () => {
    localStorage.setItem('autorenta:tour:welcome', 'completed');
    cy.get('[data-tour-step="welcome-help"]').click();
    cy.contains('Tour de Bienvenida').click();
    cy.get('[data-shepherd-step]').should('be.visible');
  });
});
```

## Phase 4: Cleanup (Week 4)

### 4.1 Deprecate Old TourService

Add deprecation notice:

```typescript
// tour.service.ts
/**
 * @deprecated Use GuidedTourService instead
 * This service will be removed in v2.0.0
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  // ... existing code
}
```

### 4.2 Create Compatibility Layer (Optional)

For gradual migration:

```typescript
// tour.service.ts
import { GuidedTourService, TourId } from '@core/guided-tour';

@Injectable({ providedIn: 'root' })
export class TourService {
  private guidedTour = inject(GuidedTourService);

  /** @deprecated */
  startWelcomeTour(): void {
    console.warn('TourService is deprecated. Use GuidedTourService instead.');
    this.guidedTour.startWelcomeTour();
  }

  /** @deprecated */
  startGuidedBookingTour(): void {
    console.warn('TourService is deprecated. Use GuidedTourService instead.');
    this.guidedTour.startGuidedBookingTour();
  }

  // ... proxy other methods
}
```

### 4.3 Update Documentation

Update internal docs to reference new system:

```markdown
## Tours System

We use `GuidedTourService` for all product tours.

See: `apps/web/src/app/core/guided-tour/README.md`
```

### 4.4 Remove Old Service (After Full Migration)

```bash
# Delete old service file
rm apps/web/src/app/core/services/tour.service.ts
rm apps/web/src/app/core/services/tour.service.spec.ts

# Update imports across codebase
# Use IDE refactoring: Find & Replace
# Old: import { TourService } from '@core/services/tour.service'
# New: import { GuidedTourService } from '@core/guided-tour'
```

## Rollback Plan

If issues arise, you can quickly rollback:

1. Keep old `TourService` file (don't delete immediately)
2. Revert imports in components
3. Redeploy previous version

## Benefits After Migration

✅ **Reduced errors**: No more "Timeout waiting for selector" exceptions  
✅ **Better UX**: Tours adapt to responsive layouts  
✅ **Easier maintenance**: Tours defined as data, not code  
✅ **Better analytics**: All tour events tracked automatically  
✅ **Testability**: Mock-friendly architecture  
✅ **Scalability**: Easy to add new tours via registry  

## Support

Questions? Contact the dev team or check the docs:
- Main docs: `guided-tour/README.md`
- Architecture: `TOUR_GUIADO_REWRITE.md`
