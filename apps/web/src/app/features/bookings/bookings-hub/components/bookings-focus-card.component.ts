import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Booking } from '@core/models';
import { BookingUiService, BookingColorScheme } from '@core/services/bookings/booking-ui.service';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { FocusCard, BookingRole } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-focus-card',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (card().booking; as b) {
      <a
        [routerLink]="card().actionLink"
        [queryParams]="card().actionQuery"
        [class]="cardClass(b)"
        class="relative block rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] hover:shadow-lg"
      >
        <!-- Gradient accent strip -->
        <div [class]="accentStripClass(b)" class="h-1"></div>

        <div class="p-5">
          <!-- Top row: badge + amount -->
          <div class="flex items-start justify-between gap-3 mb-4">
            <span [class]="badgeClass(b)"
                  class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg">
              <span [class]="dotClass(b)" class="w-2 h-2 rounded-full flex-shrink-0"></span>
              {{ card().badge }}
            </span>
            <div class="text-right">
              <span class="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                {{ b.total_amount | money }}
              </span>
            </div>
          </div>

          <!-- Title + date -->
          <h3 class="text-base font-bold text-slate-900 mb-1 leading-snug">{{ card().title }}</h3>
          <div class="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
            <ion-icon name="calendar-outline" class="text-slate-400 text-xs"></ion-icon>
            {{ rangeLabel(b) }}
          </div>

          <!-- CTA row -->
          @if (card().actionLabel) {
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <span class="text-sm text-slate-500">{{ card().subtitle }}</span>
              <span [class]="ctaClass(b)"
                    class="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors">
                {{ card().actionLabel }}
                <ion-icon name="arrow-forward" class="text-sm"></ion-icon>
              </span>
            </div>
          }
        </div>
      </a>
    }
  `,
})
export class BookingsFocusCardComponent {
  private readonly bookingUi = inject(BookingUiService);

  card = input.required<FocusCard>();
  role = input.required<BookingRole>();

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  cardClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToCardClass(color);
  }

  dotClass(booking: Booking): string {
    const ui = this.bookingUi.getUiState(booking, this.role());
    const pulse = ui.priority === 'urgent' ? ' animate-pulse' : '';
    return this.colorToDotClass(ui.color) + pulse;
  }

  badgeClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToBadgeBg(color);
  }

  accentStripClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToGradient(color);
  }

  ctaClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToCtaClass(color);
  }

  private colorToCardClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-50/80 border-amber-200/60';
      case 'red': return 'bg-red-50/80 border-red-200/60';
      case 'blue': return 'bg-blue-50/80 border-blue-200/60';
      case 'green': return 'bg-emerald-50/80 border-emerald-200/60';
      case 'purple': return 'bg-purple-50/80 border-purple-200/60';
      default: return 'bg-slate-50/80 border-slate-200/60';
    }
  }

  private colorToDotClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-emerald-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  }

  private colorToBadgeBg(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-100 text-amber-800';
      case 'red': return 'bg-red-100 text-red-800';
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'green': return 'bg-emerald-100 text-emerald-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  private colorToGradient(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-gradient-to-r from-amber-400 to-orange-400';
      case 'red': return 'bg-gradient-to-r from-red-400 to-rose-500';
      case 'blue': return 'bg-gradient-to-r from-blue-400 to-indigo-500';
      case 'green': return 'bg-gradient-to-r from-emerald-400 to-teal-500';
      case 'purple': return 'bg-gradient-to-r from-purple-400 to-violet-500';
      default: return 'bg-gradient-to-r from-slate-300 to-slate-400';
    }
  }

  private colorToCtaClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-600 text-white hover:bg-amber-700';
      case 'red': return 'bg-red-600 text-white hover:bg-red-700';
      case 'blue': return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'green': return 'bg-emerald-600 text-white hover:bg-emerald-700';
      case 'purple': return 'bg-purple-600 text-white hover:bg-purple-700';
      default: return 'bg-slate-700 text-white hover:bg-slate-800';
    }
  }
}
