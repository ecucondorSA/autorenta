import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Booking } from '@core/models';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { FocusCard, BookingRole } from '../bookings-hub.types';
import { getBookingStatusTone } from '../bookings-hub.utils';

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
        class="block rounded-2xl p-4 border transition-all active:scale-[0.98]"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold">
            <span [class]="dotClass(b)" class="w-2 h-2 rounded-full"></span>
            {{ card().badge }}
          </span>
          <span class="text-lg font-bold text-slate-900 font-mono tabular-nums">
            {{ b.total_amount | money }}
          </span>
        </div>

        <h3 class="text-base font-bold text-slate-900 mb-1">{{ card().title }}</h3>
        <p class="text-sm text-slate-500 mb-3">{{ rangeLabel(b) }}</p>

        @if (card().actionLabel) {
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-500">{{ card().subtitle }}</span>
            <span class="text-sm font-semibold text-slate-900 flex items-center gap-1">
              {{ card().actionLabel }}
              <ion-icon name="chevron-forward-outline" class="text-xs"></ion-icon>
            </span>
          </div>
        }
      </a>
    }
  `,
})
export class BookingsFocusCardComponent {
  card = input.required<FocusCard>();
  role = input.required<BookingRole>();

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  cardClass(booking: Booking): string {
    const tone = getBookingStatusTone(booking);
    switch (tone) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'danger': return 'bg-red-50 border-red-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      case 'success': return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  }

  dotClass(booking: Booking): string {
    const tone = getBookingStatusTone(booking);
    switch (tone) {
      case 'warning': return 'bg-amber-500 animate-pulse';
      case 'danger': return 'bg-red-500 animate-pulse';
      case 'info': return 'bg-blue-500';
      case 'success': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  }
}
