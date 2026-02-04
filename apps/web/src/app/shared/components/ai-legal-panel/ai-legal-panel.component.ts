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
import { GeminiService } from '@core/services/ai/gemini.service';
import type { Booking, BookingTerms, Car, LegalAnswer, VehicleInfo } from '../../../core/models';

/**
 * Panel de Asistente Legal IA
 *
 * Permite a los usuarios hacer preguntas sobre los términos de uso.
 * Usa Google Gemini para generar respuestas basadas en el contexto.
 *
 * @example
 * ```html
 * <app-ai-legal-panel
 *   [booking]="booking()"
 *   [isExpanded]="expandedPanel() === 'legal'"
 *   (togglePanel)="togglePanel('legal')"
 * />
 * ```
 */
@Component({
  selector: 'app-ai-legal-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="relative group/panel">
      <!-- Animated gradient border when expanded -->
      @if (isExpanded()) {
        <div
          class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl opacity-75 blur-sm transition-opacity duration-500 animate-gradient-xy"
        ></div>
      }

      <!-- Main card -->
      <div
        class="relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
        [class.shadow-2xl]="isExpanded()"
      >
        <!-- Header -->
        <button
          type="button"
          class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
          (click)="togglePanel.emit()"
        >
          <div class="flex items-center gap-3">
            <!-- Icon with glow -->
            <div class="relative">
              @if (isExpanded()) {
                <div
                  class="absolute inset-0 bg-indigo-500/30 rounded-xl blur-md animate-pulse"
                ></div>
              }
              <div
                class="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300"
                [class.bg-gradient-to-br]="isExpanded()"
                [class.from-blue-500]="isExpanded()"
                [class.to-indigo-600]="isExpanded()"
                [class.bg-indigo-500/10]="!isExpanded()"
                [class.shadow-lg]="isExpanded()"
              >
                <svg
                  class="h-5 w-5 transition-colors"
                  [class.text-white]="isExpanded()"
                  [class.text-indigo-500]="!isExpanded()"
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
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                Asistente Legal
                <span
                  class="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                >
                  AI
                </span>
              </h3>
              <p class="text-xs text-gray-500">Consultas sobre terminos de uso</p>
            </div>
          </div>
          <svg
            class="h-5 w-5 text-gray-400 transition-transform duration-300"
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
          [class.overflow-y-auto]="isExpanded()"
        >
          <!-- Top gradient line -->
          <div class="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          <div class="p-5 space-y-4">
            <!-- Quick questions - Chat style bubbles -->
            <div>
              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Preguntas frecuentes
              </p>
              <div class="flex flex-wrap gap-2">
                @for (q of quickQuestions; track q) {
                  <button
                    type="button"
                    class="group/q relative overflow-hidden rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
                    (click)="askQuestion(q)"
                  >
                    {{ q }}
                  </button>
                }
              </div>
            </div>

            <!-- Chat-style input -->
            <div class="relative">
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <input
                    type="text"
                    id="legalQuestionInput"
                    name="legalQuestionInput"
                    [(ngModel)]="customQuestion"
                    placeholder="Escribe tu consulta legal..."
                    class="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    (keydown.enter)="askQuestion(customQuestion)"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <button
                  type="button"
                  class="relative overflow-hidden group/btn bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                  [disabled]="loading() || !customQuestion.trim()"
                  (click)="askQuestion(customQuestion)"
                >
                  @if (loading()) {
                    <div
                      class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                  <span>Consultar</span>
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"
                  ></div>
                </button>
              </div>
            </div>

            <!-- Loading State - Chat bubble style -->
            @if (loading()) {
              <div class="flex gap-3">
                <div
                  class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                >
                  <svg
                    class="w-4 h-4 text-white"
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
                <div
                  class="flex-1 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl rounded-tl-none p-4"
                >
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1">
                      <div
                        class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style="animation-delay: 0ms;"
                      ></div>
                      <div
                        class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style="animation-delay: 150ms;"
                      ></div>
                      <div
                        class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style="animation-delay: 300ms;"
                      ></div>
                    </div>
                    <span class="text-sm text-gray-600">Analizando tu consulta...</span>
                  </div>
                </div>
              </div>
            }

            <!-- Answer - Chat bubble style -->
            @if (answer()) {
              <div class="flex gap-3">
                <div class="relative">
                  <div
                    class="absolute inset-0 bg-indigo-500/30 rounded-full blur-md animate-pulse"
                  ></div>
                  <div
                    class="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                  >
                    <svg
                      class="w-4 h-4 text-white"
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
                </div>
                <div class="flex-1 space-y-3">
                  <!-- Main answer bubble -->
                  <div
                    class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl rounded-tl-none p-4 border border-indigo-100"
                  >
                    <p class="text-sm text-gray-800 leading-relaxed">{{ answer()!.answer }}</p>

                    @if (answer()!.sources.length > 0) {
                      <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-indigo-200/50">
                        <span class="text-xs text-gray-500 uppercase font-bold tracking-wider mr-1"
                          >Fuentes:</span
                        >
                        @for (source of answer()!.sources; track source) {
                          <span
                            class="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700"
                          >
                            <svg
                              class="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            {{ source }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <!-- Disclaimer -->
                  <div class="flex items-start gap-2 px-1">
                    <svg
                      class="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p class="text-xs italic text-gray-400">{{ answer()!.disclaimer }}</p>
                  </div>

                  <!-- Related questions -->
                  @if (answer()!.relatedQuestions?.length) {
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p
                        class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Preguntas relacionadas
                      </p>
                      <div class="flex flex-wrap gap-1.5">
                        @for (rq of answer()!.relatedQuestions; track rq) {
                          <button
                            type="button"
                            class="text-xs text-indigo-600 hover:text-indigo-800 hover:underline bg-white px-2 py-1 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                            (click)="askQuestion(rq)"
                          >
                            {{ rq }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Error State -->
            @if (error()) {
              <div class="flex gap-3">
                <div
                  class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div class="flex-1 bg-red-50 rounded-2xl rounded-tl-none p-4 border border-red-200">
                  <p class="text-sm text-red-700 font-medium">{{ error() }}</p>
                  <button
                    type="button"
                    class="mt-2 text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 hover:underline"
                    (click)="error.set(null)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes gradient-xy {
        0%,
        100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      .animate-gradient-xy {
        animation: gradient-xy 3s ease infinite;
        background-size: 200% 200%;
      }
    `,
  ],
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
  readonly togglePanel = output<void>();

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
    return (b?.car as Car | undefined) ?? null;
  });

  /** Computed: info del vehículo para mostrar en UI */
  readonly vehicleDisplay = computed(() => {
    const c = this.effectiveCar();
    const b = this.booking();
    const brand = c?.brand || b?.car_brand || '';
    const model = c?.model || b?.car_model || '';
    return `${brand} ${model}`.trim() || 'el vehículo';
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
