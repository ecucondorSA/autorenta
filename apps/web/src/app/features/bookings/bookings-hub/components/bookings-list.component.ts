import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';
import { Booking } from '@core/models';
import { BookingUiService, BookingColorScheme, BookingRole } from '@core/services/bookings/booking-ui.service';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe, DateFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      @if (bookings().length === 0) {
        <!-- Empty State for filtered results -->
        <div class="py-12 flex flex-col items-center text-center animate-in fade-in duration-300">
          <div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <ion-icon name="search-outline" class="text-2xl text-slate-300"></ion-icon>
          </div>
          <p class="text-sm font-semibold text-slate-500">No encontramos reservas</p>
          <p class="text-xs text-slate-400">Intenta con otro filtro.</p>
        </div>
      } @else {
        <!-- Booking Cards -->
        @for (booking of bookings(); track booking.id) {
          <a
            [routerLink]="detailLink(booking)"
            class="group flex items-center gap-3.5 bg-white rounded-2xl p-3 border border-slate-100
                   shadow-sm hover:shadow-md hover:border-slate-200
                   active:scale-[0.98] transition-all duration-200 animate-in slide-in-from-bottom-2"
          >
            <!-- Thumbnail -->
            <div class="w-[72px] h-[72px] rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 ring-1 ring-slate-100 relative">
              <img
                [src]="booking.main_photo_url || '/assets/images/car-placeholder.png'"
                [alt]="booking.car_title || 'Auto'"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <!-- Status Dot Overlay -->
              <div class="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                   [class]="dotColor(booking)"></div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="text-sm font-bold text-slate-900 truncate leading-tight">
                  {{ booking.car_brand }} {{ booking.car_model }}
                </h3>
                <span class="text-xs font-extrabold text-slate-900 font-mono bg-slate-50 px-1.5 py-0.5 rounded-md">
                  {{ booking.total_amount | money: booking.currency }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <ion-icon name="calendar-outline" class="text-[10px]"></ion-icon>
                <span>{{ booking.start_at | dateFormat:'short' }} - {{ booking.end_at | dateFormat:'short' }}</span>
              </div>

              <div class="flex items-center justify-between">
                <!-- Status Badge -->
                <span [class]="statusBadgeClass(booking)"
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {{ statusLabel(booking) }}
                </span>
                
                <ion-icon name="chevron-forward" class="text-slate-300 text-xs"></ion-icon>
              </div>
            </div>
          </a>
        }
      }
    </div>
  `,
})
export class BookingsListComponent {
  private readonly bookingUi = inject(BookingUiService);

  bookings = input.required<Booking[]>();
  role = input.required<BookingRole>();

  detailLink(booking: Booking): string[] {
    return this.role() === 'owner'
      ? ['/bookings/owner', booking.id]
      : ['/bookings', booking.id];
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
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-emerald-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  }
}