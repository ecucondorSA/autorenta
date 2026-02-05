import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { BookingQuickAction } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon, PressScaleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      @for (action of actions(); track action.id) {
        <a
          [routerLink]="action.link"
          [queryParams]="action.query"
          appPressScale
          class="flex items-center justify-between p-5 bg-white rounded-2xl border border-border-muted shadow-premium-sm hover:shadow-premium-md transition-all group"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-cta-default group-hover:text-cta-text transition-colors">
              <ion-icon [name]="action.icon" class="text-xl"></ion-icon>
            </div>
            <span class="text-sm font-black text-text-primary">{{ action.label }}</span>
          </div>
          @if (action.badge && action.badge > 0) {
            <span class="bg-cta-default text-cta-text text-[10px] font-black px-2 py-1 rounded-lg animate-pulse">
              {{ action.badge }}
            </span>
          } @else {
            <ion-icon name="chevron-forward-outline" class="text-text-muted group-hover:translate-x-1 transition-transform"></ion-icon>
          }
        </a>
      }
    </section>
  `
})
export class BookingsQuickActionsComponent {
  actions = input.required<BookingQuickAction[]>();
}
