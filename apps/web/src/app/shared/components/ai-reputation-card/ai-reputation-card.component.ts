import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '@core/services/ai/gemini.service';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { BonusMalusService } from '@core/services/payments/bonus-malus.service';
import { ProfileStore } from '@core/stores/profile.store';
import type { ReputationAnalysis } from '@core/models/gemini.model';

const CACHE_KEY_PREFIX = 'ai_reputation_analysis';
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
 * <app-ai-reputation-card [userId]="ownerId" />
 * ```
 */
@Component({
  selector: 'app-ai-reputation-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Compact card without heavy effects -->
    <div class="rounded-2xl border border-border-default bg-surface-raised overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-cta-default/10 flex items-center justify-center">
            <svg class="w-4 h-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-text-primary text-sm">Reputación</h3>
            <p class="text-xs text-text-secondary">Análisis IA</p>
          </div>
        </div>
        <!-- AI Badge -->
        <div class="flex items-center gap-1 px-2 py-1 bg-cta-default/10 rounded-full">
          <svg class="w-3 h-3 text-cta-default" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <span class="text-xs font-semibold text-cta-default">AI</span>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
          <!-- Initial State -->
          @if (!hasAnalyzed() && !loading()) {
            <div class="text-center py-4">
              <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-cta-default/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p class="text-sm text-text-secondary mb-3">
                Descubrí qué dicen de vos basado en las reseñas
              </p>
              <button
                (click)="analyze()"
                class="inline-flex items-center gap-2 px-4 py-2 bg-cta-default text-cta-text font-medium rounded-xl hover:bg-cta-hover transition-colors text-sm"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                Analizar
              </button>
            </div>
          }

          <!-- Loading State -->
          @if (loading()) {
            <div class="py-4 text-center">
              <div class="w-8 h-8 mx-auto mb-2 border-2 border-cta-default/20 border-t-cta-default rounded-full animate-spin"></div>
              <span class="text-sm text-text-secondary">Analizando...</span>
            </div>
          }

          <!-- Error State -->
          @if (error() && !loading()) {
            <div class="py-4 text-center">
              <p class="text-sm text-error-text mb-2">{{ error() }}</p>
              <button (click)="analyze()" class="text-sm text-cta-default hover:underline font-medium">
                Reintentar
              </button>
            </div>
          }

          <!-- Analysis Result -->
          @if (analysis() && !loading()) {
            <div class="space-y-4">
              <!-- Summary -->
              <p class="text-sm text-text-primary leading-relaxed">
                {{ analysis()!.summary }}
              </p>

              <!-- Highlights -->
              @if (analysis()!.highlights && analysis()!.highlights.length > 0) {
                <div>
                  <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Destacados</h4>
                  <ul class="space-y-1.5">
                    @for (highlight of analysis()!.highlights; track highlight) {
                      <li class="flex items-start gap-2 text-sm text-text-primary">
                        <svg class="w-4 h-4 text-success-default mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Oportunidades</h4>
                  <ul class="space-y-1.5">
                    @for (area of analysis()!.improvementAreas; track area) {
                      <li class="flex items-start gap-2 text-sm text-text-secondary">
                        <svg class="w-4 h-4 text-warning-default mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {{ area }}
                      </li>
                    }
                  </ul>
                </div>
              }

              <!-- Footer -->
              <div class="flex items-center justify-between pt-3 border-t border-border-default">
                <div
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="confidenceClasses()"
                >
                  {{ confidenceLabel() }}
                </div>
                <button (click)="regenerate()" class="text-xs text-text-secondary hover:text-cta-default transition-colors">
                  Regenerar
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
export class AiReputationCardComponent implements OnInit {
  private readonly geminiService = inject(GeminiService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly bonusMalusService = inject(BonusMalusService);
  private readonly profileStore = inject(ProfileStore);

  /** Optional: User ID to analyze. If not provided, uses current user from ProfileStore */
  readonly userId = input<string | undefined>(undefined);

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
      'bg-green-100 text-green-800': confidence === 'high',
      'bg-yellow-100 text-yellow-800': confidence === 'medium',
      'bg-gray-100 text-gray-800': confidence === 'low' || !confidence,
    };
  });

  ngOnInit(): void {
    this.loadFromCache();
  }

  async analyze(): Promise<void> {
    // Use provided userId or fall back to current user
    const targetUserId = this.userId() || this.profileStore.profile()?.id;
    if (!targetUserId) {
      this.error.set('No se pudo cargar el perfil');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Fetch reviews (as renter - owner reviews about this user)
      const reviews = await this.reviewsService.getReviewsForUser(targetUserId, false);
      const summary = await this.reviewsService.getReviewSummary(targetUserId, false);
      const tier = await this.bonusMalusService.getUserTier(targetUserId);

      // Prepare params
      const params = {
        reviews: reviews.slice(0, 10).map(r => ({
          rating: this.calculateAverageRating(r as unknown as Record<string, unknown>),
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
          memberSince: '',
          tier,
        },
      };

      // Call Gemini
      const result = await this.geminiService.analyzeUserReputation(params);

      this.analysis.set(result);
      this.hasAnalyzed.set(true);
      this.saveToCache(targetUserId, result);
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

  private calculateAverageRating(review: Record<string, unknown>): number {
    const ratings = [
      review['rating_cleanliness'],
      review['rating_communication'],
      review['rating_accuracy'],
      review['rating_location'],
      review['rating_checkin'],
      review['rating_value'],
    ].filter((r): r is number => typeof r === 'number');

    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  private getCacheKey(): string {
    const targetUserId = this.userId() || this.profileStore.profile()?.id || 'unknown';
    return `${CACHE_KEY_PREFIX}_${targetUserId}`;
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(this.getCacheKey());
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

  private saveToCache(userId: string, data: ReputationAnalysis): void {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}_${userId}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore storage errors
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(this.getCacheKey());
    } catch {
      // Ignore storage errors
    }
  }
}
