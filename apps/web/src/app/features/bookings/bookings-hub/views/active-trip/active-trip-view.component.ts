import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import type { Booking } from '@core/models';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

/**
 * ActiveTripView - In-Progress Trip Dashboard
 *
 * Shown when user currently has a car (status = in_progress).
 * Features:
 * - Trip progress hero (visual progress bar)
 * - Quick contact bar (call/message owner)
 * - Quick action grid
 * - Urgent alerts (if returning soon)
 */
@Component({
  standalone: true,
  selector: 'app-active-trip-view',
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    HoverLiftDirective,
    PressScaleDirective,
  ],
  template: `
    <div class="min-h-screen bg-surface-primary pb-24">
      <!-- Progress Hero -->
      <section class="progress-hero bg-gradient-to-br from-primary-500 to-primary-600 px-4 pt-safe pb-8">
        <div class="max-w-2xl mx-auto">
          <!-- Back link -->
          <a routerLink="/bookings" class="inline-flex items-center gap-1 text-white/80 text-sm mb-4">
            <app-icon name="chevron-left" class="w-4 h-4" />
            <span>Mis Viajes</span>
          </a>

          <!-- Status badge -->
          <div class="flex items-center gap-2 mb-4">
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              🚗 Viaje en Curso
            </span>
          </div>

          <!-- Progress bar -->
          <div class="mb-4">
            <div class="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                class="h-full bg-white rounded-full transition-all duration-500"
                [style.width.%]="progressPercent()"
              ></div>
            </div>
            <div class="flex justify-between mt-2 text-sm">
              <span class="text-white/70">{{ startDateLabel() }}</span>
              <span class="text-white font-medium">{{ progressPercent() | number:'1.0-0' }}%</span>
              <span class="text-white/70">{{ endDateLabel() }}</span>
            </div>
          </div>

          <!-- Time remaining -->
          <div class="text-center">
            <p class="text-white/80 text-sm">Tiempo restante</p>
            <p class="text-white text-2xl font-bold">{{ remainingLabel() }}</p>
          </div>
        </div>
      </section>

      <main class="px-4 max-w-2xl mx-auto -mt-4 space-y-4">
        <!-- Car info card -->
        <section class="glass-card-elevated p-4 rounded-2xl" appHoverLift>
          <div class="flex items-center gap-4">
            @if (carImageUrl()) {
              <img
                [src]="carImageUrl()"
                [alt]="carName()"
                class="w-20 h-14 object-cover rounded-lg"
              />
            }
            <div class="flex-1">
              <h2 class="font-semibold text-text-primary">{{ carName() }}</h2>
              <p class="text-sm text-text-secondary">{{ pickupLocation() }}</p>
            </div>
            <a
              [routerLink]="['/bookings', booking.id, 'active']"
              class="p-2 rounded-full bg-surface-secondary hover:bg-surface-tertiary transition-colors"
              appPressScale
            >
              <app-icon name="chevron-right" class="w-5 h-5 text-text-secondary" />
            </a>
          </div>
        </section>

        <!-- Quick Contact Bar -->
        <section class="glass-card p-4 rounded-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
                <span class="text-2xl">👤</span>
              </div>
              <div>
                <p class="font-medium text-text-primary">{{ ownerName() }}</p>
                <p class="text-sm text-text-secondary">Propietario</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              @if (ownerPhone()) {
                <a
                  [href]="'tel:' + ownerPhone()"
                  class="p-3 rounded-full bg-success-bg text-success-text hover:bg-success-100 transition-colors"
                  appPressScale
                  title="Llamar"
                >
                  <app-icon name="phone" class="w-5 h-5" />
                </a>
              }
              <a
                [routerLink]="['/messages/chat']"
                [queryParams]="{bookingId: booking.id, userId: booking.owner_id}"
                class="p-3 rounded-full bg-primary-bg text-primary-text hover:bg-primary-100 transition-colors"
                appPressScale
                title="Mensaje"
              >
                <app-icon name="message-circle" class="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        <!-- Urgent Alert (if returning soon) -->
        @if (isReturningSoon()) {
          <section
            class="p-4 rounded-xl border-2 border-warning-500 bg-warning-bg"
            [class.animate-pulse-subtle]="hoursToReturn() < 6"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div class="flex-1">
                <p class="font-medium text-warning-text">
                  Devolución en {{ hoursToReturn() }} horas
                </p>
                <p class="text-sm text-warning-text/80 mt-1">
                  Prepará el vehículo para la inspección de devolución.
                </p>
              </div>
            </div>

            <a
              [routerLink]="['/bookings', booking.id, 'check-out']"
              class="mt-3 w-full btn-warning flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
              appPressScale
            >
              <app-icon name="log-out" class="w-5 h-5" />
              Iniciar Devolución
            </a>
          </section>
        }

        <!-- Quick Actions Grid -->
        <section class="grid grid-cols-4 gap-3">
          @for (action of quickActions(); track action.id) {
            <button
              type="button"
              (click)="action.action()"
              class="flex flex-col items-center gap-2 p-3 glass-card rounded-xl transition-all"
              appPressScale
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                [class]="action.color"
              >
                {{ action.icon }}
              </div>
              <span class="text-xs text-text-secondary text-center">{{ action.label }}</span>
            </button>
          }
        </section>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Return Location -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <app-icon name="map-pin" class="w-5 h-5 text-primary-500" />
              Devolución
            </h3>
            <p class="text-sm text-text-secondary">{{ pickupLocation() }}</p>
            <p class="text-sm text-text-tertiary mt-1">
              {{ endDateLabel() }} · {{ endTimeLabel() }}
            </p>
          </section>

          <!-- Trip Summary -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <app-icon name="calendar" class="w-5 h-5 text-primary-500" />
              Tu Viaje
            </h3>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Duración</span>
              <span class="text-text-primary font-medium">{{ tripDuration() }} días</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-2">
              <span class="text-text-secondary">Estado</span>
              <span class="text-success-text font-medium">Activo</span>
            </div>
          </section>
        </div>

        <!-- Full Details CTA -->
        <section class="pt-4">
          <a
            [routerLink]="['/bookings', booking.id, 'active']"
            class="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
            appPressScale
          >
            <app-icon name="navigation" class="w-5 h-5" />
            Panel Completo del Viaje
          </a>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .progress-hero {
      padding-top: max(env(safe-area-inset-top), 1rem);
    }

    .pt-safe {
      padding-top: env(safe-area-inset-top);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
      color: white;
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.3);
    }

    .btn-warning {
      background: var(--warning-500);
      color: white;
      transition: all 0.2s ease;
    }

    .btn-warning:hover {
      background: var(--warning-600);
    }

    .animate-pulse-subtle {
      animation: pulse-subtle 2s infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveTripViewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) booking!: Booking;

  private readonly router = inject(Router);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Timer state
  readonly now = signal(new Date());

  // Computed values
  readonly carName = computed(() => {
    const { car_brand, car_model, car_year } = this.booking;
    if (car_brand && car_model) {
      return `${car_brand} ${car_model}${car_year ? ` ${car_year}` : ''}`;
    }
    return 'Tu vehículo';
  });

  readonly carImageUrl = computed(() => {
    return this.booking.main_photo_url || this.booking.car_image || null;
  });

  readonly pickupLocation = computed(() => {
    const { car_city, car_province } = this.booking;
    if (car_city && car_province) {
      return `${car_city}, ${car_province}`;
    }
    return 'Ubicación del vehículo';
  });

  readonly ownerName = computed(() => {
    return this.booking.owner_name ?? 'Propietario';
  });

  readonly ownerPhone = computed(() => {
    // owner_phone may come from a join in some queries
    return (this.booking as Booking & { owner_phone?: string }).owner_phone ?? null;
  });

  readonly progressPercent = computed(() => {
    if (!this.booking.start_at || !this.booking.end_at) return 50;

    const start = new Date(this.booking.start_at).getTime();
    const end = new Date(this.booking.end_at).getTime();
    const now = this.now().getTime();

    const total = end - start;
    const elapsed = now - start;

    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  });

  readonly remainingLabel = computed(() => {
    if (!this.booking.end_at) return '--';

    const end = new Date(this.booking.end_at).getTime();
    const now = this.now().getTime();
    const remainingMs = Math.max(0, end - now);

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      return `${hours} horas`;
    }
    const minutes = Math.floor(remainingMs / (1000 * 60));
    return `${minutes} minutos`;
  });

  readonly hoursToReturn = computed(() => {
    if (!this.booking.end_at) return 999;

    const end = new Date(this.booking.end_at).getTime();
    const now = this.now().getTime();
    return Math.max(0, Math.floor((end - now) / (1000 * 60 * 60)));
  });

  readonly isReturningSoon = computed(() => {
    return this.hoursToReturn() <= 24;
  });

  readonly startDateLabel = computed(() => {
    if (!this.booking.start_at) return '--';
    return new Date(this.booking.start_at).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  });

  readonly endDateLabel = computed(() => {
    if (!this.booking.end_at) return '--';
    return new Date(this.booking.end_at).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  });

  readonly endTimeLabel = computed(() => {
    if (!this.booking.end_at) return '--';
    return new Date(this.booking.end_at).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  readonly tripDuration = computed(() => {
    if (!this.booking.start_at || !this.booking.end_at) return 1;

    const start = new Date(this.booking.start_at);
    const end = new Date(this.booking.end_at);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, days);
  });

  readonly quickActions = computed<QuickAction[]>(() => [
    {
      id: 'location',
      label: 'Ver Auto',
      icon: '📍',
      color: 'bg-primary-bg',
      action: () => this.openLocation(),
    },
    {
      id: 'fuel',
      label: 'Gasolina',
      icon: '⛽',
      color: 'bg-warning-bg',
      action: () => this.openFuelStations(),
    },
    {
      id: 'contract',
      label: 'Contrato',
      icon: '📄',
      color: 'bg-info-bg',
      action: () => this.router.navigate(['/bookings', this.booking.id, 'contract']),
    },
    {
      id: 'sos',
      label: 'SOS',
      icon: '🚨',
      color: 'bg-error-bg',
      action: () => this.router.navigate(['/bookings', this.booking.id, 'active'], { fragment: 'emergency' }),
    },
  ]);

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    this.intervalId = setInterval(() => this.now.set(new Date()), 60000); // Update every minute
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private openLocation(): void {
    const { car_city, car_province } = this.booking;
    if (car_city && car_province) {
      const location = encodeURIComponent(`${car_city}, ${car_province}, Argentina`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${location}`, '_blank');
    }
  }

  private openFuelStations(): void {
    const { car_city, car_province } = this.booking;
    const location = car_city && car_province
      ? `${car_city}, ${car_province}`
      : 'mi ubicación';
    const query = encodeURIComponent(`estaciones de servicio cerca de ${location}`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  }
}
