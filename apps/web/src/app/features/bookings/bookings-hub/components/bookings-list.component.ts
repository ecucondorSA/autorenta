import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { Booking } from '@core/models';
import { BookingUiService, BookingColorScheme } from '@core/services/bookings/booking-ui.service';
import { FilterItem, BookingRole, BookingFilter } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <!-- FILTER PILLS -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        @for (f of filters(); track f.id) {
          <button
            (click)="onFilterChange(f.id)"
            [class]="currentFilter() === f.id
              ? 'px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-md shadow-slate-900/20 transition-all whitespace-nowrap'
              : 'px-4 py-2 rounded-xl text-sm font-medium bg-white text-slate-500 border border-slate-100 hover:border-slate-200 transition-all whitespace-nowrap'"
          >
            {{ f.label }}
            @if (f.count > 0) {
              <span [class]="currentFilter() === f.id
                ? 'ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-bold'
                : 'ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold'">
                {{ f.count }}
              </span>
            }
          </button>
        }
      </div>

      <!-- BOOKING CARDS -->
      @if (bookings().length === 0) {
        <div class="py-16 flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <ion-icon name="search-outline" class="text-3xl text-slate-300"></ion-icon>
          </div>
          <p class="text-sm font-medium text-slate-400 mb-1">Sin resultados</p>
          <p class="text-xs text-slate-300 mb-4">No hay reservas para este filtro</p>
          <button
            (click)="onFilterChange('all')"
            class="text-sm font-bold text-slate-900 bg-slate-100 px-4 py-2 rounded-xl
                   hover:bg-slate-200 active:scale-95 transition-all"
          >
            Ver todas
          </button>
        </div>
      } @else {
        <div class="space-y-3">
          @for (booking of bookings(); track booking.id) {
            <a
              [routerLink]="detailLink(booking)"
              class="group flex items-center gap-3.5 bg-white rounded-2xl p-3 border border-slate-100
                     shadow-sm hover:shadow-md hover:border-slate-200
                     active:scale-[0.98] transition-all duration-200"
            >
              <!-- Thumbnail -->
              <div class="w-[72px] h-[72px] rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 ring-1 ring-slate-100">
                @if (booking.main_photo_url) {
                  <img
                    [src]="booking.main_photo_url"
                    [alt]="booking.car_title || 'Auto'"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                } @else {
                  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <ion-icon name="car-sport-outline" class="text-2xl text-slate-300"></ion-icon>
                  </div>
                }
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <h3 class="text-sm font-bold text-slate-900 truncate leading-tight">
                    {{ booking.car_title || 'Auto' }}
                  </h3>
                  <span class="text-sm font-extrabold text-slate-900 font-mono tabular-nums flex-shrink-0">
                    {{ booking.total_amount | money }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                  <ion-icon name="calendar-outline" class="text-[11px]"></ion-icon>
                  {{ rangeLabel(booking) }}
                </div>

                <div class="flex items-center justify-between">
                  <span [class]="statusBadgeClass(booking)"
                        class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    <span [class]="dotColor(booking)" class="w-1.5 h-1.5 rounded-full flex-shrink-0"></span>
                    {{ statusLabel(booking) }}
                  </span>
                  <ion-icon name="chevron-forward-outline"
                           class="text-slate-300 text-sm group-hover:text-slate-500 transition-colors"></ion-icon>
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
  private readonly bookingUi = inject(BookingUiService);

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
    return this.role() === 'owner'
      ? ['/bookings/owner', booking.id]
      : ['/bookings', booking.id];
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    return this.bookingUi.getUiState(booking, this.role()).labelShort;
  }

  statusBadgeClass(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToBadgeClass(color);
  }

  dotColor(booking: Booking): string {
    const color = this.bookingUi.getUiState(booking, this.role()).color;
    return this.colorToDotClass(color);
  }

  private colorToBadgeClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-50 text-amber-700';
      case 'red': return 'bg-red-50 text-red-700';
      case 'blue': return 'bg-blue-50 text-blue-700';
      case 'green': return 'bg-emerald-50 text-emerald-700';
      case 'purple': return 'bg-purple-50 text-purple-700';
      default: return 'bg-slate-50 text-slate-600';
    }
  }

  private colorToDotClass(color: BookingColorScheme): string {
    switch (color) {
      case 'amber': return 'bg-amber-400';
      case 'red': return 'bg-red-400';
      case 'blue': return 'bg-blue-400';
      case 'green': return 'bg-emerald-400';
      case 'purple': return 'bg-purple-400';
      default: return 'bg-slate-400';
    }
  }
}
