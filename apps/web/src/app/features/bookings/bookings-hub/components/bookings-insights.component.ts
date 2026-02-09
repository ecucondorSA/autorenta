import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { InsightItem } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-insights',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-3">
      @for (item of items(); track item.id) {
        <div class="flex-1 bg-white rounded-2xl p-3.5 border border-slate-100/80 shadow-sm">
          @if (item.type === 'money') {
            <p class="text-xl font-bold text-slate-900 font-mono tabular-nums">{{ +item.value | money }}</p>
          } @else {
            <p class="text-2xl font-bold text-slate-900 font-mono tabular-nums">{{ item.value }}</p>
          }
          <p class="text-xs text-slate-500 mt-0.5">{{ item.label }}</p>
        </div>
      }
    </div>
  `,
})
export class BookingsInsightsComponent {
  items = input.required<InsightItem[]>();
}
