# 🧭 Guided Tour System - Documentation

## Overview

A modular, event-driven system for creating interactive product tours in Angular applications.

## Architecture

```
guided-tour/
├── interfaces/           # TypeScript interfaces and types
│   └── tour-definition.interface.ts
├── services/            # Core business logic
│   ├── tour-orchestrator.service.ts  # Main coordinator
│   └── telemetry-bridge.service.ts   # Analytics integration
├── adapters/            # Library adapters (Shepherd.js)
│   └── shepherd-adapter.service.ts
├── resolvers/           # DOM element resolution
│   └── step-resolver.service.ts
├── registry/            # Tour definitions storage
│   └── tour-registry.service.ts
├── guided-tour.service.ts  # Public API
└── index.ts             # Barrel exports
```

## Key Features

### ✅ Separation of Concerns
- **TourRegistry**: Stores tour definitions
- **TourOrchestrator**: Manages tour lifecycle, queue, and state
- **StepResolver**: Handles DOM element detection with MutationObserver
- **ShepherdAdapter**: Wraps Shepherd.js for easy replacement
- **TelemetryBridge**: Centralized analytics tracking

### ✅ Reactive State Management
Uses Angular Signals for reactive state updates:
```typescript
const state = guidedTour.getState();
// Returns: { activeTourId, currentStepIndex, isRunning, isPaused, completedTours }
```

### ✅ Declarative Configuration
Tours are defined as data objects:
```typescript
const tourDef: TourDefinition = {
  id: TourId.Welcome,
  name: 'Welcome Tour',
  autoStart: true,
  throttleHours: 168,
  steps: [/* ... */],
  guards: [/* ... */],
};
```

### ✅ Intelligent Element Waiting
No more blind timeouts! Uses:
- **MutationObserver** for DOM changes
- **Fallback selectors** for responsive layouts
- **Configurable timeouts** with retry strategies

### ✅ Tour Queue & Priority
Multiple tour requests are queued and processed by priority:
```typescript
enum TourPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3,
}
```

### ✅ Responsive Support
Define different configurations per breakpoint:
```typescript
{
  id: 'my-step',
  content: { text: 'Hello' },
  responsive: {
    desktop: { position: 'right', target: { selector: '.desktop-btn' } },
    mobile: { position: 'bottom', target: { selector: '.mobile-btn' } },
  }
}
```

### ✅ Analytics Integration
All tour events are tracked automatically:
- `tour_started`
- `tour_step_shown`
- `tour_step_completed`
- `tour_completed`
- `tour_cancelled`
- `tour_error`

## Usage

### Basic Usage

```typescript
import { Component, inject } from '@angular/core';
import { GuidedTourService, TourId } from '@core/guided-tour';

@Component({
  selector: 'app-my-component',
  template: `
    <button (click)="startTour()">Start Tour</button>
  `
})
export class MyComponent {
  private guidedTour = inject(GuidedTourService);

  startTour() {
    this.guidedTour.request({ 
      id: TourId.Welcome,
      mode: 'user-triggered' 
    });
  }
}
```

### In AppComponent (Auto-start)

```typescript
@Component({
  selector: 'app-root',
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    // Tours with autoStart: true will start automatically
    // No manual call needed!
  }
}
```

### In HelpButton Component

```typescript
@Component({
  selector: 'app-help-button',
  template: `
    <button (click)="showHelp()">
      <ion-icon name="help-circle"></ion-icon>
    </button>
    <ion-popover [isOpen]="isOpen">
      <ng-template>
        <ion-list>
          @for (tour of availableTours; track tour.id) {
            <ion-item button (click)="startTour(tour.id)">
              {{ tour.name }}
            </ion-item>
          }
        </ion-list>
      </ng-template>
    </ion-popover>
  `
})
export class HelpButtonComponent {
  private guidedTour = inject(GuidedTourService);
  
  availableTours = this.guidedTour.getAvailableTours();
  isOpen = false;

  startTour(tourId: TourId) {
    this.guidedTour.request({ id: tourId, mode: 'user-triggered' });
    this.isOpen = false;
  }
}
```

### Custom Tour Registration

```typescript
import { TourRegistryService, TourDefinition } from '@core/guided-tour';

@Injectable({ providedIn: 'root' })
export class CustomToursService {
  private registry = inject(TourRegistryService);

  constructor() {
    this.registerCustomTours();
  }

  private registerCustomTours() {
    const customTour: TourDefinition = {
      id: 'custom-feature' as TourId,
      name: 'My Custom Feature',
      description: 'Learn about this feature',
      steps: [
        {
          id: 'step-1',
          content: { 
            title: 'Welcome',
            text: 'This is a custom tour' 
          },
          target: { selector: '[data-tour="my-feature"]' },
          buttons: [
            { text: 'Next', action: 'next' }
          ]
        }
      ]
    };

    this.registry.register(customTour);
  }
}
```

## Migration from Old TourService

### Before
```typescript
// Old way
this.tourService.startWelcomeTour();
this.tourService.startGuidedBookingTour();
```

### After
```typescript
// New way
this.guidedTour.request({ id: TourId.Welcome });
this.guidedTour.request({ id: TourId.GuidedBooking });

// Or use convenience methods
this.guidedTour.startWelcomeTour();
this.guidedTour.startGuidedBookingTour();
```

## Adding Tour Steps to HTML

Mark elements with `data-tour-step` attribute:

```html
<!-- Hero section -->
<div class="hero" data-tour-step="welcome-hero">
  <h1>Welcome to AutoRenta</h1>
</div>

<!-- Navigation -->
<nav data-tour-step="welcome-nav">
  <a routerLink="/cars">Cars</a>
  <a routerLink="/bookings">Bookings</a>
</nav>

<!-- Help button -->
<button data-tour-step="welcome-help">
  <ion-icon name="help-circle"></ion-icon>
</button>
```

## Debug Mode

Enable debug logging:

```typescript
// In browser console or component
this.guidedTour.enableDebug();

// All tour events will be logged to console
// [TourTelemetry] started: { tourId: 'welcome', ... }
// [TourTelemetry] step_shown: { tourId: 'welcome', stepId: 'welcome-hero', ... }
```

## Testing

```typescript
describe('MyComponent with Tours', () => {
  it('should start tour when button clicked', async () => {
    const guidedTour = TestBed.inject(GuidedTourService);
    spyOn(guidedTour, 'request').and.returnValue(Promise.resolve(true));

    component.startTour();

    expect(guidedTour.request).toHaveBeenCalledWith({
      id: TourId.Welcome,
      mode: 'user-triggered'
    });
  });
});
```

## Performance Considerations

### Bundle Size
- Shepherd.js: ~40KB
- Tour System: ~15KB
- **Total**: ~55KB (gzipped: ~18KB)

### Optimization Tips
1. **Lazy load tours**: Only load tour definitions when needed
2. **Cleanup observers**: The system automatically cleans up MutationObservers
3. **Throttle tours**: Set `throttleHours` to avoid showing tours too frequently

## Future Enhancements

- [ ] Supabase integration for remote tour definitions
- [ ] A/B testing support via feature flags
- [ ] Multi-language support (i18n)
- [ ] Video/GIF support in step content
- [ ] Tour analytics dashboard
- [ ] Playwright E2E test helpers

## Troubleshooting

### Tour not starting?
1. Check if tour has been completed: `guidedTour.hasCompleted(TourId.Welcome)`
2. Check if throttled: Clear localStorage or use `guidedTour.reset(tourId)`
3. Check guards: Enable debug mode to see why guards fail

### Element not found?
1. Verify `data-tour-step` attribute exists
2. Use `altSelectors` for responsive layouts
3. Increase timeout in step definition
4. Set `required: false` to skip if element missing

### Tour cancelling unexpectedly?
1. Check for navigation during tour
2. Verify no conflicting tours are requested
3. Check console for errors

## Support

For issues or questions, contact the AutoRenta development team.

---

**Last Updated**: 2025-10-24  
**Version**: 1.0.0
