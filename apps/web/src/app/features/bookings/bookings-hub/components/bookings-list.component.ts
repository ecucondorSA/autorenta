import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { CountdownTimerComponent } from '@shared/components/countdown-timer/countdown-timer.component';
import { formatDateRange } from '@shared/utils/date.utils';
import { Booking } from '@core/models';
import { BookingUiService, BookingColorScheme } from '@core/services/bookings/booking-ui.service';
import { FilterItem, BookingRole, BookingFilter } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe, CountdownTimerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-3">
      <!-- FILTER PILLS (only shown when filters are provided) -->
      @if (filters().length > 0) {
        <div class="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          @for (f of filters(); track f.id) {
            <button
              (click)="onFilterChange(f.id)"
              [class]="
                currentFilter() === f.id
                  ? 'px-4 py-2 rounded-full text-sm font-semibold bg-slate-900 text-white transition-all whitespace-nowrap'
                  : 'px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-600 border border-slate-200 transition-all whitespace-nowrap'
              "
            >
              {{ f.label }}
              @if (f.count > 0) {
                <span class="ml-1 text-xs opacity-70">{{ f.count }}</span>
              }
            </button>
          }
        </div>
      }

      <!-- BOOKING CARDS -->
      @if (bookings().length === 0) {
        <div class="py-8 flex flex-col items-center text-center">
          <p class="text-sm text-slate-400">Sin resultados para este filtro</p>
          <button
            (click)="onFilterChange('all')"
            class="mt-3 text-sm font-semibold text-slate-900 underline underline-offset-4"
          >
            Ver todas
          </button>
        </div>
      } @else {
        <div class="space-y-3">
          @for (booking of bookings(); track booking.id) {
            <a
              [routerLink]="detailLink(booking)"
              class="block bg-white rounded-2xl p-3 border transition-all active:scale-[0.98]"
              [class]="cardBorderClass(booking)"
            >
              <div class="flex items-start gap-3">
                <!-- Thumbnail -->
                <div class="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  @if (booking.main_photo_url) {
                    <img
                      [src]="booking.main_photo_url"
                      [alt]="booking.car_title || 'Auto'"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center">
                      <ion-icon name="car-sport-outline" class="text-2xl text-slate-300"></ion-icon>
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-bold text-slate-900 truncate">
                      {{ booking.car_title || 'Auto' }}
                    </h3>
                    <span
                      class="text-sm font-bold text-slate-900 font-mono tabular-nums flex-shrink-0"
                    >
                      {{ booking.total_amount | money }}
                    </span>
                  </div>

                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ rangeLabel(booking) }}
                  </p>

                  <!-- Status + Countdown Row -->
                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"
                      >
                        <span
                          [class]="dotColor(booking)"
                          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        ></span>
                        {{ statusLabel(booking) }}
                      </span>

                      <!-- Unread messages badge -->
                      @if (getUnreadForBooking(booking) > 0) {
                        <span
                          class="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-md"
                        >
                          <ion-icon name="chatbubble-outline" class="text-[9px]"></ion-icon>
                          {{ getUnreadForBooking(booking) }}
                        </span>
                      }
                    </div>

                    <!-- Countdown timer (inline) -->
                    @if (getCountdownForBooking(booking)) {
                      <div class="flex items-center gap-1.5 text-xs text-slate-500">
                        <span class="text-[10px] font-medium uppercase">{{
                          getCountdownLabelForBooking(booking)
                        }}</span>
                        <app-countdown-timer
                          [targetDate]="getCountdownForBooking(booking)"
                          size="sm"
                        ></app-countdown-timer>
                      </div>
                    } @else {
                      <ion-icon
                        name="chevron-forward-outline"
                        class="text-slate-300 text-sm"
                      ></ion-icon>
                    }
                  </div>
                </div>
              </div>

              <!-- Phase Progress Indicator -->
              @if (!isTerminal(booking)) {
                <div class="flex gap-1 mt-2.5 px-1">
                  <!-- TODO(human): implement phaseStep(booking.status) that returns 1-5 -->
                  @for (step of [1, 2, 3, 4, 5]; track step) {
                    <div
                      class="h-1 flex-1 rounded-full transition-colors"
                      [class]="
                        step <= phaseStep(booking.status)
                          ? activeStepColor(booking)
                          : 'bg-slate-100'
                      "
                    ></div>
                  }
                </div>
              }

              <!-- Inline Action (if primary action exists) -->
              @if (getActionLabel(booking)) {
                <div class="mt-2.5 pt-2 border-t border-slate-50">
                  <span
                    class="text-xs font-semibold flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors"
                    [class]="actionButtonClass(booking)"
                  >
                    {{ getActionLabel(booking) }}
                    <ion-icon name="arrow-forward-outline" class="text-[10px]"></ion-icon>
                  </span>
                </div>
              }
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class BookingsListComponent {
  private readonly bookingUi = inject(BookingUiService);

  bookings = input.required<Booking[]>();
  filters = input<FilterItem[]>([]);
  currentFilter = input<BookingFilter>('all');
  role = input.required<BookingRole>();
  filterChange = output<BookingFilter>();

  // Countdown and unread data (passed from parent hub)
  countdownTargets = input<Map<string, string>>(new Map());
  countdownLabels = input<Map<string, string>>(new Map());
  unreadCounts = input<Map<string, number>>(new Map());

  onFilterChange(filter: BookingFilter): void {
    if (this.currentFilter() !== filter) {
      this.filterChange.emit(filter);
    }
  }

  detailLink(booking: Booking): string[] {
    return this.role() === 'owner' ? ['/bookings/owner', booking.id] : ['/bookings', booking.id];
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    return this.bookingUi.getUiState(booking, this.role()).labelShort;
  }

  dotColor(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToDotClass(color);
  }

  cardBorderClass(booking: Booking): string {
    const ui = this.bookingUi.getUiState(booking, this.role());
    if (ui.priority === 'urgent') return 'border-amber-200';
    return 'border-slate-100';
  }

  // Countdown helpers — compute inline from booking data
  getCountdownForBooking(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
      case 'pending_payment':
        return booking.expires_at ?? null;
      case 'confirmed':
        return booking.start_at ?? null;
      case 'in_progress':
        return booking.end_at ?? null;
      case 'pending_return':
        return booking.auto_release_at ?? null;
      default:
        return null;
    }
  }

  getCountdownLabelForBooking(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
      case 'pending_payment':
        return 'Vence';
      case 'confirmed':
        return 'Retiro';
      case 'in_progress':
        return 'Fin';
      case 'pending_return':
        return 'Inspec.';
      default:
        return null;
    }
  }

  getUnreadForBooking(booking: Booking): number {
    return this.unreadCounts().get(booking.id) ?? 0;
  }

  getActionLabel(booking: Booking): string | null {
    const ui = this.bookingUi.getUiState(booking, this.role());
    return ui.primaryAction?.label ?? null;
  }

  actionButtonClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    switch (color) {
      case 'amber':
        return 'text-amber-700 bg-amber-50';
      case 'red':
        return 'text-red-700 bg-red-50';
      case 'blue':
        return 'text-blue-700 bg-blue-50';
      case 'green':
        return 'text-emerald-700 bg-emerald-50';
      default:
        return 'text-slate-700 bg-slate-50';
    }
  }

  isTerminal(booking: Booking): boolean {
    return [
      'completed',
      'cancelled',
      'expired',
      'cancelled_renter',
      'cancelled_owner',
      'cancelled_system',
      'rejected',
    ].includes(booking.status);
  }

  /**
   * Map booking status to phase step (1-5)
   * 1 = Pre-checkin, 2 = Check-in, 3 = Viaje, 4 = Devolucion, 5 = Finalizado
   */
  phaseStep(status: string): number {
    switch (status) {
      case 'pending':
      case 'pending_payment':
      case 'pending_approval':
      case 'pending_owner_approval':
        return 1;
      case 'confirmed':
        return 2;
      case 'in_progress':
        return 3;
      case 'pending_return':
      case 'returned':
      case 'inspected_good':
      case 'damage_reported':
      case 'pending_review':
      case 'dispute':
      case 'disputed':
      case 'pending_dispute_resolution':
        return 4;
      case 'completed':
      case 'resolved':
        return 5;
      default:
        return 1;
    }
  }

  activeStepColor(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    switch (color) {
      case 'amber':
        return 'bg-amber-400';
      case 'red':
        return 'bg-red-400';
      case 'blue':
        return 'bg-blue-400';
      case 'green':
        return 'bg-emerald-400';
      case 'purple':
        return 'bg-purple-400';
      default:
        return 'bg-slate-400';
    }
  }

  private colorToDotClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber':
        return 'bg-amber-400';
      case 'red':
        return 'bg-red-400';
      case 'blue':
        return 'bg-blue-400';
      case 'green':
        return 'bg-emerald-400';
      case 'purple':
        return 'bg-purple-400';
      default:
        return 'bg-slate-400';
    }
  }
}
