/**
 * EXAMPLES: Guided Tour System Usage
 *
 * Practical examples for common use cases
 */

import { Component, inject, OnInit } from '@angular/core';
import { GuidedTourService, TourId, TourDefinition, TourPriority } from '@core/guided-tour';

// ============================================================================
// EXAMPLE 1: Basic Tour Request (User-Triggered)
// ============================================================================

@Component({
  selector: 'app-help-menu',
  template: ` <button (click)="showWelcomeTour()">Show Welcome Tour</button> `,
})
export class HelpMenuComponent {
  private guidedTour = inject(GuidedTourService);

  async showWelcomeTour() {
    const started = await this.guidedTour.request({
      id: TourId.Welcome,
      mode: 'user-triggered',
    });

    if (!started) {
    }
  }
}

// ============================================================================
// EXAMPLE 2: Auto-Start Tour on Page Load
// ============================================================================

@Component({
  selector: 'app-cars-list',
  template: `<div>Cars List</div>`,
})
export class CarsListComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    // Tours with autoStart: true in their definition will start automatically
    // when guards and triggers match

    // Optionally, you can manually trigger a tour after data loads:
    this.loadCars().then(() => {
      this.guidedTour.request({
        id: TourId.GuidedBooking,
        mode: 'auto',
        reason: 'inventory-loaded',
      });
    });
  }

  private async loadCars() {
    // Load cars logic...
  }
}

// ============================================================================
// EXAMPLE 3: Check Tour State (Reactive)
// ============================================================================

@Component({
  selector: 'app-layout',
  template: `
    <div [class.tour-active]="isTourActive()">
      <ng-content></ng-content>
    </div>
  `,
})
export class LayoutComponent {
  private guidedTour = inject(GuidedTourService);

  isTourActive() {
    return this.guidedTour.getState().isRunning;
  }

  getCurrentTour() {
    return this.guidedTour.getState().activeTourId;
  }
}

// ============================================================================
// EXAMPLE 4: Custom Tour Registration
// ============================================================================

@Component({
  selector: 'app-custom-feature',
  template: `<div>Custom Feature</div>`,
})
export class CustomFeatureComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    this.registerCustomTour();
  }

  private registerCustomTour() {
    const customTour: TourDefinition = {
      id: 'my-custom-feature' as TourId,
      name: 'Mi Feature Personalizado',
      description: 'Aprende a usar esta característica',
      priority: TourPriority.Normal,
      throttleHours: 72,
      steps: [
        {
          id: 'intro',
          content: {
            title: 'Introducción',
            text: 'Bienvenido a mi feature personalizado!',
          },
          position: 'center',
          buttons: [{ text: 'Siguiente', action: 'next' }],
        },
        {
          id: 'feature-button',
          content: {
            title: 'Botón Principal',
            text: 'Este botón activa la funcionalidad',
          },
          position: 'bottom',
          target: {
            selector: '[data-tour-step="my-feature-button"]',
            required: true,
          },
          buttons: [
            { text: 'Atrás', action: 'back' },
            { text: 'Entendido', action: 'complete' },
          ],
        },
      ],
      guards: [
        {
          name: 'featureEnabled',
          check: () => {
            // Check if feature is enabled for user
            return this.isFeatureEnabled();
          },
        },
      ],
    };

    this.guidedTour.registerTour(customTour);
  }

  private isFeatureEnabled(): boolean {
    // Check feature flag or user permissions
    return true;
  }
}

// ============================================================================
// EXAMPLE 5: Reset Tour for Testing
// ============================================================================

@Component({
  selector: 'app-dev-tools',
  template: `
    <div class="dev-panel">
      <button (click)="resetTour()">Reset Welcome Tour</button>
      <button (click)="forceTour()">Force Start Tour</button>
      <button (click)="enableDebug()">Enable Debug</button>
    </div>
  `,
})
export class DevToolsComponent {
  private guidedTour = inject(GuidedTourService);

  resetTour() {
    this.guidedTour.reset(TourId.Welcome);
  }

  forceTour() {
    this.guidedTour.request({
      id: TourId.Welcome,
      mode: 'user-triggered',
      force: true, // Bypass all checks
    });
  }

  enableDebug() {
    this.guidedTour.enableDebug();
  }
}

// ============================================================================
// EXAMPLE 6: Conditional Tour Start with Guards
// ============================================================================

@Component({
  selector: 'app-premium-feature',
  template: `<div>Premium Feature</div>`,
})
export class PremiumFeatureComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    // Register tour with complex guards
    const premiumTour: TourDefinition = {
      id: 'premium-features' as TourId,
      name: 'Features Premium',
      description: 'Tour de características premium',
      guards: [
        {
          name: 'isPremiumUser',
          check: async () => {
            const user = await this.getCurrentUser();
            return user?.isPremium === true;
          },
        },
        {
          name: 'hasNotSeenBefore',
          check: () => {
            return !localStorage.getItem('premium-tour-seen');
          },
        },
      ],
      steps: [
        {
          id: 'premium-intro',
          content: {
            title: '¡Bienvenido Premium! 🌟',
            text: 'Gracias por ser usuario premium. Te mostramos las funciones exclusivas.',
          },
          position: 'center',
          buttons: [{ text: 'Ver funciones', action: 'next' }],
        },
      ],
    };

    this.guidedTour.registerTour(premiumTour);
  }

  private async getCurrentUser() {
    // Fetch user from service
    return { isPremium: true };
  }
}

// ============================================================================
// EXAMPLE 7: Tour with Async Hooks (Expand Panels, etc.)
// ============================================================================

@Component({
  selector: 'app-accordion',
  template: `
    <div class="accordion">
      <div class="panel" [class.expanded]="isPanelExpanded">
        <button (click)="togglePanel()">Toggle Panel</button>
        @if (isPanelExpanded) {
          <div class="content">
            <div data-tour-step="panel-content">Panel Content Here</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AccordionComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);
  isPanelExpanded = false;

  ngOnInit() {
    const accordionTour: TourDefinition = {
      id: 'accordion-demo' as TourId,
      name: 'Accordion Demo',
      description: 'Shows how to use hooks',
      steps: [
        {
          id: 'panel-intro',
          content: {
            text: 'Este es un panel colapsable',
          },
          target: { selector: '.panel' },
          buttons: [{ text: 'Ver contenido', action: 'next' }],
        },
        {
          id: 'panel-content',
          content: {
            text: 'Este es el contenido interno del panel',
          },
          target: {
            selector: '[data-tour-step="panel-content"]',
            required: true,
          },
          // Hook to expand panel before showing step
          onBefore: async () => {
            this.isPanelExpanded = true;
            // Wait for animation
            await new Promise((resolve) => setTimeout(resolve, 300));
          },
          // Hook to collapse after step
          onAfter: async () => {
            this.isPanelExpanded = false;
          },
          buttons: [
            { text: 'Atrás', action: 'back' },
            { text: 'Entendido', action: 'complete' },
          ],
        },
      ],
    };

    this.guidedTour.registerTour(accordionTour);
  }

  togglePanel() {
    this.isPanelExpanded = !this.isPanelExpanded;
  }
}

// ============================================================================
// EXAMPLE 8: Responsive Tour (Different steps per device)
// ============================================================================

@Component({
  selector: 'app-responsive-feature',
  template: `<div>Responsive Feature</div>`,
})
export class ResponsiveFeatureComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    const responsiveTour: TourDefinition = {
      id: 'responsive-demo' as TourId,
      name: 'Responsive Tour',
      description: 'Adapts to screen size',
      steps: [
        {
          id: 'main-menu',
          content: {
            title: 'Menú Principal',
            text: 'Accede al menú desde aquí',
          },
          // Default configuration
          position: 'bottom',
          target: {
            selector: '[data-tour-step="desktop-menu"]',
          },
          // Override for mobile
          responsive: {
            mobile: {
              position: 'top',
              target: {
                selector: '[data-tour-step="mobile-hamburger"]',
                altSelectors: ['.mobile-menu-button'],
              },
              content: {
                title: 'Menú',
                text: 'Toca el ícono de menú',
              },
            },
          },
          buttons: [{ text: 'Siguiente', action: 'next' }],
        },
      ],
    };

    this.guidedTour.registerTour(responsiveTour);
  }
}

// ============================================================================
// EXAMPLE 9: Analytics Integration
// ============================================================================

@Component({
  selector: 'app-analytics-demo',
  template: `<div>Analytics Demo</div>`,
})
export class AnalyticsDemoComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  ngOnInit() {
    // All tour events are automatically tracked via TelemetryBridge
    // You can also access event history:

    const history = this.guidedTour.getEventHistory();

    // Events automatically sent:
    // - tour_started
    // - tour_step_shown
    // - tour_step_completed
    // - tour_completed
    // - tour_cancelled
    // - tour_error
  }
}

// ============================================================================
// EXAMPLE 10: Multi-Tour Queue Management
// ============================================================================

@Component({
  selector: 'app-onboarding',
  template: `<div>Onboarding</div>`,
})
export class OnboardingComponent implements OnInit {
  private guidedTour = inject(GuidedTourService);

  async ngOnInit() {
    // Request multiple tours - they'll be queued by priority
    await this.guidedTour.request({
      id: TourId.Welcome,
      mode: 'auto',
    });

    // This will be queued if Welcome is running
    await this.guidedTour.request({
      id: TourId.GuidedBooking,
      mode: 'auto',
    });

    // This will be queued but has higher priority
    await this.guidedTour.request({
      id: 'critical-announcement' as TourId,
      mode: 'auto',
    });

    // Priority order: Critical → Welcome → GuidedBooking
  }
}

// ============================================================================
// EXAMPLE 11: Tour Dismissal (Temporary)
// ============================================================================

@Component({
  selector: 'app-dismissible-tour',
  template: `
    <button (click)="showTour()">Show Tour</button>
    <button (click)="dismissTour()">Dismiss for 24h</button>
  `,
})
export class DismissibleTourComponent {
  private guidedTour = inject(GuidedTourService);

  showTour() {
    this.guidedTour.request({ id: TourId.Welcome });
  }

  dismissTour() {
    // Will not show again for 24h (or custom throttleHours)
    this.guidedTour.dismiss(TourId.Welcome);
  }
}

// ============================================================================
// EXAMPLE 12: Check if Tour Completed
// ============================================================================

@Component({
  selector: 'app-tour-status',
  template: `
    @if (!hasCompletedWelcome()) {
      <div>
        <button (click)="startTour()">Start Welcome Tour</button>
      </div>
    } @else {
      <div>✓ You've completed the welcome tour!</div>
    }
  `,
})
export class TourStatusComponent {
  private guidedTour = inject(GuidedTourService);

  hasCompletedWelcome(): boolean {
    return this.guidedTour.hasCompleted(TourId.Welcome);
  }

  startTour() {
    this.guidedTour.startWelcomeTour();
  }
}
