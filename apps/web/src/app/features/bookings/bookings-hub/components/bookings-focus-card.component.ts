import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Booking } from '@core/models';
import { BookingUiService, BookingRole, BookingUiState } from '@core/services/bookings/booking-ui.service';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-bookings-focus-card',
  standalone: true,
  imports: [RouterLink, IonIcon, MoneyPipe, DateFormatPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (booking(); as b) {
      <div class="relative w-full overflow-hidden bg-white rounded-3xl shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 group transition-all hover:shadow-2xl">
        
        <!-- HERO IMAGE (Background) -->
        <div class="relative h-48 w-full">
          <img 
            [src]="b.main_photo_url || '/assets/images/car-placeholder.png'" 
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt="Car photo"
          />
          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
          
          <!-- Status Badge (Top Left) -->
          <div class="absolute top-4 left-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-sm"
                  [class]="ui().badgeClass + ' border-0 ring-1 ring-white/20 text-white bg-white/20'">
              <span class="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              {{ ui().labelShort }}
            </span>
          </div>

          <!-- Price (Top Right) -->
          <div class="absolute top-4 right-4">
            <div class="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur shadow-sm">
              <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</span>
              <span class="block text-sm font-black text-slate-900 leading-none">
                {{ b.total_amount | money: b.currency }}
              </span>
            </div>
          </div>

          <!-- Car Info (Bottom) -->
          <div class="absolute bottom-4 left-4 right-4 text-white">
            <h3 class="text-xl font-bold leading-tight mb-1 text-shadow-sm line-clamp-1">
              {{ b.car_brand }} {{ b.car_model }}
            </h3>
            <div class="flex items-center gap-2 text-sm text-slate-200 font-medium">
              <ion-icon name="calendar-outline"></ion-icon>
              <span>{{ b.start_at | dateFormat:'short' }} - {{ b.end_at | dateFormat:'short' }}</span>
            </div>
          </div>
        </div>

        <!-- ACTION BODY -->
        <div class="p-5 relative bg-white">
          
          <!-- Context/Hint -->
          <div class="flex gap-4 items-start mb-5">
            <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                 [class]="ui().iconBgClass">
              {{ ui().icon }}
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-0.5">{{ ui().label }}</h4>
              <p class="text-xs text-slate-500 leading-relaxed">{{ ui().hint }}</p>
            </div>
          </div>

          <!-- Countdown (Optional - e.g. for payments expiring) -->
          @if (isUrgentPayment(b) && b.expires_at) {
            <div class="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
              <div class="shrink-0 text-amber-500">
                <ion-icon name="time" class="text-lg"></ion-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Acción requerida</p>
                <p class="text-xs font-bold text-amber-800">Completá el pago antes del vencimiento</p>
              </div>
            </div>
          }

          <!-- PRIMARY ACTION -->
          @if (ui().primaryAction; as action) {
            <a [routerLink]="action.route"
               class="flex items-center justify-center w-full gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all"
               [class]="action.variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-900 hover:bg-slate-800'">
              {{ action.label }}
              <ion-icon [name]="action.icon" class="text-lg"></ion-icon>
            </a>
          } @else {
            <a [routerLink]="['/bookings', b.id]"
               class="flex items-center justify-center w-full gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all">
              Ver Detalle
              <ion-icon name="arrow-forward" class="text-lg"></ion-icon>
            </a>
          }

        </div>
      </div>
    }
  `
})
export class BookingsFocusCardComponent {
  private readonly uiService = inject(BookingUiService);

  booking = input.required<Booking | null>();
  role = input.required<BookingRole>();

  readonly ui = computed<BookingUiState>(() => {
    const b = this.booking();
    if (!b) return this.getEmptyState();
    return this.uiService.getUiState(b, this.role());
  });

  isUrgentPayment(b: Booking): boolean {
    return b.status === 'pending' && !!b.expires_at && !this.uiService.isStartDatePassed(b);
  }

  private getEmptyState(): BookingUiState {
    // Fallback just in case
    return {
      label: '', labelShort: '', hint: '', icon: '', ionIcon: '',
      color: 'slate', borderClass: '', badgeClass: '', iconBgClass: '', headerClass: '',
      priority: 'neutral', primaryAction: null, secondaryActions: []
    };
  }
}