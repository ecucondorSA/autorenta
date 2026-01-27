import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface SummaryData {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  location: {
    city: string;
    state: string;
  };
  photosCount: number;
  isDynamicPricing: boolean;
}

/**
 * Summary question - final review before publish
 * Shows all collected data in a card format
 */
@Component({
  selector: 'app-summary-question',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Vehicle Card Preview -->
      <div class="bg-surface-raised border border-border-default rounded-2xl overflow-hidden shadow-lg">
        <!-- Photo placeholder -->
        <div class="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 relative">
          @if (data().photosCount > 0) {
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm text-slate-500 mt-2">{{ data().photosCount }} fotos cargadas</p>
              </div>
            </div>
          }

          <!-- Price badge -->
          <div class="absolute top-4 right-4 px-4 py-2 bg-black/70 backdrop-blur-sm text-white rounded-lg">
            <span class="text-lg font-bold">US$ {{ data().price }}</span>
            <span class="text-sm opacity-80">/día</span>
          </div>

          <!-- Dynamic pricing badge -->
          @if (data().isDynamicPricing) {
            <div class="absolute top-4 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
              PRECIO DINÁMICO
            </div>
          }
        </div>

        <!-- Details -->
        <div class="p-5">
          <h3 class="text-xl font-bold text-text-primary">
            {{ data().brand }} {{ data().model }}
          </h3>
          <p class="text-text-secondary mt-1">{{ data().year }} • {{ formatMileage(data().mileage) }} km</p>

          <div class="flex items-center gap-2 mt-3 text-sm text-text-muted">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>{{ data().location.city }}, {{ data().location.state }}</span>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div class="bg-surface-raised border border-border-default rounded-xl p-5">
        <h4 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Resumen de tu publicación
        </h4>
        <ul class="space-y-3">
          @for (item of checklistItems(); track item.label) {
            <li class="flex items-center gap-3">
              @if (item.valid) {
                <div class="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              } @else {
                <div class="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01" />
                  </svg>
                </div>
              }
              <div class="flex-1">
                <span class="text-sm font-medium text-text-primary">{{ item.label }}</span>
                <span class="text-sm text-text-muted ml-2">{{ item.value }}</span>
              </div>
              <button
                type="button"
                (click)="editField.emit(item.field)"
                class="text-cta-default hover:underline text-sm"
              >
                Editar
              </button>
            </li>
          }
        </ul>
      </div>

      <!-- Defaults applied notice -->
      <div class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-800 dark:text-blue-300">
            Configuración automática aplicada
          </p>
          <p class="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Aplicamos las configuraciones más populares: 200 km/día de límite, política de combustible lleno a lleno,
            depósito de US$ 200. Podés cambiar esto después en tu panel de propietario.
          </p>
        </div>
      </div>

      <!-- Earnings reminder -->
      <div class="text-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
        <p class="text-sm text-emerald-800 dark:text-emerald-300">
          Ganancia estimada:
          <span class="font-bold">US$ {{ monthlyEarnings() }}/mes</span>
          <span class="text-emerald-600 dark:text-emerald-400">(50% ocupación)</span>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class SummaryQuestionComponent {
  readonly data = input.required<SummaryData>();
  readonly editField = output<string>();

  readonly checklistItems = computed(() => {
    const d = this.data();
    return [
      { field: 'vehicle', label: 'Vehículo', value: `${d.brand} ${d.model} ${d.year}`, valid: true },
      { field: 'photos', label: 'Fotos', value: `${d.photosCount} fotos`, valid: d.photosCount >= 3 },
      { field: 'mileage', label: 'Kilometraje', value: `${this.formatMileage(d.mileage)} km`, valid: d.mileage > 0 },
      { field: 'price', label: 'Precio', value: `US$ ${d.price}/día`, valid: d.price >= 10 },
      { field: 'location', label: 'Ubicación', value: `${d.location.city}`, valid: !!d.location.city },
    ];
  });

  readonly monthlyEarnings = computed(() => {
    const price = this.data().price;
    // Modelo Comodato: 70% va al pool de rewards, 50% ocupación, 4 semanas
    return Math.round(price * 0.70 * 3.5 * 4);
  });

  formatMileage(value: number): string {
    return value.toLocaleString('es-AR');
  }
}
