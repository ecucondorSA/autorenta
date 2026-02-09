import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import type { Booking } from '@core/models';
import { BookingUiService } from '@core/services/bookings/booking-ui.service';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  chevronBackOutline,
  timeOutline,
  locationOutline,
  keyOutline,
  carSportOutline,
  navigateOutline,
} from 'ionicons/icons';
import { buildRentalStages, getStageActionHint } from '../models/rental-stage.model';
import type { BookingRole } from '../bookings-hub.types';
import { BookingStepperComponent } from './booking-stepper.component';
import { BookingContextualActionsComponent } from './booking-contextual-actions.component';

/**
 * ActiveRentalCardComponent — The "Smart Widget" center of the dashboard.
 *
 * Displays the dominant card for the user's most important active rental.
 * Features:
 * - Car photo + title hero
 * - Visual 5-stage stepper
 * - Countdown to next event (pickup/return)
 * - Micro-data: location minimap placeholder, security PIN
 * - Contextual action buttons based on current stage
 * - Carousel navigation when multiple active rentals exist
 */
@Component({
  selector: 'app-active-rental-card',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    MoneyPipe,
    BookingStepperComponent,
    BookingContextualActionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all"
    >
      <!-- HERO: Car Photo + Overlay -->
      <div class="relative h-44 bg-slate-100 overflow-hidden">
        @if (currentBooking().main_photo_url) {
          <img
            [src]="currentBooking().main_photo_url"
            [alt]="currentBooking().car_title"
            class="w-full h-full object-cover"
          />
        } @else {
          <div
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
          >
            <ion-icon name="car-sport-outline" class="text-5xl text-slate-300"></ion-icon>
          </div>
        }

        <!-- Gradient overlay -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
        ></div>

        <!-- Carousel nav (if multiple bookings) -->
        @if (totalBookings() > 1) {
          <div
            class="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1"
          >
            <button
              (click)="prevBooking()"
              class="p-0.5 text-white/80 hover:text-white active:scale-90 transition-all"
            >
              <ion-icon name="chevron-back-outline" class="text-sm"></ion-icon>
            </button>
            <span class="text-xs font-semibold text-white tabular-nums">
              {{ currentIndex() + 1 }}/{{ totalBookings() }}
            </span>
            <button
              (click)="nextBooking()"
              class="p-0.5 text-white/80 hover:text-white active:scale-90 transition-all"
            >
              <ion-icon name="chevron-forward-outline" class="text-sm"></ion-icon>
            </button>
          </div>
        }

        <!-- Title overlay at bottom -->
        <div class="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <div class="flex items-end justify-between">
            <div>
              <p class="text-white/70 text-xs font-medium mb-0.5">Tu renta actual</p>
              <h2 class="text-white text-lg font-bold leading-tight">
                {{ currentBooking().car_title || 'Auto' }}
              </h2>
            </div>
            <span class="text-white font-bold text-lg font-mono tabular-nums">
              {{ currentBooking().total_amount | money }}
            </span>
          </div>
        </div>
      </div>

      <!-- BODY -->
      <div class="p-4 space-y-4">
        <!-- Date range -->
        <p class="text-xs text-slate-500 text-center">
          {{ dateRange() }}
        </p>

        <!-- STEPPER -->
        <app-booking-stepper [stages]="stages()" [compact]="true"></app-booking-stepper>

        <!-- Stage action hint -->
        <div class="text-center">
          <p class="text-sm font-medium text-slate-700">{{ actionHint() }}</p>
        </div>

        <!-- MICRO-DATA ROW -->
        <div class="flex gap-2">
          <!-- Countdown -->
          @if (countdownLabel()) {
            <div class="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div class="flex items-center gap-1.5 mb-1">
                <ion-icon name="time-outline" class="text-sm text-slate-400"></ion-icon>
                <span class="text-[10px] font-bold text-slate-400 uppercase">{{
                  countdownLabel()
                }}</span>
              </div>
              <p class="text-sm font-bold text-slate-900 tabular-nums font-mono">
                {{ countdownDisplay() }}
              </p>
            </div>
          }

          <!-- Location mini -->
          <div class="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="flex items-center gap-1.5 mb-1">
              <ion-icon name="location-outline" class="text-sm text-slate-400"></ion-icon>
              <span class="text-[10px] font-bold text-slate-400 uppercase">Ubicación</span>
            </div>
            <p class="text-sm font-medium text-slate-700 truncate">
              {{ locationLabel() }}
            </p>
          </div>

          <!-- PIN (only for in_progress / confirmed) -->
          @if (showPin()) {
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[80px]">
              <div class="flex items-center gap-1.5 mb-1">
                <ion-icon name="key-outline" class="text-sm text-slate-400"></ion-icon>
                <span class="text-[10px] font-bold text-slate-400 uppercase">PIN</span>
              </div>
              <p class="text-sm font-bold text-slate-900 tracking-widest font-mono">
                {{ securityPin() }}
              </p>
            </div>
          }
        </div>

        <!-- CONTEXTUAL ACTIONS -->
        <app-booking-contextual-actions
          [booking]="currentBooking()"
          [role]="role()"
        ></app-booking-contextual-actions>
      </div>
    </div>
  `,
})
export class ActiveRentalCardComponent {
  private readonly bookingUi = inject(BookingUiService);
  private readonly destroyRef = inject(DestroyRef);

  bookings = input.required<Booking[]>();
  role = input.required<BookingRole>();

  readonly selectedIndex = signal(0);

  constructor() {
    addIcons({
      chevronForwardOutline,
      chevronBackOutline,
      timeOutline,
      locationOutline,
      keyOutline,
      carSportOutline,
      navigateOutline,
    });

    // Update countdown every second
    const interval = setInterval(() => this.tickCountdown(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  readonly currentIndex = computed(() => {
    const total = this.bookings().length;
    if (total === 0) return 0;
    return ((this.selectedIndex() % total) + total) % total;
  });

  readonly totalBookings = computed(() => this.bookings().length);

  readonly currentBooking = computed(() => {
    const list = this.bookings();
    return list[this.currentIndex()] ?? list[0];
  });

  readonly stages = computed(() => buildRentalStages(this.currentBooking()?.status ?? 'pending'));

  readonly actionHint = computed(() => {
    const role = this.role();
    const resolvedRole = role === 'unknown' ? 'renter' : role;
    return getStageActionHint(this.currentBooking()?.status ?? '', resolvedRole);
  });

  readonly dateRange = computed(() => {
    const b = this.currentBooking();
    if (!b?.start_at || !b?.end_at) return '';
    return formatDateRange(b.start_at, b.end_at);
  });

  // ─── Countdown ────────────────────────────────────────────────────

  private readonly countdownTick = signal(0);

  readonly countdownLabel = computed(() => {
    this.countdownTick(); // reactive dependency
    const b = this.currentBooking();
    if (!b) return null;
    switch (b.status) {
      case 'pending':
      case 'pending_payment':
        return 'Vence en';
      case 'confirmed':
        return 'Retiro en';
      case 'in_progress':
        return 'Devolver en';
      case 'pending_return':
        return 'Inspección en';
      default:
        return null;
    }
  });

  readonly countdownDisplay = computed(() => {
    this.countdownTick(); // reactive dependency
    const b = this.currentBooking();
    if (!b) return '--:--:--';

    let target: string | null = null;
    switch (b.status) {
      case 'pending':
      case 'pending_payment':
        target = b.expires_at ?? null;
        break;
      case 'confirmed':
        target = b.start_at ?? null;
        break;
      case 'in_progress':
        target = b.end_at ?? null;
        break;
      case 'pending_return':
        target = ((b as Record<string, unknown>)['auto_release_at'] as string) ?? null;
        break;
    }

    if (!target) return '--:--:--';

    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return '00:00:00';

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (h > 48) {
      const days = Math.floor(h / 24);
      return `${days}d ${h % 24}h`;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  readonly locationLabel = computed(() => {
    const b = this.currentBooking();
    if (!b) return 'Sin ubicación';
    // Use pickup location text if available, or coords
    if (b.pickup_location_lat && b.pickup_location_lng) {
      return `${b.pickup_location_lat.toFixed(3)}°, ${b.pickup_location_lng.toFixed(3)}°`;
    }
    return 'Sin ubicación';
  });

  readonly showPin = computed(() => {
    const status = this.currentBooking()?.status;
    return status === 'confirmed' || status === 'in_progress';
  });

  readonly securityPin = computed(() => {
    const b = this.currentBooking();
    if (!b) return '----';
    // Generate deterministic PIN from booking ID
    const hash = b.id.replace(/[^0-9]/g, '').slice(0, 4);
    return hash.padStart(4, '0');
  });

  // ─── Navigation ───────────────────────────────────────────────────

  nextBooking(): void {
    this.selectedIndex.update((i) => i + 1);
  }

  prevBooking(): void {
    this.selectedIndex.update((i) => i - 1);
  }

  private tickCountdown(): void {
    this.countdownTick.update((v) => v + 1);
  }
}
