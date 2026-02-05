import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange } from '@shared/utils/date.utils';
import { Booking } from '@core/models';
import { FilterItem, BookingRole, BookingFilter } from '../bookings-hub.types';
import { getBookingDetailLink, getBookingStatusChipClass, getBookingStatusLabel } from '../bookings-hub.utils';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon, PressScaleDirective, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6 pt-4">
      <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-text-primary tracking-tight">Tus Reservas</h2>
          <p class="text-sm text-text-secondary mt-1">Gestioná todos tus movimientos</p>
        </div>
        
        <!-- FILTER TABS -->
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          @for (filterItem of filters(); track filterItem.id) {
            <button
              (click)="onFilterChange(filterItem.id)"
              [class.bg-text-primary]="currentFilter() === filterItem.id"
              [class.text-white]="currentFilter() === filterItem.id"
              [class.bg-surface-secondary]="currentFilter() !== filterItem.id"
              [class.text-text-muted]="currentFilter() !== filterItem.id"
              class="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap"
            >
              {{ filterItem.label }} ({{ filterItem.count }})
            </button>
          }
        </div>
      </header>

      @if (bookings().length === 0) {
        <!-- DEFENSIVE EMPTY STATE -->
        <div class="py-20 flex flex-col items-center justify-center text-center">
          <div class="w-24 h-24 text-text-muted/20 mb-6">
            <ion-icon name="car-sport-outline" class="text-8xl"></ion-icon>
          </div>
          <h3 class="text-xl font-black text-text-primary">No hay resultados</h3>
          <p class="text-sm text-text-secondary mt-2 max-w-xs mx-auto">Aún no tenés reservas que coincidan con estos criterios.</p>
          <button (click)="onFilterChange('all')" class="mt-6 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">
            Ver todas las reservas
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (booking of bookings(); track booking.id) {
            <article
              appPressScale
              [routerLink]="detailLink(booking)"
              class="group flex flex-col bg-white rounded-3xl border border-border-muted shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 overflow-hidden cursor-pointer"
            >
              <!-- Thumbnail Header -->
              <div class="relative h-48 w-full bg-surface-secondary overflow-hidden">
                @if (booking.main_photo_url) {
                  <img
                    [src]="booking.main_photo_url"
                    [alt]="booking.car_title || 'Auto'"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-text-muted/30">
                    <ion-icon name="car-sport-outline" class="text-6xl"></ion-icon>
                  </div>
                }
                <!-- Status Floating Badge -->
                <div class="absolute top-4 left-4">
                  <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-premium-sm border border-white/20"
                        [class]="statusChipClass(booking)">
                    {{ statusLabel(booking) }}
                  </span>
                </div>
              </div>

              <!-- Article Body -->
              <div class="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="text-lg font-black text-text-primary tracking-tight truncate">
                      {{ booking.car_title || 'Auto' }}
                    </h3>
                    <span class="text-sm font-black text-text-primary font-mono">{{ booking.total_amount | money }}</span>
                  </div>
                  <p class="text-xs text-text-secondary font-medium">{{ rangeLabel(booking) }}</p>
                  <p class="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-bold">
                    <ion-icon name="location-outline" class="mr-1"></ion-icon>
                    {{ booking.car_city || 'Ubicación' }}
                  </p>
                </div>

                <div class="pt-4 border-t border-border-muted flex items-center justify-between">
                  <div class="flex -space-x-2">
                      <!-- Avatars placeholder -->
                      <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-200"></div>
                      <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                        <ion-icon name="person-outline" class="text-[10px]"></ion-icon>
                      </div>
                  </div>
                  <button class="text-[10px] font-black uppercase tracking-widest text-cta-default group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Detalle <ion-icon name="chevron-forward-outline"></ion-icon>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `
})
export class BookingsListComponent {
  bookings = input.required<Booking[]>();
  filters = input.required<FilterItem[]>();
  currentFilter = input.required<BookingFilter>();
  role = input.required<BookingRole>();
  filterChange = output<BookingFilter>();

  onFilterChange(filter: BookingFilter) {
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

  statusChipClass(booking: Booking): string {
    return getBookingStatusChipClass(booking);
  }
}