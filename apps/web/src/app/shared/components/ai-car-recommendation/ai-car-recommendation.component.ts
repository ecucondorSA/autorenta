import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService } from '../../../core/services/gemini.service';
import { BookingsService } from '../../../core/services/bookings.service';
import type { CarRecommendation } from '../../../core/models/gemini.model';

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
    <div class="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-orange-100 dark:border-orange-800/30 flex items-center justify-between">
        <h3 class="font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Sugerencia para Vos
        </h3>
        <span class="text-[10px] bg-orange-200 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
          AI Powered
        </span>
      </div>

      <!-- Content -->
      <div class="p-4">
        <!-- Initial State: Not Recommended -->
        @if (!hasRecommendation() && !loading()) {
          <div class="text-center py-4">
            <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1" />
              </svg>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Basado en tu historial, te sugerimos tu próximo auto
            </p>
            <button
              (click)="getRecommendation()"
              class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
            >
              Ver Sugerencia
            </button>
          </div>
        }

        <!-- Loading State -->
        @if (loading()) {
          <div class="py-4">
            <div class="flex items-center justify-center gap-3 mb-4">
              <svg class="animate-spin w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm text-gray-600 dark:text-gray-300">Analizando historial...</span>
            </div>
            <div class="animate-pulse space-y-2">
              <div class="h-4 bg-orange-200/50 dark:bg-orange-800/30 rounded w-full"></div>
              <div class="h-4 bg-orange-200/50 dark:bg-orange-800/30 rounded w-2/3"></div>
            </div>
          </div>
        }

        <!-- Error State -->
        @if (error() && !loading()) {
          <div class="py-4 text-center">
            <div class="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-sm text-red-600 dark:text-red-400 mb-3">{{ error() }}</p>
            <button
              (click)="getRecommendation()"
              class="text-xs text-orange-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        }

        <!-- Recommendation Result -->
        @if (recommendation() && !loading()) {
          <div class="space-y-4">
            <!-- Main Recommendation -->
            <div class="bg-white dark:bg-surface-secondary rounded-lg p-4 border border-orange-200 dark:border-orange-800/30">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 dark:text-white">
                    {{ recommendation()!.recommendedType }}
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {{ recommendation()!.reasoning }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Alternatives -->
            @if (recommendation()!.alternativeSuggestions && recommendation()!.alternativeSuggestions!.length > 0) {
              <div>
                <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Alternativas
                </h4>
                <div class="flex flex-wrap gap-2">
                  @for (alt of recommendation()!.alternativeSuggestions; track alt) {
                    <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                      {{ alt }}
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                (click)="searchWithFilters()"
                class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar Autos
              </button>
              <button
                (click)="regenerate()"
                class="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 py-2 px-4 flex items-center justify-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Nueva Sugerencia
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
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
  }

  async getRecommendation(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Fetch booking history
      const { bookings } = await this.bookingsService.getMyBookings({ limit: 10 });

      // Prepare rental history
      const rentalHistory = bookings
        .filter(b => b.car && b.status === 'completed')
        .map(b => ({
          carBrand: b.car?.brand || 'Unknown',
          carModel: b.car?.model || 'Unknown',
          carYear: b.car?.year || 2020,
          carType: b.car?.vehicle_type || 'sedan',
          rentalDays: this.calculateDays(b.start_at, b.end_at),
          rating: b.car?.rating_avg || 5,
          pricePerDay: b.car?.price_per_day || (b.nightly_rate_cents ? b.nightly_rate_cents / 100 : 0),
        }));

      // If no history, show default recommendation
      if (rentalHistory.length === 0) {
        this.recommendation.set({
          recommendedType: 'Sedan Compacto',
          reasoning: 'Como primer viaje, te recomendamos empezar con un sedan compacto: económico, fácil de manejar y versátil.',
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

    this.router.navigate(['/marketplace'], { queryParams });
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
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
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
