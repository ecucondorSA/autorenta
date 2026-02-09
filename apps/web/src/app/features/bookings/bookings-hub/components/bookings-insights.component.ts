import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { InsightItem } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-insights',
  standalone: true,
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-3 gap-3">
      @for (item of items(); track item.id; let i = $index) {
        <div class="group relative bg-white rounded-2xl p-4 border border-slate-100
                    hover:border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden">
          <!-- Subtle accent at top -->
          <div class="absolute top-0 left-0 right-0 h-0.5"
               [class]="accentClasses[i % 3]"></div>

          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                 [class]="iconBgClasses[i % 3]">
              <ion-icon [name]="item.icon" class="text-sm"></ion-icon>
            </div>
          </div>
          <p class="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{{ item.value }}</p>
          <p class="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{{ item.label }}</p>
        </div>
      }
    </div>
  `,
})
export class BookingsInsightsComponent {
  items = input.required<InsightItem[]>();

  readonly accentClasses = [
    'bg-gradient-to-r from-emerald-400 to-emerald-500',
    'bg-gradient-to-r from-amber-400 to-amber-500',
    'bg-gradient-to-r from-slate-300 to-slate-400',
  ];

  readonly iconBgClasses = [
    'bg-emerald-50 text-emerald-600',
    'bg-amber-50 text-amber-600',
    'bg-slate-50 text-slate-500',
  ];
}
