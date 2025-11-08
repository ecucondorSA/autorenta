import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ReviewsService } from '../../../core/services/reviews.service';
import type { ReviewSummary } from '../../../core/models';

@Component({
  selector: 'app-review-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">Resumen de Reviews</h3>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div
            class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
          ></div>
        </div>
      } @else if (summary(); as s) {
        <div class="space-y-6">
          <!-- Total y Promedio -->
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-blue-50 p-4">
              <p class="text-sm font-medium text-blue-600">Total de Reviews</p>
              <p class="text-2xl font-bold text-blue-900">{{ s.total_count }}</p>
            </div>
            <div class="rounded-lg bg-green-50 p-4">
              <p class="text-sm font-medium text-green-600">Promedio</p>
              <p class="text-2xl font-bold text-green-900">
                {{ formatRating(s.average_rating) }} ⭐
              </p>
            </div>
          </div>

          <!-- Distribución -->
          @if (s.rating_distribution) {
            <div>
              <h4 class="mb-3 text-sm font-semibold text-gray-700">
                Distribución de Calificaciones
              </h4>
              <div class="space-y-2">
                @for (rating of [5, 4, 3, 2, 1]; track rating) {
                  <div class="flex items-center gap-3">
                    <span class="w-8 text-sm font-medium text-gray-600">{{ rating }}⭐</span>
                    <div class="flex-1">
                      <div class="h-4 w-full rounded-full bg-gray-200">
                        <div
                          class="h-4 rounded-full bg-blue-500"
                          [style.width.%]="
                            getPercentage(
                              getRatingCount(s.rating_distribution, rating),
                              s.total_count
                            )
                          "
                        ></div>
                      </div>
                    </div>
                    <span class="w-12 text-right text-sm text-gray-600">
                      {{ getRatingCount(s.rating_distribution, rating) }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Promedios por Categoría -->
          @if (s.category_averages) {
            <div>
              <h4 class="mb-3 text-sm font-semibold text-gray-700">Promedios por Categoría</h4>
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Limpieza</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.cleanliness) }} ⭐
                  </p>
                </div>
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Comunicación</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.communication) }} ⭐
                  </p>
                </div>
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Precisión</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.accuracy) }} ⭐
                  </p>
                </div>
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Ubicación</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.location) }} ⭐
                  </p>
                </div>
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Check-in</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.checkin) }} ⭐
                  </p>
                </div>
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-xs font-medium text-gray-600">Valor</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatRating(s.category_averages.value) }} ⭐
                  </p>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
          No hay reviews disponibles.
        </div>
      }
    </div>
  `,
})
export class ReviewSummaryComponent implements OnInit {
  @Input({ required: true }) userId!: string;
  @Input() asOwner = true;

  private readonly reviewsService = inject(ReviewsService);

  readonly summary = signal<ReviewSummary | null>(null);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadSummary();
  }

  async loadSummary(): Promise<void> {
    this.loading.set(true);

    try {
      const summary = await this.reviewsService.getReviewSummary(this.userId, this.asOwner);
      this.summary.set(summary);
    } catch (err) {
      console.error('Error loading review summary:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  getRatingCount(
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number } | undefined,
    rating: number,
  ): number {
    if (!distribution) return 0;
    return distribution[rating as keyof typeof distribution] || 0;
  }

  formatRating(rating: number): string {
    return rating.toFixed(1);
  }
}
