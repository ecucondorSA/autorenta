import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Booking, Car, TripItinerary, TripPreferences } from '../../../core/models';
import { GeminiService } from '@core/services/ai/gemini.service';

/**
 * Panel de Planificador de Viajes IA
 *
 * Genera itinerarios de viaje personalizados basados en la duracion
 * del alquiler, ubicacion y preferencias del usuario.
 *
 * @example
 * ```html
 * <app-ai-trip-panel
 *   [booking]="booking()"
 *   [isExpanded]="expandedPanel() === 'trip'"
 *   (togglePanel)="togglePanel('trip')"
 * />
 * ```
 */
@Component({
  selector: 'app-ai-trip-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="ai-panel border-b border-border-muted last:border-b-0">
      <!-- Header -->
      <button
        type="button"
        class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-base/50"
        (click)="togglePanel.emit()"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10">
            <svg
              class="h-4 w-4 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-text-primary">Planificador de Viaje</h3>
            <p class="text-xs text-text-secondary">
              Genera un itinerario para {{ rentalDays() }} dias
            </p>
          </div>
        </div>
        <svg
          class="h-5 w-5 text-text-muted transition-transform"
          [class.rotate-180]="isExpanded()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Content -->
      <div
        class="overflow-hidden transition-all duration-300"
        [class.max-h-0]="!isExpanded()"
        [class.max-h-[800px]]="isExpanded()"
        [class.overflow-y-auto]="isExpanded()"
      >
        <div class="space-y-4 px-4 pb-4">
          <!-- Config form -->
          @if (!itinerary()) {
            <div class="space-y-3">
              <!-- Days -->
              <div>
                <label for="tripDaysSelect" class="mb-1 block text-xs font-medium text-text-secondary">
                  Duracion del viaje
                </label>
                <select
                  id="tripDaysSelect"
                  name="tripDaysSelect"
                  [(ngModel)]="selectedDays"
                  class="w-full rounded-lg border border-border-muted bg-surface-base px-3 py-2 text-sm"
                >
                  @for (d of daysOptions; track d) {
                    <option [value]="d">{{ d }} {{ d === 1 ? 'dia' : 'dias' }}</option>
                  }
                </select>
              </div>

              <!-- Start Location -->
              <div>
                <label for="tripStartLocation" class="mb-1 block text-xs font-medium text-text-secondary">
                  Punto de partida
                </label>
                <input
                  type="text"
                  id="tripStartLocation"
                  name="tripStartLocation"
                  [(ngModel)]="startLocation"
                  class="w-full rounded-lg border border-border-muted bg-surface-base px-3 py-2 text-sm"
                  [placeholder]="defaultLocation()"
                />
              </div>

              <!-- Preferences -->
              <div>
                <label class="mb-2 block text-xs font-medium text-text-secondary">
                  Intereses (opcional)
                </label>
                <div class="flex flex-wrap gap-2">
                  @for (interest of interestOptions; track interest) {
                    <button
                      type="button"
                      class="rounded-full border px-3 py-1 text-xs transition-colors"
                      [class.border-cta-default]="selectedInterests.includes(interest)"
                      [class.bg-cta-default/10]="selectedInterests.includes(interest)"
                      [class.text-cta-default]="selectedInterests.includes(interest)"
                      [class.border-border-muted]="!selectedInterests.includes(interest)"
                      (click)="toggleInterest(interest)"
                    >
                      {{ interest }}
                    </button>
                  }
                </div>
              </div>

              <!-- Generate button -->
              <button
                type="button"
                class="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="loading()"
                (click)="generateItinerary()"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generando itinerario...
                  </span>
                } @else {
                  Generar Itinerario
                }
              </button>
            </div>
          }

          <!-- Itinerary result -->
          @if (itinerary()) {
            <div class="space-y-4">
              <!-- Summary -->
              <div
                class="flex items-center justify-between rounded-lg bg-indigo-500/10 p-3 text-sm"
              >
                <span class="text-indigo-700">
                  {{ itinerary()!.totalDays }} dias - {{ itinerary()!.totalKm }} km aprox.
                </span>
                <button
                  type="button"
                  class="text-xs text-indigo-600 hover:underline"
                  (click)="itinerary.set(null)"
                >
                  Regenerar
                </button>
              </div>

              <!-- Days -->
              @for (day of itinerary()!.days; track day.dayNumber) {
                <div class="rounded-lg border border-border-muted bg-surface-base p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <h4 class="font-semibold text-text-primary">
                      Dia {{ day.dayNumber }}: {{ day.title }}
                    </h4>
                    <span class="text-xs text-text-muted">{{ day.estimatedKm }} km</span>
                  </div>

                  <div class="space-y-2">
                    @for (activity of day.activities; track activity.time) {
                      <div class="flex gap-3 text-sm">
                        <span class="w-12 flex-shrink-0 font-medium text-text-secondary">
                          {{ activity.time }}
                        </span>
                        <div>
                          <p class="text-text-primary">{{ activity.activity }}</p>
                          <p class="text-xs text-text-muted">
                            {{ activity.location }} - {{ activity.duration }}
                          </p>
                        </div>
                      </div>
                    }
                  </div>

                  @if (day.overnightLocation) {
                    <div class="mt-2 border-t border-border-muted pt-2 text-xs text-text-muted">
                      Pernocte: {{ day.overnightLocation }}
                    </div>
                  }
                </div>
              }

              <!-- Tips -->
              @if (itinerary()!.tips.length > 0) {
                <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <h4 class="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Tips para el viaje
                  </h4>
                  <ul class="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                    @for (tip of itinerary()!.tips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Warnings -->
              @if (itinerary()!.warnings?.length) {
                <div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <h4 class="mb-2 text-xs font-semibold text-red-700 dark:text-red-400">
                    Advertencias
                  </h4>
                  <ul class="space-y-1 text-xs text-red-800 dark:text-red-300">
                    @for (warning of itinerary()!.warnings; track warning) {
                      <li>{{ warning }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (error()) {
            <div class="rounded-lg bg-error-bg p-3 text-sm text-error-strong">
              {{ error() }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AiTripPanelComponent {
  private readonly gemini = inject(GeminiService);

  /** Booking (opcional si se provee car) */
  readonly booking = input<Booking | null>(null);

  /** Car directo (opcional si se provee booking) */
  readonly car = input<Car | null>(null);

  /** Dias sugeridos para el trip (opcional, para car-detail) */
  readonly suggestedDays = input<number | null>(null);

  readonly isExpanded = input<boolean>(false);
  readonly togglePanel = output<void>();

  // State
  readonly itinerary = signal<TripItinerary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Form state
  selectedDays = 3;
  startLocation = '';
  selectedInterests: string[] = [];

  readonly daysOptions = [1, 2, 3, 4, 5, 6, 7, 10, 14];
  readonly interestOptions = [
    'Playas',
    'Montanas',
    'Gastronomia',
    'Naturaleza',
    'Historia',
    'Ciudades',
    'Vinos',
    'Aventura',
  ];

  readonly rentalDays = computed(() => {
    const suggested = this.suggestedDays();
    if (suggested) return suggested;

    const b = this.booking();
    if (!b?.start_at || !b?.end_at) return 3; // Default 3 days
    const start = new Date(b.start_at);
    const end = new Date(b.end_at);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 3;
  });

  readonly defaultLocation = computed(() => {
    const c = this.car();
    if (c?.location_city) return c.location_city;
    const b = this.booking();
    return b?.car_city || b?.car?.location_city || 'Buenos Aires';
  });

  /** Computed: obtiene el tipo de vehiculo */
  private readonly vehicleType = computed(() => {
    const c = this.car();
    const b = this.booking();
    const brand = c?.brand || b?.car_brand || '';
    const model = c?.model || b?.car_model || '';
    return `${brand} ${model}`.trim() || 'Auto';
  });

  toggleInterest(interest: string): void {
    if (this.selectedInterests.includes(interest)) {
      this.selectedInterests = this.selectedInterests.filter((i) => i !== interest);
    } else {
      this.selectedInterests = [...this.selectedInterests, interest];
    }
  }

  async generateItinerary(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.itinerary.set(null);

    try {
      const preferences: TripPreferences = {
        interests: this.selectedInterests.length > 0 ? this.selectedInterests : undefined,
        budget: 'moderado',
      };

      const result = await this.gemini.generateTripItinerary({
        days: this.selectedDays || this.rentalDays(),
        startLocation: this.startLocation || this.defaultLocation(),
        vehicleType: this.vehicleType(),
        preferences,
      });

      this.itinerary.set(result);
    } catch {
      this.error.set('No pudimos generar el itinerario. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
