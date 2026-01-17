import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { BookingsStore } from '@core/stores/bookings.store';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingContextService } from './services/booking-context.service';

// Views
import { PreTripViewComponent } from './views/pre-trip/pre-trip-view.component';
import { ActiveTripViewComponent } from './views/active-trip/active-trip-view.component';
import { PendingActionViewComponent } from './views/pending-action/pending-action-view.component';
import { IdleViewComponent } from './views/idle/idle-view.component';

/**
 * BookingsHubPage - Context-Driven Page Orchestrator
 *
 * This page TRANSFORMS based on the user's current context:
 * - PRE-TRIP: Countdown hero, map, checklist, weather
 * - ACTIVE-TRIP: Trip progress, contact bar, quick actions
 * - PENDING-ACTION: Focused UI for the single action needed
 * - IDLE: History + CTA to search
 *
 * Unlike Turo/Getaround's static card lists, this provides
 * a truly contextual experience that anticipates user needs.
 */
@Component({
  standalone: true,
  selector: 'app-bookings-hub',
  imports: [
    CommonModule,
    PreTripViewComponent,
    ActiveTripViewComponent,
    PendingActionViewComponent,
    IdleViewComponent,
  ],
  template: `
    <!-- Loading state -->
    @if (loading()) {
      <div class="min-h-screen flex items-center justify-center bg-surface-primary">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-text-secondary">Cargando tus viajes...</p>
        </div>
      </div>
    } @else {
      <!-- Context-driven view switching -->
      @switch (mode()) {
        @case ('pre-trip') {
          <app-pre-trip-view
            [booking]="contextBooking()!"
            [hoursToPickup]="context().hoursToPickup ?? 48"
          />
        }
        @case ('active-trip') {
          <app-active-trip-view
            [booking]="contextBooking()!"
          />
        }
        @case ('pending-action') {
          <app-pending-action-view
            [booking]="contextBooking()!"
            [actionType]="context().actionType ?? 'complete-payment'"
          />
        }
        @default {
          <app-idle-view />
        }
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--surface-primary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsHubPage implements OnInit, OnDestroy {
  private readonly store = inject(BookingsStore);
  private readonly authService = inject(AuthService);
  private readonly contextService = inject(BookingContextService);

  // Expose context signals to template
  readonly context = this.contextService.context;
  readonly mode = this.contextService.mode;
  readonly contextBooking = this.contextService.contextBooking;
  readonly loading = this.store.loadingList;

  async ngOnInit(): Promise<void> {
    // Ensure bookings are loaded
    await this.store.loadMyBookings();

    // Setup realtime subscription
    const session = await this.authService.ensureSession();
    if (session?.user?.id) {
      this.store.subscribeToUserBookings('renter');
    }
  }

  ngOnDestroy(): void {
    this.store.unsubscribeAll();
  }
}
