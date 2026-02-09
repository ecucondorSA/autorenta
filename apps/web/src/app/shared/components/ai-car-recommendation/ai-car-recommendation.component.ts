import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService } from '@core/services/ai/gemini.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { CarRecommendation } from '@core/models/gemini.model';

const CACHE_KEY = 'ai_car_recommendation';
const CACHE_DURATION_HOURS = 24;

/**
 * AiCarRecommendationComponent
 *
 * AI-powered car recommendation card based on user's rental history.
 * Lazy-loads on user action to save API costs.
 * Results are cached in localStorage for 24 hours.
 *
 * @example
 * ```html
 * <app-ai-car-recommendation />
 * ```
 */
@Component({
  selector: 'app-ai-car-recommendation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="relative group">
      <!-- Subtle gradient border -->
      <div
        class="absolute -inset-px bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"
      ></div>

      <!-- Main card -->
      <div class="relative bg-white rounded-xl shadow-lg overflow-hidden">
        <!-- Header with AI indicator (compact) -->
        <div class="relative px-3 py-2 border-b border-gray-100">
          <div
            class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
          ></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <!-- AI Icon with glow -->
              <div class="relative">
                <div class="absolute inset-0 bg-orange-500/20 rounded-lg blur-sm"></div>
                <div
                  class="relative w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow"
                >
                  <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 text-sm">Sugerencia para Vos</h3>
                <p class="text-xs text-gray-500">Basado en tu historial</p>
              </div>
            </div>

            <!-- AI Badge -->
            <span
              class="text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
            >
              AI
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-3">
          <!-- Loading State -->
          @if (loading()) {
            <div class="py-3">
              <div class="flex items-center justify-center gap-2 mb-3">
                <div
                  class="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"
                ></div>
                <span class="text-xs font-medium text-gray-700">Analizando...</span>
              </div>
              <div class="space-y-2">
                <div
                  class="h-10 bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 rounded-lg animate-shimmer bg-[length:200%_100%]"
                ></div>
              </div>
            </div>
          }

          <!-- Error State -->
          @if (error() && !loading()) {
            <div class="py-3 text-center">
              <div
                class="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2"
              >
                <svg
                  class="w-5 h-5 text-red-500"
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
              <p class="text-xs text-red-600 mb-2 font-medium">{{ error() }}</p>
              <button
                (click)="getRecommendation()"
                class="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 mx-auto hover:underline"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reintentar
              </button>
            </div>
          }

          <!-- Recommendation Result -->
          @if (recommendation() && !loading()) {
            <div class="space-y-4">
              <!-- Main Recommendation Card -->
              <div
                class="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-orange-200/50"
              >
                <!-- Decorative sparkles -->
                <div class="absolute top-2 right-2 w-6 h-6 opacity-30">
                  <svg fill="currentColor" class="text-orange-400" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                </div>

                <div class="flex items-start gap-4">
                  <div class="relative">
                    <div class="absolute inset-0 bg-orange-500/20 rounded-xl blur-md"></div>
                    <div
                      class="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg"
                    >
                      <svg
                        class="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-gray-900 text-lg">
                      {{ recommendation()!.recommendedType }}
                    </h4>
                    <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                      {{ recommendation()!.reasoning }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Alternatives -->
              @if (
                recommendation()!.alternativeSuggestions &&
                recommendation()!.alternativeSuggestions!.length > 0
              ) {
                <div>
                  <h4
                    class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Alternativas
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    @for (alt of recommendation()!.alternativeSuggestions; track alt) {
                      <span
                        class="text-xs bg-white text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-default"
                      >
                        {{ alt }}
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Actions -->
              <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  (click)="searchWithFilters()"
                  class="relative flex-1 group/btn overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02]"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Buscar Autos
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"
                  ></div>
                </button>
                <button
                  (click)="regenerate()"
                  class="text-sm text-orange-600 hover:text-orange-700 py-2 px-4 flex items-center justify-center gap-2 rounded-xl hover:bg-orange-50 transition-colors font-medium"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Nueva Sugerencia
                </button>
              </div>
            </div>
          }
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

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      .animate-gradient-xy {
        animation: gradient-xy 3s ease infinite;
        background-size: 200% 200%;
      }

      .animate-shimmer {
        animation: shimmer 2s ease-in-out infinite;
      }
    `,
  ],
})
export class AiCarRecommendationComponent implements OnInit {
  private readonly geminiService = inject(GeminiService);
  private readonly bookingsService = inject(BookingsService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly recommendation = signal<CarRecommendation | null>(null);
  readonly hasRecommendation = signal(false);

  ngOnInit(): void {
    this.loadFromCache();
    // Auto-fetch if no cached recommendation
    if (!this.hasRecommendation()) {
      void this.getRecommendation();
    }
  }

  async getRecommendation(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Fetch booking history
      const { bookings } = await this.bookingsService.getMyBookings({ limit: 10 });

      // Prepare rental history
      const rentalHistory = bookings
        .filter((b) => b.car && b.status === 'completed')
        .map((b) => ({
          carBrand: b.car?.brand || 'Unknown',
          carModel: b.car?.model || 'Unknown',
          carYear: b.car?.year || 2020,
          carType: b.car?.vehicle_type || 'sedan',
          rentalDays: this.calculateDays(b.start_at, b.end_at),
          rating: b.car?.rating_avg || 5,
          pricePerDay:
            b.car?.price_per_day || (b.nightly_rate_cents ? b.nightly_rate_cents / 100 : 0),
        }));

      // If no history, show default recommendation
      if (rentalHistory.length === 0) {
        this.recommendation.set({
          recommendedType: 'Sedan Compacto',
          reasoning:
            'Como primer viaje, te recomendamos empezar con un sedan compacto: económico, fácil de manejar y versátil.',
          searchFilters: { carType: 'sedan', minYear: 2018 },
          alternativeSuggestions: ['SUV Compacto', 'Hatchback'],
        });
        this.hasRecommendation.set(true);
        this.saveToCache(this.recommendation()!);
        return;
      }

      // Call Gemini
      const result = await this.geminiService.getCarRecommendation({
        rentalHistory,
      });

      this.recommendation.set(result);
      this.hasRecommendation.set(true);
      this.saveToCache(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al obtener recomendación');
    } finally {
      this.loading.set(false);
    }
  }

  async regenerate(): Promise<void> {
    this.clearCache();
    this.hasRecommendation.set(false);
    this.recommendation.set(null);
    await this.getRecommendation();
  }

  searchWithFilters(): void {
    const filters = this.recommendation()?.searchFilters;
    const queryParams: Record<string, string> = {};

    if (filters?.carType) queryParams['type'] = filters.carType;
    if (filters?.brand) queryParams['brand'] = filters.brand;
    if (filters?.transmission) queryParams['transmission'] = filters.transmission;
    if (filters?.minYear) queryParams['minYear'] = String(filters.minYear);
    if (filters?.maxPricePerDay) queryParams['maxPrice'] = String(filters.maxPricePerDay);

    this.router.navigate(['/cars/list'], { queryParams });
  }

  private calculateDays(startAt: string, endAt: string): number {
    const start = new Date(startAt);
    const end = new Date(endAt);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return;

      const { data, timestamp } = JSON.parse(cached);
      const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

      if (hoursSince < CACHE_DURATION_HOURS) {
        this.recommendation.set(data);
        this.hasRecommendation.set(true);
      } else {
        this.clearCache();
      }
    } catch {
      this.clearCache();
    }
  }

  private saveToCache(data: CarRecommendation): void {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}
