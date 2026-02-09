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
    <div class="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
      @for (action of actions(); track action.id) {
        <a
          [routerLink]="action.link"
          [queryParams]="action.query"
          class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium text-slate-700 whitespace-nowrap active:scale-95 transition-transform"
        >
          <ion-icon [name]="action.icon" class="text-slate-400"></ion-icon>
          {{ action.label }}
          @if (action.badge && action.badge > 0) {
            <span
              class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center"
            >
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
