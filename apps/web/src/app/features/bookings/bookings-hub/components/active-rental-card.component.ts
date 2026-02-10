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
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { environment } from '@environment';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  chevronBackOutline,
  timeOutline,
  locationOutline,
  keyOutline,
  carSportOutline,
  navigateOutline,
  mapOutline,
} from 'ionicons/icons';
import {
  buildRentalStages,
  getStageActionHint,
  getCountdownLabel,
  getCountdownTarget,
  formatCountdown,
  getLocationLabel,
  getSecurityPin,
  shouldShowPin,
} from '../models/rental-stage.model';
import type { BookingRole } from '../bookings-hub.types';
import { BookingStepperComponent } from './booking-stepper.component';
import { BookingContextualActionsComponent } from './booking-contextual-actions.component';

/**
 * ActiveRentalCardComponent — The "Smart Widget" center of the dashboard.
 *
 * Displays the dominant card for the user's most important active rental.
 * Features:
 * - Car photo + title hero (taller in expanded/asset mode)
 * - Visual 5-stage stepper (detailed mode when expanded)
 * - Countdown to next event (pickup/return)
 * - Micro-data: mini-map (Google Static Maps), security PIN
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
      class="bg-white rounded-3xl overflow-hidden transition-all"
      [class]="isAssetMode()
        ? 'border border-slate-100/80 shadow-lg shadow-slate-200/50'
        : 'border border-slate-100 shadow-sm'"
    >
      <!-- HERO: Car Photo + Overlay -->
      <div
        class="relative bg-slate-100 overflow-hidden"
        [class]="isAssetMode() ? 'h-56' : 'h-44'"
      >
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
        <app-booking-stepper
          [stages]="stages()"
          [compact]="!isAssetMode()"
          [detailed]="isAssetMode()"
        ></app-booking-stepper>

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
              <p
                class="font-bold text-slate-900 tabular-nums font-mono"
                [class]="isAssetMode() ? 'text-lg tracking-wide' : 'text-sm'"
              >
                {{ countdownDisplay() }}
              </p>
            </div>
          }

          <!-- Location mini-map or text -->
          <div
            class="flex-1 bg-slate-50 rounded-xl overflow-hidden border border-slate-100"
          >
            @if (isAssetMode() && miniMapUrl()) {
              <a [href]="mapsDeepLink()" target="_blank" rel="noopener" class="block relative">
                <img
                  [src]="miniMapUrl()"
                  alt="Ubicacion del vehiculo"
                  class="w-full h-[72px] object-cover"
                  loading="lazy"
                />
                <div class="absolute bottom-0 left-0 right-0 px-2.5 py-1 bg-gradient-to-t from-black/50 to-transparent">
                  <p class="text-[10px] font-medium text-white truncate">{{ locationLabel() }}</p>
                </div>
              </a>
            } @else {
              <div class="p-3">
                <div class="flex items-center gap-1.5 mb-1">
                  <ion-icon name="location-outline" class="text-sm text-slate-400"></ion-icon>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Ubicacion</span>
                </div>
                <p class="text-sm font-medium text-slate-700 truncate">
                  {{ locationLabel() }}
                </p>
              </div>
            }
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
  private readonly destroyRef = inject(DestroyRef);

  bookings = input.required<Booking[]>();
  role = input.required<BookingRole>();
  /** Context mode from BookingContextService (null = standard card) */
  contextMode = input<string | null>(null);
  /** When true, renders in expanded "Asset Dashboard" mode */
  expanded = input<boolean>(false);

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
      mapOutline,
    });

    // Update countdown every second
    const interval = setInterval(() => this.tickCountdown(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  // ─── Asset Mode ──────────────────────────────────────────────────

  readonly isAssetMode = computed(() => this.expanded());

  // ─── Carousel ────────────────────────────────────────────────────

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
    this.countdownTick();
    const b = this.currentBooking();
    if (!b) return null;
    const role = this.role() === 'unknown' ? 'renter' : this.role();
    return getCountdownLabel(b.status, role as 'renter' | 'owner');
  });

  readonly countdownDisplay = computed(() => {
    this.countdownTick();
    const b = this.currentBooking();
    if (!b) return '--:--:--';
    const target = getCountdownTarget(b as unknown as Record<string, unknown>);
    if (!target) return '--:--:--';
    return formatCountdown(target);
  });

  // ─── Location & Mini-Map ─────────────────────────────────────────

  readonly locationLabel = computed(() => {
    const b = this.currentBooking();
    if (!b) return 'Sin ubicación';
    return getLocationLabel(b as unknown as Record<string, unknown>);
  });

  readonly miniMapUrl = computed(() => {
    const b = this.currentBooking();
    if (!b) return null;
    const apiKey = environment.googleMapsApiKey ?? '';

    // Use exact coords if available
    if (b.pickup_location_lat && b.pickup_location_lng) {
      const lat = b.pickup_location_lat;
      const lng = b.pickup_location_lng;
      return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x160&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
    }

    // Fallback to city-level geocoding
    const city = (b as Record<string, unknown>)['car_city'] as string | undefined;
    const province = (b as Record<string, unknown>)['car_province'] as string | undefined;
    if (city && province) {
      const location = encodeURIComponent(`${city}, ${province}, Argentina`);
      return `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=14&size=400x160&scale=2&maptype=roadmap&markers=color:red%7C${location}&key=${apiKey}`;
    }

    return null;
  });

  readonly mapsDeepLink = computed(() => {
    const b = this.currentBooking();
    if (!b) return '#';
    if (b.pickup_location_lat && b.pickup_location_lng) {
      return `https://www.google.com/maps/search/?api=1&query=${b.pickup_location_lat},${b.pickup_location_lng}`;
    }
    const city = (b as Record<string, unknown>)['car_city'] as string | undefined;
    const province = (b as Record<string, unknown>)['car_province'] as string | undefined;
    if (city && province) {
      const loc = encodeURIComponent(`${city}, ${province}, Argentina`);
      return `https://www.google.com/maps/search/?api=1&query=${loc}`;
    }
    return '#';
  });

  readonly showPin = computed(() => shouldShowPin(this.currentBooking()?.status ?? ''));

  readonly securityPin = computed(() => {
    const b = this.currentBooking();
    if (!b) return '----';
    return getSecurityPin(b.id);
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
