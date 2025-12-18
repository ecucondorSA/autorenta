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
import type { Booking, BookingTerms, Car, LegalAnswer, VehicleInfo } from '../../../core/models';
import { GeminiService } from '../../../core/services/gemini.service';

/**
 * Panel de Asistente Legal IA
 *
 * Permite a los usuarios hacer preguntas sobre los terminos del alquiler.
 * Usa Google Gemini para generar respuestas basadas en el contexto.
 *
 * @example
 * ```html
 * <app-ai-legal-panel
 *   [booking]="booking()"
 *   [isExpanded]="expandedPanel() === 'legal'"
 *   (toggle)="togglePanel('legal')"
 * />
 * ```
 */
@Component({
  selector: 'app-ai-legal-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="ai-panel border-b border-border-muted last:border-b-0">
      <!-- Header (clickable to expand) -->
      <button
        type="button"
        class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-base/50"
        (click)="toggle.emit()"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-cta-default/10">
            <svg
              class="h-4 w-4 text-cta-default"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-text-primary">Asistente Legal</h3>
            <p class="text-xs text-text-secondary">Consultas sobre terminos del alquiler</p>
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

      <!-- Content (expandable) -->
      <div
        class="overflow-hidden transition-all duration-300"
        [class.max-h-0]="!isExpanded()"
        [class.max-h-[600px]]="isExpanded()"
      >
        <div class="space-y-4 px-4 pb-4">
          <!-- Quick questions -->
          <div class="flex flex-wrap gap-2">
            @for (q of quickQuestions; track q) {
              <button
                type="button"
                class="rounded-full border border-border-muted bg-surface-base px-3 py-1.5 text-xs transition-colors hover:border-cta-default/40 hover:bg-cta-default/5"
                (click)="askQuestion(q)"
              >
                {{ q }}
              </button>
            }
          </div>

          <!-- Custom question input -->
          <div class="flex gap-2">
            <input
              type="text"
              [(ngModel)]="customQuestion"
              placeholder="Escribe tu pregunta..."
              class="flex-1 rounded-lg border border-border-muted bg-surface-base px-3 py-2 text-sm focus:border-cta-default focus:outline-none"
              (keydown.enter)="askQuestion(customQuestion)"
            />
            <button
              type="button"
              class="rounded-lg bg-cta-default px-4 py-2 text-sm font-medium text-cta-text disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="loading() || !customQuestion.trim()"
              (click)="askQuestion(customQuestion)"
            >
              Preguntar
            </button>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div class="flex items-center gap-2 text-text-secondary">
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
              <span class="text-sm">Consultando...</span>
            </div>
          }

          <!-- Answer -->
          @if (answer()) {
            <div class="space-y-3 rounded-lg bg-surface-base p-4">
              <p class="text-sm text-text-primary">{{ answer()!.answer }}</p>

              @if (answer()!.sources.length > 0) {
                <div class="flex flex-wrap gap-1">
                  @for (source of answer()!.sources; track source) {
                    <span class="rounded bg-cta-default/10 px-2 py-0.5 text-xs text-cta-default">
                      {{ source }}
                    </span>
                  }
                </div>
              }

              <p class="text-xs italic text-text-muted">{{ answer()!.disclaimer }}</p>

              @if (answer()!.relatedQuestions?.length) {
                <div class="border-t border-border-muted pt-2">
                  <p class="mb-2 text-xs text-text-muted">Preguntas relacionadas:</p>
                  <div class="flex flex-wrap gap-1">
                    @for (rq of answer()!.relatedQuestions; track rq) {
                      <button
                        type="button"
                        class="text-xs text-cta-default hover:underline"
                        (click)="askQuestion(rq)"
                      >
                        {{ rq }}
                      </button>
                    }
                  </div>
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
export class AiLegalPanelComponent {
  private readonly gemini = inject(GeminiService);

  /** Booking actual (opcional si se provee car) */
  readonly booking = input<Booking | null>(null);

  /** Car directo (opcional si se provee booking) */
  readonly car = input<Car | null>(null);

  /** Si el panel esta expandido */
  readonly isExpanded = input<boolean>(false);

  /** Evento de toggle */
  readonly toggle = output<void>();

  // State
  readonly answer = signal<LegalAnswer | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  customQuestion = '';

  readonly quickQuestions = [
    'Cual es la franquicia del seguro?',
    'Que pasa si excedo los kilometros?',
    'Puedo viajar a otra provincia?',
    'Como es la politica de combustible?',
  ];

  /** Computed: obtiene el car desde booking o directamente */
  private readonly effectiveCar = computed(() => {
    const c = this.car();
    if (c) return c;
    const b = this.booking();
    return b?.car as Car | undefined ?? null;
  });

  /** Computed: info del vehiculo para mostrar en UI */
  readonly vehicleDisplay = computed(() => {
    const c = this.effectiveCar();
    const b = this.booking();
    const brand = c?.brand || b?.car_brand || '';
    const model = c?.model || b?.car_model || '';
    return `${brand} ${model}`.trim() || 'el vehiculo';
  });

  async askQuestion(question: string): Promise<void> {
    if (!question.trim()) return;

    const c = this.effectiveCar();
    const b = this.booking();

    this.loading.set(true);
    this.error.set(null);
    this.answer.set(null);

    try {
      const bookingTerms: BookingTerms = {
        cancellationPolicy: c?.cancel_policy || 'moderate',
        mileageLimit: c?.mileage_limit ?? null,
        extraKmPrice: c?.extra_km_price ?? null,
        fuelPolicy: c?.fuel_policy ?? null,
        allowedProvinces: c?.allowed_provinces ?? null,
        maxDistanceKm: c?.max_distance_km ?? null,
        insuranceDeductibleUsd: c?.insurance_deductible_usd ?? null,
        allowSecondDriver: c?.allow_second_driver ?? null,
        secondDriverCost: c?.second_driver_cost ?? null,
        allowSmoking: c?.allow_smoking ?? null,
        allowPets: c?.allow_pets ?? null,
        allowRideshare: c?.allow_rideshare ?? null,
      };

      const vehicleInfo: VehicleInfo = {
        brand: c?.brand || b?.car_brand || '',
        model: c?.model || b?.car_model || '',
        year: c?.year || b?.car_year || new Date().getFullYear(),
      };

      const result = await this.gemini.askLegalQuestion({
        question: question.trim(),
        bookingTerms,
        vehicleInfo,
      });

      this.answer.set(result);
      this.customQuestion = '';
    } catch {
      this.error.set('No pudimos procesar tu consulta. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
