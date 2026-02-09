import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { InsightItem } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-insights',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-3">
      @for (item of items(); track item.id) {
        <div class="flex-1 bg-white rounded-xl p-3 border border-slate-100">
          <p class="text-2xl font-bold text-slate-900 tabular-nums">{{ item.value }}</p>
          <p class="text-xs text-slate-500 mt-0.5">{{ item.label }}</p>
        </div>
      }
    </div>
  `,
})
export class BookingsInsightsComponent {
  items = input.required<InsightItem[]>();
}
