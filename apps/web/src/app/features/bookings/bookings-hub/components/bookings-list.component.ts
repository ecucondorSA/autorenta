import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { Booking } from '@core/models';
import { FilterItem, BookingRole, BookingFilter } from '../bookings-hub.types';
import {
  getBookingDetailLink,
  getBookingStatusLabel,
  getStatusDotColor,
} from '../bookings-hub.utils';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <!-- FILTER PILLS -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        @for (f of filters(); track f.id) {
          <button
            (click)="onFilterChange(f.id)"
            [class]="currentFilter() === f.id
              ? 'px-4 py-2 rounded-full text-sm font-semibold bg-slate-900 text-white transition-all whitespace-nowrap'
              : 'px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-600 border border-slate-200 transition-all whitespace-nowrap'"
          >
            {{ f.label }}
            @if (f.count > 0) {
              <span class="ml-1 text-xs opacity-70">{{ f.count }}</span>
            }
          </button>
        }
      </div>

      <!-- BOOKING CARDS -->
      @if (bookings().length === 0) {
        <div class="py-12 flex flex-col items-center text-center">
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
              class="flex items-center gap-4 bg-white rounded-2xl p-3 border border-slate-100 active:scale-[0.98] transition-all"
            >
              <!-- Thumbnail -->
              <div class="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
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
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h3 class="text-sm font-bold text-slate-900 truncate">
                    {{ booking.car_title || 'Auto' }}
                  </h3>
                  <span class="text-sm font-bold text-slate-900 font-mono tabular-nums flex-shrink-0">
                    {{ booking.total_amount | money }}
                  </span>
                </div>

                <p class="text-xs text-slate-500 mb-2">
                  {{ rangeLabel(booking) }}
                </p>

                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span [class]="dotColor(booking)" class="w-1.5 h-1.5 rounded-full flex-shrink-0"></span>
                    {{ statusLabel(booking) }}
                  </span>
                  <ion-icon name="chevron-forward-outline" class="text-slate-300 text-sm"></ion-icon>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class BookingsListComponent {
  bookings = input.required<Booking[]>();
  filters = input.required<FilterItem[]>();
  currentFilter = input.required<BookingFilter>();
  role = input.required<BookingRole>();
  filterChange = output<BookingFilter>();

  onFilterChange(filter: BookingFilter): void {
    if (this.currentFilter() !== filter) {
      this.filterChange.emit(filter);
    }
  }

  detailLink(booking: Booking): string[] {
    return getBookingDetailLink(booking, this.role());
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    return getBookingStatusLabel(booking, this.role());
  }

  dotColor(booking: Booking): string {
    return getStatusDotColor(booking);
  }
}
