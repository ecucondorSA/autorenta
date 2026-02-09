import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { BookingQuickAction } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-quick-actions',
  standalone: true,
  imports: [RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
      @for (action of actions(); track action.id) {
        <a
          [routerLink]="action.link"
          [queryParams]="action.query"
          class="relative flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-100 rounded-2xl
                 text-sm font-semibold text-slate-700 whitespace-nowrap shadow-sm
                 hover:shadow-md hover:border-slate-200 active:scale-[0.97] transition-all duration-200"
        >
          <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
            <ion-icon [name]="action.icon" class="text-lg text-slate-500"></ion-icon>
          </div>
          {{ action.label }}
          @if (action.badge && action.badge > 0) {
            <span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold
                         w-5 h-5 rounded-full flex items-center justify-center shadow-sm
                         ring-2 ring-white animate-pulse">
              {{ action.badge }}
            </span>
          }
        </a>
      }
    </div>
  `,
})
export class BookingsQuickActionsComponent {
  actions = input.required<BookingQuickAction[]>();
}
