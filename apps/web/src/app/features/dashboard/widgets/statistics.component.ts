import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-statistics-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="p-4 bg-white rounded shadow">
      <h2 class="text-lg font-medium mb-2">Estadísticas</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-gray-500">Reservas próximas</div>
          <div class="text-xl font-bold">3</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">Ingresos (30d)</div>
          <div class="text-xl font-bold">$ 42.350</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">Ocupación</div>
          <div class="text-xl font-bold">72%</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">Cancelaciones</div>
          <div class="text-xl font-bold">1</div>
        </div>
      </div>
    </section>
  `,
  styles: [``],
})
export class StatisticsWidgetComponent {
  // Signals / mock state — replace with real store/service integration
  data = signal({ upcoming: 3, income30d: 42350, occupancy: 72, cancellations: 1 });
}
