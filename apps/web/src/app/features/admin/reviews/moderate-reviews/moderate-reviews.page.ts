import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Review } from '../../../../core/models';

@Component({
  selector: 'app-moderate-reviews',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Moderación de Reviews</h1>
        <p class="mt-2 text-sm text-gray-600">
          Gestiona las reviews reportadas y pendientes de moderación.
        </p>
      </div>

      <div class="mb-4 flex gap-2">
        <button
          (click)="loadFlaggedReviews('pending')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-blue-600]="filterStatus() === 'pending'"
          [class.text-white]="filterStatus() === 'pending'"
          [class.bg-gray-200]="filterStatus() !== 'pending'"
          [class.text-gray-700]="filterStatus() !== 'pending'"
        >
          Pendientes
        </button>
        <button
          (click)="loadFlaggedReviews('approved')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-blue-600]="filterStatus() === 'approved'"
          [class.text-white]="filterStatus() === 'approved'"
          [class.bg-gray-200]="filterStatus() !== 'approved'"
          [class.text-gray-700]="filterStatus() !== 'approved'"
        >
          Aprobadas
        </button>
        <button
          (click)="loadFlaggedReviews('rejected')"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-blue-600]="filterStatus() === 'rejected'"
          [class.text-white]="filterStatus() === 'rejected'"
          [class.bg-gray-200]="filterStatus() !== 'rejected'"
          [class.text-gray-700]="filterStatus() !== 'rejected'"
        >
          Rechazadas
        </button>
        <button
          (click)="loadFlaggedReviews()"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          [class.bg-blue-600]="filterStatus() === null"
          [class.text-white]="filterStatus() === null"
          [class.bg-gray-200]="filterStatus() !== null"
          [class.text-gray-700]="filterStatus() !== null"
        >
          Todas
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
          ></div>
        </div>
      } @else if (flaggedReviews().length === 0) {
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p class="text-gray-600">No hay reviews para moderar.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (review of flaggedReviews(); track review.id) {
            <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900">Review #{{ review.id }}</h3>
                  <p class="text-sm text-gray-600">
                    Por: {{ review.reviewer_name || 'Usuario' }} | Auto:
                    {{ review.car_title || 'N/A' }}
                  </p>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  [class.bg-yellow-100]="review.flag_status === 'pending'"
                  [class.text-yellow-800]="review.flag_status === 'pending'"
                  [class.bg-green-100]="review.flag_status === 'approved'"
                  [class.text-green-800]="review.flag_status === 'approved'"
                  [class.bg-red-100]="review.flag_status === 'rejected'"
                  [class.text-red-800]="review.flag_status === 'rejected'"
                >
                  {{ review.flag_status || 'pending' }}
                </span>
              </div>

              <div class="mb-4 rounded-lg bg-gray-50 p-4">
                <p class="text-sm text-gray-700">
                  {{ review.comment_public || 'Sin comentario público' }}
                </p>
              </div>

              @if (review.flag_reason) {
                <div class="mb-4 rounded-lg bg-yellow-50 p-3">
                  <p class="text-xs font-medium text-yellow-800">Razón del reporte:</p>
                  <p class="text-sm text-yellow-700">{{ review.flag_reason }}</p>
                </div>
              }

              @if (review.flag_status === 'pending') {
                <div class="flex gap-2">
                  <button
                    (click)="moderateReview(review.id, 'approved')"
                    [disabled]="moderating()"
                    class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    (click)="moderateReview(review.id, 'rejected')"
                    [disabled]="moderating()"
                    class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ModerateReviewsPage implements OnInit {
  private readonly reviewsService = inject(ReviewsService);
  private readonly toastService = inject(ToastService);

  readonly flaggedReviews = signal<Review[]>([]);
  readonly loading = signal(false);
  readonly moderating = signal(false);
  readonly filterStatus = signal<'pending' | 'approved' | 'rejected' | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadFlaggedReviews();
  }

  async loadFlaggedReviews(status?: 'pending' | 'approved' | 'rejected'): Promise<void> {
    this.loading.set(true);
    this.filterStatus.set(status || null);

    try {
      const reviews = await this.reviewsService.getFlaggedReviews(status);
      this.flaggedReviews.set(reviews);
    } catch (err) {
      this.toastService.error('Error al cargar', err instanceof Error ? err.message : 'No se pudieron cargar las reviews');
    } finally {
      this.loading.set(false);
    }
  }

  async moderateReview(reviewId: string, action: 'approved' | 'rejected'): Promise<void> {
    this.moderating.set(true);

    try {
      const result = await this.reviewsService.moderateReview(reviewId, action);
      if (result.success) {
        this.toastService.success('Review moderada', `La review ha sido ${action === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`);
        await this.loadFlaggedReviews(this.filterStatus() || undefined);
      } else {
        this.toastService.error('Error al moderar', result.error || 'No se pudo completar la moderación');
      }
    } catch (err) {
      this.toastService.error('Error al moderar', err instanceof Error ? err.message : 'No se pudo moderar la review');
    } finally {
      this.moderating.set(false);
    }
  }
}
