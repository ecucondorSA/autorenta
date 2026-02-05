import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { formatDateRange, formatRelativeTime } from '@shared/utils/date.utils';
import { FocusCard, BookingRole } from '../bookings-hub.types';
import { Booking } from '@core/models';

@Component({
  selector: 'app-bookings-focus-card',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon, PressScaleDirective, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
          <ion-icon name="flash-outline" class="text-cta-default"></ion-icon>
          En Foco
        </h2>
      </div>

      @if (card().booking; as focusBooking) {
        <div 
          appPressScale
          [routerLink]="card().actionLink"
          [queryParams]="card().actionQuery"
          class="group relative overflow-hidden rounded-3xl border border-border-muted bg-white shadow-premium-md hover:shadow-premium-lg transition-all duration-500 p-6 sm:p-8 cursor-pointer"
        >
          <!-- Cinematic Background Pattern -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl"></div>
          
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-4 max-w-xl">
              <span 
                class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                [class]="card().toneClass"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                {{ card().badge }}
              </span>
              
              <div>
                <h3 class="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight">
                  {{ card().title }}
                </h3>
                <p class="text-text-secondary font-medium mt-1">{{ card().subtitle }}</p>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-text-muted">
                <div class="flex items-center gap-1.5">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>{{ rangeLabel(focusBooking) }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <ion-icon name="time-outline"></ion-icon>
                  <span>{{ timelineLabel(focusBooking) }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-start md:items-end gap-4">
              <div class="text-3xl font-black text-text-primary font-mono tracking-tighter">
                {{ focusBooking.total_amount | money }}
              </div>
              <button class="w-full md:w-auto px-6 py-3 bg-cta-default text-cta-text rounded-2xl font-black text-sm shadow-premium-hover hover:bg-cta-hover transition-all">
                {{ card().actionLabel }}
              </button>
            </div>
          </div>
        </div>
      } @else {
        <!-- EMPTY STATE FOCUS -->
        <div class="rounded-3xl border border-dashed border-border-muted bg-surface-secondary/30 p-12 text-center flex flex-col items-center">
          <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-premium-sm mb-4">
            <ion-icon name="shield-checkmark-outline" class="text-3xl text-emerald-500"></ion-icon>
          </div>
          <h3 class="text-lg font-black text-text-primary tracking-tight">Todo en orden</h3>
          <p class="text-sm text-text-secondary mt-1 max-w-xs">No hay tareas urgentes en este momento. Te avisaremos si algo requiere tu atención.</p>
          @if (role() === 'renter') {
            <a routerLink="/marketplace" class="mt-6 text-cta-default font-black text-xs uppercase tracking-widest hover:underline">
              Explorar Autos →
            </a>
          }
        </div>
      }
    </section>
  `
})
export class BookingsFocusCardComponent {
  card = input.required<FocusCard>();
  role = input.required<BookingRole>();

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  timelineLabel(booking: Booking): string {
    const moment = booking.status === 'in_progress' ? booking.end_at : (booking.start_at ?? null);
    if (!moment) return 'Sin fecha';
    return formatRelativeTime(moment);
  }
}
