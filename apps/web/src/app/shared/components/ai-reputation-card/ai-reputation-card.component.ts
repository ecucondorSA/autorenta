import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../../core/services/gemini.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { BonusMalusService } from '../../../core/services/bonus-malus.service';
import { ProfileStore } from '../../../core/stores/profile.store';
import type { ReputationAnalysis } from '../../../core/models/gemini.model';

const CACHE_KEY = 'ai_reputation_analysis';
const CACHE_DURATION_HOURS = 24;

/**
 * AiReputationCardComponent
 *
 * AI-powered reputation analysis card that summarizes user reviews.
 * Lazy-loads on user action to save API costs.
 * Results are cached in localStorage for 24 hours.
 *
 * @example
 * ```html
 * <app-ai-reputation-card />
 * ```
 */
@Component({
  selector: 'app-ai-reputation-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-surface-secondary rounded-xl border border-border-default dark:border-border-muted shadow-sm relative overflow-hidden">
      <!-- Accent bar -->
      <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

      <!-- Header -->
      <div class="px-4 py-3 border-b border-border-default dark:border-border-muted flex items-center justify-between">
        <h3 class="font-bold text-text-primary dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Tu Reputación
        </h3>
        <span class="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
          AI Analysis
        </span>
      </div>

      <!-- Content -->
      <div class="p-4">
        <!-- Initial State: Not Analyzed -->
        @if (!hasAnalyzed() && !loading()) {
          <div class="text-center py-4">
            <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p class="text-sm text-text-secondary dark:text-text-secondary/70 mb-3">
              Obtené un resumen inteligente basado en tus reviews
            </p>
            <button
              (click)="analyze()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
            >
              Analizar Reputación
            </button>
          </div>
        }

        <!-- Loading State -->
        @if (loading()) {
          <div class="py-4">
            <div class="flex items-center justify-center gap-3 mb-4">
              <svg class="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm text-text-secondary">Analizando reviews...</span>
            </div>
            <div class="animate-pulse space-y-2">
              <div class="h-4 bg-surface-hover dark:bg-surface-hover/30 rounded w-full"></div>
              <div class="h-4 bg-surface-hover dark:bg-surface-hover/30 rounded w-3/4"></div>
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
              (click)="analyze()"
              class="text-xs text-indigo-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        }

        <!-- Analysis Result -->
        @if (analysis() && !loading()) {
          <div class="space-y-4">
            <!-- Summary Quote -->
            <blockquote class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border-l-4 border-indigo-500">
              <p class="text-sm font-medium text-indigo-900 dark:text-indigo-100 italic leading-relaxed">
                "{{ analysis()!.summary }}"
              </p>
            </blockquote>

            <!-- Highlights -->
            @if (analysis()!.highlights && analysis()!.highlights.length > 0) {
              <div>
                <h4 class="text-xs font-bold text-text-secondary dark:text-text-secondary/70 uppercase tracking-wide mb-2">
                  Puntos Destacados
                </h4>
                <ul class="space-y-1">
                  @for (highlight of analysis()!.highlights; track highlight) {
                    <li class="flex items-start gap-2 text-sm text-text-primary dark:text-white">
                      <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ highlight }}
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Improvement Areas -->
            @if (analysis()!.improvementAreas && analysis()!.improvementAreas!.length > 0) {
              <div>
                <h4 class="text-xs font-bold text-text-secondary dark:text-text-secondary/70 uppercase tracking-wide mb-2">
                  Áreas de Mejora
                </h4>
                <ul class="space-y-1">
                  @for (area of analysis()!.improvementAreas; track area) {
                    <li class="flex items-start gap-2 text-sm text-text-secondary dark:text-text-secondary/70">
                      <svg class="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {{ area }}
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Confidence & Regenerate -->
            <div class="flex items-center justify-between pt-2 border-t border-border-default dark:border-border-muted">
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                [ngClass]="confidenceClasses()"
              >
                Confianza: {{ confidenceLabel() }}
              </span>
              <button
                (click)="regenerate()"
                class="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerar
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Footer Note -->
      <div class="px-4 py-2 bg-gray-50 dark:bg-surface-base/50 border-t border-border-default dark:border-border-muted">
        <p class="text-[10px] text-text-muted dark:text-text-muted/70 text-right">
          Basado en reseñas de propietarios anteriores
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class AiReputationCardComponent implements OnInit {
  private readonly geminiService = inject(GeminiService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly bonusMalusService = inject(BonusMalusService);
  private readonly profileStore = inject(ProfileStore);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly analysis = signal<ReputationAnalysis | null>(null);
  readonly hasAnalyzed = signal(false);

  readonly confidenceLabel = computed(() => {
    const confidence = this.analysis()?.confidence;
    if (confidence === 'high') return 'Alta';
    if (confidence === 'medium') return 'Media';
    return 'Baja';
  });

  readonly confidenceClasses = computed(() => {
    const confidence = this.analysis()?.confidence;
    return {
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': confidence === 'high',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': confidence === 'medium',
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400': confidence === 'low' || !confidence,
    };
  });

  ngOnInit(): void {
    this.loadFromCache();
  }

  async analyze(): Promise<void> {
    const profile = this.profileStore.profile();
    if (!profile?.id) {
      this.error.set('No se pudo cargar el perfil');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Fetch reviews (as renter - owner reviews about this user)
      const reviews = await this.reviewsService.getReviewsForUser(profile.id, false);
      const summary = await this.reviewsService.getReviewSummary(profile.id, false);
      const tier = await this.bonusMalusService.getUserTier(profile.id);

      // Prepare params
      const params = {
        reviews: reviews.slice(0, 10).map(r => ({
          rating: this.calculateAverageRating(r),
          comment: r.comment_public || '',
          date: r.created_at,
          reviewerName: r.reviewer_name || 'Usuario',
        })),
        summary: {
          totalCount: summary.total_count,
          averageRating: summary.average_rating,
          categoryAverages: summary.category_averages,
        },
        userProfile: {
          completedTrips: summary.total_count,
          memberSince: profile.created_at || '',
          tier,
        },
      };

      // Call Gemini
      const result = await this.geminiService.analyzeUserReputation(params);

      this.analysis.set(result);
      this.hasAnalyzed.set(true);
      this.saveToCache(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al analizar reputación');
    } finally {
      this.loading.set(false);
    }
  }

  async regenerate(): Promise<void> {
    this.clearCache();
    this.hasAnalyzed.set(false);
    this.analysis.set(null);
    await this.analyze();
  }

  private calculateAverageRating(review: any): number {
    const ratings = [
      review.rating_cleanliness,
      review.rating_communication,
      review.rating_accuracy,
      review.rating_location,
      review.rating_checkin,
      review.rating_value,
    ].filter(r => r !== null && r !== undefined);

    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return;

      const { data, timestamp } = JSON.parse(cached);
      const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

      if (hoursSince < CACHE_DURATION_HOURS) {
        this.analysis.set(data);
        this.hasAnalyzed.set(true);
      } else {
        this.clearCache();
      }
    } catch {
      this.clearCache();
    }
  }

  private saveToCache(data: ReputationAnalysis): void {
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
