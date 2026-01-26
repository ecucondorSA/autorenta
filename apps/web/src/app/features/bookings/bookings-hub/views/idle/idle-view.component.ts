import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingsStore } from '@core/stores/bookings.store';
import { ProfileStore } from '@core/stores/profile.store';
import { IconComponent } from '@shared/components/icon/icon.component';
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';

// Import my-bookings page for history
import { MyBookingsPage } from '../../../my-bookings/my-bookings.page';

/**
 * IdleView - Shown when user has no active/upcoming trips
 *
 * Features:
 * - Welcome greeting with user name
 * - CTA to search for cars
 * - Quick stats (total trips, days driven, rating)
 * - Collapsible history from existing MyBookingsPage
 */
@Component({
  standalone: true,
  selector: 'app-idle-view',
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    HoverLiftDirective,
    PressScaleDirective,
    MyBookingsPage,
  ],
  template: `
    <div class="min-h-screen bg-surface-primary pb-24">
      <!-- Welcome Section -->
      <header class="glass-navbar sticky top-0 z-10 px-4 py-4">
        <div class="max-w-2xl mx-auto">
          <h1 class="text-2xl font-bold text-text-primary">Hola, {{ userName() }}! 👋</h1>
        </div>
      </header>

      <main class="px-4 max-w-2xl mx-auto space-y-6 pt-4">
        <!-- Hero CTA Card -->
        <section
          class="glass-card-elevated p-6 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5"
          appHoverLift
        >
          <div class="flex items-center gap-4">
            <div class="text-4xl">🚗</div>
            <div class="flex-1">
              <h2 class="text-lg font-semibold text-text-primary">¿Listo para tu próximo viaje?</h2>
              <p class="text-sm text-text-secondary mt-1">
                Encontrá el auto perfecto para tu aventura
              </p>
            </div>
          </div>
          <a
            routerLink="/marketplace"
            class="mt-4 w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
            appPressScale
          >
            <app-icon name="search" class="w-5 h-5" />
            <span>Buscar Autos</span>
          </a>
        </section>

        <!-- Quick Stats -->
        @if (hasHistory()) {
          <section class="grid grid-cols-3 gap-3">
            <div class="glass-card p-4 rounded-xl text-center">
              <div class="text-2xl font-bold text-primary-500">{{ totalTrips() }}</div>
              <div class="text-xs text-text-secondary mt-1">viajes</div>
            </div>
            <div class="glass-card p-4 rounded-xl text-center">
              <div class="text-2xl font-bold text-primary-500">{{ totalDays() }}</div>
              <div class="text-xs text-text-secondary mt-1">días</div>
            </div>
            <div class="glass-card p-4 rounded-xl text-center">
              <div class="text-2xl font-bold text-primary-500">
                @if (averageRating() > 0) {
                  ⭐ {{ averageRating() | number: '1.1-1' }}
                } @else {
                  --
                }
              </div>
              <div class="text-xs text-text-secondary mt-1">rating</div>
            </div>
          </section>
        }

        <!-- History Section (collapsible) -->
        <section>
          <button
            type="button"
            (click)="toggleHistory()"
            class="w-full flex items-center justify-between p-4 glass-card rounded-xl"
            appPressScale
          >
            <span class="font-medium text-text-primary flex items-center gap-2">
              <app-icon name="history" class="w-5 h-5 text-text-secondary" />
              Historial de Viajes
            </span>
            <app-icon
              [name]="historyExpanded() ? 'chevron-up' : 'chevron-down'"
              class="w-5 h-5 text-text-secondary transition-transform"
            />
          </button>

          @if (historyExpanded()) {
            <div class="mt-4 animate-fade-in">
              <app-my-bookings-page />
            </div>
          }
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .btn-primary {
        background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
        color: white;
        transition: all 0.2s ease;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.3);
      }

      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleViewComponent {
  private readonly store = inject(BookingsStore);
  private readonly profileStore = inject(ProfileStore);

  // UI state
  readonly historyExpanded = signal(false);

  toggleHistory(): void {
    this.historyExpanded.update((v) => !v);
  }

  // User name from profile
  readonly userName = computed(() => {
    const profile = this.profileStore.profile();
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0]; // First name only
    }
    return 'Viajero';
  });

  // Stats computed from completed bookings
  readonly hasHistory = computed(() => this.store.completedBookings().length > 0);

  readonly totalTrips = computed(() => this.store.completedBookings().length);

  readonly totalDays = computed(() => {
    const completed = this.store.completedBookings();
    let days = 0;
    for (const booking of completed) {
      if (booking.start_at && booking.end_at) {
        const start = new Date(booking.start_at);
        const end = new Date(booking.end_at);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        days += Math.max(1, diffDays);
      }
    }
    return days;
  });

  readonly averageRating = computed(() => {
    // For now return 0, in future could compute from reviews
    return 0;
  });
}
