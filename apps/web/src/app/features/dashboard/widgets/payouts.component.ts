import { CommonModule } from '@angular/common';
import {Component,
  ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-payouts-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="p-4 bg-white rounded shadow">
      <h2 class="text-lg font-medium mb-2">Ganancias y Payouts</h2>
      <div class="text-sm text-gray-500">Saldo disponible</div>
      <div class="text-2xl font-bold mb-2">$ 12.760</div>
      <button class="px-3 py-2 bg-blue-600 text-white rounded">Solicitar pago</button>
    </section>
  `,
})
export class PayoutsWidgetComponent {}
